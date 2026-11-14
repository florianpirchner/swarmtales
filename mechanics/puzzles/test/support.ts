// SPDX-License-Identifier: Apache-2.0
/** Shared by the puzzles tests: the levels and deals of the City of Keys oracles, a game, a judge that banishes, and a stand-in of the ledger. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Type, type Static } from "typebox";
import { Value } from "typebox/value";
import type { Envelope } from "@swarmtales/contracts";
import { exile } from "@swarmtales/mechanic-exile";
import { ExileEvents, ExileService } from "@swarmtales/mechanic-exile/contract";
import { defineEvents, defineGame, defineHead, defineMechanic, refuse, reply, type Game, type MechanicUse } from "@swarmtales/sdk";
import { readOracle } from "@swarmtales/testkit";
import { PuzzlesOptions, puzzles, type TeamPlanner } from "../src/index.ts";

const ORACLES = resolve(import.meta.dirname, "../../../oracles/cityofkeys");
const Story = Type.Object({ levels: Type.Array(Type.Object({ number: Type.Integer(), team: Type.Unknown(), puzzle: Type.Object({ kind: Type.String() }) })) });

/** The options of `puzzles` as a game writes them. */
export type Options = NonNullable<Parameters<typeof puzzles>[0]>;
type Levels = Static<typeof PuzzlesOptions>["levels"];
/** What the planner reads of the ten levels of the City of Keys, the additive levels 8 to 10 included. */
export const ALL_LEVELS: ConstructorParameters<typeof TeamPlanner>[0] = Value.Parse(Type.Array(Type.Object({ number: Type.Integer(), team: PuzzlesOptions.properties.levels.items.properties.team })), storyLevels());
/** The fragment levels of the City of Keys, 1 to 7, as the oracle's story file has them. */
export const LEVELS: Levels = Value.Parse(PuzzlesOptions.properties.levels, storyLevels().filter((level) => level.puzzle.kind === "fragments"));

function storyLevels(): Static<typeof Story>["levels"] {
	const story: unknown = JSON.parse(readFileSync(resolve(ORACLES, "setup/cityofkeys.story.json"), "utf8"));
	return Value.Parse(Story, story).levels;
}

/** The payloads of the events of `source` and `type` in an oracle file, in order. */
export function oracleEvents(file: string, source: string, type: string): readonly unknown[] {
	return readOracle(resolve(ORACLES, `${file}.json`)).timeline.flatMap((entry) => (entry.k === "event" && entry.source === source && entry.type === type ? [entry.payload] : []));
}

/** The events the mechanics `ids` wrote, as `[type, payload]`, in log order. */
export function written(events: readonly Envelope[], ...ids: readonly string[]): readonly (readonly [string, unknown])[] {
	return events.filter((event) => ids.some((id) => event.source.endsWith(`/${id}`))).map((event) => [event.type, event.payload]);
}

/** Stands in for a court: the tool `strike` banishes a resident. */
export const judge = defineMechanic(
	defineHead({ id: "judge", package: "@test/judge", summary: "Test: banishes.", requires: [ExileService], tools: { strike: { description: "judge/strike", params: Type.Object({ target: Type.String() }), for: ["resident"] } } }),
	{
		tools: {
			strike: {
				run: (params, ctx) => {
					const done = ctx.call(ExileService, "banish", { resident: params.target });
					return done.ok ? reply("banished") : refuse(done.code ?? "REFUSED");
				},
			},
		},
	},
);

const Burned = defineEvents("ledger", { ledger_entry: Type.Object({ debit: Type.String(), reason: Type.String() }) });

/** Stands in for the ledger, under its id (the package has no dependency on it): listens to `exiled` and writes the burn. */
export const ledgerStandIn = defineMechanic(defineHead({ id: "ledger", package: "@test/ledger", summary: "Test: burns on an exile.", events: Burned.events }), {
	listeners: (kit) => [
		kit.listen(ExileEvents, "exiled", (payload, ctx) => {
			ctx.emit("ledger_entry", { debit: payload.agent, reason: `exiled ${payload.agent}` });
		}),
	],
});

/** Renders a prompt as its id: the judge's tool has no prompt file. */
export const prompts = { render: (_owner: string, id: string) => id };

/** Six residents of seed `seed` with the fragment levels; `mechanics` gives the game's order, `puzzles` last when left out. */
export function city(seed: number, options: Options = {}, mechanics: (own: MechanicUse) => readonly MechanicUse[] = (own) => [ledgerStandIn(), exile(), judge(), own]): Game {
	return defineGame({ id: "puzzles-test", seed, residents: 6, mechanics: mechanics(puzzles({ levels: LEVELS, ...options })), end: { ticks: 12 } });
}
