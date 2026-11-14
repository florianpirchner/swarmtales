// SPDX-License-Identifier: Apache-2.0
/**
 * The `draft-rounds` mechanic: the drafting game Quarry (docs/ideas/game-roadmap.md §2.4) for solo seats.
 * A match is several games; a game is several pack rounds; in a pack round every seat opens a pack,
 * keeps one card (`pick`) and passes the rest, to the next seat in odd pack rounds and to the previous
 * one in even rounds, until every pack is empty. The cards are four resources (amber, basalt, cobalt,
 * jade) and a wild ore (lodestone). At the game's end each quarry scores:
 * - every resource the square of its cards; a set takes at most one lodestone, the lodestones go to the
 *   biggest sets (so a single lane pays, and a contested lane pays nobody);
 * - a majority bonus for the single seat with the most cards of a resource (a tie scores nothing, so a
 *   hate pick can cost a neighbour its bonus);
 * - minus the cost of each burn: with a pick a seat may destroy one more card of the pack before it
 *   moves on (a limited number per game), to deny it to the receiver.
 * Picks are simultaneous and sealed (`draft_card_picked`, audience `human`): a seat sees only its own
 * pack and quarry and who passed the pack to it; hands are revealed at the game's end (`openHands`
 * shows them all along, as they are when a seat is asked; with `frozenHands` as they were when the pick opened). A pick not made by the deadline takes the first card of the pack and is
 * marked missed. Every pick is scored against the greedy reference (what it added to the own set score
 * against the best card, and whether it took the receiver's best card), and each game against the
 * greedy table (four greedy seats on the same deal), in `draft_game_scored` for the human only. A
 * strategy brain plugs in through `BrainSourceService` and `StrategyBrainService`, as in the econ lab.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import type { RandomSource } from "@swarmtales/contracts";
import { defineMechanic, reply } from "@swarmtales/sdk";
import { pass, pickNow, problemWith, refreshLocks, startNext, take } from "./flow.ts";
import { draftRoundsHead, type DraftRoundsToolCtx, type DraftRoundsView } from "./head.ts";
import { quarriesLine, rulesText, tableText, taskText } from "./texts.ts";

type View = DraftRoundsView;
/** The share of the times the fake driver (`--fake`) is asked in which it looks at the table, and the share of its picks with a burn while it has burns left. */
const FAKE_RATE = 0.125;
const FAKE_BURN = 0.25;

// A pick of the fake driver for a seat that owes one: any card of its pack, and now and then a second card to burn.
function samplePick(ctx: DraftRoundsToolCtx, random: RandomSource): { card: string; burn?: string } | undefined {
	const { state, resident } = ctx;
	if (resident === undefined || !state.running || !state.owing.includes(resident)) return undefined;
	const [card, burn] = random.shuffle(state.packs[resident] ?? []);
	if (card === undefined) return undefined;
	const burns = burn !== undefined && (state.burns[resident] ?? 0) < ctx.options.maxBurns && random.next() < FAKE_BURN;
	return burns ? { card: card.id, burn: burn.id } : { card: card.id };
}

/**
 * The draft: packs passed around a table, one sealed pick each, a quarry scored at the end of a game.
 *
 * @example
 * ```ts
 * const game = defineGame({ id: "draft", residents: 4, mechanics: [draftRounds({ games: 1 })], end: { ticks: 30 }, win: { fact: "draft-rounds.scores" } });
 * ```
 *
 * @public
 */
export const draftRounds = defineMechanic(draftRoundsHead, {
	tools: {
		viewTable: { sample: (ctx, random) => (ctx.resident !== undefined && random.next() < FAKE_RATE ? {} : undefined), run: (_params, ctx) => reply(tableText(ctx, ctx.resident)) },
		pick: {
			sample: samplePick,
			check: (params, ctx) => problemWith(ctx, ctx.resident, params.card, params.burn),
			run: (params, ctx) => pickNow(ctx, ctx.resident, params.card, params.burn),
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
			},
		},
		tickEnded: (ctx) => {
			const state = ctx.state;
			if (!state.running || state.owing.length === 0 || ctx.tick - state.opened + 1 < ctx.options.deadline) return;
			for (const seat of [...state.owing]) {
				const first = state.packs[seat]?.[0];
				if (first !== undefined) take(ctx, seat, first.id, undefined, true);
			}
			state.owing = [];
			refreshLocks(ctx);
			pass(ctx, ctx.tick + 1);
		},
		news: (resident, ctx) => ctx.state.running && ctx.state.owing.includes(resident),
		turnInputs: (resident, ctx) => {
			const state = ctx.state;
			if (!state.running || !state.seats.includes(resident)) return [];
			const lines: string[] = [];
			if (!state.briefed.includes(resident)) {
				state.briefed.push(resident);
				lines.push(`${ctx.prompt("draft-rounds/game-head", { game: state.game, games: ctx.options.games })} ${rulesText(ctx)}`);
			}
			if (state.owing.includes(resident) && !state.told.includes(resident)) {
				state.told.push(resident);
				const task = taskText(ctx, resident);
				if (task !== undefined) lines.push(task);
				if (ctx.options.openHands) lines.push(quarriesLine(ctx, resident));
			}
			return lines;
		},
	},
	jobs: {
		nextGame: (ctx) => {
			startNext(ctx);
		},
	},
	limits: { match: { summary: "Breaches once the last game of the match is over.", breached: (view: View) => (view.state.finished ? "the match is over" : undefined) } },
	facts: {
		scores: { output: Type.Record(Type.String(), Type.Number()), compute: (view) => ({ ...view.state.scores }) },
	},
});
