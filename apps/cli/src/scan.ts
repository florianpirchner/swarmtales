// SPDX-License-Identifier: Apache-2.0
/** `swt scan`: the leak scan of a run (`leak-scan.ts`) as a command over any folder. It prints file names and counts, never a value or a part of one. */
import { statSync } from "node:fs";
import { resolve } from "node:path";
import { formatIssue, SwtError } from "@swarmtales/contracts";
import { createKeyBroker, KEY_VARIABLES } from "@swarmtales/models";
import { readEnv } from "./env.ts";
import { badUsage } from "./errors.ts";
import { scanFolder } from "./leak-scan.ts";
import type { CliIo } from "./main.ts";

const isFolder = (path: string): boolean => statSync(path, { throwIfNoEntry: false })?.isDirectory() === true;

/**
 * Scans every file under a folder, in every folder below it, for the key values the environment holds, also in
 * their encoded forms (`leaks` of the key broker). The folder is a run folder, a folder of runs, or a checkout of
 * the branch `data/runs`. Prints `clean, <n> files, keys of <k> providers held`; on a hit `SWT-X030` with the names
 * of the files, and the marker file `LEAK` is written into the folder. With `json` one line
 * `{ "clean", "files", "providers", "issues" }`. Without a held key no value can be found: the command says so
 * and scans nothing.
 *
 * @param directory - The folder, absolute or relative to the current directory.
 * @param json - Print the result as one JSON line.
 * @param io - The current directory, the two outputs, and for a test the environment.
 * @returns The exit code: 0 no file holds a held key value, 1 a file does, 3 no key is held and nothing was scanned.
 * @throws SwtError `SWT-C003` when the folder does not exist or is a file, `SWT-X006` for a key that is too short;
 * the command exits with 1 then. What the file system throws when a file cannot be read.
 * @example
 * ```ts
 * process.exitCode = scan("data-runs", false, io);
 * ```
 *
 * @public
 */
export function scan(directory: string, json: boolean, io: CliIo): number {
	const folder = resolve(io.cwd, directory);
	if (!isFolder(folder)) throw new SwtError(badUsage({ problem: `\`swt scan ${directory}\` names no folder` }));
	const broker = createKeyBroker(io.env ?? readEnv());
	const providers = Object.keys(KEY_VARIABLES).filter((provider) => broker.missing(provider).length === 0).length;
	if (providers === 0) {
		if (json) io.out(JSON.stringify({ clean: null, files: 0, providers, issues: [] }));
		else io.err(`not scanned: none of the key variables is set (${Object.values(KEY_VARIABLES).flat().join(", ")}), so no value can be looked for`);
		return 3;
	}
	let files = 0;
	const issues = scanFolder(folder, (text) => {
		files += 1;
		return broker.leaks(text);
	});
	if (json) io.out(JSON.stringify({ clean: issues.length === 0, files, providers, issues }));
	else if (issues.length === 0) io.out(`clean, ${String(files)} files, keys of ${String(providers)} providers held`);
	else for (const issue of issues) io.err(broker.redact(formatIssue(issue)));
	return issues.length === 0 ? 0 : 1;
}
