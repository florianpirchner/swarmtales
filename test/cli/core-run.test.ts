/**
 * The generic CoreStory runner (apps/cli/src/host/core-run.ts): a story with its own mechanic list is
 * played with neutral residents; a mechanic's `context-reset` turn line drops a resident's
 * conversation at a game boundary, and the snapshot of the context shows it. Offline, scripted.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import type { MechanicContext, MechanicShape } from "@swarmtales/contracts";
import { defineCoreStory, defineMechanic } from "@swarmtales/kernel";
import { MemorySink, verifyChain } from "@swarmtales/chronicle";
import { ScriptedModelSource, say } from "@swarmtales/models";
import { CONTEXT_RESET_KIND } from "@swarmtales/roles";
import { parseStartArgs } from "../../apps/cli/src/args.ts";
import { playCoreStory } from "../../apps/cli/src/host/core-play.ts";
import { composeCoreRun, coreStoryFor } from "../../apps/cli/src/host/core-run.ts";
import { coreStories, findCoreStory, type CoreStoryEntry } from "../../stories/index.ts";

const PERIOD = 2;

/** A mechanic with a game boundary: every `PERIOD` minutes a new game starts and the residents get a fresh briefing. */
const rounds = defineMechanic(
	{ id: "rounds", summary: "Games of a fixed length.", options: Type.Object({}), state: () => undefined, events: {} },
	() => ({
		hooks: {
			turnInputs: (resident: string, ctx: MechanicContext<MechanicShape>) => {
				const { minute } = ctx;
				if (minute % PERIOD === 0 && minute > 0) return [{ kind: CONTEXT_RESET_KIND, text: `Game ${String(minute / PERIOD + 1)} begins, ${resident}.` }];
				return [{ kind: "status", text: `Minute ${String(minute)}.` }];
			},
		},
	}),
);

const story = defineCoreStory({ id: "rounds-demo", seed: 3, minutes: 5, residents: 2, mechanics: [rounds.with()], grants: {} });

const entry: CoreStoryEntry = {
	title: "Rounds demo",
	story,
	model: { provider: "scripted" },
	briefing: (resident) => `You are in a test with games of two minutes, ${resident}.`,
};

const textOf = (content: unknown): string => (typeof content === "string" ? content : "");

describe("the generic CoreStory runner", () => {
	it("plays a story outside the registered city stories with the neutral prompt and drops the context at each boundary", async () => {
		const sink = new MemorySink();
		const responses = Array.from({ length: 5 }, () => say("ok"));
		const run = composeCoreRun({ entry, models: new ScriptedModelSource({ A01: responses, A02: responses }), sinks: [sink] });
		expect(run.host.mechanics).toEqual(["rounds"]);
		const prompt = run.prompts.get("A01") ?? "";
		expect(prompt).toContain("You are A01.");
		expect(prompt).toContain("You are in a test with games of two minutes, A01.");
		expect(prompt).not.toContain("city");
		expect(prompt).not.toContain("points");
		const end = await run.run();
		expect(end).toEqual({ reason: "minutes", minute: 5 });
		for (const id of ["A01", "A02"]) {
			const runner = run.runner(id);
			// Resets at minutes 2 and 4; the context holds minute 4's briefing and the turn after it only.
			expect(runner?.contextResets).toBe(2);
			const users = (runner?.snapshot() ?? []).filter((message) => message.role === "user").map((message) => textOf(message.content));
			expect(users[0]).toBe(`Game 3 begins, ${id}.`);
			expect(users.join("\n")).not.toContain("Game 2");
			expect(users.join("\n")).not.toContain("Minute 1.");
		}
		// The log keeps everything the resident was told, also across resets.
		const told = sink.events.flatMap((event) => (event.type === "turn_input" && "inputs" in event ? event.inputs : []));
		expect(told.filter((text) => text.startsWith("Game 2 begins"))).toHaveLength(2);
	});

	it("applies the run's seed, length and roster without changing the story", () => {
		const changed = coreStoryFor(story, { seed: 9, minutes: 2, agents: 4 });
		expect(changed).toMatchObject({ seed: 9, minutes: 2, residents: 4 });
		expect(story).toMatchObject({ seed: 3, minutes: 5, residents: 2 });
		expect(coreStoryFor(story)).toEqual(story);
	});

	it("keeps the registry of core stories apart from the registered city stories", () => {
		expect(findCoreStory("cityofkeys")).toBeUndefined();
		expect(Object.keys(coreStories).every((name) => findCoreStory(name) !== undefined)).toBe(true);
	});

	it("plays through the command line path: run directory, prompts, signed log, usage", async () => {
		const runs = mkdtempSync(join(tmpdir(), "swt-core-"));
		try {
			const out: string[] = [];
			const errors: string[] = [];
			const args = parseStartArgs(["--story", "rounds-demo", "--provider", "scripted", "--minutes", "4", "--runs", runs]);
			const code = await playCoreStory(args, "rounds-demo", entry, { out: (text) => out.push(text), env: {} }, (text) => errors.push(text));
			expect(errors).toEqual([]);
			expect(code).toBe(0);
			const directory = join(runs, "run-001");
			for (const file of ["000-run.json", "events.jsonl", "usage.json", join("agents", "A01.prompt.md"), join("agents", "A02.md")]) expect(existsSync(join(directory, file)), file).toBe(true);
			expect(readFileSync(join(directory, "agents", "A01.prompt.md"), "utf8")).toContain("You are A01.");
			expect(verifyChain(directory)).toMatchObject({ ok: true, genesis: { story: "rounds-demo", seed: 3 } });
			expect(out.join("\n")).toContain("rounds-demo (core)");
		} finally {
			rmSync(runs, { recursive: true, force: true });
		}
	});

	it("refuses resume and snapshots, and a missing key, with a message", async () => {
		const errors: string[] = [];
		const io = { out: () => undefined, env: {} };
		expect(await playCoreStory(parseStartArgs(["--story", "x", "--provider", "scripted", "--snapshot-at", "3"]), "x", entry, io, (text) => errors.push(text))).toBe(1);
		expect(await playCoreStory(parseStartArgs(["--story", "x", "--provider", "anthropic"]), "x", entry, io, (text) => errors.push(text))).toBe(1);
		expect(errors[0]).toContain("no snapshots or resume");
		expect(errors[1]).toContain("Missing API keys");
	});
});

describe("events of a core story outside the legacy union", () => {
	it("writes them to the signed log with their payload as it is", async () => {
		const { recordedCoreEvent } = await import("../../apps/cli/src/host/core-run.ts");
		const known = recordedCoreEvent({ type: "run_end", reason: "minutes", seq: 1, minute: 3 });
		expect(known).toMatchObject({ type: "run_end", reason: "minutes" });
		const custom = recordedCoreEvent({ type: "retro_started", game: 2, seq: 2, minute: 3 });
		expect(custom).toEqual({ type: "retro_started", game: 2, seq: 2, minute: 3 });
	});

	it("plays tictactoe-teams scripted into a verifiable run directory", async () => {
		const found = findCoreStory("tictactoe-teams");
		expect(found).toBeDefined();
		if (found === undefined) return;
		const runs = mkdtempSync(join(tmpdir(), "swt-ttt-"));
		try {
			const errors: string[] = [];
			const code = await playCoreStory(parseStartArgs(["--story", "tictactoe-teams", "--provider", "scripted", "--minutes", "3", "--runs", runs]), "tictactoe-teams", found, { out: () => undefined, env: {} }, (text) => errors.push(text));
			expect(errors).toEqual([]);
			expect(code).toBe(0);
			const directory = join(runs, "run-001");
			const types = readFileSync(join(directory, "events.jsonl"), "utf8").trim().split("\n").map((line) => JSON.parse(line).type);
			expect(types).toContain("retro_started");
			expect(verifyChain(directory)).toMatchObject({ ok: true });
		} finally {
			rmSync(runs, { recursive: true, force: true });
		}
	});
});
