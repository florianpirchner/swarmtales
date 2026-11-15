// SPDX-License-Identifier: Apache-2.0
/**
 * Convoy: an original hidden-role card game for six solo seats. In every game two secret saboteurs (who know each
 * other) sit among four loyal seats; a convoy crosses eight stages. Each stage a rotating lead proposes a crew, the
 * table talks and casts a vote of confidence (a lost vote ends the lead's term), and the crew plays sealed safe or
 * damage cards of which only the count is revealed. A saboteur may play damage at most once in three stages; the lead
 * may spend the game's single audit to reveal one earlier card. Three damaged stages stop the convoy (four before
 * P273). The rules are in the `convoy` mechanic. Every game starts from a fresh context with new roles; the only
 * memory across games is each seat's private strategy brain (`brain: false`: the same briefings, no brain). The
 * mechanic scores every loyal seat's accusations and votes against a Bayesian tracker of the public record, for the
 * report only. A port of the old `stories/convoy/story.ts`: the variants are options of the factory, the id is
 * always `convoy`.
 */
import { convoy } from "@swarmtales/mechanic-convoy";
import { strategyBrain } from "@swarmtales/mechanic-strategy-brain";
import { defineGame } from "@swarmtales/sdk";
import { briefings, SEATS } from "./briefing.ts";

/**
 * The variants of Convoy.
 *
 * @public
 */
export interface ConvoyOptions {
	/** Games in the match (default 3). */
	readonly games?: number;
	/** Crew size per stage; its length is the number of stages (default eight stages: 2, 2, 3, 3, 3, 3, 4, 4). */
	readonly crews?: readonly number[];
	/** Damaged stages that stop the convoy (default 3; 4 before P273). */
	readonly damageToLose?: number;
	/** A saboteur's damage card is allowed again `cooldown` stages after its last (default 3). */
	readonly cooldown?: number;
	/** Each seat keeps a strategy brain; false is the control arm (same briefings, no brain, no retro). */
	readonly brain?: boolean;
	/** Words a brain may have. */
	readonly maxWords?: number;
	/** The seed of the run; 53 when absent. */
	readonly seed?: number;
	/** Run length in ticks; default is an upper bound from the stages (the match ends the run earlier). */
	readonly ticks?: number;
}

/** The defaults of the old game. */
const DEFAULTS = { games: 3, crews: [2, 2, 3, 3, 3, 3, 4, 4], damageToLose: 3, cooldown: 3, brain: true, maxWords: 150, seed: 53 } as const satisfies ConvoyOptions;
const DEADLINE = 2;
const TALK_TICKS = 2;
const RETRO_TICKS = 2;
/** Output cap per call, as for the other games of the old platform (P94: a 4000-token cap made thinking models end turns without a tool call). */
const OUTPUT_TOKENS = 16000;

/** An upper bound of the ticks: every phase runs to its deadline (two proposals and a vote per stage), every retro to its timeout. */
const ticksFor = (games: number, stages: number): number => games * (stages * (DEADLINE * 4 + TALK_TICKS) + DEADLINE) + (games + 1) * RETRO_TICKS + 4;

/**
 * The game with its variants as options.
 *
 * @param options - The variant; every option has the default of the old game.
 * @returns The game in its builder form.
 * @example
 * ```ts
 * const played = await play(convoyGame({ games: 1, brain: false }), { seed: 13 });
 * ```
 *
 * @public
 */
export function convoyGame(options: ConvoyOptions = {}) {
	const { games, crews, damageToLose, cooldown, brain, maxWords, seed } = { ...DEFAULTS, ...options };
	return defineGame({
		id: "convoy",
		title: "Convoy",
		seed,
		residents: [...SEATS],
		mechanics: [
			convoy({ games, crews: [...crews], damageToLose, cooldown, deadline: DEADLINE, talkMinutes: TALK_TICKS }),
			strategyBrain({ enabled: brain, solo: true, maxWords, teams: Object.fromEntries(SEATS.map((seat) => [seat, [seat]])), retroMaxPosts: 8, retroMaxMinutes: RETRO_TICKS, shared: false, brainAtStart: true }),
		],
		grants: { resident: ["viewConvoy", "proposeCrew", "speak", "voteConfidence", "playCrewCard", "audit", "accuse", ...(brain ? (["readBrain", "writeBrain"] as const) : [])] },
		locked: ["proposeCrew", "speak", "voteConfidence", "playCrewCard", "audit", "accuse", ...(brain ? (["writeBrain"] as const) : [])],
		// Three passes a tick: a proposal, two rounds of talk. The reset line comes first, then the lines in the order of the old hook numbers.
		scheduler: { id: "turns", options: { passes: 3, activation: "onNews", inputs: [{ kind: "context-reset" }, { source: "strategy-brain" }, { source: "convoy" }] } },
		limits: { maxCallsPerTick: 8 },
		end: { ticks: options.ticks ?? ticksFor(games, crews.length) },
		win: { fact: "convoy.scores" },
		briefing: briefings(brain),
		model: { id: "anthropic/claude-haiku-5-5", maxOutputTokens: OUTPUT_TOKENS },
	});
}

export default convoyGame();
