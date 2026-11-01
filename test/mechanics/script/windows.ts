/**
 * The director's windows in a log: every run of lines that starts with a `director_action` and goes
 * on while the lines are of the kinds a director action causes (its posts, notices, cast and puzzle
 * lines, its own skips), with the line right before and right after it. The order gate compares
 * these windows of a golden log with the replay's, so a director that acts too early (before the
 * holder notices) or too late (after the `submission`) fails.
 */
import { goldenLine, type GoldenLine, type LegacyLine } from "@swarmtales/testkit";

/** The kinds of lines a director action writes through the mechanics it acts on. */
export const CAUSED = new Set([
	"director_action",
	"director_skipped",
	"standings_published",
	"board_post",
	"notice",
	"dm_sent",
	"cast_revealed",
	"cast_retired",
	"cast_level_set",
	"collection_started",
	"collection_revealed",
	"lottery_drawn",
	"factor_revealed",
	"ledger_entry",
	"receipt_issued",
	"petition_opened",
	"tools_unlocked",
]);

export interface Window {
	readonly before: LegacyLine | undefined;
	readonly lines: readonly GoldenLine[];
	readonly after: LegacyLine | undefined;
}

export function windowsOf(lines: readonly LegacyLine[]): readonly Window[] {
	const windows: Window[] = [];
	let index = 0;
	while (index < lines.length) {
		if (lines[index]?.type !== "director_action") {
			index += 1;
			continue;
		}
		const start = index;
		while (index < lines.length && CAUSED.has(String(lines[index]?.type))) index += 1;
		windows.push({ before: lines[start - 1], lines: lines.slice(start, index).map((line) => goldenLine(line)), after: lines[index] });
	}
	return windows;
}

/** A neighbour as the gate compares it: the whole line when the replay writes lines of its type, else only that it is foreign. */
export function neighbour(line: LegacyLine | undefined, produced: ReadonlySet<string>): string {
	if (line === undefined) return "(none)";
	return produced.has(String(line.type)) ? goldenLine(line) : `(foreign ${String(line.type)})`;
}
