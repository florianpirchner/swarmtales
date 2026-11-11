/**
 * The extension's activation, shared by the desktop entry (`main`) and the web entry (`browser`).
 * Commands open the viewer in a webview panel on a folder; a custom editor (priority "option") does the
 * same for an `events.jsonl`. The desktop entry adds the commands that need a terminal.
 */
import * as vscode from "vscode";
import { classifyFolder, isStoryFile } from "./folder-files.ts";
import { parseStoryFile } from "./story-file.ts";
import { NO_DATA, parseViewerData, type ViewerData } from "./viewer-data.ts";
import { showViewer, webviewOptions, type ViewerOptions } from "./viewer-panel.ts";
import { parentOf, workspaceFiles } from "./workspace-fs.ts";

export const VIEW_TYPE = "swarmtales.runEditor";

export interface Viewers {
	/** Opens the viewer in a new panel. */
	open(options: ViewerOptions): void;
}

async function loadData(context: vscode.ExtensionContext): Promise<ViewerData> {
	try {
		const bytes = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(context.extensionUri, "dist", "viewer-data.json"));
		return parseViewerData(new TextDecoder("utf-8").decode(bytes));
	} catch {
		return NO_DATA;
	}
}

function baseName(uri: vscode.Uri): string {
	return uri.path.split("/").filter((part) => part !== "").at(-1) ?? uri.toString();
}

async function isDirectory(uri: vscode.Uri): Promise<boolean> {
	try {
		return ((await vscode.workspace.fs.stat(uri)).type & vscode.FileType.Directory) !== 0;
	} catch {
		return false;
	}
}

/** The resource a command was started on: the argument (explorer menu), else the active editor's file. */
export function targetOf(argument: unknown): vscode.Uri | undefined {
	if (argument instanceof vscode.Uri) return argument;
	return vscode.window.activeTextEditor?.document.uri;
}

async function pickWorkspaceFolder(): Promise<vscode.Uri | undefined> {
	const folders = vscode.workspace.workspaceFolders ?? [];
	if (folders.length <= 1) return folders[0]?.uri;
	const picked = await vscode.window.showQuickPick(folders.map((folder) => ({ label: folder.name, uri: folder.uri })), { placeHolder: "Which folder holds the runs?" });
	return picked?.uri;
}

export function activate(context: vscode.ExtensionContext): Viewers {
	const data: { current?: Promise<ViewerData> } = {};
	const bundled = (): Promise<ViewerData> => {
		data.current ??= loadData(context);
		return data.current;
	};
	const viewers: Viewers = {
		open(options) {
			const panel = vscode.window.createWebviewPanel("swarmtales.viewer", options.title, vscode.ViewColumn.Active, { ...webviewOptions(context.extensionUri), retainContextWhenHidden: true });
			void bundled().then((loaded) => { showViewer(panel, context.extensionUri, loaded, options); });
		},
	};

	context.subscriptions.push(
		vscode.commands.registerCommand("swarmtales.openRun", async (argument: unknown) => {
			// From the explorer menu the argument is the folder; from the palette, the workspace folder.
			let folder = argument instanceof vscode.Uri ? argument : await pickWorkspaceFolder();
			if (folder === undefined) return;
			if (!(await isDirectory(folder))) folder = parentOf(folder);
			const kind = await classifyFolder(workspaceFiles(folder));
			if (kind.kind === "none") {
				void vscode.window.showWarningMessage(`No runs in "${baseName(folder)}": a run folder contains an events.jsonl.`);
				return;
			}
			viewers.open({ root: folder, title: baseName(folder) });
		}),
		vscode.commands.registerCommand("swarmtales.openRunBrowser", async () => {
			const root = await pickWorkspaceFolder();
			if (root === undefined) {
				void vscode.window.showWarningMessage("Open a folder first: the run browser lists the runs in the workspace.");
				return;
			}
			viewers.open({ root, title: `Runs in ${baseName(root)}` });
		}),
		vscode.commands.registerCommand("swarmtales.openStoryGraph", async (argument: unknown) => {
			const file = targetOf(argument);
			if (file === undefined || !isStoryFile(file.path)) {
				void vscode.window.showWarningMessage("Open a story file first (*.story.yaml, *.story.json or story.yaml).");
				return;
			}
			try {
				const text = new TextDecoder("utf-8").decode(await vscode.workspace.fs.readFile(file));
				const name = baseName(file);
				const story = parseStoryFile(name, text);
				viewers.open({ root: parentOf(file), title: name, hash: "#view=story", extraStories: { [name]: story }, initialStory: { name, story } });
			} catch (error) {
				void vscode.window.showErrorMessage(`Cannot read ${baseName(file)}: ${error instanceof Error ? error.message : String(error)}`);
			}
		}),
		vscode.window.registerCustomEditorProvider(
			VIEW_TYPE,
			{
				openCustomDocument: (uri) => ({ uri, dispose: () => undefined }),
				resolveCustomEditor(document, panel) {
					void bundled().then((loaded) => { showViewer(panel, context.extensionUri, loaded, { root: parentOf(document.uri), title: baseName(parentOf(document.uri)) }); });
				},
			},
			{ webviewOptions: { retainContextWhenHidden: true }, supportsMultipleEditorsPerDocument: true },
		),
	);
	return viewers;
}
