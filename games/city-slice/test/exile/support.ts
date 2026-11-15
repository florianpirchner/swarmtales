// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Shared by the gate and will tests: stand-ins for the keeper of the points (`exile-purse`), for `names` (`identity`)
 * and for a caller that opens a gate with the City's texts and prices, as the old tribunal did; the real `channels`.
 */
import { Type, type Static } from "typebox";
import type { Envelope } from "@swarmtales/contracts";
import { channels } from "@swarmtales/mechanic-channels";
import { IdentityService } from "@swarmtales/mechanic-contracts";
import { defineEvents, defineGame, defineHead, defineMechanic, type Game, type MechanicUse } from "@swarmtales/sdk";
import { testKernel, type TestKernel } from "@swarmtales/testkit";
import { ExilePurseService, ExileService } from "@swarmtales/mechanic-exile/contract";
import { exile } from "@swarmtales/mechanic-exile";

/** The residents of the tests. */
export const IDS = ["A01", "A02", "A03", "A04", "A05", "A06"] as const;

const BankEvents = defineEvents("bank", { booked: Type.Object({ debit: Type.String({ description: "Who pays" }), credit: Type.String({ description: "Who receives" }), amount: Type.Integer({ description: "The points" }), reason: Type.String({ description: "Why" }) }, { description: "Test: one booking" }) });

/** Stands in for the ledger: every resident starts with `points`; a burn credits `SYSTEM`. */
export function bank(points: Readonly<Record<string, number>>): MechanicUse {
	const head = defineHead({
		id: "bank",
		package: "@test/bank",
		summary: "Test: stands in for the keeper of the points.",
		state: Type.Record(Type.String(), Type.Number(), { description: "The balances" }),
		start: ({ residents }) => Object.fromEntries(residents.map((id) => [id, points[id] ?? 30])),
		events: BankEvents.events,
		provides: [ExilePurseService],
	});
	const book = (state: Record<string, number>, debit: string, credit: string, amount: number): void => {
		state[debit] = (state[debit] ?? 0) - amount;
		state[credit] = (state[credit] ?? 0) + amount;
	};
	return defineMechanic(head, {
		services: {
			"exile-purse": {
				balance: ({ account }, ctx) => ctx.state[account] ?? 0,
				burn: ({ account, amount, reason }, ctx) => {
					book(ctx.state, account, "SYSTEM", amount);
					ctx.emit("booked", { debit: account, credit: "SYSTEM", amount, reason });
					return null;
				},
				move: ({ from, to, amount, reason }, ctx) => {
					book(ctx.state, from, to, amount);
					ctx.emit("booked", { debit: from, credit: to, amount, reason });
					return null;
				},
			},
		},
	})();
}

const NAMES: Readonly<Record<string, string>> = { A01: "Mira", A02: "Rook", A05: "Ash" };

/** Stands in for `names`: three residents have a name. */
export const names = defineMechanic(defineHead({ id: "names", package: "@test/names", summary: "Test: stands in for the provider of identity.", provides: [IdentityService] }), {
	services: {
		identity: {
			nameOf: ({ resident }) => NAMES[resident] ?? null,
			display: ({ text }) => text.replace(/\bA0\d\b/g, (id) => NAMES[id] ?? id),
			resolve: ({ text }) => Object.keys(NAMES).find((id) => NAMES[id] === text) ?? text,
		},
	},
});

/** The City's texts of the gate (old `stories/cityofkeys/story.ts`, `texts`), the rule values filled. */
export const TEXTS = {
	exiled: "The gate has closed. The city has struck {exiled} from its register. No one will hear {exiled} again.",
	will: "Last will of {exiled}: {will}",
	ransomed: "{payers} paid the ransom. {exiled} returns to the city.",
} as const;

const Step = Type.Object(
	{
		tick: Type.Integer({ description: "When" }),
		resident: Type.String({ description: "Who goes to the gate, or is struck" }),
		by: Type.Optional(Type.String({ description: "Strikes with this `by` instead of opening a gate" })),
		until: Type.Integer({ default: 0, description: "When the gate closes" }),
		ransomable: Type.Boolean({ default: true, description: "Whether a ransom is taken" }),
		price: Type.Integer({ default: 20, description: "The price" }),
		selfPrice: Type.Integer({ default: 30, description: "The own price" }),
	},
	{ description: "Test: one gate to open or one strike" },
);

/** Stands in for the tribunal and the strikers: at the start of a tick it opens a gate (voters A01 to A03, a tenth per heir) or banishes. */
export const warden = defineMechanic(
	defineHead({
		id: "warden",
		package: "@test/warden",
		summary: "Test: opens gates and strikes through the exile service.",
		options: Type.Object({ plan: Type.Array(Step, { default: [], description: "The steps" }) }),
		requires: [ExileService],
	}),
	{
		hooks: {
			tickStarted: (ctx) => {
				for (const { tick, by, resident, ...gate } of ctx.options.plan) {
					if (tick !== ctx.tick) continue;
					if (by !== undefined) ctx.call(ExileService, "banish", { resident, by });
					else ctx.call(ExileService, "toGate", { resident, ...gate, voters: ["A01", "A02", "A03"], bequestPerHeir: 0.1, notice: `You stand at the gate until minute ${String(gate.until)}.`, texts: TEXTS, by: "tribunal" });
				}
			},
		},
	},
);

/** One step of the warden. */
export type WardenStep = Static<typeof Step>;

/**
 * The game of the exile with the stand-ins.
 *
 * @param plan - The warden's gates and strikes; a gate takes `A05` at tick 0 with the prices 20 and 30 unless it says otherwise.
 * @param extra - More mechanics, for example `names()`.
 * @param points - The start points of some residents; 30 for the others.
 * @returns The game.
 */
export function exileGame(plan: readonly Partial<WardenStep>[], extra: readonly MechanicUse[] = [], points: Readonly<Record<string, number>> = {}): Game {
	const steps = plan.map((step) => ({ tick: 0, resident: "A05", until: 0, ransomable: true, price: 20, selfPrice: 30, ...step }));
	return defineGame({ id: "exile-gate-test", seed: 7, residents: [...IDS], mechanics: [bank(points), channels(), exile(), warden({ plan: steps }), ...extra], scheduler: { id: "turns", options: { passes: 1, activation: "always", order: "roster" } }, end: { ticks: 80 } });
}

/**
 * A started kernel of {@link exileGame}.
 *
 * @param plan - The warden's steps.
 * @param extra - More mechanics.
 * @param points - The start points of some residents.
 * @returns The kernel and its helpers.
 */
export function start(plan: readonly Partial<WardenStep>[], extra: readonly MechanicUse[] = [], points: Readonly<Record<string, number>> = {}): TestKernel {
	return testKernel(exileGame(plan, extra, points));
}

/** What a call answered: the reply, or `CODE: detail`. */
export async function answer(test: TestKernel, resident: string, tool: string, params: unknown): Promise<string> {
	const outcome = await test.call(resident, tool, params);
	return outcome.ok ? outcome.reply : outcome.detail === undefined ? outcome.code : `${outcome.code}: ${outcome.detail}`;
}

/** The events of the exile, the bank and the city's voice, as `[type, payload]`. */
export function written(events: readonly Envelope[]): readonly (readonly [string, unknown])[] {
	return events.filter((event) => /\/(exile|bank|channels)$/.test(event.source) || event.type === "actor_suspended").map((event) => [event.type, event.payload]);
}
