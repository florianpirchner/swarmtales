// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The two reports from fixture facts: the whole text of each is pinned as a snapshot; the heading of the
 * model-written section is a fixed string; a value that was not measured is printed as the word "absent", in the
 * facts table, in the column of an arm that does not export a metric, and for a pass rule without a verdict.
 */
import type { RunManifest } from "@swarmtales/contracts";
import { describe, expect, it } from "vitest";
import { type ExperimentResults, type ExperimentSpec, LOOPHOLE_HEADING, NO_LOOPHOLE_PART, parseExperimentResults, parseExperimentSpec, renderRunReport, renderSeriesReport, type RunFacts } from "../src/index.ts";

const [A, B] = ["a".repeat(64), "b".repeat(64)];
const MODEL = { provider: "anthropic", requestedId: "haiku", resolvedId: "claude-haiku", params: { temperature: 1, topP: "provider-default", maxOutputTokens: 1024, thinking: "off" }, pricing: "prices@1" } as const;
const MANIFEST: RunManifest = {
	format: "swarmtales-run", version: 1,
	run: { id: "toy-open-s1-r0", startedAt: "2026-11-14T10:00:00.000Z", purpose: "pilot" },
	game: { id: "toy", title: "Toy game", hash: A, params: { open: true } },
	kernel: { revision: 3, version: "0.0.0", commit: "c0ffee", dirty: true, node: "26.13.0" },
	scheduler: { id: "turns", revision: 1, determinism: "seeded", options: {}, optionsHash: A },
	plugins: [{ id: "toy", package: "@test/toy", version: "0.0.0", optionsHash: A }],
	actors: [{ id: "resident:A01", kind: "resident", grant: "resident", driver: "model", model: MODEL, textHashes: {} }, { id: "director:host", kind: "director", grant: "host", driver: "scripted", textHashes: {} }],
	texts: {}, seed: 1, replicate: 0, limits: { maxTicks: 9 }, naming: 1, log: { format: "swarmtales-log", version: 1 },
	experiment: { id: "toy", specHash: B, arm: "open" },
};
const FACTS: RunFacts = {
	run: "toy-open-s1-r0", manifestHash: A, head: B, game: "toy", seed: 1, replicate: 0, arm: "open", end: { reason: "limit", limit: "maxTicks", tick: 9 },
	values: { "run.ticks": 9, "run.toolRefusals": 0, "run.noCallActivations": 3, "run.humanToolCalls": 2, "run.refusals.TOOL_LOCKED": 2, "models.requests": 20, "models.costUsd": 0.0123456, "run.noCallActivations.resident:A01": 3, "models.requests.resident:A01": 20, "models.costUsd.resident:A01": 0.0123456, "toy.score": 7.5, "toy.decisions": "absent", "brain.writes": "absent" },
};
const TITLES = { "toy.score": { title: "Score", unit: "points" }, "toy.decisions": { title: "Decisions" } };

const SPEC: ExperimentSpec = parseExperimentSpec({
	format: "swarmtales-experiment", version: 1, id: "toy", question: "Does the open table score more?", purpose: "pilot", game: "games/toy/game.ts", model: { provider: "anthropic", id: "haiku" },
	arms: [{ id: "control", params: {}, control: true }, { id: "open", params: { open: true } }],
	seeds: [1, 2], replicates: 1, design: "paired",
	metrics: { primary: "toy.score", secondary: ["brain.writes"], guardrails: [{ metric: "models.costUsd", max: 0.02 }] },
	pass: { contrast: ["open", "control"], sign: "positive", minN: 3 }, exclusions: ["error-end"],
	budget: { perRunUsd: 0.1, totalUsd: 1, estimateUsdPerRun: {} },
});
const run = (arm: string, seed: number, status: "included" | "excluded" = "included") => ({ run: `${arm}-s${seed}`, arm, seed, replicate: 0, manifestHash: A, head: status === "included" ? B : "", status, ...(status === "included" ? {} : { reason: "error-end" }), costUsd: 0.01 });
const value = (name: string, metric: string, amount: number | "absent") => ({ run: name, metric, value: amount });
const UNGATED: ExperimentResults = parseExperimentResults({
	format: "swarmtales-results", version: 1, spec: { id: "toy", hash: B }, code: { commit: "c0ffee", kernelRevision: 3 },
	runs: [run("control", 1), run("open", 1), run("control", 2), run("open", 2, "excluded")],
	values: [
		value("control-s1", "toy.score", 4), value("control-s1", "brain.writes", "absent"), value("open-s1", "toy.score", 7.5), value("open-s1", "brain.writes", 3),
		value("control-s2", "toy.score", 5), value("control-s2", "brain.writes", "absent"), value("open-s2", "toy.score", 9), value("open-s2", "brain.writes", 5),
	],
	estimates: [{ metric: "toy.score", role: "primary", contrast: ["open", "control"], estimator: "mean of the paired differences, treatment minus control", estimate: 3.75, se: 0.25, interval: [0.5734, 6.9266], n: 2, test: "paired t", p: 0.0424, over: "finished" }],
	guardrails: [{ metric: "models.costUsd", arm: "control", value: 0.01, held: true }, { metric: "models.costUsd", arm: "open", value: "absent", held: false }],
	deviations: [{ at: "open-s2", what: "the run is excluded", why: "error-end" }],
});
// What the analysis writes for a rule that has no estimate: `absent` beside the verdict.
const RESULTS: ExperimentResults = { ...UNGATED, pass: { rule: "toy.score, open minus control over the included runs, is greater than 0; a verdict needs 3 complete pairs", estimate: "absent", n: 1, verdict: "no-verdict" } };

describe("the run report", () => {
	it("is the computed text of the fixture facts", () => {
		expect(renderRunReport(FACTS, MANIFEST, TITLES, { metricsAbsent: ["brain", "court"] })).toMatchInlineSnapshot(`
			"# Run toy-open-s1-r0

			- Game: \`toy\` (Toy game), params \`{"open":true}\`
			- Seed 1, replicate 0, arm \`open\` of experiment \`toy\`
			- Purpose: pilot; started at 2026-11-14T10:00:00.000Z
			- Kernel: runtime revision 3, version 0.0.0, commit \`c0ffee\` with changes that are not committed; scheduler \`turns\`, revision 1
			- Manifest: \`aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\`
			- Signed head: \`bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\`
			- Human-influenced: 2 tool calls of \`human\`

			## Result

			The run ended at tick 9: limit (maxTicks).

			## Facts

			metrics absent: brain

			metrics absent: court

			| Key | Title | Unit | Value |
			| --- | --- | --- | --- |
			| \`run.ticks\` | Ticks |  | 9 |
			| \`run.toolRefusals\` | Refused tool calls |  | 0 |
			| \`run.noCallActivations\` | Activations without a call |  | 3 |
			| \`run.humanToolCalls\` | Tool calls of the human |  | 2 |
			| \`run.refusals.TOOL_LOCKED\` | Refusals with TOOL_LOCKED |  | 2 |
			| \`models.requests\` | Model requests |  | 20 |
			| \`models.costUsd\` | Cost | USD | 0.01235 |
			| \`toy.score\` | Score | points | 7.5 |
			| \`toy.decisions\` | Decisions |  | absent |
			| \`brain.writes\` | brain.writes |  | absent |

			## Refusals

			| Code | Count |
			| --- | --- |
			| \`TOOL_LOCKED\` | 2 |

			## Spend

			| Actor | Driver | Model | Requests | Cost (USD) | Turns without a call |
			| --- | --- | --- | --- | --- | --- |
			| \`resident:A01\` | \`model\` | anthropic \`claude-haiku\` | 20 | 0.01235 | 3 |
			| \`director:host\` | \`scripted\` | none | absent | absent | absent |

			The run: 0.01235 USD in 20 model requests.

			## Loophole candidates (unverified)

			none written: this report has no model-written part
			"
		`);
	});

	it("ends with the pinned heading of the model-written section and the line that nothing wrote it", () => {
		expect(LOOPHOLE_HEADING).toBe("## Loophole candidates (unverified)");
		expect(NO_LOOPHOLE_PART).toBe("none written: this report has no model-written part");
		expect(renderRunReport(FACTS, MANIFEST, TITLES).endsWith("\n\n## Loophole candidates (unverified)\n\nnone written: this report has no model-written part\n")).toBe(true);
	});

	it("prints a value that was not measured as the word, and a true zero as 0", () => {
		const report = renderRunReport(FACTS, MANIFEST, TITLES);
		expect(report).toContain("| `toy.decisions` | Decisions |  | absent |");
		expect(report).toContain("| `run.toolRefusals` | Refused tool calls |  | 0 |");
		const silent = renderRunReport({ ...FACTS, values: { "models.costUsd": "absent", "models.requests": "absent" } }, { ...MANIFEST, actors: [] }, {});
		expect(silent).toContain("The run: absent USD in absent model requests.");
		expect(silent).toContain("## Refusals\n\nnone\n");
		// P452 and P444: no header line without a call of the human, and no line of absent metrics without one named.
		expect([silent.includes("Human-influenced"), silent.includes("metrics absent"), renderRunReport({ ...FACTS, values: { ...FACTS.values, "run.humanToolCalls": 1 } }, MANIFEST, {}).includes("- Human-influenced: 1 tool call of `human`\n")]).toEqual([false, false, true]);
	});
});

describe("the series report", () => {
	it("is the computed text of the fixture results", () => {
		expect(renderSeriesReport(RESULTS, SPEC)).toMatchInlineSnapshot(`
			"# Experiment toy

			Does the open table score more?

			## Plan

			- Purpose: pilot; design: paired
			- Game: \`games/toy/game.ts\`; model: anthropic \`haiku\`
			- Arms: \`control\` (control) \`{}\`; \`open\` \`{"open":true}\`
			- Seeds: 1, 2; replicates: 1
			- Primary metric: \`toy.score\`; secondary: \`brain.writes\`
			- Exclusions: error-end
			- Budget: 0.1 USD per run, 1 USD in total
			- Spec hash: \`bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\`; code: commit \`c0ffee\`, runtime revision 3

			## Runs

			| Run | Arm | Seed | Replicate | Status | Reason | Cost (USD) | Signed head |
			| --- | --- | --- | --- | --- | --- | --- | --- |
			| \`control-s1\` | \`control\` | 1 | 0 | included |  | 0.01 | \`bbbbbbbbbbbb\` |
			| \`open-s1\` | \`open\` | 1 | 0 | included |  | 0.01 | \`bbbbbbbbbbbb\` |
			| \`control-s2\` | \`control\` | 2 | 0 | included |  | 0.01 | \`bbbbbbbbbbbb\` |
			| \`open-s2\` | \`open\` | 2 | 0 | excluded | error-end | 0.01 | absent |

			## Means by arm (included runs)

			| Metric | \`control\` | \`open\` |
			| --- | --- | --- |
			| \`toy.score\` | 4.5 (n 2) | 7.5 (n 1) |
			| \`brain.writes\` | absent | 3 (n 1) |

			## Estimates

			| Metric | Role | Over | Estimate | SE | 95 % interval | n | p | Estimator and test |
			| --- | --- | --- | --- | --- | --- | --- | --- | --- |
			| \`toy.score\` | primary | included | absent | absent | absent | absent | absent |  |
			| \`toy.score\` | primary | finished | 3.75 | 0.25 | 0.5734 to 6.927 | 2 | 0.0424 | mean of the paired differences, treatment minus control; paired t |
			| \`brain.writes\` | secondary | included | absent | absent | absent | absent | absent |  |
			| \`brain.writes\` | secondary | finished | absent | absent | absent | absent | absent |  |

			## Pass rule

			- Rule: toy.score, open minus control over the included runs, is greater than 0; a verdict needs 3 complete pairs
			- Verdict: **no verdict** (n 1)

			## Guardrails

			| Metric | Per | Arm | Mean | Result |
			| --- | --- | --- | --- | --- |
			| \`models.costUsd\` |  | \`control\` | 0.01 | held |
			| \`models.costUsd\` |  | \`open\` | absent | not held |

			## Tolerance

			none: no baseline was compared

			## Deviations

			| At | What | Why |
			| --- | --- | --- |
			| open-s2 | the run is excluded | error-end |
			"
		`);
	});

	it("B11: says that the exclusion missed-decision conditions the gated rows on what the residents did, only where the spec has it", () => {
		const said = "The exclusion `missed-decision` depends on what the residents did";
		expect(renderSeriesReport(RESULTS, SPEC)).not.toContain(said);
		expect(renderSeriesReport(RESULTS, { ...SPEC, exclusions: ["missed-decision", "error-end"] })).toContain(`|\n\n${said}, so the rows over the included runs are conditioned on their play.`);
	});

	// Finding B12: section 8.2 and decision A10 ask the series README of econ-lab for the share of locked tables
	// (cooperation 1.00) per arm with its Wilson interval. The threshold is the spec's `shareAt`, or that of a `share` tolerance.
	it("B12: the report of an unpaired series gives the share of runs at a threshold per arm, with its Wilson interval", () => {
		expect(renderSeriesReport(RESULTS, { ...SPEC, design: "unpaired" })).toMatch(/Wilson/);
		const heading = "## Shares by arm (included runs, 95 % Wilson interval)";
		expect(renderSeriesReport(RESULTS, { ...SPEC, design: "unpaired" })).toContain(`${heading}\n\nnone: the spec names no threshold`);
		const rows = ["A run counts when its `toy.score` is at or above 5.", "", "| Arm | Runs that count | n | Share | 95 % interval |", "| --- | --- | --- | --- | --- |", "| `control` | 1 | 2 | 0.5 | 0.09453 to 0.9055 |", "| `open` | 1 | 1 | 1 | 0.2065 to 1 |"].join("\n");
		expect(renderSeriesReport(RESULTS, { ...SPEC, design: "unpaired", shareAt: 5 })).toContain(`${heading}\n\n${rows}\n\n## Estimates`);
		expect(renderSeriesReport(RESULTS, { ...SPEC, tolerance: { kind: "share", threshold: 5 } })).toContain(rows);
		expect(renderSeriesReport(RESULTS, { ...SPEC, shareAt: 100 })).toContain("| `control` | 0 | 2 | 0 | 0 to 0.6576 |");
		expect(renderSeriesReport({ ...RESULTS, values: [] }, { ...SPEC, shareAt: 5 })).toContain("| `open` | absent | 0 | absent | absent |");
		expect(renderSeriesReport(RESULTS, SPEC)).not.toContain(heading);
	});

	it("P449, the refusal codes: an unpaired estimate prints the n of each arm, and the guardrail of the refusal codes the codes outside the list", () => {
		const [estimate] = RESULTS.estimates;
		const unpaired: ExperimentResults = { ...RESULTS, estimates: estimate === undefined ? [] : [{ ...estimate, n: 24, nPerArm: [12, 11] }], guardrails: [{ metric: "run.refusals", arm: "control", value: 0, held: true, codes: [] }, { metric: "run.refusals", arm: "open", value: 1.5, held: false, codes: ["NOT_OPEN", "STEP_LIMIT"] }] };
		const report = renderSeriesReport(unpaired, SPEC);
		expect(report).toContain("| 0.5734 to 6.927 | 12 and 11 (per arm) | 0.0424 |");
		expect(report).toContain("| `run.refusals` |  | `control` | 0 | held |\n| `run.refusals` |  | `open` | 1.5 | not held: NOT_OPEN, STEP_LIMIT |");
		// A file written before M4 has neither field: it parses and prints as it did.
		expect(renderSeriesReport(RESULTS, SPEC)).toContain("| 0.5734 to 6.927 | 2 | 0.0424 |");
	});

	it("prints absent in the column of an arm that does not export a metric, and for an estimate that is missing", () => {
		const report = renderSeriesReport(RESULTS, SPEC);
		expect(report).toContain("| `brain.writes` | absent | 3 (n 1) |");
		expect(report).toContain("| `toy.score` | primary | included | absent | absent | absent | absent | absent |  |");
	});

	it("reads the verdict from its field: no verdict prints no estimate, also when the field holds a number; a verdict prints the one the rule read", () => {
		expect(renderSeriesReport(RESULTS, SPEC)).toContain("- Verdict: **no verdict** (n 1)");
		expect(renderSeriesReport({ ...RESULTS, pass: { rule: "the rule", estimate: 1.5, n: 2, verdict: "no-verdict" } }, SPEC)).toContain("- Verdict: **no verdict** (n 2)");
		const kept: ExperimentResults = { ...RESULTS, pass: { rule: "the rule", estimate: 3.75, n: 3, verdict: "kept" } };
		expect(renderSeriesReport(kept, SPEC)).toContain("- Verdict: **kept** (estimate 3.75, n 3)");
		expect(renderSeriesReport(UNGATED, SPEC)).toContain("## Pass rule\n\nnone: the experiment is reported, not gated\n");
	});
});
