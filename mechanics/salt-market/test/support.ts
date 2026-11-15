// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Shared by the tests of Salt Market: the table of the old game file (`stories/salt-market/story.ts`: four solo
 * seats, three passes a tick, 12 calls a tick, in roster order as the old test had it), optionally with a strategy
 * brain per trader, the trader's state read from a snapshot, and the scripted trader of the old test.
 */
import { Value } from "typebox/value";
import { nameOf, type ActorDriver, type Activation, type Envelope } from "@swarmtales/contracts";
import { strategyBrain } from "@swarmtales/mechanic-strategy-brain";
import { defineGame, type Game } from "@swarmtales/sdk";
import type { TestKernel } from "@swarmtales/testkit";
import { saltMarket } from "../src/index.ts";
import { MarketSlice, PERISHABLE, type MarketState } from "../src/model.ts";

export const SEATS = ["A01", "A02", "A03", "A04"];
const RETRO_MINUTES = 2;

/**
 * The table of the old game file; `brain` true is a brain per trader, false the old control arm (loaded and off),
 * undefined no brain mechanic at all.
 */
export function marketGame(options: Parameters<typeof saltMarket>[0] = {}, table: { readonly brain?: boolean; readonly seed?: number } = {}): Game {
	const { brain, seed = 41 } = table;
	const rules = { games: 1, rounds: 6, spoil: true, roundMinutes: 1, ...options };
	const writes = brain === true;
	return defineGame({
		id: "salt-market-test",
		seed,
		residents: [...SEATS],
		mechanics: [
			saltMarket(rules),
			...(brain === undefined ? [] : [strategyBrain({ enabled: brain, solo: true, maxWords: 150, teams: Object.fromEntries(SEATS.map((seat) => [seat, [seat]])), retroMaxPosts: 8, retroMaxMinutes: RETRO_MINUTES, shared: false, brainAtStart: true })]),
		],
		grants: { resident: ["viewMarket", "offer", "accept", "decline", "withdraw", "give", "say", ...(writes ? (["readBrain", "writeBrain"] as const) : [])] },
		locked: writes ? ["writeBrain"] : [],
		scheduler: { id: "turns", options: { passes: 3, activation: "onNews", order: "roster", inputs: [{ kind: "context-reset" }] } },
		limits: { maxCallsPerTick: 12 },
		end: { ticks: rules.games * (rules.rounds + 1) + (rules.games + 1) * RETRO_MINUTES + 4 },
	});
}

/** The mechanic's state, read from a snapshot of the kernel. */
export const stateOf = (test: TestKernel): MarketState => Value.Parse(MarketSlice, JSON.parse(JSON.stringify(test.kernel.snapshot().plugins["salt-market"]?.data ?? null)));

/** The payloads of one event type that the mechanic wrote. */
export function payloads(events: readonly Envelope[], type: string): readonly unknown[] {
	return events.filter((event) => event.source.endsWith("/salt-market") && event.type === type).map((event) => event.payload);
}

/** One field of an event's payload, untyped. */
export function field(payload: unknown, key: string): unknown {
	return typeof payload === "object" && payload !== null ? Reflect.get(payload, key) : undefined;
}

const next = (seat: string): string => SEATS[(SEATS.indexOf(seat) + 1) % SEATS.length] ?? "A01";

// The counts of a trader in a book line: `A02: 6 salt, 3 cloth; A03 (you): ...`.
function holdingIn(book: string, seat: string): Record<string, number> {
	const entry = book.split("; ").find((part) => part.startsWith(`${seat}:`) || part.startsWith(`${seat} (you):`)) ?? "";
	const out: Record<string, number> = {};
	for (const match of entry.matchAll(/(\d+) (salt|cloth|copper|spice|wax)/g)) out[match[2] ?? ""] = Number(match[1]);
	return out;
}

/**
 * The trader of the old test: every trader accepts every offer it is told about, and at each round's start buys one
 * unit of a perishable good from the next seat for 2 salt. In round 2, A01 adds 1 salt in escrow and A02 and A04 add
 * 1 salt as a plain promise, due at the end of round 3; A02 keeps it in round 3, A04 does not. In round 1, A03 sells a
 * unit of its shipment on escrow.
 */
export const trader: ActorDriver = async (turn) => {
	const resident = nameOf(turn.actor);
	const told = turn.inputs.map((note) => note.text).join("\n");
	if (told.includes("Retro after game") || told.includes("Before game 1")) {
		await turn.call("writeBrain", { text: `${resident}: buy what I need for salt, keep promises.` });
		return;
	}
	for (const match of told.matchAll(/New offer (O\d+)/g)) await turn.call("accept", { offer: match[1] ?? "" });
	const round = /Round (\d+) of \d+ \(/.exec(told);
	const book = /The book: ([^\n]*?)\. Shipments to come:/.exec(told)?.[1];
	if (round === null || book === undefined) return;
	await roundStart(turn, resident, Number(round[1]), told, book);
};

// The calls of a trader's first turn of a round.
async function roundStart(turn: Activation, resident: string, number: number, told: string, book: string): Promise<void> {
	const target = next(resident);
	const good = PERISHABLE.find((name) => (holdingIn(book, target)[name] ?? 0) > 0);
	if (number === 1) await turn.call("say", { text: `${resident} buys anything for salt.` });
	const shipment = new RegExp(`${resident} \\(you\\) (\\d+) (cloth|copper|spice|wax)[^;]*? at the end of round (\\d+)`).exec(told);
	if (number === 1 && resident === "A03" && shipment !== null) {
		await turn.call("offer", { to: target, give: { salt: 1 }, get: { salt: 1 }, later: { [shipment[2] ?? "cloth"]: 1, round: Number(shipment[3]), escrow: true }, note: "from my shipment" });
	}
	if (number === 3 && resident === "A02") await turn.call("give", { to: target, goods: { salt: 1 }, note: "keeps my promise" });
	if (good !== undefined) await turn.call("offer", { to: target, give: { salt: 2 }, get: { [good]: 1 }, note: "fair price", ...laterOf(resident, number) });
}

// Round 2: A01 adds 1 salt in escrow, A02 and A04 a plain promise of 1 salt, all due at the end of round 3.
function laterOf(resident: string, number: number): { later?: { salt: number; round: number; escrow?: boolean } } {
	if (number !== 2) return {};
	if (resident === "A01") return { later: { salt: 1, round: 3, escrow: true } };
	return resident === "A02" || resident === "A04" ? { later: { salt: 1, round: 3 } } : {};
}
