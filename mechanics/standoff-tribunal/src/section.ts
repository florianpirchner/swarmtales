// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The facts of the holdout tribunal, carried from the old `section.ts`: the blockers the city finds, the running
 * tribunal and the outcome to announce. Facts only, never a ballot. The facts `blockers`, `session`, `pending`,
 * `cooldownUntil` and `struck` and the combined `section` share the computations here. The gamemaker writes its
 * report lines from `section` (`HoldoutSectionSchema` of `mechanics/city-directors`, M5-34, decision A73), which
 * reads this shape field for field.
 */
import { Type, type Static } from "typebox";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { HoldoutPiecesService } from "./contract.ts";
import type { View } from "./head.ts";

const Id = Type.String({ description: "A resident id" });
const Ids = (description: string) => Type.Array(Id, { description });
const Int = (description: string) => Type.Integer({ description });

/**
 * The blockers the city reports, by door and holder.
 *
 * @public
 */
export const BlockersFact = Type.Array(
	Type.Object({ door: Int("The door"), blocker: Id, lacking: Ids("Who lacks its fragment"), passed: Type.Boolean({ description: "Whether it passed the door" }), since: Int("The tick the city found it") }, { description: "One blocker" }),
	{ description: "The blockers" },
);

/**
 * The running tribunal, or null.
 *
 * @public
 */
export const SessionFact = Type.Union(
	[
		Type.Object(
			{
				number: Int("The tribunal"),
				accused: Id,
				door: Int("The door"),
				stage: Type.String({ description: "grace, vote, banish or lot" }),
				until: Int("The tick the stage ends"),
				vote: Int("The open or last vote"),
				maxVotes: Int("Votes in all"),
				/** Who still lacks the accused's fragment of its door (old `lackingNow`), read when the fact is. */
				lacking: Ids("Who still lacks the accused's fragment"),
				lastResult: Type.Optional(Type.Object({ vote: Int("The vote"), yes: Int("Yes ballots"), no: Int("The other voters") }, { description: "The last count" })),
				drawn: Type.Optional(Id),
			},
			{ description: "The running tribunal" },
		),
		Type.Null({ description: "None runs" }),
	],
	{ description: "The running tribunal, or null" },
);

/**
 * The outcome that waits to be announced, or null.
 *
 * @public
 */
export const PendingFact = Type.Union(
	[
		Type.Object(
			{ tribunal: Int("The tribunal"), kind: Type.String({ description: "The outcome" }), facts: Type.String({ description: "The facts" }), text: Type.String({ description: "The city's line" }), due: Int("The tick the city posts it") },
			{ description: "To announce" },
		),
		Type.Null({ description: "Nothing to announce" }),
	],
	{ description: "The outcome to announce, or null" },
);

/**
 * The tribunal's part of the gamemaker's report.
 *
 * @public
 */
export const HoldoutSectionFact = Type.Object(
	{
		minute: Int("The tick"),
		stallMinutes: Int("The stall"),
		/** The residents in the city, in the run's order (old `world.alive`), for the lot. */
		alive: Ids("The residents in the city"),
		blockers: BlockersFact,
		session: SessionFact,
		pending: PendingFact,
		cooldownUntil: Int("No tribunal before this tick"),
		struck: Ids("The struck"),
	},
	{ description: "The holdout tribunal for the gamemaker's report" },
);

/**
 * The section's data.
 *
 * @public
 */
export type HoldoutSection = Static<typeof HoldoutSectionFact>;

/**
 * The blockers.
 *
 * @param view - The view.
 * @returns The fact.
 */
export function blockersOf(view: View): Static<typeof BlockersFact> {
	return [...view.state.data.blockers.values()]
		.sort((a, b) => a.door - b.door || a.blocker.localeCompare(b.blocker))
		.map((blocker) => ({ door: blocker.door, blocker: blocker.blocker, lacking: [...blocker.lacking], passed: blocker.passed, since: blocker.since }));
}

/**
 * The running tribunal.
 *
 * @param view - The view.
 * @returns The fact.
 */
export function sessionOf(view: View): Static<typeof SessionFact> {
	const session = view.state.data.session;
	if (session === undefined) return null;
	return {
		number: session.number,
		accused: session.accused,
		door: session.door,
		stage: session.stage,
		until: session.until,
		vote: session.vote,
		maxVotes: view.options.maxVotes,
		lacking: [...view.call(HoldoutPiecesService, "lacking", { level: session.door, holder: session.accused })],
		...(session.lastResult === undefined ? {} : { lastResult: { ...session.lastResult } }),
		...(session.drawn === undefined ? {} : { drawn: session.drawn }),
	};
}

/**
 * The outcome to announce.
 *
 * @param view - The view.
 * @returns The fact.
 */
export function pendingOf(view: View): Static<typeof PendingFact> {
	return view.state.data.pending === undefined ? null : { ...view.state.data.pending };
}

/**
 * The whole section.
 *
 * @param view - The view.
 * @returns The fact.
 */
export function computeHoldoutSection(view: View): HoldoutSection {
	return {
		minute: view.tick,
		stallMinutes: view.options.stallMinutes,
		alive: [...view.call(ExileService, "alive", {})],
		blockers: blockersOf(view),
		session: sessionOf(view),
		pending: pendingOf(view),
		cooldownUntil: view.state.data.cooldownUntil,
		struck: [...view.state.data.struck],
	};
}
