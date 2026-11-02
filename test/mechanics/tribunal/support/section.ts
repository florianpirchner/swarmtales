/**
 * The gamemaker's "Tribunal:" section (old `tribunalLines`, packages/roles/src/gamemaker/situation.ts:269-321):
 * `renderSection` writes the old lines from the data of the tribunal's `section` fact. The
 * world-level test (test/mechanics/exile/world.test.ts) checks it against the old `describeSituation`
 * with the section data the old `Tribunal` gave, as recorded once (step 18, item 7b).
 */
import { renderTribunalSection, tribunalSectionOf } from "@swarmtales/mechanic-tribunal";

/** The old lines, word for word, from the section's data (the production renderer, mechanics/tribunal/src/section.ts). */
export function renderSection(section: unknown): readonly string[] {
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
