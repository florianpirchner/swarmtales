// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** Reads an oracle file (`oracles/README.md`): parsed against `OracleSchema`, its `counts` checked against its timeline. */
import { readFileSync } from "node:fs";
import { SwtError } from "@swarmtales/contracts";
import { Value } from "typebox/value";
import { OracleSchema, type Oracle, type OracleCall, type OracleEntry } from "./format.ts";

/**
 * Builds the error of the oracle runner. The code is a stand-in: the testkit has no letter in the code pattern yet.
 *
 * @param code - `SWT-T001` (a file that is no oracle) or `SWT-T002` (an oracle the runner does not play yet).
 * @param summary - What is wrong, one sentence.
 * @param fix - What to do about it.
 * @param file - The oracle file, when the problem is in a file.
 * @returns The error.
 */
export function oracleError(code: "SWT-T001" | "SWT-T002", summary: string, fix: string, file?: string): SwtError {
	const why = code === "SWT-T001" ? "An oracle file is version 1 of `swarmtales.oracle` (oracles/README.md), and its counts are a checksum of its timeline." : "The oracle runner of M1 replays the calls of residents under the seeded order of `turns` in one run from start to end.";
	return new SwtError({ code, summary, where: { package: "@swarmtales/testkit", ...(file === undefined ? {} : { file }) }, why, fix });
}

/**
 * Counts a timeline as the `counts` of a file do.
 *
 * @param timeline - The entries.
 * @returns The entries per kind and the events per `<source>.<type>`, keys sorted.
 *
 * @public
 */
export function countsOf(timeline: readonly OracleEntry[]): Oracle["counts"] {
	const tally = (keys: readonly string[]): Record<string, number> => {
		const counted = new Map<string, number>();
		for (const key of keys) counted.set(key, (counted.get(key) ?? 0) + 1);
		return Object.fromEntries([...counted].sort(([a], [b]) => (a < b ? -1 : 1)));
	};
	return { entries: tally(timeline.map((entry) => entry.k)), events: tally(timeline.flatMap((entry) => (entry.k === "event" ? [`${entry.source}.${entry.type}`] : []))) };
}

/**
 * Writes the flag `endsTurn: true` into the accepted calls of a file that ended their caller's turn. No file of
 * `oracles/` holds the flag, although the old mechanics set it; a game's oracle test names the calls that ended a
 * turn (by tool, or by the reply) and registers the mapping in the README of its oracle folder.
 *
 * @param oracle - The oracle, as `readOracle` gave it.
 * @param ends - Whether an accepted call ended its caller's turn.
 * @returns The oracle with `endsTurn: true` on every accepted call for which `ends` holds; every other entry, and the
 * counts, as they were.
 * @example
 * ```ts
 * const flagged = withEndsTurn(oracle, (call) => ["playMove", "resign"].includes(call.tool));
 * ```
 *
 * @public
 */
export function withEndsTurn(oracle: Oracle, ends: (call: OracleCall) => boolean): Oracle {
	return { ...oracle, timeline: oracle.timeline.map((entry) => (entry.k === "call" && entry.ok && ends(entry) ? { ...entry, endsTurn: true } : entry)) };
}

/**
 * Parses the file against `OracleSchema` and checks `counts` against the timeline.
 *
 * @param path - The path of the oracle file.
 * @returns The oracle.
 * @throws SwtError `SWT-T001` when the file cannot be read, is no JSON, does not match the schema, or its counts differ from its timeline.
 * @example
 * ```ts
 * const oracle = readOracle("oracles/tictactoe/tictactoe-teams-s7.json");
 * ```
 *
 * @public
 */
export function readOracle(path: string): Oracle {
	const invalid = (what: string, cause?: unknown): SwtError => new SwtError(oracleError("SWT-T001", `the oracle file ${what}`, "Take the file from `oracles/` unchanged, or export it again from the tag `v0-final`.", path).issues, { cause });
	let data: unknown;
	try {
		data = JSON.parse(readFileSync(path, "utf8"));
	} catch (error) {
		throw invalid("cannot be read as JSON", error);
	}
	if (!Value.Check(OracleSchema, data)) {
		const first = Value.Errors(OracleSchema, data)[0];
		throw invalid(`does not match the schema: ${first?.instancePath ?? ""} ${first?.message ?? ""}`.trimEnd());
	}
	if (!Value.Equal(countsOf(data.timeline), data.counts)) throw invalid("has counts that differ from its timeline");
	return data;
}
