// SPDX-License-Identifier: Apache-2.0
/** The check that a resumed run continues the run it resumed from. */
import { canonicalJson } from "./canonical.ts";
import { fieldOf, linesOf, parseJson } from "./hashes.ts";
import type { ChainBroken, ChainCheckpoint, ChainHolds, ChainVerdict } from "./schemas.ts";
import { type ChainTexts, verifyChainText } from "./verify.ts";

/** Options of {@link verifyContinuityText}. @public */
export interface ContinuityTextOptions {
	/**
	 * Maps a parsed line before the prefix comparison, e.g. an old event type to its current name.
	 * Default: the line as it is.
	 */
	readonly normalize?: (value: unknown) => unknown;
}

// A line without its wall-clock stamp, which a resumed run writes anew for its prefix.
function withoutStamp(value: unknown): unknown {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return value;
	return Object.fromEntries(Object.entries(value).filter(([key]) => key !== "at"));
}

// Why the checkpoint a resumed run names is not one the previous run signed.
function anchorFault(before: ChainHolds, anchor: ChainCheckpoint): ChainBroken | undefined {
	if (anchor.publicKey !== before.genesis.publicKey || anchor.genesis !== before.genesisHash) return { ok: false, kind: "continuity", reason: "the snapshot checkpoint belongs to another chain than the previous run's" };
	if (!before.heads.some((entry) => entry.lines === anchor.lines && entry.hash === anchor.hash && entry.state === anchor.state)) {
		return { ok: false, kind: "continuity", reason: `the previous run signed no head over line ${String(anchor.lines)} with the checkpoint's hash${anchor.state === undefined ? "" : " and snapshot state"}` };
	}
	return undefined;
}

// Why the resumed log does not repeat the previous log up to the checkpoint and then mark the resume.
function prefixFault(previous: string, resumed: string, lines: number, normalize: (value: unknown) => unknown): ChainBroken | undefined {
	const comparable = (text: string): string | undefined => {
		const parsed = parseJson(text);
		return parsed.ok ? canonicalJson(withoutStamp(normalize(parsed.value))) : undefined;
	};
	const old = linesOf(previous);
	const now = linesOf(resumed);
	for (let index = 0; index < lines; index += 1) {
		const left = comparable(old[index] ?? "");
		if (left === undefined || left !== comparable(now[index] ?? "")) return { ok: false, kind: "continuity", line: index + 1, reason: "the resumed run's prefix differs from the previous run's line" };
	}
	const marker = parseJson(now[lines] ?? "");
	if (!marker.ok || fieldOf(marker.value, "type") !== "run_resumed") {
		return { ok: false, kind: "continuity", line: lines + 1, reason: "the line after the resumed prefix is not the run_resumed marker (a line between the checkpoint and the resume is not the previous run's)" };
	}
	return undefined;
}

/**
 * Checks that a resumed run continues a previous one: both chains hold, the resumed genesis chains
 * from a head the previous run signed (with the same snapshot state, when the checkpoint names one),
 * the resumed log's prefix repeats the previous log's lines up to that head (all but their
 * wall-clock stamps), and the line right after the prefix is the resume's `run_resumed`, so nothing
 * stands between them.
 *
 * @param previous - The texts of the run that took the snapshot.
 * @param resumed - The texts of the run that resumed from it.
 * @param options - How lines are compared.
 * @returns The resumed run's verdict when it continues the previous run, else the fault.
 * @public
 */
export function verifyContinuityText(previous: ChainTexts, resumed: ChainTexts, options: ContinuityTextOptions = {}): ChainVerdict {
	const before = verifyChainText(previous.events, previous.chain, previous.publicKey);
	if (!before.ok) return { ok: false, kind: "continuity", reason: `the previous run's chain does not hold: ${before.line === undefined ? "" : `line ${String(before.line)}: `}${before.reason}` };
	const after = verifyChainText(resumed.events, resumed.chain, resumed.publicKey);
	if (!after.ok) return after;
	const anchor = after.genesis.resumedFrom?.checkpoint;
	if (anchor === undefined) return { ok: false, kind: "continuity", reason: "the run does not chain from a snapshot checkpoint" };
	const fault = anchorFault(before, anchor) ?? prefixFault(previous.events, resumed.events, anchor.lines, options.normalize ?? ((value: unknown) => value));
	return fault ?? after;
}
