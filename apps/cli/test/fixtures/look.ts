// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * A game with a Director that acts by tool use (`acts: "tools"`): two residents guess a number, and the crier looks
 * after every guess, with the tools `post` and `hush` of its grant, at most three requests a look. The judge is a
 * Director of the default kind with a model of its own in the game, which `--director-model` may replace.
 */
import { defineDirector, defineGame, defineHead, defineMechanic, reply } from "@swarmtales/sdk";
import { guessNumber } from "@swarmtales/testkit";
import { Type } from "typebox";

const Line = Type.Object({ line: Type.String({ description: "The line." }) }, { description: "A line." });
const head = defineHead({
	id: "board",
	package: "@swarmtales/cli",
	summary: "A board the crier posts on.",
	events: { posted: Line },
	tools: { post: { description: "Post a line on the board.", params: Line, for: ["crier"] }, hush: { description: "Say nothing this time.", params: Type.Object({}, { description: "No arguments." }), for: ["crier"] } },
});
const board = defineMechanic(head, {
	tools: {
		post: { run: (params, ctx) => (ctx.emit("posted", params), reply("posted")), sample: (_ctx, random) => ({ line: `line ${String(random.int(1, 9))}` }) },
		hush: { run: () => reply("hushed") },
	},
});

const crier = defineDirector(
	{ id: "crier", summary: "Posts about the guesses.", on: [{ event: "guess-number.guessed" }], output: Type.Object({}, { description: "No answer: the crier acts by its tools." }), acts: "tools", limits: { maxRequests: 3 } },
	{ system: () => "You are the crier.", input: (ctx) => `${String(ctx.firings.length)} guesses at tick ${String(ctx.tick)}`, act: () => Promise.resolve() },
);
const judge = defineDirector(
	{ id: "judge", summary: "Never woken: it only has a model.", on: [], output: Line },
	{ system: () => "You are the judge.", input: () => "", act: () => Promise.resolve() },
);

export default defineGame({
	id: "look",
	seed: 4,
	residents: 2,
	mechanics: [guessNumber({ max: 100000 }), board()],
	directors: [{ use: crier }, { use: judge, model: { id: "anthropic/haiku", maxOutputTokens: 900 } }],
	scheduler: { id: "turns", options: { afterBlocks: ["director"] } },
	end: { ticks: 3 },
});
