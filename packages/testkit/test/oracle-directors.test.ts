// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The platform lines of the story games' oracle files (M5-10, `12-m5-spec.md` 3.4, the mapping table): a Director is
 * driven from its `core.overseer_called` and read back as the old overseer, a review record as the old role line,
 * a suspension as `core.resident_suspended`, and a verdict of the city's check writes no line. The file of the first
 * part is written by hand; the review records are folded from envelopes, since `play` passes no answerer port (J22).
 */
import type { Envelope } from "@swarmtales/contracts";
import { defineDirector, defineGame, defineHead, defineMechanic, reply } from "@swarmtales/sdk";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import type { Oracle, OracleEntry } from "../src/oracle/format.ts";
import { countsOf } from "../src/oracle/read.ts";
import { runOracle } from "../src/oracle/run.ts";
import { timelineOf } from "../src/oracle/timeline.ts";

const Text = Type.Object({ text: Type.String({ description: "The text." }) }, { description: "A text." });
const Empty = Type.Object({}, { description: "No params." });
const town = defineMechanic(defineHead({ id: "town", package: "@test/town", summary: "A bell and a notice.", events: { rung: Empty, notified: Text }, tools: { ring: { description: "Rings.", params: Empty, for: ["resident"] }, notify: { description: "Notifies.", params: Text, for: [] } } }), {
	tools: { ring: { run: (_params, ctx) => (ctx.emit("rung", {}), reply("Rung.")) }, notify: { run: (params, ctx) => (ctx.emit("notified", params), reply("Sent.")) } },
});
const gamemaker = defineDirector({ id: "gamemaker", summary: "Looks when the bell rings.", on: [{ event: "town.rung" }], output: Empty }, { system: () => "You keep the city.", input: () => "", act: () => Promise.resolve() });
const game = defineGame({ id: "bell", residents: 1, mechanics: [town({})], directors: [{ use: gamemaker }], grants: { resident: ["ring"], gamemaker: ["notify"] }, scheduler: { id: "turns", options: { afterBlocks: ["director"] } }, end: { ticks: 1 } });

const timeline: OracleEntry[] = [
	{ k: "minute", minute: 0 },
	{ k: "turn", resident: "A01", pass: 1, block: 1, inputs: [] },
	{ k: "call", actor: "resident:A01", tool: "ring", params: {}, ok: true, reply: "Rung." },
	{ k: "event", source: "town", type: "rung", actor: "resident:A01", payload: {} },
	{ k: "event", source: "core", type: "overseer_called", actor: "gamemaker", payload: { overseer: "gamemaker", trigger: "event", index: 0 } },
	{ k: "call", actor: "gamemaker", tool: "notify", params: { text: "Ring again." }, ok: true },
	{ k: "event", source: "town", type: "notified", actor: "gamemaker", payload: { text: "Ring again." } },
	{ k: "event", source: "core", type: "overseer_answered", actor: "gamemaker", payload: { overseer: "gamemaker", ok: true, by: "model", output: {}, costUsd: 0 } },
];
const fileOf = (entries: readonly OracleEntry[]): Oracle => ({
	format: "swarmtales.oracle",
	version: 1,
	game: "bell",
	variant: "bell",
	seed: 7,
	runtimeRevision: 2,
	source: { kind: "scripted", from: "packages/testkit/test/oracle-directors.test.ts" },
	setup: { story: "bell", seed: 7, minutes: 1, residents: ["A01"], mechanics: [{ id: "town", options: {} }], residentTools: ["ring"], locked: [], turns: { passes: 1, blockSize: 1, activation: "always", order: "seeded" } },
	end: { reason: "minutes", minute: 1 },
	counts: countsOf(entries),
	timeline: [...entries],
});
const found = async (entries: readonly OracleEntry[]): Promise<readonly string[]> => (await runOracle(fileOf(entries), game)).map((mismatch) => `${String(mismatch.level)} ${mismatch.at} ${String(mismatch.index)}`);

const envelope = (seq: number, source: string, type: string, actor: Envelope["actor"], payload: unknown, more: Partial<Envelope> = {}): Envelope => ({ seq, tick: 3, source, type, actor, payload, ...more });

describe("the platform lines of the story games", () => {
	it("drives the gamemaker from its overseer lines and reads it back as the old overseer, at level 3", async () => {
		expect(await found(timeline)).toEqual([]);
		// Its call is played from the file and compared as a resident's; its activation by its count.
		expect(await found(timeline.map((entry) => (entry.k === "call" && entry.actor === "gamemaker" ? { ...entry, params: { text: "Hush." } } : entry)))).toEqual(["1 event 6"]);
		expect(await found(timeline.map((entry) => (entry.k === "call" && entry.actor === "gamemaker" ? { ...entry, ok: false, code: "TOOL_LOCKED" } : entry)))).toEqual(["1 call 5"]);
		expect(await found(timeline.filter((entry) => !(entry.k === "event" && entry.type === "overseer_answered")))).toEqual(["3 event 7"]);
	});

	it("skips a verdict of the city's check, and refuses one of the guard's model", async () => {
		const verdict = (by: string): OracleEntry => ({ k: "event", source: "core", type: "guard_verdict", actor: "resident:A01", payload: { tool: "ring", rule: "no-fragments", allowed: true, reason: "", by } });
		const checked = [...timeline.slice(0, 3), verdict("check"), ...timeline.slice(3)];
		expect(await found(checked)).toEqual([]);
		await expect(found([...timeline.slice(0, 3), verdict("model"), ...timeline.slice(3)])).rejects.toThrow(/platform event `core\.guard_verdict` \(timeline\[3\]\)/);
	});

	it("folds the review records into the old role lines, a suspension into `resident_suspended`, a Director's actor into the overseer's", () => {
		const call = envelope(10, "kernel", "tool_called", "resident:A01", { as: "blame", params: { dm: 41 } }, { tool: "@test/city/city/blame" });
		const folded = timelineOf([
			call,
			envelope(11, "@swarmtales/engine/review", "asked", "resident:A01", { answerer: "judge", question: { dm: 41 } }, { causedBy: 10, tool: "@test/city/city/blame" }),
			envelope(12, "@swarmtales/engine/review", "answered", "resident:A01", { answerer: "judge", ok: true, answer: { deniesReceipt: true }, costUsd: 0 }, { causedBy: 10, tool: "@test/city/city/blame" }),
			envelope(13, "kernel", "tool_result", "resident:A01", { as: "blame", reply: "upheld" }, { causedBy: 10 }),
			envelope(14, "kernel", "actor_suspended", "kernel", { actor: "resident:A05", by: "exile", reason: "exiled" }),
			envelope(15, "@test/town/town", "notified", "director:classifier", { text: "x" }),
			envelope(16, "@swarmtales/engine/director", "asked", "director:classifier", { firings: [1] }),
		]);
		expect(folded).toEqual([
			{ k: "call", actor: "resident:A01", tool: "blame", params: { dm: 41 }, ok: true, reply: "upheld" },
			{ k: "event", source: "core", type: "role_asked", actor: "resident:A01", payload: { role: "judge", tool: "blame", question: { dm: 41 } } },
			{ k: "event", source: "core", type: "role_answered", actor: "resident:A01", payload: { role: "judge", ok: true, answer: { deniesReceipt: true }, costUsd: 0 } },
			{ k: "event", source: "core", type: "resident_suspended", actor: "host", payload: { resident: "A05", by: "exile", reason: "exiled" } },
			{ k: "event", source: "town", type: "notified", actor: "overseer:classifier", payload: { text: "x" } },
		]);
	});
});
