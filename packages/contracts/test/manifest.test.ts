// SPDX-License-Identifier: LicenseRef-SUL-1.0
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { type RunManifest, RunManifestSchema } from "../src/run/index.ts";
import { missingDescriptions } from "./descriptions.ts";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

/** A manifest as an M1 run writes it: fake drivers, no model, no experiment. */
const sample = (): RunManifest => ({
	format: "swarmtales-run",
	version: 1,
	run: { id: "hello-001", startedAt: "2026-11-14T08:00:00.000Z", purpose: "smoke" },
	game: { id: "hello", title: "Hello Game", hash: HASH_A, params: {} },
	kernel: { revision: 3, version: "0.0.0", node: "v26.0.0" },
	scheduler: { id: "turns", revision: 1, determinism: "seeded", options: { order: "seeded" }, optionsHash: HASH_B },
	plugins: [{ id: "grid-game", package: "@swarmtales/grid-game", version: "0.0.0", optionsHash: HASH_A }],
	actors: [{ id: "resident:A01", kind: "resident", grant: "resident", driver: "fake/sample", textHashes: { briefing: HASH_A, tools: HASH_B } }],
	texts: { "grid-game/rules": HASH_A },
	seed: 7,
	replicate: 0,
	limits: { maxTicks: 40 },
	naming: 1,
	log: { format: "swarmtales.events", version: 1 },
});

/** The sample with every optional part set, as a live experiment run of a later milestone writes it. */
const full = (): RunManifest => {
	const base = sample();
	const params = { temperature: 0.7, topP: "provider-default", maxOutputTokens: 1024, thinking: "off" } as const;
	return {
		...base,
		kernel: { ...base.kernel, commit: "89927a0", dirty: false },
		actors: base.actors.map((actor) => ({ ...actor, driver: "model", model: { provider: "p", requestedId: "alias", resolvedId: "id-1", params, pricing: "prices@1.0.0" } })),
		limits: { maxTicks: 40, maxCallsPerTick: 3, budgetUsd: 0.5 },
		resumedFrom: { snapshotHash: HASH_A },
		experiment: { id: "e1", specHash: HASH_B, arm: "control" },
	};
};

const check = (value: unknown): boolean => Value.Check(RunManifestSchema, value);

describe("RunManifestSchema", () => {
	it("accepts a sample manifest, with and without the optional parts", () => {
		expect(check(sample())).toBe(true);
		expect(check(full())).toBe(true);
		expect(check(JSON.parse(JSON.stringify(full())))).toBe(true);
	});

	it("refuses a kernel revision below 3", () => {
		const manifest = sample();
		expect(check({ ...manifest, kernel: { ...manifest.kernel, revision: 2 } })).toBe(false);
		expect(check({ ...manifest, kernel: { ...manifest.kernel, revision: 3.5 } })).toBe(false);
		expect(check({ ...manifest, kernel: { ...manifest.kernel, revision: 4 } })).toBe(true);
	});

	it("refuses a missing hash", () => {
		const { id, title, params } = sample().game;
		expect(check({ ...sample(), game: { id, title, params } })).toBe(false);
		expect(check({ ...sample(), scheduler: { id: "turns", revision: 1, determinism: "seeded", options: {} } })).toBe(false);
		expect(check({ ...sample(), plugins: [{ id: "grid-game", package: "@swarmtales/grid-game", version: "0.0.0" }] })).toBe(false);
		expect(check({ ...full(), resumedFrom: {} })).toBe(false);
		expect(check({ ...full(), experiment: { id: "e1", arm: "control" } })).toBe(false);
	});

	it("refuses a value that is no sha256 in lower-case hex", () => {
		for (const bad of ["", "a".repeat(63), "a".repeat(65), "A".repeat(64), `sha256:${"a".repeat(57)}`, 1]) {
			expect(check({ ...sample(), game: { ...sample().game, hash: bad } })).toBe(false);
			expect(check({ ...sample(), texts: { "grid-game/rules": bad } })).toBe(false);
			expect(check({ ...sample(), actors: sample().actors.map((actor) => ({ ...actor, textHashes: { briefing: bad } })) })).toBe(false);
		}
	});

	it("refuses an unknown field", () => {
		expect(check({ ...sample(), contextPolicy: { id: "full", version: 1 } })).toBe(false);
	});

	it("refuses an unknown field in every nested object", () => {
		const base = full();
		const extra = { unknown: 1 };
		const actor = (change: (a: RunManifest["actors"][number]) => unknown): unknown => ({ ...base, actors: base.actors.map(change) });
		const cases: Readonly<Record<string, unknown>> = {
			run: { ...base, run: { ...base.run, ...extra } },
			game: { ...base, game: { ...base.game, ...extra } },
			kernel: { ...base, kernel: { ...base.kernel, ...extra } },
			scheduler: { ...base, scheduler: { ...base.scheduler, ...extra } },
			plugin: { ...base, plugins: base.plugins.map((plugin) => ({ ...plugin, ...extra })) },
			actor: actor((a) => ({ ...a, ...extra })),
			model: actor((a) => ({ ...a, model: { ...a.model, ...extra } })),
			modelParams: actor((a) => ({ ...a, model: { ...a.model, params: { ...a.model?.params, ...extra } } })),
			limits: { ...base, limits: { ...base.limits, ...extra } },
			log: { ...base, log: { ...base.log, ...extra } },
			resumedFrom: { ...base, resumedFrom: { ...base.resumedFrom, ...extra } },
			experiment: { ...base, experiment: { ...base.experiment, ...extra } },
		};
		for (const [level, value] of Object.entries(cases)) expect(check(value), level).toBe(false);
		expect(check({ ...base, game: { ...base.game, params: { size: 3 } }, scheduler: { ...base.scheduler, options: { any: [1] } } })).toBe(true);
	});

	it("refuses a revision, a version or a limit below its minimum", () => {
		const base = sample();
		expect(check({ ...base, scheduler: { ...base.scheduler, revision: 0 } })).toBe(false);
		expect(check({ ...base, log: { ...base.log, version: 0 } })).toBe(false);
		expect(check({ ...base, limits: { maxTicks: 0 } })).toBe(false);
		expect(check({ ...base, limits: { maxTicks: 1, maxCallsPerTick: 0 } })).toBe(false);
		expect(check({ ...base, limits: { maxTicks: 1, budgetUsd: -0.01 } })).toBe(false);
		expect(check({ ...base, limits: { maxTicks: 1, maxCallsPerTick: 1, budgetUsd: 0 } })).toBe(true);
	});

	it("refuses another format, version, purpose or naming, and a negative seed", () => {
		expect(check({ ...sample(), format: "swarmtales-run/1" })).toBe(false);
		expect(check({ ...sample(), version: 2 })).toBe(false);
		expect(check({ ...sample(), run: { ...sample().run, purpose: "test" } })).toBe(false);
		expect(check({ ...sample(), naming: 2 })).toBe(false);
		expect(check({ ...sample(), seed: -1 })).toBe(false);
		expect(check({ ...sample(), replicate: -1 })).toBe(false);
	});

	it("refuses a seed that is no 32-bit number: the generator would play it as another seed", () => {
		expect(check({ ...sample(), seed: 4294967295 })).toBe(true);
		expect(check({ ...sample(), seed: 4294967296 })).toBe(false);
		expect(check({ ...sample(), seed: 1e21 })).toBe(false);
	});

	it("wants every sampling field of a model as a number or `provider-default`, never absent", () => {
		const withParams = (params: unknown): unknown => ({ ...full(), actors: full().actors.map((actor) => ({ ...actor, model: { ...actor.model, params } })) });
		expect(check(withParams({ temperature: "provider-default", topP: 1, maxOutputTokens: "provider-default", thinking: "off" }))).toBe(true);
		expect(check(withParams({ temperature: "default", topP: 1, maxOutputTokens: 1, thinking: "off" }))).toBe(false);
		expect(check(withParams({ topP: 1, maxOutputTokens: 1, thinking: "off" }))).toBe(false);
	});

	it("wants the price table of a model, and takes the text hashes of a model actor", () => {
		const withModel = (change: (model: NonNullable<RunManifest["actors"][number]["model"]>) => unknown): unknown => ({
			...full(),
			actors: full().actors.map((actor) => ({ ...actor, model: actor.model === undefined ? undefined : change(actor.model) })),
		});
		expect(check(withModel((model) => model))).toBe(true);
		expect(check(withModel(({ provider, requestedId, resolvedId, params }) => ({ provider, requestedId, resolvedId, params })))).toBe(false);
		expect(check(withModel((model) => ({ ...model, pricing: 1 })))).toBe(false);
		const hashes = { briefing: HASH_A, tools: HASH_B, system: HASH_A, toolSpecs: HASH_B };
		expect(check({ ...full(), actors: full().actors.map((actor) => ({ ...actor, textHashes: hashes })) })).toBe(true);
		expect(check({ ...full(), actors: full().actors.map((actor) => ({ ...actor, textHashes: { ...hashes, system: "prompt" } })) })).toBe(false);
	});

	it("still reads a manifest of M1, which has no model: the version stays 1", () => {
		const m1: unknown = JSON.parse(JSON.stringify(sample()));
		expect(check(m1)).toBe(true);
		expect(RunManifestSchema.properties.version.const).toBe(1);
	});

	it("describes every schema and property", () => {
		expect(missingDescriptions(RunManifestSchema, "RunManifest")).toEqual([]);
	});
});
