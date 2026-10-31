/**
 * Fixes of the challenger review (docs/design/core-review-2c.md), part 4: calls staged by the
 * minute's last events (problem 5), steps counted before the lock stage (problem 6) and the error
 * path (problem 7), each in the review's scenario.
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { createHost, defineCoreStory, defineMechanic, defineTool, refuse, reply } from "@swarmtales/kernel";
import { checkSnapshotRoundTrip, idleAgent, playMinutes, playStory } from "@swarmtales/testkit";
import type { EventEnvelope, MechanicUse } from "@swarmtales/contracts";

const Note = defineTool("note", Type.Object({ text: Type.String() }));

/** A `note` tool, a listener of minute_ended that stages one, and an `explode` tool that stages, emits and throws. */
const clerk = defineMechanic(
	{
		id: "clerk",
		summary: "A test mechanic: notes, a minute-end listener and a tool that throws.",
		options: Type.Object({}),
		state: (): { notes: number } => ({ notes: 0 }),
		events: { noted: Type.Object({ text: Type.String() }), exploding: Type.Object({}) },
		prompts: { "clerk/note": [], "clerk/explode": [], "clerk/locked": [] },
	},
	(kit) => ({
		tools: [
			kit.tool({ ...Note, description: "clerk/note", execute: (params, ctx) => {
				ctx.state.notes += 1;
				ctx.emit("noted", { text: params.text });
				return reply("noted");
			} }),
			kit.tool({ name: "explode", description: "clerk/explode", parameters: Type.Object({}), execute: (_params, ctx) => {
				ctx.stage(Note, { text: "after the explosion" });
				ctx.emit("exploding", {});
				throw new Error("boom");
			} }),
			kit.tool({ name: "vault", description: "clerk/locked", parameters: Type.Object({ code: Type.Integer() }), execute: () => refuse("NEVER") }),
		],
		listeners: [
			kit.core("minute_ended", (_payload, ctx) => {
				ctx.stage(Note, { text: `minute ${String(ctx.minute)} ended` });
			}),
		],
		snapshot: kit.snapshot({ version: 1, schema: Type.Object({ notes: Type.Integer() }), save: (state) => ({ notes: state.notes }), load: (data) => ({ notes: data.notes }) }),
	}),
);

function story(mechanics: readonly MechanicUse[] = [clerk.with()], maxStepsPerMinute?: number) {
	return defineCoreStory({
		id: "lifecycle",
		seed: 5,
		minutes: 3,
		residents: 2,
		mechanics,
		grants: { resident: ["note", "explode", "vault"], gamemaker: ["note", "explode"], script: ["note"] },
		locked: ["vault"],
		...(maxStepsPerMinute === undefined ? {} : { limits: { maxStepsPerMinute } }),
	});
}

const types = (events: readonly EventEnvelope[]): readonly string[] => events.map((event) => event.type);

describe("calls staged by the minute's last events (review problem 5)", () => {
	it("runs them inside the minute, so a resumed run logs what the whole run logs", async () => {
		const whole = await playStory({ story: story() }, idleAgent);
		expect(whole.events.filter((event) => event.type === "noted")).toHaveLength(3);
		const ended = whole.events.findIndex((event) => event.type === "minute_ended");
		expect(types(whole.events.slice(ended, ended + 3))).toEqual(["minute_ended", "tool_called", "noted"]);
		expect(whole.events[ended + 2]?.minute).toBe(0);
		expect(await checkSnapshotRoundTrip({ story: story() }, () => idleAgent, 1)).toEqual([]);
		expect(await checkSnapshotRoundTrip({ story: story() }, () => idleAgent, 2)).toEqual([]);
	});

	it("refuses a snapshot while calls are still staged", () => {
		const early = defineMechanic({ id: "early", summary: "Stages at the start.", options: Type.Object({}), state: () => undefined, events: {} }, () => ({
			hooks: { runStarted: (ctx) => {
				ctx.stage(Note, { text: "first" });
			} },
		}));
		const host = createHost({ story: story([clerk.with(), early.with()]) });
		host.start();
		expect(() => host.snapshot()).toThrow(/1 staged calls have not run/);
	});
});

describe("steps (review problem 6)", () => {
	it("counts calls to locked tools and calls with bad arguments", async () => {
		const host = await playMinutes({ story: story([clerk.with()], 3) }, async (turn) => {
			if (turn.resident !== "A01") return;
			for (let index = 0; index < 10; index++) {
				await turn.call("vault", { code: 1 });
				// A number would be converted to text, as the old runner did (R2-D6); an object is not.
				await turn.call("note", { text: { bad: true } });
			}
		}, 1);
		const refusals = host.log.ofType("core", "tool_refused").map((event) => (typeof event.payload === "object" && event.payload !== null && "code" in event.payload ? String(event.payload.code) : ""));
		expect(refusals.filter((code) => code === "STEP_LIMIT")).toHaveLength(17);
		expect(refusals.slice(0, 3)).toEqual(["TOOL_LOCKED", "INVALID_ARGUMENTS", "TOOL_LOCKED"]);
		const first = host.log.ofType("core", "tool_refused").find((event) => typeof event.payload === "object" && event.payload !== null && "code" in event.payload && event.payload.code === "STEP_LIMIT");
		expect(first?.payload).toMatchObject({ stage: "limit", tool: "note" });
	});
});

describe("a thrown error (review problem 7)", () => {
	it("drops what the failed call staged, ends the run with reason error and refuses further use", async () => {
		const host = createHost({ story: story() });
		host.start();
		await expect(host.call("gamemaker", "explode", {})).rejects.toThrow("boom");
		expect(host.ended).toEqual({ reason: "error", minute: 0 });
		const last = host.log.all().at(-1);
		expect(last).toMatchObject({ type: "run_ended", payload: { reason: "error", detail: "boom" } });
		expect(types(host.log.all())).toEqual(["run_started", "tool_called", "exploding", "run_ended"]);
		await expect(host.call("gamemaker", "note", { text: "next" })).rejects.toThrow(/the run failed \(boom\)/);
		await expect(host.playMinute(idleAgent)).rejects.toThrow(/the run failed/);
		expect(() => host.snapshot()).toThrow(/the run failed/);
		expect(host.log.ofType("clerk", "noted")).toHaveLength(0);
	});

	it("does not let an agent that catches the error play on, and never replays the minute", async () => {
		const host = createHost({ story: story() });
		host.start();
		const outcomes: string[] = [];
		const agent = async (turn: { readonly resident: string; call(tool: string, params: unknown): Promise<unknown> }): Promise<void> => {
			try {
				await turn.call(turn.resident === "A01" ? "explode" : "note", turn.resident === "A01" ? {} : { text: "hi" });
			} catch (error) {
				outcomes.push(`${turn.resident}: ${error instanceof Error ? error.message : "?"}`);
			}
			try {
				await turn.call("note", { text: "after" });
				outcomes.push(`${turn.resident}: noted`);
			} catch (error) {
				outcomes.push(`${turn.resident}: ${error instanceof Error ? error.message : "?"}`);
			}
		};
		await expect(host.playMinute(agent)).rejects.toThrow("boom");
		expect(outcomes.find((entry) => entry.startsWith("A01"))).toBe("A01: boom");
		const exploded = host.log.ofType("clerk", "exploding")[0]?.seq ?? 0;
		expect(host.log.since(exploded).map((event) => event.type)).toEqual(["run_ended"]);
		expect(outcomes.filter((entry) => entry.startsWith("A01"))).toEqual(["A01: boom", "A01: host: the run failed; no more calls"]);
		expect(host.log.all().at(-1)?.type).toBe("run_ended");
		const length = host.log.length;
		await expect(host.playMinute(agent)).rejects.toThrow(/the run failed/);
		expect(host.log.length).toBe(length);
		expect(host.log.ofType("core", "minute_ended")).toHaveLength(0);
	});
});
