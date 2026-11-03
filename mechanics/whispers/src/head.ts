/**
 * The head of the `whispers` mechanic: options, state, events, prompts, the slice and its legacy
 * shape. The state machine of the vote and the whisperer's duty live in index.ts and duty-notice.ts.
 */
import { Type } from "typebox";
import type { ContextOf, ToolContextOf, ViewOf } from "@swarmtales/contracts";
import { defineHead } from "@swarmtales/kernel";
import { ChannelsApi, ExileApi, LedgerApi, MarksApi, NamesApi, PuzzlesApi, ReceiptsApi, WhispersEvents, WhispersApi } from "@swarmtales/mechanic-shared";
import { Direction, WhispererSpec, type Forgery } from "./duty.ts";
import { PopularitySpec, type Phase, type SavedVote } from "./vote.ts";

/** The whisperer's measured orders in the running window (old `WhisperDutyStatus`; the fact `dutyNow`, carve-decisions D-8). */
export const DutyNow = Type.Object({
	agent: Type.String(),
	since: Type.Integer(),
	nextVote: Type.Integer(),
	whispers: Type.Integer(),
	recipients: Type.Array(Type.String()),
	needWhispers: Type.Integer(),
	needRecipients: Type.Integer(),
	met: Type.Boolean(),
	busiest: Type.Optional(Type.Object({ pair: Type.Tuple([Type.String(), Type.String()]), dms: Type.Integer() })),
});
export interface DutyNowValue {
	readonly agent: string;
	readonly since: number;
	readonly nextVote: number;
	readonly whispers: number;
	readonly recipients: readonly string[];
	readonly needWhispers: number;
	readonly needRecipients: number;
	readonly met: boolean;
	readonly busiest?: { readonly pair: [string, string]; readonly dms: number };
}

export interface WhispersState {
	/** The whisperer; null in a control run, undefined before the run starts. */
	whisperer: string | null | undefined;
	forgeries: Forgery[];
	round: number;
	phase: Phase;
	ballots: Map<string, string>;
	/** A vote saved by the old engine, waiting for the first minute of the resumed run to be restored (it needs that minute). */
	pending: SavedVote | undefined;
}

const Ballots = Type.Array(Type.Object({ agent: Type.String(), choice: Type.String() }));
const Phases = Type.Union([Type.Literal("pending"), Type.Literal("open"), Type.Literal("closed")]);
const Saved = Type.Object({ round: Type.Optional(Type.Integer()), state: Phases, ballots: Ballots });

/** The slice (version 1). `fresh`: the whisperer is not known yet (an old snapshot without a whispers slice), pick it when the run resumes. */
export const Slice = Type.Object({
	whisperer: Type.Union([Type.String(), Type.Null()]),
	forgeries: Type.Array(Type.Object({ minute: Type.Integer(), to: Type.Optional(Type.String()) })),
	round: Type.Integer(),
	phase: Phases,
	ballots: Ballots,
	pending: Type.Optional(Saved),
	fresh: Type.Optional(Type.Boolean()),
});

/** The version-0 slice of the old world (`WhispersSnapshot`): the whisperer, the minutes (and victims) of its forgeries, the vote. Absent or null: a run without whispers. */
export const LegacySlice = Type.Object({
	whispers: Type.Optional(
		Type.Union([
			Type.Null(),
			Type.Object({ whisperer: Type.Union([Type.String(), Type.Null()]), forgeries: Type.Array(Type.Integer()), forgedTo: Type.Optional(Type.Array(Type.String())), popularity: Type.Optional(Saved) }),
		]),
	),
});

export const whispersHead = defineHead({
	id: "whispers",
	summary: "The whisperer, forged receipts and the popularity vote.",
	options: Type.Object({
		whisperer: Type.Optional(WhispererSpec),
		popularity: Type.Optional(PopularitySpec),
		control: Type.Boolean({ default: false, description: "A control run: the story's whisperer does not play." }),
		direction: Type.Optional(Direction),
	}),
	state: (): WhispersState => ({ whisperer: undefined, forgeries: [], round: 0, phase: "pending", ballots: new Map<string, string>(), pending: undefined }),
	events: {
		...WhispersEvents.events,
		whisper_duty: Type.Object({
			agent: Type.String(),
			since: Type.Integer(),
			dms: Type.Integer(),
			forgeries: Type.Integer(),
			whispers: Type.Optional(Type.Integer()),
			recipients: Type.Optional(Type.Array(Type.String())),
			met: Type.Optional(Type.Boolean()),
			target: Type.Optional(Type.String()),
		}),
		popularity_opened: Type.Object({ round: Type.Integer(), until: Type.Integer(), points: Type.Integer() }),
		popularity_ballot: Type.Object({ round: Type.Integer(), agent: Type.String(), choice: Type.String() }),
		popularity_result: Type.Object({
			round: Type.Integer(),
			counts: Type.Array(Type.Object({ agent: Type.String(), votes: Type.Integer() })),
			winners: Type.Array(Type.String()),
			points: Type.Integer(),
			voters: Type.Array(Type.String()),
		}),
		receipt_forged: Type.Object({ receipt: Type.String(), by: Type.String(), to: Type.String(), from: Type.String(), number: Type.Integer(), text: Type.String(), forged: Type.String() }),
	},
	prompts: {
		"tools/forgeReceipt": [],
		"tools/nameFavourite": [],
		"replies/receipt-shown-private": ["to", "receipt"],
		"replies/ballot-favourite": ["choice", "until"],
		"replies/locked": [],
		"replies/marks-left": ["remaining", "budget"],
		"competitor/status/popularity-nobody": [],
		"competitor/status/popularity-named": ["ballot"],
		"competitor/status/popularity-vote": ["label", "countsAt", "ballot"],
		"notices/receipt-forged": ["by", "line"],
		"records/receipt-forged-line": ["id", "number", "from", "to", "minute", "quoted"],
		"duty/forgeable-line": ["id", "number", "from", "minute"],
		"duty/forgeable-none-yet": [],
		"duty/forgeable-none": [],
		"duty/whispers-one": [],
		"duty/whispers-many": ["count"],
		"duty/residents-one": [],
		"duty/residents-many": ["count"],
	},
	requires: [ReceiptsApi, ChannelsApi, LedgerApi, MarksApi],
	provides: [WhispersApi],
	uses: [ExileApi, NamesApi, PuzzlesApi],
});

export type Ctx = ContextOf<typeof whispersHead>;
/** What a fact may read: the state, the options, the minute and the queries of the APIs. */
export type View = ViewOf<typeof whispersHead>;
export type ToolCtx = ToolContextOf<typeof whispersHead>;
