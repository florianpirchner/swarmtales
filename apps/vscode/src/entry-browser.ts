/** Web extension entry (github.dev, vscode.dev): the viewer only, no terminal. */
import type * as vscode from "vscode";
import { activate as activateViewer } from "./extension.ts";

/** @public VS Code calls `activate` by name; knip must not count it as unused. */
export function activate(context: vscode.ExtensionContext): void {
	activateViewer(context);
}
