// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** Collecting files from the browser's three folder inputs: a File System Access directory, a dropped folder, a picked folder. */
import { sourceFilesOf, type SourceFile } from "./file-source.ts";

const SKIPPED = new Set(["node_modules", ".git"]);

async function walkHandle(directory: FileSystemDirectoryHandle, prefix: string, into: SourceFile[]): Promise<void> {
	for await (const [name, handle] of directory.entries()) {
		if (SKIPPED.has(name)) continue;
		const path = `${prefix}/${name}`;
		if (handle instanceof FileSystemDirectoryHandle) await walkHandle(handle, path, into);
		else if (handle instanceof FileSystemFileHandle) into.push({ path, read: async () => (await handle.getFile()).text() });
	}
}

type DirectoryPicker = () => Promise<FileSystemDirectoryHandle>;

function isPicker(value: unknown): value is DirectoryPicker {
	return typeof value === "function";
}

/** The File System Access API's directory picker, when the browser has one (Chromium). */
export function directoryPicker(): DirectoryPicker | undefined {
	const picker: unknown = Reflect.get(window, "showDirectoryPicker");
	return isPicker(picker) ? () => picker.call(window) : undefined;
}

/** Reads every file below a directory handle of the File System Access API. */
export async function filesOfHandle(directory: FileSystemDirectoryHandle): Promise<readonly SourceFile[]> {
	const files: SourceFile[] = [];
	await walkHandle(directory, directory.name, files);
	return files;
}

function readBatch(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
	return new Promise((resolve, reject) => {
		reader.readEntries(resolve, reject);
	});
}

async function walkEntry(entry: FileSystemEntry, into: SourceFile[]): Promise<void> {
	if (SKIPPED.has(entry.name)) return;
	if (entry instanceof FileSystemFileEntry) {
		const file = await new Promise<File>((resolve, reject) => {
			entry.file(resolve, reject);
		});
		into.push({ path: entry.fullPath.replace(/^\//, ""), read: () => file.text() });
	} else if (entry instanceof FileSystemDirectoryEntry) {
		const reader = entry.createReader();
		for (let batch = await readBatch(reader); batch.length > 0; batch = await readBatch(reader)) {
			for (const child of batch) await walkEntry(child, into);
		}
	}
}

/** What was dropped: files and folders, folders searched through. The entries are taken first, because the drop's data is gone after the first await. */
export async function filesOfDrop(transfer: DataTransfer): Promise<readonly SourceFile[]> {
	const entries = [...transfer.items].flatMap((item) => {
		const entry = item.webkitGetAsEntry();
		return entry === null ? [] : [entry];
	});
	const files: SourceFile[] = [];
	for (const entry of entries) await walkEntry(entry, files);
	return files;
}

/** Reads the files of a folder input. */
export function filesOfInput(list: FileList): readonly SourceFile[] {
	return sourceFilesOf([...list]).filter((file) => !file.path.split("/").some((part) => SKIPPED.has(part)));
}
