/**
 * Fixes of the challenger review (docs/design/core-review-2c.md), part 2: event order that can
 * reproduce the golden logs (problem 1) and events and tools declared apart from their mechanics
 * (problem 11). The scenario is golden `cityofkeys-f10g10` seq 36-41: a submission levels a resident
 * up, the director reacts inside `enterLevel` and posts on the board, and only then is the
 * submission written: `level_up, director_action, board_post, submission`.
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { createHost, defineApi, defineCoreStory, defineEvents, defineMechanic, defineTool, reply } from "@swarmtales/kernel";
import type { EventEnvelope, Host, MechanicUse } from "@swarmtales/contracts";

/** Shared declarations (what `mechanics/shared` holds for real mechanics): no mechanic imports another. */
const ProgressEvents = defineEvents("progress", {
	level_up: Type.Object({ agent: Type.String(), from: Type.Integer(), to: Type.Integer() }),
	submission: Type.Object({ agent: Type.String(), level: Type.Integer() }),
});
const BoardApi = defineApi({
	name: "board",
	summary: "Posts on the board.",
	methods: { post: { kind: "command", summary: "Posts a text.", input: Type.Object({ author: Type.String(), text: Type.String() }), output: Type.Integer() } },
});
const Notify = defineTool("notify", Type.Object({ to: Type.String(), text: Type.String() }));

const progress = defineMechanic(
	{ id: "progress", summary: "Submissions and levels.", options: Type.Object({}), state: () => undefined, events: ProgressEvents.events, prompts: { "progress/submit": [] } },
	(kit) => ({
		tools: [
			kit.tool({
				name: "submit",
				description: "progress/submit",
				parameters: Type.Object({}),
				execute: (_params, ctx) => {
					const agent = ctx.resident ?? "";
					ctx.emit("level_up", { agent, from: 1, to: 2 });
					ctx.emit("submission", { agent, level: 1 });
					return reply("passed");
				},
			}),
		],
	}),
);

const board = defineMechanic(
	{
		id: "board",
		summary: "A board and notices.",
		provides: [BoardApi],
		options: Type.Object({}),
		state: (): { posts: number } => ({ posts: 0 }),
		events: { board_post: Type.Object({ postSeq: Type.Integer(), author: Type.String(), text: Type.String() }), notice: Type.Object({ to: Type.String(), text: Type.String() }) },
		prompts: { "board/notify": [] },
	},
	(kit) => ({
		services: [
			kit.provide(BoardApi, {
				post: (input, ctx) => {
					ctx.state.posts += 1;
					ctx.emit("board_post", { postSeq: ctx.state.posts, author: input.author, text: input.text });
					return ctx.state.posts;
				},
			}),
		],
		tools: [
			kit.tool({ ...Notify, description: "board/notify", serves: ["script"], execute: (params, ctx) => {
				ctx.emit("notice", { to: params.to, text: params.text });
				return reply("noticed");
			} }),
		],
		snapshot: kit.snapshot({ version: 1, schema: Type.Object({ posts: Type.Integer() }), save: (state) => ({ posts: state.posts }), load: (data) => ({ posts: data.posts }) }),
	}),
);

/**
 * The director: reacts to `level_up` (immediately or deferred), posts through the board's API, and
 * runs a rule with two notify actions one at a time: each action writes `director_action` and
 * stages its call; the `then` job starts the next action.
 */
const director = (immediate: boolean) =>
	defineMechanic(
		{
			id: "director",
			summary: "Reacts to level-ups.",
			requires: [BoardApi],
			options: Type.Object({}),
			state: () => undefined,
			events: { director_action: Type.Object({ rule: Type.String(), action: Type.String() }) },
		},
		(kit) => ({
			listeners: [
				kit.listen(
					ProgressEvents,
					"level_up",
					(payload, ctx) => {
						ctx.emit("director_action", { rule: "welcome", action: "postBoard" });
						ctx.call(BoardApi, "post", { author: "CITY", text: `${payload.agent} reached ${String(payload.to)}` });
						ctx.emit("director_action", { rule: "tell", action: "notify" });
						ctx.stage(Notify, { to: payload.agent, text: "first" }, { then: "second" });
					},
					{ immediate },
				),
			],
			jobs: {
				second: (ctx) => {
					ctx.emit("director_action", { rule: "tell", action: "notify" });
					ctx.stage(Notify, { to: "A02", text: "second" });
				},
			},
		}),
	);

/** Stages its own notify on every submission: it is queued before the director's second action. */
const herald = defineMechanic({ id: "herald", summary: "Notifies on submissions.", options: Type.Object({}), state: () => undefined, events: {} }, (kit) => ({
	listeners: [kit.listen(ProgressEvents, "submission", (payload, ctx) => {
		ctx.stage(Notify, { to: payload.agent, text: "herald" });
	})],
}));

function host(mechanics: readonly MechanicUse[]): Host {
	const loaded = mechanics.map((use) => use.mechanic.id);
	const grants = { resident: loaded.includes("progress") ? ["submit"] : [], script: loaded.includes("board") ? ["notify"] : [] };
	const created = createHost({ story: defineCoreStory({ id: "order", seed: 7, minutes: 2, residents: 2, mechanics, grants }) });
	created.start();
	return created;
}

/** The events a legacy log would show: no core events. */
function legacyTypes(events: readonly EventEnvelope[]): readonly string[] {
	return events.filter((event) => event.source !== "core").map((event) => (event.type === "notice" && typeof event.payload === "object" && event.payload !== null && "text" in event.payload ? `notice:${String(event.payload.text)}` : event.type));
}

describe("immediate listeners and depth-first staging (review problem 1)", () => {
	it("writes the director's reaction between level_up and submission, as the old engine did", async () => {
		const created = host([progress.with(), board.with(), director(true).with(), herald.with()]);
		await created.call("resident:A01", "submit", {});
		expect(legacyTypes(created.log.all())).toEqual([
			"level_up",
			"director_action",
			"board_post",
			"director_action",
			"submission",
			// Staged calls run after the call, one action at a time: the chain finishes before the herald's call queued behind it.
			"notice:first",
			"director_action",
			"notice:second",
			"notice:herald",
		]);
		const actions = created.log.ofType("director", "director_action");
		const levelUp = created.log.ofType("progress", "level_up")[0];
		expect(actions[0]?.causedBy).toBe(levelUp?.seq);
	});

	it("keeps the deferred order by default", async () => {
		const created = host([progress.with(), board.with(), director(false).with()]);
		await created.call("resident:A01", "submit", {});
		expect(legacyTypes(created.log.all()).slice(0, 5)).toEqual(["level_up", "submission", "director_action", "board_post", "director_action"]);
	});
});

describe("events and tools declared apart (review problem 11)", () => {
	it("lets a listener name a mechanic's events without importing the mechanic, and stays silent when it is not loaded", async () => {
		const created = host([board.with(), director(true).with()]);
		expect(created.mechanics).toEqual(["board", "director"]);
		expect(await created.run(() => Promise.resolve())).toMatchObject({ reason: "minutes" });
		expect(created.log.ofType("director", "director_action")).toHaveLength(0);
	});

	it("refuses a listener whose schema is not the one the loaded mechanic declares", () => {
		const Drifted = defineEvents("progress", { level_up: Type.Object({ agent: Type.String() }) });
		const drifter = defineMechanic({ id: "drifter", summary: "Listens with its own copy.", options: Type.Object({}), state: () => undefined, events: {} }, (kit) => ({
			listeners: [kit.listen(Drifted, "level_up", () => undefined)],
		}));
		expect(() => host([progress.with(), drifter.with()])).toThrow(/another schema than progress declares/);
		const Missing = defineEvents("progress", { promoted: Type.Object({}) });
		const lost = defineMechanic({ id: "lost", summary: "Listens to nothing.", options: Type.Object({}), state: () => undefined, events: {} }, (kit) => ({
			listeners: [kit.listen(Missing, "promoted", () => undefined)],
		}));
		expect(() => host([progress.with(), lost.with()])).toThrow(/progress does not declare/);
	});

	it("refuses to stage a tool with another schema than the loaded tool's", () => {
		const Copy = defineTool("notify", Type.Object({ to: Type.String(), text: Type.String() }));
		const stager = defineMechanic({ id: "stager", summary: "Stages with a copy.", options: Type.Object({}), state: () => undefined, events: {} }, () => ({
			hooks: { runStarted: (ctx) => {
				ctx.stage(Copy, { to: "A01", text: "hi" });
			} },
		}));
		expect(() => host([board.with(), stager.with()])).toThrow(/another parameter schema than board defines/);
	});
});
