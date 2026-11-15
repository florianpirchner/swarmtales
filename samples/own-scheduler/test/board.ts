// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The test mechanic `board` of the scheduler sample: a resident posts, and every other resident has news until its
 * next activation opens. Every resident has news before its first activation. Its limits end the run after a number
 * of posts, after a number of ended ticks, or at the start of a tick.
 */
import { defineHead, defineMechanic, reply } from "@swarmtales/sdk";
import { Type } from "typebox";

const count = (description: string) => Type.Integer({ minimum: 0, default: 99, description });

const head = defineHead({
	id: "board",
	package: "@test/board",
	summary: "Residents post; the others have news.",
	options: Type.Object(
		{
			who: Type.Array(Type.String({ description: "A resident." }), { default: [], description: "The residents the toAct hook names." }),
			maxPosts: count("The posts that end the run."),
			endAfter: count("The ended ticks that end the run."),
			haltAt: count("The run ends at the start of the tick after this many started ticks."),
		},
		{ description: "The options of board." },
	),
	state: Type.Object(
		{
			posts: Type.Integer({ description: "The posts so far." }),
			read: Type.Record(Type.String(), Type.Integer(), { description: "Resident to the posts it has seen." }),
			started: Type.Integer({ description: "The started ticks." }),
			ended: Type.Integer({ description: "The ended ticks." }),
		},
		{ description: "The state of board." },
	),
	start: () => ({ posts: 0, read: {}, started: 0, ended: 0 }),
	events: { posted: Type.Object({ by: Type.String(), n: Type.Integer() }, { description: "A resident posted." }) },
	tools: { post: { description: "Post on the board.", params: Type.Object({}, { description: "No arguments." }), for: ["resident"] } },
});

/** The mechanic `board`. */
export const board = defineMechanic(head, {
	tools: {
		post: {
			run(_params, ctx) {
				const by = ctx.resident ?? "";
				ctx.state.posts += 1;
				ctx.state.read[by] = ctx.state.posts;
				ctx.emit("posted", { by, n: ctx.state.posts });
				return reply(`Post ${String(ctx.state.posts)}.`);
			},
		},
	},
	hooks: {
		news: (resident, ctx) => ctx.state.posts > (ctx.state.read[resident] ?? -1),
		activationOpened: (resident, ctx) => {
			ctx.state.read[resident] = ctx.state.posts;
		},
		tickStarted: (ctx) => {
			ctx.state.started += 1;
		},
		tickEnded: (ctx) => {
			ctx.state.ended += 1;
		},
		toAct: (ctx) => ctx.options.who,
	},
	limits: {
		full: { summary: "Ends after maxPosts posts.", breached: (view) => (view.state.posts >= view.options.maxPosts ? "the board is full" : undefined) },
		ended: { summary: "Ends after endAfter ticks.", breached: (view) => (view.state.ended >= view.options.endAfter ? "enough ticks" : undefined) },
		halted: { summary: "Ends at the start of a tick.", breached: (view) => (view.state.started > view.options.haltAt ? "halted at the start" : undefined) },
	},
});
