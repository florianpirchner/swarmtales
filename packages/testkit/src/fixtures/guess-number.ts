// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The fixture mechanic `guess-number`: residents guess a seeded secret number, and the run ends when one finds it.
 * It is the integration fixture of kernel, sdk, `turns` and testkit together.
 */
import { defineHead, defineMechanic, refuse, reply } from "@swarmtales/sdk";
import { Type, type Static } from "typebox";

const State = Type.Object(
	{ secret: Type.Integer({ description: "The number to find." }), winner: Type.Optional(Type.String({ description: "The resident that found it." })) },
	{ description: "The state of guess-number." },
);
const Hint = Type.Union([Type.Literal("low"), Type.Literal("high"), Type.Literal("right")], { description: "Where the guess lies against the secret." });

/**
 * The head of `guess-number`: option `max`, the state `{ secret, winner? }`, the event `guessed` and the tool `guess`.
 *
 * @public
 */
export const guessNumberHead = defineHead({
	id: "guess-number",
	package: "@swarmtales/testkit",
	summary: "Residents guess a seeded secret number; the run ends when one finds it.",
	options: Type.Object({ max: Type.Integer({ minimum: 1, default: 100, description: "The secret lies between 1 and this number." }) }, { description: "The options of guess-number." }),
	state: State,
	start: ({ options, rng }): Static<typeof State> => ({ secret: rng("guess-number", "secret").int(1, options.max) }),
	events: {
		guessed: Type.Object(
			{ by: Type.String({ description: "The resident that guessed." }), value: Type.Integer({ description: "The guess." }), hint: Hint },
			{ additionalProperties: false, description: "A resident made a guess." },
		),
	},
	tools: {
		guess: { description: "Guess the secret number. The answer says whether your guess is too low, too high or right.", params: Type.Object({ value: Type.Integer({ description: "Your guess." }) }, { description: "The arguments of guess." }), for: ["resident"] },
	},
});

const hintOf = (value: number, secret: number): Static<typeof Hint> => (value === secret ? "right" : value < secret ? "low" : "high");

/**
 * The mechanic `guess-number`. Its tool `guess` ends the turn; the run limit `solved` ends the run once a resident
 * found the secret; its `toAct` hook names every resident while nobody has.
 *
 * @example
 * ```ts
 * const game = defineGame({ id: "guess", residents: 2, mechanics: [guessNumber({ max: 10 })], end: { ticks: 20 } });
 * ```
 *
 * @public
 */
export const guessNumber = defineMechanic(guessNumberHead, {
	tools: {
		guess: {
			run(params, ctx) {
				if (ctx.resident === undefined) return refuse("NOT_A_RESIDENT", "Only a resident guesses.");
				const hint = hintOf(params.value, ctx.state.secret);
				if (hint === "right") ctx.state.winner ??= ctx.resident;
				ctx.emit("guessed", { by: ctx.resident, value: params.value, hint });
				return reply(hint === "right" ? `${String(params.value)} is right.` : `${String(params.value)} is too ${hint}.`, { endsTurn: true });
			},
			sample: (ctx, random) => ({ value: random.int(1, ctx.options.max) }),
		},
	},
	limits: { solved: { summary: "Ends the run when a resident found the secret.", breached: (view) => (view.state.winner === undefined ? undefined : `${view.state.winner} found the secret`) } },
	hooks: { toAct: (ctx) => (ctx.state.winner === undefined ? ctx.residents.ids : []) },
});
