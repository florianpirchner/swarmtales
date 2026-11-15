// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * What other mechanics read of the deal: the pieces of a level for `progression` (`level-pieces`, old `solutionOf`,
 * `teamOf`, `kindOf`, `taskValues`, `holders`), the answers of the service `deal` (old `isPasswordPiece`,
 * `isHandover`), and the secret check of a Director's note (old `channels/src/secret-guard.ts`, moved to its owner).
 */
import type { Refusal } from "@swarmtales/contracts";
import { refuse, type StageCall } from "@swarmtales/sdk";
import { inheritedFragments } from "./deal.ts";
import type { PuzzlesCtx, PuzzlesReader } from "./head.ts";
import { SecretGuard } from "./secret-guard.ts";
import { carriesRun } from "./secrets.ts";

/** Runs of a fragment that make a direct message a hand-over and not a whisper (old `HANDOVER_RUN`). */
const HANDOVER_RUN = 3;

/** The task placeholders a puzzle fills (old `TaskValues`). */
interface TaskValues {
	readonly length: string;
	readonly overlap: string;
	readonly fragment: string;
	readonly digits: string;
	readonly factors: string;
}

const NONE: TaskValues = { length: "", overlap: "", fragment: "", digits: "", factors: "" };

// The puzzle of the resident's team on a dealt level.
function teamPuzzle(reader: PuzzlesReader, level: number, agent: string): { readonly password: string; readonly overlap: number } | undefined {
	const state = reader.state.levels.get(level);
	const index = state?.teams.findIndex((team) => team.members.includes(agent)) ?? -1;
	return state?.puzzle.puzzles[index];
}

/**
 * The code that passes the level for the resident: its team's password.
 *
 * @param reader - The context or view.
 * @param level - The level.
 * @param agent - The resident.
 * @returns The password; null on a level not dealt or without the resident.
 */
export function solutionOf(reader: PuzzlesReader, level: number, agent: string): string | null {
	return teamPuzzle(reader, level, agent)?.password ?? null;
}

/**
 * The task placeholders of a fragment level: the length, the overlap, and the fragment with those held for the exiled.
 *
 * @param reader - The context or view.
 * @param agent - The resident.
 * @param level - The level.
 * @returns The values; empty strings on a level not dealt.
 */
export function taskValues(reader: PuzzlesReader, agent: string, level: number): TaskValues {
	const team = teamPuzzle(reader, level, agent);
	if (team === undefined) return NONE;
	const inherited = inheritedFragments(reader, level, agent).map(([from, fragment]) => `; you also hold the fragment of ${from}, who was exiled: ${fragment}`);
	const own = reader.state.levels.get(level)?.puzzle.fragments.get(agent) ?? "";
	return { length: String(team.password.length), overlap: String(team.overlap), fragment: `${own}${inherited.join("")}`, digits: "", factors: "" };
}

/**
 * Whether a token is part of a dealt password: it stays as written, even when it looks like an id.
 *
 * @param reader - The context or view.
 * @param token - The token.
 * @returns True for a part of a password.
 */
export function isPasswordPiece(reader: PuzzlesReader, token: string): boolean {
	return [...reader.state.levels.values()].some((state) => state.puzzle.puzzles.some((puzzle) => puzzle.password.includes(token)));
}

/**
 * Whether a text carries a fragment of any dealt level, or a run of three characters of one: a hand-over, not a whisper.
 *
 * @param reader - The context or view.
 * @param text - The text.
 * @returns True for a hand-over.
 */
export function isHandover(reader: PuzzlesReader, text: string): boolean {
	const fragments = [...reader.state.levels.values()].flatMap((state) => [...state.puzzle.fragments.values()]);
	return fragments.some((fragment) => fragment.length > 0 && carriesRun(text, fragment, Math.min(HANDOVER_RUN, fragment.length)));
}

/**
 * The secret check of a Director's note, a `rule` handler on the note tools by bare name: a text that holds a piece
 * of a dealt password is refused with the old words (old gamemaker `#secretGuard` over every dealt level).
 *
 * @param call - The call.
 * @param ctx - The context.
 * @returns `LEAK_BLOCKED`, or undefined.
 */
export function checkNote(call: StageCall, ctx: PuzzlesCtx): Refusal | undefined {
	if (!ctx.options.noteTools.includes(call.tool) || typeof call.params !== "object" || call.params === null || !("text" in call.params)) return undefined;
	const text = call.params.text;
	if (typeof text !== "string") return undefined;
	const passwords = [...ctx.state.levels.values()].flatMap((state) => state.puzzle.puzzles.map((puzzle) => puzzle.password));
	if (new SecretGuard(passwords).leaks(text.trim()).length === 0) return undefined;
	const words = ctx.prompt("puzzles/notes/leak-blocked", {});
	const split = words.indexOf(": ");
	return refuse(words.slice(0, split), words.slice(split + 2));
}
