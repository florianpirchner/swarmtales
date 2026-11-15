// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The character check of a Director's note, carried from the old `mechanics/channels/src/privacy.ts`
 * (`characterLeaks`, SPEC 10.5, v09): a resident's core motive and goal may be used only in a note to that resident;
 * the board and every other reader get none of it. Pure rule code, shared through `/rules`: `motives` checks the
 * drives' cues with it, and `goals` (M5-40) the goal cues.
 *
 * @packageDocumentation
 */

/**
 * What a Director knows of one resident's character (v09): its drives' cue words and its secret goal. Both may be
 * used only in a note to that resident itself.
 *
 * @public
 */
export interface CharacterFacts {
	/** The resident. */
	readonly agent: string;
	/** Cue words of the resident's drives (the game's catalogue), lower case. */
	readonly cues: readonly string[];
	/** Its secret goal: the kind, and the resident it aims at where it has one. */
	readonly goal?: { readonly kind: string; readonly target?: string };
}

// The sentences of a note. A cue counts only in a sentence that names the resident (v09 runs: "your goal" or "do you
// intend" in one sentence and a resident's name in the next blocked every one of nine notes).
function sentences(text: string): readonly string[] {
	return text.split(/(?<=[.!?;])\s+|\n+/).filter((sentence) => sentence.trim() !== "");
}

// Whether `text` names `agent`, by ID or (v08) by name.
function names(text: string, agent: string, name: string | undefined): boolean {
	if (name !== undefined && new RegExp(`(?<![A-Za-z0-9-])${name}(?![A-Za-z0-9-])`, "i").test(text)) return true;
	return new RegExp(`(?<![A-Za-z0-9])${agent}(?![0-9])`).test(text);
}

/** Words that talk about a core motive or a goal, whoever it belongs to (direction 8 and 10 show private material too). */
const CHARACTER = /\b(goals?|cores?|drives?|secretly|deep down|at heart|above all|longs? to|yearns? to|orders?|dut(?:y|ies)|rivals?|tendenc\w*|sworn)\b/;

/** A wish, for the goal cues: exiles, ranks and wills are public, only wanting them is private. */
const WISH = "(?:wants?|wish(?:es)?|hopes?|needs?|longs?|aims?|means?|is set on|is after)";

/** Words that give a goal of each kind away; the targeted kinds count only with their target named. */
const GOAL_CUES: Readonly<Record<string, RegExp>> = {
	protect: /\b(protect\w*|shield\w*|guard\w*|keep \w+ (?:safe|in the city)|still in the city when (?:this|the) act ends)\b/,
	exile: new RegExp(`\\b(${WISH} (?:to (?:exile|banish|get rid of)|\\w+ (?:gone|exiled|out))|get rid of|gets rid of|(?:exiled|gone) before (?:this|the) act ends)\\b`),
	outrank: new RegExp(`\\b(${WISH} to (?:outrank|overtake|beat|end ahead|finish ahead|get ahead)|outrank\\w*|end\\w* (?:this|the) act (?:with more points than|ahead of))\\b`),
	lead: new RegExp(`\\b(${WISH} to lead|${WISH} a faction)\\b`),
	heir: new RegExp(`\\b(${WISH} to inherit|${WISH} (?:a|an|the) (?:will|bequest|inheritance))\\b`),
};

/**
 * Residents whose core motive or goal `text` would reveal to `to`: one sentence names them and talks about a core
 * motive or a goal, uses a cue word of one of their drives, or uses a cue of their goal together with its target. A
 * note to the resident itself is always allowed.
 *
 * @param text - The note.
 * @param to - Its reader: a resident id, or `board`.
 * @param residents - What is known of each resident.
 * @param nameOf - The name of a resident, if it has one.
 * @returns The residents given away, sorted.
 *
 * @public
 */
export function characterLeaks(text: string, to: string, residents: readonly CharacterFacts[], nameOf: (agent: string) => string | undefined): readonly string[] {
	const leaks: string[] = [];
	for (const facts of residents) {
		if (facts.agent === to) continue;
		const goal = facts.goal;
		const target = goal?.target;
		const leaked = sentences(text).some((sentence) => {
			if (!names(sentence, facts.agent, nameOf(facts.agent))) return false;
			const lower = sentence.toLowerCase();
			const cue = facts.cues.some((word) => new RegExp(`\\b${word.replace(/[^a-z0-9 -]/g, "")}\\w*`).test(lower));
			// A note to the target itself gives the goal away without naming it ("A03 wants you gone").
			const goalCue = goal !== undefined && GOAL_CUES[goal.kind]?.test(lower) === true && (target === undefined || target === to || names(sentence, target, nameOf(target)));
			return CHARACTER.test(lower) || cue || goalCue;
		});
		if (leaked) leaks.push(facts.agent);
	}
	return leaks.sort();
}
