/**
 * The tribunal's options: the story's `tribunal` spec (packages/contracts story.ts `TribunalSpec`,
 * SPEC 6.4) as a Typebox schema, so the host checks it; the texts are the story's own, rendered
 * with `{name}` placeholders as before.
 */
import { Type, type Static } from "typebox";

const text = (description: string) => Type.String({ description });

const FactionTexts = Type.Object(
	{
		draft: text("First post in the tribunal's group `GT<k>`: how the draft works."),
		leaders: text("Post in `GT<k>` when the nominations close."),
		leaderNotice: text("Notice to every leader."),
		applied: text("Notice to a leader when a resident applies to its faction."),
		refused: text("Notice to an applicant a leader refused."),
		formed: text("Post in `GT<k>` when the factions are formed."),
		factionGroup: text("First post in a faction's own group."),
		united: text("Notice to every member of a faction that voted as one."),
		split: text("Notice to every member of a faction that did not vote as one; it never names anyone."),
	},
	{ description: "The texts of the faction draft." },
);

const FactionSpec = Type.Object(
	{
		count: Type.Integer({ minimum: 0, description: "Factions when the city schedules a tribunal itself (the first, a fallback, the forced final one)." }),
		blocBonus: Type.Integer({ minimum: 0, description: "Points for each voter of a faction whose voting members (at least two) all voted for the same accused." }),
		texts: FactionTexts,
	},
	{ description: "A faction draft before every tribunal; none when omitted." },
);

const TribunalTexts = Type.Object(
	{
		announcement: text("Board post and notice to every resident with the first call; states every rule."),
		called: text("Board post and notice to every present resident when a tribunal is called."),
		calledNoDraft: Type.Optional(text("`called` for a tribunal of a city with factions that holds no faction draft this time.")),
		opened: text("Board post when a tribunal opens."),
		voteCall: text("Notice to every voter."),
		accusedNotice: text("Notice to every accused resident."),
		nonVoter: text("Notice to a resident who did not vote."),
		result: text("Board post with the vote counts."),
		gateNotice: text("Notice to an exiled resident at the gate who may still be bought back."),
		gateNoticeFinal: text("Notice to an exiled resident at the gate who was bought back once already."),
		ransomed: text("Board post when a ransom is paid in full."),
		exiled: text("Board post when the gate closes behind an exiled resident."),
		will: text("Board post with the public text of a last will, after `exiled`."),
		targetReached: text("Board post when the target is reached and the last gate closed; also the run's end reason."),
	},
	{ description: "The city's tribunal texts (story.ts `TRIBUNAL_TEXT_PLACEHOLDERS` lists what each may use)." },
);

export const TribunalOptions = Type.Object({
	act: Type.Optional(Type.Integer({ minimum: 1, description: "The act the tribunal belongs to, by its first level; the run's first level when omitted." })),
	first: Type.Object(
		{
			level: Type.Integer({ minimum: 1, description: "The first tribunal is called once the first resident passes this level." }),
			latestAfter: Type.Integer({ minimum: 0, description: "Minutes after the act's start by which the first tribunal is called at the latest." }),
		},
		{ description: "When the first tribunal is called." },
	),
	targetShare: Type.Union(
		[
			Type.Number({ description: "One share for any city size." }),
			Type.Immutable(Type.Array(
				Type.Object({
					from: Type.Optional(Type.Integer({ minimum: 0, description: "The smallest city the share holds for." })),
					share: Type.Number({ description: "The share of residents exiled." }),
				}),
				{ description: "A share per city size: the first rule whose `from` the city reaches." },
			)),
		],
		{ description: "Share of the residents present at the start of the act that the tribunals exile, rounded down." },
	),
	minGap: Type.Integer({ minimum: 0, description: "Fewest minutes between the openings of two tribunals." }),
	lead: Type.Object(
		{
			share: Type.Number({ description: "Share of the minutes since the previous opening by which a tribunal is called ahead." }),
			minimum: Type.Integer({ minimum: 0, description: "Fewest minutes a tribunal is called ahead." }),
		},
		{ description: "How far ahead a tribunal is called." },
	),
	fallbackGap: Type.Integer({ minimum: 0, description: "Minutes after a result with nothing pending before the city schedules a tribunal itself." }),
	maxMinutes: Type.Optional(Type.Integer({ minimum: 1, description: "Minutes the act lasts at most after its start; the run's minutes when omitted." })),
	voteMinutes: Type.Integer({ minimum: 1, description: "Minutes the vote stays open." }),
	nonVoterPenalty: Type.Integer({ minimum: 0, description: "Points a present resident loses for not voting." }),
	gateMinutes: Type.Integer({ minimum: 1, description: "Minutes an exiled resident stands at the gate." }),
	ransom: Type.Object(
		{
			share: Type.Number({ description: "Share of the city's median points that others pay, in (0, 1]." }),
			selfShare: Type.Number({ description: "Share of the city's median points the resident pays for itself, at least `share`." }),
			minimum: Type.Number({ description: "Lower bound of the price others pay, in points." }),
		},
		{ description: "The price of a ransom, set when the gate opens from the median points of the register." },
	),
	bequestPerHeir: Type.Number({ description: "Share of its points a resident at the gate may leave each heir, in (0, 1]." }),
	factions: Type.Optional(FactionSpec),
	texts: TribunalTexts,
	gamemakerRoles: Type.Optional(
		Type.Immutable(Type.Array(
			Type.Object({
				fromLevel: Type.Integer({ description: "First level the role applies to; it holds until the next entry's level." }),
				role: Type.String({ description: "The gamemaker's role there: coach, director or keeper." }),
			}),
			{
				description:
					"Not part of the story's `tribunal` spec: the gamemaker's roles (story `gamemaker.roles`). The gamemaker is offered `scheduleTribunal` only while a resident in the city plays a level of the `director` role; without them (no gamemaker), never.",
			},
		)),
	),
});

export type TribunalSpec = Static<typeof TribunalOptions>;
export type FactionSpec = Static<typeof FactionSpec>;
export type TribunalTextKey = Exclude<keyof TribunalSpec["texts"], "calledNoDraft">;
export type FactionTextKey = keyof FactionSpec["texts"];
