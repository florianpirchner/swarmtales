// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The options of `seal` (carried from the old `index.ts` field for field) and its state, which is its snapshot slice:
 * the old `SealSnapshot` (old `slice.ts`), with the bids as a list in the order of each bidder's first bid (the old
 * `Map`) and the tribunal's target, which the seal now learns from `tribunal_announced` (erratum of M5-44).
 */
import { Type, type Static } from "typebox";

const text = (description: string) => Type.String({ description });
const Id = Type.String({ description: "A resident id" });
const Int = (description: string) => Type.Integer({ description });

/**
 * The options of the seal, as the old story's `seal` block.
 *
 * @public
 */
export const SealOptions = Type.Object(
	{
		act: Type.Integer({ minimum: 1, description: "The first level of the act whose seal this is; it begins and ends with that act." }),
		announceAfter: Type.Integer({ minimum: 0, description: "Minutes into the act until the first auction opens." }),
		bidMinutes: Type.Integer({ minimum: 1, description: "How long an auction takes bids, in minutes." }),
		perResidents: Type.Integer({ minimum: 1, description: "One seal per this many residents in the city at the act's start (rounded up, at least one)." }),
		spacing: Type.Integer({ minimum: 0, description: "Minutes between the openings of two auctions of one act." }),
		texts: Type.Object(
			{
				announcement: text("Board post when the bidding opens: the rules ({seal}, {until}, {seals})."),
				won: text("Board post when someone won; it never names the holder ({seal})."),
				winnerNotice: text("Private notice to the winner ({seal}, {bid})."),
				paidNotice: text("Private notice to every other bidder ({seal}, {bid})."),
				noBids: text("Board post when nobody bid ({seal})."),
				used: text("Board post when the seal is broken ({holder}, {target})."),
				expired: text("Private notice to a holder whose seal is gone unused ({seal})."),
			},
			{ description: "The story's texts of the seal (old `SealTexts`)." },
		),
	},
	{ description: "The black seal of one act" },
);

/**
 * The options of the seal.
 *
 * @public
 */
export type SealOptions = Static<typeof SealOptions>;

/**
 * The texts of the seal (old `SealTexts`).
 *
 * @public
 */
export type SealTexts = SealOptions["texts"];

const Stage = Type.Union([Type.Literal("pending"), Type.Literal("open"), Type.Literal("held"), Type.Literal("used"), Type.Literal("gone")], { description: "Where the seal is: to auction, auctioned now, borne, broken, or gone" });

const Entry = Type.Object(
	{
		seal: Int("The seal's number in its act"),
		opens: Int("The tick its auction opens"),
		until: Int("The tick its bidding closes"),
		bids: Type.Array(Type.Object({ agent: Id, points: Int("The standing bid") }, { description: "One bidder's last bid" }), { description: "The standing bids, in the order of each bidder's first bid" }),
		state: Stage,
		holder: Type.Optional(Id),
	},
	{ description: "One seal of the act" },
);

/**
 * The state of the seal and its snapshot slice.
 *
 * @public
 */
export const SealSlice = Type.Object(
	{
		actStart: Type.Union([Int("The tick the act began"), Type.Null({ description: "The act has not begun" })], { description: "The act's start" }),
		target: Type.Union([Int("Residents the tribunals exile in all"), Type.Null({ description: "No tribunal has announced it yet" })], { description: "The tribunal's target" }),
		seals: Type.Array(Entry, { description: "The act's seals" }),
	},
	{ description: "The black seal's state" },
);

/**
 * The state of the seal (old `SealData`).
 *
 * @public
 */
export type SealData = Static<typeof SealSlice>;

/**
 * One seal of the act (old `SealEntry`).
 *
 * @public
 */
export type SealEntry = SealData["seals"][number];

/**
 * Where a seal is (old `SealStage`).
 *
 * @public
 */
export type SealStage = SealEntry["state"];

/**
 * The state before the act begins (old `emptySeal`).
 *
 * @returns The empty state.
 *
 * @public
 */
export function emptySeal(): SealData {
	return { actStart: null, target: null, seals: [] };
}
