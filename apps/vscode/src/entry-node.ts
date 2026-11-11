/** Desktop and Codespaces entry: the viewer plus "Run Story…", which prefills a terminal. */
import * as vscode from "vscode";
import { activate as activateViewer, targetOf } from "./extension.ts";
import { isStoryFile } from "./folder-files.ts";
import { runStoryCommand } from "./terminal-command.ts";

/** @public VS Code calls `activate` by name; knip must not count it as unused. */
export function activate(context: vscode.ExtensionContext): void {
	activateViewer(context);
	context.subscriptions.push(
		vscode.commands.registerCommand("swarmtales.runStory", (argument: unknown) => {
			const file = targetOf(argument);
			if (file === undefined || !isStoryFile(file.path)) {
				void vscode.window.showWarningMessage("Open a story file first (*.story.yaml, *.story.json or story.yaml).");
				return;
			}
			if (!vscode.workspace.isTrusted) {
				void vscode.window.showWarningMessage("Run Story is off in a workspace you have not trusted.");
				return;
			}
			const command = runStoryCommand(vscode.workspace.asRelativePath(file, false));
			if (command === undefined) {
				void vscode.window.showWarningMessage("This story's path has characters a terminal could read as a command. Rename the file (letters, digits, _ . @ + = , - and /), or type the command yourself.");
				return;
			}
			const folder = vscode.workspace.getWorkspaceFolder(file);
			const terminal = vscode.window.createTerminal({ name: "Swarm Tales", ...(folder === undefined ? {} : { cwd: folder.uri }) });
			terminal.show();
			// Not executed: a run costs money, so the person reads the line and presses Enter.
			terminal.sendText(command, false);
		}),
	);
}
