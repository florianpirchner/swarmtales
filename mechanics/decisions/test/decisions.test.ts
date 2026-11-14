// SPDX-License-Identifier: Apache-2.0
/** The decision window without amendments: the cases of the old `test/host/decisions.test.ts`, with a test mechanic as owner. */
import { describe, expect, it } from "vitest";
import { SwtError } from "@swarmtales/contracts";
import { play } from "@swarmtales/testkit";
import { decide, game, slice, told } from "./owner.ts";

const PROPOSAL = { exiled: "A03" };
const SCHEMA = { type: "object", required: ["exiled"], properties: { exiled: { type: "string" } } };
const CALLED = (window: number): unknown => [0, "service_called", { service: "decisions", method: "propose", caller: "owner", input: { kind: "owner.verdict", proposal: PROPOSAL, window, schema: SCHEMA } }];
const PROPOSED = [0, "decision_proposed", { decision: "D1", kind: "owner.verdict", owner: "owner", proposal: PROPOSAL, schema: SCHEMA, deadline: 2, holders: ["resident:A02"] }];
const LISTED = [0, "listed", { open: [{ decision: "D1", kind: "owner.verdict", owner: "owner", deadline: 2 }] }];
const SETTLED = [2, "decision_settled", { decision: "D1", kind: "owner.verdict", owner: "owner", changed: false, proposal: PROPOSAL, amendments: [] }];

describe("decisions", () => {
	// Open detail 1 of the M3 specification (section 18): the refusal comes while the kernel is created, as SWT-G020.
	it("refuses a holder that is no actor of the run before the run starts", async () => {
		const refused = await decide({ window: 2 }, ["resident:A02", "director:warden"]).catch((thrown: unknown) => thrown);
		expect(refused).toBeInstanceOf(SwtError);
		expect(refused instanceof SwtError ? refused.issues.map((issue) => [issue.code, issue.summary]) : []).toEqual([["SWT-G020", '`options.holders[1]` of the mechanic "decisions" names "director:warden", which is no actor of the run']]);
	});

	it("commits at once with a window of 0 and writes nothing", async () => {
		const run = await decide({ window: 0 });
		expect(told(run.events)).toEqual([CALLED(0), [0, "committed", { proposal: PROPOSAL }]]);
		expect(slice(run)).toEqual({ next: 1, open: {} });
	});

	it("commits at once when no holder is named, and when the only holder is suspended", async () => {
		expect(told((await decide({ window: 2 }, [])).events)).toEqual([CALLED(2), [0, "committed", { proposal: PROPOSAL }]]);
		expect(told((await decide({ window: 2, bench: "A02" })).events).map((entry) => entry[1])).toEqual(["service_called", "committed"]);
	});

	it("logs a proposal with its deadline and holders, and settles it at the deadline with the original proposal", async () => {
		const run = await decide({ window: 2 });
		expect(told(run.events)).toEqual([CALLED(2), PROPOSED, LISTED, SETTLED, [2, "committed", { proposal: PROPOSAL, decision: "D1" }]]);
		// The owner's commit is caused by the settlement, and the settlement comes before anybody acts in its tick.
		const settled = run.events.find((event) => event.type === "decision_settled");
		expect(run.events.find((event) => event.type === "committed")?.causedBy).toBe(settled?.seq);
		expect(run.events.find((event) => event.tick === 2 && event.type === "activation_opened")?.seq).toBeGreaterThan(settled?.seq ?? Infinity);
		expect(slice(run)).toEqual({ next: 2, open: {} });
	});

	it("keeps the open decision in the snapshot, and the resumed run settles at the same tick", async () => {
		const straight = await decide({ window: 2 });
		const first = await decide({ window: 2 }, undefined, { ticks: 1 });
		expect(slice(first)).toEqual({ next: 2, open: { D1: { kind: "owner.verdict", owner: "owner", proposal: PROPOSAL, schema: SCHEMA, deadline: 2, amendments: [] } } });
		const resume = { snapshot: structuredClone(first.kernel.snapshot()), log: structuredClone([...first.events]) };
		const rest = await play(game(), { resume });
		expect(JSON.stringify(rest.events)).toBe(JSON.stringify(straight.events));
		expect(rest.kernel.snapshot()).toEqual(straight.kernel.snapshot());
	});

	it("leaves a decision open whose deadline is after the last tick", async () => {
		const run = await decide({ window: 2 }, undefined, {}, 2);
		expect(told(run.events)).toEqual([CALLED(2), PROPOSED, LISTED]);
		expect(run.end?.reason).toBeDefined();
		expect(slice(run)).toMatchObject({ open: { D1: { deadline: 2 } } });
	});
});
