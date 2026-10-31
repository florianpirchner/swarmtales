/**
 * A city of four residents with channels and stand-ins of the providers it needs (ledger, marks,
 * names, receipts, exile), for the tests of channels and the mechanics that need it.
 */
import type { Host } from "@swarmtales/contracts";
import { defineCoreStory } from "@swarmtales/kernel";
import { channels } from "@swarmtales/mechanic-channels";
import { driverStandIn, exileStandIn, hostFor, textOf } from "./harness.ts";
import { ledgerStandIn, marksStandIn, namesStandIn, receiptsStandIn, type MarksScript } from "./stand-ins.ts";

const TOOLS = ["readBoard", "postBoard", "sendDM", "createGroup", "addGroupMember", "removeGroupMember", "leaveGroup", "listMyGroups", "postGroup", "readGroup", "depositGroup", "withdrawGroup", "setTreasurer", "exileNow", "drive"] as const;

export interface Setup {
	readonly dmLimit?: { readonly windowMinutes: number; readonly perWindow: number };
	readonly marks?: MarksScript;
	readonly memos?: number;
	readonly names?: Map<string, string>;
	readonly minutes?: number;
	readonly start?: number;
	readonly residents?: number;
	/** The id of the next receipt, when a test dictates them. */
	readonly receiptId?: () => string;
}

/** The story of a city, for checks that start several hosts. */
export function cityStory(setup: Setup = {}) {
	return defineCoreStory({
		id: "t2-channels",
		seed: 7,
		minutes: setup.minutes ?? 10,
		residents: setup.residents ?? 4,
		mechanics: [
			channels.with(setup.dmLimit === undefined ? {} : { dmLimit: setup.dmLimit }),
			ledgerStandIn(setup.start ?? 10).with(),
			marksStandIn(setup.marks).with(),
			namesStandIn(setup.names ?? new Map<string, string>()).with(),
			receiptsStandIn({
				...(setup.receiptId === undefined ? {} : { nextId: setup.receiptId }),
				memoTransfers: () => setup.memos ?? 0,
			}).with(),
			exileStandIn.with(),
			driverStandIn.with(),
		],
		grants: { resident: TOOLS, gamemaker: ["notify", "postBoard"], script: ["drive"] },
	});
}

export function city(setup: Setup = {}): Host {
	return hostFor({ story: cityStory(setup) });
}

/** A resident's call, answered as the old runner showed it. */
export async function say(host: Host, who: string, tool: string, params: unknown): Promise<string> {
	return textOf(await host.call(`resident:${who}`, tool, params));
}
