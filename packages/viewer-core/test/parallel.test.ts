// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The projection of a log of the scheduler sample `parallel` (`fixtures/parallel-run`): activations that overlap, and the `basis` of each call. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseEnvelopes } from "../src/envelope.ts";
import { projectRun } from "../src/index.ts";

const { events, issues } = parseEnvelopes(readFileSync(join(import.meta.dirname, "fixtures", "parallel-run", "events.jsonl"), "utf8"));
const projection = projectRun(events);
const at = (seq: number) => projection.activations.find((activation) => activation.seq === seq);

describe("projectRun over a log of `parallel`", () => {
	it("reads every line, and notes for each activation the others open beside it, both ways, in the order of the log", () => {
		expect([events.length, issues]).toEqual([153, []]);
		expect(at(4)).toMatchObject({ actor: "resident:A02", tick: 0, basis: 2, closedSeq: 27, overlaps: [3, 5, 6, 11, 13, 18] });
		expect(at(3)?.overlaps).toEqual([4, 5, 6, 11]);
		// A04's second activation opened after its first had closed (seq 10): they do not overlap.
		expect(at(11)?.overlaps).toEqual([3, 4, 5, 13, 18]);
		expect(at(32)).toMatchObject({ basis: 31, overlaps: [] });
		for (const activation of projection.activations) for (const other of activation.overlaps) expect(at(other)?.overlaps).toContain(activation.seq);
	});

	it("gives every call its `basis`: a call made before it saw the other's post has the opening's basis, the next has the answer before", () => {
		expect(at(4)?.calls.map((call) => [call.seq, call.basis, call.answer?.seq])).toEqual([[14, 2, 16], [23, 16, 25]]);
		expect(at(5)?.calls.map((call) => [call.seq, call.basis])).toEqual([[7, 2]]);
	});

	it("attaches each line to its own activation, also where the lines of two activations interleave", () => {
		expect([7, 9, 10, 12, 14, 16, 17].map((seq) => projection.attached.get(seq))).toEqual([5, 5, 6, 3, 4, 4, 5]);
	});
});
