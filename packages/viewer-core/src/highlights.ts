// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The lines of a run worth reading first, for the replay: what the run's report cites as evidence (`#seq`, with the
 * report's own sentence as the reason), and, without any model, the rare actions of the log (an event type that occurs
 * at most a few times: a forged receipt, a resignation, a verdict) and the refusals and accusations a story writes.
 * Each highlight carries the actor's last thought before it, when the log has one, so the reader sees why.
 * Pure and game-agnostic: it reads event types and counts, never a story's rules.
 */
import type { RunEvent } from "./events.ts";
import { reportLinks } from "./report-links.ts";

/**
 * A line of a run worth reading first.
 *
 * @public
 */
export interface Highlight {
	/** The seq of the event. */
	readonly seq: number;
	/** `report`: cited by REPORT.md or ANALYSIS.md; `rare`: a rare action; `notable`: a refusal, forgery, verdict and the like. */
	readonly source: "report" | "rare" | "notable";
	/** Why it is a highlight: the report's line, or the rule that picked it. */
	readonly reason: string;
	/** The actor's last thought before the event (a `thinking` line of the same actor), if any. */
	readonly thought?: { readonly seq: number; readonly text: string };
}

/** Bookkeeping lines of the runtime: never a highlight of their own. */
const PLUMBING = new Set(["run_start", "run_end", "agent_profile", "usage", "request", "turn_input", "pass_start", "round_start", "round_end", "turn_skipped", "tool_call", "tool_result", "thinking", "text", "notice", "context_reset", "gamemaker_thinking", "gamemaker_text", "gamemaker_turn", "gamemaker_call", "gamemaker_result"]);
/** Types whose name says something happened to the story's intent; kept even when frequent (a few of each). */
const NOTABLE = /refus|forg|lie|betray|resign|exile|verdict|accus|vote|tribunal|steal|bluff|challenge|reveal|caught/;
const RANGE = /#\d+\s*(?:to|-|–|\.\.)\s*#\d+/;
const RARE_MAX = 3;
const NOTABLE_PER_TYPE = 5;
const LOOK_BACK = 400;
const MAX_HEURISTIC = 40;
const REASON_LENGTH = 240;

// A Markdown line as plain text, cut to a readable length.
function plainLine(line: string): string {
	const text = line.replace(/^\s*(?:[-*+]|\d+\.|#+|>|\|)\s*/, "").replace(/\*\*|__|`/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\s*\|\s*/g, " · ").trim();
	return text.length > REASON_LENGTH ? `${text.slice(0, REASON_LENGTH - 1)}…` : text;
}

function textOf(event: RunEvent): string | undefined {
	const text = event.data.text;
	return typeof text === "string" && text.trim() !== "" ? text.trim() : undefined;
}

// The actor's last `thinking` line before `position` (within a window), for the "why".
function thoughtBefore(events: readonly RunEvent[], position: number, actor: string | undefined): Highlight["thought"] {
	if (actor === undefined) return undefined;
	for (let at = position - 1; at >= Math.max(0, position - LOOK_BACK); at--) {
		const event = events[at];
		if (event?.actor !== actor || event.type !== "thinking") continue;
		const text = textOf(event);
		if (text !== undefined) return { seq: event.seq, text };
	}
	return undefined;
}

type Picked = Omit<Highlight, "thought">;

// What the reports cite: one highlight per `#seq` of a line that the run has, the first line that cites it.
function cited(reports: readonly string[], known: ReadonlyMap<number, number>): Map<number, Picked> {
	const picked = new Map<number, Picked>();
	// A range ("events #1 to #5501") counts the log, it cites nothing.
	const lines = reports.flatMap((report) => report.split("\n")).filter((line) => !RANGE.test(line));
	for (const line of lines) {
		for (const link of reportLinks(line)) {
			if (known.has(link.seq) && !picked.has(link.seq)) picked.set(link.seq, { seq: link.seq, source: "report", reason: plainLine(line) });
		}
	}
	return picked;
}

// The rule that picks an event without any model: a rare type, or one of the first of a notable type.
function heuristicPick(event: RunEvent, count: number, notableSeen: Map<string, number>): Picked | undefined {
	if (count <= RARE_MAX) return { seq: event.seq, source: "rare", reason: `a rare action: ${event.type} happens ${count === 1 ? "once" : `${String(count)} times`} in this run` };
	const seen = notableSeen.get(event.type) ?? 0;
	if (!NOTABLE.test(event.type) || seen >= NOTABLE_PER_TYPE) return undefined;
	notableSeen.set(event.type, seen + 1);
	return { seq: event.seq, source: "notable", reason: `${event.type} (${String(count)} in this run; the first ${String(NOTABLE_PER_TYPE)} are listed)` };
}

// Adds the rare and the notable events to the picks, at most `MAX_HEURISTIC` of them.
function addHeuristic(events: readonly RunEvent[], picked: Map<number, Picked>): void {
	const counts = new Map<string, number>();
	for (const event of events) counts.set(event.type, (counts.get(event.type) ?? 0) + 1);
	const notableSeen = new Map<string, number>();
	let heuristic = 0;
	for (const event of events) {
		if (heuristic >= MAX_HEURISTIC) break;
		if (PLUMBING.has(event.type) || picked.has(event.seq)) continue;
		const pick = heuristicPick(event, counts.get(event.type) ?? 0, notableSeen);
		if (pick === undefined) continue;
		picked.set(event.seq, pick);
		heuristic++;
	}
}

/**
 * The highlights of a run, in log order. `reports` are the report texts (REPORT.md, ANALYSIS.md) that cite `#seq`.
 *
 * @param events - The events of the run.
 * @param reports - The report texts that cite `#seq`.
 * @returns The highlights, each with the actor's last thought before it when the log has one.
 * @public
 */
export function highlightsOf(events: readonly RunEvent[], reports: readonly string[] = []): readonly Highlight[] {
	const positionOf = new Map(events.map((event, position) => [event.seq, position]));
	const picked = cited(reports, positionOf);
	addHeuristic(events, picked);
	return [...picked.values()]
		.sort((a, b) => (positionOf.get(a.seq) ?? 0) - (positionOf.get(b.seq) ?? 0))
		.map((highlight) => {
			const position = positionOf.get(highlight.seq) ?? 0;
			const event = events[position];
			const thought = event === undefined || event.type === "thinking" ? undefined : thoughtBefore(events, position, event.actor);
			return thought === undefined ? highlight : { ...highlight, thought };
		});
}
