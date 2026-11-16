// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Shared by the tests of the game: the options behind each old variant name, the scripted resident of the old
 * `test/stories/morris-teams.test.ts` (`morrisPlayer`, carried: a greedy captain, voters that agree, a retro post and
 * the brain of the retro captain) and the readers of the log.
 */
import { nameOf, type Activation, type ActorDriver } from "@swarmtales/contracts";
import { applyStep, decodeStep, type Cell } from "@swarmtales/mechanic-morris";
import type { Played } from "@swarmtales/testkit";
import type { MorrisOptions } from "../game.ts";

/** The ids this platform renamed (M6-06), from the id the oracle files hold to the id here: the option `renamed` of `runOracle`. */
export const RENAMED = { "morris-teams": "morris" } as const;

type Logged = Played["events"][number];

/**
 * The options behind every variant name that an oracle file uses. The old parser read
 * `morris[-nobrain][-g<games>][-r<rounds>][-t<turns>][-solo][-fc][-vs-engine<depth>]`; the name grammar is not
 * carried (`carried.test.ts` pins this table against it).
 */
export const VARIANTS: Readonly<Record<string, MorrisOptions>> = {
	"morris-teams": {},
	"morris-teams-nobrain-solo": { brain: false, teamSize: 1 },
	"morris-teams-nobrain-solo-vs-engine3": { brain: false, teamSize: 1, engineDepth: 3 },
	"morris-teams-solo-vs-engine3": { teamSize: 1, engineDepth: 3 },
};

const texts = (turn: Activation): string => turn.inputs.map((note) => note.text).join("\n");

/** The board of a viewBoard reply: the 24 labels of its picture, in point order. */
function boardOf(view: string): Cell[] {
	const labels = view.split("\n").slice(0, 13).join("\n").match(/\d+|X|O/g) ?? [];
	return labels.map((label): Cell => (label === "X" || label === "O" ? label : "."));
}

/** The legal move numbers viewBoard lists. */
function legalOf(view: string): number[] {
	const line = /^Legal moves[^:]*: (.*)\.$/m.exec(view)?.[1] ?? "";
	return line.split(", ").map((item) => Number(/^\d+/.exec(item)?.[0])).filter((code) => Number.isInteger(code));
}

/** A greedy choice: a step that closes a mill when there is one, else the first legal move (also for a removal). */
function choose(view: string, side: "X" | "O"): number | undefined {
	const legal = legalOf(view);
	if (view.includes("closed a mill")) return legal[0];
	const board = boardOf(view);
	const closing = legal.find((code) => {
		const step = decodeStep(code);
		return step !== undefined && applyStep({ board, side, inHand: { X: 9, O: 9 } }, step).mill;
	});
	return closing ?? legal[0];
}

// The captain plays the agreed move (and proposes the removal after a mill) or proposes its greedy choice.
async function captainMove(turn: Activation, told: string, view: string, team: "X" | "O"): Promise<void> {
	const agreed = /agreed on (\d+)/.exec(told)?.[1];
	if (agreed === undefined) {
		const move = choose(view, team);
		if (move !== undefined) await turn.call("proposeMove", { cell: move, reason: "script" });
		return;
	}
	const played = await turn.call("playMove", { move: Number(agreed) });
	if (played.ok && played.reply.includes("Mill!")) {
		const again = await turn.call("viewBoard", {});
		const remove = again.ok ? choose(again.reply, team) : undefined;
		if (remove !== undefined) await turn.call("proposeMove", { cell: remove, reason: "script" });
	}
}

// A retro window: one post, and as the retro captain the brain.
async function retro(turn: Activation, told: string, resident: string, team: "X" | "O"): Promise<void> {
	await turn.call("postTeam", { text: `retro talk from ${resident}` });
	if (told.includes("You are the retro captain")) await turn.call("writeBrain", { text: `Team ${team}: close a mill when you can, block every open two of the other side, keep pieces mobile.` });
}

/** The scripted resident: stateless, it reads its turn and the board. */
export const morrisPlayer: ActorDriver = async (turn) => {
	const resident = nameOf(turn.actor);
	const told = texts(turn);
	const team = ["A01", "A02", "A03"].includes(resident) ? "X" : "O";
	if (told.includes("Retro after game") || told.includes("Before game 1")) return retro(turn, told, resident, team);
	const view = await turn.call("viewBoard", {});
	if (!view.ok) return;
	const side = /Side to move: ([XO])\./.exec(view.reply)?.[1];
	const captain = /Captain of the turn: (A\d+)\./.exec(view.reply)?.[1];
	if (side !== team) return;
	if (resident === captain) await captainMove(turn, told, view.reply, team);
	else if (told.includes("proposes the move")) await turn.call("castVote", { agree: true, reason: "ok" });
};

/** The events of one type, whoever wrote them. */
export const ofType = (events: readonly Logged[], type: string): readonly Logged[] => events.filter((event) => event.type === type);

/** One field of an event's payload, untyped. */
export function field(event: Logged, key: string): unknown {
	const payload = event.payload;
	return typeof payload === "object" && payload !== null ? Reflect.get(payload, key) : undefined;
}
