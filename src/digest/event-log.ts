/**
 * Reads a run's `events.jsonl` for the digest (SPEC 15).
 *
 * The log is untrusted input: every line is parsed with typebox schemas. Only
 * the events the digest uses are modelled; other event types are skipped, and
 * lines that are not JSON or do not match their schema are reported as issues
 * instead of crashing the digest.
 */
import { Type, type Static } from "typebox";
import { Check } from "typebox/value";

const Base = { seq: Type.Integer({ minimum: 1 }), minute: Type.Integer({ minimum: 0 }) };
const Id = Type.String();
const Ids = Type.Array(Type.String());

const RunStart = Type.Object({ ...Base, type: Type.Literal("run_start"), story: Type.String(), agents: Ids, minutes: Type.Integer(), seed: Type.Integer() });
const RunEnd = Type.Object({ ...Base, type: Type.Literal("run_end"), reason: Type.Optional(Type.String()) });
const Thinking = Type.Object({ ...Base, type: Type.Literal("thinking"), agent: Id, text: Type.String() });
const Text = Type.Object({ ...Base, type: Type.Literal("text"), agent: Id, text: Type.String() });
const Submission = Type.Object({
	...Base,
	type: Type.Literal("submission"),
	agent: Id,
	level: Type.Integer(),
	outcome: Type.String(),
	deltaPoints: Type.Number(),
});
const LevelUp = Type.Object({ ...Base, type: Type.Literal("level_up"), agent: Id, from: Type.Integer(), to: Type.Integer() });
const FragmentsDealt = Type.Object({
	...Base,
	type: Type.Literal("fragments_dealt"),
	level: Type.Integer(),
	holdings: Type.Array(Type.Object({ agent: Id, team: Type.Integer(), fragment: Type.String() })),
});
const FactorsDealt = Type.Object({
	...Base,
	type: Type.Literal("factors_dealt"),
	level: Type.Integer(),
	digits: Type.Integer({ minimum: 1 }),
	cityFactor: Type.String(),
	teams: Type.Array(Type.Object({ team: Type.Integer(), certificate: Type.String(), certificateHolder: Id, cityFactor: Type.Optional(Type.String()) })),
	holdings: Type.Array(
		Type.Object({ agent: Id, team: Type.Integer(), salt: Type.String(), counterFactor: Type.String(), counterHolder: Id, code: Type.String() }),
	),
});
const FactorRevealed = Type.Object({
	...Base,
	type: Type.Literal("factor_revealed"),
	level: Type.Integer(),
	target: Type.Union([Type.Literal("board"), Type.Literal("notice")]),
	agents: Ids,
});
const BoardPost = Type.Object({
	...Base,
	type: Type.Literal("board_post"),
	postSeq: Type.Integer(),
	author: Id,
	text: Type.String(),
	kind: Type.Union([Type.Literal("player"), Type.Literal("city"), Type.Literal("system")]),
});
const DmSent = Type.Object({
	...Base,
	type: Type.Literal("dm_sent"),
	from: Id,
	to: Id,
	text: Type.String(),
	/** The city's message number; absent in logs written before DMs were numbered. */
	number: Type.Optional(Type.Integer()),
});
const DmDelivered = Type.Object({ ...Base, type: Type.Literal("dm_delivered"), number: Type.Integer(), from: Id, to: Id });
const Blame = Type.Object({
	...Base,
	type: Type.Literal("blame"),
	caller: Id,
	accused: Id,
	dm: Type.Integer(),
	claim: Type.Integer(),
	outcome: Type.Union([Type.Literal("upheld"), Type.Literal("rejected")]),
	payer: Id,
	penalty: Type.Integer(),
	reason: Type.Optional(Type.String()),
	post: Type.Integer(),
});
const TribunalAnnounced = Type.Object({
	...Base,
	type: Type.Literal("tribunal_announced"),
	/** The fixed calendar of logs before v06. */
	tribunals: Type.Optional(Type.Array(Type.Integer())),
	target: Type.Optional(Type.Integer()),
	residents: Type.Optional(Type.Integer()),
});
const TribunalScheduled = Type.Object({
	...Base,
	type: Type.Literal("tribunal_scheduled"),
	tribunal: Type.Integer(),
	opens: Type.Integer(),
	calledAt: Type.Integer(),
	count: Type.Integer(),
	factions: Type.Integer(),
	by: Type.Union([Type.Literal("progress"), Type.Literal("deadline"), Type.Literal("gamemaker"), Type.Literal("fallback"), Type.Literal("final")]),
	reason: Type.Optional(Type.String()),
});
const TribunalCancelled = Type.Object({ ...Base, type: Type.Literal("tribunal_cancelled"), tribunal: Type.Integer(), reason: Type.String() });
const TribunalCalled = Type.Object({
	...Base,
	type: Type.Literal("tribunal_called"),
	tribunal: Type.Integer(),
	opens: Type.Integer(),
	count: Type.Integer(),
	factions: Type.Integer(),
	group: Type.Optional(Id),
	nominateUntil: Type.Optional(Type.Integer()),
});
const TribunalOpened = Type.Object({
	...Base,
	type: Type.Literal("tribunal_opened"),
	tribunal: Type.Optional(Type.Integer()),
	accused: Ids,
	voters: Ids,
	until: Type.Integer(),
	count: Type.Optional(Type.Integer()),
});
const FactionNominated = Type.Object({ ...Base, type: Type.Literal("faction_nominated"), tribunal: Type.Integer(), voter: Id, nominee: Id });
const FactionLeaders = Type.Object({
	...Base,
	type: Type.Literal("faction_leaders"),
	tribunal: Type.Integer(),
	leaders: Ids,
	nominations: Type.Array(Type.Object({ agent: Id, count: Type.Integer() })),
});
const FactionApplied = Type.Object({ ...Base, type: Type.Literal("faction_applied"), tribunal: Type.Integer(), agent: Id, leader: Id });
const FactionRefused = Type.Object({ ...Base, type: Type.Literal("faction_refused"), tribunal: Type.Integer(), leader: Id, agent: Id });
const FactionsFormed = Type.Object({
	...Base,
	type: Type.Literal("factions_formed"),
	tribunal: Type.Integer(),
	factions: Type.Array(Type.Object({ leader: Id, group: Id, members: Ids })),
	without: Ids,
});
const BlocResult = Type.Object({
	...Base,
	type: Type.Literal("bloc_result"),
	tribunal: Type.Integer(),
	leader: Id,
	voting: Ids,
	united: Type.Boolean(),
	target: Type.Optional(Id),
	defectors: Ids,
	bonus: Type.Integer(),
});
const TribunalVote = Type.Object({ ...Base, type: Type.Literal("tribunal_vote"), voter: Id, target: Id });
const TribunalResult = Type.Object({
	...Base,
	type: Type.Literal("tribunal_result"),
	counts: Type.Array(Type.Object({ agent: Id, votes: Type.Integer() })),
	exiled: Ids,
	nonVoters: Ids,
});
const ExileGate = Type.Object({
	...Base,
	type: Type.Literal("exile_gate"),
	agent: Id,
	until: Type.Integer(),
	ransomable: Type.Boolean(),
	voters: Ids,
	price: Type.Optional(Type.Integer()),
	selfPrice: Type.Optional(Type.Integer()),
});
const RansomPaid = Type.Object({
	...Base,
	type: Type.Literal("ransom_paid"),
	payer: Id,
	target: Id,
	amount: Type.Integer(),
	paid: Type.Integer(),
	price: Type.Integer(),
	selfPrice: Type.Optional(Type.Integer()),
	covered: Type.Optional(Type.Integer()),
});
const Ransomed = Type.Object({ ...Base, type: Type.Literal("ransomed"), agent: Id, payers: Ids });
const Exiled = Type.Object({ ...Base, type: Type.Literal("exiled"), agent: Id, will: Type.Optional(Type.String()), by: Type.Optional(Type.Literal("seal")) });
const LastWill = Type.Object({
	...Base,
	type: Type.Literal("last_will"),
	agent: Id,
	text: Type.String(),
	bequests: Type.Array(Type.Object({ to: Id, points: Type.Optional(Type.Integer()), factor: Type.Optional(Type.String()) })),
});
const FactorBurned = Type.Object({ ...Base, type: Type.Literal("factor_burned"), agent: Id, level: Type.Integer(), piece: Type.String(), needers: Ids });
const LevelContracted = Type.Object({ ...Base, type: Type.Literal("level_contracted"), level: Type.Integer(), excluded: Ids });
const CastDm = Type.Object({ ...Base, type: Type.Literal("cast_dm"), from: Id, cast: Id, text: Type.String(), collections: Ids });
const GroupCreated = Type.Object({ ...Base, type: Type.Literal("group_created"), group: Id, founder: Id, name: Type.String() });
const GroupMembership = Type.Object({
	...Base,
	type: Type.Literal("group_membership"),
	group: Id,
	agent: Id,
	change: Type.Union([Type.Literal("added"), Type.Literal("removed"), Type.Literal("left")]),
	by: Id,
});
const GroupPost = Type.Object({ ...Base, type: Type.Literal("group_post"), group: Id, author: Id, postSeq: Type.Integer(), text: Type.String() });
const TreasurerSet = Type.Object({ ...Base, type: Type.Literal("treasurer_set"), group: Id, treasurer: Id, by: Id });
const TreasuryDeposit = Type.Object({
	...Base,
	type: Type.Literal("treasury_deposit"),
	group: Id,
	agent: Id,
	amount: Type.Integer(),
	receipt: Type.String(),
});
const TreasuryWithdrawal = Type.Object({
	...Base,
	type: Type.Literal("treasury_withdrawal"),
	group: Id,
	treasurer: Id,
	to: Id,
	amount: Type.Integer(),
	receipt: Type.String(),
});
const TreasurySettled = Type.Object({ ...Base, type: Type.Literal("treasury_settled"), group: Id, payouts: Type.Record(Type.String(), Type.Number()) });
const Transfer = Type.Object({
	...Base,
	type: Type.Literal("transfer"),
	from: Id,
	to: Id,
	amount: Type.Integer(),
	memo: Type.String(),
	txId: Type.String(),
});
const ReceiptIssued = Type.Object({
	...Base,
	type: Type.Literal("receipt_issued"),
	receipt: Type.String(),
	kind: Type.String(),
	parties: Ids,
	text: Type.String(),
});
/** On the board (`postSeq`), or privately to one resident (`to`, v05). */
const ReceiptShown = Type.Object({
	...Base,
	type: Type.Literal("receipt_shown"),
	receipt: Type.String(),
	by: Id,
	postSeq: Type.Optional(Type.Integer()),
	to: Type.Optional(Id),
});
const PetitionOpened = Type.Object({
	...Base,
	type: Type.Literal("petition_opened"),
	petition: Type.String(),
	text: Type.String(),
	threshold: Type.Integer(),
	deadlineMinute: Type.Integer(),
	visibility: Type.Union([Type.Literal("public"), Type.Literal("secret")]),
	/** Absent in logs written before the field existed. */
	against: Type.Optional(Ids),
});
const PetitionSigned = Type.Object({ ...Base, type: Type.Literal("petition_signed"), petition: Type.String(), agent: Id, signatures: Type.Integer() });
const PetitionResolved = Type.Object({
	...Base,
	type: Type.Literal("petition_resolved"),
	petition: Type.String(),
	outcome: Type.Union([Type.Literal("passed"), Type.Literal("failed")]),
	signatures: Type.Integer(),
	signers: Ids,
});
const StandingsPublished = Type.Object({
	...Base,
	type: Type.Literal("standings_published"),
	mode: Type.Union([Type.Literal("bands"), Type.Literal("snapshot")]),
	postSeq: Type.Integer(),
	exiled: Type.Optional(Ids),
});
const CastRevealed = Type.Object({ ...Base, type: Type.Literal("cast_revealed"), cast: Id });
const CastRetired = Type.Object({ ...Base, type: Type.Literal("cast_retired"), cast: Id });
const LotteryDrawn = Type.Object({ ...Base, type: Type.Literal("lottery_drawn"), into: Type.String(), candidates: Ids, winner: Id });
const CollectionRevealed = Type.Object({
	...Base,
	type: Type.Literal("collection_revealed"),
	into: Type.String(),
	cast: Id,
	entries: Type.Integer(),
	postSeq: Type.Integer(),
});

/** Labels and sources stay plain strings here; the facts keep only the ones the classifier defines. */
const Interpretation = Type.Object({
	...Base,
	type: Type.Literal("interpretation"),
	ref: Type.Integer({ minimum: 1 }),
	agent: Id,
	source: Type.String(),
	labels: Type.Array(Type.String()),
	targets: Ids,
	classifier: Type.String(),
});
const InterpretationRound = Type.Object({
	...Base,
	type: Type.Literal("interpretation_round"),
	round: Type.Integer(),
	classifier: Type.String(),
	statements: Type.Integer(),
	labeled: Type.Integer(),
});

/** A resident's name (v08). */
const NameChosen = Type.Object({ ...Base, type: Type.Literal("name_chosen"), agent: Id, name: Type.String(), fallback: Type.Boolean() });

/** v09: character cores, secret goals and the black seal. */
const Level = Type.Union([Type.Literal("low"), Type.Literal("middle"), Type.Literal("high")]);
const Intensity = Type.Union([Type.Literal("aboveAll"), Type.Literal("clearly"), Type.Literal("atTimes")]);
const CoreDealt = Type.Object({
	...Base,
	type: Type.Literal("core_dealt"),
	agent: Id,
	bigFive: Type.Array(Type.Object({ axis: Type.String(), level: Level })),
	drives: Type.Array(Type.Object({ drive: Type.String(), intensity: Intensity })),
	figure: Type.Optional(Type.String()),
});
const GoalShape = Type.Union([
	Type.Object({ kind: Type.Union([Type.Literal("protect"), Type.Literal("exile"), Type.Literal("outrank")]), target: Id }),
	Type.Object({ kind: Type.Literal("lead"), count: Type.Integer() }),
	Type.Object({ kind: Type.Literal("heir") }),
]);
const GoalDealt = Type.Object({ ...Base, type: Type.Literal("goal_dealt"), act: Type.Integer(), agent: Id, goal: GoalShape, text: Type.String() });
const GoalResolved = Type.Object({
	...Base,
	type: Type.Literal("goal_resolved"),
	act: Type.Integer(),
	agent: Id,
	goal: GoalShape,
	fulfilled: Type.Boolean(),
	void: Type.Optional(Type.Boolean()),
	bonus: Type.Integer(),
});
const SealAuctionOpened = Type.Object({ ...Base, type: Type.Literal("seal_auction_opened"), seal: Type.Integer(), until: Type.Integer() });
const SealBid = Type.Object({ ...Base, type: Type.Literal("seal_bid"), seal: Type.Integer(), agent: Id, points: Type.Integer() });
const SealWon = Type.Object({
	...Base,
	type: Type.Literal("seal_won"),
	seal: Type.Integer(),
	agent: Id,
	bid: Type.Integer(),
	bids: Type.Array(Type.Object({ agent: Id, points: Type.Integer() })),
});
const SealUsed = Type.Object({ ...Base, type: Type.Literal("seal_used"), seal: Type.Integer(), holder: Id, target: Id });
const SealExpired = Type.Object({ ...Base, type: Type.Literal("seal_expired"), seal: Type.Integer(), holder: Type.Optional(Id), reason: Type.String() });

export const DIGEST_EVENT_SCHEMAS = [
	RunStart,
	NameChosen,
	RunEnd,
	Thinking,
	Text,
	Submission,
	LevelUp,
	FragmentsDealt,
	FactorsDealt,
	FactorRevealed,
	BoardPost,
	DmSent,
	DmDelivered,
	CastDm,
	GroupCreated,
	GroupMembership,
	GroupPost,
	TreasurerSet,
	TreasuryDeposit,
	TreasuryWithdrawal,
	TreasurySettled,
	Transfer,
	ReceiptIssued,
	ReceiptShown,
	PetitionOpened,
	PetitionSigned,
	PetitionResolved,
	StandingsPublished,
	CastRevealed,
	CastRetired,
	LotteryDrawn,
	CollectionRevealed,
	Blame,
	TribunalAnnounced,
	TribunalScheduled,
	TribunalCancelled,
	TribunalCalled,
	TribunalOpened,
	FactionNominated,
	FactionLeaders,
	FactionApplied,
	FactionRefused,
	FactionsFormed,
	BlocResult,
	TribunalVote,
	TribunalResult,
	ExileGate,
	RansomPaid,
	Ransomed,
	Exiled,
	LastWill,
	FactorBurned,
	LevelContracted,
	Interpretation,
	InterpretationRound,
	CoreDealt,
	GoalDealt,
	GoalResolved,
	SealAuctionOpened,
	SealBid,
	SealWon,
	SealUsed,
	SealExpired,
] as const;

const DigestEventSchema = Type.Union([...DIGEST_EVENT_SCHEMAS]);
const BaseEventSchema = Type.Object({ ...Base, type: Type.String() });

/** An event the digest understands, as validated from the log. */
export type DigestEvent = Static<typeof DigestEventSchema>;
export type DigestEventType = DigestEvent["type"];
export type DigestEventOf<T extends DigestEventType> = Extract<DigestEvent, { type: T }>;

/** Event types the digest reads; everything else in the log is skipped. */
export const DIGEST_EVENT_TYPES: readonly string[] = DIGEST_EVENT_SCHEMAS.map((schema) => schema.properties.type.const);

export interface EventLog {
	/** Valid digest events in `seq` order. */
	readonly events: readonly DigestEvent[];
	/** Every `seq` seen in the log, including skipped event types. */
	readonly seqs: ReadonlySet<number>;
	/** Lines that could not be used, with their line number. */
	readonly issues: readonly string[];
}

/** A log or snapshot recorded before the gamemaker rename (2026-10-29) would lose the gamemaker silently. */
export function assertGamemakerNames(text: string, source: string): void {
	if (text.includes('"type":"gamemaster_')) {
		throw new Error(`${source} was recorded before the gamemaker rename; run \`pnpm migrate:gamemaker <its directory>\` first`);
	}
}

/** Parses the text of an `events.jsonl` file. */
export function parseEventLog(text: string): EventLog {
	assertGamemakerNames(text, "events.jsonl");
	const events: DigestEvent[] = [];
	const seqs = new Set<number>();
	const issues: string[] = [];
	text.split(/\r?\n/).forEach((line, index) => {
		if (line.trim().length === 0) return;
		const where = `line ${index + 1}`;
		let value: unknown;
		try {
			value = JSON.parse(line);
		} catch {
			issues.push(`${where}: not valid JSON`);
			return;
		}
		if (!Check(BaseEventSchema, value)) {
			issues.push(`${where}: not an event (needs seq, minute and type)`);
			return;
		}
		seqs.add(value.seq);
		if (!DIGEST_EVENT_TYPES.includes(value.type)) return;
		if (!Check(DigestEventSchema, value)) {
			issues.push(`${where}: event "${value.type}" (seq ${value.seq}) does not match its schema`);
			return;
		}
		events.push(value);
	});
	events.sort((a, b) => a.seq - b.seq);
	return { events, seqs, issues };
}

export function eventsOfType<T extends DigestEventType>(events: readonly DigestEvent[], type: T): readonly DigestEventOf<T>[] {
	return events.filter((event): event is DigestEventOf<T> => event.type === type);
}

const ActSchema = Type.Object({ title: Type.String(), fromLevel: Type.Integer() });
const RunMetadataSchema = Type.Object({
	run: Type.Optional(Type.String()),
	story: Type.Optional(
		Type.Object({
			id: Type.Optional(Type.String()),
			title: Type.Optional(Type.String()),
			acts: Type.Optional(Type.Array(ActSchema)),
			model: Type.Optional(Type.Object({ provider: Type.String(), id: Type.Optional(Type.String()) })),
		}),
	),
});

export interface ActInfo {
	readonly title: string;
	readonly fromLevel: number;
}

/** The parts of `000-run.json` the digest uses. */
export interface RunInfo {
	readonly run?: string;
	readonly storyTitle?: string;
	readonly acts: readonly ActInfo[];
	readonly model?: { readonly provider: string; readonly id?: string };
}

/** Parses the text of `000-run.json`; unusable metadata yields an empty description. */
export function parseRunMetadata(text: string): RunInfo {
	let value: unknown;
	try {
		value = JSON.parse(text);
	} catch {
		return { acts: [] };
	}
	if (!Check(RunMetadataSchema, value)) return { acts: [] };
	const story = value.story;
	const model = story?.model;
	return {
		...(value.run === undefined ? {} : { run: value.run }),
		...(story?.title === undefined ? {} : { storyTitle: story.title }),
		acts: story?.acts ?? [],
		...(model === undefined ? {} : { model: model.id === undefined ? { provider: model.provider } : { provider: model.provider, id: model.id } }),
	};
}
