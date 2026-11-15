// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Shared by the motives tests: the catalogue of core motives of an oracle setup (as the old host composed it, old
 * `apps/cli/src/host/story.ts`: the story's `coreMotives`, its `whisperer.coreMotive`), and a game over the real
 * `ledger`, `channels` and, for Whispers, `whispers`, loaded before `motives` as in the files.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Type, type Static } from "typebox";
import { Value } from "typebox/value";
import { channels } from "@swarmtales/mechanic-channels";
import { ledger } from "@swarmtales/mechanic-ledger";
import { whispers, WhispersOptions, WhispererSpec } from "@swarmtales/mechanic-whispers";
import { defineGame, type Game, type MechanicUse } from "@swarmtales/sdk";
import { MotivesOptions, motives } from "../src/index.ts";

/** The folder of the oracle files. */
export const ORACLES = resolve(import.meta.dirname, "../../../oracles");

const Story = Type.Object(
	{
		coreMotives: Type.Record(Type.String(), Type.Unknown()),
		whisperer: Type.Optional(Type.Object({ agent: Type.Optional(Type.String()), forgery: Type.Boolean(), duty: Type.Unknown(), coreMotive: Type.Optional(Type.Unknown()) })),
	},
	{ description: "The parts of the old story file the motives read" },
);

/** What a setup gives the test game. */
export interface Setup {
	readonly motives: MotivesOptions;
	readonly whispers?: Static<typeof WhispersOptions>;
}

/**
 * Reads the options of the old story file `setup/<file>.story.json` of a game.
 *
 * @param game - `whispers` or `cityofkeys`.
 * @param file - The setup's name.
 * @param cast - The figures the run names.
 * @returns The options.
 */
export function setupOf(game: string, file: string, cast?: readonly string[]): Setup {
	const story = Value.Parse(Story, JSON.parse(readFileSync(resolve(ORACLES, game, "setup", `${file}.story.json`), "utf8")));
	const own = story.whisperer?.coreMotive;
	const options = Value.Parse(MotivesOptions, { noteTools: ["notify", "boardNote"], ...story.coreMotives, ...(own === undefined ? {} : { whispererCoreMotive: own }), ...(cast === undefined ? {} : { cast: [...cast] }) });
	if (story.whisperer === undefined) return { motives: options };
	const { agent, forgery, duty } = story.whisperer;
	const whisperer = Value.Parse(WhispererSpec, { ...(agent === undefined ? {} : { agent }), forgery, duty });
	return { motives: options, whispers: Value.Parse(WhispersOptions, { whisperer, control: false, noteTools: ["notify", "boardNote"] }) };
}

/** How a test game is built. */
export interface GameSpec {
	readonly seed?: number;
	readonly residents?: number;
	readonly more?: readonly MechanicUse[];
	readonly grants?: Readonly<Record<string, readonly string[]>>;
}

/**
 * The game of the tests: `ledger`, `channels`, `whispers` when the setup has a whisperer, then `motives`.
 *
 * @param setup - The options.
 * @param spec - The seed, the number of residents, more mechanics and grants.
 * @returns The game.
 */
export function gameOf(setup: Setup, spec: GameSpec = {}): Game {
	const residents = Array.from({ length: spec.residents ?? 6 }, (_, index) => `A${String(index + 1).padStart(2, "0")}`);
	return defineGame({
		id: "motives-test",
		seed: spec.seed ?? 7,
		residents,
		mechanics: [ledger({ startPoints: 10 }), channels(), ...(setup.whispers === undefined ? [] : [whispers(setup.whispers)]), motives(setup.motives), ...(spec.more ?? [])],
		end: { ticks: 3 },
		...(spec.grants === undefined ? {} : { grants: spec.grants }),
	});
}
