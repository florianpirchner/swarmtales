// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Shared by the goals tests: the options of the City's old story file (its `goals`, `factions` from its tribunal,
 * its `coreMotives` for the real `motives`), stand-ins of `progression` (the acts, and points to set) and `exile`
 * (who is banished, a last will), and a game over the real `ledger`, `channels` and `motives`.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { channels } from "@swarmtales/mechanic-channels";
import { ExileEvents, ExileService } from "@swarmtales/mechanic-exile/contract";
import { ledger } from "@swarmtales/mechanic-ledger";
import { LedgerService } from "@swarmtales/mechanic-ledger/contract";
import { motives, MotivesOptions } from "@swarmtales/mechanic-motives";
import { ProgressionEvents } from "@swarmtales/mechanic-progression/contract";
import { defineGame, defineHead, defineMechanic, reply, type Game, type MechanicUse } from "@swarmtales/sdk";
import { goals, GoalsOptions } from "../src/index.ts";

/** The folder of the oracle files of the City. */
export const CITY = resolve(import.meta.dirname, "../../../oracles/cityofkeys");

const Story = Type.Object({ coreMotives: Type.Unknown(), goals: Type.Record(Type.String(), Type.Unknown()) }, { description: "The parts of the old story file the goals read" });
const story = Value.Parse(Story, JSON.parse(readFileSync(resolve(CITY, "setup", "cityofkeys.story.json"), "utf8")));

/** The goals of the City (its tribunal holds factions). */
export const GOALS: GoalsOptions = Value.Parse(GoalsOptions, { noteTools: ["notify", "boardNote"], ...story.goals, factions: true });

const MOTIVES = Value.Parse(MotivesOptions, { noteTools: ["notify", "boardNote"], ...Value.Parse(Type.Record(Type.String(), Type.Unknown()), story.coreMotives) });

const Act = Type.Object({ fromLevel: Type.Integer() });
const Account = Type.Object({ account: Type.String(), amount: Type.Integer() });

/** Stands for `progression`: `startAct` and `endAct` write its events; `auto` starts act 8 at tick 1 and ends it at tick 3. */
const acts = defineMechanic(
	defineHead({
		id: "progression",
		package: "@test/progression",
		summary: "Test: the acts.",
		options: Type.Object({ auto: Type.Boolean({ default: false, description: "Whether the act runs by itself" }) }),
		events: ProgressionEvents.events,
		requires: [LedgerService],
		tools: { startAct: { description: "Start.", params: Act }, endAct: { description: "End.", params: Act }, points: { description: "Mint.", params: Account } },
	}),
	{
		tools: {
			startAct: {
				run: ({ fromLevel }, ctx) => {
					ctx.emit("act_started", { fromLevel, residents: [...ctx.residents.ids] });
					return reply("started");
				},
			},
			endAct: {
				run: ({ fromLevel }, ctx) => {
					ctx.emit("act_ended", { fromLevel });
					return reply("ended");
				},
			},
			points: {
				run: ({ account, amount }, ctx) => {
					ctx.call(LedgerService, "mint", { account, amount, reason: "test" });
					return reply("minted");
				},
			},
		},
		hooks: {
			tickStarted: (ctx) => {
				if (ctx.options.auto && ctx.tick === 1) ctx.emit("act_started", { fromLevel: 8, residents: [...ctx.residents.ids] });
				if (ctx.options.auto && ctx.tick === 3) ctx.emit("act_ended", { fromLevel: 8 });
			},
		},
	},
);

const Banish = Type.Object({ resident: Type.String() });
const Will = Type.Object({ agent: Type.String(), heirs: Type.Array(Type.String()) });
const gone = new Set<string>();

/** Stands for `exile`: `banish` writes `exiled`, `will` writes `last_will` with a point to each heir; `auto` banishes A05 at tick 2. */
const exile = defineMechanic(
	defineHead({
		id: "exile",
		package: "@test/exile",
		summary: "Test: who is banished.",
		options: Type.Object({ auto: Type.Boolean({ default: false, description: "Whether A05 is banished by itself" }) }),
		events: ExileEvents.events,
		provides: [ExileService],
		tools: { banish: { description: "Banish.", params: Banish }, will: { description: "Will.", params: Will } },
	}),
	{
		tools: {
			banish: {
				run: ({ resident }, ctx) => {
					gone.add(resident);
					ctx.emit("exiled", { agent: resident });
					return reply("banished");
				},
			},
			will: {
				run: ({ agent, heirs }, ctx) => {
					ctx.emit("last_will", { agent, text: "mine", bequests: heirs.map((to) => ({ to, points: 1 })) });
					return reply("willed");
				},
			},
		},
		hooks: {
			tickStarted: (ctx) => {
				if (ctx.options.auto && ctx.tick === 2) ctx.emit("exiled", { agent: "A05" });
			},
		},
		services: {
			exile: {
				banish: () => ({ ok: false, code: "UNKNOWN_RESIDENT" }),
				toGate: () => null,
				isExiled: ({ resident }) => gone.has(resident),
				exiled: () => [...gone],
				standing: () => ({ kind: "alive" }),
				alive: (_input, ctx) => ctx.residents.ids.filter((id) => !gone.has(id)),
				exiledBy: () => null,
				gates: () => [],
				ransomed: () => false,
				bequeathed: () => [],
			},
		},
	},
);

/** The tools the tests call as the actor `script`. */
export const SCRIPT = ["startAct", "endAct", "points", "banish", "will", "notify", "boardNote"];

/** How a test game is built. */
export interface GameSpec {
	/** The seed, 7 when left out. */
	readonly seed?: number;
	/** How many residents, 6 when left out. */
	readonly residents?: number;
	/** The goals' options, the City's when left out. */
	readonly options?: GoalsOptions;
	/** Whether the stand-ins play the act by themselves. */
	readonly auto?: boolean;
	/** More mechanics, after `goals`. */
	readonly more?: readonly MechanicUse[];
	/** More tools the actor `script` may call. */
	readonly script?: readonly string[];
}

/**
 * The game of the tests: `ledger`, `channels`, `motives` of the City, the two stand-ins, then `goals`.
 *
 * @param spec - The game's spec.
 * @returns The game.
 */
export function gameOf(spec: GameSpec = {}): Game {
	gone.clear();
	const auto = spec.auto ?? false;
	return defineGame({
		id: "goals-test",
		seed: spec.seed ?? 7,
		residents: Array.from({ length: spec.residents ?? 6 }, (_, index) => `A${String(index + 1).padStart(2, "0")}`),
		mechanics: [ledger({ startPoints: 0 }), channels(), motives(MOTIVES), acts({ auto }), exile({ auto }), goals(spec.options ?? GOALS), ...(spec.more ?? [])],
		scheduler: { id: "turns", options: { passes: 1, activation: "always", order: "roster", inputs: [{ kind: "status", join: " · " }] } },
		end: { ticks: 4 },
		grants: { script: [...SCRIPT, ...(spec.script ?? [])] },
	});
}
