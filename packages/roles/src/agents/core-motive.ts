/**
 * A dealt core motive as the readers show it (v09): as prose for a resident's private file and as
 * one line for the gamemaker and the reports. Moved here from `packages/engine/src/motives.ts`
 * (step 18, item 7c); the dealing itself is the motives mechanic's (`@swarmtales/mechanic-motives`,
 * which renders the same prose for the prompts).
 */
import type { CoreMotiveDrive, CoreMotiveTrait } from "@swarmtales/legacy-log";
import type { CoreMotivesSpec } from "@swarmtales/contracts";

/** What `core_dealt` records of a resident. */
export interface CoreMotive {
	readonly bigFive: readonly CoreMotiveTrait[];
	readonly drives: readonly CoreMotiveDrive[];
	/** The cast figure this core motive comes from. */
	readonly figure?: string;
}

/**
 * The core motive as prose for the system prompt: the temperament sentences, then
 * the drives from "above all" down. Empty sentences (a story may leave the
 * middle of an axis unsaid) are skipped.
 */
export function renderCoreMotive(spec: CoreMotivesSpec, coreMotive: CoreMotive): string {
	const figure = coreMotive.figure === undefined ? undefined : spec.figures?.find((candidate) => candidate.id === coreMotive.figure);
	if (figure !== undefined) return [spec.heading, figure.text.trim()].join("\n\n");
	const temperament = coreMotive.bigFive.flatMap((trait) => {
		const text = spec.axes.find((axis) => axis.id === trait.axis)?.texts[trait.level].trim() ?? "";
		return text.length === 0 ? [] : [text];
	});
	const drives = coreMotive.drives.flatMap((entry) => {
		const text = spec.drives.find((drive) => drive.id === entry.drive)?.texts[entry.intensity].trim() ?? "";
		return text.length === 0 ? [] : [text];
	});
	return [spec.heading, [...temperament, ...drives].join(" ")].join("\n");
}

/** `above all pride; clearly greed · openness high, ...`: the core motive in a line, for the gamemaker and the reports. */
export function coreMotiveLine(coreMotive: CoreMotive): string {
	const words: Readonly<Record<CoreMotiveDrive["intensity"], string>> = { aboveAll: "above all", clearly: "clearly", atTimes: "at times" };
	const drives = coreMotive.drives.map((entry) => `${words[entry.intensity]} ${entry.drive}`).join("; ");
	const traits = coreMotive.bigFive.map((trait) => `${trait.axis} ${trait.level}`).join(", ");
	const line = traits.length === 0 ? drives : `${drives} · ${traits}`;
	return coreMotive.figure === undefined ? line : `${coreMotive.figure}: ${line}`;
}
