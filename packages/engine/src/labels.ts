/**
 * The fixed label set of the statement classifier (SPEC 10.5). Every label
 * names a stance a resident takes in one statement or thought. The set is
 * closed: anything else a model answers is dropped, so a label can never
 * carry free text (or a password piece) out of a thought.
 */
import { text, type PlainPromptId } from "@swarmtales/prompts";

export const STATEMENT_LABELS = ["promise", "offer", "threat", "refusal", "lie", "hesitation", "helpRequest", "accusation", "thanks"] as const;

export type StatementLabel = (typeof STATEMENT_LABELS)[number];

/** Where a statement was made; `thought` and `aside` reach no other resident. */
export const STATEMENT_SOURCES = ["thought", "aside", "dm", "board", "group", "cast"] as const;

export type StatementSource = (typeof STATEMENT_SOURCES)[number];

const LABEL_PROMPTS = {
	promise: "classifier/label-promise",
	offer: "classifier/label-offer",
	threat: "classifier/label-threat",
	refusal: "classifier/label-refusal",
	lie: "classifier/label-lie",
	hesitation: "classifier/label-hesitation",
	helpRequest: "classifier/label-helpRequest",
	accusation: "classifier/label-accusation",
	thanks: "classifier/label-thanks",
} as const satisfies Record<StatementLabel, PlainPromptId>;

/** What a label means, as the classifier is told (read from the prompt library on use). */
export function labelMeaning(label: StatementLabel): string {
	return text(LABEL_PROMPTS[label]);
}

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
