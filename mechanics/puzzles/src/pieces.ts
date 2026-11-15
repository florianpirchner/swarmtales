// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * What other mechanics read of the secrets of the deal: the answers of the service `deal` (old `isPasswordPiece`,
 * `isHandover`), the secrets of every dealt level (old `secretsOfDeal`), and the secret check of a Director's note
 * (old `channels/src/secret-guard.ts`, moved to its owner).
 */
import type { Refusal } from "@swarmtales/contracts";
import { refuse, type StageCall } from "@swarmtales/sdk";
import { dealValues } from "./additive.ts";
import { lastLevelOf } from "./deal.ts";
import type { PuzzlesCtx, PuzzlesReader } from "./head.ts";
import { SecretGuard } from "./secret-guard.ts";
import { carriesRun } from "./secrets.ts";

/** Runs of a fragment that make a direct message a hand-over and not a whisper (old `HANDOVER_RUN`). */
const HANDOVER_RUN = 3;

/**
 * The passwords of the dealt fragment levels and the values of the dealt additive levels, level by level (old
 * `secretsOfDeal`, the inputs of the gamemaker's `#secretGuard`).
 *
 * @param reader - The context or view.
 * @returns The passwords and the all-digit values.
 */
export function secretsOfDeal(reader: PuzzlesReader): { passwords: string[]; numbers: string[] } {
	const passwords: string[] = [];
	const numbers: string[] = [];
	for (let level = reader.options.startLevel; level <= lastLevelOf(reader); level++) {
		const puzzle = reader.state.levels.get(level)?.puzzle;
		if (puzzle?.kind === "fragments") passwords.push(...puzzle.puzzles.map((item) => item.password));
		else if (puzzle !== undefined) numbers.push(...dealValues(puzzle.deal));
	}
	return { passwords, numbers };
}

// The fragments of every dealt fragment level.
function allFragments(reader: PuzzlesReader): readonly string[] {
	return [...reader.state.levels.values()].flatMap((state) => (state.puzzle.kind === "fragments" ? [...state.puzzle.fragments.values()] : []));
}

/**
 * Whether a token is part of a dealt password: it stays as written, even when it looks like an id.
 *
 * @param reader - The context or view.
 * @param token - The token.
 * @returns True for a part of a password.
 */
export function isPasswordPiece(reader: PuzzlesReader, token: string): boolean {
	return secretsOfDeal(reader).passwords.some((password) => password.includes(token));
}

/**
 * Whether a text carries a fragment of any dealt level, or a run of three characters of one: a hand-over, not a whisper.
 *
 * @param reader - The context or view.
 * @param text - The text.
 * @returns True for a hand-over.
 */
export function isHandover(reader: PuzzlesReader, text: string): boolean {
	return allFragments(reader).some((fragment) => fragment.length > 0 && carriesRun(text, fragment, Math.min(HANDOVER_RUN, fragment.length)));
}

/**
 * The secret check of a Director's note, on the note tools by bare name: a text that holds a piece of a dealt
 * password or of a dealt value is refused with the old words (old gamemaker `#secretGuard` over every dealt level).
 *
 * @param call - The call.
 * @param ctx - The context.
 * @returns `LEAK_BLOCKED`, or undefined.
 */
export function checkNote(call: StageCall, ctx: PuzzlesCtx): Refusal | undefined {
	if (!ctx.options.noteTools.includes(call.tool) || typeof call.params !== "object" || call.params === null) return undefined;
	// A tribunal's call and a perma-death carry their text in `reason` (erratum J134).
	const text = "text" in call.params ? call.params.text : "reason" in call.params ? call.params.reason : undefined;
	if (typeof text !== "string") return undefined;
	const { passwords, numbers } = secretsOfDeal(ctx);
	if (new SecretGuard(passwords, numbers).leaks(text.trim()).length === 0) return undefined;
	const words = ctx.prompt("puzzles/notes/leak-blocked", {});
	const split = words.indexOf(": ");
	return refuse(words.slice(0, split), words.slice(split + 2));
}
