/** The end-of-run notes: capped turns and forfeited moves read back from events.jsonl. */
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { describeRunNotes, readRunNotes } from "../../apps/cli/src/host/run-notes.ts";

describe("run notes", () => {
	it("counts turns at the output cap and forfeited moves, and skips broken lines", () => {
		const file = join(mkdtempSync(join(tmpdir(), "notes-")), "events.jsonl");
		const lines = [
			JSON.stringify({ type: "usage", output: 16000 }),
			JSON.stringify({ type: "usage", output: 15900 }),
			JSON.stringify({ type: "usage", output: 300 }),
			JSON.stringify({ type: "consensus_forfeited", team: "X" }),
			"not json",
			JSON.stringify({ type: "move_played" }),
		];
		writeFileSync(file, `${lines.join("\n")}\n`);
		const notes = readRunNotes(file, 16000);
		expect(notes).toEqual({ cappedTurns: 2, forfeits: 1 });
		expect(describeRunNotes(notes, 16000)).toBe("2 turns ended at the output cap of 16000 tokens, 1 forfeited moves");
		expect(describeRunNotes({ cappedTurns: 0, forfeits: 0 }, 4000)).toBe("no turn at the output cap, no forfeited move");
	});

	it("reads a missing file as a clean run", () => {
		expect(readRunNotes(join(tmpdir(), "does-not-exist.jsonl"), 4000)).toEqual({ cappedTurns: 0, forfeits: 0 });
	});
});
