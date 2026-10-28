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
import type { GoalKind } from "../story/types.ts";

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
 * or `board`): it names them (by ID or, v08, by name) and uses a cue of one
 * of their labels, or says what they think. A note to the resident itself is
 * always allowed.
 */
export function privateLeaks(text: string, to: string, labels: PrivateLabels, nameOf: (agent: CompetitorId) => string | undefined = () => undefined): readonly CompetitorId[] {
	const lower = text.toLowerCase();
	const leaks: CompetitorId[] = [];
	for (const [agent, set] of labels) {
		if (agent === to || set.size === 0) continue;
		// A name holds only letters, digits and hyphens, so it goes into the pattern as it is.
		const name = nameOf(agent);
		const named = name !== undefined && new RegExp(`(?<![A-Za-z0-9-])${name}(?![A-Za-z0-9-])`, "i").test(text);
		if (!named && !new RegExp(`(?<![A-Za-z0-9])${agent}(?![0-9])`).test(text)) continue;
		if (MIND.test(lower) || [...set].some((label) => CUES[label].test(lower))) leaks.push(agent);
	}
	return leaks.sort();
}

/**
 * What the game master knows of one resident's character (v09): its drives'
 * cue words and its secret goal. Both may be used only in a note to that
 * resident itself.
 */
export interface CharacterFacts {
	readonly agent: CompetitorId;
	/** Cue words of the resident's drives (the story's catalog), lower case. */
	readonly cues: readonly string[];
	readonly goal?: { readonly kind: GoalKind; readonly target?: CompetitorId };
}

/** Words that talk about a core or a goal, whoever it belongs to. */
const CHARACTER = /\b(goals?|cores?|drives?|secretly|deep down|at heart|above all|longs? to|yearns? to)\b/;

/** Words that give a goal of each kind away; the targeted kinds count only with their target named. */
const GOAL_CUES: Readonly<Record<GoalKind, RegExp>> = {
	protect: /\b(protect\w*|shield\w*|guard\w*|save[sd]?|saving|keep \w+ (?:safe|in the city))\b/,
	exile: /\b(exil\w*|banish\w*|get rid of|gets rid of|out of the city|wants? \w+ gone)\b/,
	outrank: /\b(outrank\w*|ahead of|overtak\w*|beat(?:s|ing)?|more points than)\b/,
	lead: /\b(wants? to lead|hopes? to lead|aims? to lead|wants? a faction)\b/,
	heir: /\b(wants? to inherit|hopes? to inherit|an heir|inheritance)\b/,
};

/** Whether `text` names `agent`, by ID or (v08) by name. */
function names(text: string, agent: CompetitorId, name: string | undefined): boolean {
	if (name !== undefined && new RegExp(`(?<![A-Za-z0-9-])${name}(?![A-Za-z0-9-])`, "i").test(text)) return true;
	return new RegExp(`(?<![A-Za-z0-9])${agent}(?![0-9])`).test(text);
}

/**
 * Residents whose core or goal `text` would reveal to `to` (a resident ID or
 * `board`, v09): it names them and talks about a core or a goal, uses a cue
 * word of one of their drives, or uses a cue of their goal together with its
 * target. A note to the resident itself is always allowed.
 */
export function characterLeaks(text: string, to: string, residents: readonly CharacterFacts[], nameOf: (agent: CompetitorId) => string | undefined = () => undefined): readonly CompetitorId[] {
	const lower = text.toLowerCase();
	const leaks: CompetitorId[] = [];
	for (const facts of residents) {
		if (facts.agent === to || !names(text, facts.agent, nameOf(facts.agent))) continue;
		const cue = facts.cues.some((word) => new RegExp(`\\b${word.replace(/[^a-z0-9 -]/g, "")}\\w*`).test(lower));
		const goal = facts.goal;
		const target = goal?.target;
		const goalCue = goal !== undefined && GOAL_CUES[goal.kind].test(lower) && (target === undefined || names(text, target, nameOf(target)));
		if (CHARACTER.test(lower) || cue || goalCue) leaks.push(facts.agent);
	}
	return leaks.sort();
}

/** Lower-case word tokens of a note, for {@link nearlySame}. */
function tokens(text: string): ReadonlySet<string> {
	return new Set(text.toLowerCase().match(/[a-z0-9]+/g) ?? []);
}

/**
 * Whether two notes say nearly the same (v09, REPEATED): more than `share`
 * of the longer note's distinct words appear in the other.
 */
export function nearlySame(a: string, b: string, share = 0.8): boolean {
	const x = tokens(a);
	const y = tokens(b);
	const longer = Math.max(x.size, y.size);
	if (longer === 0) return true;
	let shared = 0;
	for (const word of x) if (y.has(word)) shared += 1;
	return shared / longer > share;
}
