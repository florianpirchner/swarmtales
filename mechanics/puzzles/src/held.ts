/**
 * What a resident holds for others and what the deal says about hand-overs (old `heldPieces` of
 * packages/engine/src/world.ts, `isHandover` of whisperer.ts, `#openFragmentDoors`).
 */
import { ProgressionApi, type HeldPiece as Piece } from "@swarmtales/mechanic-shared";
import { dealView, definitionOf, lastLevelOf } from "./deal.ts";
import type { PuzzlesCtx } from "./head.ts";
import { carriesRun } from "./secrets.ts";

/** Runs of a fragment that make a DM a hand-over and not a whisper (old `HANDOVER_RUN`). */
const HANDOVER_RUN = 3;

/**
 * Every piece `agent` holds for others, by level. Fragments list their needers in team-member order,
 * certificates and counter-factors in holding order (the standoff relies on both).
 */
export function heldPieces(ctx: PuzzlesCtx, agent: string): readonly Piece[] {
	const pieces: Piece[] = [];
	const reached = (who: string, level: number): boolean => (ctx.tryCall(ProgressionApi, "levelOf", { resident: who }) ?? 0) >= level;
	for (const [level, state] of [...ctx.state.levels].sort(([a], [b]) => a - b)) {
		if (state.puzzle.kind === "fragments") {
			const fragment = state.puzzle.fragments.get(agent);
			const team = state.teams.find((candidate) => candidate.members.includes(agent));
			if (fragment === undefined || team === undefined || !reached(agent, level)) continue;
			const needers = team.members.filter((member) => member !== agent);
			if (needers.length > 0) pieces.push({ id: `L${level}-fragment`, kind: "fragment", level, label: `the fragment of door ${level}`, value: fragment, needers });
			continue;
		}
		const deal = dealView(ctx, level, state.puzzle.deal);
		const own = deal.holdings.find((holding) => holding.agent === agent);
		const certificate = own === undefined ? undefined : deal.teams[own.team];
		if (own !== undefined && certificate?.certificateHolder === agent) {
			const needers = deal.holdings.filter((holding) => holding.team === own.team && holding.agent !== agent).map((holding) => holding.agent);
			if (needers.length > 0 && (reached(agent, level) || needers.some((needer) => reached(needer, level)))) {
				pieces.push({ id: `L${level}-certificate`, kind: "certificate", level, label: `the team certificate of door ${level}`, value: certificate.certificate, needers });
			}
		}
		for (const holding of deal.holdings) {
			if (holding.counterHolder !== agent || holding.agent === agent || !(reached(agent, level) || reached(holding.agent, level))) continue;
			pieces.push({
				id: `L${level}-counter-${holding.agent}`,
				kind: "counter",
				level,
				label: `the counter-factor of ${holding.agent} for door ${level}`,
				value: holding.counterFactor,
				needers: [holding.agent],
			});
		}
	}
	return pieces;
}

/** Every fragments level whose door is open on the clock now, ascending. */
export function openFragmentDoors(ctx: PuzzlesCtx): readonly number[] {
	const doors: number[] = [];
	for (let level = ctx.options.startLevel; level <= lastLevelOf(ctx); level++) {
		if (ctx.state.levels.get(level)?.puzzle.kind === "fragments" && ctx.minute >= (definitionOf(ctx, level)?.opensAt ?? 0)) doors.push(level);
	}
	return doors;
}

/** Whether a text carries a fragment of any dealt level, or a run of `HANDOVER_RUN` of one: a hand-over, not a whisper. */
export function isHandover(ctx: PuzzlesCtx, text: string): boolean {
	const fragments = [...ctx.state.levels.values()].flatMap((state) => (state.puzzle.kind === "fragments" ? [...state.puzzle.fragments.values()] : []));
	return fragments.some((fragment) => fragment.length > 0 && carriesRun(text, fragment, Math.min(HANDOVER_RUN, fragment.length)));
}
