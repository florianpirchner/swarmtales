// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The check of a private thought in a Director's note, carried from old `mechanics/channels/src/privacy.ts`
 * (`privateLeaks` and what it reads; decision A62, issue M5-72), itself copied from
 * packages/roles/src/gamemaker/privacy.ts (SPEC 10.5, v09): what a resident thinks may be used only in a note to
 * that resident; the board and every other reader get none of it.
 */

/**
 * Private labels per resident, from the classifier's reading of its thoughts.
 *
 * @internal
 */
export type PrivateLabels = ReadonlyMap<string, ReadonlySet<string>>;

/** The labels the classifier gives a statement (old `StatementLabel`). */
type Label = "hesitation" | "refusal" | "lie" | "promise" | "offer" | "threat" | "helpRequest" | "accusation" | "thanks";

/** Words that tell what a resident thinks, whatever the label. */
const MIND = /\b(thinks?|thinking|thought|privately|in (?:his|her|their|its) head|plans?(?:ning)? to|intends?|considering|believes?)\b/;

/** Words that give a private label away. */
const CUES: Readonly<Record<Label, RegExp>> = {
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

function isLabel(label: string): label is Label {
	return Object.hasOwn(CUES, label);
}

// A cue of the label, or nothing for a label the classifier does not know.
function cueOf(label: string): RegExp | undefined {
	return isLabel(label) ? CUES[label] : undefined;
}

// The sentences of a note. A cue counts only in a sentence that names the resident (v09 runs:
// "your goal" or "do you intend" in one sentence and a resident's name in the next blocked every
// one of nine notes).
function sentences(text: string): readonly string[] {
	return text.split(/(?<=[.!?;])\s+|\n+/).filter((sentence) => sentence.trim() !== "");
}

// Whether `text` names `agent`, by ID or (v08) by name.
function names(text: string, agent: string, name: string | undefined): boolean {
	if (name !== undefined && new RegExp(`(?<![A-Za-z0-9-])${name}(?![A-Za-z0-9-])`, "i").test(text)) return true;
	return new RegExp(`(?<![A-Za-z0-9])${agent}(?![0-9])`).test(text);
}

/**
 * Residents whose private labels `text` would reveal to `to` (a resident ID or `board`): one
 * sentence names them (by ID or, v08, by name) and uses a cue of one of their labels, or says what
 * they think. A note to the resident itself is always allowed.
 *
 * @param text - The note.
 * @param to - Its reader: a resident id, or `board`.
 * @param labels - The private labels per resident.
 * @param nameOf - The name of a resident, if it has one.
 * @returns The residents, sorted.
 *
 * @internal
 */
export function privateLeaks(text: string, to: string, labels: PrivateLabels, nameOf: (agent: string) => string | undefined): readonly string[] {
	const leaks: string[] = [];
	for (const [agent, set] of labels) {
		if (agent === to || set.size === 0) continue;
		const leaked = sentences(text).some((sentence) => {
			if (!names(sentence, agent, nameOf(agent))) return false;
			const lower = sentence.toLowerCase();
			return MIND.test(lower) || [...set].some((label) => cueOf(label)?.test(lower) === true);
		});
		if (leaked) leaks.push(agent);
	}
	return leaks.sort();
}
