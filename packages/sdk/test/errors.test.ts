// SPDX-License-Identifier: LicenseRef-SUL-1.0
import { formatIssue, SwtError, SwtIssueSchema, type SwtIssue } from "@swarmtales/contracts";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import * as errors from "../src/errors.ts";

/** The G, M and P codes of section 2.11 and of the errata E24 and E25, written out so that a code dropped from the catalogue fails here. */
const CODES_OF_M1 = ["G001", "G002", "G003", "G010", "G011", "G012", "G013", "G014", "G020", "G021", "G022", "G030", "G031", "G032", "G041", "D001", "D002", "D003", "D004", "M010", "M011", "M012", "M013", "M014", "M021", "M022", "M023", "M024", "M025", "P003"].map((code) => `SWT-${code}`);

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
	errors.paramOverride({ name: "openHand", problem: "unknown", known: ["openHands", "games"] }),
	errors.paramOverride({ name: "games", problem: "mismatch", known: ["openHands", "games"], message: "must be integer" }),
	errors.paramOverride({ name: "games", problem: "no-family" }),
	errors.triggerWithoutEvent({ director: "host", event: "decisions.proposed", path: "directors[0]", declared: ["decisions.decision_proposed"] }),
	errors.directorName({ name: "host", path: "directors[1]", taken: "director" }),
	errors.directorName({ name: "wardn", path: "directors[0].use", taken: "unknown", known: ["warden"] }),
	errors.directorName({ name: "human", path: "directors[0]", taken: "grant" }),
	errors.directorNeverActivated({ scheduler: "turns", directors: ["host"] }),
	errors.noAnswerer({ mechanic: "city", path: "mechanics[1]", answerer: "judge", answered: ["guard"] }),
	errors.eventTypeTaken({ mechanic: "clash", type: "run_ended" }),
	errors.packageMismatch({ mechanic: "grid-game", declared: "@acme/grid", actual: "@swarmtales/mechanic-grid-game" }),
	errors.bodyMismatch({ mechanic: "marks", part: "tool", name: "pay", problem: "missing" }),
	errors.bodyMismatch({ mechanic: "marks", part: "service", name: "ledger", problem: "undeclared" }),
	errors.optionsNoObject({ mechanic: "marks" }),
	errors.stateUnsaved({ mechanic: "marks", problem: "no-start" }),
	errors.stateUnsaved({ mechanic: "marks", package: "@acme/marks", problem: "no-schema" }),
	errors.payloadMismatch({ mechanic: "marks", type: "marks_spent", path: "/remaining", message: "must be a number, got undefined" }),
	errors.serviceMismatch({ service: "exile", method: "isExiled", side: "output", provider: "exile", caller: "seal", path: "", message: "must be a boolean, got null" }),
	errors.factMismatch({ mechanic: "marks", fact: "balance", path: "/A01", message: 'must be an integer, got "3"' }),
	errors.sliceMismatch({ mechanic: "marks", problem: "loaded", path: "/A01", message: "must be an integer" }),
	errors.commandInView({ mechanic: "marks", service: "ledger", method: "pay" }),
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
		expect(errors.optionsNoObject({ mechanic: "marks", package: "@acme/marks" })).toEqual({ code: "SWT-M013", summary: 'the `options` schema of mechanic "marks" is no object schema', where: { package: "@acme/marks" }, why: "A game gives a mechanic its options by name, so the schema of the options is an object with one property per option.", fix: 'Declare `options: Type.Object({ ... })` in the head of "marks", or leave `options` out.' });
		expect(errors.stateUnsaved({ mechanic: "marks", package: "@acme/marks", problem: "no-schema" })).toMatchObject({ code: "SWT-M014", where: { package: "@acme/marks" }, details: { problem: "no-schema" } });
		expect(errors.factMismatch({ mechanic: "marks", fact: "balance", path: "", message: "must be an object, got null" }).summary).toBe('the fact "marks.balance" has a wrong value: must be an object, got null');
		expect(errors.factMismatch({ mechanic: "marks", fact: "balance", path: "/A01", message: "must be an integer" })).toMatchObject({ code: "SWT-M023", summary: 'the fact "marks.balance" has a wrong value: /A01 must be an integer', where: { path: "/A01" } });
	});

	it("words a slice that cannot be saved or loaded (SWT-M024) and a command in a view (SWT-M025)", () => {
		const slice = (input: Partial<Parameters<typeof errors.sliceMismatch>[0]>): string => errors.sliceMismatch({ mechanic: "marks", problem: "saved", ...input }).summary;
		expect(slice({ path: "/A01", message: "must be an integer" })).toBe('the snapshot slice of mechanic "marks" does not match the state schema when it is saved: /A01 must be an integer');
		expect(slice({ problem: "loaded", path: "", message: "must be an object" })).toBe('the snapshot slice of mechanic "marks" does not match the state schema when it is loaded: must be an object');
		expect(slice({ problem: "newer", version: 3, known: 2 })).toBe('the snapshot slice of mechanic "marks" has version 3, which is newer than 2');
		expect(slice({ problem: "no-migration", version: 0 })).toBe('the snapshot slice of mechanic "marks" has version 0, and the head has no migration from it');
		expect(errors.sliceMismatch({ mechanic: "marks", package: "@acme/marks", problem: "newer", version: 3, known: 2 })).toMatchObject({ code: "SWT-M024", where: { package: "@acme/marks" }, details: { problem: "newer" } });
		expect(errors.commandInView({ mechanic: "marks", package: "@acme/marks", service: "ledger", method: "pay" })).toMatchObject({ code: "SWT-M025", summary: 'a fact or a run limit of mechanic "marks" called "ledger.pay", which is a command', where: { package: "@acme/marks" } });
	});

	it("names no provider when the caller does not know it, and puts one space after the colon for a mismatch without a path (erratum O8)", () => {
		const call = { service: "exile", method: "isExiled", side: "output", caller: "seal", path: "", message: "must be a boolean, got null" } as const;
		expect(errors.serviceMismatch(call)).toMatchObject({ summary: 'the output of "exile.isExiled" is wrong (caller "seal"): must be a boolean, got null', fix: 'Correct the implementation of "exile", or the output schema of "isExiled" in the contract of "exile".' });
		expect(errors.serviceMismatch({ ...call, provider: "gate", path: "/a" }).summary).toBe('the output of "exile.isExiled" is wrong (provider "gate", caller "seal"): /a must be a boolean, got null');
		expect(errors.payloadMismatch({ mechanic: "marks", type: "spent", path: "", message: "must be an object" }).summary).toBe('mechanic "marks" emitted "spent" with a wrong payload: must be an object');
		expect(errors.factMismatch({ mechanic: "marks", path: "", message: "must be an integer" })).toMatchObject({ summary: 'a fact of mechanic "marks" has a wrong value: must be an integer', fix: 'Correct `compute` of the fact in the body of "marks", or its `output` schema.' });
		expect(errors.toolNotDefined({ tool: "playMov", place: "renamed", path: "mechanics[0].as.playMov", defined: ["playMove"] })).toMatchObject({ code: "SWT-G012", summary: 'tool "playMov" is renamed with `as` but its mechanic does not define it', fix: 'did you mean "playMove"? Or remove "playMov" from `as`.' });
	});

	it("is thrown as an SwtError whose message leads with the code", () => {
		const error = new SwtError(errors.payloadMismatch({ mechanic: "marks", type: "marks_spent", path: "/remaining", message: "must be a number, got undefined" }));
		expect(error.code).toBe("SWT-M021");
		expect(error.message).toMatch(/^error SWT-M021: mechanic "marks" emitted "marks_spent" with a wrong payload: \/remaining must be a number, got undefined\n/);
	});
});
