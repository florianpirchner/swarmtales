/**
 * Resume harness of the T2 mechanics: an old run snapshot (a file, or a copy of one a test changed)
 * continues on the old engine (a composed run with scripted competitors) and, converted by
 * `convertLegacySnapshot`, on the new host with the real channels, cast, petitions, receipts, ledger,
 * marks and names; progression and exile are stand-ins that read the snapshot, every other slice a
 * stand-in that keeps its version-0 data. The same plan is played from the snapshot's next minute.
 */
import { readFileSync } from "node:fs";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { resolve } from "node:path";
import { convertLegacySnapshot, parseSnapshot, type RunSnapshot } from "@swarmtales/chronicle";
import type { AnyStory, MechanicUse } from "@swarmtales/contracts";
import { MemorySink, type World } from "@swarmtales/engine";
import { createHost, defineCoreStory, defineMechanic } from "@swarmtales/kernel";
import { ScriptedModelSource, type Script } from "@swarmtales/models";
import { cast, castOptionsFromStory } from "@swarmtales/mechanic-cast";
import { channels } from "@swarmtales/mechanic-channels";
import { ledger } from "@swarmtales/mechanic-ledger";
import { marks } from "@swarmtales/mechanic-marks";
import { names } from "@swarmtales/mechanic-names";
import { petitions } from "@swarmtales/mechanic-petitions";
import { receipts } from "@swarmtales/mechanic-receipts";
import { ChannelsApi, HOOK_ORDER, legacyTurns, ProgressionApi, ProgressionEvents } from "@swarmtales/mechanic-shared";
import { createPromptLookup } from "@swarmtales/prompts";
import { standInsFor, type PlannedCall } from "@swarmtales/testkit";
import { composeRun, resolveBlockSize, resumeOverrides } from "../../../apps/cli/src/compose.ts";
import { act, say } from "../../helpers/fixture.ts";
import { exileStandIn } from "../t1/stand-ins.ts";
import { namesStandIn } from "./stand-ins.ts";
import { channelsOptionsOf, marksOptions } from "../t2/golden-world.ts";
import { TOOLS, type Plan } from "./differential.ts";

export const ROOT = resolve(import.meta.dirname, "../../..");

/** A snapshot file of the examples, parsed as JSON (untyped: a test may change it before it is used). */
export function snapshotFile(name: string): unknown {
	return JSON.parse(readFileSync(resolve(ROOT, "examples", name, "snapshot-L7.json"), "utf8"));
}

export interface Resumed {
	/** `minute:agent` to the replies in call order (`isError|text`). */
	readonly replies: ReadonlyMap<string, readonly string[]>;
	/** The lines written after the snapshot, as legacy lines. */
	readonly lines: readonly { readonly type: string; readonly [field: string]: unknown }[];
}

export interface ResumedOld extends Resumed {
	readonly world: World;
}

/** Continues the old run for `minutes` more minutes. */
export async function resumeOld(raw: unknown, story: AnyStory, minutes: number, plan: Plan): Promise<ResumedOld> {
	const snapshot: RunSnapshot = parseSnapshot(JSON.parse(JSON.stringify(raw)));
	const start = snapshot.minute + 1;
	const log = new MemorySink();
	const run = composeRun({
		story,
		overrides: { minutes: start + minutes, gamemaker: false, classifier: false, activation: "always", passesPerMinute: 1, ...resumeOverrides(snapshot) },
		models: (world) => new ScriptedModelSource(scriptOf(world, start, minutes, plan)),
		sinks: [log],
		meta: { run: "resumed" },
		resume: { snapshot, name: "snapshot-L7.json" },
	});
	await run.arena.run();
	const replies = new Map<string, string[]>();
	for (const event of log.events) {
		if (event.type !== "tool_result" || event.minute < start) continue;
		const key = `${String(event.minute)}:${event.agent}`;
		replies.set(key, [...(replies.get(key) ?? []), `${String(event.isError)}|${event.text}`]);
	}
	return { replies, lines: log.events.filter((event) => event.minute >= start && event.type !== "run_resumed").map((event) => ({ ...event })), world: run.world };
}

function scriptOf(world: World, start: number, minutes: number, plan: Plan): Script {
	return Object.fromEntries(
		world.competitors.map((agent) => [
			agent,
			Array.from({ length: minutes }, (_unused, index) => {
				const calls = plan(agent, start + index);
				return calls.length === 0 ? say() : act(...calls.map((call: PlannedCall) => ({ name: call.tool, args: argsOf(call.params) })));
			}),
		]),
	);
}

function argsOf(params: unknown): Record<string, string | number | boolean> {
	if (typeof params !== "object" || params === null) return {};
	return Object.fromEntries(
		Object.entries(params).map(([key, value]): [string, string | number | boolean] => {
			if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") throw new Error(`unsupported plan parameter ${key}`);
			return [key, value];
		}),
	);
}

const WorldFields = Type.Object({
	world: Type.Object({
		competitors: Type.Array(Type.Object({ agent: Type.String(), level: Type.Integer() })),
		tribunal: Type.Optional(Type.Object({ exiled: Type.Array(Type.String()) })),
	}),
});

/** The mechanics a resumed city loads for real; every other slice of the snapshot gets a stand-in. */
const LOADED = ["channels", "cast", "petitions", "receipts", "ledger", "marks", "names", "progression", "exile"];

/** Continues the converted snapshot on the new host for `minutes` more minutes. */
export async function resumeNew(raw: unknown, story: AnyStory, minutes: number, plan: Plan, carried: readonly Line[]) {
	const converted = convertLegacySnapshot(JSON.parse(JSON.stringify(raw)));
	const rules = marksOptions(story);
	const naming = story.names;
	const world = Parse(WorldFields, raw).world;
	const levels = Object.fromEntries(world.competitors.map((entry) => [entry.agent, entry.level]));
	const exiled = world.tribunal?.exiled ?? [];
	const definition = defineCoreStory({
		id: converted.host.story,
		seed: converted.host.seed,
		minutes: converted.host.minute + minutes,
		residents: converted.host.residents.ids,
		mechanics: [
			channels.with(channelsOptionsOf(story)),
			cast.with(castOptionsFromStory(story)),
			petitions.with({}),
			receipts.with({ quoteDms: story.rules.receipts?.quoteDms === true }),
			ledger.with({ startPoints: story.run.startPoints }),
			...(rules === undefined ? [] : [marks.with(rules)]),
			// A checkpoint from before the names has no names slice: a book without names stands in.
			...(naming === undefined || converted.host.mechanics.names === undefined ? [namesStandIn(new Map<string, string>()).with()] : [names.with({ ...naming, fallbackWords: [...naming.fallbackWords], reserved: ["STEWARD", story.city] })]),
			exileStandIn(exiled),
			progressionCarrying(carried, levels),
			...standInsFor(converted.host, LOADED),
		],
		grants: { resident: [...TOOLS, "signPetition", "listPetitions"], script: ["resolvePetition"] },
		turns: legacyTurns({ passesPerMinute: 1, blockSize: resolveBlockSize(story.run.blockSize, converted.host.residents.ids.length), activation: "always" }),
	});
	const host = createHost({ story: definition, prompts: createPromptLookup(), resume: { snapshot: converted.host, events: converted.events } });
	const cut = host.log.length;
	const replies = new Map<string, string[]>();
	await host.run(async (turn) => {
		for (const call of plan(turn.resident, turn.minute)) {
			const outcome = await turn.call(call.tool, call.params);
			const key = `${String(turn.minute)}:${turn.resident}`;
			const text = outcome.ok ? `false|${outcome.reply}` : `true|${outcome.detail === undefined || outcome.detail === "" ? outcome.code : `${outcome.code}: ${outcome.detail}`}`;
			replies.set(key, [...(replies.get(key) ?? []), text]);
		}
	});
	return { host, replies, cut, start: converted.host.minute };
}

type Line = Resumed["lines"][number];

/** A delivery notice is channels' own (it follows the DM); every other board post of the city and notice is the script's or progression's. */
const DELIVERY = /^DM #\d+ delivered to /;

/**
 * Stands in for progression, the doors and the director of the old continuation (carved by other
 * teams): it answers the levels of the snapshot, and at each minute's start it raises the levels,
 * posts the city's posts and sends the notices the old run logged, in the old order, so that the
 * numbers of the posts and the marks of the new host are those of the old run.
 */
export function progressionCarrying(lines: readonly Line[], levels: Record<string, number>): MechanicUse {
	// Only the lines before a minute's first turn (the doors, the director) and after the last turn (the act's end) are not channels' own.
	const opening = new Set<string>();
	const before: Line[] = [];
	const after: Line[] = [];
	// The last turn ends with its `usage` line; what follows is the end of the run (the act's end).
	const lastUsage = lines.map((line) => line.type).lastIndexOf("usage");
	for (const [index, line] of lines.entries()) {
		if (line.type === "round_start") opening.add(String(line.minute));
		else if (index > lastUsage) after.push(line);
		else if (!opening.has(String(line.minute))) before.push(line);
	}
	return defineMechanic(
		{ id: "progression", summary: "Replays the doors', the script's and the director's lines of an old run.", options: Type.Object({}), state: (): undefined => undefined, events: ProgressionEvents.events, provides: [ProgressionApi], requires: [ChannelsApi], prompts: { "tools/readBoard": [] } },
		(kit) => {
			type Ctx = Parameters<Parameters<typeof kit.listen<typeof ProgressionEvents, "act_ended">>[2]>[1];
			const replay = (list: readonly Line[], ctx: Pick<Ctx, "call">, minute?: number): void => {
				for (const line of list) {
					if (minute !== undefined && line.minute !== minute) continue;
					if (line.type === "board_post" && line.kind === "city") ctx.call(ChannelsApi, "post", { author: String(line.author), text: String(line.text) });
					else if (line.type === "notice" && !DELIVERY.test(String(line.text))) ctx.call(ChannelsApi, "notify", { to: String(line.to), author: String(line.author), text: String(line.text) });
				}
			};
			return {
			services: [kit.provideSome(ProgressionApi, { levelOf: (input) => levels[input.resident] ?? 1, currentAct: () => 1, firstSolveMinute: () => null, hasPassed: (input) => (levels[input.resident] ?? 1) > input.level })],
			hooks: {
				minuteStarted: {
					order: HOOK_ORDER.minuteStarted.script,
					run: (ctx) => {
						// The doors open silently in the old log; the level a resident is told in its first status line of the minute is the one it has.
						for (const line of lines) {
							if (line.minute !== ctx.minute || line.type !== "turn_input") continue;
							const agent = String(line.agent);
							const told = /\blevel (\d+)\b/.exec(String(Array.isArray(line.inputs) ? line.inputs[0] : ""));
							const level = Number(told?.[1] ?? levels[agent]);
							if (level === levels[agent]) continue;
							ctx.emit("level_up", { agent, from: levels[agent] ?? 1, to: level });
							levels[agent] = level;
							ctx.emit("level_entered", { agent, level });
						}
						replay(before, ctx, ctx.minute);
					},
				},
				// The act ends with the run: the goals' notices and the board's summary come before the treasuries are settled.
				runEnded: { order: HOOK_ORDER.runEnded.progression, run: (_reason, ctx) => replay(after, ctx) },
			},
			};
		},
	).with();
}
