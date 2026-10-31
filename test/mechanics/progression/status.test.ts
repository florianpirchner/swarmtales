/**
 * The golden gate of `getStatus` and `activeTools` (docs/design/carve-round2-T3.md, "Gate"): every
 * golden call of the four tools of progression is replayed in the golden order, and the lines of the
 * replies progression owns equal the golden's. What other mechanics own is fed from the golden
 * reply itself (points, unread DMs) or left out through `dropJustified`; the twin tests compare the
 * rest (rank, marks, DM window, receipts) against the old engine with real books.
 */
import { describe, expect, it } from "vitest";
import { dropJustified, goldenCalls } from "@swarmtales/testkit";
import { GOLDEN_NAMES, goldenLog, progressionHost, replayStatus } from "./harness.ts";
import { createFeed } from "./standins.ts";

/** The tools the host of this gate grants; the golden status lists the tools of every other mechanic too. */
const GRANTED = new Set(["getStatus", "getProblem", "submitSolution", "listAgents", "activeTools"]);

const OTHERS_LINES = /^(rank|marks|DMs): /;

/** The lines of a status reply that cut off at the receipts block, which is the receipts mechanic's. */
function statusLines(text: string): readonly string[] {
	const lines = text.split("\n");
	const receipts = lines.findIndex((line) => line.startsWith("receipts:"));
	return receipts === -1 ? lines : lines.slice(0, receipts);
}

/** A tools line cut to the granted tools; the `you:` line keeps no name (the names mechanic shows a chosen name there). */
function ownTools(line: string): string {
	if (line.startsWith("you: ")) return "you:";
	const found = /^(unlocked tools|active tools): (.*)$/.exec(line);
	return found === null ? line : `${found[1] ?? ""}: ${(found[2] ?? "").split(", ").filter((tool) => GRANTED.has(tool)).join(", ")}`;
}

describe("progression: getStatus and activeTools against the golden replies", () => {
	it.each(GOLDEN_NAMES)("%s: the lines progression owns equal the old ones in every reply", async (name) => {
		const feed = createFeed();
		const host = progressionHost(name, [], [], [], feed);
		const outcomes = await replayStatus(host, name, feed);
		expect(outcomes).toHaveLength(goldenCalls(goldenLog(name)).filter((call) => ["getStatus", "activeTools", "getProblem", "submitSolution"].includes(call.tool)).length);
		const statuses = outcomes.filter((outcome) => outcome.tool === "getStatus");
		// The whispers golden has no getStatus call; its other replies are still compared below.
		if (statuses.length === 0) expect(name).toMatch(/^whispers/);
		if (statuses.length > 0) {
			const golden = dropJustified(
				statuses.flatMap((outcome) => statusLines(outcome.golden)),
				(line) => OTHERS_LINES.test(line),
				"rank needs every resident's points, marks and the DM window belong to other mechanics; the twin tests compare them with real books",
			);
			const ours = statuses.flatMap((outcome) => statusLines(outcome.text).filter((line) => !OTHERS_LINES.test(line)));
			expect(ours.map(ownTools)).toEqual(golden.kept.map(ownTools));
		}
		for (const outcome of outcomes.filter((entry) => entry.tool !== "getStatus")) {
			expect(ownTools(outcome.text), `${outcome.tool} of ${outcome.agent}`).toBe(ownTools(outcome.golden));
		}
	}, 60_000);
});
