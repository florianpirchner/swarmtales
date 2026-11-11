/**
 * `#123` references in a run report (`REPORT.md` cites its evidence as `#seq`) resolved to events,
 * so every claim is one click away from its line.
 */
import type { RunEvent } from "./events.ts";
import type { RunIndex } from "./run-index.ts";

export interface ReportLink {
	/** The seq the reference names. */
	readonly seq: number;
	/** Offsets of `#123` in the text (`end` exclusive). */
	readonly start: number;
	readonly end: number;
	/** The event, when the run has one with that seq. */
	readonly event?: RunEvent;
}

/** `#` and digits, not inside a word or an HTML entity (`&#123;`), not followed by a word character. */
const REFERENCE = /(?<![\w&#])#(\d{1,9})(?!\w)/g;

/** Every `#seq` reference of a Markdown text, in order; with an index, each is resolved to its event. */
export function reportLinks(markdown: string, index?: RunIndex): readonly ReportLink[] {
	return [...markdown.matchAll(REFERENCE)].map((match) => {
		const seq = Number(match[1]);
		const event = index?.bySeq(seq);
		return { seq, start: match.index, end: match.index + match[0].length, ...(event === undefined ? {} : { event }) };
	});
}
