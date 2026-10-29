/**
 * Markdown of `REPORT.md`. The header and the result tables are rendered
 * from the deterministic facts; the model-written sections only from items
 * that survived validation. Rendering is code, never model output.
 */
import { LABEL_TEXT } from "../interpret/labels.ts";
import type { GoalResult, ReportFacts, ResidentResult, SealResult, Stall } from "./facts.ts";

export interface ReportItem {
	readonly title: string;
	readonly text: string;
	/** Evidence `seq` references, ascending. */
	readonly evidence: readonly number[];
	/** Loopholes only: who found it. */
	readonly by?: "residents" | "gamemaker";
}

export interface ReportSections {
	readonly highlights: readonly ReportItem[];
	readonly problems: readonly ReportItem[];
	readonly optimizations: readonly ReportItem[];
	readonly loopholes: readonly ReportItem[];
}

/** What the reporter model spent on this report. */
export interface ReporterSpend {
	readonly requests: number;
	readonly input: number;
	readonly output: number;
	readonly cacheRead: number;
	readonly cacheWrite: number;
	readonly costUsd: number;
}

export type Narrative =
	| { readonly kind: "written"; readonly label: string; readonly sections: ReportSections; readonly warnings: readonly string[]; readonly spend: ReporterSpend }
	| { readonly kind: "skipped"; readonly reason: string; readonly label?: string; readonly spend?: ReporterSpend };

export const SECTION_TITLES = {
	highlights: "Digest highlights",
	problems: "Problems",
	optimizations: "Optimizations",
	loopholes: "Loophole candidates",
} as const;

export function renderReport(facts: ReportFacts, narrative: Narrative): string {
	const lines: string[] = [`# Run report: ${facts.run}`, ""];
	const writer = narrative.kind === "written" ? `written by ${narrative.label}` : `skipped: ${narrative.reason}`;
	lines.push(
		"First draft, written automatically after the run. The header and the result tables are computed in code",
		"from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model",
		`(${writer}) and cite \`#seq\` numbers in \`events.jsonl\`; items that cited unknown events were dropped.`,
		"Review the draft, and add confirmed loopholes and problems to `docs/LESSONS.md`.",
		"",
		...header(facts),
		"",
		"## Result",
		"",
		...result(facts, narrative),
		"",
		...residents(facts),
		"",
		...drama(facts),
	);

	if (narrative.kind === "written") {
		const { sections } = narrative;
		lines.push(`## ${SECTION_TITLES.highlights}`, "", ...bullets(sections.highlights, "Nothing stood out."), "");
		lines.push(`## ${SECTION_TITLES.problems}`, "", ...numbered(sections.problems, "None found."), "");
		lines.push(`## ${SECTION_TITLES.optimizations}`, "", ...bullets(sections.optimizations, "None proposed."), "");
		lines.push(`## ${SECTION_TITLES.loopholes}`, "", ...numbered(sections.loopholes, "None found."), "");
		if (narrative.warnings.length > 0) {
			lines.push("## Dropped from the model's answer", "", ...narrative.warnings.map((warning) => `- ${warning}`), "");
		}
	} else {
		lines.push("## Model-written sections", "", `Skipped: ${narrative.reason}. Regenerate with \`pnpm report:run <run-dir>\`.`, "");
	}
	if (facts.issues.length > 0) {
		lines.push("## Log issues", "", ...facts.issues.slice(0, 20).map((issue) => `- ${issue}`));
		if (facts.issues.length > 20) lines.push(`- and ${facts.issues.length - 20} more`);
		lines.push("");
	}
	return `${lines.join("\n").trimEnd()}\n`;
}

function header(facts: ReportFacts): readonly string[] {
	const rows: [string, string][] = [];
	if (facts.date !== undefined) rows.push(["Date", facts.date]);
	const story = facts.storyTitle === undefined ? (facts.storyId === undefined ? "unknown" : `\`${facts.storyId}\``) : `${facts.storyTitle}${facts.storyId === undefined ? "" : ` (\`${facts.storyId}\`)`}`;
	rows.push(["Story", story]);
	if (facts.seed !== undefined) rows.push(["Seed", String(facts.seed)]);
	rows.push([
		"Start",
		facts.start.kind === "fresh"
			? `fresh, level ${facts.start.level}`
			: `resumed from \`${facts.start.file}\` (minute ${facts.start.minute}, every competitor past level ${facts.start.level})`,
	]);
	rows.push(["Competitors", facts.models.competitors.length > 0 ? facts.models.competitors.join(", ") : "unknown"]);
	rows.push(["Gamemaker", facts.models.gamemaker]);
	rows.push(["Classifier", facts.models.classifier]);
	rows.push(["End", `minute ${facts.end.minute} (${facts.end.reason})`]);
	rows.push([
		"Counted",
		facts.counted.events === 0
			? "no events"
			: `events #${facts.counted.fromSeq} to #${facts.counted.toSeq} (${facts.counted.events} events${facts.start.kind === "resumed" ? "; the snapshot's prefix is not counted" : ""})`,
	]);
	return ["| | |", "|---|---|", ...rows.map(([key, value]) => `| ${key} | ${cell(value)} |`)];
}

/** The header, result and resident tables: everything computed in code. The prompt shows them to the model. */
export function factsMarkdown(facts: ReportFacts): readonly string[] {
	return [...header(facts), "", ...result(facts), "", ...residents(facts), "", ...drama(facts)];
}

/** The Cores and Goals tables (v09); nothing for a run without them. */
function drama(facts: ReportFacts): readonly string[] {
	const lines: string[] = [];
	const cored = facts.residents.filter((resident) => resident.core !== undefined);
	if (cored.length > 0) {
		lines.push("## Cores", "", "| Resident | Core |", "|---|---|", ...cored.map((resident) => `| ${residentLabel(resident)} | ${cell(resident.core ?? "")} |`), "");
	}
	if (facts.goals.length > 0) {
		const label = (agent: string): string => {
			const resident = facts.residents.find((entry) => entry.agent === agent);
			return resident === undefined ? agent : residentLabel(resident);
		};
		lines.push(
			"## Goals",
			"",
			"| Resident | Act | Goal | Outcome |",
			"|---|---:|---|---|",
			...facts.goals.map((goal: GoalResult) => `| ${label(goal.agent)} | ${goal.act} | ${cell(goal.text)} | ${goal.outcome}${goal.bonus > 0 ? ` (+${goal.bonus})` : ""} |`),
			"",
		);
	}
	return lines;
}

/** `seal 1: won by A01 for 6 (bids A01 6, A03 2), broken on A02 at minute 8 (#120)`. */
function sealText(seal: SealResult): string {
	const bids = seal.bids.length === 0 ? "" : ` (bids ${seal.bids.map((bid) => `${bid.agent} ${bid.points}`).join(", ")})`;
	const won = seal.winner === undefined ? "not sold" : `won by ${seal.winner.agent} for ${seal.winner.bid} (#${seal.winner.seq})${bids}`;
	const after = seal.used !== undefined ? `, broken on ${seal.used.target} at minute ${seal.used.minute} (#${seal.used.seq})` : seal.expired === undefined ? "" : `, gone: ${seal.expired}`;
	return `seal ${seal.seal}: ${won}${after}`;
}

function result(facts: ReportFacts, narrative?: Narrative): readonly string[] {
	const rows: [string, string][] = [];
	rows.push(["Levels solved", levelsSolved(facts)]);
	rows.push(["Stuck", stuck(facts.stalls)]);
	const ranked = facts.residents.filter((resident) => resident.rank !== undefined).sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
	rows.push(["Final standings", ranked.length === 0 ? "unknown" : ranked.map((resident) => `${residentLabel(resident)} ${resident.points ?? "?"}`).join(", ")]);
	if (facts.survivors !== undefined) {
		const seats = ranked.filter((resident) => resident.survivor).map(residentLabel);
		rows.push([`Survivors (${facts.survivors})`, seats.length === 0 ? "none" : seats.join(", ")]);
	}
	rows.push(["Cost", cost(facts)]);
	if (narrative !== undefined) rows.push(["Reporter", reporter(narrative)]);
	const { submissions } = facts;
	const wrongDetail =
		submissions.wrong === 0
			? ""
			: ` (${submissions.wrongBy
					.slice(0, 8)
					.map((entry) => `${entry.agent} on level ${entry.level} at minute ${entry.minute}`)
					.join(", ")}${submissions.wrongBy.length > 8 ? ", ..." : ""}; ${submissions.wrongPoints} points in total)`;
	rows.push(["Submissions", `${submissions.correct} correct, ${submissions.wrong} wrong${wrongDetail}`]);
	rows.push(["Quiet minutes", quiet(facts)]);
	rows.push(["Transfers", transfers(facts)]);
	const { messages } = facts;
	rows.push([
		"Messages",
		`${messages.dms} DMs, ${messages.boardByResidents} board posts by residents, ${messages.groupPosts} group posts` +
			(messages.castDms > 0 ? `, ${messages.castDms} DMs to the cast` : "") +
			(messages.boardByCity > 0 ? `; ${messages.boardByCity} city or system board posts` : ""),
	]);
	const { gamemaker } = facts;
	const gmErrors = [...gamemaker.errors].map(([code, count]) => `${count} ${code}`);
	rows.push([
		"Gamemaker",
		gamemaker.actions === 0 && gamemaker.failures === 0
			? "no actions"
			: `${gamemaker.actions} actions: ${[`${gamemaker.delivered} delivered`, ...gmErrors].join(", ")}${gamemaker.failures > 0 ? `; ${gamemaker.failures} failed turns` : ""}`,
	]);
	if (facts.seals.length > 0) rows.push(["Black seal", facts.seals.map(sealText).join("; ")]);
	rows.push(["Labels", facts.labels.size === 0 ? "none" : [...facts.labels].map(([label, count]) => `${LABEL_TEXT[label]} ${count}`).join(", ")]);
	rows.push(["Tool errors", facts.toolErrors.size === 0 ? "none" : [...facts.toolErrors].map(([code, count]) => `${code} ${count}`).join(", ")]);
	return ["| Metric | Value |", "|---|---|", ...rows.map(([key, value]) => `| ${key} | ${cell(value)} |`)];
}

/** `Mira (A03)` with a name (v08), else the ID. */
function residentLabel(resident: ResidentResult): string {
	return resident.name === undefined ? resident.agent : `${resident.name} (${resident.agent})`;
}

function residents(facts: ReportFacts): readonly string[] {
	if (facts.residents.length === 0) return [];
	const lines = ["| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |", "|---|---|---:|---|---:|---:|---:|"];
	for (const resident of facts.residents) {
		const ups = resident.levelUps.length === 0 ? "none" : resident.levelUps.map((up) => `${up.from}→${up.to} (${up.minute})`).join(", ");
		const seat = resident.survivor ? " (seat)" : "";
		lines.push(
			`| ${residentLabel(resident)}${seat} | ${resident.persona ?? "-"} | ${resident.startLevel} | ${ups} | ${finalLevel(facts, resident.finalLevel)} | ${resident.points ?? "-"} | ${resident.rank ?? "-"} |`,
		);
	}
	return lines;
}

/** "finished" once a resident is past the story's last level. */
function finalLevel(facts: ReportFacts, level: number): string {
	return facts.lastLevel !== undefined && level > facts.lastLevel ? `finished (${facts.lastLevel} solved)` : String(level);
}

function levelsSolved(facts: ReportFacts): string {
	const byLevel = new Map<number, string[]>();
	const ups = facts.residents.flatMap((resident) => resident.levelUps.map((up) => ({ agent: resident.agent, ...up })));
	for (const up of ups.sort((a, b) => a.seq - b.seq)) byLevel.set(up.from, [...(byLevel.get(up.from) ?? []), `${up.agent} at minute ${up.minute}`]);
	if (byLevel.size === 0) return "none this run";
	const total = facts.residents.length;
	return [...byLevel]
		.sort((a, b) => a[0] - b[0])
		.map(([level, solvers]) => `level ${level}: ${solvers.length} of ${total} (${solvers.length > 6 ? `${solvers.slice(0, 6).join(", ")}, ...` : solvers.join(", ")})`)
		.join("; ");
}

function stuck(stalls: readonly Stall[]): string {
	if (stalls.length === 0) return "nobody";
	const shown = stalls.slice(0, 8).map((stall) => `${stall.agent} on level ${stall.level} from minute ${stall.fromMinute} for ${stall.minutes} minutes${stall.untilEnd ? " (to the end)" : ""}`);
	return `${shown.join("; ")}${stalls.length > 8 ? `; and ${stalls.length - 8} more` : ""}`;
}

function usd(value: number, digits = 3): string {
	return value.toFixed(digits);
}

function cost(facts: ReportFacts): string {
	const split = facts.cost;
	if (split === undefined) return "unknown (usage.json is missing or malformed)";
	const parts = [`competitors ${usd(split.competitors)}`, `gamemaker ${usd(split.gamemaker)}`, `classifier ${usd(split.classifier)}`];
	if (split.other > 0) parts.push(`other ${usd(split.other)}`);
	const prefix = split.prefix === undefined ? "" : `; the snapshot's prefix added ${usd(split.prefix)}`;
	return `${usd(split.total)} USD for this run (${parts.join(", ")})${prefix}`;
}

function reporter(narrative: Narrative): string {
	const spend = narrative.spend;
	if (spend === undefined) return "skipped, no cost";
	return `${usd(spend.costUsd, 4)} USD (${narrative.label ?? "model"}, ${spend.requests} ${spend.requests === 1 ? "request" : "requests"}); not part of the run's budget`;
}

function quiet(facts: ReportFacts): string {
	const { quiet: count, of } = facts.quietMinutes;
	const spans = [...facts.deadSpans].sort((a, b) => b.minutes - a.minutes || a.fromMinute - b.fromMinute).slice(0, 3);
	const longest = spans.length === 0 ? "" : `; longest without one: ${spans.map((span) => `minutes ${span.fromMinute}-${span.toMinute} (${span.minutes})`).join(", ")}`;
	return `${count} of ${of} minutes without a submission${longest}`;
}

function transfers(facts: ReportFacts): string {
	const { count, points, refusals } = facts.transfers;
	const went = `${count} went through (${points} ${points === 1 ? "point" : "points"})`;
	if (refusals.length === 0) return `${went}; none refused`;
	const shown = refusals.slice(0, 6).map((refusal) => `${refusal.code} (${refusal.agent}, minute ${refusal.minute})`);
	return `${went}; ${refusals.length} refused: ${shown.join(", ")}${refusals.length > 6 ? ", ..." : ""}`;
}

function cite(seqs: readonly number[]): string {
	return seqs.map((seq) => `#${seq}`).join(", ");
}

function item(entry: ReportItem): string {
	const by = entry.by === undefined ? "" : ` (${entry.by === "gamemaker" ? "gamemaker" : "residents"})`;
	return `**${entry.title}**${by} ${entry.text} (${cite(entry.evidence)})`;
}

function bullets(items: readonly ReportItem[], empty: string): readonly string[] {
	return items.length === 0 ? [empty] : items.map((entry) => `- ${item(entry)}`);
}

function numbered(items: readonly ReportItem[], empty: string): readonly string[] {
	return items.length === 0 ? [empty] : items.map((entry, index) => `${index + 1}. ${item(entry)}`);
}

/** A table cell: one line, no pipes that would break the table. */
function cell(value: string): string {
	return value.replace(/\s+/g, " ").replace(/\|/g, "\\|");
}
