// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * What a resident holds for others, who still lacks a fragment, and what an exile does to the pieces. Ported from
 * the old platform (`heldPieces`, `lackingFragment`, and the pieces' part of the old exile's `onExiled`).
 */
import { inheritedFragments, lastLevelOf } from "./deal.ts";
import type { PuzzlesCtx, PuzzlesReader } from "./head.ts";

/** A piece a resident holds that others need. */
interface HeldPiece {
	/** The id of the piece, `L<level>-fragment`. */
	readonly id: string;
	/** The kind of piece. */
	readonly kind: "fragment";
	/** Its level. */
	readonly level: number;
	/** How a text names it. */
	readonly label: string;
	/** The piece itself. */
	readonly value: string;
	/** The teammates it is held for, in team-member order. */
	readonly needers: readonly string[];
}

/** What the city knows beyond the deal: who is banished, and the direct messages sent so far. */
export interface City {
	/** The banished residents. */
	readonly exiled: readonly string[];
	/** Every direct message. */
	readonly dms: readonly { readonly to: string; readonly text: string }[];
}

/**
 * The level a resident stands on (the option `standings`).
 *
 * @param reader - The context or view.
 * @param resident - The resident.
 * @returns Its level; `startLevel` when the option does not name it.
 */
function levelOf(reader: PuzzlesReader, resident: string): number {
	return reader.options.standings?.[resident]?.level ?? reader.options.startLevel;
}

function hasPassed(reader: PuzzlesReader, resident: string, level: number): boolean {
	return reader.options.standings?.[resident]?.passed?.includes(level) === true;
}

/**
 * Every piece `agent` holds for others, by level: its fragment of each level it has reached.
 *
 * @param reader - The context or view.
 * @param agent - The resident.
 * @returns The pieces, ascending by level.
 */
function heldPieces(reader: PuzzlesReader, agent: string): readonly HeldPiece[] {
	const pieces: HeldPiece[] = [];
	for (const [level, state] of [...reader.state.levels].sort(([a], [b]) => a - b)) {
		const fragment = state.puzzle.fragments.get(agent);
		const team = state.teams.find((candidate) => candidate.members.includes(agent));
		if (fragment === undefined || team === undefined || levelOf(reader, agent) < level) continue;
		const needers = team.members.filter((member) => member !== agent);
		if (needers.length > 0) pieces.push({ id: `L${String(level)}-fragment`, kind: "fragment", level, label: `the fragment of door ${String(level)}`, value: fragment, needers });
	}
	return pieces;
}

// Whether `agent` holds `holder`'s fragment of `level`: inherited, or carried by the direct messages to it.
function holdsFragment(reader: PuzzlesReader, city: City, agent: string, level: number, holder: string, fragment: string): boolean {
	if (inheritedFragments(reader, level, agent).some(([from]) => from === holder)) return true;
	const plain = (text: string): string => text.toUpperCase().replace(/[^A-Z0-9]/g, "");
	const received = city.dms.flatMap((record) => (record.to === agent ? [plain(record.text)] : [])).join("");
	return received.includes(plain(fragment));
}

/**
 * Residents in the city who stand before door `level` in `holder`'s team and hold no copy of `holder`'s fragment of it.
 *
 * @param reader - The context or view.
 * @param city - Who is banished, and the direct messages.
 * @param level - The level.
 * @param holder - The resident whose fragment is asked about.
 * @returns The residents, sorted; none when the holder is banished or has not reached the level.
 */
export function lackingFragment(reader: PuzzlesReader, city: City, level: number, holder: string): readonly string[] {
	const state = reader.state.levels.get(level);
	const fragment = state?.puzzle.fragments.get(holder);
	const team = state?.teams.find((candidate) => candidate.members.includes(holder));
	if (fragment === undefined || team === undefined || city.exiled.includes(holder) || levelOf(reader, holder) < level) return [];
	return team.members
		.filter((member) => member !== holder && !city.exiled.includes(member))
		.filter((member) => levelOf(reader, member) === level && !hasPassed(reader, member, level))
		.filter((member) => !holdsFragment(reader, city, member, level, holder, fragment))
		.sort((a, b) => a.localeCompare(b));
}

/**
 * What an exile does to the pieces: every fragment the banished resident held for a teammate who has not passed
 * its level burns (`factor_burned`), and on every level no remaining resident has reached, the banished are out
 * of their teams (`level_contracted`).
 *
 * @param ctx - The context.
 * @param agent - The banished resident.
 * @param gone - Every banished resident, `agent` included.
 */
export function onExiled(ctx: PuzzlesCtx, agent: string, gone: readonly string[]): void {
	const alive = ctx.residents.ids.filter((id) => !gone.includes(id));
	const unreached = (level: number): boolean => !alive.some((id) => levelOf(ctx, id) >= level);
	for (const piece of heldPieces(ctx, agent)) {
		if (unreached(piece.level)) continue;
		const needers = piece.needers.filter((id) => !gone.includes(id) && !hasPassed(ctx, id, piece.level));
		if (needers.length > 0) ctx.emit("factor_burned", { agent, level: piece.level, piece: piece.id, needers });
	}
	const excluded = ctx.residents.ids.filter((id) => gone.includes(id));
	for (let level = ctx.options.startLevel; level <= lastLevelOf(ctx); level++) {
		if (!unreached(level)) continue;
		ctx.state.exclusions.set(level, new Set(excluded));
		ctx.emit("level_contracted", { level, excluded });
	}
}
