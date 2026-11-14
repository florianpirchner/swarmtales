/**
 * Plays a story on the old host with a given agent and writes the run as an oracle (`format.ts`): the timeline
 * is read from the host's event log, the answers of the residents' calls from the turns themselves.
 */
import { Type } from "typebox";
import { Check } from "typebox/value";
import type { CoreStory, EventEnvelope, Host, RunEnd, ToolOutcome, TurnTaker } from "@swarmtales/contracts";
import { createHost, RUNTIME_REVISION, type HostOptions } from "@swarmtales/kernel";
import { ORACLE_FORMAT, ORACLE_VERSION, type Oracle, type OracleCall, type OracleEntry, type OracleSetup, type OracleSource } from "./format.ts";

/** Events of the platform that are scheduling or bookkeeping of the old engine; the timeline shows them in its own entries or not at all. */
const ENGINE_EVENTS = new Set(["run_started", "run_ended", "minute_started", "minute_ended", "pass_started", "turn_started", "turn_skipped", "tool_called", "tool_refused", "service_called", "job_ran"]);

/** Fields that depend on prices or the wall clock, never on the rules. */
const VOLATILE_KEYS = new Set(["costUsd", "durationMs", "elapsedMs", "timestamp", "ts", "at"]);

const TurnStarted = Type.Object({ resident: Type.String(), pass: Type.Integer(), block: Type.Integer(), inputs: Type.Array(Type.Object({ source: Type.String(), kind: Type.Optional(Type.String()), text: Type.String() })) });
const TurnSkipped = Type.Object({ resident: Type.String(), pass: Type.Integer(), block: Type.Integer() });
const ToolCalled = Type.Object({ tool: Type.String(), params: Type.Unknown() });
const AppToolResult = Type.Object({ agent: Type.String(), tool: Type.String(), text: Type.String() }, { additionalProperties: true });
const ToolRefused = Type.Object({ tool: Type.String(), stage: Type.String(), code: Type.String(), detail: Type.Optional(Type.String()) });

/** Plain JSON without functions, `undefined` and volatile fields; object keys keep their order. */
export function plainJson(value: unknown, key?: string): unknown {
	if (key !== undefined && VOLATILE_KEYS.has(key)) return 0;
	if (Array.isArray(value)) return value.map((entry: unknown) => plainJson(entry) ?? null);
	if (typeof value === "object" && value !== null) {
		const fields = Object.entries(value).flatMap(([name, entry]): [string, unknown][] => {
			const plain = plainJson(entry, name);
			return plain === undefined ? [] : [[name, plain]];
		});
		return Object.fromEntries(fields);
	}
	if (value === null || typeof value === "boolean" || typeof value === "string") return value;
	if (typeof value === "number") return Number.isFinite(value) ? value : null;
	return undefined;
}

/** The answers of the residents' calls, by the `tool_called` event that opened each. */
export class OutcomeBook {
	readonly #bySeq = new Map<number, ToolOutcome>();

	/** Wraps an agent so that every call it makes is noted with its answer. */
	wrap(host: () => Host, agent: TurnTaker): TurnTaker {
		return (turn) =>
			agent({
				...turn,
				call: async (tool, params) => {
					await turn.ready;
					const before = host().log.length;
					const outcome = await turn.call(tool, params);
					const actor = `resident:${turn.resident}`;
					const opened = host().log.since(before).find((event) => event.type === "tool_called" && event.source === "core" && event.actor === actor && !this.#bySeq.has(event.seq) && Check(ToolCalled, event.payload) && event.payload.tool === tool);
					if (opened === undefined) throw new Error(`oracle: no tool_called event for ${actor} ${tool}`);
					this.#bySeq.set(opened.seq, outcome);
					return outcome;
				},
			});
	}

	/**
	 * The answers as the app logged them (`tool_result` lines of the residents' runners), for a run that was not
	 * played through `wrap`: the answer after each resident's `tool_called`, as the text the model read.
	 */
	static fromAppEvents(events: readonly EventEnvelope[]): OutcomeBook {
		const book = new OutcomeBook();
		const used = new Set<number>();
		for (const event of events) {
			if (event.source !== "core" || event.type !== "tool_called" || !event.actor.startsWith("resident:") || !Check(ToolCalled, event.payload)) continue;
			const { tool } = event.payload;
			const agent = event.actor.slice("resident:".length);
			const result = events.find((later) => later.seq > event.seq && later.source === "app" && later.type === "tool_result" && !used.has(later.seq) && Check(AppToolResult, later.payload) && later.payload.agent === agent && later.payload.tool === tool);
			if (result === undefined || !Check(AppToolResult, result.payload)) continue;
			used.add(result.seq);
			book.#bySeq.set(event.seq, { ok: true, reply: result.payload.text });
		}
		return book;
	}

	of(seq: number): ToolOutcome | undefined {
		return this.#bySeq.get(seq);
	}
}

function callEntry(event: EventEnvelope, payload: { readonly tool: string; readonly params: unknown }, outcome: ToolOutcome | undefined, refusal: EventEnvelope | undefined): OracleCall {
	const base = { k: "call" as const, actor: event.actor, tool: payload.tool, params: plainJson(payload.params) ?? null };
	if (refusal !== undefined && Check(ToolRefused, refusal.payload)) {
		const { code, stage, detail } = refusal.payload;
		return { ...base, ok: false, code, stage, ...(detail === undefined ? {} : { detail }) };
	}
	if (outcome === undefined) return { ...base, ok: true };
	if (!outcome.ok) return { ...base, ok: false, code: outcome.code, ...(outcome.detail === undefined ? {} : { detail: outcome.detail }) };
	return { ...base, ok: true, reply: outcome.reply, ...(outcome.endsTurn === true ? { endsTurn: true } : {}) };
}

/** The timeline of a host's log: engine events become minute, turn, skip and call entries; app events (model text, usage) are left out. */
export function timelineOf(events: readonly EventEnvelope[], book: OutcomeBook): OracleEntry[] {
	const refusals = new Map<number, EventEnvelope>();
	for (const event of events) if (event.source === "core" && event.type === "tool_refused" && event.causedBy !== undefined) refusals.set(event.causedBy, event);
	const timeline: OracleEntry[] = [];
	for (const event of events) {
		if (event.source === "app") continue;
		if (event.source !== "core" || !ENGINE_EVENTS.has(event.type)) {
			const audience = event.audience === undefined ? {} : { audience: [...event.audience] };
			timeline.push({ k: "event", source: event.source, type: event.type, actor: event.actor, ...audience, payload: plainJson(event.payload) ?? null });
		} else if (event.type === "minute_started") {
			timeline.push({ k: "minute", minute: event.minute });
		} else if (event.type === "turn_started" && Check(TurnStarted, event.payload)) {
			const { resident, pass, block, inputs } = event.payload;
			timeline.push({ k: "turn", resident, pass, block, inputs: inputs.map((note) => (note.kind === undefined ? { source: note.source, text: note.text } : { source: note.source, kind: note.kind, text: note.text })) });
		} else if (event.type === "turn_skipped" && Check(TurnSkipped, event.payload)) {
			const { resident, pass, block } = event.payload;
			timeline.push({ k: "skip", resident, pass, block });
		} else if (event.type === "tool_called" && Check(ToolCalled, event.payload)) {
			timeline.push(callEntry(event, event.payload, book.of(event.seq), refusals.get(event.seq)));
		}
	}
	return timeline;
}

function countsOf(timeline: readonly OracleEntry[]): Oracle["counts"] {
	const entries: Record<string, number> = {};
	const events: Record<string, number> = {};
	for (const entry of timeline) {
		entries[entry.k] = (entries[entry.k] ?? 0) + 1;
		if (entry.k === "event") {
			const key = `${entry.source}.${entry.type}`;
			events[key] = (events[key] ?? 0) + 1;
		}
	}
	const sorted = (record: Record<string, number>): Record<string, number> => Object.fromEntries(Object.entries(record).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
	return { entries: sorted(entries), events: sorted(events) };
}

export interface TurnsSetup {
	readonly passes: number;
	readonly blockSize: number;
	readonly activation: "always" | "onNews";
	readonly order: "seeded" | "custom";
}

/** The story's own turn policy; a story whose mechanic supplies the policy passes it to `setupOf` instead. */
function turnsOf(story: CoreStory): TurnsSetup {
	const turns = story.turns ?? {};
	return { passes: turns.passes ?? 1, blockSize: turns.blockSize ?? 1, activation: turns.activation ?? "always", order: turns.order === undefined ? "seeded" : "custom" };
}

export function setupOf(story: CoreStory, host: Host, turns?: TurnsSetup): OracleSetup {
	return {
		story: story.id,
		seed: story.seed,
		minutes: story.minutes,
		residents: [...host.residents],
		mechanics: story.mechanics.map((use) => ({ id: use.mechanic.id, options: plainJson(use.options) ?? null })),
		residentTools: host.toolSpecs("resident").map((spec) => spec.name),
		locked: [...(story.locked ?? [])],
		turns: turns ?? turnsOf(story),
		...(story.limits === undefined ? {} : { limits: plainJson(story.limits) }),
	};
}

export interface OracleIdentity {
	readonly game: string;
	readonly variant: string;
	readonly source: OracleSource;
}

export interface OracleParts extends OracleIdentity {
	readonly seed: number;
	readonly setup: OracleSetup;
	readonly timeline: readonly OracleEntry[];
	readonly end: RunEnd | undefined;
	readonly truncated?: { readonly afterMinute: number; readonly reason: string };
}

export function assemble(parts: OracleParts): Oracle {
	const { end, truncated } = parts;
	return {
		format: ORACLE_FORMAT,
		version: ORACLE_VERSION,
		game: parts.game,
		variant: parts.variant,
		seed: parts.seed,
		runtimeRevision: RUNTIME_REVISION,
		source: parts.source,
		setup: parts.setup,
		...(truncated === undefined ? {} : { truncated }),
		...(end === undefined || truncated !== undefined ? {} : { end: { reason: end.reason, minute: end.minute, ...(end.limit === undefined ? {} : { limit: end.limit }) } }),
		counts: countsOf(parts.timeline),
		timeline: [...parts.timeline],
	};
}

/** Where a long run is cut: at the end of the minute in which the `count`-th event of `type` was written. */
export interface OracleCut {
	readonly type: string;
	readonly count: number;
	readonly reason: string;
}

export interface RecordOptions extends OracleIdentity {
	readonly host: Omit<HostOptions, "awaitsAnswer">;
	/** The agent, made for the started host; `awaitsAnswer` is what a live runner tells the host (`HostOptions.awaitsAnswer`). */
	readonly agent: (host: Host) => { readonly take: TurnTaker; readonly awaitsAnswer?: (resident: string) => boolean; readonly done?: () => boolean };
	/** Cut the run at a natural boundary of the game, with the reason for the file. */
	readonly cut?: OracleCut;
	readonly turns?: TurnsSetup;
	/** Completes the source once the run is over (a replay's fidelity). */
	readonly finish?: (source: OracleSource) => OracleSource;
}

/** Plays the story to its end (or to the cut) and returns the oracle. */
export async function recordOracle(options: RecordOptions): Promise<Oracle> {
	const book = new OutcomeBook();
	const ref: { agent?: ReturnType<RecordOptions["agent"]> } = {};
	const host = createHost({ ...options.host, awaitsAnswer: (resident) => ref.agent?.awaitsAnswer?.(resident) ?? false });
	host.start();
	const agent = options.agent(host);
	ref.agent = agent;
	const take = book.wrap(() => host, agent.take);
	let end: RunEnd | undefined;
	let cutAt: number | undefined;
	let reason = "the recorded run ended here (it was stopped before the game was over)";
	const { cut } = options;
	const reached = (): boolean => cut !== undefined && host.log.all().filter((event) => event.type === cut.type && event.source !== "core" && event.source !== "app").length >= cut.count;
	while (end === undefined) {
		if (reached() || agent.done?.() === true) {
			cutAt = host.minute - 1;
			if (cut !== undefined && reached()) reason = cut.reason;
			break;
		}
		end = await host.playMinute(take);
	}
	return assemble({
		game: options.game,
		variant: options.variant,
		seed: options.host.story.seed,
		source: options.finish?.(options.source) ?? options.source,
		setup: setupOf(options.host.story, host, options.turns),
		timeline: timelineOf(host.log.all(), book),
		end,
		...(cutAt === undefined ? {} : { truncated: { afterMinute: Math.max(cutAt, 0), reason } }),
	});
}

/** The file's text: one timeline entry per line, so a diff of two oracles reads entry by entry. */
export function oracleText(oracle: Oracle): string {
	const { timeline, ...head } = oracle;
	const top = JSON.stringify(head, null, "\t");
	const lines = timeline.map((entry) => `\t\t${JSON.stringify(entry)}`).join(",\n");
	return `${top.slice(0, top.lastIndexOf("}")).trimEnd()},\n\t"timeline": [\n${lines}\n\t]\n}\n`;
}
