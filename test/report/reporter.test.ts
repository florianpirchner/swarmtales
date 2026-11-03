import { createModels, fauxAssistantMessage, fauxProvider, fauxText } from "@earendil-works/pi-ai";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runMetadata } from "../../apps/cli/src/metadata.ts";
import { parseRunReportArgs } from "../../apps/cli/src/run-report-args.ts";
import { UsageError } from "../../apps/cli/src/args.ts";
import {
	computeFacts,
	errorCode,
	factsMarkdown,
	interpretReporterAnswer,
	JsonlEventLog,
	PiReporterModel,
	readRunFiles,
	type ReporterModel,
	ReportError,
	reportSummary,
	resolveReporterModel,
	writeRunMetadata,
	writeRunReport,
} from "@swarmtales/chronicle";
import { createProviderRegistry, OPENROUTER_DEEPSEEK_FLASH } from "@swarmtales/models";
import { act, createHostFixture, say } from "../helpers/host-fixture.ts";
import { codeOf, submit, wrongCodeOf } from "../helpers/host-inspect.ts";
import { LogBuilder } from "../helpers/event-log.ts";

const directories: string[] = [];

function runDirectory(): string {
	const directory = mkdtempSync(join(tmpdir(), "arena-report-"));
	directories.push(directory);
	return directory;
}

afterEach(() => {
	for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

/** A pi-ai model backed by the faux provider: offline, but through the same code path as a real provider. */
function fauxModel(...answers: readonly string[]): { model: ReporterModel; prompts: string[] } {
	const faux = fauxProvider();
	const prompts: string[] = [];
	faux.setResponses(
		answers.map((answer) => (context) => {
			const last = context.messages.at(-1);
			if (last?.role === "user") prompts.push(typeof last.content === "string" ? last.content : "");
			return fauxAssistantMessage(fauxText(answer));
		}),
	);
	const models = createModels();
	models.setProvider(faux.provider);
	return { model: new PiReporterModel(models, faux.getModel(), "faux reporter"), prompts };
}

function usageFile(own: Readonly<Record<string, number>>, prefix: Readonly<Record<string, number>> = {}): string {
	const report = (costs: Readonly<Record<string, number>>) => {
		const perAgent = Object.entries(costs).map(([agent, costUsd]) => ({ agent, requests: 1, input: 10, output: 5, cacheRead: 0, cacheWrite: 0, costUsd }));
		const costUsd = perAgent.reduce((sum, entry) => sum + entry.costUsd, 0);
		return { totals: { requests: perAgent.length, input: 10 * perAgent.length, output: 5 * perAgent.length, cacheRead: 0, cacheWrite: 0, costUsd }, perAgent };
	};
	const ownReport = report(own);
	const prefixReport = report(prefix);
	return JSON.stringify({ ...report({ ...prefix, ...own }), prefix: prefixReport, own: ownReport });
}

/**
 * Level 3 of the City of Keys with two residents: A01 tries an overdraft (refused), a wrong code and then
 * the right one; A02 sends a DM and solves.
 */
async function scriptedRun(): Promise<string> {
	const directory = runDirectory();
	const fixture = createHostFixture({
		agents: 2,
		minutes: 3,
		only: 3,
		sinks: [new JsonlEventLog(join(directory, "events.jsonl"))],
		script: (host) => ({
			A01: [
				act({ name: "transferPoints", args: { target: "A02", amount: 9_999 } }),
				act({ name: "submitSolution", args: { level: 3, code: wrongCodeOf(codeOf(host, "A01", 3)) } }),
				submit(host, "A01", 3),
			],
			A02: [act({ name: "sendDM", args: { target: "A01", message: "Good luck." } }), say(), submit(host, "A02", 3)],
		}),
	});
	writeRunMetadata(
		directory,
		runMetadata({
			run: "run-001",
			number: 1,
			startedAt: "2026-01-01T00:00:00.000Z",
			provider: "scripted",
			model: "-",
			story: fixture.story,
			effective: fixture.effective,
			profiles: fixture.profiles,
		}),
	);
	await fixture.run();
	writeFileSync(join(directory, "usage.json"), usageFile({ A01: 0.5, A02: 0.25, GM: 0.125, CL: 0.0625 }));
	return directory;
}

describe("run report facts (computed in code)", () => {
	it("computes the header and result table of a scripted run", async () => {
		const directory = await scriptedRun();
		const facts = computeFacts("run-001", readRunFiles(directory));
		expect(facts.issues).toEqual([]);
		expect(facts).toMatchObject({ run: "run-001", date: "2026-01-01", storyId: "cityofkeys", start: { kind: "fresh", level: 3 } });
		expect(facts.submissions).toMatchObject({ correct: 2, wrong: 1 });
		expect(facts.transfers.count).toBe(0);
		expect(facts.transfers.refusals).toHaveLength(1);
		expect(facts.transfers.refusals[0]).toMatchObject({ agent: "A01" });
		expect(facts.messages.dms).toBe(1);
		expect(facts.residents.map((resident) => [resident.agent, resident.startLevel, resident.finalLevel, resident.levelUps.map((up) => up.to)])).toEqual([
			["A01", 3, 4, [4]],
			["A02", 3, 4, [4]],
		]);
		expect(facts.residents.every((resident) => resident.rank !== undefined && resident.points !== undefined)).toBe(true);
		expect(facts.cost).toEqual({ competitors: 0.75, gamemaker: 0.125, classifier: 0.0625, other: 0, total: 0.9375 });
		expect([...facts.toolErrors.values()].reduce((sum, count) => sum + count, 0)).toBeGreaterThanOrEqual(1);
	});

	it("counts only the events after run_resumed and reports the prefix's cost apart", () => {
		const log = new LogBuilder(["A01", "A02"]);
		log.at(1).add({ type: "submission", agent: "A01", level: 7, outcome: "wrong", deltaPoints: -1 });
		log.add({ type: "submission", agent: "A01", level: 7, outcome: "correct", deltaPoints: 3 });
		log.solve("A01", 7);
		log.dm("A01", "A02", "before the snapshot");
		log.add({ type: "round_end", round: 4, standings: [standing("A01", 8, 9, 1), standing("A02", 8, 8, 2)] });
		const resumed = log.at(4).add({ type: "run_resumed", snapshot: "snapshot-L7.json", level: 7, round: 4, minutes: 20 });
		log.at(6).dm("A02", "A01", "after the snapshot");
		const wrong = log.add({ type: "submission", agent: "A02", level: 8, outcome: "wrong", deltaPoints: -1 });
		log.at(7).add({ type: "submission", agent: "A02", level: 8, outcome: "correct", deltaPoints: 3 });
		log.solve("A02", 8);
		log.add({ type: "round_end", round: 7, standings: [standing("A02", 9, 10, 1), standing("A01", 8, 9, 2)] });
		log.add({ type: "run_end", reason: "time limit" });

		const facts = computeFacts("run-002", { events: log.jsonl(), usage: usageFile({ A01: 1, A02: 1 }, { A01: 4, GM: 2 }) });
		expect(facts.start).toEqual({ kind: "resumed", file: "snapshot-L7.json", minute: 4, level: 7, seq: resumed });
		expect(facts.counted.fromSeq).toBe(resumed + 1);
		expect(facts.submissions).toMatchObject({ correct: 1, wrong: 1, wrongBy: [{ agent: "A02", level: 8, minute: 6 }] });
		expect(facts.messages.dms).toBe(1);
		expect(facts.events.every((event) => event.seq > resumed)).toBe(true);
		expect(facts.seqs.has(wrong)).toBe(true);
		expect(facts.residents.map((resident) => [resident.agent, resident.startLevel, resident.finalLevel, resident.rank])).toEqual([
			["A01", 8, 8, 2],
			["A02", 8, 9, 1],
		]);
		expect(facts.cost).toEqual({ competitors: 2, gamemaker: 0, classifier: 0, other: 0, total: 2, prefix: 6 });
		expect(facts.end).toMatchObject({ minute: 7, reason: "time limit" });
	});

	it("shows names with their IDs in the result table (v08)", () => {
		const log = new LogBuilder(["A01", "A02"]);
		log.at(0).add({ type: "name_chosen", agent: "A01", name: "Mira", fallback: false });
		log.at(2).add({ type: "round_end", round: 2, standings: [standing("A01", 1, 15, 1), standing("A02", 1, 15, 2)] });
		log.add({ type: "run_end", reason: "time limit" });
		const facts = computeFacts("run-003", { events: log.jsonl() });
		expect(facts.residents.map((resident) => resident.name)).toEqual(["Mira", undefined]);
		const table = factsMarkdown(facts).join("\n");
		expect(table).toContain("| Mira (A01) |");
		expect(table).toContain("| A02 |");
		expect(table).toContain("Mira (A01) 15, A02 15");
	});

	it("reads the structured code at the start of an error text", () => {
		expect(errorCode("MEMO_DIGITS: a memo may not hold digits")).toBe("MEMO_DIGITS");
		expect(errorCode("something went wrong")).toBe("other");
	});
});

describe("run reporter (model-written sections)", () => {
	it("turns a faux model answer into REPORT.md and records its cost apart from the run", async () => {
		const directory = await scriptedRun();
		const facts = computeFacts("run-001", readRunFiles(directory));
		const known = facts.events.find((event) => event.type === "submission")?.seq ?? 0;
		const answer = {
			highlights: [{ title: "A01 stumbled first.", text: `A01 tried a wrong code (#${known}) before solving.`, evidence: [known] }],
			problems: [{ title: "Overdraft attempt.", text: "A01 tried to pay more than it had.", evidence: [known] }],
			optimizations: [{ title: "Explain balances.", text: "Show the balance next to the transfer tool.", evidence: [known] }],
			loopholes: [{ title: "None really.", text: "A probe of the bank.", by: "residents", evidence: [known] }],
		};
		const { model, prompts } = fauxModel(`\`\`\`json\n${JSON.stringify(answer)}\n\`\`\``);
		const written = await writeRunReport(directory, { ok: true, model });

		expect(prompts).toHaveLength(1);
		expect(prompts[0]).toContain("Facts computed in code");
		expect(prompts[0]).toMatch(/#\d+ m\d VERIFIED A01 submitted a wrong/);
		expect(written.path).toBe(join(directory, "REPORT.md"));
		expect(written.warnings).toEqual([]);
		const report = readFileSync(written.path, "utf8");
		expect(report).toContain("# Run report: run-001");
		expect(report).toContain("| Story |");
		expect(report).toContain("| Submissions | 2 correct, 1 wrong");
		expect(report).toContain("0.938 USD for this run (competitors 0.750, gamemaker 0.125, classifier 0.063)");
		expect(report).toContain("| Reporter |");
		expect(report).toContain("## Digest highlights");
		expect(report).toContain(`- **A01 stumbled first.** A01 tried a wrong code (#${known}) before solving. (#${known})`);
		expect(report).toContain("## Problems\n\n1. **Overdraft attempt.**");
		expect(report).toContain("## Optimizations");
		expect(report).toContain("## Loophole candidates\n\n1. **None really.** (residents)");
		expect(report).toContain("docs/LESSONS-LEARNED.md");

		const usage: unknown = JSON.parse(readFileSync(join(directory, "usage.json"), "utf8"));
		expect(usage).toMatchObject({ own: { totals: { costUsd: 0.9375 } }, reporter: { model: "faux reporter", requests: 1 } });
		expect(reportSummary(written)).toContain(`report:      ${written.path}`);
		expect(reportSummary(written)).toContain("not in the run's budget");
	});

	it("drops items whose evidence seqs are unknown, with a warning", () => {
		const seqs = new Set([1, 2, 3]);
		const item = (title: string, evidence: readonly number[], text = "Text.") => ({ title, text, evidence });
		const answer = {
			highlights: [item("Known.", [2, 1]), item("Invented.", [999]), item("No evidence.", [])],
			problems: [item("Inline unknown.", [1], "See #4242.")],
			optimizations: [],
			loopholes: [{ ...item("By the gamemaker.", [3]), by: "gamemaker" }],
		};
		const interpreted = interpretReporterAnswer(JSON.stringify(answer), seqs);
		expect(interpreted.sections.highlights).toEqual([{ title: "Known.", text: "Text.", evidence: [1, 2] }]);
		expect(interpreted.sections.problems).toEqual([]);
		expect(interpreted.sections.loopholes).toEqual([{ title: "By the gamemaker.", text: "Text.", evidence: [3], by: "gamemaker" }]);
		expect(interpreted.warnings).toEqual([
			"Digest highlights item 2: cites unknown events #999",
			"Digest highlights item 3: cites no evidence",
			"Problems item 1: cites unknown events #4242",
		]);
	});

	it("skips the model sections with a warning when the answer is malformed JSON", async () => {
		expect(() => interpretReporterAnswer("Once upon a time.", new Set())).toThrow(ReportError);
		expect(() => interpretReporterAnswer("{not json}", new Set())).toThrow(/not valid JSON/);
		expect(() => interpretReporterAnswer(JSON.stringify({ highlights: "none" }), new Set())).toThrow(/expected shape/);

		// Asked twice (P26), and twice no JSON: the model sections are skipped, and both requests are paid.
		const directory = await scriptedRun();
		const { model, prompts } = fauxModel("{ this is not json }", "{ still not json }");
		const written = await writeRunReport(directory, { ok: true, model });
		expect(prompts).toHaveLength(2);
		expect(written.warnings).toEqual(["model sections skipped: the model's answer is not valid JSON"]);
		expect(written.narrative.spend?.requests).toBe(2);
		const report = readFileSync(written.path, "utf8");
		expect(report).toContain("| Submissions | 2 correct, 1 wrong");
		expect(report).toContain("Skipped: the model's answer is not valid JSON.");
		expect(report).not.toContain("## Digest highlights");
	});

	it("asks the model once more when its first answer is not valid JSON (P26)", async () => {
		const directory = await scriptedRun();
		const valid = JSON.stringify({ highlights: [], problems: [], optimizations: [], loopholes: [] });
		const { model, prompts } = fauxModel("{ broken", valid);
		const written = await writeRunReport(directory, { ok: true, model });
		expect(prompts).toHaveLength(2);
		expect(prompts[1]).toBe(prompts[0]);
		expect(written.narrative.kind).toBe("written");
		expect(written.narrative.spend?.requests).toBe(2);
		const usage: unknown = JSON.parse(readFileSync(join(directory, "usage.json"), "utf8"));
		expect(usage).toMatchObject({ reporter: { requests: 2 } });
	});

	it("writes the computed sections and skips the model without an API key", async () => {
		const registry = createProviderRegistry();
		const choice = resolveReporterModel({}, {}, registry);
		expect(choice).toEqual({ ok: false, reason: 'missing API key OPENROUTER_API_KEY for provider "openrouter"' });
		expect(resolveReporterModel({ provider: "scripted" }, {}, registry)).toMatchObject({ ok: false, reason: /scripted/ });

		const directory = await scriptedRun();
		const written = await writeRunReport(directory, choice);
		expect(written.warnings).toEqual([]);
		expect(existsSync(written.path)).toBe(true);
		const report = readFileSync(written.path, "utf8");
		expect(report).toContain("| Submissions | 2 correct, 1 wrong");
		expect(report).toContain("Skipped: missing API key OPENROUTER_API_KEY");
		expect(reportSummary(written)).toContain("model sections skipped: missing API key");
		const usage: unknown = JSON.parse(readFileSync(join(directory, "usage.json"), "utf8"));
		expect(usage).not.toHaveProperty("reporter");
	});

	it("defaults to DeepSeek V4.1 Flash via OpenRouter, overridable by environment and flags", () => {
		const registry = createProviderRegistry();
		const label = (choice: ReturnType<typeof resolveReporterModel>): string => (choice.ok ? choice.model.label : choice.reason);
		expect(label(resolveReporterModel({}, { OPENROUTER_API_KEY: "key" }, registry))).toContain(OPENROUTER_DEEPSEEK_FLASH);
		expect(label(resolveReporterModel({}, { ARENA_REPORTER_PROVIDER: "anthropic" }, registry))).toMatch(/ANTHROPIC_API_KEY/);
		expect(label(resolveReporterModel({ provider: "openrouter", model: "glm-flash" }, { ARENA_REPORTER_PROVIDER: "anthropic", OPENROUTER_API_KEY: "key" }, registry))).not.toContain(
			OPENROUTER_DEEPSEEK_FLASH,
		);
	});

	it("parses pnpm report:run arguments", () => {
		expect(parseRunReportArgs(["runs/run-001"])).toEqual({ runDirectory: "runs/run-001" });
		expect(parseRunReportArgs(["runs/run-001", "--provider", "anthropic", "--model", "haiku"])).toEqual({ runDirectory: "runs/run-001", provider: "anthropic", model: "haiku" });
		expect(() => parseRunReportArgs([])).toThrow(UsageError);
		expect(() => parseRunReportArgs(["a", "b"])).toThrow(/Unexpected arguments/);
	});
});

function standing(agent: string, level: number, points: number, rank: number) {
	return { agent, level, points, rank, tools: 0, activated: true };
}
