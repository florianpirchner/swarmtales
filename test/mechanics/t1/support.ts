/**
 * Shared test support of team T1 (economy): the per-mechanic golden gate and the stand-in provider
 * of `ChannelsApi` (team T2 has not landed channels yet). The gate compares the lines a mechanic
 * writes through the legacy adapter with the golden lines of its own event types
 * (`compareGolden(ownedBy(readLegacyLog(path), [id]), written)`).
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { LegacyEventAdapter, legacyOwner, type LegacyOwner } from "@swarmtales/chronicle";
import type { EventEnvelope, MechanicUse } from "@swarmtales/contracts";
import { defineMechanic, refuse, reply } from "@swarmtales/kernel";
import { ChannelsApi, ChannelsEvents } from "@swarmtales/mechanic-shared";
import { goldenLine, readLegacyLog, type GoldenLine } from "@swarmtales/testkit";

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

export const ids = (count: number): readonly string[] => Array.from({ length: count }, (_unused, index) => `A${String(index + 1).padStart(2, "0")}`);

/** What the stand-in channels was asked to do, in order. */
export interface ChannelsLog {
	readonly posts: { readonly author: string; readonly text: string }[];
	readonly notices: { readonly to: string; readonly author: string; readonly text: string }[];
	readonly dms: { id: number; from: string; to: string; minute: number; answered: boolean; text: string }[];
	window: { sent: number; limit: number; from: number; until: number } | null;
}

/**
 * A stand-in provider of `ChannelsApi` with fixed answers, and a `sendDM` tool that only numbers and
 * records a DM and writes `dm_sent`. It keeps its version-0 slice like `standIn`, so a legacy snapshot resumes with it.
 */
export function channelsStandIn(): { readonly use: MechanicUse; readonly log: ChannelsLog } {
	const log: ChannelsLog = { posts: [], notices: [], dms: [], window: null };
	const Slice = Type.Object({ old: Type.Unknown(), counter: Type.Integer() });
	const mechanic = defineMechanic(
		{
			id: "channels",
			summary: "Stand-in for the channels mechanic of team T2.",
			options: Type.Object({}),
			state: (): { data: unknown; counter: number } => ({ data: null, counter: 0 }),
			events: { ...ChannelsEvents.events },
			provides: [ChannelsApi],
			prompts: { "tools/sendDM": [] },
		},
		(kit) => ({
			services: [
				kit.provide(ChannelsApi, {
					post: (input, ctx) => {
						ctx.state.counter += 1;
						log.posts.push({ author: input.author, text: input.text });
						ctx.emit("board_post", { postSeq: ctx.state.counter, author: input.author, text: input.text, kind: "city" });
						return { postSeq: ctx.state.counter };
					},
					notify: (input) => {
						log.notices.push({ to: input.to, author: input.author, text: input.text });
						return null;
					},
					note: (_input, ctx) => ({ number: (ctx.state.counter += 1) }),
					deliver: (_input, ctx) => ({ number: (ctx.state.counter += 1) }),
					takeNumber: (_input, ctx) => (ctx.state.counter += 1),
					dmWindow: () => log.window,
					dmRecords: () => log.dms.map((record) => ({ ...record })),
					createCityGroup: () => ({ group: "GT1" }),
					removeCityGroup: () => null,
					postGroupAsCity: () => null,
				}),
			],
			tools: [
				kit.tool({
					name: "sendDM",
					description: "tools/sendDM",
					parameters: Type.Object({ target: Type.String(), message: Type.String() }),
					execute: (params, ctx) => {
						if (ctx.resident === undefined) return refuse("NO_RESIDENT");
						ctx.state.counter += 1;
						const counter = ctx.state.counter;
						log.dms.push({ id: counter, from: ctx.resident, to: params.target, minute: ctx.minute, answered: false, text: params.message });
						ctx.emit("dm_sent", { from: ctx.resident, to: params.target, text: params.message, number: counter });
						return reply("sent");
					},
				}),
			],
			snapshot: kit.snapshot({
				version: 1,
				schema: Slice,
				save: (state) => ({ old: state.data, counter: state.counter }),
				load: (data) => ({ data: data.old, counter: data.counter }),
				migrations: { 0: (old) => ({ old: Parse(Type.Unknown(), old), counter: 1000 }) },
			}),
		}),
	);
	return { use: mechanic.with(), log };
}

/** The sources of `mechanics/<id>/src`, for the testkit source rules (no Node API, no wall clock, kernel authoring calls only). */
export function sourcesOf(id: string): readonly { readonly path: string; readonly text: string }[] {
	const dir = join(ROOT, "mechanics", id, "src");
	return readdirSync(dir)
		.filter((file) => file.endsWith(".ts"))
		.map((file) => ({ path: `mechanics/${id}/src/${file}`, text: readFileSync(join(dir, file), "utf8") }));
}
