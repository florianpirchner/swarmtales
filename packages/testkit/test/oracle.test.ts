// SPDX-License-Identifier: Apache-2.0
import { defineGame, defineHead, defineMechanic, refuse, reply } from "@swarmtales/sdk";
import { Type, type Static } from "typebox";
import { describe, expect, it } from "vitest";
import { mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SwtError } from "@swarmtales/contracts";
import type { Oracle, OracleEntry } from "../src/oracle/format.ts";
import { countsOf, readOracle } from "../src/oracle/read.ts";
import { runOracle } from "../src/oracle/run.ts";
import { timelineOf } from "../src/oracle/timeline.ts";
import { play } from "../src/play.ts";

// A baton that two residents pass to each other: only the holder has news and an open `pass`.
const State = Type.Object({ holder: Type.String(), passes: Type.Integer() });
const head = defineHead({
	id: "relay",
	package: "@test/relay",
	summary: "A baton goes from resident to resident.",
	options: Type.Object({ target: Type.Integer({ default: 3, description: "The number of passes that ends the run." }) }, { description: "The options." }),
	state: State,
	start: (setup): Static<typeof State> => ({ holder: setup.residents[0] ?? "", passes: 0 }),
	events: { passed: Type.Object({ from: Type.String(), to: Type.String(), count: Type.Integer() }), noted: Type.Object({ note: Type.String() }) },
	audiences: { noted: ["human"] },
	tools: { pass: { description: "Passes the baton on.", params: Type.Object({ note: Type.String() }), for: ["resident"] } },
});
const relay = defineMechanic(head, {
	tools: {
		pass: {
			check: (params) => (params.note === "" ? refuse("EMPTY_NOTE", "Write a note.") : undefined),
			run(params, ctx) {
				const from = ctx.resident ?? "";
				const to = ctx.residents.ids.find((id) => id !== from) ?? from;
				ctx.state.passes += 1;
				ctx.state.holder = to;
				ctx.emit("passed", { from, to, count: ctx.state.passes });
				ctx.emit("noted", { note: params.note });
				ctx.access.lock(from, "pass");
				ctx.access.unlock(to, "pass");
				return reply(`Passed to ${to}.`, { endsTurn: true });
			},
		},
	},
	hooks: {
		runStarted: (ctx) => {
			for (const id of ctx.residents.ids.filter((one) => one !== ctx.state.holder)) ctx.access.lock(id, "pass");
		},
		news: (resident, ctx) => resident === ctx.state.holder,
		turnInputs: (resident, ctx) => (resident === ctx.state.holder ? [`You hold the baton after ${String(ctx.state.passes)} passes.`] : []),
	},
	limits: { done: { summary: "Ends at the target.", breached: (view) => (view.state.passes >= view.options.target ? "the baton went round" : undefined) } },
});
const game = defineGame({ id: "relay", residents: 2, mechanics: [relay({ target: 3 })], scheduler: { id: "turns", options: { passes: 2, activation: "onNews" } }, end: { ticks: 4 }, limits: { maxCallsPerTick: 8 } });


// The oracle of that game with the seed 7, written by hand from the rules above (the seeded order of each tick is the one `turns` draws).
const lock = (type: "tool_locked" | "tool_unlocked", actor: string, resident: string): OracleEntry => ({ k: "event", source: "core", type, actor, payload: { resident, tool: "pass", by: "relay" } });
const skip = (resident: string, pass: number, block: number): OracleEntry => ({ k: "skip", resident, pass, block });
const turn = (resident: string, pass: number, block: number, passes: number): OracleEntry => ({ k: "turn", resident, pass, block, inputs: [{ source: "relay", text: `You hold the baton after ${String(passes)} passes.` }] });
const refused = (params: unknown, code: string, stage: "rule" | "parse", detail?: string): OracleEntry => ({ k: "call", actor: "resident:A01", tool: "pass", params, ok: false, code, stage, ...(detail === undefined ? {} : { detail }) });
const passed = (from: string, to: string, count: number, note: string): OracleEntry[] => [
	{ k: "call", actor: `resident:${from}`, tool: "pass", params: { note }, ok: true, reply: `Passed to ${to}.`, endsTurn: true },
	{ k: "event", source: "relay", type: "passed", actor: `resident:${from}`, payload: { from, to, count } },
	{ k: "event", source: "relay", type: "noted", actor: `resident:${from}`, audience: ["human"], payload: { note } },
	lock("tool_locked", `resident:${from}`, from),
	lock("tool_unlocked", `resident:${from}`, to),
];
const timeline: OracleEntry[] = [
	lock("tool_locked", "host", "A02"),
	{ k: "minute", minute: 0 },
	skip("A02", 1, 1),
	turn("A01", 1, 2, 0),
	refused({ note: "" }, "EMPTY_NOTE", "rule", "Write a note."),
	refused({}, "INVALID_ARGUMENTS", "parse"),
	skip("A02", 2, 1),
	turn("A01", 2, 2, 0),
	...passed("A01", "A02", 1, "go"),
	{ k: "minute", minute: 1 },
	skip("A01", 1, 1),
	turn("A02", 1, 2, 1),
	...passed("A02", "A01", 2, "back"),
	turn("A01", 2, 1, 2),
	...passed("A01", "A02", 3, "last"),
	{ k: "event", source: "core", type: "referee_intervened", actor: "host", payload: { limit: "relay.done", reason: "the baton went round" } },
];
const file: Oracle = {
	format: "swarmtales.oracle",
	version: 1,
	game: "relay",
	variant: "relay",
	seed: 7,
	runtimeRevision: 3,
	source: { kind: "scripted", from: "packages/testkit/test/oracle.test.ts" },
	setup: { story: "relay", seed: 7, minutes: 4, residents: ["A01", "A02"], mechanics: [{ id: "relay", options: { target: 3 } }], residentTools: ["pass"], locked: [], turns: { passes: 2, blockSize: 1, activation: "onNews", order: "seeded" }, limits: { maxStepsPerMinute: 8 } },
	end: { reason: "referee", minute: 2, limit: "relay.done" },
	counts: { entries: { call: 5, event: 14, minute: 2, skip: 3, turn: 4 }, events: { "core.referee_intervened": 1, "core.tool_locked": 4, "core.tool_unlocked": 3, "relay.noted": 3, "relay.passed": 3 } },
	timeline,
};

const folder = mkdtempSync(join(tmpdir(), "oracle-"));
const written = (name: string, content: unknown): string => {
	const path = join(folder, `${name}.json`);
	writeFileSync(path, JSON.stringify(content));
	return path;
};
const oracle = readOracle(written("relay-s7", file));
const changed = (change: (entry: OracleEntry, index: number) => OracleEntry | undefined): Oracle => ({ ...oracle, timeline: oracle.timeline.flatMap((entry, index) => change(entry, index) ?? []) });
const codeOf = (run: () => unknown): string => {
	try {
		run();
		return "no error";
	} catch (error) {
		return error instanceof SwtError ? `${error.code} ${error.message}` : String(error);
	}
};
// The mismatches of a faulty oracle at each level, as `<level> <at> <index>`.
const found = async (faulty: Oracle): Promise<readonly (readonly string[])[]> => {
	const levels = [await runOracle(faulty, game, 1), await runOracle(faulty, game, 2), await runOracle(faulty, game, 3)];
	return levels.map((mismatches) => mismatches.map((mismatch) => `${String(mismatch.level)} ${mismatch.at} ${String(mismatch.index)}`));
};

describe("readOracle", () => {
	it("reads a file, and refuses one that is no oracle or whose counts do not hold", () => {
		expect(oracle).toEqual(file);
		expect(codeOf(() => readOracle(written("counts", { ...file, counts: { ...file.counts, entries: { ...file.counts.entries, skip: 4 } } })))).toMatch(/^SWT-T001 .*counts that differ/);
		expect(codeOf(() => readOracle(written("schema", { ...file, version: 2 })))).toMatch(/^SWT-T001 .*does not match the schema: \/version/);
		expect(codeOf(() => readOracle(join(folder, "missing.json")))).toMatch(/^SWT-T001 .*cannot be read/);
	});

	it("every oracle file of the repository parses and its counts hold", () => {
		const root = join(import.meta.dirname, "../../../oracles");
		const files = readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory()).flatMap((game) => readdirSync(join(root, game.name)).filter((name) => name.endsWith(".json")).map((name) => join(root, game.name, name)));
		expect(files.filter((path) => path.includes("/tictactoe/"))).toHaveLength(9);
		expect(files.length).toBeGreaterThanOrEqual(76);
		for (const path of files) {
			const read = readOracle(path);
			expect(read.counts, path).toEqual(countsOf(read.timeline));
		}
	});
});

describe("runOracle", () => {
	it("a hand-made oracle of a mechanic defined here matches at level 3, and the folded log is its timeline", async () => {
		expect(await runOracle(oracle, game)).toEqual([]);
		const { events } = await play(game, { seed: 7, script: { A01: [["pass", { note: "go" }]] }, ticks: 1 });
		expect(timelineOf(events)).toEqual([timeline[0], timeline[1], skip("A02", 1, 1), turn("A01", 1, 2, 0), ...passed("A01", "A02", 1, "go"), turn("A02", 2, 1, 1), skip("A01", 2, 2)]);
	});

	it("finds a planted fault of each kind at its level and not below it", async () => {
		const call = (change: (entry: Extract<OracleEntry, { k: "call" }>) => OracleEntry) => changed((entry) => (entry.k === "call" ? change(entry) : entry));
		expect(await found({ ...oracle, setup: { ...oracle.setup, locked: ["pass"] } })).toEqual([["1 setup -1"], ["1 setup -1"], ["1 setup -1"]]);
		expect(await found(call((entry) => (entry.code === "EMPTY_NOTE" ? { ...entry, code: "NO_NOTE" } : entry)))).toEqual([["1 call 4"], ["1 call 4"], ["1 call 4"]]);
		expect(await found(call((entry) => (entry.code === "EMPTY_NOTE" ? { ...entry, detail: "Write one." } : entry)))).toEqual([[], ["2 call 4"], ["2 call 4"]]);
		expect(await found(call((entry) => ({ ...entry, endsTurn: false })))).toEqual([[], ["2 call 4"], ["2 call 4"]]);
		expect(await found(changed((entry) => (entry.k === "event" && entry.type === "noted" ? { ...entry, audience: ["resident"] } : entry)))).toEqual([["1 event 10"], ["1 event 10"], ["1 event 10"]]);
		expect(await found(changed((entry, index) => (index === 12 ? lock("tool_unlocked", "resident:A01", "A01") : entry)))).toEqual([[], [], ["3 event 12"]]);
		expect(await found(changed((entry, index) => (index === 15 ? turn("A02", 1, 2, 7) : entry)))).toEqual([[], ["2 inputs 15"], ["2 inputs 15"]]);
		expect(await found(changed((entry, index) => (index === 15 ? turn("A02", 2, 2, 1) : entry)))).toEqual([[], [], ["3 turn 15"]]);
		expect(await found(changed((entry, index) => (index === 6 ? undefined : entry)))).toEqual([[], [], ["3 turn 6"]]);
		expect(await found(changed((entry) => (entry.k === "minute" ? { ...entry, minute: entry.minute + 1 } : entry)))).toEqual([[], [], ["3 turn 1"]]);
		expect(await found({ ...oracle, end: { reason: "minutes", minute: 4 } })).toEqual([["1 end -1"], ["1 end -1"], ["1 end -1"]]);
	});

	it("reports what differs with the oracle's and the run's value", async () => {
		const other = defineGame({ ...game, mechanics: [relay({ target: 2 })] });
		const mismatches = await runOracle(oracle, other);
		expect(mismatches[0]).toEqual({ level: 1, at: "setup", index: -1, expected: { "options.relay": { target: 3 } }, actual: { "options.relay": { target: 2 } } });
		// The run ends one pass earlier: where the oracle has its last turn and call, the run has its end.
		expect(mismatches[1]).toEqual({ level: 1, at: "call", index: 22, expected: { k: "call", actor: "resident:A01", tool: "pass", ok: true, code: undefined, stage: undefined }, actual: timeline.at(-1) });
		expect(mismatches.map((mismatch) => `${String(mismatch.level)} ${mismatch.at} ${String(mismatch.index)}`)).toEqual(["1 setup -1", "1 call 22", "2 inputs 21", "3 turn 21"]);
	});

	it("refuses what it does not play at M1 with a clear error", async () => {
		const refusal = (faulty: Oracle): Promise<string> => runOracle(faulty, game).then(() => "no error", (error: unknown) => (error instanceof SwtError ? `${error.code} ${error.message}` : String(error)));
		expect(await refusal({ ...oracle, timeline: [...timeline, { k: "resume", minute: 1 }] })).toMatch(/^SWT-T002 .*`relay` with the seed 7 has a `resume` entry \(timeline\[28\]\)/);
		expect(await refusal(changed((entry, index) => (index === 4 && entry.k === "call" ? { ...entry, actor: "script" } : entry)))).toMatch(/^SWT-T002 .*a call of `script`, which is no resident \(timeline\[4\]\)/);
		expect(await refusal({ ...oracle, truncated: { afterMinute: 1, reason: "cut" } })).toMatch(/is truncated/);
		expect(await refusal({ ...oracle, setup: { ...oracle.setup, turns: { ...oracle.setup.turns, order: "custom" } } })).toMatch(/turn order `custom`/);
		expect(await refusal(changed((entry) => (entry.k === "event" && entry.type === "referee_intervened" ? { ...entry, type: "role_asked" } : entry)))).toMatch(/platform event `core\.role_asked`/);
	});

	// M1 review, finding T1 (erratum E61 as rewritten): the stated options are filled with the mechanic's defaults and
	// compared whole. Here the game caps a note at 10 characters (default 100) and no note of the file is longer.
	it("finds an option the game sets and the file leaves to its default, when the timeline does not show it", async () => {
		const capped = defineMechanic(defineHead({ ...head, options: Type.Object({ target: Type.Integer({ default: 3, description: "The number of passes that ends the run." }), maxNote: Type.Integer({ default: 100, description: "The longest note." }) }, { description: "The options." }) }), {
			tools: { pass: { run: (_params, ctx) => reply(`Passed by ${ctx.resident ?? ""}.`) } },
		});
		const stated: Oracle = { ...oracle, setup: { ...oracle.setup, residentTools: ["pass"], mechanics: [{ id: "relay", options: { target: 3 } }] }, timeline: [], counts: { entries: {}, events: {} }, end: { reason: "minutes", minute: 4 } };
		const as = (options: { readonly target: number; readonly maxNote?: number }) => defineGame({ id: "relay", residents: 2, mechanics: [capped(options)], scheduler: { id: "turns", options: { passes: 2, activation: "onNews" } }, end: { ticks: 4 }, limits: { maxCallsPerTick: 8 } });
		expect((await runOracle(stated, as({ target: 3 }), 1)).filter((mismatch) => mismatch.at === "setup")).toEqual([]);
		expect((await runOracle(stated, as({ target: 3, maxNote: 10 }), 1)).filter((mismatch) => mismatch.at === "setup")).toHaveLength(1);
		// Stated options that the mechanic refuses are a difference of the setup, as written, and no throw.
		const unparsed: Oracle = { ...stated, setup: { ...stated.setup, mechanics: [{ id: "relay", options: { target: "three" } }] } };
		expect((await runOracle(unparsed, as({ target: 3 }), 1)).filter((mismatch) => mismatch.at === "setup")).toEqual([{ level: 1, at: "setup", index: -1, expected: { "options.relay": { target: "three" } }, actual: { "options.relay": { target: 3, maxNote: 100 } } }]);
	});
});
