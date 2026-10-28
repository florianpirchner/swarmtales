/**
 * Run directory layout (SPEC §14):
 *
 * ```
 * runs/run-NNN/
 *   000-run.json          run metadata and the serialized story
 *   events.jsonl          every event
 *   NNN-minute/events.jsonl  events of one virtual minute
 *   agents/A01.md         transcript per competitor
 *   minutes.md            per-minute table
 *   usage.json            tokens and cost
 * ```
 */
import { appendFileSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { EventSink, RecordedEvent } from "../engine/events.ts";

export const RUN_METADATA_FILE = "000-run.json";

export interface AllocatedRun {
	readonly directory: string;
	readonly number: number;
	readonly name: string;
}

export function runDirectoryName(number: number): string {
	return `run-${pad(number)}`;
}

export function minuteDirectoryName(minute: number): string {
	return `${pad(minute)}-minute`;
}

/** The next free `runs/run-NNN` directory. */
export function allocateRunDirectory(baseDirectory: string): AllocatedRun {
	mkdirSync(baseDirectory, { recursive: true });
	let highest = 0;
	for (const entry of readdirSync(baseDirectory)) {
		const digits = /^run-(\d+)$/.exec(entry)?.[1];
		if (digits !== undefined) highest = Math.max(highest, Number(digits));
	}
	const number = highest + 1;
	const name = runDirectoryName(number);
	const directory = join(baseDirectory, name);
	mkdirSync(directory, { recursive: true });
	return { directory, number, name };
}

export function writeRunMetadata(directory: string, metadata: Readonly<Record<string, unknown>>): string {
	mkdirSync(directory, { recursive: true });
	const path = join(directory, RUN_METADATA_FILE);
	writeFileSync(path, `${JSON.stringify(metadata, null, 2)}\n`);
	return path;
}

/** Writes every event a second time into the folder of its virtual minute. */
export class MinuteEventLog implements EventSink {
	constructor(readonly directory: string) {
		mkdirSync(directory, { recursive: true });
	}

	pathFor(minute: number): string {
		return join(this.directory, minuteDirectoryName(minute), "events.jsonl");
	}

	record(event: RecordedEvent): void {
		const folder = join(this.directory, minuteDirectoryName(event.minute));
		mkdirSync(folder, { recursive: true });
		appendFileSync(join(folder, "events.jsonl"), `${JSON.stringify(event)}\n`);
	}
}

function pad(value: number): string {
	return String(value).padStart(3, "0");
}
