/**
 * The host as its callers see it: the app (CLI), roles (gamemaker, script) and the testkit. The
 * kernel implements it (`createHost`).
 */
import { Type, type Static } from "typebox";
import { DecisionSnapshotSchema } from "./decision.ts";
import type { EventEnvelope, EventLogView } from "./events.ts";
import type { HumanHand } from "./human.ts";
import type { ToolOutcome, ToolSpec } from "./tools.ts";
import type { Actor, GrantRole, ResidentId } from "./values.ts";

/** One line of a turn's inputs, tagged with the mechanic that contributed it and, when given, its kind. */
export interface TurnNote {
	readonly source: string;
	/** The kind the turn policy orders by (`status`, `notice`, ...); absent for plain lines. */
	readonly kind?: string;
	readonly text: string;
}

/**
 * What a mechanic's `turnInputs` hook returns per line: a plain line, or one with a kind. Within a
 * kind, lines are sorted by `order` (ascending, a line without one counts as 0); ties keep load order.
 */
export type TurnLine = string | { readonly kind: string; readonly text: string; readonly order?: number };

/** What an agent gets for one turn. */
export interface Turn {
	readonly resident: ResidentId;
	readonly minute: number;
	/** Where the turn sits in the minute, both counted from 1. */
	readonly pass: number;
	readonly block: number;
	readonly inputs: readonly TurnNote[];
	/** Every tool granted to residents, locked or not (P46). */
	readonly tools: readonly ToolSpec[];
	/**
	 * Resolves once every earlier member of the block has finished its turn. The agent may call its
	 * model before; `call` waits for it by itself, so the calls land in the pass's order.
	 */
	readonly ready: Promise<void>;
	/** Runs a call through the pipeline as this resident. */
	call(tool: string, params: unknown): Promise<ToolOutcome>;
	/**
	 * Writes an app event (`Host.record`) as this resident, once `ready` resolved: what a runner
	 * records on a model's arrival lands in the pass's order, whatever the models' timing.
	 */
	record(type: string, payload: unknown): Promise<void>;
}

/** An agent: the pi runner in a live run, a script in tests. */
export type TurnTaker = (turn: Turn) => Promise<void>;

/** Why a run ended; `error` when mechanic code, a hook or an agent threw (the host refuses further use). */
export type EndReason = "minutes" | "referee" | "stopped" | "error";

export interface RunEnd {
	readonly reason: EndReason;
	readonly minute: number;
	/** The limit that fired when the referee stopped the run. */
	readonly limit?: string;
}

export interface Host {
	readonly residents: readonly ResidentId[];
	/** The current minute (the next one to play). */
	readonly minute: number;
	readonly ended: RunEnd | undefined;
	readonly log: EventLogView;
	/** Mechanics in load order. */
	readonly mechanics: readonly string[];
	/** Writes `run_started` and runs `runStarted` hooks; a resumed host is started already. */
	start(): void;
	/** Plays one minute; returns the end once the run is over. */
	playMinute(agent: TurnTaker): Promise<RunEnd | undefined>;
	/** Plays until the end. */
	run(agent: TurnTaker): Promise<RunEnd>;
	/** A call by any actor (gamemaker, script) through the same pipeline. */
	call(actor: Actor, tool: string, params: unknown): Promise<ToolOutcome>;
	toolSpecs(role: GrantRole): readonly ToolSpec[];
	/**
	 * The resident tools open to `resident` now (granted, not locked, no `lock` handler refuses
	 * them), in grant order: what the old `World.enabledTools` listed, read by the agent runner for
	 * its `request` line and its tools notice. Asks the lock handlers without a call; writes nothing.
	 */
	openTools(resident: ResidentId): readonly string[];
	/** A text as callers read it: every mechanic's `display` (names for ids), for role inputs the app builds. */
	display(text: string): string;
	/** Every fact, keyed `<mechanic>.<fact>`. */
	facts(): Readonly<Record<string, unknown>>;
	/** One fact, keyed `<mechanic>.<fact>`, computed alone (`undefined` when no mechanic declares it). */
	fact(key: string): unknown;
	/** Only between minutes. */
	snapshot(): HostSnapshot;
	/** Sinks see every event after the mechanics' listeners, in log order. */
	subscribe(sink: (event: EventEnvelope) => void): void;
	/**
	 * Writes an event of the app (source `app`): what the agent runner and the roles see that no
	 * mechanic knows (a model's text, its usage, the tool call as the model wrote it). Only types
	 * declared in `HostOptions.app` are taken, with a payload of their schema.
	 */
	record(actor: Actor, type: string, payload: unknown): void;
	/**
	 * The human's hand (docs/design/overseer-api.md §5), present when a human is attached
	 * (`HostOptions.human`): each call waits in an inbox and runs at the next safe stop.
	 */
	hand(): HumanHand | undefined;
	/**
	 * What an overseer keeps for its snapshot, read-only (the weaver's queued inner voices and hard
	 * texts, which the app builds the resident's inputs and prompt from): the slice as `host.snapshot()`
	 * would hold it, or `undefined` for a name the story does not declare and for an overseer without state.
	 */
	overseerSlice(name: string): { readonly version: number; readonly data: unknown } | undefined;
	/** The app reports model spending; the referee stops at `maxCostUsd`. */
	recordCost(usd: number): void;
	stop(reason: string): void;
}

const Json = Type.Unknown();

/** A standing order (`StandingOrder`, overseer.ts) in the snapshot. */
export const StandingOrderSchema = Type.Object({
	id: Type.Integer({ minimum: 1 }),
	target: Type.String(),
	text: Type.String(),
	mode: Type.Union([Type.Literal("advice"), Type.Literal("order")]),
	lifetime: Type.Union([Type.Object({ untilMinute: Type.Integer() }), Type.Object({ calls: Type.Integer({ minimum: 1 }) }), Type.Literal("untilRevoked")]),
	issued: Type.Integer({ minimum: 0 }),
	used: Type.Integer({ minimum: 0 }),
});

/** The host's snapshot file; parse it before resuming. Mechanic slices are checked by their own schemas. */
export const HostSnapshotSchema = Type.Object({
	format: Type.Literal("swarmtales.host"),
	version: Type.Literal(1),
	story: Type.String(),
	seed: Type.Number(),
	minute: Type.Integer({ minimum: 0 }),
	seq: Type.Integer({ minimum: 0 }),
	ended: Type.Optional(
		Type.Object({ reason: Type.Union([Type.Literal("minutes"), Type.Literal("referee"), Type.Literal("stopped"), Type.Literal("error")]), minute: Type.Integer(), limit: Type.Optional(Type.String()) }),
	),
	residents: Type.Object({
		ids: Type.Array(Type.String()),
		attributes: Type.Record(Type.String(), Type.Record(Type.String(), Type.Record(Type.String(), Json))),
		suspensions: Type.Record(Type.String(), Type.Array(Type.String())),
	}),
	/** Per resident; absent in a converted old snapshot that could not tell, and then the story's start locks hold. */
	locks: Type.Optional(Type.Record(Type.String(), Type.Array(Type.String()))),
	jobs: Type.Array(
		Type.Object({
			id: Type.Integer(),
			owner: Type.String(),
			job: Type.String(),
			next: Type.Integer(),
			interval: Type.Optional(Type.Integer({ minimum: 1 })),
			data: Type.Optional(Json),
		}),
	),
	referee: Type.Object({
		/** `<limit key>|<actor>` to the count in the current window. */
		counts: Type.Record(Type.String(), Type.Integer({ minimum: 0 })),
		costUsd: Type.Number({ minimum: 0 }),
	}),
	mechanics: Type.Record(Type.String(), Type.Object({ version: Type.Integer({ minimum: 0 }), data: Json })),
	/** The open decisions (docs/design/overseer-api.md §3.2); written only while one is open, so older files stay byte-equal. */
	decisions: Type.Optional(Type.Array(DecisionSnapshotSchema)),
	/** The active standing orders (§4.2); written only while one is active. */
	orders: Type.Optional(Type.Array(StandingOrderSchema)),
	/**
	 * Per overseer name, what it used of its limits and its state's slice (§1); written only for an
	 * overseer that was called or keeps state, so the files of stories without overseers keep their bytes.
	 */
	overseers: Type.Optional(
		Type.Record(
			Type.String(),
			Type.Object({
				calls: Type.Integer({ minimum: 0 }),
				costUsd: Type.Number({ minimum: 0 }),
				slice: Type.Optional(Type.Object({ version: Type.Integer({ minimum: 0 }), data: Json })),
			}),
		),
	),
});

export type HostSnapshot = Static<typeof HostSnapshotSchema>;
