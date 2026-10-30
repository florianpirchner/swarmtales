/**
 * Private labels (SPEC 10.5): what the classifier read from a resident's own
 * thoughts. The gamemaker may use them only in a note to that resident.
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
 * The sentences of a note. A cue counts only in a sentence that names the
 * resident (v09 runs: "your goal" or "do you intend" in one sentence and a
 * resident's name in the next blocked every one of nine notes).
 */
function sentences(text: string): readonly string[] {
	return text.split(/(?<=[.!?;])\s+|\n+/).filter((sentence) => sentence.trim() !== "");
}

/**
 * Residents whose private labels `text` would reveal to `to` (a resident ID
 * or `board`): one sentence names them (by ID or, v08, by name) and uses a
 * cue of one of their labels, or says what they think. A note to the
 * resident itself is always allowed.
 */
export function privateLeaks(text: string, to: string, labels: PrivateLabels, nameOf: (agent: CompetitorId) => string | undefined = () => undefined): readonly CompetitorId[] {
	const leaks: CompetitorId[] = [];
	for (const [agent, set] of labels) {
		if (agent === to || set.size === 0) continue;
		const leaked = sentences(text).some((sentence) => {
			if (!names(sentence, agent, nameOf(agent))) return false;
			const lower = sentence.toLowerCase();
			return MIND.test(lower) || [...set].some((label) => CUES[label].test(lower));
		});
		if (leaked) leaks.push(agent);
	}
	return leaks.sort();
}

/**
 * What the gamemaker knows of one resident's character (v09): its drives'
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
// Direction 8 and 10 show the figures' tendencies, rivals, orders and duty in the report: private material too.
const CHARACTER = /\b(goals?|cores?|drives?|secretly|deep down|at heart|above all|longs? to|yearns? to|orders?|dut(?:y|ies)|rivals?|tendenc\w*|sworn)\b/;

/**
 * A wish, for the goal cues: exiles, ranks and wills are public, only wanting
 * them (or the goal's own wording, "end this act with more points than") is private.
 */
const WISH = "(?:wants?|wish(?:es)?|hopes?|needs?|longs?|aims?|means?|is set on|is after)";

/** Words that give a goal of each kind away; the targeted kinds count only with their target named. */
const GOAL_CUES: Readonly<Record<GoalKind, RegExp>> = {
	protect: /\b(protect\w*|shield\w*|guard\w*|keep \w+ (?:safe|in the city)|still in the city when (?:this|the) act ends)\b/,
	exile: new RegExp(`\\b(${WISH} (?:to (?:exile|banish|get rid of)|\\w+ (?:gone|exiled|out))|get rid of|gets rid of|(?:exiled|gone) before (?:this|the) act ends)\\b`),
	outrank: new RegExp(`\\b(${WISH} to (?:outrank|overtake|beat|end ahead|finish ahead|get ahead)|outrank\\w*|end\\w* (?:this|the) act (?:with more points than|ahead of))\\b`),
	lead: new RegExp(`\\b(${WISH} to lead|${WISH} a faction)\\b`),
	heir: new RegExp(`\\b(${WISH} to inherit|${WISH} (?:a|an|the) (?:will|bequest|inheritance))\\b`),
};

/** Whether `text` names `agent`, by ID or (v08) by name. */
function names(text: string, agent: CompetitorId, name: string | undefined): boolean {
	if (name !== undefined && new RegExp(`(?<![A-Za-z0-9-])${name}(?![A-Za-z0-9-])`, "i").test(text)) return true;
	return new RegExp(`(?<![A-Za-z0-9])${agent}(?![0-9])`).test(text);
}

/**
 * Residents whose core or goal `text` would reveal to `to` (a resident ID or
 * `board`, v09): one sentence names them and talks about a core or a goal,
 * uses a cue word of one of their drives, or uses a cue of their goal
 * together with its target. A note to the resident itself is always allowed.
 */
export function characterLeaks(text: string, to: string, residents: readonly CharacterFacts[], nameOf: (agent: CompetitorId) => string | undefined = () => undefined): readonly CompetitorId[] {
	const leaks: CompetitorId[] = [];
	for (const facts of residents) {
		if (facts.agent === to) continue;
		const goal = facts.goal;
		const target = goal?.target;
		const leaked = sentences(text).some((sentence) => {
			if (!names(sentence, facts.agent, nameOf(facts.agent))) return false;
			const lower = sentence.toLowerCase();
			const cue = facts.cues.some((word) => new RegExp(`\\b${word.replace(/[^a-z0-9 -]/g, "")}\\w*`).test(lower));
			// A note to the target itself gives the goal away without naming it ("A03 wants you gone").
			const goalCue = goal !== undefined && GOAL_CUES[goal.kind].test(lower) && (target === undefined || target === to || names(sentence, target, nameOf(target)));
			return CHARACTER.test(lower) || cue || goalCue;
		});
		if (leaked) leaks.push(facts.agent);
	}
	return leaks.sort();
}

/**
 * Words that name a secret role or its weapons (Whispers v3): the residents
 * do not know that a whisperer exists, so no text of the gamemaker's may
 * carry them, whoever it is about.
 */
const ROLE_WORDS =
	/\b(whisper\w*|forg(?:e|es|ed|er|ers|ery|eries|ing)|slander\w*|sabot\w*|traitors?|impostors?|moles?|spy|spies|discord|sow(?:s|ing|n)?|secret (?:role|aim|agenda|enemy|game)|hidden (?:role|aim|agenda|enemy|game)|works? against (?:the city|the others|you all|everyone|all of you)|plays? (?:you|everyone|all of you) against)\b/;

/** Words that cast doubt on a resident: next to the role holder's name they point at it. */
const DOUBT =
	/\b(li(?:e|es|ed|ar|ars)|lying|rumou?rs?|untrue|false\w*|deceiv\w*|manipulat\w*|poison\w*|stirs?|stirring|suspicious|suspect\w*|beware|careful|trust\w*|distrust\w*|mistrust\w*|two-faced|behind (?:your|their|his|her) backs?|turns? (?:you|them|people) against)\b/;

/**
 * Whether `text` to `to` (a resident ID or `board`) could give the secret
 * role of `holder` away (Whispers v3): it uses a word of the role anywhere,
 * or a sentence names the holder together with a word of doubt. A note to
 * the holder itself may name it with doubt (it knows its role), never with
 * the role's words.
 */
export function roleLeaks(text: string, to: string, holder: CompetitorId, nameOf: (agent: CompetitorId) => string | undefined = () => undefined): boolean {
	const lower = text.toLowerCase();
	if (ROLE_WORDS.test(lower)) return true;
	if (to === holder) return false;
	return sentences(text).some((sentence) => names(sentence, holder, nameOf(holder)) && DOUBT.test(sentence.toLowerCase()));
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
