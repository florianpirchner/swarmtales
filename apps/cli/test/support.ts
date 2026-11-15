// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** What the tests of `swt run` and `swt resume` share: the command in process, the log of a run folder, and a resumed log without its marker. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { StoredEnvelopeSchema } from "@swarmtales/contracts";
import { Type, type Static } from "typebox";
import { Parse } from "typebox/value";
import { main, type CliIo } from "../src/main.ts";

const Events = Type.Array(StoredEnvelopeSchema, { description: "The lines of events.jsonl" });

/** One line of `events.jsonl`. */
export type StoredEnvelope = Static<typeof StoredEnvelopeSchema>;

/** What one command printed. */
export interface Printed {
	readonly code: number;
	readonly out: readonly string[];
	readonly err: string;
	/** The first `SWT-` code on the error output. */
	readonly issue: string | undefined;
}

/**
 * The command line in process, with a clock that stands still: `const swt = cli(cwd); await swt("run", file, "--fake")`.
 * Relative paths (the game file aside, give that one absolute) start at `cwd`.
 */
export function cli(cwd: string): (...args: readonly string[]) => Promise<Printed> {
	return async (...args) => {
		const out: string[] = [];
		const err: string[] = [];
		const io: CliIo = { cwd, now: () => new Date("2026-11-14T12:00:00.000Z"), out: (line) => out.push(line), err: (line) => err.push(line), env: {} };
		const code = await main(args, io);
		return { code, out, err: err.join("\n"), issue: /SWT-[A-Z]\d{3}/.exec(err.join("\n"))?.[0] };
	};
}

/** The events of a run folder, parsed. */
export function eventsOf(directory: string): readonly StoredEnvelope[] {
	const lines = readFileSync(join(directory, "events.jsonl"), "utf8").trimEnd().split("\n");
	return Parse(
		Events,
		lines.map((line): unknown => JSON.parse(line)),
	);
}

/**
 * The log of a resumed run as the straight run has it: without the marker `run_resumed`, and with `seq`, `causedBy`
 * and `basis` of the later events counted without it. No payload is
 * changed: none holds a log position (decision A34).
 */
export function withoutMarker(events: readonly StoredEnvelope[]): readonly StoredEnvelope[] {
	const marker = events.find((event) => event.type === "run_resumed")?.seq ?? Infinity;
	const back = (seq: number): number => (seq >= marker ? seq - 1 : seq);
	return events.flatMap((event) =>
		event.seq === marker ? [] : [{ ...event, seq: back(event.seq), ...(event.causedBy === undefined ? {} : { causedBy: back(event.causedBy) }), ...(event.basis === undefined ? {} : { basis: back(event.basis) }) }],
	);
}
