/**
 * `swt run list|show|cost`: what a finished (or running) run left in its directory. `swt run` with
 * options, or `swt run start`, plays a story (main.ts); the dispatcher decides by the first word.
 */
import { UsageError } from "../args.ts";
import { json, parseFlags, table, usd, type CommandRun, type Noun } from "./io.ts";
import { chainStatus, findRunDirectory, listRunDirectories, stopReason, summarizeRun, type RunSummary } from "./run-files.ts";

function locate(positionals: readonly string[], runs: string | boolean | undefined): RunSummary {
	const [reference, ...rest] = positionals;
	if (reference === undefined || rest.length > 0) throw new UsageError("Name exactly one run");
	const directory = findRunDirectory(reference, typeof runs === "string" ? runs : "runs");
	if (directory === undefined) throw new UsageError(`No run "${reference}" (no events.jsonl there or under ${typeof runs === "string" ? runs : "runs"})`);
	return summarizeRun(directory);
}

function costOf(summary: RunSummary): number | undefined {
	return summary.usage?.totals.costUsd;
}

const list: CommandRun = (argv, io) => {
	const { flags } = parseFlags(argv, { runs: "string" });
	const directory = typeof flags.runs === "string" ? flags.runs : "runs";
	const rows = listRunDirectories(directory).map(summarizeRun);
	if (flags.json === true) {
		io.out(json(rows.map((row) => ({ run: row.name, directory: row.directory, story: row.meta.storyId ?? null, startedAt: row.meta.startedAt ?? null, minute: row.end?.minute ?? row.lastMinute ?? null, stop: stopReason(row), costUsd: costOf(row) ?? null }))));
		return 0;
	}
	if (rows.length === 0) {
		io.out(`No runs in ${directory}`);
		return 0;
	}
	io.out(table(["run", "story", "started", "minute", "stop", "cost USD"], rows.map((row) => [row.name, row.meta.storyId ?? "-", row.meta.startedAt?.slice(0, 16) ?? "-", String(row.end?.minute ?? row.lastMinute ?? "-"), stopReason(row), costOf(row) === undefined ? "-" : usd(costOf(row) ?? 0)])));
	return 0;
};

const show: CommandRun = (argv, io) => {
	const { positionals, flags } = parseFlags(argv, { runs: "string" });
	const summary = locate(positionals, flags.runs);
	const chain = chainStatus(summary);
	const standings = summary.end?.standings ?? [];
	if (flags.json === true) {
		io.out(json({ run: summary.name, directory: summary.directory, story: summary.meta.storyId ?? null, startedAt: summary.meta.startedAt ?? null, provider: summary.meta.provider ?? null, model: summary.meta.model ?? null, dials: summary.meta.effective ?? {}, resumedFrom: summary.meta.resumedFrom ?? null, stop: stopReason(summary), minute: summary.end?.minute ?? summary.lastMinute ?? null, standings, costUsd: costOf(summary) ?? null, requests: summary.usage?.totals.requests ?? null, log: chain }));
		return 0;
	}
	const dials = Object.entries(summary.meta.effective ?? {}).map(([key, value]) => `${key}=${typeof value === "string" ? value : JSON.stringify(value)}`);
	io.out(
		[
			`${summary.name}: ${summary.meta.storyId ?? "unknown story"}, started ${summary.meta.startedAt ?? "?"}`,
			`model: ${summary.meta.provider ?? "?"}/${summary.meta.model ?? "?"}`,
			...(summary.meta.resumedFrom === undefined ? [] : [`resumed from: ${summary.meta.resumedFrom.file} (level ${String(summary.meta.resumedFrom.level)}, minute ${String(summary.meta.resumedFrom.minute)})`]),
			`stop: ${stopReason(summary)}`,
			`cost: ${costOf(summary) === undefined ? "no usage.json" : `${usd(costOf(summary) ?? 0)} USD in ${String(summary.usage?.totals.requests ?? 0)} requests`}`,
			`signed log: ${chain}`,
			`dials: ${dials.join(" ") || "-"}`,
			"",
			standings.length === 0 ? "result: no standings (the run has no run_end)" : "result:",
			...(standings.length === 0 ? [] : [table(["rank", "agent", "level", "points", "tools"], standings.map((row) => [String(row.rank), row.agent, String(row.level), String(row.points), String(row.tools)]))]),
		].join("\n"),
	);
	return 0;
};

const cost: CommandRun = (argv, io) => {
	const { positionals, flags } = parseFlags(argv, { runs: "string" });
	const summary = locate(positionals, flags.runs);
	const usage = summary.usage;
	if (usage === undefined) {
		io.err(`No readable usage.json in ${summary.directory}`);
		return 1;
	}
	if (flags.json === true) {
		io.out(json(usage));
		return 0;
	}
	const totals = usage.totals;
	io.out(
		[
			`${summary.name}: ${usd(totals.costUsd)} USD, ${String(totals.requests)} requests`,
			`tokens: ${String(totals.input)} in, ${String(totals.output)} out, ${String(totals.cacheRead)} cache read, ${String(totals.cacheWrite)} cache write`,
			...(usage.prefix === undefined || usage.own === undefined ? [] : [`resumed run: ${usd(usage.prefix.totals.costUsd)} USD in the prefix, ${usd(usage.own.totals.costUsd)} USD its own`]),
			"",
			table(["agent", "requests", "cost USD"], usage.perAgent.map((row) => [row.agent, String(row.requests), usd(row.costUsd)])),
		].join("\n"),
	);
	return 0;
};

export const runInfoNoun: Noun = {
	name: "run",
	verbs: {
		list: { args: "[--runs <dir>]", summary: "the runs in a folder (default runs/)", run: list },
		show: { args: "<run> [--runs <dir>]", summary: "result, cost, stop reason, dials and the state of the signed log", run: show },
		cost: { args: "<run> [--runs <dir>]", summary: "tokens and cost, per competitor", run: cost },
	},
	note: ["<run> is a run directory, a name under --runs, or a recorded run folder such as stories/<story>/runs/<run>.", "All verbs take --json. To play a story: `swt run start [options]` or `swt run --story <name>` (options: pnpm start --help)."],
};
