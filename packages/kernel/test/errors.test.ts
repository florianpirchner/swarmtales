// SPDX-License-Identifier: Apache-2.0
import { Check } from "typebox/value";
import { describe, expect, it } from "vitest";
import { formatIssue, SwtError, SwtIssueSchema, type SwtIssue } from "@swarmtales/contracts";
import * as errors from "../src/errors.ts";

/** Every R code of section 2.11 of the M1 specification, with an issue built by the catalogue. */
const CATALOGUE: Readonly<Record<string, SwtIssue>> = {
	"SWT-R001": errors.kernelFailed(),
	"SWT-R002": errors.misfit("the snapshot was taken from the game \"other\"", "Resume it with its own game."),
	"SWT-R003": errors.pluginThrew("grid-game", new TypeError("cell is taken")),
	"SWT-R010": errors.orderNoPermutation("@swarmtales/engine/turns"),
	"SWT-R011": errors.noDriver("resident:A01"),
	"SWT-R013": errors.twoToAct(["grid-game", "other-game"]),
	"SWT-R014": errors.noToAct("@swarmtales/engine/turns"),
	"SWT-R015": errors.unknownFact("grid-game.winer", ["grid-game.winner"]),
	"SWT-R016": errors.afterCycle(["a", "b"]),
	"SWT-R020": errors.sinkThrew(new Error("disk full")),
};

describe("the R catalogue", () => {
	it("has one function per code and no other export but `guarded`", () => {
		expect(Object.keys(errors).sort()).toEqual(["afterCycle", "guarded", "kernelFailed", "misfit", "noDriver", "noToAct", "orderNoPermutation", "pluginThrew", "sinkThrew", "twoToAct", "unknownFact"]);
		expect(Object.keys(CATALOGUE)).toHaveLength(10);
	});

	it.each(Object.entries(CATALOGUE))("%s is a valid issue with its own code and formats in four lines", (code, issue) => {
		expect(issue.code).toBe(code);
		expect(Check(SwtIssueSchema, issue)).toBe(true);
		for (const text of [issue.summary, issue.why, issue.fix]) expect(text.trim().length).toBeGreaterThan(10);
		expect(formatIssue(issue).split("\n")).toEqual([`error ${code}: ${issue.summary}`, `  ${issue.why}`, `  fix: ${issue.fix}`, `  docs: docs/reference/errors.md#${code.toLowerCase()}`]);
		expect(new SwtError(issue).code).toBe(code);
	});

	it("names the plugin and keeps the thrown message in SWT-R003", () => {
		expect(errors.pluginThrew("grid-game", new Error("cell is taken")).summary).toBe("grid-game: cell is taken");
		expect(errors.pluginThrew("grid-game", "plain text").summary).toBe("grid-game: plain text");
	});

	it("suggests the closest fact, or lists what exists", () => {
		expect(errors.unknownFact("grid-game.winer", ["a.b", "grid-game.winner"]).fix).toBe('Did you mean "grid-game.winner"?');
		expect(errors.unknownFact("x.y", ["grid-game.winner", "roster.size"]).fix).toBe("Use one of: grid-game.winner, roster.size.");
		expect(errors.unknownFact("x.y", []).fix).toBe("Use one of: (the loaded plugins declare no fact).");
	});
});

describe("guarded", () => {
	it("returns what the code returns", () => {
		expect(errors.guarded("p", () => 7)).toBe(7);
	});

	it("turns a throw into SWT-R003 with the thrown value as cause", () => {
		const thrown = new RangeError("no job \"x\" to schedule");
		const caught: unknown[] = [];
		try {
			errors.guarded("consensus", () => {
				throw thrown;
			});
		} catch (error) {
			caught.push(error);
		}
		const [error] = caught;
		expect(error).toBeInstanceOf(SwtError);
		expect(error instanceof SwtError ? [error.code, error.cause, error.message.split("\n")[0]] : []).toEqual(["SWT-R003", thrown, 'error SWT-R003: consensus: no job "x" to schedule']);
	});

	it("lets an SwtError leave unchanged, so the first failure leads", () => {
		const first = new SwtError(errors.afterCycle(["a", "b"]));
		expect(() => errors.guarded("outer", () => errors.guarded("inner", () => { throw first; }))).toThrow(first);
	});
});
