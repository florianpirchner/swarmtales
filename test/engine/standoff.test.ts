import { describe, expect, it } from "vitest";
import type { ArenaEvent } from "../../src/engine/events.ts";
import { carriesValue, StandoffBook, type StandoffPiece } from "../../src/engine/standoff.ts";

/** Door 8: A01 holds A02's counter-factor, A02 holds A01's; A03 holds nothing. */
const PIECES: Readonly<Record<string, readonly StandoffPiece[]>> = {
	A01: [{ id: "L8-counter-A02", level: 8, label: "the counter-factor of A02 for door 8", value: "403343", needers: ["A02"] }],
	A02: [{ id: "L8-counter-A01", level: 8, label: "the counter-factor of A01 for door 8", value: "542489", needers: ["A01"] }],
	A03: [],
};

function book() {
	let minute = 10;
	const points = new Map([
		["A01", 50],
		["A02", 6],
		["A03", 40],
	]);
	const events: ArenaEvent[] = [];
	const notices: { agent: string; text: string }[] = [];
	const passed = new Set<string>();
	const exiled = new Set<string>();
	const standoff = new StandoffBook({
		ids: ["A01", "A02", "A03"],
		rule: { penalty: 10, maxMinutes: 5 },
		minute: () => minute,
		points: (agent) => points.get(agent) ?? 0,
		burn: (agent, amount) => points.set(agent, (points.get(agent) ?? 0) - amount),
		notify: (agent, _author, text) => notices.push({ agent, text }),
		emit: (event) => events.push(event),
		held: (agent) => (exiled.has(agent) ? [] : (PIECES[agent] ?? [])),
		needsNow: (agent, level) => level === 8 && !passed.has(agent) && !exiled.has(agent),
		inCity: (agent) => !exiled.has(agent),
	});
	return { standoff, events, notices, points, passed, exiled, at: (next: number) => (minute = next) };
}

describe("the give-first standoff (P43)", () => {
	it("finds a value only as a whole number", () => {
		expect(carriesValue("here: 403343, use it", "403343")).toBe(true);
		expect(carriesValue("1403343", "403343")).toBe(false);
		expect(carriesValue("4033430", "403343")).toBe(false);
	});

	it("reads a value split by separators or without its leading zeros", () => {
		expect(carriesValue("it is 403 343", "403343")).toBe(true);
		expect(carriesValue("403-343", "403343")).toBe(true);
		expect(carriesValue("40.33.43!", "403343")).toBe(true);
		expect(carriesValue("try 42317", "042317")).toBe(true);
		expect(carriesValue("12 403343", "403343")).toBe(true);
	});

	it("does not count a value hidden among decoys", () => {
		expect(carriesValue("one of these: 111111, 403343, 529001, 777777", "403343")).toBe(false);
		expect(carriesValue("yours is 403343, mine was 529001", "403343")).toBe(true);
	});

	it("notes a hand-over when the holder writes the value to the one who needs it, and only then", () => {
		const { standoff, events } = book();
		standoff.noteText("A01", ["A03"], "403343");
		expect(standoff.isGiven("A01", "A02", "L8-counter-A02")).toBe(false);
		standoff.noteText("A01", ["A02"], "Your factor is 403343.");
		expect(standoff.isGiven("A01", "A02", "L8-counter-A02")).toBe(true);
		expect(events).toEqual([{ type: "piece_given", holder: "A01", needer: "A02", level: 8, piece: "L8-counter-A02" }]);
		expect(standoff.outstanding()).toEqual([
			{ holder: "A02", needer: "A01", level: 8, pieces: [{ id: "L8-counter-A01", label: "the counter-factor of A01 for door 8" }] },
		]);
	});

	it("gives an ultimatum only to a pair that holds out on each other, and settles it: the giver keeps its points", () => {
		const { standoff, events, notices, points, at } = book();
		expect(standoff.issue("A01", "A03", 3, "Courier")).toMatchObject({ ok: false, error: "NO_STANDOFF" });
		expect(standoff.issue("A01", "A02", 9, "Courier")).toMatchObject({ ok: false, error: "INVALID_MINUTES" });
		const given = standoff.issue("A01", "A02", 3, "Courier");
		expect(given).toMatchObject({ ok: true, value: { number: 1, until: 13, penalty: 10 } });
		expect(standoff.issue("A02", "A01", 2, "Courier")).toMatchObject({ ok: false, error: "ALREADY_SET" });
		expect(notices.map((notice) => notice.agent)).toEqual(["A01", "A02"]);
		expect(notices[0]?.text).toContain("by minute 13, A01 hands A02 the counter-factor of A02 for door 8; A02 hands A01 the counter-factor of A01 for door 8");

		standoff.noteText("A01", ["A02"], "403343");
		at(12);
		standoff.tick(12, "CITY");
		expect(standoff.ultimatums).toHaveLength(1);
		at(13);
		standoff.tick(13, "CITY");
		expect(standoff.ultimatums).toEqual([]);
		expect(points.get("A01")).toBe(50);
		// A02 held out and pays what it has, at most the penalty.
		expect(points.get("A02")).toBe(0);
		expect(events.at(-1)).toEqual({ type: "ultimatum_resolved", number: 1, kept: ["A01"], released: [], paid: [{ agent: "A02", points: 6 }] });
		expect(notices.at(-1)?.text).toBe("The ultimatum of minute 13 is up: A01 handed over; A02 did not and loses 6 points.");
	});

	it("does not charge a holder whose partner passed its door anyway, and says it owed nothing", () => {
		const { standoff, events, notices, points, passed } = book();
		standoff.issue("A01", "A02", 2, "Courier");
		passed.add("A02");
		standoff.tick(12, "CITY");
		expect(points.get("A01")).toBe(50);
		expect(points.get("A02")).toBe(0);
		expect(events.at(-1)).toEqual({ type: "ultimatum_resolved", number: 1, kept: [], released: ["A01"], paid: [{ agent: "A02", points: 6 }] });
		expect(notices.at(-1)?.text).toContain("A01 owed nothing any more");
	});

	it("releases both sides when one leaves the city before the deadline", () => {
		const { standoff, events, points, exiled } = book();
		standoff.issue("A01", "A02", 2, "Courier");
		exiled.add("A02");
		standoff.tick(12, "CITY");
		expect(points.get("A01")).toBe(50);
		expect(events.at(-1)).toEqual({ type: "ultimatum_resolved", number: 1, kept: [], released: ["A01", "A02"], paid: [] });
	});

	it("tells a needer behind the piece's door that it may buy it later", () => {
		const { standoff, notices, passed } = book();
		const piece = PIECES.A02?.[0];
		if (piece === undefined) throw new Error("fixture");
		passed.add("A01");
		standoff.keep("A02", [piece], 20, "CITY");
		expect(notices.at(-1)?.text).toContain("once you stand before door 8");
	});

	it("keeps an exiled's pieces and sells each once to the one who needs it", () => {
		const { standoff, events, notices, points } = book();
		const piece = PIECES.A02?.[0];
		if (piece === undefined) throw new Error("fixture");
		standoff.keep("A02", [piece], 20, "CITY");
		expect(notices.at(-1)).toMatchObject({ agent: "A01" });
		expect(notices.at(-1)?.text).toContain('claimPiece("L8-counter-A01", "A02")');
		expect(standoff.claimable("A01").map((entry) => entry.piece.id)).toEqual(["L8-counter-A01"]);
		expect(standoff.claimable("A03")).toEqual([]);
		expect(standoff.claim("A03", "L8-counter-A01", "A02", 20)).toMatchObject({ ok: false, error: "UNKNOWN_PIECE" });
		expect(standoff.claim("A01", "L8-counter-A01", "A02", 60)).toMatchObject({ ok: false, error: "INSUFFICIENT_FUNDS" });
		expect(standoff.claim("A01", "L8-counter-A01", "A02", 20)).toMatchObject({ ok: true, value: { value: "542489" } });
		expect(points.get("A01")).toBe(30);
		expect(standoff.claim("A01", "L8-counter-A01", "A02", 20)).toMatchObject({ ok: false, error: "ALREADY_CLAIMED" });
		expect(standoff.claimable("A01")).toEqual([]);
		expect(events.map((event) => event.type)).toEqual(["piece_kept", "piece_claimed"]);
	});

	it("survives a snapshot", () => {
		const first = book();
		first.standoff.noteText("A01", ["A02"], "403343");
		first.standoff.issue("A01", "A02", 3, "Courier");
		const piece = PIECES.A03?.[0] ?? PIECES.A01?.[0];
		if (piece === undefined) throw new Error("fixture");
		first.standoff.keep("A01", [piece], 20, "CITY");
		const saved = first.standoff.snapshot();
		const second = book();
		second.standoff.restore(saved);
		expect(second.standoff.snapshot()).toEqual(saved);
		expect(second.standoff.isGiven("A01", "A02", "L8-counter-A02")).toBe(true);
		expect(second.standoff.issue("A01", "A02", 3, "Courier")).toMatchObject({ ok: false, error: "ALREADY_SET" });
	});
});
