/** `--resident-model`: flag parsing, planning against the roster and the registry, and routing by scripted sources (offline). */
import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createProviderRegistry, ModelConfigError, ScriptedModelSource, say, settingsFromStory, type ModelBinding, type ModelSettings, type ModelSource } from "@swarmtales/models";
import { parseStartArgs, UsageError } from "../../apps/cli/src/args.ts";
import { playCoreStory } from "../../apps/cli/src/host/core-play.ts";
import { planResidentModels, residentModelSource } from "../../apps/cli/src/host/resident-models.ts";
import { findCoreStory } from "../../stories/index.ts";

const ROSTER = ["A01", "A02", "A03", "A04", "A05", "A06"];
const registry = createProviderRegistry();
const base: ModelSettings = { provider: "anthropic", modelId: "claude-haiku-5-5" };
const keys = { ARENA_ANTHROPIC_API_KEY: "k", OPENROUTER_API_KEY: "k" };

describe("--resident-model parsing", () => {
	it("splits ids at the first = and the model at the first /", () => {
		const args = parseStartArgs(["--resident-model", "A04,A05,A06=openrouter/google/gemma-4-26b-a4b-it", "--resident-model", "A01=anthropic/haiku"]);
		expect(args.residentModels).toEqual([
			{ residents: ["A04", "A05", "A06"], provider: "openrouter", model: "google/gemma-4-26b-a4b-it" },
			{ residents: ["A01"], provider: "anthropic", model: "haiku" },
		]);
		expect(parseStartArgs([]).residentModels).toBeUndefined();
	});

	it("refuses malformed values and a resident named twice", () => {
		for (const bad of ["A04", "A04=openrouter", "=openrouter/x", "A04,=openrouter/x", "A04=/x", "A04=openrouter/"]) expect(() => parseStartArgs(["--resident-model", bad]), bad).toThrow(UsageError);
		expect(() => parseStartArgs(["--resident-model", "A04=anthropic/haiku", "--resident-model", "A04,A05=openrouter/x"])).toThrow(/A04 twice/);
	});
});

describe("planning and routing", () => {
	const flags = parseStartArgs(["--resident-model", "A04,A05,A06=anthropic/haiku", "--resident-model", "A01=openrouter/google/gemma-4-26b-a4b-it"]).residentModels ?? [];

	it("resolves aliases and keeps the model id after the first slash", () => {
		const plan = planResidentModels(flags, ROSTER, registry, base, keys);
		expect(plan.overrides.get("A04")).toEqual({ provider: "anthropic", modelId: "claude-haiku-5-5" });
		expect(plan.overrides.get("A01")).toMatchObject({ provider: "openrouter", modelId: "google/gemma-4-26b-a4b-it" });
		expect(plan.overrides.has("A02")).toBe(false);
	});

	it("refuses an unknown resident, an unknown provider and a missing key of any provider used", () => {
		expect(() => planResidentModels(parseStartArgs(["--resident-model", "A09=anthropic/haiku"]).residentModels ?? [], ROSTER, registry, base, keys)).toThrow(/unknown resident A09/);
		expect(() => planResidentModels(parseStartArgs(["--resident-model", "A01=nowhere/x"]).residentModels ?? [], ROSTER, registry, base, keys)).toThrow(/Unknown provider "nowhere"/);
		expect(() => planResidentModels(flags, ROSTER, registry, base, { ARENA_ANTHROPIC_API_KEY: "k" })).toThrow(/OPENROUTER_API_KEY/);
		expect(() => planResidentModels(flags, ROSTER, registry, base, { OPENROUTER_API_KEY: "k" })).toThrow(ModelConfigError);
	});

	it("routes each resident to the source of its settings, one source per distinct model", () => {
		const plan = planResidentModels(flags, ROSTER, registry, base, keys);
		const created: string[] = [];
		const bound: string[] = [];
		const create = (settings: ModelSettings): ModelSource => {
			const label = `${settings.provider}/${settings.modelId ?? "-"}`;
			created.push(label);
			return { bind: (agent, limits): ModelBinding => { bound.push(`${agent}:${label}`); return new ScriptedModelSource({ [agent]: [say()] }).bind(agent, limits); } };
		};
		const source = residentModelSource(ROSTER, base, plan, create);
		for (const id of ROSTER) source.bind(id, { maxOutputTokens: 100, timeoutMs: 1000 });
		expect(created.sort()).toEqual(["anthropic/claude-haiku-5-5", "openrouter/google/gemma-4-26b-a4b-it"]);
		expect(bound).toEqual(["A01:openrouter/google/gemma-4-26b-a4b-it", "A02:anthropic/claude-haiku-5-5", "A03:anthropic/claude-haiku-5-5", "A04:anthropic/claude-haiku-5-5", "A05:anthropic/claude-haiku-5-5", "A06:anthropic/claude-haiku-5-5"]);
		expect(settingsFromStory({ provider: "scripted" }).provider).toBe("scripted");
	});
});

describe("the core play path", () => {
	const entry = findCoreStory("tictactoe-teams");

	it("refuses an unknown resident or a missing key before the run directory exists", async () => {
		if (entry === undefined) throw new Error("tictactoe-teams is not registered");
		const runs = mkdtempSync(join(tmpdir(), "swt-rm-"));
		try {
			const errors: string[] = [];
			const io = { out: () => undefined, env: {} };
			const run = (flag: string) => playCoreStory(parseStartArgs(["--story", "tictactoe-teams", "--provider", "scripted", "--resident-model", flag, "--runs", runs]), "tictactoe-teams", entry, io, (text) => errors.push(text));
			expect(await run("A09=scripted/x")).toBe(1);
			expect(await run("A04=openrouter/google/gemma-4-26b-a4b-it")).toBe(1);
			expect(errors[0]).toContain("unknown resident A09");
			expect(errors[1]).toContain("OPENROUTER_API_KEY");
		} finally {
			rmSync(runs, { recursive: true, force: true });
		}
	});

	it("records the per-resident models in the run metadata, the genesis and usage.json", async () => {
		if (entry === undefined) throw new Error("tictactoe-teams is not registered");
		const runs = mkdtempSync(join(tmpdir(), "swt-rm-"));
		try {
			const errors: string[] = [];
			const code = await playCoreStory(parseStartArgs(["--story", "tictactoe-teams", "--provider", "scripted", "--resident-model", "A04,A05,A06=scripted/other", "--minutes", "2", "--runs", runs]), "tictactoe-teams", entry, { out: () => undefined, env: {} }, (text) => errors.push(text));
			expect(errors).toEqual([]);
			expect(code).toBe(0);
			const directory = join(runs, "run-001");
			const meta: unknown = JSON.parse(readFileSync(join(directory, "000-run.json"), "utf8"));
			expect(meta).toMatchObject({ agents: ROSTER.map((agent) => ({ agent, provider: "scripted" })) });
			const usage: unknown = JSON.parse(readFileSync(join(directory, "usage.json"), "utf8"));
			expect(usage).toMatchObject({ models: { residents: "scripted/-", A04: "scripted/-", A05: "scripted/-", A06: "scripted/-" } });
			const genesis: unknown = JSON.parse(readFileSync(join(directory, "events.jsonl"), "utf8").split("\n")[0] ?? "null");
			expect(JSON.stringify(genesis)).toBeDefined();
		} finally {
			rmSync(runs, { recursive: true, force: true });
		}
	});
});
