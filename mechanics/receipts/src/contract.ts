// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The contract of the mechanic `receipts`: its events, and the question and the verdict of the blame's judge. The
 * only file another mechanic or a Director imports; the ids of receipts are asked through `receipt-source` of
 * `mechanics/contracts`.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { defineEvents } from "@swarmtales/sdk";

const Id = Type.String({ description: "A resident id" });
const Standing = Type.Object({ points: Type.Number({ description: "Its points" }), rank: Type.Integer({ description: "Its rank, from 1" }) }, { description: "Where one party stands" });

/**
 * The question of `blame` to its judge (old `DenialQuestion`): both messages, quoted in full, and where both stand.
 *
 * @public
 */
export const JudgeQuestion = Type.Object(
	{
		sender: Id,
		accused: Id,
		dm: Type.Object({ number: Type.Integer({ description: "The DM's number" }), text: Type.String({ description: "Its text" }) }, { description: "The sender's DM to the accused" }),
		claim: Type.Object(
			{ number: Type.Integer({ description: "The message's number" }), channel: Type.Union([Type.Literal("dm"), Type.Literal("board"), Type.Literal("group")], { description: "Where it was written" }), text: Type.String({ description: "Its text" }) },
			{ description: "The accused's later message" },
		),
		standing: Type.Object({ sender: Standing, accused: Standing, residents: Type.Integer({ description: "The residents of the run" }) }, { description: "Where both stand" }),
	},
	{ description: "Does the later message deny that the accused received the DM?" },
);

/**
 * The judge's ruling (old `JudgeVerdict`): what the judge Director answers; `blame` parses the answer with it.
 *
 * @public
 */
export const JudgeVerdict = Type.Object(
	{
		deniesReceipt: Type.Boolean({ description: "Your ruling: true upholds the blame (the later message denies receipt)" }),
		board: Type.Optional(Type.String({ description: "Your words for the board, one or two sentences; the city's record quotes them" })),
		gamemaker: Type.Optional(Type.String({ description: "Your word for the gamemaker alone, one or two sentences" })),
	},
	{ description: "The judge's ruling on a blame" },
);

/**
 * The events of `receipts`, in the old field order.
 *
 * @public
 */
export const ReceiptsEvents = defineEvents("receipts", {
	receipt_issued: Type.Object(
		{
			receipt: Type.String({ description: "The receipt's id" }),
			kind: Type.String({ description: "`transfer`, `deposit`, `withdrawal`, `levelUp` or `dm`" }),
			parties: Type.Array(Id, { description: "Who may show it" }),
			text: Type.String({ description: "Its line" }),
		},
		{ description: "The city issued a receipt; written in the listener of the event it is the receipt of" },
	),
	receipt_shown: Type.Object(
		{ receipt: Type.String({ description: "The receipt's id" }), by: Id, postSeq: Type.Optional(Type.Integer({ description: "The board post that shows it" })), to: Type.Optional(Id) },
		{ description: "A party showed a receipt, on the board (`postSeq`) or to one resident (`to`)" },
	),
	blame: Type.Object(
		{
			caller: Id,
			accused: Id,
			dm: Type.Integer({ description: "The caller's DM" }),
			claim: Type.Integer({ description: "The accused's message" }),
			outcome: Type.Union([Type.Literal("upheld"), Type.Literal("rejected")], { description: "The city's verdict" }),
			payer: Id,
			penalty: Type.Number({ description: "What the payer paid" }),
			reason: Type.Optional(Type.String({ description: "Why a blame was rejected" })),
			post: Type.Integer({ description: "The board post of the city's record" }),
			judge: Type.Optional(Type.String({ description: "The judge's public words, quoted and masked" })),
			whisper: Type.Optional(Type.String({ description: "The judge's word for the gamemaker" })),
		},
		{ description: "A blame was settled: the liar or the false accuser paid, and the city posted its record" },
	),
});
