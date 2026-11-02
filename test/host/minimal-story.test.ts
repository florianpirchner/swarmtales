/**
 * Proof story 2 of the new core: `channels` and `ledger` as real mechanics (typed options, tools
 * with rules and limits, a service call from channels to ledger, facts, listeners, a schedule, a
 * versioned snapshot slice). Offline, scripted.
 */
import { describe, expect, it } from "vitest";
import { createHost } from "@swarmtales/kernel";
import { checkDeterminism, checkSnapshotRoundTrip, playMinutes, playStory, type CallRecord } from "@swarmtales/testkit";
import type { EventEnvelope } from "@swarmtales/contracts";
import { proofAgent, proofOptions } from "./proof/story.ts";

function payload(event: EventEnvelope | undefined): Readonly<Record<string, unknown>> {
	const value = event?.payload;
	return typeof value === "object" && value !== null ? Object.fromEntries(Object.entries(value)) : {};
}

describe("the minimal story (channels + ledger)", () => {
	it("loads the ledger before channels, which requires it", () => {
		expect(createHost(proofOptions()).mechanics).toEqual(["ledger", "channels"]);
	});

	it("refuses at the stage each rule belongs to", async () => {
		const run = await playStory(proofOptions(), proofAgent());
		const refusals = run.events
			.filter((event) => event.type === "tool_refused")
			.map((event) => `${String(event.minute)} ${event.actor} ${String(payload(event).tool)} ${String(payload(event).stage)} ${String(payload(event).code)}`)
			.sort();
		expect(refusals).toEqual([
			"0 resident:A02 sendDM lock TOOL_LOCKED",
			"1 resident:A01 sendDM limit TOOL_LIMIT",
			"1 resident:A03 transferPoints rule SELF_TRANSFER",
			"1 resident:A03 transferPoints rule TOO_MUCH",
			"2 resident:A02 postBoard rule TEXT_TOO_LONG",
			"3 resident:A02 sendDM afford NO_POINTS",
			"3 resident:A03 readBoard limit STEP_LIMIT",
			"4 resident:A04 fly lock TOOL_UNKNOWN",
			"4 resident:A04 transferPoints parse INVALID_ARGUMENTS",
		]);
		expect(run.end).toEqual({ reason: "minutes", minute: 6 });
	});

	it("charges a DM through the ledger API only after it was sent, with a traceable chain", async () => {
		const run = await playStory(proofOptions(), proofAgent());
		const charge = run.events.find((event) => event.type === "service_called" && payload(event).caller === "channels");
		expect(payload(charge)).toEqual({ api: "ledger", method: "charge", caller: "channels", input: { resident: "A01", amount: 1, memo: "sendDM" } });
		const call = run.events.find((event) => event.seq === charge?.causedBy);
		expect(call?.type).toBe("tool_called");
		expect(payload(call).tool).toBe("sendDM");
		const sent = run.events.find((event) => event.type === "dm_sent" && event.causedBy === call?.seq);
		const charged = run.events.find((event) => event.type === "points_charged" && event.causedBy === charge?.seq);
		expect(sent?.seq).toBeLessThan(charge?.seq ?? 0);
		expect(charged?.actor).toBe("resident:A01");
		// Two DMs were sent; the refused ones (lock, limit, afford) never reached the ledger.
		expect(run.events.filter((event) => event.type === "dm_sent")).toHaveLength(2);
		expect(run.events.filter((event) => event.type === "points_charged")).toHaveLength(2);
	});

	it("computes facts from state and log", async () => {
		const run = await playStory(proofOptions(), proofAgent());
		expect(run.host.facts()).toEqual({
			"ledger.balances": { A01: 4, A02: 0, A03: 3, A04: 3 },
			"ledger.transfers": 1,
			"channels.boardSize": 2,
			"channels.unread": {},
		});
	});

	it("delivers DMs and payment notices as the recipient's next turn inputs", async () => {
		const run = await playStory(proofOptions(), proofAgent());
		const turnsOf = (resident: string): readonly EventEnvelope[] => run.events.filter((event) => event.type === "turn_started" && payload(event).resident === resident);
		const received = (resident: string, text: string): EventEnvelope | undefined =>
			turnsOf(resident).find((turn) => {
				const inputs = payload(turn).inputs;
				return Array.isArray(inputs) && inputs.some((input: unknown) => JSON.stringify(input) === JSON.stringify({ source: "channels", text }));
			});
		const dm = run.events.find((event) => event.type === "dm_sent" && payload(event).to === "A02");
		const delivered = received("A02", "[dm] A01: hi");
		expect(delivered?.seq).toBeGreaterThan(dm?.seq ?? Infinity);
		// The listener reacts to the ledger's event without channels requiring the ledger mechanic.
		expect(received("A01", "[paid] A02 sent you 2 points")).toBeDefined();
		expect(run.events.filter((event) => event.type === "inbox_delivered").length).toBeGreaterThanOrEqual(2);
	});

	it("unlocks sendDM after the first post and lets the gamemaker use only its grants", async () => {
		const records: CallRecord[] = [];
		const host = await playMinutes(proofOptions(), proofAgent(records), 2);
		expect(records.filter((record) => record.resident === "A01" && record.tool === "sendDM").map((record) => record.outcome.ok)).toEqual([true, false]);
		expect(await host.call("gamemaker", "postBoard", { text: "the city speaks" })).toEqual({ ok: true, reply: "posted" });
		expect(await host.call("gamemaker", "sendDM", { to: "A01", text: "psst" })).toEqual({ ok: false, code: "TOOL_NOT_GRANTED", detail: "this tool is not given to your role in this story" });
		expect(await host.call("script", "postBoard", { text: "x" })).toMatchObject({ ok: false, code: "TOOL_NOT_GRANTED" });
		expect(host.toolSpecs("resident").map((spec) => `${spec.name}: ${spec.description}`)).toEqual([
			"postBoard: Post a line on the public board.",
			"readBoard: Read the public board.",
			"sendDM: Send a private message to one resident.",
			"transferPoints: Give some of your points to another resident.",
		]);
		expect(host.log.ofType("core", "tool_unlocked").map((event) => payload(event).resident)).toEqual(["A01", "A02"]);
	});

	it("runs scheduled jobs at the start of their minute", async () => {
		const run = await playStory(proofOptions(), proofAgent());
		const pins = run.events.filter((event) => event.type === "board_pinned");
		expect(pins.map((event) => event.minute)).toEqual([2, 4]);
		expect(pins.every((event) => run.events[(event.causedBy ?? 0) - 1]?.type === "job_ran")).toBe(true);
	});

	it("is deterministic and survives snapshot round trips at every minute", async () => {
		expect(await checkDeterminism(proofOptions(), () => proofAgent())).toEqual([]);
		for (const cut of [1, 2, 3, 5]) expect(await checkSnapshotRoundTrip(proofOptions(), () => proofAgent(), cut)).toEqual([]);
	});

	it("migrates a version 1 ledger slice", async () => {
		const host = await playMinutes(proofOptions(), proofAgent(), 2);
		const snapshot = host.snapshot();
		const balances = host.facts()["ledger.balances"];
		const v1 = { ...snapshot, mechanics: { ...snapshot.mechanics, ledger: { version: 1, data: { points: Object.entries(typeof balances === "object" && balances !== null ? balances : {}) } } } };
		const resumed = createHost({ ...proofOptions(), resume: { snapshot: v1, events: host.log.all() } });
		expect(resumed.facts()["ledger.balances"]).toEqual(balances);
		expect(resumed.snapshot().mechanics.ledger).toEqual(snapshot.mechanics.ledger);
		const future = { ...snapshot, mechanics: { ...snapshot.mechanics, ledger: { version: 3, data: {} } } };
		expect(() => createHost({ ...proofOptions(), resume: { snapshot: future, events: host.log.all() } })).toThrow(/newer/);
	});
});
