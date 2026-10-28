/**
 * The fixed label set of the statement classifier (SPEC 10.5). Every label
 * names a stance a resident takes in one statement or thought. The set is
 * closed: anything else a model answers is dropped, so a label can never
 * carry free text (or a password piece) out of a thought.
 */

export const STATEMENT_LABELS = ["promise", "offer", "threat", "refusal", "lie", "hesitation", "helpRequest", "accusation", "thanks"] as const;

export type StatementLabel = (typeof STATEMENT_LABELS)[number];

/** Where a statement was made; `thought` and `aside` reach no other resident. */
export const STATEMENT_SOURCES = ["thought", "aside", "dm", "board", "group", "cast"] as const;

export type StatementSource = (typeof STATEMENT_SOURCES)[number];

/** What each label means, as the classifier is told. */
export const LABEL_MEANINGS: Readonly<Record<StatementLabel, string>> = {
	promise: "commits to a future action for someone (send a fragment, pay, sign, help)",
	offer: "proposes a deal or a trade (points for a fragment, cooperation for something in return)",
	threat: "announces or plans harm to someone (expose, kick, punish, sign against, withhold) unless they comply",
	refusal: "declines a request, keeps something back on purpose, or decides not to cooperate",
	lie: "states something the speaker knows to be false, e.g. a message that contradicts the speaker's own thought",
	hesitation: "holds back from acting out of fear of risk or loss (a wrong-code penalty, being cheated, losing rank)",
	helpRequest: "asks someone for help, a fragment, points or information",
	accusation: "blames someone for cheating, lying, free-riding, stealing or betrayal",
	thanks: "thanks someone or gives something back for help received (credit, a fragment, points, an answer)",
};

/** Short wording for reports, e.g. `hesitates (risk)`. */
export const LABEL_TEXT: Readonly<Record<StatementLabel, string>> = {
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

const LABEL_SET: ReadonlySet<string> = new Set(STATEMENT_LABELS);
const SOURCE_SET: ReadonlySet<string> = new Set(STATEMENT_SOURCES);

export function isStatementLabel(value: string): value is StatementLabel {
	return LABEL_SET.has(value);
}

export function isStatementSource(value: string): value is StatementSource {
	return SOURCE_SET.has(value);
}

/** Whether the source is private (reaches no other resident). */
export function isPrivateSource(source: StatementSource): boolean {
	return source === "thought" || source === "aside";
}
