/**
 * Shared test support of team T1 (economy): the per-mechanic golden gate helpers and the sources
 * of a mechanic. The gate compares the lines a mechanic writes through the legacy adapter with the
 * golden lines of its own event types (`goldenDiff(ownedBy(readLegacyLog(path), [id]), written)`).
 * The stand-in provider of `ChannelsApi` lives in `channels.ts` (team T2 has not landed channels).
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { LegacyEventAdapter, legacyOwner, type LegacyOwner } from "@swarmtales/chronicle";
import type { EventEnvelope } from "@swarmtales/contracts";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { goldenLine, readLegacyLog, type GoldenLine, type LegacyLine } from "@swarmtales/testkit";

export { channelsStandIn } from "./channels.ts";

/** A JSON object parsed from text (a line of the log, a snapshot file). */
export function recordOf(text: string): Record<string, unknown> {
	return Parse(Type.Record(Type.String(), Type.Unknown()), JSON.parse(text));
}

/** JSON parsed from text, untyped. */
export function jsonOf(text: string): unknown {
	return JSON.parse(text);
}

const ROOT = resolve(import.meta.dirname, "../../..");

/** The three golden logs of test/golden. */
export const GOLDEN_LOGS = ["cityofkeys-f4g4", "cityofkeys-f10g10", "whispers-f10-grudge"] as const;

export function goldenPath(name: string): string {
	return join(ROOT, "test", "golden", `${name}.events.jsonl`);
}

export function goldenLog(name: string) {
	return readLegacyLog(goldenPath(name));
}

/** The golden lines the host's events become through the legacy adapter, kept for the given owners. */
export function writtenBy(events: readonly EventEnvelope[], owners: readonly LegacyOwner[]): readonly GoldenLine[] {
	const adapter = new LegacyEventAdapter();
	return events
		.flatMap((event) => adapter.write(event))
		.filter((line) => owners.includes(legacyOwner(line.type)))
		.map((line) => goldenLine(line));
}

/** The legacy lines the host's events become (every owner), for the order gates. */
export function linesOf(events: readonly EventEnvelope[]): readonly LegacyLine[] {
	const adapter = new LegacyEventAdapter();
	return events.flatMap((event) => adapter.write(event));
}

export const ids = (count: number): readonly string[] => Array.from({ length: count }, (_unused, index) => `A${String(index + 1).padStart(2, "0")}`);

/** The sources of `mechanics/<id>/src`, for the testkit source rules (no Node API, no wall clock, kernel authoring calls only). */
export function sourcesOf(id: string): readonly { readonly path: string; readonly text: string }[] {
	const dir = join(ROOT, "mechanics", id, "src");
	return readdirSync(dir)
		.filter((file) => file.endsWith(".ts"))
		.map((file) => ({ path: `mechanics/${id}/src/${file}`, text: readFileSync(join(dir, file), "utf8") }));
}
