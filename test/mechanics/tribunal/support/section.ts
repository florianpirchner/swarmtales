/**
 * The gamemaker's "Tribunal:" section (old `tribunalLines`, packages/roles/src/gamemaker/situation.ts:269-321):
 * `sectionOfOld` reads the data the old function reads from the old `Tribunal`, in the shape of
 * the tribunal's `section` fact, and `renderSection` writes the old lines from that data. The
 * world-level test checks `renderSection(sectionOfOld(world.tribunal))` against the old
 * `describeSituation`; the differential compares `sectionOfOld` with the new fact.
 */
import type { Tribunal } from "@swarmtales/engine";

export interface Section {
	readonly residents: number;
	readonly target: number;
	readonly exiled: readonly string[];
	readonly missing: number;
	readonly actEnd: number;
	readonly rules: {
		readonly voteMinutes: number;
		readonly gateMinutes: number;
		readonly ransom: { readonly share: number; readonly selfShare: number; readonly minimum: number };
		readonly bequestPerHeir: number;
		readonly blocBonus: number | null;
		readonly fallbackGap: number;
	};
	readonly plan: { readonly tribunal: number; readonly called: boolean; readonly by: string; readonly calledAt: number; readonly opens: number; readonly count: number; readonly factions: number } | null;
	readonly window:
		| { readonly open: false; readonly why: string }
		| { readonly open: true; readonly earliest: number; readonly latestFinal: number; readonly latestWithRoom?: number; readonly missing: number; readonly maxFactions: number };
	readonly cityCall: { readonly calledAt: number; readonly opens: number } | null;
	readonly session: { readonly tribunal: number; readonly accused: readonly string[]; readonly count: number; readonly until: number } | null;
	readonly draft: { readonly group: string; readonly leaders: readonly string[] } | null;
	readonly gates: readonly { readonly agent: string; readonly since: number; readonly until: number; readonly ransomable: boolean; readonly price: number; readonly selfPrice: number; readonly paid: number; readonly covered: number; readonly willDone: boolean }[];
}

/** What the old `tribunalLines` reads of the old tribunal, or null when it writes nothing. */
export function sectionOfOld(tribunal: Tribunal | undefined): Section | null {
	if (tribunal?.active !== true) return null;
	const spec = tribunal.spec;
	const plan = tribunal.plan;
	const session = tribunal.session;
	const group = tribunal.draftGroup;
	return {
		residents: tribunal.residents,
		target: tribunal.target,
		exiled: [...tribunal.exiled],
		missing: tribunal.missing,
		actEnd: tribunal.actEnd,
		rules: {
			voteMinutes: spec.voteMinutes,
			gateMinutes: spec.gateMinutes,
			ransom: { share: spec.ransom.share, selfShare: spec.ransom.selfShare, minimum: spec.ransom.minimum },
			bequestPerHeir: spec.bequestPerHeir,
			blocBonus: spec.factions?.blocBonus ?? null,
			fallbackGap: spec.fallbackGap,
		},
		plan: plan === undefined ? null : { tribunal: plan.tribunal, called: plan.called, by: plan.by, calledAt: plan.calledAt, opens: plan.opens, count: plan.count, factions: plan.factions },
		window: tribunal.schedulingWindow(),
		cityCall: tribunal.cityCall() ?? null,
		session: session === undefined ? null : { tribunal: session.tribunal, accused: [...session.accused], count: session.count, until: session.until },
		draft: group === undefined ? null : { group, leaders: [...tribunal.leaders] },
		gates: tribunal.gates().map((gate) => ({ ...gate })),
	};
}

/** The old lines, word for word, from the section's data. */
export function renderSection(section: Section | null): readonly string[] {
	if (section === null) return [];
	const { rules } = section;
	const lines = [
		"Tribunal:",
		`- the city keeps ${section.residents - section.target} of ${section.residents}: ${section.target} to exile, ${section.exiled.length} exiled so far, ` +
			`${section.missing} still missing; the act ends at minute ${section.actEnd} at the latest (the residents do not know)`,
		`- each tribunal accuses one more than it exiles (the fewest points), vote ${rules.voteMinutes} minutes, gate ${rules.gateMinutes} minutes, ` +
			`ransom ${Math.round(rules.ransom.share * 100)}% of the median points (${Math.round(rules.ransom.selfShare * 100)}% when paid by the exiled itself, at least ${rules.ransom.minimum}), ` +
			`a last will leaves each heir at most ${Math.round(rules.bequestPerHeir * 100)}% of the points` +
			(rules.blocBonus === null ? "" : `; a faction voting as one earns each voter ${rules.blocBonus} points`),
	];
	const plan = section.plan;
	if (plan !== null) {
		lines.push(
			`- tribunal ${plan.tribunal} ${plan.called ? "called" : `planned (by ${plan.by}), called at minute ${plan.calledAt}`}: opens at minute ${plan.opens}, ` +
				`exiles ${plan.count}${plan.factions >= 2 ? `, ${plan.factions} factions` : ""}`,
		);
	}
	const window = section.window;
	if (window.open) {
		const call = section.cityCall;
		lines.push(
			`- YOUR MOVE: scheduleTribunal is available now. The city still has to exile ${window.missing} ${window.missing === 1 ? "resident" : "residents"}; ` +
				`the earliest opening is minute ${window.earliest}. ` +
				(call === null ? "If you plan nothing, the city calls no further tribunal itself." : `If you plan nothing, the city calls one itself at minute ${call.calledAt} (it opens at minute ${call.opens}).`),
		);
	}
	lines.push(
		window.open
			? `- scheduleTribunal is open: minute ${window.earliest}-${window.latestFinal}` +
					(window.latestWithRoom === undefined ? `, count must be ${window.missing}` : ` (by minute ${window.latestWithRoom} for a count below ${window.missing}), count 1-${window.missing}`) +
					(window.maxFactions >= 2 ? `, factions 2-${window.maxFactions}` : "") +
					`; without a plan the city calls one itself ${rules.fallbackGap} minutes after the last result`
			: `- scheduleTribunal is closed: ${window.why}`,
	);
	const session = section.session;
	if (session !== null) lines.push(`- open tribunal ${session.tribunal}: ${session.accused.join(", ")} accused, ${session.count} to exile, the vote closes at minute ${session.until}`);
	const draft = section.draft;
	if (draft !== null) lines.push(`- faction draft in group ${draft.group}${draft.leaders.length === 0 ? "" : `, leaders ${draft.leaders.join(", ")}`}`);
	for (const gate of section.gates) {
		lines.push(
			`- ${gate.agent} at the gate until minute ${gate.until}: ` +
				(gate.ransomable ? `ransom ${gate.covered}% covered (${gate.price} from others, ${gate.selfPrice} from itself)` : "bought back once already, no ransom") +
				(gate.willDone ? ", will written" : ""),
		);
	}
	if (section.exiled.length > 0) lines.push(`- exiled: ${section.exiled.join(", ")}`);
	return [...lines, ""];
}

/** The "Tribunal:" block of a situation text, as lines up to and with the blank line after it, or none. */
export function sectionLines(situation: string): readonly string[] {
	const lines = situation.split("\n");
	const start = lines.indexOf("Tribunal:");
	if (start < 0) return [];
	const end = lines.indexOf("", start);
	return lines.slice(start, end + 1);
}
