/**
 * The gamemaker's "Tribunal:" section, word for word as the old `tribunalLines`
 * (packages/roles/src/gamemaker/situation.ts:269-321), written from the tribunal's `section` fact.
 * The app's host-backed gamemaker report renders this part from `tribunal.section`; the gate
 * test/cli/host-story-golden.test.ts compares it with every golden gamemaker look.
 */
import { Parse } from "typebox/value";
import type { Static } from "typebox";
import { SectionFact } from "./view.ts";

export type TribunalSection = Static<typeof SectionFact>;

/** The section's data from an untrusted fact value (the host's `facts()`). */
export function tribunalSectionOf(value: unknown): TribunalSection {
	return Parse(SectionFact, value ?? null);
}

/** The old lines, word for word, from the section's data. */
export function renderTribunalSection(section: TribunalSection): readonly string[] {
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
