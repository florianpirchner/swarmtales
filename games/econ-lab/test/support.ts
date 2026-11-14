// SPDX-License-Identifier: Apache-2.0
/**
 * The scripted seat of the Econ Lab tests and their readers of the log. Carried from `test/stories/econ-lab.test.ts`
 * (`player`) and `test/stories/tictactoe-support.ts` (`field`, `ofType`).
 */
import { scriptedDriver, type Played } from "@swarmtales/testkit";
import { econLabGame, type EconLabOptions } from "../game.ts";

type Logged = Played["events"][number];
type Call = readonly { readonly tool: string; readonly params: unknown }[];

// The decision a text asks for: put in 8 or 2, offer 4, accept 3 or more, choose A or B.
function decisionOf(kind: boolean, told: string): Call {
	if (told.includes("how many of your")) return [{ tool: "contribute", params: { amount: kind ? 8 : 2, reason: "script" } }];
	if (told.includes("you are the proposer")) return [{ tool: "offer", params: { amount: 4, reason: "script" } }];
	const offer = /offers you (\d+) points/.exec(told)?.[1];
	if (offer !== undefined) return [{ tool: "respond", params: { accept: Number(offer) >= 3, reason: "script" } }];
	return told.includes("Choose A or B") ? [{ tool: "choose", params: { option: kind ? "A" : "B", reason: "script" } }] : [];
}

/** A01 and A02 cooperate (put in 8, choose A), A03 and A04 do not (put in 2, choose B); everyone offers 4 and accepts 3 or more. */
export const player = scriptedDriver((turn) => {
	const resident = turn.actor.slice(turn.actor.indexOf(":") + 1);
	const told = turn.inputs.map((note) => note.text).join("\n");
	const kind = ["A01", "A02"].includes(resident);
	if (told.includes("Retro after game") || told.includes("Before game 1")) return [{ tool: "writeBrain", params: { text: `${resident}: ${kind ? "share fairly and reward those who share" : "keep what I can"}.` } }];
	return decisionOf(kind, told);
});

/**
 * The game as the carried test plays it: roster order.
 *
 * @param options - The variant.
 * @returns The game with the turn order `roster`.
 */
export function rosterGame(options: EconLabOptions = {}) {
	const game = econLabGame(options);
	const turns: unknown = game.scheduler?.options;
	return { ...game, scheduler: { id: "turns", options: { ...(typeof turns === "object" ? turns : {}), order: "roster" } } };
}

/** The events of one type, whoever wrote them. */
export const ofType = (events: readonly Logged[], type: string): readonly Logged[] => events.filter((event) => event.type === type);

/** One field of an event's payload, untyped. */
export function field(event: Logged, key: string): unknown {
	const payload = event.payload;
	return typeof payload === "object" && payload !== null ? Reflect.get(payload, key) : undefined;
}

/** The input lines of every opened activation, as JSON, with the resident's name. */
export const shown = (events: readonly Logged[]): readonly { readonly resident: string; readonly inputs: unknown }[] =>
	ofType(events, "activation_opened").map((event) => ({ resident: String(field(event, "actor")).replace(/^resident:/, ""), inputs: field(event, "inputs") }));
