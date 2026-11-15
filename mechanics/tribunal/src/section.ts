// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The schema of the fact `tribunal.section` (old `SectionFact` of `view.ts`), in the shape the gamemaker's report reads
 * (`TribunalSectionSchema` of `mechanics/city-directors/src/gamemaker/report/tribunal.ts`, A73), copied with its
 * descriptions: the outputs of the old `schedulingWindow`, `cityCall` and the exile's `gates` it held.
 */
import { Type, type Static } from "typebox";

const Int = (description: string) => Type.Integer({ description });
const Id = (description = "A resident id") => Type.String({ description });
const Ids = (description: string) => Type.Array(Id(), { description });

const Window = Type.Union(
	[
		Type.Object({ open: Type.Literal(false, { description: "Closed" }), why: Type.String({ description: "Why it is closed" }) }, { description: "Closed" }),
		Type.Object(
			{
				open: Type.Literal(true, { description: "Open" }),
				earliest: Int("Earliest opening tick"),
				latestFinal: Int("Latest opening of a tribunal that exiles everything still missing"),
				latestWithRoom: Type.Optional(Int("Latest opening that leaves room for one more tribunal after it")),
				missing: Int("Residents still to exile"),
				maxFactions: Int("Factions allowed: 2 up to this; 0 without a draft"),
			},
			{ description: "Open" },
		),
	],
	{ description: "Whether scheduleTribunal is open now, and its bounds" },
);

const Gate = Type.Object(
	{
		agent: Id(),
		since: Int("The tick the gate opened"),
		until: Int("The tick it closes"),
		ransomable: Type.Boolean({ description: "May still be bought back" }),
		price: Type.Number({ description: "The ransom from others" }),
		selfPrice: Type.Number({ description: "The ransom from itself" }),
		paid: Type.Number({ description: "Paid so far" }),
		covered: Int("The percentage covered"),
		willDone: Type.Boolean({ description: "Its last will is written" }),
	},
	{ description: "One gate" },
);

const Ransom = Type.Object({ share: Type.Number({ description: "Share of the median" }), selfShare: Type.Number({ description: "Share when paid by the exiled" }), minimum: Type.Number({ description: "The least" }) }, { description: "The ransom" });

const Rules = Type.Object(
	{
		voteMinutes: Int("Ticks of a vote"),
		gateMinutes: Int("Ticks at the gate"),
		ransom: Ransom,
		bequestPerHeir: Type.Number({ description: "The most an heir gets, as a share" }),
		blocBonus: Type.Union([Int("Points per voter of a faction that holds"), Type.Null({ description: "No factions" })], { description: "The bloc bonus" }),
		fallbackGap: Int("Ticks after a result before the city calls one itself"),
	},
	{ description: "The tribunal's rules" },
);

const Plan = Type.Object({ tribunal: Int("Its number"), called: Type.Boolean({ description: "Called already" }), by: Type.String({ description: "Who planned it" }), calledAt: Int("Called at"), opens: Int("Opens at"), count: Int("Exiles"), factions: Int("Factions") }, { description: "The next tribunal" });

/**
 * The value of the fact `tribunal.draft` and the section's draft: its group and its leaders, or null without one.
 *
 * @public
 */
export const DraftFact = Type.Union([Type.Null({ description: "None" }), Type.Object({ group: Type.String({ description: "The group" }), leaders: Ids("Its leaders") }, { description: "The faction draft" })], { description: "The faction draft" });

/**
 * The value of the fact `tribunal.section`: null while the tribunal's act has not begun or without one.
 *
 * @public
 */
export const SectionFact = Type.Union(
	[
		Type.Null({ description: "No tribunal now" }),
		Type.Object(
			{
				residents: Int("Residents of the act"),
				target: Int("Residents to exile"),
				exiled: Ids("Who left, in order"),
				missing: Int("Still to exile"),
				actEnd: Int("The latest end of the act"),
				rules: Rules,
				plan: Type.Union([Type.Null({ description: "None" }), Plan], { description: "The next tribunal" }),
				window: Window,
				cityCall: Type.Union([Type.Object({ calledAt: Int("Called at"), opens: Int("Opens at") }, { description: "The city's own call" }), Type.Null({ description: "None" })], { description: "When the city calls one itself" }),
				session: Type.Union([Type.Null({ description: "None" }), Type.Object({ tribunal: Int("Its number"), accused: Ids("The accused"), count: Int("Exiles"), until: Int("The vote closes") }, { description: "The open tribunal" })], { description: "The open tribunal" }),
				draft: DraftFact,
				gates: Type.Array(Gate, { description: "Every gate in the order it opened" }),
			},
			{ description: "The tribunal" },
		),
	],
	{ description: "The tribunal's part of the gamemaker's report" },
);

/**
 * The value of the fact `tribunal.section`.
 *
 * @public
 */
export type TribunalSection = Static<typeof SectionFact>;

