// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The contract changes of milestone M3 (section 3 of its specification): the Director uses of a game, the model
 * port `AskModel`, the snapshot file, the manifest's `human`, and the new error codes. All of it is optional or
 * new, so a game of before reads as before.
 */
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { SWT_CODE } from "../src/error.ts";
import { DirectorUseSchema, GameDefinitionSchema, type DirectorUse, type GameData } from "../src/game/index.ts";
import type { Activation, KernelSnapshot } from "../src/kernel/index.ts";
import { RunManifestSchema, SNAPSHOT_FILE_FORMAT, type AskModel, type ModelAnswer, type ModelQuestion, type SnapshotFile } from "../src/run/index.ts";
import { missingDescriptions } from "./descriptions.ts";

const HASH = "a".repeat(64);
const base = { schema: 1, id: "g", residents: 2, mechanics: [], end: { ticks: 1 } } as const;
const game = (directors: unknown): boolean => Value.Check(GameDefinitionSchema, { ...base, directors });
const use = (value: unknown): boolean => Value.Check(DirectorUseSchema, value);

describe("DirectorUseSchema and `directors`", () => {
	it("takes a Director by its id alone, and with every optional part", () => {
		const full: DirectorUse = { use: "gamemaker", as: "host", options: { tone: "dry", every: [1, 2] }, model: { id: "anthropic/haiku", thinking: "low" }, limits: { maxCalls: 0, maxCostUsd: 0.4 } };
		const data: GameData = { ...base, mechanics: [], directors: [{ use: "gamemaker" }, full] };
		expect(Value.Errors(GameDefinitionSchema, data)).toEqual([]);
		expect(use({ use: "gamemaker", limits: {} })).toBe(true);
	});

	it("still takes a game without the field and with an empty list", () => {
		expect(Value.Check(GameDefinitionSchema, base)).toBe(true);
		expect(game([])).toBe(true);
	});

	it("refuses a Director without `use`, an unknown field at each level, and a value of the wrong kind", () => {
		const bad: readonly unknown[] = [
			{},
			{ as: "host" },
			{ use: 7 },
			{ use: "gamemaker", id: "gamemaker" },
			{ use: "gamemaker", as: 1 },
			{ use: "gamemaker", options: [1] },
			{ use: "gamemaker", options: "x" },
			{ use: "gamemaker", model: "anthropic/haiku" },
			{ use: "gamemaker", model: { id: "anthropic/haiku", temperature: 0 } },
			{ use: "gamemaker", limits: { maxCalls: -1 } },
			{ use: "gamemaker", limits: { maxCalls: 1.5 } },
			{ use: "gamemaker", limits: { maxCostUsd: -0.01 } },
			{ use: "gamemaker", limits: { maxTicks: 3 } },
			"gamemaker",
		];
		for (const value of bad) {
			expect(use(value), JSON.stringify(value)).toBe(false);
			expect(game([{ use: "gamemaker" }, value]), JSON.stringify(value)).toBe(false);
		}
		expect(game({ use: "gamemaker" })).toBe(false);
	});

	it("describes every part", () => {
		expect(missingDescriptions(DirectorUseSchema, "DirectorUseSchema")).toEqual([]);
		expect(missingDescriptions(GameDefinitionSchema, "GameDefinitionSchema")).toEqual([]);
	});
});

describe("AskModel", () => {
	const activation: Activation = {
		actor: "director:host",
		tick: 3,
		basis: 12,
		detail: {},
		inputs: [],
		tools: [],
		call: () => Promise.reject(new RangeError("the asker calls no tool")),
		record: () => {
			throw new RangeError("the asker of this test writes no record");
		},
	};
	const question: ModelQuestion = { system: "You are the host.", input: "A resident was banished.", output: { type: "object" } };

	it("is implemented by a function of the activation and the question that answers or says why not", async () => {
		const answers: readonly ModelAnswer[] = [
			{ ok: true, value: { line: "The city notes it." }, costUsd: 0.002 },
			{ ok: false, reason: "limit", detail: "maxCostUsd 0.40 reached" },
			{ ok: false, reason: "invalid", detail: "no JSON" },
			{ ok: false, reason: "error", detail: "the provider answered 529" },
		];
		const asked: string[] = [];
		const ask: AskModel = (at, { input }) => {
			asked.push(`${at.actor}@${String(at.tick)}: ${input}`);
			return Promise.resolve(answers[asked.length - 1] ?? { ok: false, reason: "error", detail: "the script ended" });
		};
		const got = [await ask(activation, question), await ask(activation, question), await ask(activation, question), await ask(activation, question)];
		expect(got).toEqual(answers);
		expect(asked[0]).toBe("director:host@3: A resident was banished.");
		expect(got.map((answer) => (answer.ok ? answer.costUsd : answer.reason))).toEqual([0.002, "limit", "invalid", "error"]);
	});
});

describe("SnapshotFile", () => {
	it("holds the run, the game hash, the last finished tick, the kernel's state and the signed head, and survives JSON", () => {
		const snapshot: KernelSnapshot = { format: "swarmtales.kernel", version: 1, game: "g", gameHash: HASH, seed: 7, tick: 5, seq: 31, suspensions: {}, locks: {}, jobs: [], plugins: {} };
		const file: SnapshotFile = {
			format: SNAPSHOT_FILE_FORMAT,
			runId: "g-001",
			gameHash: HASH,
			tick: 4,
			snapshot,
			checkpoint: { genesis: HASH, lines: 31, hash: HASH, publicKey: "cGs=", signature: "c2ln", state: HASH },
		};
		expect(SNAPSHOT_FILE_FORMAT).toBe(1);
		expect(JSON.parse(JSON.stringify(file))).toEqual(file);
		expect(Object.keys(file)).toEqual(["format", "runId", "gameHash", "tick", "snapshot", "checkpoint"]);
		// @ts-expect-error -- a snapshot file of another format version is not a `SnapshotFile`.
		const other: SnapshotFile = { ...file, format: 2 };
		expect(other.format).toBe(2);
	});
});

describe("RunManifestSchema: `human`", () => {
	const manifest = {
		format: "swarmtales-run",
		version: 1,
		run: { id: "g-001", startedAt: "2026-11-14T08:00:00.000Z", purpose: "smoke" },
		game: { id: "g", hash: HASH, params: {} },
		kernel: { revision: 3, version: "0.0.0", node: "v26.0.0" },
		scheduler: { id: "turns", revision: 1, determinism: "seeded", options: {}, optionsHash: HASH },
		plugins: [],
		actors: [],
		texts: {},
		seed: 1,
		replicate: 0,
		limits: { maxTicks: 4 },
		naming: 1,
		log: { format: "swarmtales.events", version: 1 },
	} as const;
	const check = (value: unknown): boolean => Value.Check(RunManifestSchema, value);

	it("is absent or true, never another value", () => {
		expect(check(manifest)).toBe(true);
		expect(check({ ...manifest, human: true })).toBe(true);
		for (const human of [false, "true", 1, null, {}]) expect(check({ ...manifest, human }), JSON.stringify(human)).toBe(false);
		expect(missingDescriptions(RunManifestSchema, "RunManifest")).toEqual([]);
	});
});

describe("the error codes of M3", () => {
	it("fit the code pattern, the Director's letter D included", () => {
		const codes = ["SWT-D001", "SWT-D002", "SWT-D003", "SWT-R021", "SWT-L007", "SWT-L008", "SWT-T003", "SWT-T004", "SWT-X008", "SWT-X009"];
		for (const code of codes) expect(new RegExp(SWT_CODE).test(code), code).toBe(true);
		expect(new Set(codes).size).toBe(10);
	});
});
