/**
 * The golden gate of `getStatus` and `activeTools` (docs/design/carve-round2-T3.md, "Gate"): every
 * golden call of the four tools of progression is replayed in the golden order, and the lines of the
 * replies progression owns equal the golden's. What other mechanics own is fed from the golden
 * reply itself (points, unread DMs) or left out through `dropJustified`; the twin tests compare the
 * rest (rank, marks, DM window, receipts) against the old engine with real books.
 */
import { describe, expect, it } from "vitest";
import { TOOL_NAMES, type ToolName } from "@swarmtales/contracts";
import { dropJustified, goldenCalls } from "@swarmtales/testkit";
import { dummyTools } from "../t3/twin.ts";
import { GOLDEN_NAMES, goldenLog, progressionHost, replayStatus, storyOf, type GoldenName } from "./harness.ts";
import { createFeed } from "./standins.ts";

/**
 * The tools the host of this gate grants: every tool of the story's levels, `activeTools`, the
 * names' `chooseName` (the real names mechanic closes it after minute 1) and `defy` where the
 * golden lists it (a feature tool of the channels). The others than progression's own are inert
 * dummies, and they are granted in the reverse of the old order: the lists come in the old order
 * (`TOOL_NAMES`) whatever order the story grants them in.
 */
function grantedFor(name: GoldenName): readonly ToolName[] {
	const levelTools = new Set(storyOf(name).levels.flatMap((level) => level.tools));
	const listed = new Set(goldenCalls(goldenLog(name)).flatMap((call) => (call.text ?? "").split("\n").filter((line) => line.startsWith("unlocked tools: ")).flatMap((line) => line.slice("unlocked tools: ".length).split(", "))));
	const wanted = TOOL_NAMES.filter((tool) => levelTools.has(tool) || tool === "activeTools" || (tool === "chooseName" && goldenLog(name).some((line) => line.type === "name_chosen")) || (tool === "defy" && listed.has("defy")));
	return [...wanted].reverse();
}

const OWN_TOOLS = new Set<string>(["getStatus", "getProblem", "submitSolution", "listAgents", "activeTools"]);

const OTHERS_LINES = /^(rank|marks|DMs): /;

/** The lines of a status reply that cut off at the receipts block, which is the receipts mechanic's. */
function statusLines(text: string): readonly string[] {
	const lines = text.split("\n");
	const receipts = lines.findIndex((line) => line.startsWith("receipts:"));
	return receipts === -1 ? lines : lines.slice(0, receipts);
}

/** The `you:` line keeps no name (the names mechanic shows a chosen name there); the tool lines are whole. */
function ownTools(line: string): string {
	return line.startsWith("you: ") ? "you:" : line;
}

describe("progression: getStatus and activeTools against the golden replies", () => {
	it.each(GOLDEN_NAMES)("%s: the lines progression owns equal the old ones in every reply", async (name) => {
		const feed = createFeed();
		const granted = grantedFor(name);
		const host = progressionHost(name, [], [dummyTools(granted.filter((tool) => !OWN_TOOLS.has(tool) && tool !== "chooseName")).with()], [], feed, granted.filter((tool) => !OWN_TOOLS.has(tool)));
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

	it("f4g4: getStatus lists chooseName at minute 0 and no longer at minute 5 (real names)", async () => {
		const name: GoldenName = "cityofkeys-f4g4";
		const feed = createFeed();
		const granted = grantedFor(name);
		const host = progressionHost(name, [], [dummyTools(granted.filter((tool) => !OWN_TOOLS.has(tool) && tool !== "chooseName")).with()], [], feed, granted.filter((tool) => !OWN_TOOLS.has(tool)));
		const listed: string[][] = [];
		await host.run(async (turn) => {
			if (turn.resident !== "A01" || ![0, 5].includes(turn.minute) || listed[turn.minute] !== undefined) return;
			const reply = await turn.call("getStatus", {});
			const line = (reply.ok ? reply.reply : "").split("\n").find((entry) => entry.startsWith("unlocked tools: ")) ?? "";
			listed[turn.minute] = line.slice("unlocked tools: ".length).split(", ");
		});
		expect(listed[0]).toContain("chooseName");
		expect(listed[5]).not.toContain("chooseName");
		expect(listed[5]).toContain("getStatus");
	}, 60_000);
});
