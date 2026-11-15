// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Shared by the tests of Convoy: the game of the old platform around the mechanic under test (`stories/convoy/story.ts`:
 * six solo seats, the six decision tools locked, three passes a tick, 8 calls a tick, a strategy brain per seat).
 */
import type { Envelope } from "@swarmtales/contracts";
import { strategyBrain } from "@swarmtales/mechanic-strategy-brain";
import { defineGame, type Game } from "@swarmtales/sdk";
import { convoy } from "../src/index.ts";

export const SEATS = ["A01", "A02", "A03", "A04", "A05", "A06"];

const DECISIONS = ["proposeCrew", "speak", "voteConfidence", "playCrewCard", "audit", "accuse"] as const;

/** What the old game added round the mechanic; without `brain` the mechanic plays alone, in roster order. */
export interface Table {
	readonly seats?: readonly string[];
	readonly seed?: number;
	/** True: a brain per seat, false: the old control arm (the brain loaded and off), undefined: no brain mechanic. */
	readonly brain?: boolean;
	readonly order?: "seeded" | "roster";
}

const RULES = { games: 1, deadline: 2, talkMinutes: 2, crews: [2, 2, 3, 3, 3, 3, 4, 4] };

/** The table of the old game file. */
export function convoyGame(options: Parameters<typeof convoy>[0] = {}, table: Table = {}): Game {
	const { seats, seed, brain, order } = { seats: SEATS, seed: 13, order: "roster" as const, ...table };
	const writes = brain === true;
	const rules = { ...RULES, ...options };
	const { games, deadline, talkMinutes } = rules;
	const stages = rules.crews.length;
	return defineGame({
		id: "convoy-test",
		seed,
		residents: [...seats],
		mechanics: [
			convoy(rules),
			...(brain === undefined ? [] : [strategyBrain({ enabled: brain, solo: true, maxWords: 150, teams: Object.fromEntries(seats.map((seat) => [seat, [seat]])), retroMaxPosts: 8, retroMaxMinutes: 2, shared: false, brainAtStart: true })]),
		],
		grants: { resident: ["viewConvoy", ...DECISIONS, ...(writes ? (["readBrain", "writeBrain"] as const) : [])] },
		locked: [...DECISIONS, ...(writes ? (["writeBrain"] as const) : [])],
		scheduler: { id: "turns", options: { passes: 3, activation: "onNews", order, inputs: [{ kind: "context-reset" }] } },
		limits: { maxCallsPerTick: 8 },
		// The upper bound of the old game file: every phase to its deadline, every retro to its timeout.
		end: { ticks: games * (stages * (deadline * 4 + talkMinutes) + deadline) + (games + 1) * 2 + 4 },
	});
}

/** The events of one type that the mechanic wrote, as type and payload. */
export function ofType(events: readonly Envelope[], type?: string): readonly { readonly type: string; readonly payload: unknown }[] {
	return events.filter((event) => event.source.endsWith("/convoy") && (type === undefined || event.type === type)).map((event) => ({ type: event.type, payload: event.payload }));
}
