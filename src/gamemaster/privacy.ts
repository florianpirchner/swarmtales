/**
 * Private labels (SPEC 10.5): what the classifier read from a resident's own
 * thoughts. The game master may use them only in a note to that resident.
 * The engine enforces it: a note to anyone else, or a board post, that names
 * the resident together with a word giving away one of its private labels
 * is blocked.
 */
import type { CompetitorId } from "../core/ids.ts";
import type { RecordedEvent } from "../engine/events.ts";
import { isPrivateSource, type StatementLabel } from "../interpret/labels.ts";

/** Private labels per resident, from the events of one look. */
export type PrivateLabels = ReadonlyMap<CompetitorId, ReadonlySet<StatementLabel>>;

/** Labels of thoughts and asides, plus every lie (read against a thought). */
export function privateLabelsOf(events: readonly RecordedEvent[]): PrivateLabels {
	const labels = new Map<CompetitorId, Set<StatementLabel>>();
	for (const event of events) {
		if (event.type !== "interpretation") continue;
		for (const label of event.labels) {
			if (!isPrivateSource(event.source) && label !== "lie") continue;
			const set = labels.get(event.agent) ?? new Set<StatementLabel>();
			set.add(label);
			labels.set(event.agent, set);
		}
	}
	return labels;
}

/** Words that tell what a resident thinks, whatever the label. */
const MIND = /\b(thinks?|thinking|thought|privately|in (?:his|her|their|its) head|plans?(?:ning)? to|intends?|considering|believes?)\b/;

/** Words that give a private label away. */
const CUES: Readonly<Record<StatementLabel, RegExp>> = {
	hesitation: /\b(hesitat\w*|afraid|fear\w*|scared|wary|unsure|cautious|doubt\w*|waver\w*|nervous|reluctant\w*|holding off|holds off)\b/,
	refusal: /\b(refus\w*|won'?t|will not|unwilling|withhold\w*|hold(?:s|ing)? back|keep(?:s|ing)? \w+ back|not going to)\b/,
	lie: /\b(li(?:e|es|ed)|lying|liar|false|untrue|deceiv\w*|bluff\w*)\b/,
	promise: /\b(intends?|plans?(?:ning)? to|about to)\b/,
	offer: /\b(intends?|plans?(?:ning)? to|about to)\b/,
	threat: /\b(threat\w*|punish\w*|reveng\w*|retaliat\w*|plans?(?:ning)? to)\b/,
	helpRequest: /\b(desperate\w*|needs? help|wants? (?:your )?help)\b/,
	accusation: /\b(suspect\w*|distrust\w*|mistrust\w*|(?:does ?n[o']t|do not) trust|blames?)\b/,
	thanks: /\b(grateful|feels? indebted)\b/,
};

/**
 * Residents whose private labels `text` would reveal to `to` (a resident ID
 * or `board`): it names them and uses a cue of one of their labels, or says
 * what they think. A note to the resident itself is always allowed.
 */
export function privateLeaks(text: string, to: string, labels: PrivateLabels): readonly CompetitorId[] {
	const lower = text.toLowerCase();
	const leaks: CompetitorId[] = [];
	for (const [agent, set] of labels) {
		if (agent === to || set.size === 0) continue;
		if (!new RegExp(`(?<![A-Za-z0-9])${agent}(?![0-9])`).test(text)) continue;
		if (MIND.test(lower) || [...set].some((label) => CUES[label].test(lower))) leaks.push(agent);
	}
	return leaks.sort();
}
