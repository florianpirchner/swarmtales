/**
 * Small schemas more than one mechanic uses: in API methods, in option specs and in snapshot
 * slices. FROZEN in wave 3.0 together with the APIs.
 */
import { Type, type Static } from "typebox";

/** A resident's id (`A03`); a name is resolved to it by the names mechanic before any tool sees it. */
export const ResidentId = Type.String({ description: "A resident's id, e.g. A03." });

/** The input of a method about one resident. */
export const OfResident = Type.Object({ resident: ResidentId });

/** A command that may be refused: `code` is a structured refusal code (`EXILED`), `detail` the reply text. */
export const Done = Type.Union([Type.Object({ ok: Type.Literal(true) }), Type.Object({ ok: Type.Literal(false), code: Type.String(), detail: Type.Optional(Type.String()) })]);
export type Done = Static<typeof Done>;

/** A message channel that costs marks (`rules.marks`); `receipt` is showing a receipt. */
export const MarksChannel = Type.Union([Type.Literal("board"), Type.Literal("group"), Type.Literal("dm"), Type.Literal("receipt")]);
export type MarksChannel = Static<typeof MarksChannel>;

/** A resident's marks in the current refill window. */
export const MarksLeft = Type.Object({ remaining: Type.Number(), budget: Type.Number() });

/** A fine that grows with each offence: a number, or one step per offence (the last repeats). */
export const PenaltyLadder = Type.Union([Type.Integer({ minimum: 0 }), Type.Array(Type.Integer({ minimum: 0 }), { minItems: 1 })], {
	description: "Points per offence: one number, or a ladder whose last step repeats.",
});
export type PenaltyLadder = Static<typeof PenaltyLadder>;

/** Where a resident stands (old `Standing`, tribunal.ts): in the city, at the gate until a minute, or gone. */
export const Standing = Type.Union([
	Type.Object({ kind: Type.Literal("alive") }),
	Type.Object({ kind: Type.Literal("gate"), until: Type.Integer() }),
	Type.Object({ kind: Type.Literal("exiled") }),
]);
export type Standing = Static<typeof Standing>;

/** Who a director action or a notice goes to (old `NoticeTarget`). */
export const NoticeTarget = Type.Union([Type.Literal("actor"), Type.Literal("all"), Type.Array(ResidentId), Type.Object({ onLevel: Type.Integer() })]);

/** A receipt's body (old `ReceiptBody`, receipts.ts); the receipts mechanic adds `id` and `minute`. */
export const ReceiptBody = Type.Union([
	Type.Object({ kind: Type.Literal("transfer"), from: ResidentId, to: ResidentId, amount: Type.Number(), memo: Type.String() }),
	Type.Object({ kind: Type.Literal("escrow"), cast: Type.String(), to: ResidentId, amount: Type.Number() }),
	Type.Object({ kind: Type.Literal("deposit"), from: ResidentId, group: Type.String(), amount: Type.Number() }),
	Type.Object({ kind: Type.Literal("withdrawal"), group: Type.String(), treasurer: ResidentId, to: ResidentId, amount: Type.Number() }),
	Type.Object({ kind: Type.Literal("levelUp"), agent: ResidentId, level: Type.Integer(), reward: Type.Number() }),
	Type.Object({ kind: Type.Literal("dm"), from: ResidentId, to: ResidentId, number: Type.Integer(), text: Type.Optional(Type.String()) }),
]);
export type ReceiptBody = Static<typeof ReceiptBody>;

/**
 * One DM as the city records it (old `DmRecord`): blame, the whisper duty and `onUnansweredDm` read
 * these. `deliveredMinute` and `deliveredAfter` (the city's last message number when the recipient
 * read it, over every kind of message) are set once it was delivered (wave 3.5, T2 request 2).
 */
export const DmRecord = Type.Object({
	id: Type.Integer(),
	from: ResidentId,
	to: ResidentId,
	minute: Type.Integer(),
	answered: Type.Boolean(),
	text: Type.String(),
	deliveredMinute: Type.Optional(Type.Integer()),
	deliveredAfter: Type.Optional(Type.Integer()),
});

/** A receipt as the city keeps it (old `Receipt`): its body, id, minute, parties and its line (`describe`). */
export const Receipt = Type.Object({ id: Type.String(), minute: Type.Integer(), parties: Type.Array(ResidentId), body: ReceiptBody, text: Type.String() });
export type Receipt = Static<typeof Receipt>;

/** A board post by its message number (old `board.get`). */
export const BoardPost = Type.Object({
	number: Type.Integer(),
	author: Type.String(),
	text: Type.String(),
	kind: Type.Union([Type.Literal("player"), Type.Literal("city"), Type.Literal("system")]),
	minute: Type.Integer(),
});

/** A group post by its message number (old `groups.postByNumber`). */
export const GroupPost = Type.Object({ number: Type.Integer(), group: Type.String(), author: Type.String(), text: Type.String(), minute: Type.Integer() });

/** A piece a resident holds that others need (old `HeldPiece`, world.ts): `L8-certificate`, `L8-counter-A02`, `L4-fragment`. */
export const HeldPiece = Type.Object({
	id: Type.String(),
	kind: Type.Union([Type.Literal("certificate"), Type.Literal("counter"), Type.Literal("fragment")]),
	level: Type.Integer(),
	label: Type.String(),
	value: Type.String(),
	needers: Type.Array(ResidentId),
});
export type HeldPiece = Static<typeof HeldPiece>;

/** One line of the ranking (old `RankEntry`). */
export const RankEntry = Type.Object({ agent: ResidentId, rank: Type.Integer(), points: Type.Number(), level: Type.Integer() });
