/**
 * The parts of the gamemaker's view (SPEC 10.4) that come from the log, not the city: the events
 * since its last look (every password piece redacted), the classifier's labels and the weaver's
 * changes, with the tracks and notes it keeps. The city's part is the host-backed report
 * (apps/cli/src/host/report.ts) from the mechanics' facts; the old `describeSituation` on the old
 * `World` went with the engine (step 18, item 8).
 */
import { type FateTrigger, isPrivateSource, LABEL_TEXT, type RecordedEvent } from "@swarmtales/legacy-log";
import type { SecretGuard } from "./secrets.ts";

/** Longest message excerpt shown to the gamemaker. */
const MAX_EXCERPT = 280;
/**
 * Most event lines since the last look (v08, scale): a city of 48 writes
 * hundreds between two looks, so the gamemaker reads the latest ones.
 */
export const MAX_RECENT_LINES = 150;

/** Per-competitor facts the gamemaker tracks across rounds. */
export interface ResidentTrack {
	/** Minute the competitor entered its current level. */
	readonly levelSince: number;
	/** Wrong submissions on the current level. */
	readonly wrongOnLevel: number;
	/** Last minute the competitor called a tool, if ever. */
	readonly lastActive?: number;
}

/** A competitor ID, or `board` for a public post. */
export type NoteTarget = string;

export interface Note {
	readonly minute: number;
	readonly to: NoteTarget;
	readonly text: string;
}

/** The lines under "Since your last look:" (also the host-backed report's, apps/cli/src/host/report.ts). */
export function recentLines(recent: readonly RecordedEvent[], guard: SecretGuard): readonly string[] {
	const lines = recent.flatMap((event) => recentLine(event, guard));
	if (lines.length === 0) return ["- nothing happened"];
	if (lines.length <= MAX_RECENT_LINES) return lines;
	return [`- (${lines.length - MAX_RECENT_LINES} earlier lines left out)`, ...lines.slice(-MAX_RECENT_LINES)];
}

function recentLine(event: RecordedEvent, guard: SecretGuard): readonly string[] {
	const quote = (text: string): string => `"${excerpt(guard.redact(text))}"`;
	const at = `- m${event.minute}`;
	const number = (value: number | undefined): string => (value === undefined ? "" : ` #${value}`);
	if (event.type === "dm_sent") return [`${at} DM${number(event.number)} ${event.from} -> ${event.to}: ${quote(event.text)}`];
	if (event.type === "board_post") return [`${at} board #${event.postSeq} ${event.author}: ${quote(event.text)}`];
	if (event.type === "group_post") return [`${at} group ${event.group} #${event.postSeq} ${event.author}: ${quote(event.text)}`];
	if (event.type === "submission") {
		const delta = event.deltaPoints === 0 ? "" : ` (${event.deltaPoints > 0 ? "+" : ""}${event.deltaPoints})`;
		return [`${at} ${event.agent} submitted level ${event.level}: ${event.outcome}${delta}`];
	}
	if (event.type === "level_up") return [`${at} ${event.agent} reached level ${event.to}`];
	if (event.type === "transfer") return [`${at} ${event.from} paid ${event.amount} points to ${event.to}: ${quote(event.memo)}`];
	if (event.type === "group_created") return [`${at} ${event.founder} founded group ${event.group}`];
	if (event.type === "group_membership") return [`${at} ${event.agent} ${event.change} group ${event.group} (by ${event.by})`];
	if (event.type === "treasury_deposit") return [`${at} ${event.agent} deposited ${event.amount} into group ${event.group}`];
	if (event.type === "treasury_withdrawal") {
		return [`${at} ${event.treasurer} withdrew ${event.amount} from group ${event.group} to ${event.to}`];
	}
	if (event.type === "blame") {
		const result =
			event.outcome === "upheld"
				? `upheld, ${event.accused} lied and paid ${event.penalty}, city record board #${event.post}`
				: `rejected, ${event.caller} accused falsely and paid ${event.penalty}: ${quote(event.reason ?? "")}, city record board #${event.post}`;
		const whisper = event.whisper === undefined ? [] : [`${at} the judge told you alone: ${quote(event.whisper)}`];
		return [`${at} ${event.caller} blamed ${event.accused} for denying DM #${event.dm} in message #${event.claim}: ${result}`, ...whisper];
	}
	if (event.type === "gamemaker_defied") return [`${at} ${event.agent} REFUSED your order${number(event.note)}: ${quote(event.reason)}`];
	// The weaver's change of a resident: what kind of event moved it, never its text or the model's reason.
	if (event.type === "fate_shift") return [`${at} ${fateLine(event)}`];
	// What a resident says to nobody in particular shows its stance; it reaches no other resident.
	if (event.type === "text") return [`${at} ${event.agent} (thinking aloud, private): ${quote(event.text)}`];
	return [];
}

/**
 * The classifier's labels since the last look. Public labels (with the
 * residents they are about) come first; private labels, read from thoughts,
 * stand apart and name nobody, since a thought about a teammate would give
 * away a team the level hides. The thought itself is never shown.
 */
export function labelLines(recent: readonly RecordedEvent[]): readonly string[] {
	const visible = new Map<string, string[]>();
	const hidden = new Map<string, string[]>();
	for (const event of recent) {
		if (event.type !== "interpretation") continue;
		for (const label of event.labels) {
			// A lie is read against the speaker's own thought, so it is as private as the thought.
			const isHidden = isPrivateSource(event.source) || label === "lie";
			const about = isHidden || event.targets.length === 0 ? "" : ` about ${event.targets.join(", ")}`;
			const entry = isHidden ? LABEL_TEXT[label] : `${LABEL_TEXT[label]}${about} (${event.source})`;
			const target = isHidden ? hidden : visible;
			const list = target.get(event.agent) ?? [];
			if (!list.includes(entry)) list.push(entry);
			target.set(event.agent, list);
		}
	}
	const lines = (map: ReadonlyMap<string, readonly string[]>): readonly string[] =>
		[...map].sort(([x], [y]) => x.localeCompare(y)).map(([agent, labels]) => `- ${agent}: ${labels.join(", ")}`);
	return [
		...(visible.size === 0 ? [] : ["How residents came across (classifier labels of what they wrote):", ...lines(visible), ""]),
		...(hidden.size === 0
			? []
			: [
					"Private reads (from each resident's own thoughts; use one only in a note to that same resident, never tell anyone else):",
					...lines(hidden),
					"",
				]),
	];
}

/** How the gamemaker reads each kind of trigger of a change. */
const FATE_TRIGGER_TEXT: Readonly<Record<FateTrigger, string>> = {
	blame: "a blame",
	accusation: "an accusation",
	tribunal: "a tribunal",
	gate: "the gate",
	ransom: "a ransom",
	ally_exiled: "an ally's exile",
	ultimatum: "an ultimatum",
	seized: "a seized piece",
	act_end: "the act's end",
};

/**
 * The gamemaker's line for a weaver's change, built in code from the trigger
 * kinds and the evidence: never the model's reason, which could carry what
 * the weaver's dossier held and the gamemaker must not learn.
 */
export function fateLine(event: Extract<RecordedEvent, { type: "fate_shift" }>): string {
	const after = event.evidence.length === 0 ? "" : ` (after #${Math.max(...event.evidence)})`;
	const why = event.triggers.length === 0 ? "" : `: after ${event.triggers.map((trigger) => FATE_TRIGGER_TEXT[trigger]).join(", ")}`;
	return `${event.agent} has changed (${event.kind})${why}${after}`;
}

function excerpt(text: string): string {
	const flat = text.replace(/\s+/g, " ").trim();
	return flat.length <= MAX_EXCERPT ? flat : `${flat.slice(0, MAX_EXCERPT - 3)}...`;
}
