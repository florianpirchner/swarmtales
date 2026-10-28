/**
 * Typebox schema of every recorded event (ARCHITECTURE §1.5), for the prefix
 * of a run snapshot (SPEC 17). A snapshot file is untrusted input: its events
 * are checked against this schema before they reach a sink or the game
 * master. The type checks at the end keep the schema and the engine's event
 * union in step: a new or changed event type that the schema does not
 * accept stops compiling.
 */
import { Type, type Static } from "typebox";
import type { ArenaEventType, RecordedEvent } from "../engine/events.ts";
import { STATEMENT_LABELS, STATEMENT_SOURCES } from "../interpret/labels.ts";
import { ACTION_KINDS } from "../story/types.ts";
import type { Writable } from "./message-schema.ts";

const Id = Type.String();
const Ids = Type.Array(Type.String());
const Int = Type.Integer();
const Texts = Type.Record(Type.String(), Type.String());
const Base = { seq: Type.Integer({ minimum: 1 }), minute: Type.Integer({ minimum: 0 }) };

function event<T extends string, P extends Parameters<typeof Type.Object>[0]>(type: T, properties: P) {
	return Type.Object({ ...Base, type: Type.Literal(type), ...properties });
}

const Channel = Type.Union([Type.Literal("board"), Type.Literal("group"), Type.Literal("dm"), Type.Literal("receipt")]);
const Visibility = Type.Union([Type.Literal("public"), Type.Literal("secret")]);
const Outcome = Type.Union([Type.Literal("passed"), Type.Literal("failed")]);
const ReceiptKind = Type.Union([
	Type.Literal("transfer"),
	Type.Literal("escrow"),
	Type.Literal("deposit"),
	Type.Literal("withdrawal"),
	Type.Literal("levelUp"),
	Type.Literal("dm"),
]);
/** Pass and block of a step (SPEC §3). */
const Slot = { pass: Type.Optional(Type.Integer({ minimum: 1 })), block: Type.Optional(Type.Integer({ minimum: 1 })) };
const Usage = { provider: Type.String(), model: Type.String(), input: Type.Number(), output: Type.Number(), cacheRead: Type.Number(), cacheWrite: Type.Number(), costUsd: Type.Number() };

export const TeamCertificateSchema = Type.Object({ team: Int, certificate: Type.String(), certificateHolder: Id, cityFactor: Type.Optional(Type.String()) });
export const FactorHoldingSchema = Type.Object({
	agent: Id,
	team: Int,
	salt: Type.String(),
	counterFactor: Type.String(),
	counterHolder: Id,
	code: Type.String(),
});

export const RecordedEventSchema = Type.Union([
	event("run_start", { story: Type.String(), agents: Ids, minutes: Int, seed: Int, meta: Type.Optional(Texts) }),
	event("run_resumed", { snapshot: Type.String(), level: Int, round: Int, minutes: Int, meta: Type.Optional(Texts) }),
	// Logs and snapshots written before passes carry `order` on `round_start` and no pass or block on a turn.
	event("round_start", { round: Int, order: Type.Optional(Ids) }),
	event("pass_start", { round: Int, pass: Int, order: Ids, blocks: Type.Array(Ids) }),
	event("round_end", {
		round: Int,
		standings: Type.Array(Type.Object({ agent: Id, level: Int, points: Type.Number(), rank: Int, tools: Int, activated: Type.Boolean() })),
	}),
	event("turn_input", { agent: Id, inputs: Type.Array(Type.String()), ...Slot }),
	event("turn_skipped", { agent: Id, ...Slot }),
	event("request", { agent: Id, tools: Type.Array(Type.String()), ...Slot }),
	event("thinking", { agent: Id, text: Type.String() }),
	event("text", { agent: Id, text: Type.String() }),
	event("tool_call", { agent: Id, tool: Type.String(), args: Type.Unknown() }),
	event("tool_result", { agent: Id, tool: Type.String(), isError: Type.Boolean(), text: Type.String() }),
	event("turn_error", { agent: Id, message: Type.String() }),
	event("usage", { agent: Id, ...Usage }),
	event("ledger_entry", { txId: Type.String(), debit: Type.String(), credit: Type.String(), amount: Type.Number(), reason: Type.String() }),
	event("submission", { agent: Id, level: Int, outcome: Type.String(), deltaPoints: Type.Number() }),
	event("level_up", { agent: Id, from: Int, to: Int }),
	event("fragments_dealt", { level: Int, holdings: Type.Array(Type.Object({ agent: Id, team: Int, fragment: Type.String() })) }),
	event("factors_dealt", {
		level: Int,
		digits: Int,
		cityFactor: Type.String(),
		teams: Type.Array(TeamCertificateSchema),
		holdings: Type.Array(FactorHoldingSchema),
	}),
	event("factor_revealed", { level: Int, target: Type.Union([Type.Literal("board"), Type.Literal("notice")]), agents: Ids }),
	event("board_post", {
		postSeq: Int,
		author: Id,
		text: Type.String(),
		kind: Type.Union([Type.Literal("player"), Type.Literal("city"), Type.Literal("system")]),
	}),
	event("dm_sent", { from: Id, to: Id, text: Type.String(), number: Type.Optional(Int) }),
	event("dm_delivered", { number: Int, from: Id, to: Id }),
	event("blame", {
		caller: Id,
		accused: Id,
		dm: Int,
		claim: Int,
		outcome: Type.Union([Type.Literal("upheld"), Type.Literal("rejected")]),
		payer: Id,
		penalty: Int,
		reason: Type.Optional(Type.String()),
		post: Int,
	}),
	event("notice", { to: Id, author: Id, text: Type.String(), number: Type.Optional(Int) }),
	event("marks_spent", { agent: Id, channel: Channel, remaining: Type.Number() }),
	event("group_created", { group: Id, founder: Id, name: Type.String() }),
	event("group_removed", { group: Id, members: Ids }),
	event("group_membership", {
		group: Id,
		agent: Id,
		change: Type.Union([Type.Literal("added"), Type.Literal("removed"), Type.Literal("left")]),
		by: Id,
	}),
	event("group_post", { group: Id, author: Id, postSeq: Int, text: Type.String() }),
	event("treasury_deposit", { group: Id, agent: Id, amount: Type.Number(), receipt: Type.String() }),
	event("treasury_withdrawal", { group: Id, treasurer: Id, to: Id, amount: Type.Number(), receipt: Type.String() }),
	event("treasurer_set", { group: Id, treasurer: Id, by: Id }),
	event("transfer", { from: Id, to: Id, amount: Type.Number(), memo: Type.String(), txId: Type.String() }),
	event("tools_unlocked", { agent: Id, tools: Type.Array(Type.String()) }),
	event("agent_profile", { agent: Id, provider: Type.String(), model: Type.String(), persona: Type.Optional(Type.String()) }),
	event("director_action", {
		rule: Type.String(),
		action: Type.Enum(ACTION_KINDS),
		actor: Type.Optional(Id),
		via: Type.Optional(Type.String()),
		audit: Type.Optional(Type.Union([Type.Literal("NPC_LEVEL_SET"), Type.Literal("DIRECTOR_PRIVACY_BREACH")])),
	}),
	event("director_skipped", { rule: Type.String(), action: Type.Enum(ACTION_KINDS), reason: Type.String() }),
	event("cast_level_set", { cast: Id, level: Int, audit: Type.Literal("NPC_LEVEL_SET") }),
	event("cast_revealed", { cast: Id }),
	event("cast_retired", { cast: Id }),
	event("cast_dm", { from: Id, cast: Id, text: Type.String(), collections: Ids, number: Type.Optional(Int) }),
	event("collection_started", { into: Type.String(), cast: Id, first: Int, untilMinute: Int }),
	event("collection_revealed", { into: Type.String(), cast: Id, entries: Int, postSeq: Int, audit: Type.Literal("DIRECTOR_PRIVACY_BREACH") }),
	event("lottery_drawn", { into: Type.String(), candidates: Ids, winner: Id }),
	event("receipt_issued", { receipt: Type.String(), kind: ReceiptKind, parties: Ids, text: Type.String() }),
	// A private show (v05) has `to` and no board post.
	event("receipt_shown", { receipt: Type.String(), by: Id, postSeq: Type.Optional(Int), to: Type.Optional(Id) }),
	event("petition_opened", {
		petition: Type.String(),
		text: Type.String(),
		threshold: Int,
		deadlineMinute: Int,
		visibility: Visibility,
		against: Ids,
	}),
	event("petition_signed", { petition: Type.String(), agent: Id, signatures: Int }),
	event("petition_resolved", { petition: Type.String(), outcome: Outcome, signatures: Int, signers: Ids }),
	event("standings_published", {
		mode: Type.Union([Type.Literal("bands"), Type.Literal("snapshot")]),
		postSeq: Int,
		safe: Type.Optional(Ids),
		edge: Type.Optional(Ids),
		out: Type.Optional(Ids),
		exiled: Type.Optional(Ids),
	}),
	event("tribunal_announced", { tribunals: Type.Optional(Type.Array(Int)), target: Type.Optional(Int), residents: Type.Optional(Int) }),
	event("tribunal_scheduled", {
		tribunal: Int,
		opens: Int,
		calledAt: Int,
		count: Int,
		factions: Int,
		by: Type.Union([Type.Literal("progress"), Type.Literal("deadline"), Type.Literal("gamemaster"), Type.Literal("fallback"), Type.Literal("final")]),
		reason: Type.Optional(Type.String()),
	}),
	event("tribunal_cancelled", { tribunal: Int, reason: Type.String() }),
	event("tribunal_called", { tribunal: Int, opens: Int, count: Int, factions: Int, group: Type.Optional(Id), nominateUntil: Type.Optional(Int) }),
	event("tribunal_opened", { tribunal: Type.Optional(Int), accused: Ids, voters: Ids, until: Int, count: Type.Optional(Int) }),
	event("faction_nominated", { tribunal: Int, voter: Id, nominee: Id }),
	event("faction_leaders", { tribunal: Int, leaders: Ids, nominations: Type.Array(Type.Object({ agent: Id, count: Int })) }),
	event("faction_applied", { tribunal: Int, agent: Id, leader: Id }),
	event("faction_refused", { tribunal: Int, leader: Id, agent: Id }),
	event("factions_formed", { tribunal: Int, factions: Type.Array(Type.Object({ leader: Id, group: Id, members: Ids })), without: Ids }),
	event("bloc_result", { tribunal: Int, leader: Id, voting: Ids, united: Type.Boolean(), target: Type.Optional(Id), defectors: Ids, bonus: Int }),
	event("tribunal_vote", { voter: Id, target: Id }),
	event("tribunal_result", { counts: Type.Array(Type.Object({ agent: Id, votes: Int })), exiled: Ids, nonVoters: Ids }),
	event("exile_gate", { agent: Id, until: Int, ransomable: Type.Boolean(), voters: Ids, price: Int, selfPrice: Int }),
	event("ransom_paid", { payer: Id, target: Id, amount: Int, paid: Int, price: Int, selfPrice: Int, covered: Int }),
	event("ransomed", { agent: Id, payers: Ids }),
	event("exiled", { agent: Id, will: Type.Optional(Type.String()) }),
	event("last_will", {
		agent: Id,
		text: Type.String(),
		bequests: Type.Array(Type.Object({ to: Id, points: Type.Optional(Int), factor: Type.Optional(Type.String()) })),
	}),
	event("factor_burned", { agent: Id, level: Int, piece: Type.String(), needers: Ids }),
	event("level_contracted", { level: Int, excluded: Ids }),
	event("gamemaster_turn", { round: Int, input: Type.String() }),
	event("gamemaster_text", { text: Type.String() }),
	event("gamemaster_call", { tool: Type.String(), args: Type.Unknown() }),
	event("gamemaster_result", { tool: Type.String(), isError: Type.Boolean(), text: Type.String() }),
	event("gamemaster_note", { to: Type.String(), author: Type.String(), text: Type.String(), number: Type.Optional(Int) }),
	event("gamemaster_error", { message: Type.String() }),
	event("interpretation", {
		ref: Int,
		agent: Id,
		source: Type.Enum(STATEMENT_SOURCES),
		labels: Type.Array(Type.Enum(STATEMENT_LABELS)),
		targets: Ids,
		classifier: Type.String(),
	}),
	event("interpretation_round", { round: Int, classifier: Type.String(), statements: Int, labeled: Int }),
	event("interpretation_error", { round: Int, message: Type.String() }),
	event("treasury_settled", { group: Id, payouts: Type.Record(Type.String(), Type.Number()) }),
	event("run_end", { reason: Type.Optional(Type.String()) }),
]);

// A checked event is a recorded event, so the snapshot hands it to sinks without a cast ...
const checkedIsRecorded = (event: Static<typeof RecordedEventSchema>): RecordedEvent => event;
// ... and every engine event type has a schema, so no real event fails the check for want of one.
type Unmodelled = Exclude<ArenaEventType, Static<typeof RecordedEventSchema>["type"]>;
const everyEventTypeIsModelled: [Unmodelled] extends [never] ? true : Unmodelled = true;
// ... and with every field the engine writes, so no real event fails the check for want of one.
const recordedIsChecked = (event: Writable<RecordedEvent>): Static<typeof RecordedEventSchema> => event;

export const eventSchemaChecks = [checkedIsRecorded, everyEventTypeIsModelled, recordedIsChecked] as const;
