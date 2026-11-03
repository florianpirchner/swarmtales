/**
 * The holdout tribunal's part of the gamemaker's report (step 18, item 2), word for word as the old
 * `holdoutLines` (packages/roles/src/gamemaker/situation.ts): the blockers the city finds, the
 * running tribunal and the gamemaker's move. Facts only, never a ballot. The facts `blockers`,
 * `session`, `pending`, `cooldownUntil` and `struck` and the combined `section` share the
 * computations here; `renderHoldoutSection` writes the old lines from `section`.
 */
import { Type, type Static } from "typebox";
import { Parse } from "typebox/value";
import type { ViewOf } from "@swarmtales/contracts";
import { ExileApi, PuzzlesApi } from "@swarmtales/mechanic-shared";
import type { standoffTribunalHead } from "./head.ts";

type View = ViewOf<typeof standoffTribunalHead>;

const Id = Type.String();
const Int = Type.Integer();

export const BlockersFact = Type.Array(Type.Object({ door: Int, blocker: Id, lacking: Type.Array(Id), passed: Type.Boolean(), since: Int }));

export const SessionFact = Type.Union([
	Type.Object({
		number: Int,
		accused: Id,
		door: Int,
		stage: Type.String(),
		until: Int,
		vote: Int,
		maxVotes: Int,
		/** Who still lacks the accused's fragment of its door (old `lackingNow`), read when the fact is. */
		lacking: Type.Array(Id),
		lastResult: Type.Optional(Type.Object({ vote: Int, yes: Int, no: Int })),
		drawn: Type.Optional(Id),
	}),
	Type.Null(),
]);

export const PendingFact = Type.Union([Type.Object({ tribunal: Int, kind: Type.String(), facts: Type.String(), text: Type.String(), due: Int }), Type.Null()]);

export const HoldoutSectionFact = Type.Object({
	minute: Int,
	stallMinutes: Int,
	/** The residents in the city, in the run's order (old `world.alive`), for the lot. */
	alive: Type.Array(Id),
	blockers: BlockersFact,
	session: SessionFact,
	pending: PendingFact,
	cooldownUntil: Int,
	struck: Type.Array(Id),
});

export type HoldoutSection = Static<typeof HoldoutSectionFact>;

export function blockersOf(view: View): Static<typeof BlockersFact> {
	return [...view.state.data.blockers.values()]
		.sort((a, b) => a.door - b.door || a.blocker.localeCompare(b.blocker))
		.map((blocker) => ({ door: blocker.door, blocker: blocker.blocker, lacking: [...blocker.lacking], passed: blocker.passed, since: blocker.since }));
}

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
		lacking: [...view.call(PuzzlesApi, "lacking", { level: session.door, holder: session.accused })],
		...(session.lastResult === undefined ? {} : { lastResult: { ...session.lastResult } }),
		...(session.drawn === undefined ? {} : { drawn: session.drawn }),
	};
}

export function pendingOf(view: View): Static<typeof PendingFact> {
	return view.state.data.pending === undefined ? null : { ...view.state.data.pending };
}

export function computeHoldoutSection(view: View): HoldoutSection {
	return {
		minute: view.minute,
		stallMinutes: view.options.stallMinutes,
		alive: [...view.call(ExileApi, "alive", {})],
		blockers: blockersOf(view),
		session: sessionOf(view),
		pending: pendingOf(view),
		cooldownUntil: view.state.data.cooldownUntil,
		struck: [...view.state.data.struck],
	};
}

/** The section's data from an untrusted fact value; a run without the holdout tribunal has none. */
export function holdoutSectionOf(value: unknown): HoldoutSection | null {
	return value === undefined || value === null ? null : Parse(HoldoutSectionFact, value);
}

/** The old lines with the blank line after them, or none. */
export function renderHoldoutSection(section: HoldoutSection | null): readonly string[] {
	if (section === null) return [];
	const lines = [`Blockers (the city's facts: a resident at a door ${String(section.stallMinutes)}+ minutes, others before it ${String(section.stallMinutes)}+ minutes without its fragment):`];
	const { blockers, session, pending } = section;
	if (blockers.length === 0) lines.push("- nobody");
	for (const blocker of blockers) {
		const what = blocker.passed
			? `${blocker.blocker} passed it and holds back its fragment from ${blocker.lacking.join(", ")}`
			: `${blocker.blocker} has not sent its fragment yet to ${blocker.lacking.join(", ")}`;
		lines.push(`- door ${String(blocker.door)}: ${what} (a blocker since minute ${String(blocker.since)})`);
	}
	lines.push("Holdout tribunal:");
	if (pending !== null) lines.push(`- TO ANNOUNCE (announceTribunal; otherwise the city posts a plain line at minute ${String(pending.due)}): ${pending.facts}`);
	const struck = `- struck so far: ${section.struck.length === 0 ? "nobody" : section.struck.join(", ")}`;
	if (session === null) {
		const accusable = [...new Set(blockers.map((blocker) => blocker.blocker))];
		lines.push(
			accusable.length === 0
				? "- none running; callTribunal needs a blocker"
				: section.minute < section.cooldownUntil
					? `- none running; a tribunal ended a short while ago, the next may be called from minute ${String(section.cooldownUntil)}`
					: `- none running. YOUR MOVE if a blocker holds the city: callTribunal on ${accusable.join(" or ")}` +
						(accusable.length > 1 ? ` (the city draws the accused by lot among all ${String(accusable.length)} blockers, whomever you name)` : ""),
		);
		return [...lines, struck, ""];
	}
	const head = `- tribunal ${String(session.number)} on ${session.accused} (door ${String(session.door)})`;
	const result = session.lastResult === undefined ? "" : `; vote ${String(session.lastResult.vote)}: ${String(session.lastResult.yes)} yes, ${String(session.lastResult.no)} no`;
	switch (session.stage) {
		case "grace":
			lines.push(`${head}: grace until minute ${String(session.until)}; still without its fragment: ${session.lacking.join(", ")}`);
			break;
		case "vote":
			lines.push(`${head}: vote ${String(session.vote)} of ${String(session.maxVotes)} open until minute ${String(session.until)}${result}; still without its fragment: ${session.lacking.join(", ")}`);
			break;
		case "banish":
			lines.push(`${head}: the vote was unanimous${result}. YOUR MOVE: permaDeath(${session.accused}, reason); otherwise the city strikes at minute ${String(session.until)}`);
			break;
		case "lot":
			lines.push(
				`${head}: all ${String(session.maxVotes)} votes failed${result}. YOUR MOVE: ` +
					(session.drawn === undefined
						? `drawLot with every resident in the city (${section.alive.join(", ")}), then permaDeath on the one drawn`
						: `the lot fell on ${session.drawn}: permaDeath(${session.drawn}, reason)`) +
					`; otherwise the city draws and strikes at minute ${String(session.until)}`,
			);
			break;
		default:
			// The old switch knew these four stages and wrote nothing for another.
			break;
	}
	return [...lines, struck, ""];
}
