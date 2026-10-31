/**
 * The host as its callers see it: the app (CLI), roles (gamemaker, script) and the testkit. The
 * kernel implements it (`createHost`).
 */
import { Type, type Static } from "typebox";
import type { EventEnvelope, EventLogView } from "./events.ts";
import type { ToolOutcome, ToolSpec } from "./tools.ts";
import type { Actor, GrantRole, ResidentId } from "./values.ts";

/** One line of a turn's inputs, tagged with the mechanic that contributed it. */
export interface TurnNote {
	readonly source: string;
	readonly text: string;
}

/** What an agent gets for one turn. */
export interface Turn {
	readonly resident: ResidentId;
	readonly minute: number;
	readonly inputs: readonly TurnNote[];
	/** Every tool granted to residents, locked or not (P46). */
	readonly tools: readonly ToolSpec[];
	/** Runs a call through the pipeline as this resident. */
	call(tool: string, params: unknown): Promise<ToolOutcome>;
}

/** An agent: the pi runner in a live run, a script in tests. */
export type TurnTaker = (turn: Turn) => Promise<void>;

/** Why a run ended. */
export type EndReason = "minutes" | "referee" | "stopped";

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
	/** Every fact, keyed `<mechanic>.<fact>`. */
	facts(): Readonly<Record<string, unknown>>;
	/** Only between minutes. */
	snapshot(): HostSnapshot;
	/** Sinks see every event after the mechanics' listeners, in log order. */
	subscribe(sink: (event: EventEnvelope) => void): void;
	/** The app reports model spending; the referee stops at `maxCostUsd`. */
	recordCost(usd: number): void;
	stop(reason: string): void;
}

const Json = Type.Unknown();

/** The host's snapshot file; parse it before resuming. Mechanic slices are checked by their own schemas. */
export const HostSnapshotSchema = Type.Object({
	format: Type.Literal("swarmtales.host"),
	version: Type.Literal(1),
	story: Type.String(),
	seed: Type.Number(),
	minute: Type.Integer({ minimum: 0 }),
	seq: Type.Integer({ minimum: 0 }),
	ended: Type.Optional(Type.Object({ reason: Type.Union([Type.Literal("minutes"), Type.Literal("referee"), Type.Literal("stopped")]), minute: Type.Integer(), limit: Type.Optional(Type.String()) })),
	residents: Type.Object({
		ids: Type.Array(Type.String()),
		attributes: Type.Record(Type.String(), Type.Record(Type.String(), Type.Record(Type.String(), Json))),
		suspensions: Type.Record(Type.String(), Type.Array(Type.String())),
	}),
	locks: Type.Record(Type.String(), Type.Array(Type.String())),
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
});

export type HostSnapshot = Static<typeof HostSnapshotSchema>;
