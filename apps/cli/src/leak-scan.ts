// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The leak scan after a run and after a report: a held key value in a file of the run folder marks the folder. */
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { SwtIssue } from "@swarmtales/contracts";
import { keyLeaked } from "@swarmtales/models";
import { findLeaks } from "@swarmtales/runlog";

/**
 * The marker file of a run folder in which a key was found. A folder that holds it is never published.
 *
 * @public
 */
export const LEAK_FILE = "LEAK";

/**
 * Scans every file of a run folder for a held key value. On a hit it writes the marker file `LEAK` into the
 * folder, which lists the files and never the value; the caller prints the issue and exits with code 4.
 *
 * @param directory - The run folder; one that does not exist holds nothing.
 * @param leaks - The test of one file's text: `leaks` of the key broker, which also finds the encoded forms.
 * @returns `SWT-X030` with the names of the files, as a list of one issue; empty when no file holds a value.
 * @throws What the file system throws when a file cannot be read or the marker cannot be written.
 * @example
 * ```ts
 * const leak = scanFolder(directory, broker.leaks);
 * if (leak.length > 0) process.exitCode = 4;
 * ```
 *
 * @public
 */
export function scanFolder(directory: string, leaks: (text: string) => boolean): readonly SwtIssue[] {
	if (!existsSync(directory)) return [];
	const files = findLeaks(directory, leaks);
	if (files.length === 0) return [];
	writeFileSync(join(directory, LEAK_FILE), `A held key value occurs in these files. Do not publish this folder.\n${files.join("\n")}\n`);
	return [keyLeaked(files)];
}
