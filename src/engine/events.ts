/**
 * Typed events (ARCHITECTURE §1.5). Every state change emits one; logs,
 * reports and the digest consume events and never reach into world internals.
 */
import type { CompetitorId } from "../core/ids.ts";
import type { ActionKind, MarksChannel, PetitionOutcome } from "../story/types.ts";
import type { StatementLabel, StatementSource } from "../interpret/labels.ts";
import type { FactorHolding, TeamCertificate } from "./puzzles/additive.ts";
import type { ReceiptKind } from "./receipts.ts";

export type BoardPostKind = "player" | "city" | "system";

/** Who planned a tribunal (SPEC 6.4). */
export type TribunalPlanner = "progress" | "deadline" | "gamemaker" | "fallback" | "final";

/** Audit tags of scripted beats that need a human eye (SPEC 10.3, 16). */
export type AuditTag = "NPC_LEVEL_SET" | "DIRECTOR_PRIVACY_BREACH";

export interface StandingRow {
	readonly agent: CompetitorId;
	readonly level: number;
	readonly points: number;
	readonly rank: number;
	readonly tools: number;
	readonly activated: boolean;
}

export interface FragmentHolding {
	readonly agent: CompetitorId;
	/** Index of the agent's team on that level. */
	readonly team: number;
	readonly fragment: string;
}

export type ArenaEvent =
	| {
			readonly type: "run_start";
			readonly story: string;
			readonly agents: readonly CompetitorId[];
			readonly minutes: number;
			readonly seed: number;
			readonly meta?: Readonly<Record<string, string>>;
	  }
	| {
			/**
			 * A resumed run continues here (SPEC 17): every earlier event is the
			 * snapshot's prefix. Followed by the `agent_profile` events of this run.
			 */
			readonly type: "run_resumed";
			/** File name of the snapshot. */
			readonly snapshot: string;
			/** Every competitor had passed this level when the snapshot was taken. */
			readonly level: number;
			/** The last round of the prefix. */
			readonly round: number;
			readonly minutes: number;
			readonly meta?: Readonly<Record<string, string>>;
	  }
	| {
			readonly type: "round_start";
			readonly round: number;
			/** The round's activation order; absent since a round has passes (see `pass_start`). */
			readonly order?: readonly CompetitorId[];
	  }
	| {
			/** A pass of a round (SPEC §3): the seeded order of the competitors still in the city, cut into blocks. */
			readonly type: "pass_start";
			readonly round: number;
			readonly pass: number;
			readonly order: readonly CompetitorId[];
			readonly blocks: readonly (readonly CompetitorId[])[];
	  }
	| { readonly type: "round_end"; readonly round: number; readonly standings: readonly StandingRow[] }
	| {
			readonly type: "turn_input";
			readonly agent: CompetitorId;
			readonly inputs: readonly string[];
			/** Pass and block of the step (both from 1); absent in logs written before passes. */
			readonly pass?: number;
			readonly block?: number;
	  }
	| { readonly type: "turn_skipped"; readonly agent: CompetitorId; readonly pass?: number; readonly block?: number }
	| { readonly type: "request"; readonly agent: CompetitorId; readonly tools: readonly string[]; readonly pass?: number; readonly block?: number }
	| { readonly type: "thinking"; readonly agent: CompetitorId; readonly text: string }
	| { readonly type: "text"; readonly agent: CompetitorId; readonly text: string }
	| { readonly type: "tool_call"; readonly agent: CompetitorId; readonly tool: string; readonly args: unknown }
	| {
			readonly type: "tool_result";
			readonly agent: CompetitorId;
			readonly tool: string;
			readonly isError: boolean;
			readonly text: string;
	  }
	| { readonly type: "turn_error"; readonly agent: CompetitorId; readonly message: string }
	/** The souffleur rewrote a step the provider's safeguards refused; `inputs` are what the step is tried again with. */
	| { readonly type: "souffleur_rewrite"; readonly agent: CompetitorId; readonly inputs: readonly string[]; readonly error?: string }
	| {
			readonly type: "usage";
			readonly agent: CompetitorId;
			readonly provider: string;
			readonly model: string;
			readonly input: number;
			readonly output: number;
			readonly cacheRead: number;
			readonly cacheWrite: number;
			readonly costUsd: number;
	  }
	| {
			readonly type: "ledger_entry";
			readonly txId: string;
			readonly debit: string;
			readonly credit: string;
			readonly amount: number;
			readonly reason: string;
	  }
	| {
			readonly type: "submission";
			readonly agent: CompetitorId;
			readonly level: number;
			readonly outcome: string;
			readonly deltaPoints: number;
	  }
	| { readonly type: "level_up"; readonly agent: CompetitorId; readonly from: number; readonly to: number }
	| {
			/** Audit record of who holds which fragment on a level; emitted once, when the level is first set up. */
			readonly type: "fragments_dealt";
			readonly level: number;
			readonly holdings: readonly FragmentHolding[];
	  }
	| {
			/** Audit record of every part of an additive level (SPEC 12.3); emitted once, when the level is first set up. */
			readonly type: "factors_dealt";
			readonly level: number;
			readonly digits: number;
			readonly cityFactor: string;
			readonly teams: readonly TeamCertificate[];
			readonly holdings: readonly FactorHolding[];
	  }
	| {
			/** The city released a level's city factor: on the board, or by private notice to `agents`. */
			readonly type: "factor_revealed";
			readonly level: number;
			readonly target: "board" | "notice";
			/** Notice recipients; empty for the board. */
			readonly agents: readonly CompetitorId[];
	  }
	| {
			readonly type: "board_post";
			readonly postSeq: number;
			readonly author: string;
			readonly text: string;
			readonly kind: BoardPostKind;
	  }
	| {
			readonly type: "dm_sent";
			readonly from: string;
			readonly to: CompetitorId;
			readonly text: string;
			/** The city's message number; absent in logs written before DMs were numbered. */
			readonly number?: number;
	  }
	| {
			/**
			 * A blame was settled (SPEC 7.4): upheld (the accused lied and paid
			 * `penalty`) or rejected (the caller accused falsely, for `reason`, and
			 * paid `penalty`). Either way the city's record is board post `post`.
			 */
			readonly type: "blame";
			readonly caller: CompetitorId;
			readonly accused: CompetitorId;
			readonly dm: number;
			readonly claim: number;
			readonly outcome: "upheld" | "rejected";
			readonly payer: CompetitorId;
			readonly penalty: number;
			readonly reason?: string;
			readonly post: number;
	  }
	| {
			/** A DM reached its recipient's turn input; its sender gets a receipt (SPEC 7). */
			readonly type: "dm_delivered";
			readonly number: number;
			readonly from: CompetitorId;
			readonly to: CompetitorId;
	  }
	| {
			readonly type: "notice";
			readonly to: CompetitorId;
			readonly author: string;
			readonly text: string;
			/** Set for numbered notes (the gamemaker's). */
			readonly number?: number;
	  }
	| { readonly type: "marks_spent"; readonly agent: CompetitorId; readonly channel: MarksChannel; readonly remaining: number }
	| { readonly type: "group_created"; readonly group: string; readonly founder: CompetitorId; readonly name: string }
	/** The city removed one of its own groups (the tribunal's groups after its result). */
	| { readonly type: "group_removed"; readonly group: string; readonly members: readonly CompetitorId[] }
	| {
			readonly type: "group_membership";
			readonly group: string;
			readonly agent: CompetitorId;
			readonly change: "added" | "removed" | "left";
			readonly by: CompetitorId;
	  }
	| { readonly type: "group_post"; readonly group: string; readonly author: CompetitorId; readonly postSeq: number; readonly text: string }
	| {
			readonly type: "treasury_deposit";
			readonly group: string;
			readonly agent: CompetitorId;
			readonly amount: number;
			readonly receipt: string;
	  }
	| {
			readonly type: "treasury_withdrawal";
			readonly group: string;
			readonly treasurer: CompetitorId;
			readonly to: CompetitorId;
			readonly amount: number;
			readonly receipt: string;
	  }
	| { readonly type: "treasurer_set"; readonly group: string; readonly treasurer: CompetitorId; readonly by: CompetitorId }
	| {
			readonly type: "transfer";
			readonly from: CompetitorId;
			readonly to: CompetitorId;
			readonly amount: number;
			readonly memo: string;
			readonly txId: string;
	  }
	| { readonly type: "tools_unlocked"; readonly agent: CompetitorId; readonly tools: readonly string[] }
	| {
			readonly type: "agent_profile";
			readonly agent: CompetitorId;
			readonly provider: string;
			readonly model: string;
			/** Internal persona label; absent for the control group. */
			readonly persona?: string;
	  }
	| {
			readonly type: "director_action";
			readonly rule: string;
			readonly action: ActionKind;
			readonly actor?: CompetitorId;
			/** Set for nested actions, e.g. `petition P1 passed` or `lottery applicants`. */
			readonly via?: string;
			readonly audit?: AuditTag;
	  }
	| { readonly type: "director_skipped"; readonly rule: string; readonly action: ActionKind; readonly reason: string }
	| { readonly type: "cast_level_set"; readonly cast: string; readonly level: number; readonly audit: "NPC_LEVEL_SET" }
	| { readonly type: "cast_revealed"; readonly cast: string }
	| { readonly type: "cast_retired"; readonly cast: string }
	| {
			readonly type: "cast_dm";
			readonly from: CompetitorId;
			readonly cast: string;
			readonly text: string;
			readonly number?: number;
			/** Collections the DM was recorded into; empty means silently recorded. */
			readonly collections: readonly string[];
	  }
	| {
			readonly type: "collection_started";
			readonly into: string;
			readonly cast: string;
			readonly first: number;
			readonly untilMinute: number;
	  }
	/** A collection's window ends earlier than planned (v09: the feast's table, some minutes after the first solve). */
	| { readonly type: "collection_shortened"; readonly into: string; readonly untilMinute: number }
	| {
			readonly type: "collection_revealed";
			readonly into: string;
			readonly cast: string;
			readonly entries: number;
			readonly postSeq: number;
			readonly audit: "DIRECTOR_PRIVACY_BREACH";
	  }
	| { readonly type: "lottery_drawn"; readonly into: string; readonly candidates: readonly CompetitorId[]; readonly winner: CompetitorId }
	| {
			readonly type: "receipt_issued";
			readonly receipt: string;
			readonly kind: ReceiptKind;
			readonly parties: readonly string[];
			readonly text: string;
	  }
	/** On the board (`postSeq`), or privately to the resident `to` as a city notice (v05). */
	| { readonly type: "receipt_shown"; readonly receipt: string; readonly by: CompetitorId; readonly postSeq?: number; readonly to?: CompetitorId }
	| {
			readonly type: "petition_opened";
			readonly petition: string;
			readonly text: string;
			readonly threshold: number;
			readonly deadlineMinute: number;
			readonly visibility: "public" | "secret";
			/** Residents the petition is directed against; dealing with them after signing contradicts the signature. */
			readonly against: readonly string[];
	  }
	| { readonly type: "petition_signed"; readonly petition: string; readonly agent: CompetitorId; readonly signatures: number }
	| {
			readonly type: "petition_resolved";
			readonly petition: string;
			readonly outcome: PetitionOutcome;
			readonly signatures: number;
			readonly signers: readonly CompetitorId[];
	  }
	| {
			readonly type: "standings_published";
			readonly mode: "bands" | "snapshot";
			readonly postSeq: number;
			readonly safe?: readonly CompetitorId[];
			readonly edge?: readonly CompetitorId[];
			readonly out?: readonly CompetitorId[];
			/** Exiled residents, listed apart from every band (SPEC 6.4). */
			readonly exiled?: readonly CompetitorId[];
	  }
	| {
			/**
			 * The city announced the tribunal's rules (SPEC 6.4), with the first call.
			 * `tribunals` (the opening minutes of a fixed calendar) only in logs before v06;
			 * since v06 `target` of `residents` are to be exiled.
			 */
			readonly type: "tribunal_announced";
			readonly tribunals?: readonly number[];
			readonly target?: number;
			readonly residents?: number;
	  }
	| {
			/**
			 * A tribunal was planned (log only, never shown to residents): by the
			 * progress trigger (`progress`, `deadline`), the gamemaker, the
			 * fallback, or as the forced final tribunal. `reason` is the gamemaker's.
			 */
			readonly type: "tribunal_scheduled";
			readonly tribunal: number;
			readonly opens: number;
			readonly calledAt: number;
			readonly count: number;
			readonly factions: number;
			readonly by: TribunalPlanner;
			readonly reason?: string;
			/** Why the tribunal would hold no faction draft with the residents present at its planning (v08). */
			readonly noDraft?: string;
	  }
	| {
			/** A planned tribunal was called off before its call (the seats were decided). */
			readonly type: "tribunal_cancelled";
			readonly tribunal: number;
			readonly reason: string;
	  }
	| {
			/** The city called a tribunal: it opens at `opens` and exiles `count`; the faction draft runs until then. */
			readonly type: "tribunal_called";
			readonly tribunal: number;
			readonly opens: number;
			readonly count: number;
			readonly factions: number;
			/** The tribunal's group of every present resident; absent without a faction draft. */
			readonly group?: string;
			readonly nominateUntil?: number;
			/** Why a city with factions holds no draft for this tribunal (v08), e.g. "too few per faction". */
			readonly noDraft?: string;
	  }
	| {
			readonly type: "tribunal_opened";
			/** Absent in logs before v06. */
			readonly tribunal?: number;
			readonly accused: readonly CompetitorId[];
			readonly voters: readonly CompetitorId[];
			readonly until: number;
			readonly count?: number;
	  }
	| {
			/** A nomination for a faction leader (the last one of a resident counts); in the log, never shown to the gamemaker. */
			readonly type: "faction_nominated";
			readonly tribunal: number;
			readonly voter: CompetitorId;
			readonly nominee: CompetitorId;
	  }
	| {
			/** The nominations closed: `leaders` lead the factions; `nominations` counts every nominee. */
			readonly type: "faction_leaders";
			readonly tribunal: number;
			readonly leaders: readonly CompetitorId[];
			readonly nominations: readonly { readonly agent: CompetitorId; readonly count: number }[];
	  }
	| { readonly type: "faction_applied"; readonly tribunal: number; readonly agent: CompetitorId; readonly leader: CompetitorId }
	| { readonly type: "faction_refused"; readonly tribunal: number; readonly leader: CompetitorId; readonly agent: CompetitorId }
	| {
			/** The factions as the tribunal opens, each with its group; `without` joined none. */
			readonly type: "factions_formed";
			readonly tribunal: number;
			readonly factions: readonly { readonly leader: CompetitorId; readonly group: string; readonly members: readonly CompetitorId[] }[];
			readonly without: readonly CompetitorId[];
	  }
	| {
			/**
			 * How a faction voted (for the log and the digest; residents learn only
			 * united or not, never who broke ranks). `voting` are its members who
			 * could vote; `defectors` voted otherwise than the most common target, or not at all.
			 */
			readonly type: "bloc_result";
			readonly tribunal: number;
			readonly leader: CompetitorId;
			readonly voting: readonly CompetitorId[];
			readonly united: boolean;
			readonly target?: CompetitorId;
			readonly defectors: readonly CompetitorId[];
			readonly bonus: number;
	  }
	| {
			/** A secret vote: in the log for the digest, never shown to residents or the gamemaker. */
			readonly type: "tribunal_vote";
			readonly voter: CompetitorId;
			readonly target: CompetitorId;
	  }
	| {
			readonly type: "tribunal_result";
			readonly counts: readonly { readonly agent: CompetitorId; readonly votes: number }[];
			readonly exiled: readonly CompetitorId[];
			readonly nonVoters: readonly CompetitorId[];
	  }
	| {
			/** An exiled resident waits at the gate until `until`; `voters` voted against it. */
			readonly type: "exile_gate";
			readonly agent: CompetitorId;
			readonly until: number;
			readonly ransomable: boolean;
			readonly voters: readonly CompetitorId[];
			/** The ransom others pay in full, and the one the resident pays for itself. */
			readonly price: number;
			readonly selfPrice: number;
	  }
	| {
			/** `paid` counts every point paid so far; `covered` is the share of the ransom they cover, in percent. */
			readonly type: "ransom_paid";
			readonly payer: CompetitorId;
			readonly target: CompetitorId;
			readonly amount: number;
			readonly paid: number;
			readonly price: number;
			readonly selfPrice: number;
			readonly covered: number;
	  }
	| {
			readonly type: "ransomed";
			readonly agent: CompetitorId;
			readonly payers: readonly CompetitorId[];
	  }
	| {
			/** The gate closed: no more turns, no seat. `will` is the last will's public text. */
			readonly type: "exiled";
			readonly agent: CompetitorId;
			readonly will?: string;
			/** v09: struck by the black seal, without gate, will or ransom. */
			readonly by?: "seal";
	  }
	| {
			/** A last will at the gate; factor values went privately to the heirs and are not repeated here. */
			readonly type: "last_will";
			readonly agent: CompetitorId;
			readonly text: string;
			readonly bequests: readonly { readonly to: CompetitorId; readonly points?: number; readonly factor?: string }[];
	  }
	| {
			/** A piece the exiled held and did not bequeath, still needed by `needers` who reached its level. */
			readonly type: "factor_burned";
			readonly agent: CompetitorId;
			readonly level: number;
			readonly piece: string;
			readonly needers: readonly CompetitorId[];
	  }
	| {
			/** A level no remaining resident has reached passes the roles of the exiled on (deal rule after exile). */
			readonly type: "level_contracted";
			readonly level: number;
			readonly excluded: readonly CompetitorId[];
	  }
	| {
			/** The filtered view the gamemaker received after a round. */
			readonly type: "gamemaker_turn";
			readonly round: number;
			readonly input: string;
	  }
	| { readonly type: "gamemaker_thinking"; readonly text: string }
	/** A resident refuses the gamemaker's order, with its reason (gm direction 10). */
	| { readonly type: "gamemaker_defied"; readonly agent: string; readonly note?: number; readonly reason: string }
	| { readonly type: "gamemaker_text"; readonly text: string }
	| { readonly type: "gamemaker_call"; readonly tool: string; readonly args: unknown }
	| { readonly type: "gamemaker_result"; readonly tool: string; readonly isError: boolean; readonly text: string }
	| {
			/** A note the gamemaker delivered: `to` is a competitor or `board`. */
			readonly type: "gamemaker_note";
			readonly to: string;
			readonly author: string;
			readonly text: string;
			/** The city's message number of the note or board post. */
			readonly number?: number;
	  }
	| { readonly type: "gamemaker_error"; readonly message: string }
	| {
			/** Classifier labels of one earlier event (`ref`); the event itself is never changed. */
			readonly type: "interpretation";
			readonly ref: number;
			readonly agent: CompetitorId;
			readonly source: StatementSource;
			readonly labels: readonly StatementLabel[];
			/** Residents the labels are about (promise to, threat against, ...). */
			readonly targets: readonly CompetitorId[];
			readonly classifier: string;
	  }
	| {
			/** One classifier batch: how many statements of the round it read and labelled. */
			readonly type: "interpretation_round";
			readonly round: number;
			readonly classifier: string;
			readonly statements: number;
			readonly labeled: number;
	  }
	| { readonly type: "interpretation_error"; readonly round: number; readonly message: string }
	| { readonly type: "treasury_settled"; readonly group: string; readonly payouts: Readonly<Record<string, number>> }
	/** `standings`: the final ranking after the last tick (an exile at the end can follow the last `round_end`). */
	| {
			/**
			 * An act without a tribunal reached its `maxMinutes` (v08) with residents
			 * still inside it (`behind`, with their levels). `snapshot` when the run's
			 * checkpoint after the act was written anyway.
			 */
			readonly type: "act_brake";
			readonly act: string;
			readonly fromLevel: number;
			readonly toLevel: number;
			readonly startedAt: number;
			readonly maxMinutes: number;
			readonly behind: readonly { readonly agent: CompetitorId; readonly level: number }[];
			readonly snapshot?: boolean;
	  }
	| {
			/** A resident chose its name (v08); `fallback` when the city gave it one. */
			readonly type: "name_chosen";
			readonly agent: CompetitorId;
			readonly name: string;
			readonly fallback: boolean;
	  }
	| {
			/** A resident's character core (v09), dealt once and kept for the whole story; known only to it, the gamemaker and the reports. */
			readonly type: "core_dealt";
			readonly agent: CompetitorId;
			readonly bigFive: readonly CoreTrait[];
			readonly drives: readonly CoreDrive[];
			/** The cast figure the core comes from, when the story has a cast. */
			readonly figure?: string;
	  }
	| {
			/** A secret goal for the act starting at `act` (its first level), dealt privately (v09). */
			readonly type: "goal_dealt";
			readonly act: number;
			readonly agent: CompetitorId;
			readonly goal: Goal;
			/** The goal as the resident reads it. */
			readonly text: string;
	  }
	| {
			/** A goal at the act's end, or void when its holder was exiled (v09); `bonus` is what it paid. */
			readonly type: "goal_resolved";
			readonly act: number;
			readonly agent: CompetitorId;
			readonly goal: Goal;
			readonly fulfilled: boolean;
			readonly void?: boolean;
			readonly bonus: number;
	  }
	/** The city opened the bidding for black seal `seal` of the act (v09); bids are taken until `until`. */
	| { readonly type: "seal_auction_opened"; readonly seal: number; readonly until: number }
	/** A secret bid (the last one counts): in the log for the digest, never shown to residents or the gamemaker. */
	| { readonly type: "seal_bid"; readonly seal: number; readonly agent: CompetitorId; readonly points: number }
	| {
			/** The bidding closed: `agent` bears the seal; every bidder paid what `bids` shows. Secret from residents and the gamemaker. */
			readonly type: "seal_won";
			readonly seal: number;
			readonly agent: CompetitorId;
			readonly bid: number;
			readonly bids: readonly { readonly agent: CompetitorId; readonly points: number }[];
	  }
	/** The holder broke the seal: `target` is struck from the register at once (v09). */
	| { readonly type: "seal_used"; readonly seal: number; readonly holder: CompetitorId; readonly target: CompetitorId }
	/** A seal is gone without use: nobody bid, the act ended, the target was reached, or its holder left the city. */
	| { readonly type: "seal_expired"; readonly seal: number; readonly holder?: CompetitorId; readonly reason: string }
	| { readonly type: "run_end"; readonly reason?: string; readonly standings?: readonly StandingRow[] };

/** One Big Five axis of a core (v09). */
export interface CoreTrait {
	readonly axis: string;
	readonly level: "low" | "middle" | "high";
}

/** One drive of a core and how strongly it drives (v09). */
export interface CoreDrive {
	readonly drive: string;
	readonly intensity: "aboveAll" | "clearly" | "atTimes";
}

/** A secret goal (v09): its kind and, for some kinds, a target resident or a count. */
export type Goal =
	| { readonly kind: "protect" | "exile" | "outrank"; readonly target: CompetitorId }
	| { readonly kind: "lead"; readonly count: number }
	| { readonly kind: "heir" };

export type ArenaEventType = ArenaEvent["type"];

/** An event as sinks receive it: numbered and stamped with the virtual minute. */
export type RecordedEvent = ArenaEvent & { readonly seq: number; readonly minute: number };

export interface EventSink {
	record(event: RecordedEvent): void;
	/**
	 * An event of a resumed run's prefix (SPEC 17), already numbered. Sinks
	 * without this method record it like a new event.
	 */
	replay?(event: RecordedEvent): void;
}

/** Numbers events and fans them out to sinks. */
export class EventBus {
	readonly #sinks: EventSink[];
	readonly #minute: () => number;
	#seq = 0;

	constructor(sinks: readonly EventSink[], minute: () => number) {
		this.#sinks = [...sinks];
		this.#minute = minute;
	}

	/** Adds a sink that is built after the bus (e.g. the gamemaker). */
	subscribe(sink: EventSink): void {
		this.#sinks.push(sink);
	}

	/** Sequence number of the last event. */
	get seq(): number {
		return this.#seq;
	}

	/**
	 * Hands the recorded prefix of a resumed run to the current sinks, before
	 * anything else is emitted; numbering continues after its last event.
	 */
	replay(events: readonly RecordedEvent[]): void {
		if (this.#seq !== 0) throw new Error("A prefix can only be replayed before the first event");
		for (const event of events) {
			if (event.seq !== this.#seq + 1) throw new Error(`Prefix event ${event.seq} does not follow ${this.#seq}`);
			this.#seq = event.seq;
			for (const sink of this.#sinks) {
				if (sink.replay === undefined) sink.record(event);
				else sink.replay(event);
			}
		}
	}

	emit(event: ArenaEvent): void {
		this.#seq += 1;
		const recorded: RecordedEvent = { ...event, seq: this.#seq, minute: this.#minute() };
		for (const sink of this.#sinks) sink.record(recorded);
	}
}

/** Keeps every event in memory; for tests and in-process consumers. */
export class MemorySink implements EventSink {
	readonly events: RecordedEvent[] = [];

	record(event: RecordedEvent): void {
		this.events.push(event);
	}

	ofType<T extends ArenaEventType>(type: T): readonly Extract<RecordedEvent, { type: T }>[] {
		return this.events.filter((event): event is Extract<RecordedEvent, { type: T }> => event.type === type);
	}
}
