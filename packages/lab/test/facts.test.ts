// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The facts of a run: a `guess-number` run folder written by the run log's own writer is read into its facts; an
 * unfinished run and a run that fails `verifyRun` are refused; a thing that was not measured is "absent", not 0.
 * The log is written out by hand in the shape the kernel writes it: the lab has no dependency on the testkit.
 */
import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { jsonHash } from "@swarmtales/chain";
import { type ActorId, actorId, type Envelope, type MetricDefinition, type RunManifest, SwtError } from "@swarmtales/contracts";
import { openRunFolder, verifyRun } from "@swarmtales/runlog";
import { afterEach, describe, expect, it } from "vitest";
import { factsOf, readRun } from "../src/index.ts";

const HASH = "a".repeat(64);
const GAME = { id: "guess" };
const [A01, A02] = [actorId("resident", "A01"), actorId("resident", "A02")];
const PLUGIN = "@swarmtales/testkit/guess-number";
const DRIVER = "@swarmtales/models/resident";
const MANIFEST: RunManifest = {
	format: "swarmtales-run",
	version: 1,
	run: { id: "guess-001", startedAt: "2026-11-14T10:00:00.000Z", purpose: "smoke" },
	game: { id: "guess", hash: jsonHash(GAME), params: {} },
	kernel: { revision: 3, version: "0.0.0", node: "26.13.0" },
	scheduler: { id: "turns", revision: 1, determinism: "seeded", options: {}, optionsHash: HASH },
	plugins: [{ id: "guess-number", package: "@swarmtales/testkit", version: "0.0.0", optionsHash: HASH }, { id: "roster", package: "@swarmtales/mechanic-roster", version: "0.0.0", optionsHash: HASH }],
	actors: [A01, A02].map((id) => ({ id, kind: "resident", grant: "resident", driver: "scripted", textHashes: {} })),
	texts: {},
	seed: 7,
	replicate: 2,
	limits: { maxTicks: 30 },
	naming: 1,
	log: { format: "swarmtales.events", version: 1 },
};

/** Builds a log line by line: seq is the line number, and an event is caused by the line before it. */
function log(lines: readonly (readonly [tick: number, source: string, type: string, actor: ActorId | "kernel", payload: unknown])[]): readonly Envelope[] {
	return lines.map(([tick, source, type, actor, payload], index) => ({ seq: index + 1, tick, source, type, actor, ...(index === 0 ? {} : { causedBy: index }), payload }));
}
const guess = (tick: number, actor: ActorId, value: number, hint: string) =>
	[
		[tick, "kernel", "activation_opened", actor, { actor, inputs: [] }],
		[tick, "kernel", "tool_called", actor, { as: "guess", params: { value } }],
		[tick, PLUGIN, "guessed", actor, { by: actor.slice(-3), value, hint }],
		[tick, "kernel", "tool_result", actor, { as: "guess", reply: `${value} is ${hint}.`, endsTurn: true }],
		[tick, "kernel", "activation_closed", actor, { actor, calls: 1, outcome: "acted" }],
	] as const;
/** Two ticks of `guess-number`: A02 sends a wrong argument once, A01 finds the secret in the second tick. */
const GUESSES = [
	[0, "kernel", "run_started", "kernel", { seed: 7 }],
	[0, "kernel", "tick_started", "kernel", {}],
	...guess(0, A01, 2, "low"),
	[0, "kernel", "activation_opened", A02, { actor: A02, inputs: [] }],
	[0, "kernel", "tool_called", A02, { as: "guess", params: { value: "three" } }],
	[0, "kernel", "tool_refused", A02, { as: "guess", stage: "parse", code: "INVALID_ARGUMENTS" }],
	[0, "kernel", "activation_closed", A02, { actor: A02, calls: 1, outcome: "acted" }],
	[0, "kernel", "tick_ended", "kernel", {}],
	[1, "kernel", "tick_started", "kernel", {}],
	...guess(1, A01, 3, "right"),
	[1, "kernel", "tick_ended", "kernel", {}],
] as const;
const ENDED = [[2, "kernel", "limit_reached", "kernel", { limit: "guess-number.solved", reason: "A01 found the secret" }], [2, "kernel", "run_ended", "kernel", { reason: "limit" }]] as const;
const EVENTS = log([...GUESSES, ...ENDED]);

const hints = (hint: string): MetricDefinition["compute"] => (events) => {
	const found = events.filter((event) => typeof event.payload === "object" && event.payload !== null && Reflect.get(event.payload, "hint") === hint);
	return events.length === 0 ? undefined : found.length;
};
const METRICS: Readonly<Record<string, readonly MetricDefinition[]>> = {
	"guess-number": [
		{ id: "guesses", title: "Guesses made", reads: ["guessed"], compute: (events) => (events.length === 0 ? undefined : events.length) },
		{ id: "highGuesses", title: "Guesses above the secret", reads: ["guessed"], compute: hints("high") },
		{ id: "resets", title: "Secrets drawn again", reads: ["secret_reset"], compute: (events) => (events.length === 0 ? undefined : events.length) },
	],
	"grid-game": [{ id: "moves", title: "Moves played", reads: ["move_played"], compute: (events) => events.length }],
};

const KEYS = generateKeyPairSync("ed25519");
const folders: string[] = [];
afterEach(() => {
	for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
});

/** Writes a run folder with the run log's writer; without `end` the head is signed and the run stays unfinished. */
function written(events: readonly Envelope[], manifest: RunManifest = MANIFEST, end = true): string {
	const root = mkdtempSync(join(tmpdir(), "lab-facts-"));
	folders.push(root);
	const directory = join(root, manifest.run.id);
	let clock = Date.UTC(2026, 10, 14, 10);
	const folder = openRunFolder(directory, manifest, { now: () => new Date((clock += 1000)), keys: KEYS, game: GAME, texts: {} });
	for (const event of events) folder.sink.write(event);
	if (end) folder.sink.close?.({ reason: "limit", tick: 2, limit: "guess-number.solved" });
	folder.close();
	return directory;
}
const refusal = (run: () => unknown): string => {
	try {
		run();
	} catch (error) {
		return error instanceof SwtError ? `${error.code} ${error.message}` : String(error);
	}
	return "no error";
};
const ABSENT_MODELS = Object.fromEntries(["requests", "failedRequests", "contextResets", "inputTokens", "outputTokens", "cacheReadTokens", "cacheWriteTokens", "costUsd"].map((key) => [`models.${key}`, "absent"]));

describe("readRun", () => {
	it("reads the facts of a guess-number run from its folder", () => {
		const directory = written(EVENTS);
		const facts = readRun(directory, METRICS);
		expect(facts).toEqual({
			run: "guess-001", manifestHash: jsonHash(MANIFEST), head: verifyRun(directory).head, game: "guess", seed: 7, replicate: 2,
			end: { reason: "limit", limit: "guess-number.solved", tick: 2 },
			values: {
				"run.ticks": 2, "run.activations": 3, "run.toolCalls": 3, "run.toolRefusals": 1, "run.refusals.INVALID_ARGUMENTS": 1,
				"run.noCallActivations": 0, "run.humanToolCalls": 0, "run.noCallActivations.resident:A01": 0, "run.noCallActivations.resident:A02": 0,
				...ABSENT_MODELS,
				"guess-number.guesses": 2, "guess-number.highGuesses": 0, "guess-number.resets": "absent",
			},
		});
		expect(facts.head).toMatch(/^[0-9a-f]{64}$/);
		expect(JSON.parse(readFileSync(join(directory, "events.chain.jsonl"), "utf8").split("\n")[0] ?? "")).toMatchObject({ genesis: { manifest: facts.manifestHash } });
	});

	it("names the arm of an experiment, and an end by ticks has no limit", () => {
		const manifest: RunManifest = { ...MANIFEST, experiment: { id: "open", specHash: HASH, arm: "control" } };
		const facts = readRun(written(log([...GUESSES, [2, "kernel", "run_ended", "kernel", { reason: "ticks" }]]), manifest), {});
		expect([facts.arm, facts.end]).toEqual(["control", { reason: "ticks", tick: 2 }]);
	});

	it("refuses an unfinished run", () => {
		const directory = written(log(GUESSES), MANIFEST, false);
		expect(verifyRun(directory)).toMatchObject({ ok: true, finished: false });
		expect(refusal(() => readRun(directory, METRICS))).toMatch(/^SWT-E006 .*unfinished/);
	});

	it("refuses a run that fails verifyRun: a changed line, a changed game, a missing folder", () => {
		const changed = written(EVENTS);
		const file = join(changed, "events.jsonl");
		writeFileSync(file, readFileSync(file, "utf8").replace('"value":3', '"value":1'));
		expect(refusal(() => readRun(changed, METRICS))).toMatch(/^SWT-E006 .*does not verify.*SWT-L001/);
		const game = written(EVENTS);
		writeFileSync(join(game, "game.json"), '{"id":"other"}');
		expect(refusal(() => readRun(game, METRICS))).toMatch(/^SWT-E006 .*SWT-L003 game\.json/);
		expect(refusal(() => readRun(join(game, "none"), METRICS))).toMatch(/^SWT-E006 /);
	});
});

describe("factsOf", () => {
	it("a metric without its event is absent, a true zero is 0, and a mechanic that is not loaded has no row", () => {
		const values = factsOf(MANIFEST, EVENTS, METRICS);
		expect([values["guess-number.resets"], values["guess-number.highGuesses"], "grid-game.moves" in values]).toEqual(["absent", 0, false]);
		const quiet = factsOf(MANIFEST, log([[0, "kernel", "run_started", "kernel", { seed: 7 }], [1, "kernel", "run_ended", "kernel", { reason: "ticks" }]]), METRICS);
		expect(quiet).toMatchObject({ "run.ticks": 0, "run.toolRefusals": 0, "guess-number.guesses": "absent", "guess-number.highGuesses": "absent" });
		expect(Object.keys(quiet).filter((key) => key.startsWith("run.refusals."))).toEqual([]);
		// An event of the same type from another source is not the mechanic's own, and a number that is none is absent.
		const foreign = log([[0, "@other/package/guess-number", "guessed", A01, { hint: "high" }]]);
		expect(factsOf(MANIFEST, foreign, METRICS)["guess-number.guesses"]).toBe("absent");
		expect(factsOf(MANIFEST, EVENTS, { "guess-number": [{ id: "share", title: "A share", reads: ["guessed"], compute: () => Number.NaN }] })["guess-number.share"]).toBe("absent");
	});

	it("counts and sums the records of the model driver, and gives 0 for a driver that made no request", () => {
		const usage = (input: number, costUsd: number) => ({ provider: "anthropic", model: "m", stopReason: "toolUse", input, output: 10, cacheRead: 5, cacheWrite: 1, costUsd });
		const records = log([
			[0, DRIVER, "request", A01, { inputs: [], tools: [], messages: 0 }], [0, DRIVER, "response", A01, usage(100, 0.25)],
			[0, DRIVER, "context_reset", A01, { messages: 4 }], [0, DRIVER, "request", A01, { inputs: [], tools: [], messages: 0 }], [0, DRIVER, "response", A01, usage(50, 0.5)],
			[0, DRIVER, "request", A02, { inputs: [], tools: [], messages: 0 }], [0, DRIVER, "request_failed", A02, { message: "overloaded", refusal: false }],
			[0, "kernel", "request", A02, {}],
		]);
		expect(factsOf(MANIFEST, records, {})).toMatchObject({
			"models.requests": 3, "models.failedRequests": 1, "models.contextResets": 1,
			"models.inputTokens": 150, "models.outputTokens": 20, "models.cacheReadTokens": 10, "models.cacheWriteTokens": 2, "models.costUsd": 0.75,
			"models.requests.resident:A01": 2, "models.costUsd.resident:A01": 0.75, "models.requests.resident:A02": 1, "models.costUsd.resident:A02": 0,
		});
		const model = { provider: "anthropic", requestedId: "haiku", resolvedId: "m", params: { temperature: 1, topP: "provider-default", maxOutputTokens: 1024, thinking: "off" }, pricing: "pi-ai@1" } as const;
		const driven: RunManifest = { ...MANIFEST, actors: MANIFEST.actors.map((actor) => ({ ...actor, driver: "model", model })) };
		expect(factsOf(driven, EVENTS, {})).toMatchObject({ "models.requests": 0, "models.failedRequests": 0, "models.costUsd": 0, "models.inputTokens": 0, "models.requests.resident:A02": 0, "models.costUsd.resident:A02": 0 });
		// P454: a Director's asker counts like the driver, per actor and in the run; an actor without a model that asked nothing has no key, and a run without a driver none at all.
		const warden = actorId("director", "warden");
		const asked = factsOf({ ...driven, actors: [...driven.actors.slice(0, 1), ...MANIFEST.actors.slice(1)] }, log([[0, "@swarmtales/models/director", "request", warden, {}], [0, "@swarmtales/models/director", "response", warden, usage(10, 0.125)]]), {});
		expect(asked).toMatchObject({ "models.requests": 1, "models.costUsd": 0.125, "models.requests.director:warden": 1, "models.costUsd.director:warden": 0.125, "models.requests.resident:A01": 0, "models.costUsd.resident:A01": 0 });
		expect(["models.requests.resident:A02" in asked, Object.keys(factsOf(MANIFEST, EVENTS, {})).filter((key) => key.startsWith("models.requests."))]).toEqual([false, []]);
		// A `response` that is not what the driver writes: the counts stand, the sums are not measured.
		const broken = factsOf(MANIFEST, log([[0, DRIVER, "response", A01, usage(100, 0.25)], [0, DRIVER, "response", A01, { input: "many" }]]), {});
		expect(broken).toMatchObject({ "models.requests": 0, "models.inputTokens": "absent", "models.costUsd": "absent", "models.requests.resident:A01": 0, "models.costUsd.resident:A01": "absent" });
	});

	it("A44: counts the activations that closed without a call, in the run and per actor; P452: counts the tool calls of the human", () => {
		const A03 = actorId("resident", "A03");
		const closed = (actor: ActorId, outcome: string, calls: number) => [0, "kernel", "activation_closed", actor, { actor, calls, outcome }] as const;
		const turns = log([
			closed(A01, "no-call", 0), closed(A01, "acted", 1), closed(A01, "no-call", 0), closed(A02, "acted", 2), closed(A03, "error", 0),
			// The same type from another source, and a payload without an outcome, are no idle turn of the kernel's.
			[0, PLUGIN, "activation_closed", A02, { actor: A02, calls: 0, outcome: "no-call" }], [0, "kernel", "activation_closed", A02, { actor: A02 }],
			[1, "kernel", "tool_called", "human", { as: "pause", params: {} }], [1, "kernel", "tool_called", "human", { as: "resume", params: {} }], [1, PLUGIN, "tool_called", "human", {}],
		]);
		const values = factsOf(MANIFEST, turns, {});
		expect([values["run.noCallActivations"], values["run.humanToolCalls"]]).toEqual([2, 2]);
		expect(Object.entries(values).filter(([key]) => key.startsWith("run.noCallActivations."))).toEqual([["run.noCallActivations.resident:A01", 2], ["run.noCallActivations.resident:A02", 0], ["run.noCallActivations.resident:A03", 0]]);
		// An actor that never had an activation closed has no key; a run without one counts 0.
		const quiet = factsOf(MANIFEST, log([[0, "kernel", "run_started", "kernel", { seed: 7 }]]), {});
		expect([quiet["run.noCallActivations"], quiet["run.humanToolCalls"], Object.keys(quiet).filter((key) => key.startsWith("run.noCallActivations."))]).toEqual([0, 0, []]);
	});

	it("keeps a generic key when a plugin is named like one", () => {
		const manifest: RunManifest = { ...MANIFEST, plugins: [{ id: "run", package: "@test/run", version: "0.0.0", optionsHash: HASH }] };
		expect(factsOf(manifest, EVENTS, { run: [{ id: "ticks", title: "Ticks", reads: [], compute: () => 99 }] })["run.ticks"]).toBe(2);
	});
});
