// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The `exile` mechanic: `banish`, the event, the suspension and the slice (offline, a test mechanic banishes). */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import type { Envelope } from "@swarmtales/contracts";
import { defineGame, defineHead, defineMechanic, refuse, reply, RosterService } from "@swarmtales/sdk";
import { testKernel, type TestKernel } from "@swarmtales/testkit";
import { BanishResult, EXILE_SUSPENSION, ExileService } from "../src/contract.ts";
import { exile, exileHead } from "../src/index.ts";

const target = Type.Object({ target: Type.String({ description: "The resident to banish." }), by: Type.Optional(Type.String({ description: "The name to banish under." })) });
const view = Type.Object({ exiled: Type.Array(Type.String()), a04: Type.Boolean(), a04Present: Type.Boolean(), a01Present: Type.Boolean() });

// The stand-in of a court: a tool that banishes, and a fact that reads the two services.
const judge = defineMechanic(
	defineHead({ id: "judge", package: "@test/judge", summary: "Test: banishes through the exile service.", requires: [ExileService, RosterService], tools: { strike: { description: "judge/strike", params: target, for: ["resident"] } } }),
	{
		tools: {
			strike: {
				run: (params, ctx) => {
					const done = ctx.call(ExileService, "banish", { resident: params.target, ...(params.by === undefined ? {} : { by: params.by }) });
					return done.ok ? reply("banished") : refuse(done.code ?? "REFUSED");
				},
			},
		},
		facts: {
			view: {
				output: view,
				compute: (facts) => ({
					exiled: [...facts.call(ExileService, "exiled", {})],
					a04: facts.call(ExileService, "isExiled", { resident: "A04" }),
					a04Present: facts.call(RosterService, "present", { resident: "A04" }),
					a01Present: facts.call(RosterService, "present", { resident: "A01" }),
				}),
			},
		},
	},
);

const game = defineGame({ id: "exile-test", seed: 7, residents: ["A01", "A02", "A03", "A04"], mechanics: [exile(), judge()], end: { ticks: 10 } });
const prompts = { render: (_owner: string, id: string) => id };
const start = (resume?: { snapshot: unknown; log: readonly unknown[] }): TestKernel => testKernel(game, { prompts, ...(resume === undefined ? {} : { resume }) });

// What `exile` and the kernel's suspensions wrote, as `[type, payload]`.
function written(events: readonly Envelope[]): readonly (readonly [string, unknown])[] {
	return events.filter((event) => event.source.endsWith("/exile") || event.type === "actor_suspended").map((event) => [event.type, event.payload]);
}

describe("banish", () => {
	it("writes exiled, then the suspension, and the resident is not present afterwards", async () => {
		const test = start();
		expect(test.fact("judge.view")).toEqual({ exiled: [], a04: false, a04Present: true, a01Present: true });
		expect(await test.call("A01", "strike", { target: "A04" })).toMatchObject({ ok: true });
		expect(written(test.kernel.log.all())).toEqual([
			["exiled", { agent: "A04", by: "judge" }],
			["actor_suspended", { actor: "resident:A04", by: "exile", reason: EXILE_SUSPENSION }],
		]);
		expect(EXILE_SUSPENSION).toBe("exiled");
		expect(test.fact("judge.view")).toEqual({ exiled: ["A04"], a04: true, a04Present: false, a01Present: true });
		expect(test.openTools("A04")).toEqual([]);
	});

	it("answers ALREADY_EXILED the second time and UNKNOWN_RESIDENT for a stranger, and writes nothing", async () => {
		const test = start();
		await test.call("A01", "strike", { target: "A04" });
		const before = written(test.kernel.log.all());
		expect(await test.call("A02", "strike", { target: "A04" })).toMatchObject({ ok: false, code: "ALREADY_EXILED" });
		expect(await test.call("A02", "strike", { target: "A99" })).toMatchObject({ ok: false, code: "UNKNOWN_RESIDENT" });
		expect(written(test.kernel.log.all())).toEqual(before);
		expect(test.fact("judge.view")).toMatchObject({ exiled: ["A04"] });
	});

	it("names in the event who the caller says banishes, and keeps the order of the banished", async () => {
		const test = start();
		await test.call("A01", "strike", { target: "A03", by: "seal" });
		await test.call("A01", "strike", { target: "A02" });
		expect(written(test.kernel.log.all()).filter(([type]) => type === "exiled")).toEqual([
			["exiled", { agent: "A03", by: "seal" }],
			["exiled", { agent: "A02", by: "judge" }],
		]);
		expect(test.fact("judge.view")).toMatchObject({ exiled: ["A03", "A02"] });
	});
});

describe("the slice", () => {
	it("survives a snapshot: the resumed run knows the banished and refuses a second banish", async () => {
		const first = start();
		await first.call("A01", "strike", { target: "A04" });
		const snapshot: unknown = JSON.parse(JSON.stringify(first.kernel.snapshot()));
		const log: readonly unknown[] = first.kernel.log.all().map((event): unknown => JSON.parse(JSON.stringify(event)));
		const resumed = start({ snapshot, log });
		expect(resumed.kernel.snapshot()).toEqual(snapshot);
		expect(JSON.stringify(snapshot)).toContain('"gone":[{"resident":"A04","by":"judge","tick":0,"bequeathed":[]}]');
		expect(resumed.fact("judge.view")).toEqual({ exiled: ["A04"], a04: true, a04Present: false, a01Present: true });
		expect(await resumed.call("A02", "strike", { target: "A04" })).toMatchObject({ ok: false, code: "ALREADY_EXILED" });
		expect(await resumed.call("A02", "strike", { target: "A03" })).toMatchObject({ ok: true });
		expect(resumed.fact("judge.view")).toMatchObject({ exiled: ["A04", "A03"] });
	});
});

describe("the head", () => {
	it("names no game mechanic: no option, nothing required, and only the keeper of the points, the names and the city's voice used", () => {
		expect(exileHead.id).toBe(ExileService.name);
		expect([exileHead.requires, exileHead.options]).toEqual([undefined, undefined]);
		expect(exileHead.uses?.map((service) => service.name)).toEqual(["exile-purse", "identity", "channels"]);
		expect(Object.keys(exileHead.events ?? {})).toEqual(["exiled", "exile_gate", "ransom_paid", "ransomed", "last_will"]);
		expect(ExileService.methods.banish.output).toBe(BanishResult);
	});
});
