// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** Shared by the econ-games tests: a game of the mechanic alone and a stateless scripted player (the `player` of the old econ-lab test). */
import { nameOf, type ActorDriver, type Envelope } from "@swarmtales/contracts";
import { defineGame, type Game } from "@swarmtales/sdk";
import { econGames } from "../src/index.ts";

export const BLOCKS = [
	{ game: "ultimatum", rounds: 6 },
	{ game: "public-goods", rounds: 7 },
	{ game: "dilemma", rounds: 5 },
] as const;

/** Four seats, the decision tools locked, four passes a tick, in roster order. */
export function econGame(options: Parameters<typeof econGames>[0] = {}): Game {
	return defineGame({
		id: "econ-games-test",
		seed: 23,
		residents: ["A01", "A02", "A03", "A04"],
		mechanics: [econGames({ blocks: BLOCKS.map((block) => ({ ...block })), ...options })],
		locked: ["contribute", "offer", "respond", "choose"],
		scheduler: { id: "turns", options: { passes: 4, activation: "onNews", order: "roster" } },
		limits: { maxCallsPerTick: 6 },
		end: { ticks: 60 },
	});
}

/** A01 and A02 cooperate (put in 8, choose A), A03 and A04 do not (put in 2, choose B); everyone offers 4 and accepts 3 or more. */
export const player: ActorDriver = async (turn) => {
	const told = turn.inputs.map((note) => note.text).join("\n");
	const kind = ["A01", "A02"].includes(nameOf(turn.actor));
	if (told.includes("how many of your")) await turn.call("contribute", { amount: kind ? 8 : 2, reason: "script" });
	else if (told.includes("you are the proposer")) await turn.call("offer", { amount: 4, reason: "script" });
	else {
		const offer = /offers you (\d+) points/.exec(told)?.[1];
		if (offer !== undefined) await turn.call("respond", { accept: Number(offer) >= 3, reason: "script" });
		else if (told.includes("Choose A or B")) await turn.call("choose", { option: kind ? "A" : "B", reason: "script" });
	}
};

/** The events of one type that the mechanic wrote. */
export function ofType(events: readonly Envelope[], type: string): readonly Envelope[] {
	return events.filter((event) => event.source.endsWith("/econ-games") && event.type === type);
}

/** One field of an event's payload, untyped. */
export function field(event: Envelope, key: string): unknown {
	const payload = event.payload;
	return typeof payload === "object" && payload !== null ? Reflect.get(payload, key) : undefined;
}
