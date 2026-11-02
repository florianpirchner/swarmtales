/**
 * Hosts for the tests of team T4a: a story of stand-ins, the exile and the tribunal, a probe that
 * calls their APIs the way another mechanic would, and the legacy lines they write.
 */
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { Type } from "typebox";
import { createPromptLookup, mechanicPromptFolders } from "@swarmtales/prompts";
import { createHost, defineCoreStory, defineHead, defineMechanic, reply, type HostOptions } from "@swarmtales/kernel";
import { ownedBy, parseLegacyLog, readLegacyLog } from "@swarmtales/testkit";
import { LegacyEventAdapter, legacyLine, type LegacyOwner } from "@swarmtales/chronicle";
import type { EventEnvelope, Host, MechanicUse, ToolContextOf, TurnPolicy } from "@swarmtales/contracts";
import { ExileApi, TribunalApi, TribunalViewApi } from "@swarmtales/mechanic-shared";

export const SUPPORT_PROMPTS = fileURLToPath(new URL("prompts", import.meta.url));
export const GOLDEN_DIR = join(fileURLToPath(new URL("../../../golden", import.meta.url)));
export const GOLDEN_LOGS = ["cityofkeys-f4g4", "cityofkeys-f10g10", "whispers-f10-grudge"] as const;

const head = defineHead({
	id: "probe",
	summary: "Test probe: runs a function as a tool.",
	options: Type.Object({}),
	state: (): undefined => undefined,
	events: {},
	uses: [ExileApi, TribunalApi, TribunalViewApi],
	prompts: { "probe/tools/probe": [] },
});

export type ProbeContext = ToolContextOf<typeof head>;

let action: ((ctx: ProbeContext) => void) | undefined;

export const probe = defineMechanic(head, (kit) => ({
	tools: [
		kit.tool({
			name: "probe",
			description: "probe/tools/probe",
			parameters: Type.Object({}),
			suggest: ["script"],
			execute: (_params, ctx) => {
				action?.(ctx);
				return reply("probed");
			},
		}),
	],
}));

/** Runs `run` inside the host as the script and returns what it returned. */
export async function runProbe<T>(host: Host, run: (ctx: ProbeContext) => T): Promise<T> {
	const out: [T][] = [];
	action = (ctx) => {
		out.push([run(ctx)]);
	};
	const outcome = await host.call("script", "probe", {});
	action = undefined;
	if (!outcome.ok) throw new Error(`probe refused: ${outcome.code} ${outcome.detail ?? ""}`);
	const first = out[0];
	if (first === undefined) throw new Error("the probe did not run");
	return first[0];
}

export interface TestStory {
	readonly id?: string;
	readonly mechanics: readonly MechanicUse[];
	readonly residents?: number | readonly string[];
	readonly minutes?: number;
	readonly seed?: number;
	readonly residentTools?: readonly string[];
	readonly gamemakerTools?: readonly string[];
	readonly turns?: TurnPolicy;
}

export function storyOptions(story: TestStory): HostOptions {
	return {
		story: defineCoreStory({
			id: story.id ?? "t4a-test",
			seed: story.seed ?? 7,
			minutes: story.minutes ?? 60,
			residents: story.residents ?? 6,
			mechanics: [probe.with(), ...story.mechanics],
			grants: { resident: story.residentTools ?? [], gamemaker: story.gamemakerTools ?? [], script: ["probe"] },
			...(story.turns === undefined ? {} : { turns: story.turns }),
		}),
		prompts: createPromptLookup({ mechanics: { ...mechanicPromptFolders(), probe: SUPPORT_PROMPTS } }),
	};
}

export function startHost(story: TestStory): Host {
	const host = createHost(storyOptions(story));
	host.start();
	return host;
}

/** The legacy lines the adapter writes for these envelopes, parsed. */
export function legacyLines(events: readonly EventEnvelope[]) {
	const adapter = new LegacyEventAdapter();
	return parseLegacyLog(
		events
			.flatMap((event) => adapter.write(event))
			.map((event) => legacyLine(event))
			.join("\n"),
	);
}

/** What the mechanics `owners` wrote, as golden lines (no seq, no wall clock). */
export function ownLines(host: Host, owners: readonly LegacyOwner[]): readonly string[] {
	return ownedBy(legacyLines(host.log.all()), owners);
}

/** The golden log's lines, parsed. */
export function goldenLog(name: string) {
	return readLegacyLog(join(GOLDEN_DIR, `${name}.events.jsonl`));
}
