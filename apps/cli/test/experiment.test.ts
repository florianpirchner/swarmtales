// SPDX-License-Identifier: Apache-2.0
/**
 * `swt experiment` and `swt report` over a family of guess-number with the scripted source: a two-arm series runs,
 * is stopped at its cap, continues after the total was raised, and is analysed. This file is its own game file (its
 * default export is the family). It builds its key at run time, uses its own temporary ledger, reads nothing from
 * the process, and the global `fetch` rejects.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { EventSink } from "@swarmtales/contracts";
import { LOOPHOLE_HEADING, parseExperimentResults, planRuns, readExperimentState, type ExperimentSpec } from "@swarmtales/lab";
import { act, say, scriptedSource, type ModelSource } from "@swarmtales/models";
import { defineGame, defineGameFamily } from "@swarmtales/sdk";
import { guessNumber } from "@swarmtales/testkit";
import { Type } from "typebox";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { experimentRun, type ExperimentInput } from "../src/experiment.ts";
import { LEAK_FILE } from "../src/leak-scan.ts";
import { main, type CliIo } from "../src/main.ts";

const Params = Type.Object({ max: Type.Integer({ default: 20, description: "The secret lies between 1 and this number" }) }, { description: "The params of the family" });
export default defineGameFamily(Params, ({ max }) => defineGame({ id: "guess-number", seed: 4, residents: 3, mechanics: [guessNumber({ max })], briefing: "Find the secret number.", end: { ticks: 30 } }));

// Built at run time from parts: no committed string reads as a key.
const KEY = `sk-${"e".repeat(37)}`;
const env = { ARENA_ANTHROPIC_API_KEY: KEY };
const SPEC: ExperimentSpec = {
	format: "swarmtales-experiment", version: 1, id: "guess-small", question: "Does a smaller range end the game sooner?", purpose: "pilot", game: fileURLToPath(import.meta.url), model: { provider: "anthropic", id: "haiku", thinking: "low" },
	arms: [{ id: "control", params: {}, control: true }, { id: "small", params: { max: 2 } }],
	seeds: [1, 2, 3], replicates: 1, design: "paired",
	metrics: { primary: "run.ticks", secondary: ["models.requests"], guardrails: [] },
	pass: { contrast: ["small", "control"], sign: "negative", minN: 2 },
	exclusions: ["error-end"],
	budget: { perRunUsd: 0.05, totalUsd: 0.06, estimateUsdPerRun: { control: 0.01, small: 0.01 } },
};

let cwd = "";
beforeAll(() => {
	cwd = mkdtempSync(join(tmpdir(), "swt-experiment-"));
	vi.stubGlobal("fetch", () => Promise.reject(new TypeError("a test reached the global fetch")));
});
afterAll(() => {
	vi.unstubAllGlobals();
	rmSync(cwd, { recursive: true, force: true });
});

// A01 guesses 1, 2, 3 and so on; every answer costs 0.0005 USD (the scripted model has no price, so the cost is set as the answer ends).
function source(): ModelSource {
	const scripted = scriptedSource({ "resident:A01": Array.from({ length: 20 }, (_, index) => act({ name: "guess", args: { value: index + 1 } })), "resident:A02": Array.from({ length: 40 }, () => say()), "resident:A03": Array.from({ length: 40 }, () => say()) });
	return {
		bind: (actor, limits) => {
			const binding = scripted.bind(actor, limits);
			return {
				...binding,
				streamFn: async (model, context, options) => {
					const stream = await binding.streamFn(model, context, options);
					const push = stream.push.bind(stream);
					stream.push = (event) => {
						push(event.type === "done" ? { ...event, message: { ...event.message, usage: { ...event.message.usage, cost: { ...event.message.usage.cost, total: 0.0005 } } } } : event);
					};
					return stream;
				},
			};
		},
	};
}

function terminal(): { readonly io: CliIo; readonly out: string[]; readonly err: string[] } {
	const [out, err]: [string[], string[]] = [[], []];
	return { io: { cwd, now: () => new Date("2026-11-14T12:00:00.000Z"), out: (line) => out.push(line), err: (line) => err.push(line), env, installed: { "guess-number": guessNumber } }, out, err };
}

/** Writes a spec file and runs `swt experiment run` on it with the scripted source. */
async function run(name: string, spec: ExperimentSpec, more: Partial<ExperimentInput> = {}): Promise<{ readonly code: number; readonly out: readonly string[]; readonly err: string }> {
	const { io, out, err } = terminal();
	writeFileSync(join(cwd, `${name}.json`), JSON.stringify(spec));
	return { code: await experimentRun({ spec: `${name}.json`, out: name, env, source, ...more }, io), out, err: err.join("\n") };
}

/** Runs a command through `main` and gives its exit code, its output and the first code of its errors. */
async function swt(...args: readonly string[]): Promise<readonly [number, string, string | undefined]> {
	const { io, out, err } = terminal();
	return [await main(args, io), out.join("\n"), /SWT-[A-Z]\d{3}/.exec(err.join("\n"))?.[0]];
}

const lines = (file: string): readonly string[] => readFileSync(join(cwd, file), "utf8").trim().split("\n");

describe("swt experiment", () => {
	it("runs a two-arm series that is stopped at its cap, continues under a raised total, and is analysed", async () => {
		writeFileSync(join(cwd, "ledger.jsonl"), '{"capUsd":1}\n');
		const plan = planRuns(SPEC).map((run) => `run ${run.index} ${run.arm} seed ${run.seed} replicate ${run.replicate}: series/guess-number-00${run.index + 1} ended with guess-number.solved, `);
		const stopped = await run("series", SPEC, { ledger: "ledger.jsonl" });
		expect([stopped.code, /SWT-[A-Z]\d{3}/.exec(stopped.err)?.[0]]).toEqual([6, "SWT-E004"]);
		expect(stopped.out.slice(0, 2)).toEqual([expect.stringMatching(/^guess-small: 6 runs, in this order \(arm\/seed\/replicate\): (control|small)\/\d\/0 /), "estimate: 0.06 USD of the cap 0.06 USD, at most 0.05 USD per run"]);
		expect(stopped.out.slice(2).map((line) => line.replace(/\d\.\d{4} USD$/, ""))).toEqual(plan.slice(0, 4));
		// A series that is not complete has no analysis (SWT-E011).
		expect(await swt("experiment", "analyse", "series")).toEqual([1, "", "SWT-E011"]);
		const before = readExperimentState(join(cwd, "series"));
		const raised = await run("series", { ...SPEC, budget: { ...SPEC.budget, totalUsd: 1 }, concurrency: 2 }, { ledger: "ledger.jsonl" });
		expect([raised.code, raised.err, raised.out[0]]).toEqual([0, "", stopped.out[0]]);
		expect(raised.out.slice(2).map((line) => line.replace(/\d\.\d{4} USD$/, "")).sort()).toEqual([...plan.slice(4), "complete: 6 runs, 6 included, 0.0255 USD; analyse with `swt experiment analyse series`"].sort());
		const state = readExperimentState(join(cwd, "series"));
		expect([state?.runs.slice(0, 4), state?.runs.length, state?.specHash]).toEqual([before?.runs, 6, before?.specHash]);
		// The ledger was passed on: every run reserved its cap and settled its cost.
		expect([lines("ledger.jsonl").filter((line) => line.includes('"reservedUsd":0.05')).length, lines("ledger.jsonl").filter((line) => line.includes('"costUsd"')).length]).toEqual([6, 6]);

		expect(await swt("experiment", "analyse", "series")).toEqual([0, expect.stringMatching(/^guess-small: kept \(estimate -10\.3\d+, n 3\): run\.ticks, small minus control /), undefined]);
		const results = parseExperimentResults(JSON.parse(readFileSync(join(cwd, "series/results.json"), "utf8")));
		expect([results.pass?.verdict, results.runs.length, results.spec.hash]).toEqual(["kept", 6, state?.specHash]);
		expect(lines("series/values.csv")).toEqual(["run,metric,value", ...results.values.map((row) => `${row.run},${row.metric},${String(row.value)}`)]);
		expect(lines("series/values.csv")).toHaveLength(13);
		expect(lines("series/README.md")).toEqual(expect.arrayContaining(["# Experiment guess-small", "- Verdict: **kept** (estimate -10.33, n 3)"]));
		// The same runs under another pass rule: the state file is rewritten here, because a changed rule is another spec for the runner.
		const analysed = async (pass: ExperimentSpec["pass"]): Promise<number> => {
			writeFileSync(join(cwd, "series/experiment.json"), JSON.stringify({ ...state, spec: { ...state?.spec, pass } }));
			return (await swt("experiment", "analyse", "series"))[0];
		};
		expect(await analysed({ contrast: ["small", "control"], sign: "positive", minN: 2 })).toBe(3);
		expect(await analysed({ contrast: ["small", "control"], sign: "negative", minN: 4 })).toBe(7);
		writeFileSync(join(cwd, "series/experiment.json"), JSON.stringify({ ...state, spec: { ...SPEC, pass: undefined } }));
		expect(await swt("experiment", "analyse", "series")).toEqual([0, expect.stringMatching(/^guess-small: no pass rule; 4 estimates in /), undefined]);
	});

	it("stops the series at once when a run leaks (exit 4), and after three runs the ledger refuses (exit 6)", async () => {
		const plant: EventSink = { write: () => { writeFileSync(join(cwd, "leaky/guess-number-001/notes.txt"), `Authorization: ${KEY}`); } };
		const leaky = await run("leaky", SPEC, { sinks: [plant] });
		expect([leaky.code, leaky.out.slice(2), /SWT-E007[^\n]*reported a leak/.test(leaky.err), leaky.err.includes(KEY)]).toEqual([4, [expect.stringMatching(/^run 0 \w+ seed \d replicate 0: failed in leaky\/guess-number-001 \(SWT-X030\)$/)], true, false]);
		expect([existsSync(join(cwd, "leaky", "guess-number-001", LEAK_FILE)), existsSync(join(cwd, "leaky/guess-number-002")), readExperimentState(join(cwd, "leaky"))?.runs.map((record) => record.status)]).toEqual([true, false, ["stopped"]]);
		writeFileSync(join(cwd, "full.jsonl"), '{"capUsd":0.04}\n');
		const refused = await run("refused", { ...SPEC, budget: { ...SPEC.budget, totalUsd: 1 } }, { ledger: "full.jsonl" });
		expect([refused.code, refused.out.slice(2).map((line) => line.replace(/^run \d \w+ seed \d /, "")), /SWT-E007[^\n]*3 runs in a row/.test(refused.err)]).toEqual([6, [1, 2, 3].map(() => "replicate 0: failed (SWT-C025)"), true]);
	});

	it("refuses before any run: a metric no mechanic exports (E010), a param the family does not declare, a missing file", async () => {
		const unknown = run("unknown", { ...SPEC, metrics: { ...SPEC.metrics, primary: "guess-number.nope" } });
		await expect(unknown).rejects.toMatchObject({ code: "SWT-E010" });
		await expect(run("param", { ...SPEC, arms: [{ id: "control", params: { size: 3 } }] })).rejects.toMatchObject({ code: "SWT-G041" });
		expect([existsSync(join(cwd, "unknown")), existsSync(join(cwd, "param"))]).toEqual([false, false]);
		expect(await swt("experiment", "run", "nowhere.json")).toEqual([1, "", "SWT-C024"]);
		expect(await swt("experiment", "analyse", "nowhere")).toEqual([1, "", "SWT-C024"]);
		expect((await swt("experiment", "run"))[2]).toBe("SWT-C003");
	});
});

describe("swt report", () => {
	it("writes REPORT.md with the computed facts, exits 1 on a folder that is no run and 4 when the folder holds a key value", async () => {
		expect(await swt("report", "series/guess-number-001")).toEqual([0, "report: series/guess-number-001/REPORT.md", undefined]);
		const text = lines("series/guess-number-001/REPORT.md");
		expect(text).toEqual(expect.arrayContaining(["# Run guess-number-001", "| `run.ticks` | Ticks |  | 7 |", "| `models.costUsd` | Cost | USD | 0.0045 |", LOOPHOLE_HEADING]));
		expect((await swt("report", "series/guess-number-002", "--game", fileURLToPath(import.meta.url)))[0]).toBe(0);
		expect(await swt("report", "series")).toEqual([1, "", "SWT-E001"]);
		writeFileSync(join(cwd, "series/guess-number-002/notes.txt"), `Authorization: ${KEY}`);
		expect(await swt("report", "series/guess-number-002")).toEqual([4, "report: series/guess-number-002/REPORT.md", "SWT-X030"]);
		expect(await swt("experiment", "analyse", "series")).toMatchObject([4, expect.any(String), "SWT-X030"]);
	});
});
