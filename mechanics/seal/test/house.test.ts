// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Carried from the old `test/engine/seal.test.ts` (its first two blocks): the sealed-bid auction (timing, last bid
 * counts, everyone pays, highest wins, ties to fewer points, no bids no seal), the secret holder, its use (struck at
 * once, counted, refused once the target is reached), expiry and the state as its own copy, over the old `SealHouse`
 * with the City's texts. The harness reads the City's seal from the old setup file in place of the old story module;
 * the tie draw is the identity (no case reaches it), where the old harness drew from the kernel's `rngFor`.
 */
import { readFileSync } from "node:fs";
import { Type, type Static } from "typebox";
import { Parse } from "typebox/value";
import { describe, expect, it } from "vitest";
import type { Standing } from "@swarmtales/mechanic-exile/contract";
import { auctionOf, bidOf, borne, emptySeal, holds, SealHouse, sealCount as sealsFor, SealOptions, type SealData } from "../src/index.ts";

const spec = Parse(Type.Object({ seal: SealOptions }), JSON.parse(readFileSync(new URL("../../../oracles/cityofkeys/setup/cityofkeys.story.json", import.meta.url), "utf8"))).seal;

/** Seals of an act with `residents` (old `sealCount(spec, residents)`). */
const sealCount = (seal: SealOptions, residents: number): number => sealsFor(seal.perResidents, residents);

const competitorIds = (count: number): string[] => Array.from({ length: count }, (_, index) => `A${String(index + 1).padStart(2, "0")}`);

/** One seal event as the old `SealHouse` emitted it: its type and payload. */
interface SealEvent {
	readonly type: string;
	readonly [field: string]: unknown;
}

/** The seal mechanic's `SealHouse` over its own state, read as the old house was (`auction`, `bidOf`, `holds`, `borne`, `snapshot`). */
interface House {
	readonly house: SealHouse;
	readonly data: SealData;
	readonly auction: { readonly seal: number; readonly until: number } | undefined;
	readonly borne: number;
	begin(actStart: number, residents: number): void;
	tick(minute: number): void;
	bid: SealHouse["bid"];
	use: SealHouse["use"];
	end(): void;
	onExiled(agent: string): void;
	bidOf(agent: string): number | undefined;
	holds(agent: string): boolean;
}

interface Harness {
	readonly house: House;
	readonly events: SealEvent[];
	readonly posts: string[];
	readonly notices: { readonly to: string; readonly text: string }[];
	readonly points: Map<string, number>;
	readonly standing: Map<string, Static<typeof Standing>["kind"]>;
	/** Residents the tribunal still has to exile. */
	readonly city: { missing: number };
	readonly struck: string[];
}

function harness(agents = 6, data: SealData = emptySeal()): Harness {
	const ids = competitorIds(agents);
	const events: SealEvent[] = [];
	const notices: { to: string; text: string }[] = [];
	const struck: string[] = [];
	const state = {
		events,
		posts: new Array<string>(),
		notices,
		points: new Map(ids.map((id, index) => [id, 20 + index])),
		standing: new Map<string, Static<typeof Standing>["kind"]>(ids.map((id) => [id, "alive"])),
		city: { missing: 3 },
		struck,
	};
	const { texts, ...rule } = spec;
	const house = new SealHouse(
		{ announceAfter: rule.announceAfter, bidMinutes: rule.bidMinutes, perResidents: rule.perResidents, spacing: rule.spacing, texts },
		{
			ids,
			points: (agent) => state.points.get(agent) ?? 0,
			standing: (agent): Static<typeof Standing> => {
				const kind = state.standing.get(agent) ?? "alive";
				return kind === "gate" ? { kind, until: 99 } : { kind };
			},
			missing: () => state.city.missing,
			burn: (agent, points) => state.points.set(agent, (state.points.get(agent) ?? 0) - points),
			post: (text) => state.posts.push(text),
			notify: (to, text) => state.notices.push({ to, text }),
			emit: (type, payload) => state.events.push({ type, ...payload }),
			strike: (target) => {
				state.struck.push(target);
				state.standing.set(target, "exiled");
				state.city.missing -= 1;
			},
			shuffle: (_seal, agents) => agents,
		},
		data,
	);
	const view: House = {
		house,
		data,
		get auction() {
			return auctionOf(data);
		},
		get borne() {
			return borne(data);
		},
		begin: (actStart, residents) => {
			house.begin(actStart, residents);
		},
		tick: (minute) => {
			house.tick(minute);
		},
		bid: (agent, points) => house.bid(agent, points),
		use: (holder, target) => house.use(holder, target),
		end: () => {
			house.end();
		},
		onExiled: (agent) => {
			house.onExiled(agent);
		},
		bidOf: (agent) => bidOf(data, agent),
		holds: (agent) => holds(data, agent),
	};
	return { ...state, house: view };
}

describe("the seal auction", () => {
	it("sells one seal per 12 residents, the first 4 minutes into the act, each 6 minutes after the last", () => {
		expect([6, 12, 13, 48, 96].map((residents) => sealCount(spec, residents))).toEqual([1, 1, 2, 4, 8]);
		const h = harness(48);
		h.house.begin(16, 48);
		for (let minute = 16; minute <= 50; minute++) h.house.tick(minute);
		const opened = h.events.flatMap((event) => (event.type === "seal_auction_opened" ? [event.until] : []));
		expect(opened).toEqual([23, 29, 35, 41]);
		expect(h.posts[0]).toMatch(/^THE CITY SELLS black seal 1 of 4\. /);
	});

	it("takes the last bid of each resident, charges every bidder, and gives the seal to the highest in secret", () => {
		const h = harness();
		h.house.begin(0, 6);
		h.house.tick(3);
		expect(h.house.auction).toBeUndefined();
		expect(h.house.bid("A01", 5)).toMatchObject({ ok: false, error: "NO_AUCTION" });
		h.house.tick(4);
		expect(h.house.auction).toEqual({ seal: 1, until: 7 });
		expect(h.posts[0]).toContain("THE CITY SELLS the black seal.");
		expect(h.posts[0]).toContain("until minute 7");
		expect(h.house.bid("A01", 99)).toMatchObject({ ok: false, error: "INSUFFICIENT_FUNDS" });
		expect(h.house.bid("A01", 12)).toMatchObject({ ok: true, value: { points: 12, until: 7 } });
		expect(h.house.bid("A01", 4)).toMatchObject({ ok: true });
		expect(h.house.bid("A02", 9)).toMatchObject({ ok: true });
		expect(h.house.bid("A03", 0)).toMatchObject({ ok: true });
		expect(h.house.bidOf("A01")).toBe(4);
		h.house.tick(7);
		// A02 bid most; A01 pays its last bid, A03 nothing.
		expect(h.events.find((event) => event.type === "seal_won")).toMatchObject({ seal: 1, agent: "A02", bid: 9 });
		expect(h.points.get("A01")).toBe(20 - 4);
		expect(h.points.get("A02")).toBe(21 - 9);
		expect(h.points.get("A03")).toBe(22);
		expect(h.posts.at(-1)).toBe("Someone now bears the black seal.");
		expect(h.notices.find((notice) => notice.to === "A02")?.text).toBe(
			"You won the black seal for 9 points. You may break it once with permaDeath(resident) until this act ends. Nobody knows you bear it.",
		);
		expect(h.notices.find((notice) => notice.to === "A01")?.text).toBe("The bidding for the black seal is closed and you did not win it. Your bid of 4 points is paid.");
		// A bid of 0 is no bid: A03 hears nothing.
		expect(h.notices.some((notice) => notice.to === "A03")).toBe(false);
		expect(h.house.holds("A02")).toBe(true);
		expect(h.house.borne).toBe(1);
		expect(h.house.auction).toBeUndefined();
	});

	it("breaks a tie with fewer points, and sells nothing without a positive bid", () => {
		const tie = harness();
		tie.house.begin(0, 6);
		tie.house.tick(4);
		tie.house.bid("A05", 10);
		tie.house.bid("A02", 10);
		tie.house.tick(7);
		// A02 had 21 points, A05 24: the poorer one wins.
		expect(tie.events.find((event) => event.type === "seal_won")).toMatchObject({ agent: "A02" });
		const none = harness();
		none.house.begin(0, 6);
		none.house.tick(4);
		none.house.bid("A01", 0);
		none.house.tick(7);
		expect(none.events.at(-1)).toMatchObject({ type: "seal_expired", reason: "nobody bid" });
		expect(none.posts.at(-1)).toBe("Nobody bid for the black seal. There is no seal this time.");
		expect(none.house.borne).toBe(0);
	});
});

describe("breaking the seal", () => {
	function won(): Harness {
		const h = harness();
		h.house.begin(0, 6);
		h.house.tick(4);
		h.house.bid("A01", 3);
		h.house.tick(7);
		return h;
	}

	it("strikes the target at once and names the bearer; once, never on oneself", () => {
		const h = won();
		expect(h.house.use("A02", "A03")).toMatchObject({ ok: false, error: "NO_SEAL" });
		expect(h.house.use("A01", "A01")).toMatchObject({ ok: false, error: "SELF" });
		expect(h.house.use("A01", "A09")).toMatchObject({ ok: false, error: "UNKNOWN_RESIDENT" });
		expect(h.house.use("A01", "A04")).toEqual({ ok: true, value: "A04" });
		expect(h.struck).toEqual(["A04"]);
		expect(h.posts.at(-1)).toBe("A01 broke the black seal on A04.");
		expect(h.events.at(-1)).toMatchObject({ type: "seal_used", seal: 1, holder: "A01", target: "A04" });
		expect(h.house.holds("A01")).toBe(false);
		expect(h.house.use("A01", "A05")).toMatchObject({ ok: false, error: "NO_SEAL" });
	});

	it("works on a resident at the gate even at the target, and crumbles on anyone else once the target is reached", () => {
		const gate = won();
		gate.city.missing = 0;
		gate.standing.set("A05", "gate");
		expect(gate.house.use("A01", "A05")).toMatchObject({ ok: true });
		const full = won();
		full.city.missing = 0;
		expect(full.house.use("A01", "A05")).toMatchObject({ ok: false, error: "TARGET_REACHED" });
		expect(full.house.holds("A01")).toBe(false);
		expect(full.events.at(-1)).toMatchObject({ type: "seal_expired", holder: "A01", reason: "the target was reached" });
	});

	it("is gone unused at the act's end or with its bearer, and an open auction ends unpaid", () => {
		const end = won();
		end.house.end();
		expect(end.events.at(-1)).toMatchObject({ type: "seal_expired", holder: "A01", reason: "the act ended" });
		expect(end.notices.at(-1)).toEqual({ to: "A01", text: "Unused, the black seal crumbles in your hands." });
		const exiled = won();
		exiled.standing.set("A01", "exiled");
		exiled.house.onExiled("A01");
		expect(exiled.events.at(-1)).toMatchObject({ type: "seal_expired", holder: "A01", reason: "its holder left the city" });
		const open = harness();
		open.house.begin(0, 6);
		open.house.tick(4);
		open.house.bid("A02", 5);
		open.house.end();
		expect(open.points.get("A02")).toBe(21);
		expect(open.events.at(-1)).toMatchObject({ type: "seal_expired", reason: "the act ended before the bidding closed" });
	});

	it("round-trips through its snapshot", () => {
		const h = harness();
		h.house.begin(0, 6);
		h.house.tick(4);
		h.house.bid("A02", 5);
		// The mechanic's state is the snapshot (its slice is a copy of it, test/mechanics/seal).
		const copy = harness(6, structuredClone(h.house.data));
		expect(copy.house.data).toEqual(h.house.data);
		expect(copy.house.bidOf("A02")).toBe(5);
	});
});
