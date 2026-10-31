/**
 * The events more than one mechanic uses, declared apart from the mechanics that emit them
 * (`defineEvents`), so a listener needs no value import of the emitter. FROZEN in wave 3.0: the
 * emitting mechanic spreads these declarations into its head (`events: { ...LedgerEvents.events,
 * ... }`) and the loader refuses a listener whose schema is not the very same object.
 *
 * The schemas are the old ones (packages/chronicle/src/snapshot/event-schema.ts) without `type`,
 * `seq` and `minute`. The legacy adapter writes a payload's keys in the order the emitting code
 * builds the object, so build it in the order listed here (it is the golden logs' order).
 */
import { Type } from "typebox";
import { defineEvents } from "@swarmtales/kernel";

const Id = Type.String();

/** T1 emits (ledger); T2 listens (channels: transfers in the inbox), T1 listens (receipts). */
export const LedgerEvents = defineEvents("ledger", {
	/** One booking of the ledger: `debit` pays `credit` (`SYSTEM_MINT_BURN` mints and burns). */
	ledger_entry: Type.Object({ txId: Type.String(), debit: Type.String(), credit: Type.String(), amount: Type.Number(), reason: Type.String() }),
	/** A resident's transfer (`transferPoints`); its `ledger_entry` comes first. */
	transfer: Type.Object({ from: Id, to: Id, amount: Type.Number(), memo: Type.String(), txId: Type.String() }),
});

/** T2 emits (channels); T1 listens (receipts, whispers), T4 listens (standoff, tribunal). */
export const ChannelsEvents = defineEvents("channels", {
	board_post: Type.Object({
		postSeq: Type.Integer(),
		author: Id,
		text: Type.String(),
		kind: Type.Union([Type.Literal("player"), Type.Literal("city"), Type.Literal("system")]),
	}),
	/** `number`: the city's message number; absent only in logs written before DMs were numbered. */
	dm_sent: Type.Object({ from: Id, to: Id, text: Type.String(), number: Type.Optional(Type.Integer()) }),
});

/** T3 emits (progression); T3 listens (script, goals), T2 listens (cast), T4 listens (seal, tribunal). */
export const ProgressionEvents = defineEvents("progression", {
	submission: Type.Object({ agent: Id, level: Type.Integer(), outcome: Type.String(), deltaPoints: Type.Number() }),
	/** Written inside `enterLevel`, before the holder notices; react to `level_entered`, which comes after them. */
	level_up: Type.Object({ agent: Id, from: Type.Integer(), to: Type.Integer() }),
	/**
	 * Silent (no legacy line, `LEGACY_SILENT_EVENTS`): a resident entered `level`, after `level_up`
	 * and the holder notices, where the old `#enterListeners` ran. The script's `onEnter` rules
	 * listen to it at once (`{ immediate: true }`), so their actions land before the `submission`.
	 */
	level_entered: Type.Object({ agent: Id, level: Type.Integer() }),
	/**
	 * Silent: the act that starts at `fromLevel` began (old `#noteActStarts`); `residents` are those
	 * still in the city. Goals deal (order `LISTENER_ORDER.act_started.goals`), then the seal begins.
	 */
	act_started: Type.Object({ fromLevel: Type.Integer({ minimum: 1 }), residents: Type.Array(Id) }),
	/** Silent: the act that started at `fromLevel` is over (old `#endAct`): the seal ends, then the goals resolve. */
	act_ended: Type.Object({ fromLevel: Type.Integer({ minimum: 1 }) }),
});

/** T4 emits (exile); T1 listens (whispers), T2 listens (channels, cast), T3 listens (goals, script). */
export const ExileEvents = defineEvents("exile", {
	/** `by`: struck by the seal or by the holdout tribunal (no gate, will or ransom). */
	exiled: Type.Object({ agent: Id, will: Type.Optional(Type.String()), by: Type.Optional(Type.Union([Type.Literal("seal"), Type.Literal("holdout")])) }),
});

/** T2 emits (petitions); T3 listens (script: `onPetitionResolved`). */
export const PetitionsEvents = defineEvents("petitions", {
	petition_resolved: Type.Object({ petition: Type.String(), outcome: Type.Union([Type.Literal("passed"), Type.Literal("failed")]), signatures: Type.Integer(), signers: Type.Array(Id) }),
});

/** T2 emits (cast); T3 listens (script: `onCollect`, a new sender in a collection). */
export const CastEvents = defineEvents("cast", {
	cast_dm: Type.Object({ from: Id, cast: Id, text: Type.String(), collections: Type.Array(Id), number: Type.Optional(Type.Integer()) }),
	/**
	 * Silent: `from` is a new sender in the collections `into` (old `onCollect` listeners), written
	 * by `CastApi.collected` once channels spent the DM's marks; the script listens at once.
	 */
	cast_collected: Type.Object({ from: Id, cast: Id, into: Type.Array(Id) }),
});

/** T1 emits (whispers); T2 listens (cores: the whisperer's own core, `story.whisperer.core`). */
export const WhispersEvents = defineEvents("whispers", {
	whisperer_chosen: Type.Object({ agent: Id }),
});

/**
 * Shared events with no form in the old log: the legacy adapter writes no line for them
 * (`LEGACY_SILENT` in packages/chronicle/src/log/legacy-events.ts holds the same list).
 */
export const LEGACY_SILENT_EVENTS = ["progression.level_entered", "progression.act_started", "progression.act_ended", "cast.cast_collected"] as const;

/** Every shared declaration, by emitting mechanic. */
export const SHARED_EVENTS = [LedgerEvents, ChannelsEvents, ProgressionEvents, ExileEvents, PetitionsEvents, CastEvents, WhispersEvents] as const;
