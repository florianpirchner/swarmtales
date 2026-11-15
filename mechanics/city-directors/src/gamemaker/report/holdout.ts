// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The holdout tribunal's part of the gamemaker's report, carried from old `mechanics/standoff-tribunal/src/section.ts`
 * (word for word as the old `holdoutLines`): the blockers the city finds, the running tribunal and the gamemaker's
 * move, written from the fact `standoff-tribunal.section`. Facts only, never a ballot.
 */
import { Type, type Static } from "typebox";
import { Id, Ids, Int } from "./schema.ts";

const Blocker = Type.Object({ door: Int("The door"), blocker: Id("The blocker"), lacking: Ids("Who lacks its fragment"), passed: Type.Boolean({ description: "It passed the door" }), since: Int("A blocker since") }, { description: "One blocker" });

const Session = Type.Object(
	{
		number: Int("Its number"),
		accused: Id("The accused"),
		door: Int("The door"),
		stage: Type.String({ description: "grace, vote, banish or lot" }),
		until: Int("The stage ends"),
		vote: Int("The vote's number"),
		maxVotes: Int("Votes before the lot"),
		lacking: Ids("Who still lacks the accused's fragment"),
		lastResult: Type.Optional(Type.Object({ vote: Int("The vote"), yes: Int("Yes"), no: Int("No") }, { description: "The last result" })),
		drawn: Type.Optional(Id("Who the lot fell on")),
	},
	{ description: "The running tribunal" },
);

const Pending = Type.Object({ tribunal: Int("Its number"), kind: Type.String({ description: "What to announce" }), facts: Type.String({ description: "The facts" }), text: Type.String({ description: "The city's line" }), due: Int("The city posts at") }, { description: "An announcement due" });

/**
 * The value of the fact `standoff-tribunal.section` (old `HoldoutSectionFact`).
 *
 * @public
 */
export const HoldoutSectionSchema = Type.Object(
	{
		minute: Int("The tick of the report"),
		stallMinutes: Int("Ticks before a blocker"),
		alive: Ids("The residents in the city, in the run's order"),
		blockers: Type.Array(Blocker, { description: "The blockers by door" }),
		session: Type.Union([Session, Type.Null({ description: "None" })], { description: "The running tribunal" }),
		pending: Type.Union([Pending, Type.Null({ description: "None" })], { description: "An announcement due" }),
		cooldownUntil: Int("The next tribunal may be called from"),
		struck: Ids("Who was struck"),
	},
	{ description: "The holdout tribunal's part of the gamemaker's report" },
);

/**
 * The value of the fact `standoff-tribunal.section`.
 *
 * @public
 */
export type HoldoutSection = Static<typeof HoldoutSectionSchema>;

function blockerLines({ blockers }: HoldoutSection): readonly string[] {
	if (blockers.length === 0) return ["- nobody"];
	return blockers.map((blocker) => {
		const what = blocker.passed ? `${blocker.blocker} passed it and holds back its fragment from ${blocker.lacking.join(", ")}` : `${blocker.blocker} has not sent its fragment yet to ${blocker.lacking.join(", ")}`;
		return `- door ${String(blocker.door)}: ${what} (a blocker since minute ${String(blocker.since)})`;
	});
}

function idleLine(section: HoldoutSection): string {
	const accusable = [...new Set(section.blockers.map((blocker) => blocker.blocker))];
	if (accusable.length === 0) return "- none running; callTribunal needs a blocker";
	if (section.minute < section.cooldownUntil) return `- none running; a tribunal ended a short while ago, the next may be called from minute ${String(section.cooldownUntil)}`;
	const lot = accusable.length > 1 ? ` (the city draws the accused by lot among all ${String(accusable.length)} blockers, whomever you name)` : "";
	return `- none running. YOUR MOVE if a blocker holds the city: callTribunal on ${accusable.join(" or ")}${lot}`;
}

function lotMove(section: HoldoutSection, session: NonNullable<HoldoutSection["session"]>): string {
	return session.drawn === undefined ? `drawLot with every resident in the city (${section.alive.join(", ")}), then permaDeath on the one drawn` : `the lot fell on ${session.drawn}: permaDeath(${session.drawn}, reason)`;
}

// The running tribunal's line; the old switch knew four stages and wrote nothing for another.
function sessionLines(section: HoldoutSection, session: NonNullable<HoldoutSection["session"]>): readonly string[] {
	const head = `- tribunal ${String(session.number)} on ${session.accused} (door ${String(session.door)})`;
	const last = session.lastResult;
	const result = last === undefined ? "" : `; vote ${String(last.vote)}: ${String(last.yes)} yes, ${String(last.no)} no`;
	const until = String(session.until);
	switch (session.stage) {
		case "grace":
			return [`${head}: grace until minute ${until}; still without its fragment: ${session.lacking.join(", ")}`];
		case "vote":
			return [`${head}: vote ${String(session.vote)} of ${String(session.maxVotes)} open until minute ${until}${result}; still without its fragment: ${session.lacking.join(", ")}`];
		case "banish":
			return [`${head}: the vote was unanimous${result}. YOUR MOVE: permaDeath(${session.accused}, reason); otherwise the city strikes at minute ${until}`];
		case "lot":
			return [`${head}: all ${String(session.maxVotes)} votes failed${result}. YOUR MOVE: ${lotMove(section, session)}; otherwise the city draws and strikes at minute ${until}`];
		default:
			return [];
	}
}

/**
 * The old lines with the blank line after them, or none.
 *
 * @param section - The fact's value; null or undefined without the holdout tribunal.
 * @returns The lines.
 */
export function renderHoldoutSection(section: HoldoutSection | null | undefined): readonly string[] {
	if (section === null || section === undefined) return [];
	const { session, pending } = section;
	const struck = `- struck so far: ${section.struck.length === 0 ? "nobody" : section.struck.join(", ")}`;
	return [
		`Blockers (the city's facts: a resident at a door ${String(section.stallMinutes)}+ minutes, others before it ${String(section.stallMinutes)}+ minutes without its fragment):`,
		...blockerLines(section),
		"Holdout tribunal:",
		...(pending === null ? [] : [`- TO ANNOUNCE (announceTribunal; otherwise the city posts a plain line at minute ${String(pending.due)}): ${pending.facts}`]),
		...(session === null ? [idleLine(section)] : sessionLines(section, session)),
		struck,
		"",
	];
}
