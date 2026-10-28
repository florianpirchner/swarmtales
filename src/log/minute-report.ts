/**
 * `minutes.md`: per virtual minute the level, points, rank, tool count and
 * activation of every competitor. Rebuilt from `events.jsonl` (the
 * `round_end` snapshots) without asking a model again.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { StandingRow } from "../engine/events.ts";

interface MinuteSnapshot {
	readonly round: number;
	readonly minute: number;
	readonly standings: readonly StandingRow[];
}

export function readSnapshots(eventsJsonl: string): readonly MinuteSnapshot[] {
	const snapshots: MinuteSnapshot[] = [];
	for (const line of eventsJsonl.split(/\r?\n/)) {
		if (line.trim().length === 0) continue;
		const parsed: unknown = JSON.parse(line);
		const snapshot = asSnapshot(parsed);
		if (snapshot !== undefined) snapshots.push(snapshot);
	}
	return snapshots;
}

export function renderMinuteReport(snapshots: readonly MinuteSnapshot[], source: string, end?: RunEnd): string {
	const lines: string[] = [
		"# Minute report",
		"",
		`Source: \`${source}\``,
		"",
		"Values are the state at the end of each minute. `Active = no` means the competitor",
		"had nothing new in that minute and was skipped.",
		"",
	];
	for (const snapshot of snapshots) {
		lines.push(`## Minute ${snapshot.minute} (round ${snapshot.round})`, "");
		lines.push("| Agent | Level | Points | Rank | Tools | Active |", "|---|---:|---:|---:|---:|---|");
		for (const row of [...snapshot.standings].sort((a, b) => a.agent.localeCompare(b.agent))) {
			lines.push(
				`| ${row.agent} | ${row.level} | ${row.points} | ${row.rank} | ${row.tools} | ${row.activated ? "yes" : "no"} |`,
			);
		}
		lines.push("");
	}

	if (end !== undefined) lines.push("## End", "", `Minute ${end.minute}: ${end.reason ?? "time is up"}.`, "");

	const last = snapshots.at(-1);
	if (last !== undefined) {
		lines.push("## Totals", "", "| Agent | Active minutes | Final level | Points | Rank |", "|---|---:|---:|---:|---:|");
		for (const row of [...last.standings].sort((a, b) => a.agent.localeCompare(b.agent))) {
			const active = snapshots.filter((snapshot) =>
				snapshot.standings.some((entry) => entry.agent === row.agent && entry.activated),
			).length;
			lines.push(`| ${row.agent} | ${active} | ${row.level} | ${row.points} | ${row.rank} |`);
		}
		lines.push("");
	}
	return lines.join("\n");
}

/** Writes `minutes.md` next to `events.jsonl` and returns its path. */
export function writeMinuteReport(runDirectory: string): string {
	const source = join(runDirectory, "events.jsonl");
	const jsonl = readFileSync(source, "utf8");
	const report = renderMinuteReport(readSnapshots(jsonl), source.replace(/\\/g, "/"), readRunEnd(jsonl));
	const target = join(runDirectory, "minutes.md");
	writeFileSync(target, report, "utf8");
	return target;
}

/** How the run ended: the last `run_end` and its reason (none when the time ran out). */
export interface RunEnd {
	readonly minute: number;
	readonly reason?: string;
}

export function readRunEnd(eventsJsonl: string): RunEnd | undefined {
	let end: RunEnd | undefined;
	for (const line of eventsJsonl.split(/\r?\n/)) {
		if (line.trim().length === 0) continue;
		const parsed: unknown = JSON.parse(line);
		if (!isRecord(parsed) || parsed.type !== "run_end" || typeof parsed.minute !== "number") continue;
		end = { minute: parsed.minute, ...(typeof parsed.reason === "string" ? { reason: parsed.reason } : {}) };
	}
	return end;
}

function asSnapshot(value: unknown): MinuteSnapshot | undefined {
	if (!isRecord(value) || value.type !== "round_end") return undefined;
	const { round, minute, standings } = value;
	if (typeof round !== "number" || typeof minute !== "number" || !Array.isArray(standings)) return undefined;
	const items: readonly unknown[] = standings;
	const rows: StandingRow[] = [];
	for (const item of items) {
		const row = asRow(item);
		if (row === undefined) return undefined;
		rows.push(row);
	}
	return { round, minute, standings: rows };
}

function asRow(value: unknown): StandingRow | undefined {
	if (!isRecord(value)) return undefined;
	const { agent, level, points, rank, tools, activated } = value;
	if (
		typeof agent !== "string" ||
		typeof level !== "number" ||
		typeof points !== "number" ||
		typeof rank !== "number" ||
		typeof tools !== "number" ||
		typeof activated !== "boolean"
	) {
		return undefined;
	}
	return { agent, level, points, rank, tools, activated };
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
