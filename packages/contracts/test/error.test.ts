// SPDX-License-Identifier: Apache-2.0
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { closest, formatIssue, SWT_CODE, SwtError, SwtIssueSchema, type SwtIssue } from "../src/error.ts";
import { missingDescriptions } from "./descriptions.ts";

const granted: SwtIssue = {
	code: "SWT-G012",
	summary: 'tool "playMov" is granted but no mechanic of the game defines it',
	where: { file: "game.ts", line: 14, path: "grants.resident[5]" },
	why: "The game's mechanics define: playMove, resign, postTeam, readTeam.",
	fix: 'did you mean "playMove"? Or add the mechanic that defines "playMov".',
};
const bare: SwtIssue = { code: "SWT-R001", summary: "the kernel is used after it failed", why: "A failed kernel stays failed.", fix: "Create a new kernel." };

describe("formatIssue", () => {
	it("prints the five lines: what, where, why, fix, docs", () => {
		expect(formatIssue(granted).split("\n")).toEqual([
			'error SWT-G012: tool "playMov" is granted but no mechanic of the game defines it',
			"  at game.ts:14, grants.resident[5]",
			"  The game's mechanics define: playMove, resign, postTeam, readTeam.",
			'  fix: did you mean "playMove"? Or add the mechanic that defines "playMov".',
			"  docs: docs/reference/errors.md#swt-g012",
		]);
	});

	it("prints each form of a place, and no `at` line without one", () => {
		const at = (where: NonNullable<SwtIssue["where"]>): string | undefined => formatIssue({ ...bare, where }).split("\n")[1];
		expect(at({ file: "game.yaml" })).toBe("  at game.yaml");
		expect(at({ path: "mechanics[1].options.size", package: "@swarmtales/mechanic-grid-game" })).toBe("  at mechanics[1].options.size, package @swarmtales/mechanic-grid-game");
		expect(formatIssue(bare).split("\n")).toHaveLength(4);
		expect(formatIssue({ ...bare, where: {} }).split("\n")).toHaveLength(4);
	});
});

describe("SwtIssueSchema", () => {
	it("accepts an issue and refuses a code outside the pattern", () => {
		expect(Value.Check(SwtIssueSchema, { ...granted, details: { tool: "playMov" } })).toBe(true);
		for (const code of ["SWT-G12", "SWT-Z001", "G012", "SWT-G0123", "swt-g012"]) {
			expect(new RegExp(SWT_CODE).test(code)).toBe(false);
			expect(Value.Check(SwtIssueSchema, { ...granted, code })).toBe(false);
		}
		expect(Value.Check(SwtIssueSchema, { code: granted.code, summary: granted.summary, why: granted.why })).toBe(false);
	});

	it("refuses an unknown field in the issue and in its place", () => {
		expect(Value.Check(SwtIssueSchema, { ...bare, hint: "x" })).toBe(false);
		expect(Value.Check(SwtIssueSchema, { ...bare, where: { file: "game.ts", column: 3 } })).toBe(false);
	});

	it("describes every part", () => {
		expect(missingDescriptions(SwtIssueSchema, "SwtIssueSchema")).toEqual([]);
	});
});

describe("SwtError", () => {
	it("holds every issue; message and code are those of the first", () => {
		const error = new SwtError([granted, bare]);
		expect(error).toBeInstanceOf(Error);
		expect(error.name).toBe("SwtError");
		expect(error.issues).toEqual([granted, bare]);
		expect(error.code).toBe("SWT-G012");
		expect(error.message).toBe(formatIssue(granted));
	});

	it("takes one issue and a cause", () => {
		const cause = new RangeError("line 4 does not fit a board of 3");
		const error = new SwtError(bare, { cause });
		expect(error.issues).toEqual([bare]);
		expect(error.code).toBe("SWT-R001");
		expect(error.cause).toBe(cause);
	});

	it("stays an error with an empty code when it is given no issue", () => {
		const error = new SwtError([]);
		expect(error.code).toBe("");
		expect(error.message).toBe("error: no issue was given");
	});
});

describe("closest", () => {
	const tools = ["viewBoard", "playMove", "resign", "postTeam"];

	it("finds a name within an edit distance of 2", () => {
		expect(closest("playMov", tools)).toBe("playMove");
		expect(closest("plyaMove", tools)).toBe("playMove");
		expect(closest("resign", tools)).toBe("resign");
		expect(closest("xresignx", tools)).toBe("resign");
	});

	it("finds nothing at a distance of 3 or among no names", () => {
		expect(closest("playMo", ["playMove!"])).toBeUndefined();
		expect(closest("castVote", tools)).toBeUndefined();
		expect(closest("playMove", [])).toBeUndefined();
	});

	it("prefers the nearer name, and the first one on a tie", () => {
		expect(closest("readTeam", ["readTeams!", "readTeams", "readTeam"])).toBe("readTeam");
		expect(closest("cat", ["bat", "hat"])).toBe("bat");
	});
});
