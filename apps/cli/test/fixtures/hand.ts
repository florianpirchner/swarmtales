// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * A game with the actor `human`: two residents guess a number, and a stand-in for the mechanic `humanHand` (same
 * id, tools and fact; the command line does not depend on a mechanic package) grants `pause` and `resume` to the human.
 * The Director `herald` notes a line about the first two guesses it is told of; its fallback line is "silence".
 */
import { defineDirector, defineGame, defineHead, defineMechanic, refuse, reply } from "@swarmtales/sdk";
import { guessNumber } from "@swarmtales/testkit";
import { Type } from "typebox";

const none = Type.Object({}, { description: "No arguments." });
const Line = Type.Object({ line: Type.String({ description: "The line." }) }, { description: "A line." });
const head = defineHead({
	id: "humanHand",
	package: "@swarmtales/cli",
	summary: "Pause and resume, as the mechanic humanHand has them.",
	state: Type.Object({ paused: Type.Boolean({ description: "True from a pause to the next resume." }) }, { description: "The state." }),
	start: () => ({ paused: false }),
	events: { paused: Type.Object({}, { description: "The run is paused." }), resumed: Type.Object({}, { description: "The run goes on." }), noted: Line },
	tools: { note: { description: "Note a line.", params: Line, for: ["herald"] }, pause: { description: "Halt the run.", params: none, for: ["human"] }, resume: { description: "Let the run go on.", params: none, for: ["human"] } },
});
const flip = (to: boolean, event: "paused" | "resumed", code: string) => ({
	check: (_params: object, ctx: { readonly state: { readonly paused: boolean } }) => (ctx.state.paused === to ? refuse(code, "the run is in that state already") : undefined),
	run: (_params: object, ctx: { readonly state: { paused: boolean }; readonly emit: (type: "paused" | "resumed", payload: object) => void }) => {
		ctx.state.paused = to;
		ctx.emit(event, {});
		return reply("done");
	},
});
const humanHand = defineMechanic(head, {
	tools: { note: { run: (params, ctx) => (ctx.emit("noted", params), reply("noted")) }, pause: flip(true, "paused", "ALREADY_PAUSED"), resume: flip(false, "resumed", "NOT_PAUSED") },
	facts: { paused: { output: Type.Boolean({ description: "True while the run is paused." }), compute: (view) => view.state.paused } },
});

const herald = defineDirector(
	{ id: "herald", summary: "Notes a line about a guess.", on: [{ event: "guess-number.guessed" }], output: Line, limits: { maxCalls: 2 } },
	{ system: () => "You are the herald.", input: (ctx) => `${String(ctx.firings.length)} guesses`, act: (answer, ctx) => ctx.call("note", answer).then(() => undefined), fallback: () => ({ line: "silence" }) },
);

export default defineGame({
	id: "hand",
	seed: 4,
	residents: 2,
	mechanics: [guessNumber({ max: 100000 }), humanHand()],
	directors: [{ use: herald }],
	scheduler: { id: "turns", options: { afterBlocks: ["director"] } },
	end: { ticks: 4 },
});
