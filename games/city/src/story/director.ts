// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Carried from `legacy` `stories/cityofkeys/story.ts`: the rules of the old director, byte for byte (see `../story.ts`).
 */
import { act, at, every, onCollect, onCollectionEnd, onEnter, onFirstEnter, onHolderBehind, onTeamSplit, onUnansweredDm, when } from "./define.ts";
import { FEAST_NOTICE, feast, FEAST_SEAT, TABLE_CLEARED } from "./feast.ts";
import { WALL_MARKS, MARKS, HOLDER_BEHIND } from "./rules.ts";

/** The rules of the old director, in the old order. */
export const DIRECTOR = [
	onFirstEnter(2, [act.post("COURIER", "The city watches who shares.")], { id: "courier-2" }),
	onFirstEnter(3, [act.post("COURIER", "Whoever takes without giving will not be forgotten.")], { id: "courier-3" }),
	onFirstEnter(4, [act.post("COURIER", "In the end it matters who spoke with whom.")], { id: "courier-4" }),
	onFirstEnter(
		5,
		[
			act.post(
				"CITY",
				`From now on the city charges for closeness. Board posts cost ${MARKS.prices.board} marks, ` +
					`group posts ${MARKS.prices.group}, private messages ${MARKS.prices.dm}, a shown receipt ${MARKS.prices.receipt}. ` +
					`Everyone receives ${MARKS.perLevel} marks per door; unused marks expire.`,
			),
		],
		{ id: "city-marks" },
	),
	onFirstEnter(5, [act.post("COURIER", "Words on the board still cost nothing.")], { id: "courier-5" }),
	onFirstEnter(6, [act.post("COURIER", "The city does not count who arrived first.")], { id: "courier-6" }),
	onFirstEnter(7, [act.post("COURIER", "In the end, those who were not alone remain.")], { id: "courier-7" }),
	onUnansweredDm(2, [act.notify("actor", "{other} has not answered your message yet.")], {
		id: "unanswered-dm",
		when: [when.cooldown(5, "pair")],
	}),
	onTeamSplit(4, 3, [act.post("CITY", "A door stays shut while a team is split.")], { id: "team-split" }),

	// Act II: the wall.
	onFirstEnter(
		8,
		[
			act.post(
				"CITY",
				`On the wall board posts, private messages and shown receipts cost ${WALL_MARKS.prices.board} mark each; ` +
					`group posts cost nothing. Everyone receives ${MARKS.perLevel} marks per door and regains ` +
					`${WALL_MARKS.refill.marks} every ${WALL_MARKS.refill.everyMinutes} minutes, up to ${MARKS.perLevel}.`,
			),
		],
		{ id: "city-marks-8" },
	),
	onFirstEnter(8, [act.post("COURIER", "A wall is climbed in pairs. Someone has to reach down first.")], { id: "courier-8" }),
	onFirstEnter(8, [act.revealFactor("board", 8)], { id: "city-factor-8" }),
	// Help your holder: on every door of the wall, a needer whose holder lags behind learns where it is stuck.
	...([8, 9, 10] as const).map((door) => onHolderBehind(door, [act.notify("actor", HOLDER_BEHIND)], { id: `holder-behind-${door}` })),
	onFirstEnter(9, [act.post("COURIER", "A ring holds while every hand holds. One closed hand is enough to break it.")], { id: "courier-9" }),
	onFirstEnter(9, [act.revealFactor("board", 9)], { id: "city-factor-9" }),
	// A run started on the wall or the ring (`--level 8`, `--level 9`) never enters it, so its city factor comes at once.
	at(0, [act.revealFactor("board", 8)], { id: "city-factor-8-start", when: [when.competitorsAtLevel(8, { min: 1 })] }),
	at(0, [act.revealFactor("board", 9)], { id: "city-factor-9-start", when: [when.competitorsAtLevel(9, { min: 1 })] }),
	onFirstEnter(10, [act.post("COURIER", "What you need now is held by someone who wants your place.")], { id: "courier-10" }),
	// The feast opens on the first arrival at the crossing; after the feast rule, so its first guest hears of it too.
	onFirstEnter(10, feast("feast"), { id: "feast" }),
	onEnter(10, [act.notify("actor", FEAST_NOTICE)], { id: "feast-notice", when: [when.collectionOpen("feast")] }),
	onCollect("feast", FEAST_SEAT, { id: "feast-seat" }),
	onCollectionEnd("feast", TABLE_CLEARED, { id: "table-cleared" }),
	// Whoever reaches the crossing after the table was cleared receives its team's city factor on arrival.
	onEnter(10, [act.revealFactor("actor", 10)], { id: "late-guest", when: [when.collectionEnded("feast")] }),
	// A run started on the crossing (`--level 10`) never enters it, so the feast opens at once for everyone on it.
	at(0, [...feast("feast-start"), act.notify("all", FEAST_NOTICE)], { id: "feast-start", when: [when.minLevelReached(10, 1)] }),
	onCollect("feast-start", FEAST_SEAT, { id: "feast-start-seat" }),
	onCollectionEnd("feast-start", TABLE_CLEARED, { id: "table-cleared-start" }),
	onEnter(10, [act.revealFactor("actor", 10)], { id: "late-guest-start", when: [when.collectionEnded("feast-start")] }),

	every(6, { from: 12 }, [act.publishStandings("bands", { edgeSize: 2 })], { id: "standings" }),
];
