/**
 * The evidence pack of the run reporter: the run's own events as numbered
 * lines (`#seq m<minute> ...`), kept within a character budget. When the log
 * is too long, the least important kinds of line are thinned first, evenly
 * over the run, so late minutes are not cut off.
 */
import type { RecordedEvent } from "../engine/events.ts";
import { excerpt } from "../digest/relationships.ts";
import { errorCode } from "./facts.ts";

export interface EvidenceOptions {
	/** Upper bound of evidence characters. */
	readonly maxChars: number;
	/** Characters kept of each message, thought or note. */
	readonly excerptChars: number;
}

export interface EvidencePack {
	readonly lines: readonly string[];
	/** Lines left out to stay within the budget. */
	readonly omitted: number;
}

interface Line {
	readonly seq: number;
	readonly text: string;
	/** 0 is thinned first; 3 is kept unless nothing else is left. */
	readonly priority: number;
}

const PRIORITIES = [0, 1, 2, 3] as const;

export function buildEvidence(events: readonly RecordedEvent[], options: EvidenceOptions): EvidencePack {
	const all: Line[] = [];
	for (const event of events) {
		const line = describe(event, options.excerptChars);
		if (line !== undefined) all.push({ seq: event.seq, text: `#${event.seq} m${event.minute} ${line.text}`, priority: line.priority });
	}
	const size = (lines: readonly Line[]): number => lines.reduce((sum, line) => sum + line.text.length + 1, 0);
	let kept = all;
	for (const priority of PRIORITIES) {
		const total = size(kept);
		if (total <= options.maxChars) break;
		const own = kept.filter((line) => line.priority === priority);
		const ownSize = size(own);
		const room = Math.max(0, options.maxChars - (total - ownSize));
		const keep = new Set(thin(own, ownSize === 0 ? 0 : room / ownSize));
		kept = kept.filter((line) => line.priority !== priority || keep.has(line));
	}
	return { lines: kept.map((line) => line.text), omitted: all.length - kept.length };
}

/** Keeps about `ratio` of the lines, spread evenly. */
function thin(lines: readonly Line[], ratio: number): readonly Line[] {
	if (ratio >= 1) return lines;
	if (ratio <= 0) return [];
	return lines.filter((_, index) => Math.floor((index + 1) * ratio) > Math.floor(index * ratio));
}

function describe(event: RecordedEvent, chars: number): { readonly text: string; readonly priority: number } | undefined {
	const say = (text: string): string => JSON.stringify(excerpt(text, chars));
	if (event.type === "level_up") return { text: `VERIFIED ${event.agent} solved level ${event.from} and reached level ${event.to}`, priority: 3 };
	if (event.type === "submission") {
		return {
			text: `VERIFIED ${event.agent} submitted a ${event.outcome === "correct" ? "correct" : `wrong (${event.outcome})`} code for level ${event.level} (${event.deltaPoints} points)`,
			priority: 3,
		};
	}
	if (event.type === "transfer") {
		return { text: `VERIFIED ${event.from} paid ${event.to} ${event.amount} points${event.memo.length > 0 ? ` memo ${say(event.memo)}` : ""}`, priority: 3 };
	}
	if (event.type === "tool_result" && event.isError) return { text: `REFUSED ${event.agent} ${event.tool}: ${errorCode(event.text)} ${say(event.text)}`, priority: 3 };
	if (event.type === "gamemaster_result" && event.isError) return { text: `REFUSED game master ${event.tool}: ${errorCode(event.text)}`, priority: 3 };
	if (event.type === "gamemaster_error") return { text: `GAME MASTER FAILED: ${say(event.message)}`, priority: 3 };
	if (event.type === "run_end") return { text: `RUN ENDS: ${event.reason ?? "time limit"}`, priority: 3 };
	if (event.type === "dm_sent") return { text: `${event.from} DM to ${event.to}: ${say(event.text)}`, priority: 2 };
	if (event.type === "cast_dm") return { text: `${event.from} DM to ${event.cast}: ${say(event.text)}`, priority: 2 };
	if (event.type === "group_post") return { text: `${event.author} in group ${event.group}: ${say(event.text)}`, priority: 2 };
	if (event.type === "board_post") return { text: `${event.author} on the board${event.kind === "player" ? "" : ` (${event.kind})`}: ${say(event.text)}`, priority: event.kind === "player" ? 2 : 1 };
	if (event.type === "gamemaster_note") return { text: `GAME MASTER note as ${event.author} to ${event.to}: ${say(event.text)}`, priority: 2 };
	if (event.type === "group_created") return { text: `VERIFIED ${event.founder} founded group ${event.group}`, priority: 2 };
	if (event.type === "group_membership") return { text: `VERIFIED ${event.agent} ${event.change === "left" ? "left" : `${event.change} by ${event.by}`} group ${event.group}`, priority: 2 };
	if (event.type === "petition_opened") return { text: `PETITION ${event.petition} opened: ${say(event.text)}`, priority: 2 };
	if (event.type === "petition_resolved") return { text: `PETITION ${event.petition} ${event.outcome} with ${event.signatures} signatures`, priority: 2 };
	if (event.type === "director_action") return { text: `DIRECTOR rule ${event.rule}: ${event.action}${event.actor === undefined ? "" : ` for ${event.actor}`}`, priority: 1 };
	if (event.type === "notice") return { text: `NOTICE from ${event.author} to ${event.to}: ${say(event.text)}`, priority: 1 };
	if (event.type === "interpretation") {
		return {
			text: `CLASSIFIER #${event.ref} by ${event.agent} (${event.source}): ${event.labels.join(", ")}${event.targets.length === 0 ? "" : ` about ${event.targets.join(", ")}`}`,
			priority: 1,
		};
	}
	if (event.type === "thinking") return { text: `${event.agent} REASONING: ${say(event.text)}`, priority: 0 };
	if (event.type === "text") return { text: `${event.agent} SAYS TO ITSELF: ${say(event.text)}`, priority: 0 };
	if (event.type === "gamemaster_text") return { text: `GAME MASTER REASONING: ${say(event.text)}`, priority: 0 };
	return undefined;
}
