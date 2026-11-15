// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The Confessor's labels since the last look, carried from old `packages/roles/src/gamemaker/situation.ts`
 * (`labelLines`) and `packages/legacy-log/src/labels.ts` (`LABEL_TEXT`, `isPrivateSource`), read from the quiet
 * firings of `interpretations.interpretation`. Public labels (with the residents they are about) come first; private
 * labels, read from thoughts, stand apart and name nobody, since a thought about a teammate would give away a team
 * the level hides. The thought itself is never shown.
 */
import type { Firing } from "@swarmtales/sdk";
import { Type, type Static } from "typebox";
import { Check } from "typebox/value";
import { LABELS } from "../confessor/interpretations.ts";
import { Id, Ids } from "./report/schema.ts";

type Label = (typeof LABELS)[number];

/** Short wording for reports, e.g. `hesitates (risk)` (old `LABEL_TEXT`). */
const LABEL_TEXT: Readonly<Record<Label, string>> = {
	promise: "promise",
	offer: "offer",
	threat: "threat",
	refusal: "refusal",
	lie: "lie",
	hesitation: "hesitates (risk)",
	helpRequest: "asks for help",
	accusation: "accusation",
	thanks: "thanks",
};

const Interpretation = Type.Object(
	{ agent: Id(), source: Type.String({ description: "Where it was made" }), labels: Type.Array(Type.Enum(LABELS, { description: "A label" }), { description: "Its labels" }), targets: Ids("Whom it is about") },
	{ description: "The part of `interpretations.interpretation` the gamemaker reads" },
);

// Whether the source is private (reaches no other resident).
const isPrivateSource = (source: string): boolean => source === "thought" || source === "aside";

const linesOf = (map: ReadonlyMap<string, readonly string[]>): readonly string[] => [...map].sort(([x], [y]) => x.localeCompare(y)).map(([agent, labels]) => `- ${agent}: ${labels.join(", ")}`);

// Files one label of a statement under its resident, public or private, once.
function sortLabel(payload: Static<typeof Interpretation>, label: Label, visible: Map<string, string[]>, hidden: Map<string, string[]>): void {
	// A lie is read against the speaker's own thought, so it is as private as the thought.
	const isHidden = isPrivateSource(payload.source) || label === "lie";
	const about = isHidden || payload.targets.length === 0 ? "" : ` about ${payload.targets.join(", ")}`;
	const entry = isHidden ? LABEL_TEXT[label] : `${LABEL_TEXT[label]}${about} (${payload.source})`;
	const target = isHidden ? hidden : visible;
	const list = target.get(payload.agent) ?? [];
	if (!list.includes(entry)) list.push(entry);
	target.set(payload.agent, list);
}

/**
 * The label blocks of one look (old `labelLines`), each with its blank line; none without a label.
 *
 * @param firings - The firings the look took.
 * @returns The lines.
 *
 * @public
 */
export function labelLines(firings: readonly Firing[]): readonly string[] {
	const visible = new Map<string, string[]>();
	const hidden = new Map<string, string[]>();
	for (const { event, payload } of firings) {
		if (event === "interpretations.interpretation" && Check(Interpretation, payload)) for (const label of payload.labels) sortLabel(payload, label, visible, hidden);
	}
	return [
		...(visible.size === 0 ? [] : ["How residents came across (classifier labels of what they wrote):", ...linesOf(visible), ""]),
		...(hidden.size === 0 ? [] : ["Private reads (from each resident's own thoughts; use one only in a note to that same resident, never tell anyone else):", ...linesOf(hidden), ""]),
	];
}
