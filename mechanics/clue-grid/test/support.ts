// SPDX-License-Identifier: Apache-2.0
/**
 * The game the clue-grid tests play: two teams of three, the clue grid, the team chat and a strategy brain per team,
 * set up as the old platform's Lanterns game was (`stories/lanterns/story.ts`), in roster order. The scripted
 * resident is the player of the old game test (`test/stories/lanterns.test.ts`): it follows its turn inputs, so it
 * holds no state.
 */
import { nameOf, type Activation, type ActorDriver, type Envelope } from "@swarmtales/contracts";
import { strategyBrain } from "@swarmtales/mechanic-strategy-brain";
import { teamChannel } from "@swarmtales/mechanic-team-channel";
import { defineGame, type Game } from "@swarmtales/sdk";
import { clueGrid } from "../src/index.ts";

export const TEAMS = { amber: ["A01", "A02", "A03"], teal: ["A04", "A05", "A06"] };
const RETRO_FOCUS = "Write your team's conventions between keeper and seekers.";

/** The variants of the test game. */
export interface LanternsOptions {
	readonly games?: number;
	readonly brain?: boolean;
	readonly maxClues?: number;
}

/** The Lanterns game of the old platform around the mechanic under test. */
export function lanterns(options: LanternsOptions = {}): Game {
	const { games = 4, brain = true, maxClues = 5 } = options;
	return defineGame({
		id: "clue-grid-test",
		seed: 31,
		residents: [...TEAMS.amber, ...TEAMS.teal],
		mechanics: [
			clueGrid({ games, maxClues, deadline: 2, teams: TEAMS }),
			teamChannel({ teams: TEAMS, maxPostsPerMove: 3 }),
			strategyBrain({ enabled: brain, maxWords: 200, teams: TEAMS, retroMaxPosts: 8, retroMaxMinutes: 3, shared: false, brainAtStart: true, retroFocus: RETRO_FOCUS }),
		],
		grants: { resident: ["viewGrid", "giveClue", "guess", "endGuesses", "postTeam", "readTeam", ...(brain ? (["readBrain", "writeBrain"] as const) : [])] },
		locked: ["giveClue", "guess", "endGuesses", ...(brain ? (["writeBrain"] as const) : [])],
		scheduler: { id: "turns", options: { passes: 5, activation: "onNews", order: "roster", inputs: [{ kind: "context-reset" }, { source: "strategy-brain" }, { source: "clue-grid" }, { source: "team-channel" }] } },
		limits: { maxCallsPerTick: 12 },
		end: { ticks: games * 2 * maxClues * 2 * 3 + (games + 1) * 3 + 4 },
	});
}

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

/** The events of one type that the mechanic `id` wrote. */
export function ofType(events: readonly Envelope[], type: string, id = "clue-grid"): readonly Envelope[] {
	return events.filter((event) => event.source.endsWith(`/${id}`) && event.type === type);
}

/** One field of an event's payload, untyped. */
export function field(event: Envelope, key: string): unknown {
	const payload = event.payload;
	return typeof payload === "object" && payload !== null ? Reflect.get(payload, key) : undefined;
}
