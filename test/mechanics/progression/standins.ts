/**
 * Stand-ins for the mechanics progression requires (ledger, channels and receipts belong to teams
 * T1 and T2 and are still heads): they keep the little progression reads and writes. The receipt
 * stand-in hands out the ids the golden log recorded, so the replies can be compared as they are.
 */
import { Type } from "typebox";
import { defineMechanic } from "@swarmtales/kernel";
import { ChannelsApi, LedgerApi, ReceiptsApi } from "@swarmtales/mechanic-shared";
import type { LegacyLine } from "@swarmtales/testkit";

export interface Notice {
	readonly to: string;
	readonly text: string;
}

export function ledgerStandIn() {
	const held = new Map<string, number>();
	return defineMechanic(
		{ id: "ledger", summary: "Stand-in for the ledger: balances only.", options: Type.Object({}), state: () => undefined, events: {}, provides: [LedgerApi] },
		(kit) => ({
			services: [
				kit.provide(LedgerApi, {
					balance: ({ account }) => held.get(account) ?? 0,
					balances: () => Object.fromEntries(held),
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

/** Collects the private notices progression sends, for the tests that read them. */
export function channelsStandIn(notices: Notice[]) {
	return defineMechanic(
		{ id: "channels", summary: "Stand-in for the channels: notices are recorded.", options: Type.Object({}), state: () => undefined, events: {}, provides: [ChannelsApi] },
		(kit) => ({
			services: [
				kit.provide(ChannelsApi, {
					post: () => ({ postSeq: 0 }),
					notify: ({ to, text }) => {
						notices.push({ to, text });
						return null;
					},
					note: () => ({ number: 0 }),
					deliver: () => ({ number: 0 }),
					takeNumber: () => 0,
					dmWindow: () => null,
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
				kit.provide(ReceiptsApi, {
					issue: ({ body }) => ({ id: (body.kind === "levelUp" ? ids.get(`${body.agent}:${body.level}`) : undefined) ?? "R-0000", text: "" }),
					count: () => 0,
					memoTransfers: () => 0,
					describe: () => "",
				}),
			],
		}),
	);
}
