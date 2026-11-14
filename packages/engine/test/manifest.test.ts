// SPDX-License-Identifier: Apache-2.0
/**
 * `buildManifest` against a hand-made `ResolvedGame`: the manifest validates, it says what the game and the run
 * say, and a change of one input changes exactly the hashes that cover it.
 */
import { canonicalJson, jsonHash } from "@swarmtales/chain";
import { actorId, LOG_FORMAT, LOG_VERSION, RunManifestSchema, SwtError } from "@swarmtales/contracts";
import type { ActorSpec, JsonValue, ResolvedPlugin, RunManifest } from "@swarmtales/contracts";
import type { ResolvedGame } from "@swarmtales/sdk";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { buildManifest, type ManifestRun } from "../src/run/index.ts";
import { turns } from "../src/turns/index.ts";

const HASH = /^[0-9a-f]{64}$/;

const plugin = (id: string, options: JsonValue): ResolvedPlugin => ({
	id,
	package: `@swarmtales/${id}`,
	version: "1.2.3",
	requires: [],
	provides: [],
	events: {},
	audiences: {},
	options,
	create: () => ({ tools: [], services: [], listeners: [], hooks: {}, stages: {}, jobs: {}, limits: [], facts: {}, slice: undefined }),
});

const actor = (kind: string, name: string): ActorSpec => ({ id: actorId(kind, name), kind, grant: kind, shared: {} });

interface Changes {
	readonly texts?: Readonly<Record<string, string>>;
	readonly briefings?: Readonly<Record<string, string>>;
	readonly boardOptions?: JsonValue;
	readonly names?: Readonly<Record<string, string>>;
	readonly title?: string;
	readonly maxCallsPerTick?: number;
}

function game(changes: Changes = {}): ResolvedGame {
	const data = { schema: 1 as const, id: "hello", ...(changes.title === undefined ? {} : { title: changes.title }), residents: ["A01", "A02"], mechanics: [{ use: "board" }, { use: "roster" }], end: { ticks: 9 } };
	return {
		definition: {
			game: { id: "hello", hash: jsonHash(data) },
			seed: 7,
			actors: [actor("resident", "A01"), actor("resident", "A02"), actor("watcher", "W1")],
			plugins: [plugin("board", changes.boardOptions ?? { size: 3 }), plugin("roster", {})],
			scheduler: { definition: turns, options: { order: "roster", blockSize: 1 } },
			grants: { resident: ["@swarmtales/board/board/look", "@swarmtales/board/board/move"], watcher: ["@swarmtales/board/board/look"] },
			names: changes.names ?? { "@swarmtales/board/board/look": "viewBoard", "@swarmtales/board/board/move": "playMove" },
			startLocks: {},
			replies: {},
			limits: { maxTicks: 9, ...(changes.maxCallsPerTick === undefined ? {} : { maxCallsPerTick: changes.maxCallsPerTick }) },
		},
		data,
		texts: changes.texts ?? { "board/tools/look": "Look at the board.", "board/tools/move": "Play a move.", "core/replies/locked": "This tool is locked." },
		briefings: changes.briefings ?? { "resident:A01": "You are A01.", "resident:A02": "You are A02." },
		win: undefined,
	};
}

const RUN: ManifestRun = { id: "hello-001", startedAt: "2026-01-02T03:04:05.000Z", drivers: { resident: "fake/sample", "resident:A02": "scripted", watcher: "scripted" }, kernelRevision: 3, kernelVersion: "0.1.0", node: "v26.0.0" };

// Every hash of a manifest, by its place.
function hashes(manifest: RunManifest): Record<string, string> {
	const found: Record<string, string> = { "game.hash": manifest.game.hash, "scheduler.optionsHash": manifest.scheduler.optionsHash };
	for (const entry of manifest.plugins) found[`plugins.${entry.id}`] = entry.optionsHash;
	for (const [key, hash] of Object.entries(manifest.texts)) found[`texts.${key}`] = hash;
	for (const entry of manifest.actors) for (const [part, hash] of Object.entries(entry.textHashes)) found[`actors.${entry.id}.${part}`] = hash;
	return found;
}

function changed(other: RunManifest): string[] {
	const before = hashes(buildManifest(game(), RUN));
	const after = hashes(other);
	expect(Object.keys(after)).toEqual(Object.keys(before));
	return Object.keys(before).filter((place) => before[place] !== after[place]);
}

describe("buildManifest", () => {
	it("gives a manifest that validates and is a canonical JSON value", () => {
		const manifest = buildManifest(game({ title: "Hello", maxCallsPerTick: 4 }), { ...RUN, commit: "abc1234", dirty: true });
		expect([...Value.Errors(RunManifestSchema, manifest)]).toEqual([]);
		expect(JSON.parse(canonicalJson(manifest))).toEqual(manifest);
		for (const hash of Object.values(hashes(manifest))) expect(hash).toMatch(HASH);
		expect(Object.keys(hashes(manifest))).toHaveLength(12);
	});

	it("says what the game and the run say", () => {
		const resolved = game({ title: "Hello", maxCallsPerTick: 4 });
		const manifest = buildManifest(resolved, { ...RUN, commit: "abc1234", dirty: true });
		expect(manifest.run).toEqual({ id: "hello-001", startedAt: "2026-01-02T03:04:05.000Z", purpose: "smoke" });
		expect(manifest.game).toEqual({ id: "hello", title: "Hello", hash: jsonHash(resolved.data), params: {} });
		expect(manifest.kernel).toEqual({ revision: 3, version: "0.1.0", commit: "abc1234", dirty: true, node: "v26.0.0" });
		expect(manifest.scheduler).toEqual({ id: turns.id, revision: 1, determinism: "seeded", options: { order: "roster", blockSize: 1 }, optionsHash: jsonHash({ blockSize: 1, order: "roster" }) });
		expect(manifest.plugins).toEqual([
			{ id: "board", package: "@swarmtales/board", version: "1.2.3", optionsHash: jsonHash({ size: 3 }) },
			{ id: "roster", package: "@swarmtales/roster", version: "1.2.3", optionsHash: jsonHash({}) },
		]);
		expect(manifest.texts["board/tools/move"]).toBe(jsonHash("Play a move."));
		expect([manifest.seed, manifest.replicate, manifest.naming]).toEqual([7, 0, 1]);
		expect(manifest.limits).toEqual({ maxTicks: 9, maxCallsPerTick: 4 });
		expect(manifest.log).toEqual({ format: LOG_FORMAT, version: LOG_VERSION });
	});

	it("leaves out what is absent", () => {
		const manifest = buildManifest(game(), RUN);
		expect(Object.keys(manifest.game)).toEqual(["id", "hash", "params"]);
		expect(Object.keys(manifest.kernel)).toEqual(["revision", "version", "node"]);
		expect(manifest.limits).toEqual({ maxTicks: 9 });
		expect(Object.keys(manifest)).not.toContain("resumedFrom");
		expect(Object.keys(manifest)).not.toContain("experiment");
	});

	it("names each actor's driver, by id before kind, and hashes its briefing and its tool list", () => {
		const { actors } = buildManifest(game(), RUN);
		expect(actors.map((entry) => [entry.id, entry.kind, entry.grant, entry.driver])).toEqual([
			["resident:A01", "resident", "resident", "fake/sample"],
			["resident:A02", "resident", "resident", "scripted"],
			["watcher:W1", "watcher", "watcher", "scripted"],
		]);
		expect(actors[0]?.textHashes).toEqual({ briefing: jsonHash("You are A01."), tools: jsonHash(["viewBoard", "playMove"]) });
		expect(actors[2]?.textHashes).toEqual({ tools: jsonHash(["viewBoard"]) });
		expect(actors.every((entry) => entry.model === undefined)).toBe(true);
	});

	it("changes exactly one hash when one text changes", () => {
		const texts = { "board/tools/look": "Look at the board.", "board/tools/move": "Play a move!", "core/replies/locked": "This tool is locked." };
		expect(changed(buildManifest(game({ texts }), RUN))).toEqual(["texts.board/tools/move"]);
	});

	it("changes exactly the hashes that cover a briefing, an option and a shown name", () => {
		expect(changed(buildManifest(game({ briefings: { "resident:A01": "You are A01.", "resident:A02": "You are B." } }), RUN))).toEqual(["actors.resident:A02.briefing"]);
		expect(changed(buildManifest(game({ boardOptions: { size: 4 } }), RUN))).toEqual(["plugins.board"]);
		const names = { "@swarmtales/board/board/look": "viewBoard", "@swarmtales/board/board/move": "move" };
		expect(changed(buildManifest(game({ names }), RUN))).toEqual(["actors.resident:A01.tools", "actors.resident:A02.tools"]);
	});

	it("is the same manifest for the same input, whatever the order of the text keys", () => {
		const texts = { "core/replies/locked": "This tool is locked.", "board/tools/move": "Play a move.", "board/tools/look": "Look at the board." };
		expect(canonicalJson(buildManifest(game({ texts }), RUN))).toBe(canonicalJson(buildManifest(game(), RUN)));
		expect(Object.keys(buildManifest(game({ texts }), RUN).texts)).toEqual(["board/tools/look", "board/tools/move", "core/replies/locked"]);
	});

	it("refuses an actor without a driver (SWT-R011)", () => {
		const build = (): RunManifest => buildManifest(game(), { ...RUN, drivers: { resident: "fake/sample" } });
		expect(build).toThrow(SwtError);
		expect(build).toThrow(/SWT-R011.*watcher:W1/s);
	});
});
