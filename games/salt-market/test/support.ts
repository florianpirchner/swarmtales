// SPDX-License-Identifier: Apache-2.0
/**
 * Shared by the tests of the game: the options behind each old variant name, the game in the roster order of the old
 * test, the scripted trader of the old `test/stories/salt-market.test.ts` (`trader`, carried) and the readers of the
 * log.
 */
import { nameOf, type ActorDriver, type Activation, type Envelope } from "@swarmtales/contracts";
import { SEATS } from "../briefing.ts";
import { saltMarketGame, type SaltMarketOptions } from "../game.ts";

/**
 * The options behind every variant name that an oracle file or the old runs index uses. The old registry parsed
 * `salt-market[-nobrain][-nospoil][-g<games>][-r<rounds>]`; the names are not carried, `carried.test.ts` pins this
 * table against the old parser.
 */
export const VARIANTS: Readonly<Record<string, SaltMarketOptions>> = {
	"salt-market": {},
	"salt-market-nobrain": { brain: false },
	"salt-market-nospoil": { spoil: false },
	"salt-market-g2": { games: 2 },
	"salt-market-nobrain-g3-r8": { brain: false, games: 3, rounds: 8 },
};

/**
 * The game as the old test played it: the turn order `roster`.
 *
 * @param options - The variant.
 * @returns The game with the turn order `roster`.
 */
export function rosterGame(options: SaltMarketOptions = {}) {
	const game = saltMarketGame(options);
	const turns: unknown = game.scheduler?.options;
	return { ...game, scheduler: { id: "turns", options: { ...(typeof turns === "object" ? turns : {}), order: "roster" } } };
}

/** The events of one type, whoever wrote them. */
export const ofType = (events: readonly Envelope[], type: string): readonly Envelope[] => events.filter((event) => event.type === type);

/** One field of an event's payload, untyped. */
export function field(event: Envelope, key: string): unknown {
	const payload = event.payload;
	return typeof payload === "object" && payload !== null ? Reflect.get(payload, key) : undefined;
}

const PERISHABLE = ["cloth", "copper", "spice", "wax"] as const;
const next = (seat: string): string => SEATS[(SEATS.findIndex((other) => other === seat) + 1) % SEATS.length] ?? "A01";

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
 * unit of its shipment on escrow. It reads only what its activation shows.
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
