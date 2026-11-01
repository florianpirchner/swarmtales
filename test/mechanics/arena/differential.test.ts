/**
 * Differential tests of the arena against the old `Arena` (packages/engine/src/arena.ts) for the
 * paths the three goldens do not reach: each early stop (every resident done, seats decided), each
 * act brake (logged only; with a checkpoint that stops the run; with one that lets the run go on),
 * the snapshot cut (after a level, at a minute, stopping or not), the budget stop, `onNovelty` with
 * several passes and blocks (the points part of the novelty, `turn_skipped`), and a run resumed from
 * the new host's own snapshot. Each scenario plays the same plan on the old engine and on the new
 * host (differential.ts) and compares the replies, every line of the arena and of the mechanics
 * loaded on both sides in log order, the run's end reason, the arena's slice against the old
 * arena's fields, and the snapshot cut.
 */
import { describe, expect, it } from "vitest";
import { act, at, defineStory, level, puzzle, team } from "@swarmtales/sdk";
import type { AnyStory, LevelDefinition, ToolName } from "@swarmtales/contracts";
import type { PlannedCall } from "@swarmtales/testkit";
import { tinyStory, type TinyStoryOptions } from "../../helpers/stories.ts";
import { MARKS } from "../channels/differential-support.ts";
import { arenaSlice, compared, FILE, oldArenaFields, playBoth, playNew, type NewOptions, type NewPlayed, type OldPlayed, type Spec } from "./differential.ts";

const TOOLS: readonly ToolName[] = ["getStatus", "submitSolution", "sendDM", "postBoard", "readBoard", "transferPoints"];

function levels(count: number): readonly LevelDefinition[] {
	return Array.from({ length: count }, (_unused, index) =>
		level(index + 1, { title: `Door ${String(index + 1)}`, puzzle: puzzle.fragments([6, 8]), team: team.solo(), reward: 2, tools: [...TOOLS], task: "Password {fragment}." }),
	);
}

/** A tiny city with `count` solo doors, two acts (the first with a brake when `maxMinutes` is set) and optional director rules. */
function storyOf(options: { readonly count: number; readonly agents: number; readonly maxMinutes?: number; readonly director?: TinyStoryOptions["director"]; readonly survivors?: number }): AnyStory {
	const base = tinyStory({ agents: options.agents, levels: levels(options.count), ...(options.director === undefined ? {} : { director: options.director }) });
	return defineStory({
		...base,
		run: { ...base.run, survivors: options.survivors ?? 1 },
		// The real marks need a price list (the marks stand-in has no task line).
		rules: { ...base.rules, marks: MARKS },
		acts: [{ title: "Act I", fromLevel: 1, ...(options.maxMinutes === undefined ? {} : { maxMinutes: options.maxMinutes }) }, ...(options.count >= 3 ? [{ title: "Act II", fromLevel: 3 }] : [])],
	});
}

const call = (tool: string, params: Record<string, string | number | boolean> = {}): PlannedCall => ({ tool, params });
const solve = (level: number, code: string): PlannedCall => call("submitSolution", { level, code });

function wrongOf(code: string): string {
	return (code.startsWith("A") ? "B" : "A") + code.slice(1);
}

/** A resident climbs one door every other minute from `from` on, up to `upTo`. */
function climb(from: number, upTo: number) {
	return (minute: number, codeOf: (level: number) => string): readonly PlannedCall[] => {
		const steps = minute - from;
		if (steps < 0 || steps % 2 !== 0) return [];
		const door = steps / 2 + 1;
		return door <= upTo ? [solve(door, codeOf(door))] : [];
	};
}

function endOf(side: { readonly lines: readonly Record<string, unknown>[] }): Record<string, unknown> | undefined {
	return side.lines.filter((line) => line.type === "run_end").at(-1);
}

function objectOf(value: unknown): object {
	if (typeof value !== "object" || value === null) throw new Error("a log line is an object");
	return value;
}

/** A side's compared lines with `run_end`'s minute taken out (see `endShift`). */
function withoutEndMinute(lines: readonly string[]): readonly string[] {
	return lines.map((line) => (line.startsWith('{"type":"run_end"') ? JSON.stringify(Object.fromEntries(Object.entries(objectOf(JSON.parse(line))).filter(([name]) => name !== "minute"))) : line));
}

/**
 * Plays a spec on both sides and compares everything; returns both. `endShift` is the known core
 * divergence of a run that stops at a minute's start (the stop limit) or by `host.stop` between
 * minutes: the host writes `run_end` one minute later than the old `#nextMinute` (request 1 in
 * docs/design/step18-requests-A1.md); the shift itself is asserted, every other field stays exact.
 */
async function compare(spec: Spec, options: NewOptions & { readonly endShift?: number } = {}): Promise<{ readonly old: OldPlayed; readonly fresh: NewPlayed }> {
	const { old, fresh } = await playBoth(spec, options);
	expect([...fresh.replies.keys()].sort()).toEqual([...old.replies.keys()].sort());
	for (const [where, replies] of old.replies) expect(fresh.replies.get(where), where).toEqual(replies);
	const shift = options.endShift ?? 0;
	expect(Number(endOf(fresh)?.minute)).toBe(Number(endOf(old)?.minute) + shift);
	if (shift === 0) expect(compared(fresh)).toEqual(compared(old));
	else expect(withoutEndMinute(compared(fresh))).toEqual(withoutEndMinute(compared(old)));
	expect(JSON.stringify(arenaSlice(fresh.host))).toBe(JSON.stringify(oldArenaFields(old.arena)));
	return { old, fresh };
}

describe("the arena against the old Arena: the early stops", () => {
	it("stops once every resident has passed the last level (stopWhenDone), at the next minute's start", async () => {
		const story = storyOf({ count: 2, agents: 3 });
		const spec: Spec = {
			story,
			agents: 3,
			minutes: 12,
			tools: TOOLS,
			settings: { stopWhenDone: true },
			plan: (agent, minute, codeOf) => climb(agent === "A03" ? 3 : 1, 2)(minute, (door) => codeOf(agent, door)),
		};
		const { old } = await compare(spec, { endShift: 1 });
		expect(endOf(old)?.reason).toBe("every competitor has passed the last level");
		// The run ended at the start of minute 6, before its round_start (A03 passed door 2 at minute 5).
		expect(old.lines.filter((line) => line.type === "round_start").map((line) => line.round)).toEqual([1, 2, 3, 4, 5, 6]);
		expect(endOf(old)?.minute).toBe(6);
	}, 60_000);

	it("stops once the seats are decided (stopWhenSeatsDecided)", async () => {
		const story = storyOf({ count: 4, agents: 3 });
		const spec: Spec = {
			story,
			agents: 3,
			minutes: 12,
			tools: TOOLS,
			settings: { stopWhenSeatsDecided: true },
			plan: (agent, minute, codeOf) => {
				if (agent === "A01") return climb(1, 4)(minute, (door) => codeOf(agent, door));
				return minute === 1 ? [solve(1, wrongOf(codeOf(agent, 1)))] : [];
			},
		};
		const { old } = await compare(spec, { endShift: 1 });
		expect(endOf(old)?.reason).toBe("seats decided");
	}, 60_000);

	it("plays to the last minute when nothing stops it, with the last minute's stop check (no reason)", async () => {
		const story = storyOf({ count: 4, agents: 2 });
		const spec: Spec = { story, agents: 2, minutes: 5, tools: TOOLS, settings: { stopWhenDone: true }, plan: (agent, minute, codeOf) => climb(1, 4)(minute, (door) => codeOf(agent, door)) };
		const { old } = await compare(spec);
		expect(endOf(old)?.reason).toBeUndefined();
	}, 60_000);

	it("names the stop of the last minute (the old #nextMinute after the clock ran out)", async () => {
		const story = storyOf({ count: 2, agents: 2 });
		const spec: Spec = { story, agents: 2, minutes: 4, tools: TOOLS, settings: { stopWhenDone: true }, plan: (agent, minute, codeOf) => climb(1, 2)(minute, (door) => codeOf(agent, door)) };
		const { old } = await compare(spec);
		expect(endOf(old)?.reason).toBe("every competitor has passed the last level");
		expect(old.lines.filter((line) => line.type === "round_start")).toHaveLength(4);
	}, 60_000);
});

describe("the arena against the old Arena: the act brakes and the snapshot cut", () => {
	/** A01 and A02 climb, A03 stays at door 1: Act I (doors 1-2) brakes after 4 minutes. */
	const stuck = (agent: string, minute: number, codeOf: (agent: string, level: number) => string): readonly PlannedCall[] =>
		agent === "A03" ? [] : climb(1, 4)(minute, (door) => codeOf(agent, door));

	it("logs the brake once, without a snapshot, and the run goes on", async () => {
		const spec: Spec = { story: storyOf({ count: 4, agents: 3, maxMinutes: 4 }), agents: 3, minutes: 9, tools: TOOLS, plan: stuck };
		const { old } = await compare(spec, { resumeAfter: 5 });
		const brakes = old.lines.filter((line) => line.type === "act_brake");
		expect(brakes).toMatchObject([{ act: "Act I", fromLevel: 1, toLevel: 2, startedAt: 0, maxMinutes: 4, behind: [{ agent: "A03", level: 1 }], minute: 3 }]);
		expect(brakes[0]?.snapshot).toBeUndefined();
	}, 60_000);

	it("writes the checkpoint at the brake and stops there (snapshot after the act's last level)", async () => {
		const spec: Spec = { story: storyOf({ count: 4, agents: 3, maxMinutes: 4 }), agents: 3, minutes: 9, tools: TOOLS, plan: stuck, settings: { snapshot: { afterLevel: 2, stop: true } } };
		const { old, fresh } = await compare(spec, { endShift: 1 });
		expect(old.lines.filter((line) => line.type === "act_brake")).toMatchObject([{ snapshot: true, minute: 3 }]);
		expect(endOf(old)?.reason).toBe(`the brake of Act I fired after 4 minutes; snapshot after level 2 written to ${FILE}; stopped there`);
		expect(endOf(fresh)?.reason).toBe(endOf(old)?.reason);
		// The old file keeps the brake's act, minute, maxMinutes and behind (`SnapshotBrake`); the cut holds the old in-memory `ActBrake`.
		expect(fresh.cut).toMatchObject({ round: old.taken?.round, minute: old.taken?.minute, label: "after level 2", stop: true, brake: old.taken?.brake });
		expect(fresh.cut).toMatchObject({ brake: { fromLevel: 1, toLevel: 2, startedAt: 0 } });
		// The new host's snapshot sits after the old one's minute and holds the released door.
		expect(fresh.taken?.minute).toBe((old.taken?.minute ?? -1) + 1);
		expect(fresh.taken?.mechanics.progression?.data).toMatchObject({ door: 2, doorReleased: true });
	}, 60_000);

	it("lets the run go on after a checkpoint at the brake (the door opens at the next minute)", async () => {
		const spec: Spec = { story: storyOf({ count: 4, agents: 3, maxMinutes: 4 }), agents: 3, minutes: 9, tools: TOOLS, plan: stuck, settings: { snapshot: { afterLevel: 2, stop: false } } };
		const { old, fresh } = await compare(spec);
		expect(endOf(old)?.reason).toBeUndefined();
		expect(old.lines.some((line) => line.type === "level_up" && line.to === 3)).toBe(true);
		expect(fresh.cut).toMatchObject({ label: "after level 2", stop: false, brake: { act: "Act I" } });
	}, 60_000);

	it("takes the snapshot once everyone passed the level and stops there", async () => {
		const spec: Spec = { story: storyOf({ count: 4, agents: 2 }), agents: 2, minutes: 9, tools: TOOLS, plan: (agent, minute, codeOf) => climb(agent === "A01" ? 1 : 3, 1)(minute, (door) => codeOf(agent, door)), settings: { snapshot: { afterLevel: 1, stop: true } } };
		const { old, fresh } = await compare(spec, { endShift: 1 });
		expect(endOf(old)?.reason).toBe(`snapshot after level 1 written to ${FILE}; stopped there`);
		expect(fresh.cut).toEqual({ round: old.taken?.round, minute: old.taken?.minute, label: "after level 1", stop: true });
	}, 60_000);

	it("takes the snapshot at a minute and plays on", async () => {
		const spec: Spec = { story: storyOf({ count: 4, agents: 2 }), agents: 2, minutes: 8, tools: TOOLS, plan: (agent, minute, codeOf) => climb(1, 4)(minute, (door) => codeOf(agent, door)), settings: { snapshot: { afterLevel: 3, atMinute: 4, stop: false } } };
		const { old, fresh } = await compare(spec);
		expect(endOf(old)?.reason).toBeUndefined();
		expect(fresh.cut).toEqual({ round: old.taken?.round, minute: old.taken?.minute, label: "at minute 4", stop: false });
	}, 60_000);
});

describe("the arena against the old Arena: the budget", () => {
	const plan = (agent: string, minute: number, codeOf: (agent: string, level: number) => string): readonly PlannedCall[] => climb(1, 4)(minute, (door) => codeOf(agent, door));

	it("stops in the last minute once this run's spend exceeds the budget, after the block that spent it", async () => {
		// Three residents, 0.25 a request: the 11th request (minute 3, block 2) passes 2.5 USD.
		const spec: Spec = { story: storyOf({ count: 4, agents: 3 }), agents: 3, minutes: 4, tools: TOOLS, plan, settings: { budgetUsd: 2.5, costPerRequest: 0.25 } };
		const { old } = await compare(spec);
		expect(endOf(old)?.reason).toBe("budget exceeded (2.7500 > 2.5 USD)");
	}, 60_000);

	it("stops mid-run once the spend exceeds the budget; the old run also played the next minute's start", async () => {
		const director = [at(2, [act.post("CITY", "Minute two.")], { id: "two" })];
		const spec: Spec = { story: storyOf({ count: 4, agents: 3, director }), agents: 3, minutes: 6, tools: TOOLS, plan, settings: { budgetUsd: 1, costPerRequest: 0.25 } };
		const { old, fresh } = await playBoth(spec);
		expect(endOf(old)?.reason).toBe("budget exceeded (1.2500 > 1 USD)");
		expect(endOf(fresh)?.reason).toBe(endOf(old)?.reason);
		// Known divergence (request to the integrator): after the stop the old `#nextMinute` still ran minute 2's start
		// (the director's `at(2)` post); the host ends after the minute of the breach. Everything else is the same.
		const extra = compared(old).filter((line) => !compared(fresh).includes(line));
		expect(extra.map((line): unknown => Reflect.get(objectOf(JSON.parse(line)), "type"))).toEqual(["director_action", "board_post"]);
		expect(compared(old).filter((line) => !extra.includes(line))).toEqual(compared(fresh));
	}, 60_000);
});

describe("the arena against the old Arena: novelty, passes and blocks", () => {
	/** Residents climb at different speeds, write DMs and move points; some minutes nobody has news. */
	const busy = (agent: string, minute: number, codeOf: (agent: string, level: number) => string): readonly PlannedCall[] => {
		if (agent === "A01" && minute === 0) return [solve(1, codeOf(agent, 1)), call("transferPoints", { target: "A03", amount: 2 })];
		if (agent === "A02" && minute === 1) return [call("sendDM", { target: "A04", message: "hello A04" })];
		if (agent === "A03" && minute === 2) return [solve(1, codeOf(agent, 1)), call("postBoard", { message: "door one is easy" })];
		if (agent === "A04" && minute === 4) return [call("transferPoints", { target: "A02", amount: 1 }), solve(1, codeOf(agent, 1))];
		if (agent === "A02" && minute === 6) return [call("readBoard"), solve(1, codeOf(agent, 1))];
		if (agent === "A01" && minute === 7) return [call("transferPoints", { target: "A04", amount: 3 })];
		return [];
	};

	it.each([
		{ passesPerMinute: 1, blockSize: 1 },
		{ passesPerMinute: 2, blockSize: 2 },
		{ passesPerMinute: 3, blockSize: 3 },
	])("onNovelty with $passesPerMinute passes and blocks of $blockSize", async ({ passesPerMinute, blockSize }) => {
		const spec: Spec = { story: storyOf({ count: 3, agents: 4 }), agents: 4, minutes: 10, tools: TOOLS, plan: busy, settings: { activation: "onNovelty", passesPerMinute, blockSize } };
		const { old } = await compare(spec);
		expect(old.lines.filter((line) => line.type === "turn_skipped").length).toBeGreaterThan(5);
		const resumed = await playNew(spec, (agent, level) => old.world.inspect.codeOf(agent, level), { resumeAfter: 5 });
		expect(compared(resumed)).toEqual(compared(old));
	}, 60_000);
});
