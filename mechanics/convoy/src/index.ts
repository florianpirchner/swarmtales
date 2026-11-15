// SPDX-License-Identifier: Apache-2.0
/**
 * The rules of Convoy, the hidden-role card game for a table of solo seats. A match is several games; in each game
 * the roles are dealt in secret (a few **saboteurs**, who know each other; the rest loyal) and a convoy crosses a
 * number of stages. A stage:
 * 1. the **lead** (rotating round the table) proposes a crew of the stage's size (`proposeCrew`);
 * 2. the table talks (`speak`, a few lines a seat per stage), and the lead may spend the game's single **audit** to
 *    reveal one card an earlier crew member played;
 * 3. every seat casts a sealed **vote of confidence** (`voteConfidence`); the votes are shown once all are in. A
 *    strict majority of no ends the lead's term: the next seat leads and proposes a crew that goes out without a vote;
 * 4. every crew member plays a sealed card (`playCrewCard`): loyal seats play safe, a saboteur may play damage, but
 *    at most once per `cooldown` stages. Only the number of damage cards is revealed; one damage card damages the stage.
 * The saboteurs win when `damageToLose` stages are damaged, the convoy when it crosses the last stage.
 *
 * Every card and every accusation is sealed (audience human). Each game ends with `convoy_game_scored`, the
 * reference of the report: every seat's accusations and votes against a Bayesian tracker of the public record, and the
 * lines in which a seat calls itself a saboteur. A strategy brain plugs in through `BrainSourceService` and
 * `StrategyBrainService`, as in the econ lab.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { defineMechanic, reply } from "@swarmtales/sdk";
import { accuseNow, auditNow, auditProblem, playNow, playProblem, sampleAudit, sampleCard, sampleSuspects, sampleView } from "./cards.ts";
import { closeLate, refreshLocks, startNext } from "./flow.ts";
import { convoyHead, type ConvoyView } from "./head.ts";
import { crewProblem, phaseProblem, proposeNow, sampleCrew, sampleLine, sampleVote, speakNow, voteNow, voteProblem } from "./moves.ts";
import { closeLateCards } from "./stage.ts";
import { hasNews, inputLines, tableText } from "./texts.ts";

export { convoyHead, type ConvoyCtx, type ConvoyView } from "./head.ts";
export { ConvoySlice, type ConvoyState } from "./model.ts";

/**
 * Convoy: secret seeded roles, crews from a rotating lead, votes of confidence, sealed cards revealed as a count.
 *
 * @example
 * ```ts
 * const tools = ["proposeCrew", "speak", "voteConfidence", "playCrewCard", "audit", "accuse"];
 * const game = defineGame({ id: "convoy", residents: 6, mechanics: [convoy({ games: 1 })], locked: tools, end: { ticks: 90 }, win: { fact: "convoy.scores" } });
 * ```
 *
 * @public
 */
export const convoy = defineMechanic(convoyHead, {
	tools: {
		viewConvoy: { run: (_params, ctx) => reply(tableText(ctx, ctx.resident)), sample: (ctx, random) => sampleView(ctx, ctx.resident, random) },
		proposeCrew: {
			check: (params, ctx) => phaseProblem(ctx, ctx.resident, "propose", "propose") ?? crewProblem(ctx, params.crew),
			run: (params, ctx) => proposeNow(ctx, ctx.resident, params.crew),
			sample: (ctx, random) => sampleCrew(ctx, ctx.resident, random),
		},
		speak: {
			check: (_params, ctx) => phaseProblem(ctx, ctx.resident, "talk", "talk about"),
			run: (params, ctx) => speakNow(ctx, ctx.resident, params.text),
			sample: (ctx, random) => sampleLine(ctx, ctx.resident, random),
		},
		voteConfidence: {
			check: (_params, ctx) => voteProblem(ctx, ctx.resident),
			run: (params, ctx) => voteNow(ctx, ctx.resident, params.vote),
			sample: (ctx, random) => sampleVote(ctx, ctx.resident, random),
		},
		playCrewCard: {
			check: (params, ctx) => playProblem(ctx, ctx.resident, params.card),
			run: (params, ctx) => playNow(ctx, ctx.resident, params.card),
			sample: (ctx, random) => sampleCard(ctx, ctx.resident, random),
		},
		audit: {
			check: (params, ctx) => auditProblem(ctx, ctx.resident, params.seat, params.stage),
			run: (params, ctx) => auditNow(ctx, ctx.resident, params.seat, params.stage),
			sample: (ctx, random) => sampleAudit(ctx, ctx.resident, random),
		},
		accuse: {
			check: (_params, ctx) => phaseProblem(ctx, ctx.resident, "accuse", "accuse"),
			run: (params, ctx) => accuseNow(ctx, ctx.resident, params.seats),
			sample: (ctx, random) => sampleSuspects(ctx, ctx.resident, random),
		},
	},
	services: {
		"brain-source": {
			game: (_input, ctx) => ctx.state.game,
			hold: (_input, ctx) => {
				if (ctx.state.finished) return false;
				ctx.state.held = true;
				return true;
			},
			release: (_input, ctx) => {
				const state = ctx.state;
				state.held = false;
				if (state.due && !state.running && !state.finished) ctx.schedule.at(ctx.tick + 1, "nextGame");
				return null;
			},
		},
	},
	hooks: {
		// After the strategy brain's runStarted phase, which may hold the first game back.
		runStarted: {
			after: ["strategy-brain"],
			run: (ctx) => {
				startNext(ctx);
				refreshLocks(ctx);
			},
		},
		// Before the strategy brain, as the old hook numbers had it (170 before 200): a game lists Convoy first.
		tickEnded: (ctx) => {
			if (ctx.state.phase === "play" || ctx.state.phase === "accuse") closeLateCards(ctx);
			else closeLate(ctx);
		},
		news: (resident, ctx) => hasNews(ctx, resident),
		// After the strategy brain's lines, as the old hook numbers had it (370).
		turnInputs: { after: ["strategy-brain"], run: (resident, ctx) => inputLines(ctx, resident) },
	},
	jobs: {
		nextGame: (ctx) => {
			startNext(ctx);
		},
	},
	limits: { match: { summary: "Breaches once the last game of the match is over.", breached: (view: ConvoyView) => (view.state.finished ? "the match is over" : undefined) } },
	facts: {
		scores: { output: Type.Record(Type.String(), Type.Number()), compute: (view) => ({ ...view.state.scores }) },
	},
});
