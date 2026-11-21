// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** Shared by the liars-dice tests: a game of the mechanic alone and a stateless scripted player (the `player` of the old liar's dice test, without its brain part). */
import { nameOf, type ActorDriver, type Envelope } from "@swarmtales/contracts";
import { defineGame, type Game } from "@swarmtales/sdk";
import { liarsDice } from "../src/index.ts";
import { countFor, minimalRaise, type Bid, type Rules } from "../src/rules.ts";

export const WILD: Rules = { faces: 6, wildOnes: true };

/** The table of the old game file: the decision tools locked, six passes a tick, 14 calls a tick, in roster order (`roster`, A01 to A0n when left out). */
export function diceGame(options: Parameters<typeof liarsDice>[0] = {}, seats = 4, roster?: readonly string[]): Game {
	const { games = 3, dice = 4 } = options;
	return defineGame({
		id: "liars-dice-test",
		seed: 53,
		residents: [...(roster ?? Array.from({ length: seats }, (_, index) => `A${String(index + 1).padStart(2, "0")}`))],
		mechanics: [liarsDice({ placePoints: Array.from({ length: seats }, (_, index) => seats - 1 - index), deadline: 2, ...options })],
		locked: ["bid", "liar"],
		scheduler: { id: "turns", options: { passes: 6, activation: "onNews", order: "roster" } },
		limits: { maxCallsPerTick: 14 },
		end: { ticks: games * (seats * dice - 1) * 4 + 4 },
	});
}

// What a seat is told on its turn: its dice, the dice on the table and the standing bid.
function turnOf(told: string): { readonly dice: readonly number[]; readonly total: number; readonly prev: Bid | undefined } | undefined {
	const line = /Your turn \(round \d+\)\. Your dice: ([\d ]+)\. Dice on the table: (\d+)\. The standing bid: ([^.]+)\./.exec(told);
	if (line === null) return undefined;
	const standing = /^(\d+) x (\d+) by/.exec(line[3] ?? "");
	return { dice: (line[1] ?? "").split(" ").map(Number), total: Number(line[2]), prev: standing === null ? undefined : { quantity: Number(standing[1]), face: Number(standing[2]) } };
}

// A02's bid: one more die on its most common face, or undefined when that does not fit on the table.
function commonFace(dice: readonly number[], prev: Bid | undefined, total: number): Bid | undefined {
	const face = [2, 3, 4, 5, 6].reduce((best, next) => (countFor(dice, next, WILD) > countFor(dice, best, WILD) ? next : best), 2);
	const quantity = prev === undefined ? 1 : face > prev.face ? prev.quantity : prev.quantity + 1;
	return quantity <= total ? { quantity, face } : undefined;
}

/**
 * A01 calls liar on every bid it faces, A02 bids one more die on its most common face with a public remark,
 * A03 makes the smallest raise, A04 calls once a bid names more than half the table. Stateless: it reads its turn line.
 */
export const player: ActorDriver = async (turn) => {
	const resident = nameOf(turn.actor);
	const told = turnOf(turn.inputs.map((note) => note.text).join("\n"));
	if (told === undefined) return;
	const { dice, total, prev } = told;
	const minimal = minimalRaise(prev, total, WILD);
	if (prev !== undefined && (resident === "A01" || minimal === undefined || (resident === "A04" && prev.quantity > total / 2))) {
		await turn.call("liar", { reason: `script ${resident}` });
		return;
	}
	const common = resident === "A02" ? commonFace(dice, prev, total) : undefined;
	if (common !== undefined) await turn.call("bid", { ...common, say: `I have plenty of ${String(common.face)}s`, reason: "my most common face" });
	else if (minimal !== undefined) await turn.call("bid", { ...minimal, reason: `script ${resident}` });
};

/** The events of one type that the mechanic wrote. */
export function ofType(events: readonly Envelope[], type: string): readonly Envelope[] {
	return events.filter((event) => event.source.endsWith("/liars-dice") && event.type === type);
}

/** One field of an event's payload, untyped. */
export function field(event: Envelope, key: string): unknown {
	const payload = event.payload;
	return typeof payload === "object" && payload !== null ? Reflect.get(payload, key) : undefined;
}
