// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Shared by the whispers tests: the options of the Whispers story of an oracle setup (as the old host composed them,
 * old `apps/cli/src/host/story.ts` `whispersUse` and `marksUse`), a game over the real `ledger`, `channels`,
 * `receipts` and `marks`, and a reader of a tool's answer.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Type, type Static } from "typebox";
import { Value } from "typebox/value";
import { channels } from "@swarmtales/mechanic-channels";
import { ledger } from "@swarmtales/mechanic-ledger";
import { marks, MarksOptions } from "@swarmtales/mechanic-marks";
import { JudgeVerdict, receipts } from "@swarmtales/mechanic-receipts";
import { defineDirector, defineGame, type Game, type MechanicUse } from "@swarmtales/sdk";
import type { TestKernel } from "@swarmtales/testkit";
import { whispers, WhispersOptions, WhispererSpec, PopularitySpec, Quota } from "../src/index.ts";

/** The folder of the oracle files. */
export const ORACLES = resolve(import.meta.dirname, "../../../oracles");

const Story = Type.Object(
	{
		whisperer: Type.Object({ agent: Type.Optional(Type.String()), forgery: Type.Boolean(), duty: Type.Unknown(), direction: Type.Optional(Type.Object({ quota: Type.Optional(Quota) })) }),
		popularity: PopularitySpec,
		rules: Type.Object({ marks: Type.Optional(Type.Unknown()) }),
	},
	{ description: "The parts of the old story file the whispers read" },
);

/** The whispers and marks options of a story file, at a figure direction. */
export interface StoryOptions {
	readonly whispers: Static<typeof WhispersOptions>;
	readonly marks: Static<typeof MarksOptions>;
}

/**
 * Reads the options of the old story file `setup/<name>.story.json` of Whispers.
 *
 * @param name - `whispers` or `whispers-rumours`.
 * @param level - The figure direction.
 * @returns The options.
 */
export function storyOptions(name: string, level = 4): StoryOptions {
	const story = Value.Parse(Story, JSON.parse(readFileSync(resolve(ORACLES, "whispers/setup", `${name}.story.json`), "utf8")));
	const { agent, forgery, duty, direction } = story.whisperer;
	const whisperer = Value.Parse(WhispererSpec, { ...(agent === undefined ? {} : { agent }), forgery, duty, ...(direction?.quota === undefined ? {} : { quota: direction.quota }) });
	return {
		whispers: Value.Parse(WhispersOptions, { whisperer, popularity: story.popularity, control: false, direction: { level, defies: true }, noteTools: ["notify", "boardNote"] }),
		marks: Value.Parse(MarksOptions, { ...(story.rules.marks === undefined || story.rules.marks === null ? {} : { rules: story.rules.marks }), levels: [], startLevel: 1 }),
	};
}

// `receipts` brings `blame`, whose review a judge answers (SWT-D004); it never fires here.
const judge = defineDirector({ id: "judge", summary: "Test: answers the blames.", on: [], output: JudgeVerdict, answers: "judge" }, { system: () => "You are the judge.", input: () => "", act: () => Promise.resolve() });

/** How a test game is built. */
export interface GameSpec {
	readonly seed?: number;
	readonly ticks?: number;
	readonly receipts?: boolean;
	readonly more?: readonly MechanicUse[];
	readonly grants?: Readonly<Record<string, readonly string[]>>;
}

/**
 * The game of the tests: six residents, the Whispers turns (one pass, blocks of one, the old arena's draw).
 *
 * @param options - The whispers and marks options.
 * @param spec - The seed, ticks, whether receipts are loaded, more mechanics and grants.
 * @returns The game.
 */
export function gameOf(options: StoryOptions, spec: GameSpec = {}): Game {
	const withReceipts = spec.receipts ?? true;
	return defineGame({
		id: "whispers-test",
		seed: spec.seed ?? 7,
		residents: ["A01", "A02", "A03", "A04", "A05", "A06"],
		mechanics: [ledger({ startPoints: 10 }), marks(options.marks), channels({ defiance: true }), ...(withReceipts ? [receipts({ quoteDms: true })] : []), whispers(options.whispers), ...(spec.more ?? [])],
		...(withReceipts ? { directors: [{ use: judge }] } : {}),
		...(spec.grants === undefined ? {} : { grants: spec.grants }),
		scheduler: { id: "turns", options: { passes: 1, blockSize: 1, activation: "always", order: "arena", afterBlocks: ["director"] } },
		end: { ticks: spec.ticks ?? 20 },
	});
}

/**
 * Calls a tool and gives what the caller reads: the reply, or `CODE: detail`.
 *
 * @param test - The kernel.
 * @param resident - The caller.
 * @param tool - The tool.
 * @param params - The params.
 * @returns The answer.
 */
export async function say(test: TestKernel, resident: string, tool: string, params: unknown): Promise<string> {
	const outcome = await test.call(resident, tool, params);
	if (outcome.ok) return outcome.reply;
	return outcome.detail === undefined ? outcome.code : `${outcome.code}: ${outcome.detail}`;
}
