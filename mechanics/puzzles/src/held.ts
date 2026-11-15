// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * What a resident holds for others, who still lacks a fragment, and what an exile does to the pieces. Ported from
 * the old platform (`heldPieces`, `lackingFragment`, and the pieces' part of the old exile's `onExiled`).
 */
import { dealView, inheritedFragments, lastLevelOf } from "./deal.ts";
import type { FactorDeal } from "./additive.ts";
import type { PuzzlesCtx, PuzzlesReader } from "./head.ts";
import { hasPassed, levelOf } from "./standing.ts";

/** A piece a resident holds that others need. */
export interface HeldPiece {
	/** The id of the piece: `L<level>-fragment`, `L<level>-certificate` or `L<level>-counter-<needer>`. */
	readonly id: string;
	/** The kind of piece. */
	readonly kind: "fragment" | "certificate" | "counter";
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
	/** Who a strike that keeps took, when the caller reads it from `exile` before the listener of `exiled` ran. */
	readonly struck?: readonly string[];
	/** Teammates out of the city but not banished (at the gate): they lack nothing. */
	readonly away?: readonly string[];
}

// The certificate and the counter-factors `agent` holds on an additive level, once it or a needer reached it.
function additivePieces(reader: PuzzlesReader, agent: string, level: number, deal: FactorDeal): readonly HeldPiece[] {
	const reached = (who: string): boolean => levelOf(reader, who) >= level;
	const counters = deal.holdings.filter((holding) => holding.counterHolder === agent && holding.agent !== agent && (reached(agent) || reached(holding.agent)));
	return [
		...certificatePiece(deal, agent, level, reached),
		...counters.map((holding): HeldPiece => ({ id: `L${String(level)}-counter-${holding.agent}`, kind: "counter", level, label: `the counter-factor of ${holding.agent} for door ${String(level)}`, value: holding.counterFactor, needers: [holding.agent] })),
	];
}

// The team certificate `agent` holds, once it or a needer reached the level.
function certificatePiece(deal: FactorDeal, agent: string, level: number, reached: (who: string) => boolean): readonly HeldPiece[] {
	const own = deal.holdings.find((holding) => holding.agent === agent);
	const certificate = own === undefined ? undefined : deal.teams[own.team];
	if (own === undefined || certificate?.certificateHolder !== agent) return [];
	const needers = deal.holdings.filter((holding) => holding.team === own.team && holding.agent !== agent).map((holding) => holding.agent);
	if (needers.length === 0 || !(reached(agent) || needers.some(reached))) return [];
	return [{ id: `L${String(level)}-certificate`, kind: "certificate", level, label: `the team certificate of door ${String(level)}`, value: certificate.certificate, needers }];
}

/**
 * Every piece `agent` holds for others, by level: its fragment of each fragment level it has reached, and the
 * certificate and counter-factors of an additive level (needers in holding order; the standoff relies on both).
 *
 * @param reader - The context or view.
 * @param agent - The resident.
 * @returns The pieces, ascending by level.
 */
export function heldPieces(reader: PuzzlesReader, agent: string): readonly HeldPiece[] {
	const pieces: HeldPiece[] = [];
	for (const [level, state] of [...reader.state.levels].sort(([a], [b]) => a - b)) {
		if (state.puzzle.kind === "additive") {
			pieces.push(...additivePieces(reader, agent, level, dealView(reader, level, state.puzzle.deal)));
			continue;
		}
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
	if (inheritedFragments(reader, level, agent, city.struck).some(([from]) => from === holder)) return true;
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
	const fragment = state?.puzzle.kind === "fragments" ? state.puzzle.fragments.get(holder) : undefined;
	const team = state?.teams.find((candidate) => candidate.members.includes(holder));
	if (fragment === undefined || team === undefined || city.exiled.includes(holder) || levelOf(reader, holder) < level) return [];
	return team.members
		.filter((member) => member !== holder && !city.exiled.includes(member) && city.away?.includes(member) !== true)
		.filter((member) => levelOf(reader, member) === level && !hasPassed(reader, member, level))
		.filter((member) => !holdsFragment(reader, city, member, level, holder, fragment))
		.sort((a, b) => a.localeCompare(b));
}

/**
 * What an exile does to the pieces: every fragment the banished resident held for a teammate who has not passed
 * its level and did not bequeath burns (`factor_burned`; a certificate or a counter-factor is the standoff's to keep), and on every level no remaining resident has reached, the banished are out
 * of their teams (`level_contracted`).
 *
 * @param ctx - The context.
 * @param agent - The banished resident.
 * @param gone - Every banished resident, `agent` included.
 * @param bequeathed - The pieces its will left to heirs.
 */
export function onExiled(ctx: PuzzlesCtx, agent: string, gone: readonly string[], bequeathed: readonly string[]): void {
	const alive = ctx.residents.ids.filter((id) => !gone.includes(id));
	const unreached = (level: number): boolean => !alive.some((id) => levelOf(ctx, id) >= level);
	for (const piece of heldPieces(ctx, agent)) {
		if (piece.kind !== "fragment" || bequeathed.includes(piece.id) || unreached(piece.level)) continue;
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
