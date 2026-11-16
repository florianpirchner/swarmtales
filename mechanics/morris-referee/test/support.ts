// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The game the referee tests play: the morris game of the old platform (`stories/morris-teams/story.ts`) with the
 * referee loaded last, as there, and without the briefing, which belongs to the game issue. The setup is the one of
 * `mechanics/morris/test/support.ts` plus the referee.
 */
import type { Envelope } from "@swarmtales/contracts";
import { consensus } from "@swarmtales/mechanic-consensus";
import { morris } from "@swarmtales/mechanic-morris";
import { strategyBrain } from "@swarmtales/mechanic-strategy-brain";
import { teamChannel } from "@swarmtales/mechanic-team-channel";
import { defineGame, type Game } from "@swarmtales/sdk";
import { morrisReferee } from "../src/index.ts";

/** The variants of the test game, named as the old game named them. */
export interface MorrisGameOptions {
	readonly games?: number;
	readonly brain?: boolean;
	readonly teamSize?: 1 | 3;
	/** Side O is the built-in search at this depth; the residents all play X. */
	readonly engineDepth?: number;
	readonly maxTurns?: number;
	readonly seed?: number;
	/** The options of the referee; the old game gave `depth` only. */
	readonly referee?: { readonly depth: number; readonly maxNodes?: number };
}

const DEFAULTS = { games: 3, brain: true, teamSize: 3, maxTurns: 120, seed: 13, referee: { depth: 3 } } as const satisfies MorrisGameOptions;

/** The order of a turn's lines, as the old hook order had it: the brain's context reset, the brain, the game, the chat, the gate. */
const INPUTS = [{ kind: "context-reset" }, { source: "strategy-brain" }, { source: "morris" }, { source: "team-channel" }, { source: "consensus" }];

/** The morris game of the old platform, scored by the referee. */
export function scoredGame(options: MorrisGameOptions = {}): Game {
	const { games, brain, teamSize, maxTurns, seed, engineDepth, referee } = { ...DEFAULTS, ...options };
	const X = teamSize === 1 ? ["A01"] : ["A01", "A02", "A03"];
	const O = engineDepth !== undefined ? [] : teamSize === 1 ? ["A04"] : ["A04", "A05", "A06"];
	// The engine's side has no residents, so the gate, the chat and the brain know the residents' team only.
	const playing: Record<string, string[]> = engineDepth === undefined ? { X, O } : { X };
	return defineGame({
		id: "morris",
		seed,
		residents: [...X, ...O],
		mechanics: [
			morris({ games, maxTurns, maxQuietTurns: 40, alternateStart: true, teams: { X, O }, wakeTeam: true, fixedCaptain: false, ...(engineDepth === undefined ? {} : { engine: { side: "O" as const, depth: engineDepth, maxNodes: 200_000 } }) }),
			consensus({ tool: "playMove", param: "move", rule: "majority", maxRounds: 3, onDeadlock: "forfeitRandomLegalMove", maxConsecutiveForfeits: 6, teams: playing }),
			teamChannel({ teams: playing, maxPostsPerMove: 3 }),
			strategyBrain({ enabled: brain, maxWords: 300, teams: playing, retroMaxPosts: 8, retroMaxMinutes: 3, shared: false, brainAtStart: true }),
			morrisReferee(referee),
		],
		grants: { resident: ["viewBoard", "proposeMove", "castVote", "postTeam", "readTeam", "playMove", ...(brain ? (["readBrain", "writeBrain"] as const) : [])] },
		locked: brain ? ["playMove", "writeBrain"] : ["playMove"],
		scheduler: { id: "turns", options: { passes: 5, activation: "onNews", inputs: INPUTS } },
		limits: { maxCallsPerTick: 12 },
		end: { ticks: games * (Math.ceil(maxTurns * 1.3) + 6) + 8 },
	});
}

/** One field of an event's payload, untyped. */
export function field(event: Envelope, key: string): unknown {
	const payload = event.payload;
	return typeof payload === "object" && payload !== null ? Reflect.get(payload, key) : undefined;
}
