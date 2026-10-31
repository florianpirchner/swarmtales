/**
 * Stand-ins for the mechanics progression requires (ledger, channels and receipts belong to teams
 * T1 and T2 and are still heads): they keep the little progression reads and writes. The receipt
 * stand-in hands out the ids the golden log recorded, so the replies can be compared as they are.
 */
import { Type } from "typebox";
import { defineMechanic } from "@swarmtales/kernel";
import { MarksBook } from "@swarmtales/engine";
import type { AnyStory } from "@swarmtales/contracts";
import { ChannelsApi, LedgerApi, MarksApi, ProgressionApi, ReceiptsApi } from "@swarmtales/mechanic-shared";
import { marksTermsLine } from "../t3/twin-standins.ts";
import type { LegacyLine } from "@swarmtales/testkit";

export interface Notice {
	readonly to: string;
	readonly text: string;
}

/** What the golden `getStatus` reply says about the caller and the other mechanics own (points, unread DMs). */
export interface StatusFeed {
	agent: string;
	points: number | undefined;
	unread: number;
}

export function createFeed(): StatusFeed {
	return { agent: "", points: undefined, unread: 0 };
}

export function ledgerStandIn(feed?: StatusFeed) {
	const held = new Map<string, number>();
	return defineMechanic(
		{ id: "ledger", summary: "Stand-in for the ledger: balances only.", options: Type.Object({}), state: () => undefined, events: {}, provides: [LedgerApi] },
		(kit) => ({
			services: [
				kit.provide(LedgerApi, {
					balance: ({ account }) => (feed?.points !== undefined && account === feed.agent ? feed.points : (held.get(account) ?? 0)),
					balances: () => Object.fromEntries(held),
					open: () => null,
					has: ({ account }) => held.has(account),
					mint: ({ account, amount }) => {
						held.set(account, (held.get(account) ?? 0) + amount);
						return null;
					},
					burn: ({ account, amount }) => {
						held.set(account, (held.get(account) ?? 0) - amount);
						return null;
					},
					move: () => ({ ok: false, code: "INSUFFICIENT_FUNDS" }),
				}),
			],
		}),
	);
}

/** The marks the old book computes from the story's rules: the terms under a task and the price of a message at a resident's level. */
export function marksStandIn(story: AnyStory) {
	const book = new MarksBook(story.rules.marks, story.levels);
	return defineMechanic(
		{ id: "marks", summary: "Stand-in for the marks: prices and task terms of the story.", options: Type.Object({}), state: () => undefined, events: {}, provides: [MarksApi], uses: [ProgressionApi] },
		(kit) => ({
			services: [
				kit.provideSome(MarksApi, {
					left: () => null,
					priceOf: ({ resident, channel }, ctx) => {
						const level = ctx.tryCall(ProgressionApi, "levelOf", { resident });
						return level === undefined || !book.activeOn(level) ? null : book.priceOf(level, channel);
					},
					taskLine: ({ level }) => marksTermsLine(book, level),
				}),
			],
		}),
	);
}

/** Collects the private notices progression sends, for the tests that read them. */
export function channelsStandIn(notices: Notice[], feed?: StatusFeed) {
	return defineMechanic(
		{ id: "channels", summary: "Stand-in for the channels: notices are recorded.", options: Type.Object({}), state: () => undefined, events: {}, provides: [ChannelsApi] },
		(kit) => ({
			services: [
				kit.provideSome(ChannelsApi, {
					post: () => ({ postSeq: 0 }),
					notify: ({ to, text }) => {
						notices.push({ to, text });
						return null;
					},
					note: () => ({ number: 0 }),
					deliver: () => ({ number: 0 }),
					takeNumber: () => 0,
					dmWindow: () => null,
					pendingDms: () => feed?.unread ?? 0,
					dmRecords: () => [],
					createCityGroup: () => ({ group: "" }),
					removeCityGroup: () => null,
					postGroupAsCity: () => null,
				}),
			],
		}),
	);
}

/** The ids the golden log gave the level-up receipts, by resident and level. */
function goldenReceipts(lines: readonly LegacyLine[]): ReadonlyMap<string, string> {
	const ids = new Map<string, string>();
	for (const line of lines) {
		if (line.type !== "receipt_issued" || line.kind !== "levelUp" || typeof line.text !== "string" || typeof line.receipt !== "string") continue;
		const found = /^R-\d+: (\S+) solved level (\d+),/.exec(line.text);
		if (found?.[1] !== undefined && found[2] !== undefined) ids.set(`${found[1]}:${found[2]}`, line.receipt);
	}
	return ids;
}

export function receiptsStandIn(golden: readonly LegacyLine[]) {
	const ids = goldenReceipts(golden);
	return defineMechanic(
		{ id: "receipts", summary: "Stand-in for the receipts: the golden ids.", options: Type.Object({}), state: () => undefined, events: {}, provides: [ReceiptsApi] },
		(kit) => ({
			services: [
				kit.provideSome(ReceiptsApi, {
					issue: ({ body }) => ({ id: (body.kind === "levelUp" ? ids.get(`${body.agent}:${body.level}`) : undefined) ?? "R-0000", text: "" }),
					count: () => 0,
					list: () => [],
					memoTransfers: () => 0,
					describe: () => "",
				}),
			],
		}),
	);
}
