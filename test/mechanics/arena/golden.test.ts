/**
 * The golden gate of the arena (step 18, team A1). Each golden log is replayed on the real city with
 * the real arena (golden-host.ts):
 *
 * - the arena's lines (`run_start`, `round_start`, `pass_start`, `round_end` with its standings,
 *   `run_end`) equal the golden's, line for line (`goldenDiff`, nothing dropped: the standings'
 *   points, ranks, open tools and activations included);
 * - on both City of Keys logs every line the old engine wrote outside the app (every mechanic's
 *   line; the app's model and runner lines are not written by a host) equals the golden's in order,
 *   so `run_start` comes after the world's start lines, `round_end` after the minute's turns and
 *   before the gamemaker, and `run_end` after the act's end;
 * - on Whispers, whose holdout tribunal and the whisperer's own core motive are not loaded here, the
 *   order of the arena's lines among the lines of every loaded mechanic equals the golden's;
 * - every turn shows the golden's inputs in the golden's order (the policy's kinds from the arena):
 *   on the City of Keys every part but the standoff's held pieces; the runner's tools notice and the
 *   figure's cues are the app's.
 */
import { describe, expect, it } from "vitest";
import { legacyOwner } from "@swarmtales/chronicle";
import { dropJustified, goldenDiff, goldenOrder, ownedBy, type LegacyLine, type LegacyOwner } from "@swarmtales/testkit";
import { GOLDEN_NAMES } from "../puzzles/harness.ts";
import { replayArena } from "./golden-host.ts";

/** A line without its log position (the host numbers its own core events apart). */
function placed(line: LegacyLine): string {
	return JSON.stringify(Object.fromEntries(Object.entries(line).filter(([key]) => key !== "seq" && key !== "at")));
}

const outsideApp = (line: LegacyLine): boolean => legacyOwner(String(line.type)) !== "app";

/** The owners the Whispers replay loads (golden-host.ts). */
const LOADED: readonly LegacyOwner[] = ["arena", "ledger", "channels", "receipts", "marks", "cast", "petitions", "puzzles", "progression", "script", "whispers", "goals"];

describe.each(GOLDEN_NAMES)("the arena on golden %s", (name) => {
	it("writes the golden's arena lines, standings included", async () => {
		const run = await replayArena(name);
		const expected = ownedBy(run.golden, ["arena"]);
		expect(expected.filter((line) => line.startsWith('{"type":"round_end"')).length).toBeGreaterThan(10);
		expect(goldenDiff(expected, ownedBy(run.lines, ["arena"]))).toEqual([]);
	}, 120_000);

	it("keeps the golden's order across the mechanics", async () => {
		const run = await replayArena(name);
		if (name.startsWith("cityofkeys")) {
			const expected = run.golden.filter(outsideApp).map(placed);
			expect(expected.length).toBeGreaterThan(400);
			expect(run.lines.filter(outsideApp).map(placed)).toEqual(expected);
			return;
		}
		expect(goldenOrder(run.lines, LOADED)).toEqual(goldenOrder(run.golden, LOADED));
	}, 120_000);

	it("shows every turn the golden's inputs in the golden's kind order", async () => {
		const run = await replayArena(name);
		const turns = run.golden.filter((line) => line.type === "turn_input");
		expect(turns.length).toBeGreaterThan(50);
		const app = (part: string): boolean => part.startsWith("[tools] ") || part.startsWith("[you");
		const partsOf = (line: LegacyLine): readonly string[] => (Array.isArray(line.inputs) ? line.inputs.map(String) : []);
		dropJustified(turns.flatMap(partsOf), app, "the runner's tools notice and the figure's cues (FigureCues) are the app's, not a mechanic's");
		const wrong = turns.flatMap((line) => {
			const key = `${String(line.minute)}:${String(line.agent)}:${String(line.pass)}`;
			const kept = partsOf(line).filter((part) => !app(part));
			const ours = run.inputs.get(key) ?? [];
			if (!name.startsWith("cityofkeys")) {
				// Whispers: the holdout tribunal (task rule, status part) is not loaded; the kinds' order and count still hold.
				return kept.length === ours.length && kept[0]?.startsWith("[status] ") === ours[0]?.startsWith("[status] ") && kept.at(-1) === ours.at(-1) ? [] : [key];
			}
			// The standoff's part (`you hold for others: ...`) needs the standoff, which this replay does not load.
			const status = (part: string | undefined): string | undefined =>
				part
					?.split(" · ")
					.filter((piece) => !piece.startsWith("you hold for others: "))
					.join(" · ");
			return kept.length === ours.length && kept.every((part, index) => (index === 0 ? status(part) === status(ours[0]) : part === ours[index])) ? [] : [key];
		});
		expect(wrong).toEqual([]);
	}, 120_000);
});
