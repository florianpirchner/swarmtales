/**
 * Small pure helpers copied from the old engine: graduated penalties (packages/engine/src/penalties.ts)
 * and text templates with `{name}` placeholders (packages/kernel/src/templates.ts).
 */
import type { Static } from "typebox";
import type { PenaltyLadder } from "@swarmtales/mechanic-shared";

type Ladder = Static<typeof PenaltyLadder>;

/** The price of the `offence`-th offence (from 1): its step, or the last step beyond the ladder. */
export function penaltyAt(ladder: Ladder, offence: number): number {
	const steps = typeof ladder === "number" ? [ladder] : ladder;
	return steps[Math.min(Math.max(1, offence), steps.length) - 1] ?? 0;
}

const PLACEHOLDER = /\{([A-Za-z][A-Za-z0-9]*)\}/g;

/** Replaces `{name}` with `values[name]`; an unknown placeholder throws. */
export function renderTemplate(template: string, values: Readonly<Partial<Record<string, string>>>): string {
	return template.replace(PLACEHOLDER, (_match: string, name: string) => {
		const value = values[name];
		if (value === undefined) throw new Error(`Unknown placeholder {${name}}`);
		return value;
	});
}
