// SPDX-License-Identifier: Apache-2.0
import { formatIssue, SwtError, SwtIssueSchema, type SwtIssue } from "@swarmtales/contracts";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import * as errors from "../src/errors.ts";

/** The G, M and P codes of section 2.11 and of the errata E24 and E25, written out so that a code dropped from the catalogue fails here. */
const CODES_OF_M1 = ["G001", "G002", "G003", "G010", "G011", "G012", "G013", "G014", "G020", "G021", "G022", "G030", "G031", "G032", "M010", "M011", "M012", "M014", "M021", "M022", "M023", "P003"].map((code) => `SWT-${code}`);

const mismatch = { path: "mechanics[0].options.size", message: 'must be an integer from 2 to 10, got "3x3"' };
const samples: readonly SwtIssue[] = [
	errors.gameSchemaMismatch({ path: "end", message: "must have the field `ticks`" }),
	errors.schemaVersion({ found: 2 }),
	errors.directorsReserved({ count: 1 }),
	errors.residentId({ id: "A01", path: "residents[3]", reason: "doubled" }),
	errors.residentId({ id: "A 1", path: "residents[0]", reason: "malformed" }),
	errors.memberNotResident({ kind: "team", group: "X", id: "A07", path: "teams.X[2]", residents: ["A01", "A02"] }),
	errors.toolNotDefined({ tool: "playMov", place: "granted", path: "grants.resident[5]", defined: ["playMove", "resign"] }),
	errors.shownNameClash({ shown: "post", grant: "resident", tools: ["@a/x/x/post", "@a/y/y/post"], path: "mechanics[2]" }),
	errors.shownNameMalformed({ shown: "play move", tool: "@a/x/x/playMove", path: "mechanics[0].as.playMove" }),
	errors.optionMismatch({ owner: "grid-game", package: "@swarmtales/mechanic-grid-game", ...mismatch }),
	errors.mechanicTwice({ mechanic: "grid-game", path: "mechanics[3]" }),
	errors.mechanicNotInstalled({ mechanic: "grid-gam", path: "mechanics[1].use", installed: ["grid-game", "consensus"] }),
	errors.noProvider({ mechanic: "consensus", service: "consensus-source", path: "mechanics[1]" }),
	errors.twoProviders({ service: "board", providers: ["grid-game", "morris"] }),
	errors.requiresCycle({ mechanics: ["ping", "pong"] }),
	errors.eventTypeTaken({ mechanic: "clash", type: "run_ended" }),
	errors.packageMismatch({ mechanic: "grid-game", declared: "@acme/grid", actual: "@swarmtales/mechanic-grid-game" }),
	errors.bodyMismatch({ mechanic: "marks", part: "tool", name: "pay", problem: "missing" }),
	errors.bodyMismatch({ mechanic: "marks", part: "service", name: "ledger", problem: "undeclared" }),
	errors.stateUnsaved({ mechanic: "marks", problem: "no-start" }),
	errors.stateUnsaved({ mechanic: "marks", package: "@acme/marks", problem: "no-schema" }),
	errors.payloadMismatch({ mechanic: "marks", type: "marks_spent", path: "/remaining", message: "must be a number, got undefined" }),
	errors.serviceMismatch({ service: "exile", method: "isExiled", side: "output", provider: "exile", caller: "seal", path: "", message: "must be a boolean, got null" }),
	errors.factMismatch({ mechanic: "marks", fact: "balance", path: "/A01", message: 'must be an integer, got "3"' }),
	errors.promptWithoutText({ owner: "marks", prompt: "marks/tools/pay", lookedIn: ["games/g/prompts/marks/tools/pay.md", "mechanics/marks/prompts/tools/pay.md"] }),
];

describe("the sdk's error catalogue", () => {
	it("holds every G, M and P code of 2.11, and a function for each", () => {
		expect(Object.keys(errors.SDK_ERRORS)).toEqual(CODES_OF_M1);
		expect([...new Set(samples.map((issue) => issue.code))]).toEqual(CODES_OF_M1);
		const functions = Object.values(errors).filter((value) => typeof value === "function");
		expect(functions).toHaveLength(CODES_OF_M1.length);
	});

	it.each(samples.map((issue) => [issue.code, issue] as const))("%s has a summary, a why and a fix, and is a valid issue", (_code, issue) => {
		expect(Value.Check(SwtIssueSchema, issue)).toBe(true);
		for (const text of [issue.summary, issue.why, issue.fix]) {
			expect(text.trim().length).toBeGreaterThan(10);
			expect(text).not.toMatch(/\[object|\bstory\b|\boverseer\b/i);
		}
		expect(issue.why).toMatch(/\.$/);
		expect(issue.fix).toMatch(/\.$/);
		expect(formatIssue(issue).split("\n").at(-1)).toBe(`  docs: docs/reference/errors.md#${issue.code.toLowerCase()}`);
	});

	it("prints the standard's example of SWT-G012 with a did-you-mean", () => {
		expect(formatIssue(samples[6] ?? errors.schemaVersion({ found: 0 })).split("\n")).toEqual([
			'error SWT-G012: tool "playMov" is granted but no mechanic of the game defines it',
			"  at grants.resident[5]",
			'  The game\'s mechanics define: "playMove", "resign".',
			'  fix: did you mean "playMove"? Or add the mechanic that defines "playMov", or remove the name.',
			"  docs: docs/reference/errors.md#swt-g012",
		]);
		expect(errors.mechanicNotInstalled({ mechanic: "grid-gam", path: "mechanics[1].use", installed: ["grid-game"] }).fix).toMatch(/^did you mean "grid-game"\?/);
		expect(errors.toolNotDefined({ tool: "fly", place: "locked", path: "locked[0]", defined: [] }).fix).toBe('add the mechanic that defines "fly", or remove the name.');
	});

	it("names the place: a data path, a package, both or none", () => {
		expect(errors.optionMismatch({ owner: "grid-game", package: "@swarmtales/mechanic-grid-game", ...mismatch }).where).toEqual({ path: mismatch.path, package: "@swarmtales/mechanic-grid-game" });
		expect(errors.optionMismatch({ owner: "turns", kind: "scheduler", path: "scheduler.options.until", message: "is unknown" }).summary).toBe('`scheduler.options.until` of the scheduler "turns" is unknown');
		expect(errors.eventTypeTaken({ mechanic: "a", type: "moved", owner: "b" })).not.toHaveProperty("where");
		expect(errors.eventTypeTaken({ mechanic: "a", type: "moved", owner: "b" }).summary).toMatch(/declared by the mechanic "b" too/);
		expect(errors.gameSchemaMismatch({ message: "is not an object" }).summary).toBe("the game is not an object");
	});

	it("words the codes of a head and a body that do not fit, and of a fact", () => {
		expect(errors.bodyMismatch({ mechanic: "marks", part: "tool", name: "pay", problem: "missing" }).summary).toBe('the head of "marks" declares the tool "pay", but the body has no handlers for it');
		expect(errors.bodyMismatch({ mechanic: "marks", part: "service", name: "ledger", problem: "undeclared" }).fix).toBe('Declare "ledger" in the head\'s `provides`, or remove it from the body\'s `services`.');
		expect(errors.stateUnsaved({ mechanic: "marks", package: "@acme/marks", problem: "no-schema" })).toMatchObject({ code: "SWT-M014", where: { package: "@acme/marks" }, details: { problem: "no-schema" } });
		expect(errors.factMismatch({ mechanic: "marks", fact: "balance", path: "", message: "must be an object, got null" }).summary).toBe('the fact "marks.balance" has a wrong value: must be an object, got null');
		expect(errors.factMismatch({ mechanic: "marks", fact: "balance", path: "/A01", message: "must be an integer" })).toMatchObject({ code: "SWT-M023", summary: 'the fact "marks.balance" has a wrong value: /A01 must be an integer', where: { path: "/A01" } });
	});

	it("is thrown as an SwtError whose message leads with the code", () => {
		const error = new SwtError(errors.payloadMismatch({ mechanic: "marks", type: "marks_spent", path: "/remaining", message: "must be a number, got undefined" }));
		expect(error.code).toBe("SWT-M021");
		expect(error.message).toMatch(/^error SWT-M021: mechanic "marks" emitted "marks_spent" with a wrong payload: \/remaining must be a number, got undefined\n/);
	});
});
