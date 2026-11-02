/**
 * The black seal's part of the gamemaker's report (step 18, item 2), word for word as the old
 * `sealLines` (packages/roles/src/gamemaker/situation.ts): that a seal exists and whether someone
 * bears one, never who bids or bears. The fact `seal.section` holds the data.
 */
import { Type, type Static } from "typebox";
import { Parse } from "typebox/value";

export const SealSectionFact = Type.Object({
	auction: Type.Union([Type.Object({ seal: Type.Integer(), until: Type.Integer() }), Type.Null()]),
	borne: Type.Integer(),
	pending: Type.Integer(),
});

export type SealSection = Static<typeof SealSectionFact>;

/** The section's data from an untrusted fact value; a run without the seal has none. */
export function sealSectionOf(value: unknown): SealSection | null {
	return value === undefined || value === null ? null : Parse(SealSectionFact, value);
}

/** The old lines with the blank line after them, or none. */
export function renderSealSection(section: SealSection | null): readonly string[] {
	if (section === null) return [];
	const { auction } = section;
	const open = auction === null ? 0 : 1;
	const parts = [
		...(auction === null ? [] : [`an auction runs until minute ${String(auction.until)} (bids are secret, also from you)`]),
		...(section.borne === 0 ? [] : [`${section.borne === 1 ? "someone bears an unused seal" : `${String(section.borne)} unused seals are borne`} (you do not know who)`]),
		...(section.pending > open ? [`${String(section.pending - open)} more to auction in this act`] : []),
	];
	if (parts.length === 0) return [];
	return ["Black seal (its bearer strikes one resident from the city at once):", ...parts.map((part) => `- ${part}`), ""];
}
