// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The goals mechanic, carried from the old `test/engine/goals.test.ts` and the golden gate of
 * `test/mechanics/goals/goals.test.ts`: the deal and the resolution of the City's oracle files (the real `motives`
 * deals the drives, the acts and the exile are stand-ins), the deal over many residents, every kind resolved, the
 * void goal of an exiled resident, the heirs of a last will, the leaders through the service `goals`, the status
 * part, the facts the gamemaker reads, the goal check of a Director's note, and the resume at every boundary.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import type { ToolOutcome } from "@swarmtales/contracts";
import { defineHead, defineMechanic, reply, type Game } from "@swarmtales/sdk";
import { checkOptionsDocumented, checkPackage, checkResumeEveryBoundary, idleDriver, testKernel, type TestKernel } from "@swarmtales/testkit";
import { GoalsService, GoalSchema, goals } from "../src/index.ts";
import { CITY, gameOf, GOALS } from "./support.ts";

const Entry = Type.Object({ k: Type.String(), type: Type.Optional(Type.String()), payload: Type.Optional(Type.Unknown()) });
const Timeline = Type.Object({ setup: Type.Object({ seed: Type.Integer() }), timeline: Type.Array(Entry) });
interface Line {
	readonly type?: string;
	readonly payload?: unknown;
}

const Payload = Type.Record(Type.String(), Type.Unknown());
// One line of the projection: the goals' events, the notices and posts they cause, the bonus they mint.
function shown(line: Line): string | undefined {
	const payload = Value.Parse(Payload, line.payload ?? {});
	if (line.type === "goal_dealt" || line.type === "goal_resolved" || line.type === "notice") return `${line.type} ${JSON.stringify(payload)}`;
	if (line.type === "board_post") return `post ${String(payload.text)}`;
	const entry = Object.fromEntries(Object.entries(payload).filter(([key]) => key !== "txId"));
	return line.type === "ledger_entry" && entry.reason === "secret goal fulfilled" ? `mint ${JSON.stringify(entry)}` : undefined;
}

// The projection after the act's `act_started` (8) or `act_ended` (8), up to the next line of another kind.
function project(lines: readonly Line[], from: "act_started" | "act_ended"): readonly string[] {
	const start = lines.findIndex((line) => line.type === from && JSON.stringify(line.payload).startsWith('{"fromLevel":8'));
	// The seal ends before the goals (its own lines), and the kernel writes `service_called`: neither is projected.
	const after = lines.slice(start + 1).filter((line) => line.type !== "service_called" && line.type?.startsWith("seal_") !== true);
	const end = after.findIndex((line) => shown(line) === undefined && line.type !== "goal_resolved");
	return (end === -1 ? after : after.slice(0, end)).flatMap((line) => shown(line) ?? []);
}

function oracle(file: string): { readonly seed: number; readonly lines: readonly Line[] } {
	const read = Value.Parse(Timeline, JSON.parse(readFileSync(resolve(CITY, `${file}.json`), "utf8")));
	return { seed: read.setup.seed, lines: read.timeline.filter((entry) => entry.k === "event") };
}

async function script(test: TestKernel, tool: string, params: unknown): Promise<string> {
	const outcome: ToolOutcome = await test.kernel.submit({ actor: "script", as: tool, params });
	return outcome.ok ? outcome.reply : `${outcome.code}: ${outcome.detail ?? ""}`;
}

const dealtGoals = (test: TestKernel) => test.kernel.log.all().filter((event) => event.type === "goal_dealt").map((event) => Value.Parse(Type.Object({ agent: Type.String(), goal: GoalSchema, text: Type.String() }), event.payload));
const resolvedGoals = (test: TestKernel) => test.kernel.log.all().filter((event) => event.type === "goal_resolved").map((event) => Value.Parse(Type.Object({ agent: Type.String(), goal: GoalSchema, fulfilled: Type.Boolean(), void: Type.Optional(Type.Boolean()), bonus: Type.Integer() }), event.payload));
const posts = (test: TestKernel) => test.kernel.log.all().flatMap((event) => (event.type === "board_post" ? [String(Value.Parse(Payload, event.payload).text)] : []));

describe("the oracle files of the City", () => {
	it.each([
		["cityofkeys-act1-s7", { A03: 10 }],
		["cityofkeys-act1-s11", {}],
	])("deals and resolves the goals of %s line for line", async (file, points) => {
		const old = oracle(file);
		const test = testKernel(gameOf({ seed: old.seed }));
		await script(test, "startAct", { fromLevel: 8 });
		for (const [account, amount] of Object.entries(points)) await script(test, "points", { account, amount });
		await script(test, "endAct", { fromLevel: 8 });
		const fresh = test.kernel.log.all();
		expect(project(fresh, "act_started")).toHaveLength(12);
		expect(project(fresh, "act_started")).toEqual(project(old.lines, "act_started"));
		expect(project(old.lines, "act_ended").length).toBeGreaterThan(12);
		expect(project(fresh, "act_ended")).toEqual(project(old.lines, "act_ended"));
	});
});

describe("the deal", () => {
	it.each([6, 12, 48])("gives each of %i residents a goal on someone else, and crosses protect with exile", async (count) => {
		const test = testKernel(gameOf({ residents: count }));
		await script(test, "startAct", { fromLevel: 8 });
		const dealt = dealtGoals(test);
		expect(dealt.map((entry) => entry.agent)).toEqual(Array.from({ length: count }, (_, index) => `A${String(index + 1).padStart(2, "0")}`));
		for (const { agent, goal } of dealt) {
			if ("target" in goal) expect(goal.target).not.toBe(agent);
			if (goal.kind === "protect") expect(dealt.some((other) => other.agent !== agent && other.goal.kind === "exile" && other.goal.target === goal.target)).toBe(true);
		}
	});

	it("deals once per act, only in the acts of the options, and no lead without factions", async () => {
		const test = testKernel(gameOf({ seed: 11, options: { ...GOALS, factions: false } }));
		await script(test, "startAct", { fromLevel: 1 });
		await script(test, "startAct", { fromLevel: 8 });
		await script(test, "startAct", { fromLevel: 8 });
		expect(dealtGoals(test)).toHaveLength(6);
		expect(dealtGoals(test).some((entry) => entry.goal.kind === "lead")).toBe(false);
	});
});

const asker = defineMechanic(defineHead({ id: "asker", package: "@test/asker", summary: "Test: the service goals.", uses: [GoalsService], tools: { lead: { description: "Lead.", params: Type.Object({ leaders: Type.Array(Type.String()) }) }, held: { description: "Held.", params: Type.Object({ resident: Type.String() }) } } }), {
	tools: {
		lead: { run: ({ leaders }, ctx) => reply(JSON.stringify(ctx.tryCall(GoalsService, "noteLeaders", { leaders }))) },
		held: { run: ({ resident }, ctx) => reply(JSON.stringify(ctx.tryCall(GoalsService, "goalOf", { resident }))) },
	},
});

function withAsker(seed = 7): Game {
	return gameOf({ seed, more: [asker()], script: ["lead", "held"] });
}

type Dealt = ReturnType<typeof dealtGoals>;

// Gives the outrankers 100 points, the leaders two leaderships and every resident a bequest; returns the target of the first exile goal.
async function makeHold(test: TestKernel, dealt: Dealt): Promise<string> {
	for (const { agent, goal } of dealt) {
		if (goal.kind === "outrank") await script(test, "points", { account: agent, amount: 100 });
		if (goal.kind !== "lead") continue;
		await script(test, "lead", { leaders: [agent] });
		await script(test, "lead", { leaders: [agent] });
	}
	await script(test, "will", { agent: "A06", heirs: dealt.map((entry) => entry.agent) });
	const victim = dealt.find((entry) => entry.goal.kind === "exile")?.goal;
	return victim !== undefined && "target" in victim ? victim.target : "A05";
}

// Whether a goal holds once `makeHold` ran and `target` is exiled.
function holds({ agent, goal }: Dealt[number], dealt: Dealt, target: string): boolean {
	const rich = new Set(dealt.flatMap((entry) => (entry.goal.kind === "outrank" ? [entry.agent] : [])));
	if (goal.kind === "exile") return goal.target === target;
	if (goal.kind === "protect") return goal.target !== target;
	return goal.kind !== "outrank" || (rich.has(agent) && !rich.has(goal.target));
}

describe("the goal book", () => {
	it("resolves every kind: exile by then, more points, two leaderships, a bequest; an exiled resident's goal is void and read out once", async () => {
		const test = testKernel(withAsker(11));
		await script(test, "startAct", { fromLevel: 8 });
		const dealt = dealtGoals(test);
		const target = await makeHold(test, dealt);
		await script(test, "banish", { resident: target });
		await script(test, "banish", { resident: target });
		const text = dealt.find((entry) => entry.agent === target)?.text ?? "";
		expect(posts(test)).toEqual([`${target} leaves the city. Its secret goal was: ${text}.`]);
		expect(await script(test, "held", { resident: target })).toBe("null");
		await script(test, "endAct", { fromLevel: 8 });
		const resolved = resolvedGoals(test);
		expect(resolved.filter((entry) => entry.void === true).map((entry) => entry.agent)).toEqual([target]);
		for (const entry of resolved.filter((each) => each.void !== true)) {
			const goal = dealt.find((each) => each.agent === entry.agent);
			expect([entry.agent, entry.fulfilled, entry.bonus]).toEqual([entry.agent, goal !== undefined && holds(goal, dealt, target), entry.fulfilled ? 15 : 0]);
		}
		expect(posts(test).at(-1)).toMatch(new RegExp(`^The act is over\\. The city reads out every secret goal: A01: .+ \\((fulfilled|missed|void)\\); .*${target}: .+ \\(void\\)`));
	});

	it("keeps the goal in the status line and the facts while the act runs, and answers goalOf", async () => {
		const test = testKernel(withAsker());
		await script(test, "startAct", { fromLevel: 8 });
		const [first] = dealtGoals(test);
		expect(test.fact("goals.texts")).toEqual(Object.fromEntries(dealtGoals(test).map((entry) => [entry.agent, entry.text])));
		expect(Value.Check(Type.Record(Type.String(), Type.String()), test.fact("goals.texts"))).toBe(true);
		expect(test.fact("goals.running")).toHaveLength(6);
		expect(await script(test, "held", { resident: "A01" })).toBe(JSON.stringify({ act: 8, kind: first?.goal.kind, target: first !== undefined && "target" in first.goal ? first.goal.target : undefined, text: first?.text }));
		const seen: string[] = [];
		await test.playTicks((activation) => {
			if (activation.actor === "resident:A01") seen.push(activation.inputs.filter((note) => note.kind === "status").map((note) => note.text).join(""));
			return Promise.resolve();
		}, 1);
		expect(seen).toEqual([`0 points · your goal: ${first?.text ?? ""} (+15)`]);
		await script(test, "endAct", { fromLevel: 8 });
		expect([test.fact("goals.texts"), test.fact("goals.running"), await script(test, "held", { resident: "A01" })]).toEqual([{}, [], "null"]);
	});
});

describe("the goal check of a Director's note", () => {
	it("refuses a note that gives a goal away to another reader in the old words, at stage rule, and lets the holder read its own", async () => {
		const test = testKernel(gameOf());
		await script(test, "startAct", { fromLevel: 8 });
		const holder = dealtGoals(test).find((entry) => entry.goal.kind === "protect");
		const target = holder !== undefined && "target" in holder.goal ? holder.goal.target : "";
		const reader = ["A01", "A02", "A03"].find((agent) => agent !== holder?.agent && agent !== target) ?? "A04";
		const text = `${holder?.agent ?? ""} will protect ${target} whatever it costs.`;
		expect(await script(test, "notify", { agent: reader, text })).toBe(`PRIVATE_BLOCKED: the text gives away the core motive or the secret goal of ${holder?.agent ?? ""}; use them only in a note to that resident`);
		expect(await script(test, "notify", { agent: holder?.agent ?? "", text })).toMatch(/^delivered to /);
		expect(await script(test, "boardNote", { text: "Door 9 opens at minute 5." })).toMatch(/^posted as/);
		const refused = test.kernel.log.all().filter((event) => event.type === "tool_refused");
		expect(refused.map((event) => JSON.stringify(event.payload))).toEqual([expect.stringContaining('"stage":"rule"')]);
	});
});

describe("standing", () => {
	it("documents its options and agrees with its package", () => {
		expect(checkOptionsDocumented(goals)).toEqual([]);
		expect(checkPackage(goals, JSON.parse(readFileSync(resolve(import.meta.dirname, "..", "package.json"), "utf8")))).toEqual([]);
	});

	it("resumes equal at every boundary through the deal, an exile and the resolution", async () => {
		expect(await checkResumeEveryBoundary(gameOf({ auto: true }), () => ({ resident: idleDriver }))).toEqual([]);
		const played = testKernel(gameOf({ auto: true }));
		await played.playTicks(idleDriver, 4);
		expect(resolvedGoals(played)).toHaveLength(6);
	});
});
