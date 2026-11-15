// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The catalogue of the codes `SWT-L001` to `SWT-L005`, `SWT-L007` and `SWT-L008`: the chain breaks at a line
 * (L001), a head is not signed or no head covers the tail (L002), the manifest is not the one the genesis names,
 * or `game.json` or `texts.json` is not what the manifest names by hash (L003), a line is no stored envelope
 * (L004), `seq`, `tick`, `causedBy` or `basis` are out of order (L005), a resumed run does not continue the run it
 * resumed from (L007), a snapshot file is not one, or not the one that was asked for (L008).
 */
import type { SwtIssue } from "@swarmtales/contracts";

/** The codes of this catalogue. `SWT-L003` and `SWT-L006` of `folder.ts` carry their own texts. */
export type Code = "SWT-L001" | "SWT-L002" | "SWT-L003" | "SWT-L004" | "SWT-L005" | "SWT-L007" | "SWT-L008";

const RESTORE = "Restore the run folder from a copy that was not changed; a log that does not verify is no evidence.";
const CATALOGUE: Readonly<Record<Code, { readonly why: string; readonly fix: string }>> = {
	"SWT-L001": { why: "Every line of the log is chained to the line before it by its hash, so a changed, deleted, inserted or moved line shows.", fix: RESTORE },
	"SWT-L002": { why: "A head signed with the run's key covers every line of the log.", fix: "Check that run.pub is the key of this run. A run that crashed has no signed end: play it again." },
	"SWT-L003": { why: "The genesis of the chain names the hash of manifest.json, which is written as canonical JSON and says what the genesis says.", fix: RESTORE },
	"SWT-L004": { why: "Every line of events.jsonl is one stored envelope: an event of the log with the time it was written at.", fix: RESTORE },
	"SWT-L005": { why: "In a log, seq is the line number, tick never falls, and causedBy and basis are smaller than seq.", fix: "The writer of the log broke the order: report it with the run folder." },
	"SWT-L007": {
		why: "A resumed run chains from a head the previous run signed, repeats the previous log up to that head and marks the resume in the next line, so nothing can be put between the two runs.",
		fix: "Name the folder of the run the snapshot was taken from, unchanged, and resume again from one of its snapshot files.",
	},
	"SWT-L008": {
		why: "A run resumes only from a snapshot file whose state is the one its signed checkpoint names, taken from the run and the game that are resumed.",
		fix: "Use a file of the folder `snapshots` of the run to resume, as the run wrote it.",
	},
};

/**
 * Builds an issue of the catalogue.
 *
 * @param code - The code.
 * @param summary - What is wrong, with the names of this case.
 * @param file - The file the fault is in.
 * @param line - The line of the file, where the fault has one.
 * @returns The issue with the `why` and the `fix` of its code.
 */
export function issue(code: Code, summary: string, file: string, line?: number): SwtIssue {
	return { code, summary, where: line === undefined ? { file } : { file, line }, ...CATALOGUE[code] };
}
