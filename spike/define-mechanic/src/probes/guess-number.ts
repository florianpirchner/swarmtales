/**
 * The first mechanic of paper 04 section 2.2, in the one-object form on today's kernel. The
 * context is today's (`ctx.resident`, `reply`, `refuse`); the paper's `ctx.caller`, `ctx.reply`
 * and inline texts belong to the new kernel, not to this question.
 */
import { Type } from "typebox";
import { refuse, reply } from "@swarmtales/kernel";
import { mechanic } from "../define.ts";

export const guessNumber = mechanic({
	id: "guess-number",
	summary: "A secret number; each guess is answered with higher, lower or correct.",
	options: Type.Object({ max: Type.Integer({ minimum: 2, default: 100, description: "The secret lies between 1 and max." }) }),
	state: Type.Object({ secret: Type.Integer(), winner: Type.Optional(Type.String()) }),
	events: {
		guessed: Type.Object({ by: Type.String(), value: Type.Integer(), hint: Type.Union([Type.Literal("higher"), Type.Literal("lower"), Type.Literal("correct")]) }),
	},
	prompts: { "guess-number/tools/guess": [] },
	start: (setup) => ({ secret: setup.rng("secret").int(1, setup.options.max) }),
	tools: {
		guess: {
			description: "guess-number/tools/guess",
			for: ["resident"],
			params: Type.Object({ value: Type.Integer({ minimum: 1, description: "Your guess." }) }),
			run({ value }, ctx) {
				if (ctx.state.winner !== undefined) return refuse("GAME_OVER", "The number is already found.");
				const hint = value === ctx.state.secret ? "correct" : value < ctx.state.secret ? "higher" : "lower";
				ctx.emit("guessed", { by: ctx.resident ?? ctx.actor, value, hint });
				if (hint === "correct") ctx.state.winner = ctx.resident ?? ctx.actor;
				return reply(`${String(value)}: ${hint}.`, { endsTurn: true });
			},
		},
	},
	facts: {
		found: { output: Type.Boolean(), compute: (view) => view.state.winner !== undefined },
	},
});
