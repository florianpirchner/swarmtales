// SPDX-License-Identifier: Apache-2.0
/**
 * The scripted resident of the Lanterns tests and their readers of the log. Carried from `test/stories/lanterns.test.ts`
 * (`player`, `hiddenIn`) and `test/stories/tictactoe-support.ts` (`field`, `ofType`): the player follows its turn
 * inputs and tool replies, so it holds no state.
 */
import { nameOf, type Activation, type ActorDriver, type Envelope } from "@swarmtales/contracts";
import { familyParams, type Game } from "@swarmtales/sdk";
import { Value } from "typebox/value";
import { expect } from "vitest";
import { lanternsFamily, lanternsGame, type LanternsOptions } from "../game.ts";

/** The hidden words of a grid as a seeker sees it: every cell that is not `[word: owner]`. */
function hiddenIn(grid: string): string[] {
	return grid
		.split("\n")
		.flatMap((row) => row.split(" | "))
		.map((cell) => cell.trim())
		.filter((cell) => cell !== "" && !cell.startsWith("["));
}

// The caller reveals the first hidden word of the grid and stops when it may guess again.
async function callGuesses(turn: Activation): Promise<void> {
	const view = await turn.call("viewGrid", {});
	const grid = view.ok ? (/The grid \(revealed[^\n]*\n((?:[^\n]*\|[^\n]*\n?)+)/.exec(view.reply)?.[1] ?? "") : "";
	const first = hiddenIn(grid)[0];
	if (first === undefined) return;
	const result = await turn.call("guess", { word: first, reason: "script" });
	if (result.ok && result.reply.includes("You may guess again")) await turn.call("endGuesses", {});
}

// The retro talk: every member posts, the retro captain writes the brain.
async function retro(turn: Activation, resident: string, told: string): Promise<void> {
	await turn.call("postTeam", { text: `retro talk from ${resident}` });
	if (told.includes("You are the retro captain")) await turn.call("writeBrain", { text: "Keepers clue two words at a time; seekers stop once the clue is used up." });
}

/** Keepers clue their first two hidden words; the caller reveals the first hidden word of the grid and stops; the partner advises. */
export const player: ActorDriver = async (turn) => {
	const resident = nameOf(turn.actor);
	const told = turn.inputs.map((note) => note.text).join("\n");
	if (told.includes("Retro after game") || told.includes("Before game 1")) return retro(turn, resident, told);
	const own = /Your team's hidden words: ([^.]+)\./.exec(told)?.[1];
	if (own !== undefined) {
		const words = own.split(", ");
		const number = Math.min(2, words.length);
		await turn.call("giveClue", { word: "quixotic", number, targets: words.slice(0, number), reason: "script" });
		return;
	}
	if (told.includes("You call the guesses")) return callGuesses(turn);
	if (told.includes("Advise")) await turn.call("postTeam", { text: `${resident}: go with the first word.` });
};

/**
 * The game as the carried test plays it: roster order, as the old test set it.
 *
 * @param options - The variant.
 * @returns The game with the turn order `roster`.
 */
export function rosterGame(options: LanternsOptions = {}): Game {
	const game = lanternsGame(options);
	const turns: unknown = game.scheduler?.options;
	return { ...game, scheduler: { id: "turns", options: { ...(typeof turns === "object" ? turns : {}), order: "roster" } } };
}

/** The events of one type, whoever wrote them. */
export const ofType = (events: readonly Envelope[], type: string): readonly Envelope[] => events.filter((event) => event.type === type);

/** One field of an event's payload, untyped. */
export function field(event: Envelope, key: string): unknown {
	const payload = event.payload;
	return typeof payload === "object" && payload !== null ? Reflect.get(payload, key) : undefined;
}

/** The `context-reset` lines the residents were shown, with the resident's name. */
export function resets(events: readonly Envelope[]): readonly { readonly resident: string; readonly text: string }[] {
	return ofType(events, "activation_opened").flatMap((event) => {
		const inputs: unknown = field(event, "inputs");
		const lines = Array.isArray(inputs) ? inputs.filter((input): input is { kind: string; text: string } => typeof input === "object" && input !== null && Reflect.get(input, "kind") === "context-reset") : [];
		return lines.map((input) => ({ resident: String(field(event, "actor")).replace(/^resident:/, ""), text: input.text }));
	});
}

/**
 * The game of one param set of the family, as `resolveGame` builds it. A stand-in: `play` and `runOracle` of the
 * testkit take a game, not yet a family with its overrides.
 *
 * @param overrides - The overrides of the params: an arm of an experiment.
 * @returns The game of the arm.
 */
export function arm(overrides: Readonly<Record<string, unknown>> = {}): Game {
	const { params, issues } = familyParams(lanternsFamily, overrides);
	expect(issues).toEqual([]);
	return lanternsFamily.build(Value.Parse(lanternsFamily.params, params));
}

/** The texts a resident was shown at each activation, joined. */
export const shown = (events: readonly Envelope[]): readonly string[] => ofType(events, "activation_opened").map((event) => JSON.stringify(field(event, "inputs")));
