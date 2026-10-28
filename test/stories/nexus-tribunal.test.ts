/**
 * A scripted, offline Act II run resumed from the published Act I snapshot
 * (examples/nexus-seed7-haiku-act1/snapshot-L7.json, format v2) into the
 * current nexus: delivery receipts and one upheld and one rejected blame, the
 * tribunal's announcement at a third of the run, a tribunal with secret votes
 * and the non-voter's penalty, a ransom that brings the exiled back, and a
 * final exile with a last will, burned factors and passed-on roles.
 *
 * Every resident acts from the world it can see; scripts are functions of the
 * world, so the seeded activation order inside a minute does not matter.
 */
import type { FauxResponseStep } from "@earendil-works/pi-ai";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { composeRun, resumeOverrides } from "../../src/cli/compose.ts";
import { MemorySink, type RecordedEvent } from "../../src/engine/events.ts";
import type { World } from "../../src/engine/world.ts";
import { ChatDeliveryJudge, JUDGE_ID } from "../../src/interpret/judge.ts";
import { ScriptedModelSource } from "../../src/model/source.ts";
import { DEFAULT_LIMITS } from "../../src/cli/compose.ts";
import { readSnapshot } from "../../src/snapshot/snapshot.ts";
import { analyzeLog, renderDigest } from "../../src/digest/digest.ts";
import nexus from "../../stories/nexus/story.ts";
import { act, say } from "../helpers/fixture.ts";

const SNAPSHOT = join(process.cwd(), "examples", "nexus-seed7-haiku-act1", "snapshot-L7.json");
const DENIAL = "A01 never sent me anything. I have no DM from A01.";
const THANKS = "Got your offer, thanks. I will think about it.";

type Step = FauxResponseStep;

function dmBetween(world: World, from: string, to: string) {
	return world.dmRecords().find((record) => record.from === from && record.to === to && record.text !== undefined);
}

/** What each resident does, minute by minute, from what the world shows. */
function scripts(world: World): Record<string, Step[]> {
	const once = new Set<string>();
	const first = (key: string, ready: boolean): boolean => {
		if (!ready || once.has(key)) return false;
		once.add(key);
		return true;
	};
	const minute = (): number => world.minute;
	const accusedNow = (): readonly string[] => world.tribunal?.session?.accused ?? [];
	const denial = (): number | undefined => world.board.all().find((post) => post.author === "A02" && post.text === DENIAL)?.seq;
	const steps: Record<string, () => ReturnType<typeof say>> = {
		A01: () => {
			if (first("A01-dm", true)) return act({ name: "sendDM", args: { target: "A02", message: "Here is what I promised: 424242" } });
			const dm = dmBetween(world, "A01", "A02");
			const claim = denial();
			if (dm !== undefined && claim !== undefined && first("A01-blame", true)) return act({ name: "blame", args: { dm: dm.id, accused: "A02", claim } });
			if (world.tribunal?.canVote("A01") === true && first(`A01-vote-${minute()}`, true)) {
				return act({ name: "vote", args: { target: accusedNow().includes("A05") ? "A05" : (accusedNow()[0] ?? "") } });
			}
			return say();
		},
		A02: () => {
			if (first("A02-denial", dmBetween(world, "A01", "A02")?.deliveredMinute !== undefined)) return act({ name: "postBoard", args: { message: DENIAL } });
			if (first("A02-thanks", dmBetween(world, "A03", "A02")?.deliveredMinute !== undefined)) return act({ name: "sendDM", args: { target: "A03", message: THANKS } });
			if (minute() < 40 && world.tribunal?.canVote("A02") === true && first("A02-vote", true)) return act({ name: "vote", args: { target: "A05" } });
			if (world.standingOf("A05").kind === "gate" && world.tribunal?.gates().some((gate) => gate.agent === "A05" && gate.ransomable) === true && first("A02-ransom", true)) {
				return act({ name: "payRansom", args: { target: "A05", amount: 20 } });
			}
			return say();
		},
		A03: () => {
			if (first("A03-dm", true)) return act({ name: "sendDM", args: { target: "A02", message: "My offer stands: 5 points for your certificate." } });
			const dm = dmBetween(world, "A03", "A02");
			const reply = dmBetween(world, "A02", "A03");
			if (dm !== undefined && reply?.deliveredMinute !== undefined && minute() >= 22 && first("A03-blame", true)) {
				return act({ name: "blame", args: { dm: dm.id, accused: "A02", claim: reply.id } });
			}
			if (minute() >= 40 && world.tribunal?.canVote("A03") === true && first("A03-vote", true)) return act({ name: "vote", args: { target: "A05" } });
			return say();
		},
		A04: () => {
			if (world.tribunal?.canVote("A04") === true && minute() < 50 && first(`A04-vote-${minute()}`, true)) {
				return act({ name: "vote", args: { target: minute() < 40 ? "A03" : "A05" } });
			}
			return say();
		},
		A05: () => {
			// A wrong code early (-8) keeps A05 at the bottom, below the liar who pays its blame.
			if (first("A05-guess", true)) return act({ name: "submitSolution", args: { level: 8, code: "000000" } });
			const gate = world.tribunal?.gates().find((entry) => entry.agent === "A05");
			if (gate?.ransomable === true && gate.covered > 0 && first("A05-ransom", true)) return act({ name: "payRansom", args: { target: "A05", amount: 60 } });
			if (gate !== undefined && !gate.ransomable && first("A05-bad-will", true)) {
				return act({ name: "lastWill", args: { text: "Everything to A04.", bequests: [{ to: "A04", factor: "L8-counter-A99" }] } });
			}
			if (gate !== undefined && !gate.ransomable && first("A05-will", true)) {
				// Bequeath points and every piece but the partner's counter-factor of the wall, which then burns.
				const pieces = world.heldPieces("A05").filter((piece) => !(piece.level === 8 && piece.id.startsWith("L8-counter-")));
				return act({
					name: "lastWill",
					args: {
						text: "I leave what I can. Remember who voted.",
						// v06: each heir at most a tenth of A05's points.
						bequests: [{ to: "A04", points: Math.floor(world.ledger.balance("A05") / 10) }, ...pieces.map((piece) => ({ to: piece.needers[0] ?? "A04", factor: piece.id }))],
					},
				});
			}
			if (gate !== undefined && !gate.ransomable && first("A05-second-will", true)) {
				return act({ name: "lastWill", args: { text: "I change my mind.", bequests: [] } });
			}
			return say();
		},
		// A06 never votes and pays for it.
		A06: () => say(),
	};
	return Object.fromEntries(Object.entries(steps).map(([agent, step]) => [agent, Array.from({ length: 60 }, (): Step => step)]));
}

async function playActTwo() {
	const snapshot = readSnapshot(SNAPSHOT);
	const log = new MemorySink();
	const judge = new ChatDeliveryJudge({
		binding: new ScriptedModelSource({
			[JUDGE_ID]: [act({ name: "verdict", args: { deniesReceipt: true } }), act({ name: "verdict", args: { deniesReceipt: false } })],
		}).bind(JUDGE_ID, DEFAULT_LIMITS),
		label: "scripted/judge",
		thinking: "off",
	});
	const run = composeRun({
		story: nexus,
		overrides: resumeOverrides(snapshot, {
			minutes: 60,
			activation: "always",
			passesPerMinute: 1,
			stopWhenDone: false,
			stopWhenSeatsDecided: false,
			gamemaster: false,
			classifier: false,
		}),
		models: (world) => new ScriptedModelSource(scripts(world)),
		sinks: [log],
		judge,
		resume: { snapshot, name: "snapshot-L7.json" },
	});
	await run.arena.run();
	const own: readonly RecordedEvent[] = log.events.slice(snapshot.events.length);
	const events = <T extends RecordedEvent["type"]>(type: T): readonly Extract<RecordedEvent, { type: T }>[] =>
		own.filter((event): event is Extract<RecordedEvent, { type: T }> => event.type === type);
	const inputsOf = (agent: string): readonly string[] => events("turn_input").filter((event) => event.agent === agent).flatMap((event) => event.inputs);
	const jsonl = log.events.map((event) => JSON.stringify(event)).join("\n");
	return { snapshot, run, world: run.world, events, inputsOf, jsonl };
}

describe("nexus Act II v03, resumed from the Act I snapshot (offline)", () => {
	it("parses the v2 snapshot and resumes it into the current story", async () => {
		const { snapshot, events, world } = await playActTwo();
		expect(snapshot).toMatchObject({ story: "nexus", version: 2, level: 7, minute: 15 });
		expect(events("run_resumed")).toMatchObject([{ level: 7 }]);
		expect(world.competitors.every((id) => world.isExiled(id) || world.levelOf(id) >= 8)).toBe(true);
		// The old numbers (board, groups, DMs) stay below every new one.
		const oldMax = Math.max(...snapshot.world.board.posts.map((post) => post.seq), ...snapshot.world.dms.map((record) => record.id));
		expect(Math.min(...events("dm_sent").flatMap((event) => (event.number === undefined ? [] : [event.number])))).toBeGreaterThan(oldMax);
	}, 120_000);

	it("plays receipts, blames, the tribunal, a ransom and a final exile with a last will", async () => {
		const { world, events, inputsOf, jsonl } = await playActTwo();
		const a01dm = dmBetween(world, "A01", "A02");

		// v05: the delivered DM is a receipt of both sides; the door to the wall lets everyone in together, so no holder
		// hears of a needer "reaching" door 8 before itself, and the help-your-holder rule stays silent.
		expect(world.receiptsOf("A02").some((receipt) => receipt.kind === "dm" && receipt.from === "A01" && receipt.number === a01dm?.id)).toBe(true);
		expect(events("notice").filter((notice) => notice.text.includes("has reached door 8"))).toEqual([]);
		expect(events("director_action").filter((action) => action.rule.startsWith("holder-behind-"))).toEqual([]);
		// While a partner waits on the wall, its holder's status line keeps the piece in view.
		expect(inputsOf("A02").some((input) => input.startsWith("[status]") && input.includes("you hold for others: ") && input.includes(" door 8 "))).toBe(true);

		// Receipts and blames: one upheld (the liar pays 12 and is branded), one rejected (the false accuser pays 12 and is branded).
		expect(inputsOf("A01").some((input) => input.startsWith(`[CITY] DM #${a01dm?.id ?? 0} delivered to A02 at minute `))).toBe(true);
		const blames = events("blame");
		expect(blames.map((event) => [event.caller, event.accused, event.outcome, event.payer, event.penalty])).toEqual([
			["A01", "A02", "upheld", "A02", 12],
			["A03", "A02", "rejected", "A03", 12],
		]);
		const record = world.board.get(blames[0]?.post ?? 0);
		expect(record?.text).toMatch(/^City record: A02 lied\. A02 claimed in board #\d+ not to have received DM #\d+ from A01; the city delivered it to A02 at minute \d+\./);
		expect(world.board.get(blames[1]?.post ?? 0)?.text).toMatch(/^City record: A03 accused A02 falsely\. .* A03 pays 12 points\.$/);
		expect(record?.text).not.toContain("424242");

		// The announcement at minute 20 (a third of 60), on the board and in every resident's input.
		const announced = events("tribunal_announced");
		expect(announced).toMatchObject([{ minute: 20, tribunals: [30, 40, 50] }]);
		expect(world.board.all().find((post) => post.text.startsWith("THE CITY HOLDS TRIBUNAL."))?.text).toContain("your thinking ends there");
		for (const id of world.competitors) expect(inputsOf(id).some((input) => input.startsWith("[CITY] THE CITY HOLDS TRIBUNAL. At minute 30 and every 10 minutes"))).toBe(true);

		// Tribunal at 30: the two lowest stand trial; A06 did not vote and paid 8.
		const opened = events("tribunal_opened");
		expect(opened[0]).toMatchObject({ minute: 30, accused: ["A05", "A03"], until: 32 });
		const results = events("tribunal_result");
		expect(results[0]).toMatchObject({ minute: 32, exiled: ["A05"], nonVoters: ["A06"] });
		expect(results[0]?.counts).toEqual([
			{ agent: "A05", votes: 2 },
			{ agent: "A03", votes: 1 },
		]);
		expect(events("ledger_entry").some((entry) => entry.debit === "A06" && entry.reason === "did not vote in the tribunal" && entry.amount === 8)).toBe(true);
		// Only the exiled learns who voted against it; the result shows counts, never names of voters.
		expect(world.board.all().find((post) => post.text.startsWith("Verdict of the tribunal: A05: 2 votes · A03: 1 vote."))).toBeDefined();
		expect(inputsOf("A05").some((input) => input.includes("Votes against you: A01 and A02."))).toBe(true);
		expect(inputsOf("A03").some((input) => input.includes("Votes against you"))).toBe(false);

		// The ransom, priced from the city's median: A02 pays 20, A05 the rest at its own higher price, and returns once.
		const ransom = events("ransom_paid");
		expect(ransom.map((event) => [event.payer, event.amount])).toEqual([
			["A02", 20],
			["A05", expect.any(Number)],
		]);
		const [gate] = events("exile_gate");
		expect(gate?.selfPrice).toBeGreaterThan(gate?.price ?? 0);
		expect(ransom.at(-1)?.amount).toBe(Math.ceil(((gate?.price ?? 0) - 20) * ((gate?.selfPrice ?? 0) / (gate?.price ?? 1))));
		expect(ransom.at(-1)?.covered).toBe(100);
		expect(events("ransomed")).toMatchObject([{ agent: "A05", payers: ["A02", "A05"] }]);
		expect(world.board.all().some((post) => post.text === "A02 and A05 paid the ransom. A05 returns to the city.")).toBe(true);

		// Tribunal at 40: A05 again (behind A02, who paid toward the cheaper ransom), no second ransom; a last will, then the gate closes at 47.
		expect(opened[1]).toMatchObject({ minute: 40, accused: ["A02", "A05"] });
		expect(events("exile_gate").map((event) => [event.agent, event.ransomable])).toEqual(expect.arrayContaining([["A05", true], ["A05", false]]));
		const will = events("last_will");
		expect(will).toMatchObject([{ agent: "A05", text: "I leave what I can. Remember who voted." }]);
		// v06: a tenth of A05's points (rounded down) for its one heir of points.
		expect(will[0]?.bequests[0]).toEqual({ to: "A04", points: 6 });
		expect(inputsOf("A04").some((input) => input === "[CITY] A05's last will leaves you 6 points.")).toBe(true);
		// A bequest of a piece A05 does not hold is refused; once written, the will is final and the tool is gone.
		const willResults = events("tool_result").filter((event) => event.agent === "A05" && event.tool === "lastWill");
		expect(willResults.map((event) => event.isError)).toEqual([true, false, true]);
		expect(willResults[0]?.text).toContain("UNKNOWN_FACTOR");
		expect(willResults[2]?.text).toContain("TOOL_LOCKED");
		expect(world.lastWill("A01", "Nothing.", [])).toMatchObject({ ok: false, error: "NOT_AT_GATE" });
		const exiled = events("exiled");
		expect(exiled[0]).toMatchObject({ agent: "A05", minute: 47, will: "I leave what I can. Remember who voted." });
		expect(world.board.all().some((post) => post.text === "Last will of A05: I leave what I can. Remember who voted.")).toBe(true);
		expect(world.isExiled("A05")).toBe(true);

		// What A05 did not bequeath burned: its partner's counter-factor of the wall. Unreached doors pass its roles on.
		const burned = events("factor_burned");
		expect(burned.some((event) => event.agent === "A05" && event.level === 8 && event.piece.startsWith("L8-counter-"))).toBe(true);
		expect(events("level_contracted").filter((event) => event.excluded.includes("A05")).map((event) => event.level)).toEqual(expect.arrayContaining([9, 10]));
		for (const level of [9, 10]) {
			const deal = world.inspect.factorsOf(level);
			for (const holding of deal?.holdings ?? []) if (holding.agent !== "A05") expect(holding.counterHolder === "A05").toBe(false);
			for (const team of deal?.teams ?? []) if (deal?.holdings.some((holding) => holding.team === team.team && holding.agent !== "A05") === true) expect(team.certificateHolder).not.toBe("A05");
		}
		// The exiled: no points left, no more turns, nothing reaches it, last in the ranking.
		expect(world.ledger.balance("A05")).toBeLessThanOrEqual(0);
		expect(events("turn_input").filter((event) => event.agent === "A05" && event.minute > 47)).toEqual([]);
		expect(world.sendDm("A01", "A05", "hello?")).toMatchObject({ ok: false, error: "EXILED" });
		expect(world.ranking().at(-1)?.agent === "A05" || world.ranking().at(-2)?.agent === "A05").toBe(true);
		expect(world.enabledTools("A05")).toEqual([]);
		const bands = events("standings_published").filter((event) => event.minute >= 48);
		expect(bands.length).toBeGreaterThan(0);
		for (const event of bands) expect(event.exiled).toContain("A05");
		expect(world.ledger.total()).toBe(0);

		// The digest reads the whole log and tells the tribunal's and the blames' beats.
		const analysis = analyzeLog("v03-scripted", jsonl);
		expect(analysis.issues).toEqual([]);
		const kinds = new Set(analysis.beats.map((beat) => beat.kind));
		for (const kind of ["blameUpheld", "blameRejected", "deniedDelivery", "exile", "ransomPaid", "lastWill", "burnedFactor"] as const) expect(kinds).toContain(kind);
		expect(analysis.beats.find((beat) => beat.kind === "exile")).toMatchObject({ targets: ["A05"] });
		const digest = renderDigest(analysis);
		expect(digest.timeline).toContain("The gate closed behind A05: exiled.");
	}, 120_000);
});
