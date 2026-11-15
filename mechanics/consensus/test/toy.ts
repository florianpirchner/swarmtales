// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * A toy game that provides the `ConsensusSourceService`: two teams take turns taking cells 0-8. Carried from the old
 * `toy.ts`; its two texts are inline (the old test kept them in prompt files), and the game does not load
 * `team-channel` (the old one did, and no test used it): a mechanic's test imports no other mechanic.
 */
import { Type } from "typebox";
import type { ActorDriver, DriverTable } from "@swarmtales/contracts";
import { ConsensusSourceService } from "@swarmtales/mechanic-contracts";
import { defineGame, defineHead, defineMechanic, refuse, reply } from "@swarmtales/sdk";
import { play, scriptedDriver, type CallRecord, type Played, type PlannedCall } from "@swarmtales/testkit";
import { consensus } from "../src/index.ts";

const TEAMS: Readonly<Record<string, readonly string[]>> = { red: ["A01", "A02", "A03"], blue: ["A04", "A05", "A06"] };
const CAPTAINS: Readonly<Record<string, string>> = { red: "A01", blue: "A04" };

interface ToyState {
	taken: Map<number, string>;
	side: "red" | "blue";
	invalid: boolean;
}

const free = (state: ToyState): number[] => [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((cell) => !state.taken.has(cell));

const head = defineHead({
	id: "toy",
	package: "@test/toy",
	summary: "Two teams take turns taking cells 0-8.",
	provides: [ConsensusSourceService],
	state: Type.Object({ taken: Type.Record(Type.String(), Type.String()), side: Type.Union([Type.Literal("red"), Type.Literal("blue")]), invalid: Type.Optional(Type.Boolean()) }),
	snapshot: {
		save: (state: ToyState) => ({ taken: Object.fromEntries([...state.taken].map(([cell, team]) => [String(cell), team])), side: state.side, invalid: state.invalid }),
		load: (data): ToyState => ({ taken: new Map(Object.entries(data.taken).map(([cell, team]) => [Number(cell), team])), side: data.side, invalid: data.invalid ?? false }),
	},
	start: (): ToyState => ({ taken: new Map(), side: "red", invalid: false }),
	events: { move_played: Type.Object({ team: Type.String(), cell: Type.Integer(), forfeit: Type.Boolean() }) },
	tools: { playMove: { description: "Play a cell.", params: Type.Object({ cell: Type.Integer() }), for: ["resident"] } },
});

export const toy = defineMechanic(head, {
	services: {
		"consensus-source": {
			team: (_input, ctx) => ctx.state.side,
			captain: (_input, ctx) => CAPTAINS[ctx.state.side] ?? "",
			legalCells: (_input, ctx) => free(ctx.state),
			playForfeit: ({ cell }, ctx) => {
				if (!free(ctx.state).includes(cell)) return false;
				ctx.state.taken.set(cell, ctx.state.side);
				ctx.emit("move_played", { team: ctx.state.side, cell, forfeit: true });
				ctx.state.side = ctx.state.side === "red" ? "blue" : "red";
				return true;
			},
			invalidate: (_input, ctx) => {
				if (ctx.state.invalid) return false;
				ctx.state.invalid = true;
				return true;
			},
		},
	},
	limits: { match: { summary: "Breaches once the match is invalid.", breached: (view) => (view.state.invalid ? "the match is invalid" : undefined) } },
	tools: {
		playMove: {
			check: (params, ctx) => (free(ctx.state).includes(params.cell) ? undefined : refuse("TAKEN")),
			run: (params, ctx) => {
				ctx.state.taken.set(params.cell, ctx.state.side);
				ctx.emit("move_played", { team: ctx.state.side, cell: params.cell, forfeit: false });
				ctx.state.side = ctx.state.side === "red" ? "blue" : "red";
				return reply(`Played ${String(params.cell)}.`);
			},
		},
	},
});

export interface Gate {
	readonly maxRounds?: number;
	readonly onDeadlock?: "forfeitRandomLegalMove" | "refuse";
	readonly maxConsecutiveForfeits?: number;
	readonly ticks?: number;
	readonly seed?: number;
}

export function toyGame(gate: Gate = {}) {
	const teams = Object.fromEntries(Object.entries(TEAMS).map(([team, members]) => [team, [...members]]));
	return defineGame({
		id: "toy-consensus",
		seed: gate.seed ?? 5,
		residents: 7,
		mechanics: [toy(), consensus({ teams, maxRounds: gate.maxRounds ?? 2, onDeadlock: gate.onDeadlock ?? "forfeitRandomLegalMove", maxConsecutiveForfeits: gate.maxConsecutiveForfeits ?? 0 })],
		grants: { resident: ["playMove", "proposeMove", "castVote"] },
		// Three passes a tick, residents in their game order, so captain, then voters, then the play.
		scheduler: { id: "turns", options: { passes: 3, order: "roster" } },
		end: { ticks: gate.ticks ?? 4 },
	});
}

export type Script = Readonly<Record<string, readonly PlannedCall[]>>;

/** `tick:pass:resident` to the calls of that activation; every other activation does nothing. */
export function scripted(script: Script, record?: CallRecord[]): DriverTable {
	const resident: ActorDriver = scriptedDriver((activation) => script[`${String(activation.tick)}:${JSON.stringify(activation.detail.pass)}:${activation.actor.slice(9)}`] ?? [], record);
	return { resident };
}

export const playToy = (gate: Gate, script: Script, record?: CallRecord[]): Promise<Played> => play(toyGame(gate), { drivers: scripted(script, record) });

/**
 * Stand-in for the testkit's snapshot round trip (issue 30): the run resumed after `cut` ticks plays as the straight one.
 *
 * @returns Whether the events, the end and the last snapshot are those of the straight run.
 */
export async function roundTrips(gate: Gate, script: Script, cut: number): Promise<boolean> {
	const straight = await playToy(gate, script);
	const first = await play(toyGame(gate), { drivers: scripted(script), ticks: cut });
	if (first.end !== undefined) return false;
	const resume = { snapshot: structuredClone(first.kernel.snapshot()), log: structuredClone([...first.events]) };
	const rest = await play(toyGame(gate), { drivers: scripted(script), resume });
	const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
	return same(rest.events, straight.events) && same(rest.end, straight.end) && same(rest.kernel.snapshot(), straight.kernel.snapshot());
}

export const propose = (cell: number): PlannedCall => ({ tool: "proposeMove", params: { cell, reason: "because" } });
export const vote = (agree: boolean): PlannedCall => ({ tool: "castVote", params: { agree, reason: "i think so" } });
export const move = (cell: number): PlannedCall => ({ tool: "playMove", params: { cell } });
