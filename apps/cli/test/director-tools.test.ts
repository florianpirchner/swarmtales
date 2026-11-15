// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * A Director that acts by tool use (specification of M5, sections 4.4 and 4.7, issue 07): its look is a resident
 * session of the models package in a live run and the fake driver in a fake run; its calls replay and resume equal;
 * `--director-model` replaces the model of one Director, and the manifest names it. No request leaves the process.
 */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { RunManifestSchema, type Kernel } from "@swarmtales/contracts";
import { createDirectorDrivers, DIRECTOR_RECORDS } from "@swarmtales/engine";
import { act, createCostMeter, createToolDirector, DIRECTOR_MODEL_RECORDS, RESIDENT_RECORDS, say, scriptedAsker, scriptedSource, type ModelSource, type ScriptStep } from "@swarmtales/models";
import { checkReplay, checkResumeEveryBoundary, fakeDriver } from "@swarmtales/testkit";
import { Parse } from "typebox/value";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { directorModelsOf } from "../src/flags.ts";
import { runLive, type LiveInput } from "../src/live.ts";
import type { CliIo } from "../src/main.ts";
import { resolveFile } from "../src/run.ts";
import look from "./fixtures/look.ts";
import { cli, eventsOf } from "./support.ts";

const GAME = fileURLToPath(new URL("./fixtures/look.ts", import.meta.url));
const CRIER = "director:crier";
const RECORDS = [RESIDENT_RECORDS, DIRECTOR_RECORDS, DIRECTOR_MODEL_RECORDS];
// Every look of the crier: a post, then an answer without a tool call, which ends the look.
const looks = (count: number): readonly ScriptStep[] => Array.from({ length: 2 * count }, (_, index) => (index % 2 === 0 ? act({ name: "post", args: { line: "heard" } }) : say("done")));

let cwd = "";
let swt: ReturnType<typeof cli>;
let fetched = vi.fn();
beforeAll(() => {
	cwd = mkdtempSync(join(tmpdir(), "swt-look-"));
	swt = cli(cwd);
});
afterAll(() => {
	rmSync(cwd, { recursive: true, force: true });
});
beforeEach(() => {
	fetched = vi.fn(() => Promise.reject(new TypeError("a test reached the global fetch")));
	vi.stubGlobal("fetch", fetched);
});
afterEach(() => {
	expect(fetched).not.toHaveBeenCalled();
	vi.unstubAllGlobals();
});

async function live(more: Partial<LiveInput>, crier: readonly ScriptStep[] = looks(10)) {
	const io: CliIo = { cwd, now: () => new Date("2026-11-14T12:00:00.000Z"), out: () => undefined, err: () => undefined };
	const source = scriptedSource({ "resident:A01": Array.from({ length: 5 }, (_, index) => act({ name: "guess", args: { value: index + 1 } })), "resident:A02": Array.from({ length: 5 }, () => say()), [CRIER]: crier });
	return runLive({ file: GAME, seed: undefined, out: "live", json: false, provider: "anthropic", budget: 1, purpose: "smoke", replicate: 0, env: { ARENA_ANTHROPIC_API_KEY: `sk-${"k".repeat(37)}` }, source, ...more }, io);
}

// The scripted provider keeps a prompt cache of its own per binding, and a resumed run binds again: its usage is set to no cache here.
function uncached(source: ModelSource): ModelSource {
	return {
		bind: (actor, limits) => {
			const binding = source.bind(actor, limits);
			return {
				...binding,
				streamFn: async (model, context, options) => {
					const stream = await binding.streamFn(model, context, options);
					const push = stream.push.bind(stream);
					stream.push = (event) => {
						push(event.type === "done" ? { ...event, message: { ...event.message, usage: { ...event.message.usage, input: 1, cacheRead: 0, cacheWrite: 0 } } } : event);
					};
					return stream;
				},
			};
		},
	};
}

const manifestOf =(run: string) => Parse(RunManifestSchema, JSON.parse(readFileSync(join(cwd, run, "manifest.json"), "utf8")));
const crierLines = (run: string): readonly (readonly [string, unknown])[] => eventsOf(join(cwd, run)).flatMap((event): (readonly [string, unknown])[] => (event.actor === CRIER && ["tool_called", "request", "asked"].includes(event.type) ? [[event.type, event.payload]] : []));

describe("a Director that acts by tool use", () => {
	it("looks in a live run with the open tools of its grant, without `take`, until it calls none, and its run replays equal", async () => {
		const played = await live({});
		expect([played.code, played.issues]).toEqual([0, []]);
		const lines = crierLines(played.run ?? "");
		// The first look: it takes its firing, then the request with the look's input and its two tools, the post, the request that answers it.
		expect(lines.slice(0, 5)).toEqual([["tool_called", { as: "take", params: {} }], ["asked", { firings: [1] }], ["request", { inputs: ["1 guesses at tick 0"], tools: ["post", "hush"], messages: 0 }], ["tool_called", { as: "post", params: { line: "heard" } }], ["request", { inputs: [], tools: ["post", "hush"], messages: 3 }]]);
		expect(lines.filter(([type]) => type === "asked").length).toBe(3);
		expect(await swt("replay", played.run ?? "", "--game", GAME)).toMatchObject({ code: 0, out: [expect.stringMatching(/^equal, \d+ lines$/)] });
	});

	it("stops a look at its `maxRequests`, and sends nothing past its `maxCostUsd`", async () => {
		const always = Array.from({ length: 20 }, () => act({ name: "hush" }));
		const played = await live({ out: "busy" }, always);
		const perLook = crierLines(played.run ?? "").map(([type]) => type).join(" ").split("asked").slice(1).map((part) => part.split("request").length - 1);
		expect([played.code, perLook]).toEqual([0, [3, 3, 3]]);
		const game = (await resolveFile({ file: GAME, seed: undefined }, { cwd })).game;
		const meter = createCostMeter(1);
		meter.add(CRIER, { input: 1, output: 1, cacheRead: 0, cacheWrite: 0, costUsd: 0.5 });
		const step = createToolDirector({ kernel: { openTools: () => ["post"] }, source: scriptedSource({}), settings: () => ({ thinking: "off", maxOutputTokens: 100 }), limits: () => ({ maxCostUsd: 0.5 }), meter, redact: (text) => text });
		const recorded = vi.fn();
		await step({ actor: CRIER, tick: 0, basis: 0, detail: {}, inputs: [], tools: [], call: () => Promise.reject(new TypeError("no call")), record: recorded }, { system: "s", input: "i" });
		expect(recorded).not.toHaveBeenCalled();
		expect(game.directors?.map((director) => director.definition.acts)).toEqual(["tools", "answer"]);
	});

	it("replays and resumes equal at every boundary with a scripted look, and plays its tools from their samples in a fake run", async () => {
		const { game } = await resolveFile({ file: GAME, seed: undefined }, { cwd }, RECORDS);
		const drivers = (kernel: Kernel) => {
			const step = createToolDirector({ kernel, source: uncached(scriptedSource({ [CRIER]: looks(10) })), settings: () => ({ thinking: "off", maxOutputTokens: 100 }), limits: (actor) => game.directors?.find((director) => director.actor === actor)?.limits ?? {}, meter: createCostMeter(1), redact: (text) => text, hidden: ["take"] });
			return { resident: fakeDriver(kernel, 4), ...createDirectorDrivers({ game, ask: scriptedAsker({}), look: step }) };
		};
		expect(await checkReplay(look, drivers, { records: RECORDS })).toEqual([]);
		expect(await checkResumeEveryBoundary(look, drivers, { records: RECORDS })).toEqual([]);
		const fake = await swt("run", GAME, "--fake", "--out", "fake");
		// `take`, then the sampled `post` until the fake driver's limit; `hush` has no sample.
		const calls = crierLines("fake/look-001").flatMap(([type, payload]) => (type === "tool_called" && typeof payload === "object" && payload !== null && "as" in payload ? [payload.as] : []));
		expect([fake.code, [...new Set(calls)], calls.filter((as) => as === "post").length > 0]).toEqual([0, ["take", "post"], true]);
	});

	it("replaces the model of one Director with `--director-model`, names it in the manifest, and refuses a name of no Director (`SWT-C026`)", async () => {
		expect(directorModelsOf(["gamemaker=anthropic/claude-haiku-5-5:medium:16000", "x=openrouter/a/b:free", "judge=anthropic/haiku:low"])).toEqual({ gamemaker: { id: "anthropic/claude-haiku-5-5", thinking: "medium", maxOutputTokens: 16000 }, x: { id: "openrouter/a/b:free" }, judge: { id: "anthropic/haiku", thinking: "low" } });
		expect(() => directorModelsOf(["gamemaker"])).toThrow("--director-model gamemaker");
		const models = (run: string) => Object.fromEntries(manifestOf(run).actors.flatMap((actor) => (actor.model === undefined ? [] : [[actor.id, [actor.model.requestedId, actor.model.params.thinking, actor.model.params.maxOutputTokens]]])));
		const plain = await live({ out: "plain" });
		expect(models(plain.run ?? "")).toMatchObject({ "resident:A01": ["claude-haiku-5-5", "medium", 4000], [CRIER]: ["claude-haiku-5-5", "medium", 4000], "director:judge": ["haiku", "medium", 900] });
		const replaced = await live({ out: "replaced", directorModels: directorModelsOf(["judge=anthropic/claude-haiku-5-5:low:16000"]) });
		expect([replaced.code, models(replaced.run ?? "")["director:judge"]]).toEqual([0, ["claude-haiku-5-5", "low", 16000]]);
		const wrong = await live({ out: "wrong", directorModels: { gamemaker: { id: "anthropic/haiku" } } });
		expect([wrong.code, wrong.issues.map((issue) => issue.code), wrong.run]).toEqual([1, ["SWT-C026"], undefined]);
	});
});
