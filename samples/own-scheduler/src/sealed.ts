// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The mechanic `sealed` of the sample game: every round each resident seals one guess of a hidden number, and the
 * round is opened when its tick ends. No guess is seen before the opening and the hidden number is a labelled random
 * stream, so the order in which the guesses arrive moves no score.
 */
import { defineHead, defineMechanic, refuse, reply } from "@swarmtales/sdk";
import { Type } from "typebox";

const Points = Type.Record(Type.String({ description: "A resident." }), Type.Integer({ description: "A number." }), { description: "Resident to a number." });

const head = defineHead({
	id: "sealed",
	package: "@swarmtales/sample-own-scheduler",
	summary: "Each round every resident seals a guess of a hidden number; the round is opened at the end of its tick.",
	options: Type.Object({ max: Type.Integer({ minimum: 1, default: 10, description: "The hidden number lies in 1 to max." }) }, { description: "The options of sealed." }),
	state: Type.Object({ sealed: Points, score: Points }, { description: "The guesses of the round, unseen, and the points so far." }),
	start: ({ residents }) => ({ sealed: {}, score: Object.fromEntries(residents.map((id) => [id, 0])) }),
	events: {
		guessed: Type.Object({ by: Type.String({ description: "The resident." }) }, { description: "A resident sealed its guess; the number stays hidden." }),
		round_opened: Type.Object(
			{
				round: Type.Integer({ description: "The tick of the round." }),
				target: Type.Integer({ description: "The hidden number." }),
				guesses: Points,
				winners: Type.Array(Type.String({ description: "A resident." }), { description: "The residents closest to the number." }),
				score: Points,
			},
			{ description: "The round is opened: every guess, the number, who scored." },
		),
	},
	tools: {
		guess: {
			description: "Seal your guess of the hidden number for this round.",
			params: Type.Object({ number: Type.Integer({ minimum: 1, description: "Your guess." }) }, { description: "The guess." }),
			for: ["resident"],
		},
	},
});

/**
 * The mechanic `sealed`: the tool `guess`, once per round, and the opening of the round at the end of its tick.
 *
 * @public
 */
export const sealed = defineMechanic(head, {
	tools: {
		guess: {
			run(params, ctx) {
				const by = ctx.resident ?? "";
				if (ctx.state.sealed[by] !== undefined) return refuse("ALREADY_GUESSED", "one guess per round");
				if (params.number > ctx.options.max) return refuse("OUT_OF_RANGE", `1-${String(ctx.options.max)}`);
				ctx.state.sealed[by] = params.number;
				ctx.emit("guessed", { by });
				return reply(`Your guess for round ${String(ctx.tick)} is sealed.`);
			},
		},
	},
	hooks: {
		tickEnded: (ctx) => {
			const { sealed: guesses, score } = ctx.state;
			const target = ctx.rng("sealed", "target", ctx.tick).int(1, ctx.options.max);
			// The residents in the game's order, never in the order of arrival.
			const guessed = ctx.residents.ids.filter((id) => guesses[id] !== undefined);
			const distance = (id: string): number => Math.abs((guesses[id] ?? 0) - target);
			const best = Math.min(...guessed.map(distance));
			const winners = guessed.filter((id) => distance(id) === best);
			for (const id of winners) score[id] = (score[id] ?? 0) + 1;
			ctx.emit("round_opened", { round: ctx.tick, target, guesses: Object.fromEntries(guessed.map((id) => [id, guesses[id] ?? 0])), winners, score: { ...score } });
			for (const id of guessed) Reflect.deleteProperty(guesses, id);
		},
	},
});
