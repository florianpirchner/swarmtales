/** A toy game that provides the ConsensusSourceApi: two teams take turns taking cells 0-8. */
import { fileURLToPath } from "node:url";
import { Type } from "typebox";
import { createPromptLookup } from "@swarmtales/prompts";
import { defineCoreStory, defineMechanic, refuse, reply, type HostOptions } from "@swarmtales/kernel";
import { consensus, ConsensusSourceApi } from "@swarmtales/mechanic-consensus";
import { teamChannel } from "@swarmtales/mechanic-team-channel";
import type { Turn, TurnTaker } from "@swarmtales/contracts";
import { scriptedAgent, type CallRecord, type PlannedCall } from "@swarmtales/testkit";

const TEAMS: Readonly<Record<string, readonly string[]>> = { red: ["A01", "A02", "A03"], blue: ["A04", "A05", "A06"] };
const CAPTAINS: Readonly<Record<string, string>> = { red: "A01", blue: "A04" };

interface ToyState {
	taken: Map<number, string>;
	side: "red" | "blue";
}

export const toy = defineMechanic(
	{
		id: "toy",
		summary: "Two teams take turns taking cells 0-8.",
		provides: [ConsensusSourceApi],
		options: Type.Object({}),
		state: (): ToyState => ({ taken: new Map(), side: "red" }),
		events: { move_played: Type.Object({ team: Type.String(), cell: Type.Integer(), forfeit: Type.Boolean() }) },
		prompts: { "toy/tools/playMove": [], "toy/played": ["cell"] },
	},
	(kit) => {
		const free = (state: ToyState): number[] => [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((cell) => !state.taken.has(cell));
		return {
			services: [
				kit.provide(ConsensusSourceApi, {
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
				}),
			],
			tools: [
				kit.tool({
					name: "playMove",
					description: "toy/tools/playMove",
					parameters: Type.Object({ cell: Type.Integer() }),
					suggest: ["resident"],
					rule: (params, ctx) => (free(ctx.state).includes(params.cell) ? undefined : refuse("TAKEN")),
					execute: (params, ctx) => {
						ctx.state.taken.set(params.cell, ctx.state.side);
						ctx.emit("move_played", { team: ctx.state.side, cell: params.cell, forfeit: false });
						ctx.state.side = ctx.state.side === "red" ? "blue" : "red";
						return reply(ctx.prompt("toy/played", { cell: params.cell }));
					},
				}),
			],
			snapshot: kit.snapshot({
				version: 1,
				schema: Type.Object({ taken: Type.Record(Type.String(), Type.String()), side: Type.Union([Type.Literal("red"), Type.Literal("blue")]) }),
				save: (state) => ({ taken: Object.fromEntries([...state.taken].map(([cell, team]) => [String(cell), team])), side: state.side }),
				load: (data) => ({ taken: new Map(Object.entries(data.taken).map(([cell, team]) => [Number(cell), team])), side: data.side }),
			}),
		};
	},
);

const PROMPTS = fileURLToPath(new URL("prompts", import.meta.url));
const REPO = fileURLToPath(new URL("../../../mechanics", import.meta.url));

export function toyOptions(gate: { maxRounds?: number; onDeadlock?: "forfeitRandomLegalMove" | "refuse"; minutes?: number; seed?: number } = {}): HostOptions {
	const teams = Object.fromEntries(Object.entries(TEAMS).map(([team, members]) => [team, [...members]]));
	const story = defineCoreStory({
		id: "toy-consensus",
		seed: gate.seed ?? 5,
		minutes: gate.minutes ?? 4,
		residents: 7,
		mechanics: [toy.with({}), consensus.with({ teams, maxRounds: gate.maxRounds ?? 2, onDeadlock: gate.onDeadlock ?? "forfeitRandomLegalMove" }), teamChannel.with({ teams, maxPostsPerMove: 1 })],
		grants: { resident: ["playMove", "proposeMove", "castVote", "postTeam", "readTeam"] },
		// Three passes a minute, residents in their story order, so captain, then voters, then the play.
		turns: { passes: 3, order: (view) => view.residents },
	});
	return {
		story,
		prompts: createPromptLookup({ mechanics: { toy: PROMPTS, consensus: `${REPO}/consensus/prompts`, "team-channel": `${REPO}/team-channel/prompts` } }),
	};
}

export type Script = Readonly<Record<string, readonly PlannedCall[]>>;

/** `minute:pass:resident` to the calls of that turn; every other turn does nothing. */
export function scripted(script: Script, record?: CallRecord[]): TurnTaker {
	const plan = (turn: Turn): readonly PlannedCall[] => script[`${String(turn.minute)}:${String(turn.pass)}:${turn.resident}`] ?? [];
	return scriptedAgent(plan, record);
}

export const propose = (cell: number): PlannedCall => ({ tool: "proposeMove", params: { cell, reason: "because" } });
export const vote = (agree: boolean): PlannedCall => ({ tool: "castVote", params: { agree, reason: "i think so" } });
export const play = (cell: number): PlannedCall => ({ tool: "playMove", params: { cell } });
