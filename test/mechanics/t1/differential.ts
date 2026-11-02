/**
 * The differential harness of team T1: the same planned tool calls are played through the old
 * engine (a composed `World` with scripted competitors, the real `tools/*.ts`) and through the
 * mechanics on the new host (with stand-ins for the other teams' mechanics), and the replies, the
 * events a team owns and the snapshot state are compared. A plan decides, for a resident and a
 * minute, which calls it makes; the old engine's activation order is `legacyTurns` on the new host.
 */
import type { JsonObject } from "@earendil-works/pi-ai";
import type { EventEnvelope, MechanicUse, TurnTaker } from "@swarmtales/contracts";
import type { AnyStory } from "@swarmtales/contracts";
import type { DeliveryJudge, DenialQuestion } from "@swarmtales/roles";
import { Type } from "typebox";
import { defineMechanic } from "@swarmtales/kernel";
import { HOOK_ORDER, ReceiptsApi, ChannelsApi } from "@swarmtales/mechanic-shared";
import type { LegacyOwner } from "@swarmtales/chronicle";
import { goldenLine, ownedBy, playStory, scriptedAgent, type CallRecord, type LegacyLine, type PlannedCall } from "@swarmtales/testkit";
import type { HostOptions } from "@swarmtales/kernel";
import { act, createFixture, say } from "../../helpers/fixture.ts";
import { currentScenario, expectFingerprint, fingerprintOf, recordedOld } from "../../helpers/old-engine.ts";
import { RECORDING, recordOld, recordWorld } from "../../helpers/old-engine-recorder.ts";
import { DenialQuestionRecord, OldWorldRecord, RecordedWorld } from "../../helpers/old-world.ts";
import { writtenBy } from "./support.ts";
import type { ChannelsLog } from "./channels.ts";


/** A planned call's parameters as the scripted model's arguments (plans use strings, numbers and booleans). */
function argsOf(params: unknown): JsonObject {
	if (typeof params !== "object" || params === null) return {};
	return Object.fromEntries(
		Object.entries(params).map(([key, value]): [string, string | number | boolean] => {
			if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") throw new Error(`unsupported plan parameter ${key}`);
			return [key, value];
		}),
	);
}

/** Which calls a resident makes in a minute. */
export type PlanFn = (agent: string, minute: number) => readonly PlannedCall[];

/** What one side did: every reply (`tool|isError|text`) per `minute:agent`, in call order, and the events as flat lines. */
export interface Side {
	readonly replies: ReadonlyMap<string, readonly string[]>;
	readonly lines: readonly LegacyLine[];
}

const OldRecord = Type.Object({
	fingerprint: Type.String(),
	/** The questions the old run asked its judge, in order. */
	asked: Type.Array(DenialQuestionRecord),
	replies: Type.Array(Type.Tuple([Type.String(), Type.Array(Type.String())])),
	lines: Type.Array(Type.Record(Type.String(), Type.Unknown())),
	world: OldWorldRecord,
});

export interface OldSide extends Side {
	readonly world: RecordedWorld;
}

const key = (minute: number, agent: string): string => `${String(minute)}:${agent}`;

/** The text a caller reads for an outcome, as the old runner wrote `tool_result`. */
export function replyText(outcome: CallRecord["outcome"]): string {
	if (outcome.ok) return `false|${outcome.reply}`;
	return `true|${outcome.detail === undefined || outcome.detail === "" ? outcome.code : `${outcome.code}: ${outcome.detail}`}`;
}

interface OldSpec { readonly story: AnyStory; readonly agents: number; readonly minutes: number; readonly plan: PlanFn; readonly judge?: DeliveryJudge; readonly names?: boolean; readonly figureDirection?: number; readonly seed?: number; readonly blockSize?: number }

const residentIds = (agents: number): readonly string[] => Array.from({ length: agents }, (_unused, index) => `A${String(index + 1).padStart(2, "0")}`);

/** The inputs of an old side: the spec without the plan and judge, and every call the plan makes. */
function fingerprint(spec: OldSpec): string {
	const { plan, judge, ...rest } = spec;
	const calls = residentIds(spec.agents).map((agent) => Array.from({ length: spec.minutes }, (_unused, minute) => plan(agent, minute)));
	return fingerprintOf({ ...rest, judge: judge !== undefined, calls });
}

/**
 * The plan played through the old engine (one scripted model response per resident and minute),
 * as it was recorded once before the engine went (step 18, item 7b; `test/fixtures/old-engine/`).
 */
export async function playOld(spec: OldSpec): Promise<OldSide> {
	const { name, scenario } = currentScenario();
	const now = fingerprint(spec);
	if (RECORDING) recordOld(name, scenario, { fingerprint: now, ...(await playOldLive(spec)) });
	const recorded = recordedOld(name, scenario, OldRecord);
	expectFingerprint(name, scenario, recorded.fingerprint, now);
	// The test's judge hears the old run's questions again, in order (its answers are in the recording).
	for (const question of recorded.asked) await spec.judge?.deniesReceipt(question);
	return { replies: new Map(recorded.replies), lines: recorded.lines, world: new RecordedWorld(recorded.world) };
}

/** RECORDING ONLY */
async function playOldLive(spec: OldSpec) {
	const ids = residentIds(spec.agents);
	const asked: DenialQuestion[] = [];
	const judge = spec.judge;
	const fixture = createFixture({
		story: spec.story,
		agents: spec.agents,
		minutes: spec.minutes,
		...(judge === undefined ? {} : { judge: { label: judge.label, deniesReceipt: (question: DenialQuestion) => { asked.push(question); return judge.deniesReceipt(question); } } }),
		...(spec.names === undefined ? {} : { names: spec.names }),
		...(spec.figureDirection === undefined ? {} : { figureDirection: spec.figureDirection }),
		...(spec.seed === undefined ? {} : { seed: spec.seed }),
		...(spec.blockSize === undefined ? {} : { blockSize: spec.blockSize }),
		script: () =>
			Object.fromEntries(
				ids.map((agent) => [
					agent,
					Array.from({ length: spec.minutes }, (_unused, minute) => {
						const calls = spec.plan(agent, minute);
						return calls.length === 0 ? say() : act(...calls.map((call) => ({ name: call.tool, args: argsOf(call.params) })));
					}),
				]),
			),
	});
	await fixture.run();
	const replies = new Map<string, string[]>();
	for (const event of fixture.log.events) {
		if (event.type !== "tool_result") continue;
		const at = key(event.minute, event.agent);
		replies.set(at, [...(replies.get(at) ?? []), `${String(event.isError)}|${event.text}`]);
	}
	return {
		asked,
		replies: [...replies],
		lines: fixture.log.events.map((event) => ({ ...event })),
		world: recordWorld(fixture.world),
	};
}

export interface NewSide extends Side {
	readonly events: readonly EventEnvelope[];
	readonly host: Awaited<ReturnType<typeof playStory>>["host"];
}

/** Plays the plan through the new host. */
export async function playNew(options: HostOptions, plan: PlanFn): Promise<NewSide> {
	const records: CallRecord[] = [];
	const agent: TurnTaker = scriptedAgent((turn) => plan(turn.resident, turn.minute), records);
	const run = await playStory(options, agent);
	const replies = new Map<string, string[]>();
	for (const record of records) {
		const at = key(record.minute, record.resident);
		replies.set(at, [...(replies.get(at) ?? []), replyText(record.outcome)]);
	}
	return { replies, lines: [], events: run.events, host: run.host };
}

/** The golden-style lines of the old side owned by `owners`. */
export function oldOwned(side: Side, owners: readonly LegacyOwner[]): readonly string[] {
	return ownedBy(side.lines, owners);
}

/** The golden-style lines the new events become through the legacy adapter, owned by `owners`. */
export function newOwned(side: NewSide, owners: readonly LegacyOwner[]): readonly string[] {
	return writtenBy(side.events, owners);
}

/** The payload of an event as a record (the host types it `unknown`). */
export function payloadOf(event: EventEnvelope): Readonly<Record<string, unknown>> {
	return typeof event.payload === "object" && event.payload !== null ? Object.fromEntries(Object.entries(event.payload)) : {};
}

/** One notice line (`to|author|text`) per `notice` event, in log order, old side. */
export function oldNotices(side: Side): readonly string[] {
	return side.lines.filter((line) => line.type === "notice").map((line) => goldenLine({ to: line.to, author: line.author, text: line.text }));
}

/**
 * A stand-in for the delivery of channels (team T2): when a resident's inputs are built it reads
 * its waiting DMs as the old `drainMailbox` did: the record keeps the minute and the city's last
 * message number, the DM receipt is issued, and the sender is told with the full text.
 */
export function courier(log: ChannelsLog): MechanicUse {
	return defineMechanic(
		{ id: "courier", summary: "Stand-in for the delivery of channels.", options: Type.Object({}), state: () => undefined, events: {}, requires: [ReceiptsApi, ChannelsApi] },
		() => ({
			hooks: {
				turnInputs: {
					order: HOOK_ORDER.turnInputs.channelsInbox,
					run: (resident, ctx) => {
						for (const record of log.dms) {
							if (record.to !== resident || record.deliveredMinute !== undefined) continue;
							log.deliver(record.id, ctx.minute);
							const { id } = ctx.call(ReceiptsApi, "issue", { body: { kind: "dm", from: record.from, to: record.to, number: record.id, text: record.text } });
							ctx.call(ChannelsApi, "notify", { to: record.from, author: "CITY", text: `DM #${String(record.id)} delivered to ${record.to} at minute ${String(ctx.minute)} (receipt ${id}): "${record.text}"` });
						}
						return [];
					},
				},
			},
		}),
	).with();
}
