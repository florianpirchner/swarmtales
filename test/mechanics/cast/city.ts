/**
 * A city of six residents with cast, the real channels, and stand-ins of the providers around
 * them (ledger, marks, names, receipts, exile, progression, the script's driver).
 */
import type { Host } from "@swarmtales/contracts";
import { defineCoreStory } from "@swarmtales/kernel";
import { cast } from "@swarmtales/mechanic-cast";
import { channels } from "@swarmtales/mechanic-channels";
import { exileStandIn, hostFor, textOf } from "../channels/harness.ts";
import { ledgerStandIn, marksStandIn, namesStandIn, receiptsStandIn } from "../channels/stand-ins.ts";
import { castDriver, progressionStandIn } from "./stand-ins.ts";

export interface CastSetup {
	readonly minutes?: number;
	readonly solves?: ReadonlyMap<number, number>;
	readonly escrow?: number;
	readonly hidden?: boolean;
}

export function castStory(setup: CastSetup = {}) {
	return defineCoreStory({
		id: "t2-cast",
		seed: 7,
		minutes: setup.minutes ?? 14,
		residents: 6,
		mechanics: [
			cast.with({ members: { STEWARD: { level: 10, hidden: setup.hidden ?? true, escrow: setup.escrow ?? 10 } } }),
			channels.with(),
			progressionStandIn(setup.solves ?? new Map<number, number>()).with(),
			ledgerStandIn(10).with(),
			marksStandIn().with(),
			namesStandIn(new Map<string, string>()).with(),
			receiptsStandIn().with(),
			exileStandIn.with(),
			castDriver.with(),
		],
		grants: { resident: ["sendDM", "readBoard"], script: ["driveCast"] },
	});
}

export function castCity(setup: CastSetup = {}): Host {
	return hostFor({ story: castStory(setup) });
}

/** A call of the script's driver, answered as JSON text. */
export async function drive(host: Host, params: unknown): Promise<string> {
	return textOf(await host.call("script", "driveCast", params));
}

export async function say(host: Host, who: string, tool: string, params: unknown): Promise<string> {
	return textOf(await host.call(`resident:${who}`, tool, params));
}
