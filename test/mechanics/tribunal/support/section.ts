/**
 * The gamemaker's "Tribunal:" section (old `tribunalLines`, packages/roles/src/gamemaker/situation.ts:269-321):
 * `sectionOfOld` reads the data the old function reads from the old `Tribunal`, in the shape of
 * the tribunal's `section` fact, and `renderSection` writes the old lines from that data. The
 * world-level test checks `renderSection(sectionOfOld(world.tribunal))` against the old
 * `describeSituation`; the differential compares `sectionOfOld` with the new fact.
 */
import type { Tribunal } from "@swarmtales/engine";
import { renderTribunalSection, tribunalSectionOf } from "@swarmtales/mechanic-tribunal";

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

/** The old lines, word for word, from the section's data (the production renderer, mechanics/tribunal/src/section.ts). */
export function renderSection(section: Section | null): readonly string[] {
	return renderTribunalSection(tribunalSectionOf(section));
}

/** The "Tribunal:" block of a situation text, as lines up to and with the blank line after it, or none. */
export function sectionLines(situation: string): readonly string[] {
	const lines = situation.split("\n");
	const start = lines.indexOf("Tribunal:");
	if (start < 0) return [];
	const end = lines.indexOf("", start);
	return lines.slice(start, end + 1);
}
