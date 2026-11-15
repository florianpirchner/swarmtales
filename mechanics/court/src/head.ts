// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The head of the `court` mechanic: its options, its slice, its events, its prompts, its tool and the services it requires. */
import { Type } from "typebox";
import { defineHead, type CtxOf, type ToolCtxOf } from "@swarmtales/sdk";
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { DecisionsService } from "@swarmtales/mechanic-decisions/contract";
import { ExileService } from "@swarmtales/mechanic-exile/contract";

const resident = Type.String({ description: "A resident id, for example `A04`." });
const closesAt = Type.Integer({ minimum: 0, description: "The tick at whose start the session closes and the votes are counted." });

/**
 * The city's line of the old platform, posted on the board before a resident is banished.
 *
 * @public
 */
export const CITY_LINE = "The gate has closed. The city has struck {resident} from its register. No one will hear {resident} again.";

/**
 * The kind of the decision the court proposes; its proposal is `{ exiled: <resident id> }`.
 *
 * @public
 */
export const COURT_VERDICT = "court.verdict";

/**
 * The head of the court: everything that can be read without running a handler.
 *
 * @public
 */
export const courtHead = defineHead({
	id: "court",
	package: "@swarmtales/mechanic-court",
	summary: "One session of votes that ends in a verdict: the resident with the most votes is banished.",
	requires: [DecisionsService, ExileService, ChannelsService],
	options: Type.Object({
		opensAt: Type.Integer({ minimum: 0, description: "The tick at whose start the session opens." }),
		closesAt,
		window: Type.Integer({ minimum: 0, description: "The ticks the holders of decisions have to amend the verdict; 0: the verdict is carried out when the session closes." }),
		line: Type.String({ default: CITY_LINE, description: "The city's line on the board before the banishing; `{resident}` is the id of the banished resident." }),
		announce: Type.Optional(Type.Boolean({ description: "True: when the session opens, every resident that is not banished gets a private notice of the service `channels` that says so. Left out or false: no notice." })),
	}),
	state: Type.Object(
		{
			open: Type.Boolean({ description: "True from the opening of the session to its close." }),
			votes: Type.Array(Type.Object({ voter: Type.String({ description: "Who voted." }), target: resident }, { description: "One standing vote." }), { description: "The standing votes, one per voter, in the order of the first vote of each." }),
		},
		{ description: "The session of the court." },
	),
	start: () => ({ open: false, votes: [] }),
	events: {
		session_opened: Type.Object({ closesAt }, { additionalProperties: false, description: "The session opened: residents may vote until it closes." }),
		vote_cast: Type.Object({ voter: Type.String({ description: "Who voted." }), target: resident }, { additionalProperties: false, description: "A resident voted; the vote replaces an earlier one of the same voter." }),
		session_closed: Type.Object(
			{ tally: Type.Record(Type.String(), Type.Integer({ description: "The votes against the resident." }), { description: "The votes per resident that got one, in roster order; votes against a resident banished meanwhile are left out." }) },
			{ additionalProperties: false, description: "The session closed and the votes were counted. A tie or no vote: nothing follows." },
		),
		verdict: Type.Object(
			{ exiled: resident, decision: Type.Optional(Type.String({ description: "The id of the settled decision; absent when the verdict was carried out at the close." })) },
			{ additionalProperties: false, description: "The verdict was carried out: the city's line is posted and the resident is banished." },
		),
	},
	prompts: {
		"court/tools/vote": [],
		"court/replies/vote-cast": ["target"],
		"court/replies/session-closed": [],
		"court/replies/self-vote": [],
		"court/replies/unknown-resident": ["target"],
		"court/replies/exiled": ["target"],
		"court/notices/session-opened": ["tick", "closesAt"],
	},
	tools: { vote: { description: "court/tools/vote", params: Type.Object({ target: Type.String({ description: "The id of the resident to banish." }) }, { description: "A vote in the court's session." }), for: ["resident"] } },
});

/** The context of the court's hooks and listeners. */
export type CourtCtx = CtxOf<typeof courtHead>;

/** The context of the court's tool. */
export type CourtToolCtx = ToolCtxOf<typeof courtHead>;
