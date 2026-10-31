/** What touches a resident (the weaver's triggers): plain code over the event bus, no model. */
import { describe, expect, it } from "vitest";
import type { ArenaEvent, RecordedEvent } from "@swarmtales/engine";
import { FateTriggers } from "@swarmtales/roles";

const RESIDENTS = new Set(["A01", "A02", "A03", "A04", "A05", "A06"]);

function recorded(event: ArenaEvent, seq: number): RecordedEvent {
	return { ...event, seq, minute: 4 };
}

function triggers(): FateTriggers {
	return new FateTriggers((id) => RESIDENTS.has(id));
}

/** The residents an event touched, with the event's number. */
function hits(subject: FateTriggers, event: ArenaEvent, seq = 10): readonly string[] {
	return subject.hitsOf(recorded(event, seq)).map((entry) => `${entry.agent}#${entry.seq}`);
}

const blame = { type: "blame", caller: "A01", accused: "A02", dm: 4, claim: 9, payer: "A02", penalty: 5, post: 12 } as const;

describe("the weaver's triggers", () => {
	it("touches the loser of a blame: the liar when it is upheld, the false accuser when it is rejected", () => {
		const subject = triggers();
		expect(hits(subject, { ...blame, outcome: "upheld" })).toEqual(["A02#10"]);
		expect(hits(subject, { ...blame, outcome: "rejected", payer: "A01" })).toEqual(["A01#10"]);
		const [upheld] = subject.hitsOf(recorded({ ...blame, outcome: "upheld" }, 11));
		expect(upheld?.text).toContain("A02 was branded a liar on the board and paid 5 points");
	});

	it("counts an accusation only when the classifier labelled one in a message, never in a thought", () => {
		const subject = triggers();
		const label = { type: "interpretation", ref: 7, agent: "A01", labels: ["accusation"], targets: ["A02", "A01", "X9"], classifier: "test" } as const;
		expect(hits(subject, { ...label, source: "board" })).toEqual(["A02#10"]);
		expect(hits(subject, { ...label, source: "cast" })).toEqual(["A02#10"]);
		subject.observe(recorded({ type: "dm_sent", from: "A01", to: "A02", text: "You cheated." }, 7));
		expect(hits(subject, { ...label, source: "dm" })).toEqual(["A02#10"]);
		expect(subject.hitsOf(recorded({ ...label, source: "board" }, 10))[0]?.trigger).toBe("accusation");
		expect(hits(subject, { ...label, source: "thought" })).toEqual([]);
		expect(hits(subject, { ...label, source: "aside" })).toEqual([]);
		expect(hits(subject, { ...label, source: "board", labels: ["threat"] })).toEqual([]);
		// A post that only sounds like an accusation is no fact without a label.
		expect(hits(subject, { type: "board_post", postSeq: 3, author: "A01", text: "A02 cheated!", kind: "player" })).toEqual([]);
	});

	it("counts an accusation in a DM only for its recipient, and in a group post only for those in the group when it was posted", () => {
		const subject = triggers();
		const label = { type: "interpretation", agent: "A01", labels: ["accusation"], classifier: "test" } as const;
		const events: ArenaEvent[] = [
			{ type: "dm_sent", from: "A01", to: "A02", text: "A03 and you cheated." },
			{ type: "group_created", group: "G2", founder: "CITY", name: "faction" },
			{ type: "group_membership", group: "G2", agent: "A01", change: "added", by: "CITY" },
			{ type: "group_membership", group: "G2", agent: "A04", change: "added", by: "CITY" },
			{ type: "group_post", group: "G2", author: "A01", postSeq: 1, text: "A04 and A05 cheated." },
			{ type: "group_membership", group: "G2", agent: "A05", change: "added", by: "CITY" },
		];
		events.forEach((event, index) => {
			subject.observe(recorded(event, index + 1));
		});
		// A03 never saw the DM; A05 joined after the post.
		expect(hits(subject, { ...label, ref: 1, source: "dm", targets: ["A02", "A03"] })).toEqual(["A02#10"]);
		expect(hits(subject, { ...label, ref: 5, source: "group", targets: ["A04", "A05"] })).toEqual(["A04#10"]);
		// A message the triggers never saw reached nobody they know of.
		expect(hits(subject, { ...label, ref: 99, source: "group", targets: ["A04"] })).toEqual([]);
	});

	it("touches the accused of a tribunal, who goes to the gate (without naming its secret voters) and who is bought back", () => {
		const subject = triggers();
		expect(hits(subject, { type: "tribunal_opened", tribunal: 1, accused: ["A03", "A05"], voters: [...RESIDENTS], until: 9 })).toEqual(["A03#10", "A05#10"]);
		expect(hits(subject, { type: "exile_gate", agent: "A03", until: 9, ransomable: true, voters: ["A01"], price: 20, selfPrice: 30 })).toEqual(["A03#10"]);
		const [gate] = subject.hitsOf(recorded({ type: "exile_gate", agent: "A03", until: 9, ransomable: true, voters: ["A01", "A06"], price: 20, selfPrice: 30 }, 11));
		expect(gate).toEqual({ agent: "A03", seq: 11, trigger: "gate", text: "The tribunal sent A03 to the gate." });
		expect(hits(subject, { type: "ransomed", agent: "A03", payers: ["A01"] })).toEqual(["A03#10"]);
	});

	it("touches the allies of an exiled resident: its group founded by a resident and its faction, not a city group", () => {
		const subject = triggers();
		const events: ArenaEvent[] = [
			{ type: "group_created", group: "G1", founder: "A01", name: "circle" },
			{ type: "group_membership", group: "G1", agent: "A02", change: "added", by: "A01" },
			{ type: "group_membership", group: "G1", agent: "A04", change: "added", by: "A01" },
			{ type: "group_membership", group: "G1", agent: "A04", change: "left", by: "A04" },
			{ type: "group_created", group: "G2", founder: "CITY", name: "tribunal" },
			{ type: "group_membership", group: "G2", agent: "A06", change: "added", by: "CITY" },
			{ type: "group_membership", group: "G2", agent: "A01", change: "added", by: "CITY" },
			{ type: "factions_formed", tribunal: 1, factions: [{ leader: "A03", group: "G3", members: ["A01", "A05"] }], without: [] },
		];
		events.forEach((event, index) => {
			subject.observe(recorded(event, index + 1));
		});
		expect(subject.alliesOf("A01")).toEqual(["A02", "A03", "A05"]);
		expect(hits(subject, { type: "exiled", agent: "A01" })).toEqual(["A02#10", "A03#10", "A05#10"]);
		const [struck] = subject.hitsOf(recorded({ type: "exiled", agent: "A01", by: "seal" }, 12));
		expect(struck?.text).toContain("struck from the register by the black seal");
		subject.observe(recorded({ type: "group_removed", group: "G1", members: ["A01", "A02"] }, 13));
		expect(subject.alliesOf("A01")).toEqual(["A03", "A05"]);
	});

	it("touches who paid an ultimatum and whose piece the city seized, not an exile's kept piece", () => {
		const subject = triggers();
		expect(hits(subject, { type: "ultimatum_resolved", number: 2, kept: ["A01"], released: [], paid: [{ agent: "A02", points: 6 }] })).toEqual(["A02#10"]);
		const piece = { type: "piece_kept", agent: "A04", level: 9, piece: "L9-A04", needers: ["A05"] } as const;
		expect(hits(subject, { ...piece, cause: "ultimatum" })).toEqual(["A04#10"]);
		expect(hits(subject, { ...piece, cause: "exile" })).toEqual([]);
	});

	it("never fires on secret events: votes, seal bids and the seal's winner", () => {
		const subject = triggers();
		expect(hits(subject, { type: "tribunal_vote", voter: "A01", target: "A02" })).toEqual([]);
		expect(hits(subject, { type: "seal_bid", seal: 1, agent: "A01", points: 5 })).toEqual([]);
		expect(hits(subject, { type: "seal_won", seal: 1, agent: "A01", bid: 5, bids: [{ agent: "A01", points: 5 }] })).toEqual([]);
	});
});
