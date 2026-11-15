// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The first test of the activation hooks (specification of M4, 4.9): where the events of a hook land. A stand-in
 * for the forfeit clock of chess (old `mechanics/chess/src/index.ts`, `turnOpened` and `turnEnded`) plays game 1
 * of `oracles/chess/chess-s13-silent.json` on the real kernel under `turns`: a forfeited move follows the turn of
 * the seat that let it pass and comes before the next wake decision.
 */
import { join } from "node:path";
import { nameOf, type Envelope } from "@swarmtales/contracts";
import { defineGame, defineHead, defineMechanic } from "@swarmtales/sdk";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { readOracle } from "../src/oracle/read.ts";
import { play } from "../src/play.ts";

const ORACLE = join(import.meta.dirname, "../../../oracles/chess/chess-s13-silent.json");
// The oracle's game 1 starts in minute 2 and ends in minute 4; a minute of the old platform is a tick.
const START = 2;
// The tick whose openings the stand-in notes: the last of the game.
const NOTED = 4;
const MAX_IDLE = 3;
const MAX_FORFEITS = 3;

const by = Type.String({ description: "The seat." });
const head = defineHead({
	id: "clock",
	package: "@test/clock",
	summary: "The forfeit clock of chess without the board.",
	options: Type.Object({}, { description: "No options." }),
	state: Type.Object({
		running: Type.Boolean(),
		mover: Type.String(),
		plies: Type.Integer(),
		idle: Type.Integer(),
		turnPly: Type.Integer(),
		forfeits: Type.Record(Type.String(), Type.Integer()),
	}),
	start: () => ({ running: false, mover: "A01", plies: 0, idle: 0, turnPly: -1, forfeits: {} }),
	events: {
		game_started: Type.Object({}, { description: "The game started." }),
		move_played: Type.Object({ by, ply: Type.Integer({ description: "The half-move." }) }, { description: "A move was forfeited." }),
		game_ended: Type.Object({ by }, { description: "The game was called off." }),
		noted: Type.Object({ by }, { description: "An activation was opened." }),
	},
});

const clock = defineMechanic(head, {
	hooks: {
		tickStarted: (ctx) => {
			if (ctx.tick !== START) return;
			ctx.state.running = true;
			ctx.emit("game_started", {});
		},
		news: (resident, ctx) => ctx.state.running && ctx.state.mover === resident,
		activationOpened: (resident, ctx) => {
			const state = ctx.state;
			if (state.running && state.mover === resident) state.turnPly = state.plies;
			if (ctx.tick === NOTED) ctx.emit("noted", { by: resident });
		},
		// A turn on move that ended without a move counts toward the forfeit clock.
		activationClosed: (resident, ctx) => {
			const state = ctx.state;
			if (!state.running || state.turnPly !== state.plies || state.mover !== resident) return;
			state.turnPly = -1;
			state.idle += 1;
			if (state.idle < MAX_IDLE) return;
			const forfeits = (state.forfeits[resident] ?? 0) + 1;
			state.forfeits[resident] = forfeits;
			if (forfeits >= MAX_FORFEITS) {
				state.running = false;
				ctx.emit("game_ended", { by: resident });
				return;
			}
			state.plies += 1;
			state.idle = 0;
			state.mover = resident === "A01" ? "A02" : "A01";
			ctx.emit("move_played", { by: resident, ply: state.plies });
		},
	},
});

// What the lines take of a `move_played` of the oracle.
const Move = Type.Object({ ply: Type.Optional(Type.Integer()), by: Type.Optional(Type.String()) });

const game = defineGame({ id: "clock", residents: 2, mechanics: [clock({})], scheduler: { id: "turns", options: { passes: 4, activation: "onNews" } }, end: { ticks: 6 } });

// Game 1 of the oracle as lines: who takes a turn, who is skipped, and the events of the clock between them.
function oracleLines(): readonly string[] {
	const lines: string[] = [];
	let minute = 0;
	for (const entry of readOracle(ORACLE).timeline) {
		if (entry.k === "minute") minute = entry.minute;
		if (minute < START) continue;
		if (entry.k === "turn" || entry.k === "skip") lines.push(`${entry.k} ${String(minute)}/${String(entry.pass)}/${String(entry.block)} ${entry.resident}`);
		if (entry.k !== "event" || entry.source !== "chess") continue;
		const { ply, by: seat } = Value.Parse(Move, entry.payload);
		if (entry.type === "move_played") lines.push(`move ${String(ply)} ${seat}`);
		if (entry.type === "game_ended") return [...lines, "ended"];
	}
	return lines;
}

// One field of a payload, as text.
function field(event: Envelope, ...path: readonly string[]): string {
	let value: unknown = event.payload;
	for (const key of path) value = typeof value === "object" && value !== null ? Reflect.get(value, key) : undefined;
	return String(value);
}

// The played log from the start of the game on, in the same lines.
function playedLines(events: readonly Envelope[]): readonly string[] {
	return events.flatMap((event) => {
		if (event.tick < START) return [];
		if (event.type === "activation_opened") return [`turn ${String(event.tick)}/${field(event, "detail", "pass")}/${field(event, "detail", "block")} ${nameOf(event.actor)}`];
		if (event.type === "activation_skipped") return [`skip ${String(event.tick)}/${field(event, "pass")}/${field(event, "block")} ${field(event, "actor").replace("resident:", "")}`];
		if (event.type === "move_played") return [`move ${field(event, "ply")} ${field(event, "by")}`];
		return event.type === "game_ended" ? ["ended"] : [];
	});
}

describe("the activation hooks, first test", () => {
	it("lands a forfeit after the idle turn of the seat on move and before the next wake decision, as the oracle has it", async () => {
		const { events } = await play(game, { seed: 13, ticks: 5 });
		const expected = oracleLines();
		expect(expected.filter((line) => line.startsWith("move") || line === "ended")).toEqual(["move 1 A01", "move 2 A02", "move 3 A01", "move 4 A02", "ended"]);
		expect(playedLines(events).slice(0, expected.length)).toEqual(expected);
	});

	it("writes a hook's events inside the brackets of the activation, caused by its opening", async () => {
		const { events } = await play(game, { seed: 13, ticks: 5 });
		const around = (type: string): readonly (readonly string[])[] =>
			events.filter((event) => event.type === type).map((event) => [events[event.seq - 2]?.type ?? "", event.actor, events.find((other) => other.seq === event.causedBy)?.type ?? "", events[event.seq]?.type ?? ""]);
		// `activationOpened` runs right after the opening line, `activationClosed` right before the closing line.
		const inside = ["kernel", "activation_opened"];
		expect(around("noted")).toEqual([
			["activation_opened", ...inside, "move_played"],
			["activation_opened", ...inside, "activation_closed"],
			["activation_opened", ...inside, "activation_closed"],
			["activation_opened", ...inside, "game_ended"],
		]);
		expect(around("move_played")).toEqual([...Array.from({ length: 3 }, () => ["activation_opened", ...inside, "activation_closed"]), ["noted", ...inside, "activation_closed"]]);
		expect(around("game_ended")).toEqual([["noted", ...inside, "activation_closed"]]);
		const move = events.find((event) => event.type === "move_played");
		expect(events.find((event) => event.seq === move?.causedBy)?.actor).toBe("resident:A01");
	});
});
