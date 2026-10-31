/**
 * A stand-in for the cores (team T2, still a head): it answers `cores-extras` from the cores the
 * golden log dealt, so the goals follow them as they did.
 */
import { Type } from "typebox";
import { defineMechanic, reply } from "@swarmtales/kernel";
import { CoresExtrasApi } from "@swarmtales/mechanic-goals";
import { GoalsApi } from "@swarmtales/mechanic-shared";
import type { LegacyLine } from "@swarmtales/testkit";

function drivesIn(lines: readonly LegacyLine[]): ReadonlyMap<string, readonly string[]> {
	const drives = new Map<string, readonly string[]>();
	for (const line of lines) {
		const entries: unknown = line.drives;
		if (line.type !== "core_dealt" || typeof line.agent !== "string" || !Array.isArray(entries)) continue;
		const names: readonly unknown[] = entries.map((entry: unknown): unknown => (typeof entry === "object" && entry !== null ? Reflect.get(entry, "drive") : undefined));
		drives.set(
			line.agent,
			names.filter((name): name is string => typeof name === "string"),
		);
	}
	return drives;
}

export function coresStandIn(golden: readonly LegacyLine[]) {
	const drives = drivesIn(golden);
	return defineMechanic(
		{ id: "cores", summary: "Stand-in for the cores: the golden drives.", options: Type.Object({}), state: () => undefined, events: {}, provides: [CoresExtrasApi] },
		(kit) => ({ services: [kit.provide(CoresExtrasApi, { drivesOf: ({ resident }) => [...(drives.get(resident) ?? [])] })] }),
	);
}

/** A stand-in for the exile (team T4): a script tool that exiles a resident, calling `GoalsApi.onExiled` as the exile will. */
export function exileStandIn() {
	return defineMechanic(
		{ id: "exile", summary: "Stand-in for the exile: one tool that exiles.", options: Type.Object({}), state: () => undefined, events: {}, requires: [GoalsApi], prompts: { "standin/tool": [] } },
		(kit) => ({
			tools: [
				kit.tool({
					name: "exileOne",
					description: "standin/tool",
					parameters: Type.Object({ resident: Type.String() }),
					suggest: ["script"],
					execute: ({ resident }, ctx) => {
						ctx.call(GoalsApi, "onExiled", { resident });
						return reply("exiled");
					},
				}),
			],
		}),
	);
}
