/**
 * Strict golden gates (wave 3.5, docs/design/carve-decisions.md D-12). The challengers found gates
 * that sort lines, strip fields, inject golden lines or skip whole paths (`getStatus` replies,
 * notice texts, turn inputs, the order across mechanics), so a broken mechanic still passed. These
 * helpers compare in log order, report every difference, and drop a line only through
 * `dropJustified`, which names why and fails when it drops nothing.
 *
 * - `goldenDiff`: every difference of two line lists (compareGolden reports the first).
 * - `goldenOrder`: the event types of several owners in log order (the order across mechanics).
 * - `goldenNotices` / `goldenTurnInputs`: the notice lines and the turn inputs of a log.
 * - `compareReplies`: every golden tool call against the replies of a replay, `getStatus` included.
 * - `dropJustified`: the one way to leave lines out.
 */
import { legacyOwner, type LegacyOwner } from "@swarmtales/chronicle";
import { goldenLine, type GoldenCall, type GoldenLine, type GoldenMismatch, type LegacyLine } from "./golden.ts";

function typeOf(line: LegacyLine): string {
	return typeof line.type === "string" ? line.type : "";
}

function text(value: unknown): string | undefined {
	return typeof value === "string" ? value : undefined;
}

/** Every index where two line lists differ, in order (a missing or extra line counts as one). */
export function goldenDiff(expected: readonly GoldenLine[], actual: readonly GoldenLine[]): readonly GoldenMismatch[] {
	const length = Math.max(expected.length, actual.length);
	const mismatches: GoldenMismatch[] = [];
	for (let index = 0; index < length; index++) {
		if (expected[index] !== actual[index]) mismatches.push({ index, expected: expected[index], actual: actual[index] });
	}
	return mismatches;
}

/**
 * The event types of the lines owned by `owners`, in log order, with the owner in front
 * (`seal:seal_expired`). Two logs whose owned lines agree but whose order across mechanics does not
 * differ here; a mechanic that writes a line with other fields by design still keeps its place.
 */
export function goldenOrder(lines: readonly LegacyLine[], owners: readonly LegacyOwner[]): readonly string[] {
	return lines.filter((line) => owners.includes(legacyOwner(typeOf(line)))).map((line) => `${legacyOwner(typeOf(line))}:${typeOf(line)}`);
}

/** Every `notice` line of a log as a golden line (recipient, author and text), in log order; `to` keeps one recipient's. */
export function goldenNotices(lines: readonly LegacyLine[], to?: string): readonly GoldenLine[] {
	return lines.filter((line) => typeOf(line) === "notice" && (to === undefined || line.to === to)).map(goldenLine);
}

/** One turn input of a golden log: what the old arena gave the resident, part by part. */
export interface GoldenTurnInput {
	readonly minute: number;
	readonly agent: string;
	readonly inputs: readonly string[];
}

/** The `turn_input` lines of a log, in log order. */
export function goldenTurnInputs(lines: readonly LegacyLine[]): readonly GoldenTurnInput[] {
	return lines
		.filter((line) => typeOf(line) === "turn_input")
		.map((line) => ({
			minute: typeof line.minute === "number" ? line.minute : 0,
			agent: text(line.agent) ?? "",
			inputs: Array.isArray(line.inputs) ? line.inputs.map((input: unknown) => text(input) ?? JSON.stringify(input)) : [],
		}));
}

/**
 * The part of a turn input that starts with `prefix` (`[status]`, `[unread]`, `Level `), or
 * undefined. The old arena wrote each kind once, so the first match is the part.
 */
export function inputPart(input: GoldenTurnInput, prefix: string): string | undefined {
	return input.inputs.find((part) => part.startsWith(prefix));
}

/** A reply a replay got, in call order. */
export interface Reply {
	readonly minute: number;
	readonly agent: string;
	readonly tool: string;
	readonly isError: boolean | undefined;
	readonly text: string | undefined;
}

/** Where a replay's replies differ from the golden calls: the call index and both sides. */
export interface ReplyMismatch {
	readonly index: number;
	readonly expected: GoldenCall | undefined;
	readonly actual: Reply | undefined;
}

/**
 * Every golden call whose reply differs from the replay's reply at the same index (minute, agent,
 * tool, error flag and text). Pass every call of `goldenCalls`: a gate that filters out tools
 * (`getStatus`, `activeTools`) must do it through `dropJustified`.
 */
export function compareReplies(expected: readonly GoldenCall[], actual: readonly Reply[]): readonly ReplyMismatch[] {
	const length = Math.max(expected.length, actual.length);
	const mismatches: ReplyMismatch[] = [];
	for (let index = 0; index < length; index++) {
		const want = expected[index];
		const got = actual[index];
		if (want === undefined || got === undefined) {
			mismatches.push({ index, expected: want, actual: got });
			continue;
		}
		const same =
			want.minute === got.minute &&
			want.agent === got.agent &&
			want.tool === got.tool &&
			want.isError === got.isError &&
			want.text === got.text;
		if (!same) mismatches.push({ index, expected: want, actual: got });
	}
	return mismatches;
}

/** Lines a gate leaves out, with the reason it gives. */
export interface Dropped<T> {
	readonly kept: readonly T[];
	readonly dropped: number;
}

/**
 * Leaves out the items `drop` matches, for the reason `why` (a step not carved yet, a request still
 * open). Throws when `why` is empty or nothing matched, so a stale exclusion fails the gate
 * instead of hiding a path for good.
 */
export function dropJustified<T>(items: readonly T[], drop: (item: T) => boolean, why: string): Dropped<T> {
	if (why.trim().length === 0) throw new Error("dropJustified: say why the lines are left out");
	const kept = items.filter((item) => !drop(item));
	const dropped = items.length - kept.length;
	if (dropped === 0) throw new Error(`dropJustified: nothing matched (${why}); remove the exclusion`);
	return { kept, dropped };
}
