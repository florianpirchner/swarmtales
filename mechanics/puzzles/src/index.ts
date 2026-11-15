// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The `puzzles` mechanic: the pieces of the levels. The levels up to the door of `holdAfter` are dealt when the run
 * starts (teams, a password per team and a fragment per resident, or the factors of an additive level), the later
 * ones when `progression` opens the door; `progression` reads the codes and tasks through `level-pieces`, and
 * `puzzles` reads where a resident stands from the events of `progression`. When a resident is banished the
 * fragments it did not bequeath burn and the levels nobody has reached contract; a strike that keeps (the holdout
 * tribunal) burns nothing and gives its fragments to every teammate left. A Director's note that holds a piece of a
 * secret is refused (`LEAK_BLOCKED`), and so is a will that leaves a piece the resident does not hold
 * (`UNKNOWN_FACTOR`); the hand-over guard reviews the guarded tools (`GUARD_BLOCKED`).
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { defineMechanic } from "@swarmtales/sdk";
import { ChannelsEvents, ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { clearsAway, ExileEvents, ExileService } from "@swarmtales/mechanic-exile/contract";
import { ProgressionEvents } from "@swarmtales/mechanic-progression/contract";
import { dealLevel, openingLevels } from "./deal.ts";
import { askGuard, carriesGuardedFragment, decideGuard } from "./guard.ts";
import { puzzlesHead } from "./head.ts";
import { heldPieces, lackingFragment, onExiled } from "./held.ts";
import { holdoutInherited, holdoutLacking, openFragmentDoors } from "./holdout.ts";
import { checkNote, isHandover, isPasswordPiece, secretsOfDeal } from "./pieces.ts";
import { NeedsFact, needsOf, SecretsFact, SolutionsFact, solutionsOf } from "./report.ts";
import { revealFactor } from "./reveal.ts";
import { onLevelEntered, onLevelUp } from "./standing.ts";
import { holdersOf, solutionOf, taskValues } from "./text.ts";

export { PuzzlesService } from "./contract.ts";
export { cityFactorOf, contractDeal, dealFactors, dealValues, FactorDealError, type FactorDeal, type FactorHolding, type FactorTopology, type TeamCertificate } from "./additive.ts";
export { assembleAll, validatePuzzle, type FragmentPuzzle } from "./fragments.ts";
export { puzzlesHead, type PuzzlesCtx } from "./head.ts";
export { PUZZLES_PROMPTS, PuzzlesEvents, PuzzlesOptions, type LevelPuzzle, type LevelState, type PuzzlesState } from "./model.ts";
export { carriesRun, codeForms, sharedRuns } from "./secrets.ts";
export { TeamLayoutError, TeamPlanner, type PlannedLevel, type Streams, type Team, type TeamLayout } from "./teams.ts";

const Level = Type.Integer({ description: "A level number" });
const Residents = (description: string) => Type.Array(Type.String({ description: "A resident id" }), { description });

/**
 * The puzzles: fragment levels dealt at the start of the run, the pieces `progression` reads, and what an exile leaves of them.
 *
 * @example
 * ```ts
 * const levels = [{ number: 1, team: { kind: "random", size: 2 }, puzzle: { kind: "fragments", length: [6, 10], overlap: 2 } }] as const;
 * const game = defineGame({ id: "city", residents: 6, mechanics: [ledger(), exile(), puzzles({ levels: [...levels] })], end: { ticks: 12 } });
 * ```
 *
 * @public
 */
export const puzzles = defineMechanic(puzzlesHead, {
	hooks: {
		runStarted: (ctx) => {
			for (const level of openingLevels(ctx)) dealLevel(ctx, level);
		},
	},
	services: {
		"level-pieces": {
			// Asked for every level after an opening door; a dealt level is left as it is (erratum J34).
			deal: ({ level }, ctx) => (dealLevel(ctx, level), null),
			solutionOf: ({ resident, level }, ctx) => solutionOf(ctx, level, resident),
			kindOf: ({ level }, ctx) => ctx.state.levels.get(level)?.puzzle.kind ?? "none",
			teamOf: ({ resident, level }, ctx) => {
				const team = ctx.state.planner.teamOf(level, resident);
				return { members: [...team.members], leader: team.leader };
			},
			taskValues: ({ resident, level }, ctx) => taskValues(ctx, resident, level),
			holders: ({ resident, level }, ctx) => holdersOf(ctx, resident, level, ctx.tryCall(ExileService, "exiled", {}) ?? []).map((entry) => ({ ...entry })),
		},
		deal: {
			passwordPiece: ({ token }, ctx) => isPasswordPiece(ctx, token),
			carriesSecret: ({ text, minRun }, ctx) => carriesGuardedFragment(ctx, text, minRun),
			isHandover: ({ text }, ctx) => isHandover(ctx, text),
			revealFactor: ({ level, target }, ctx) => revealFactor(ctx, level, target),
		},
		// Every piece, also of a resident banished while the listeners of `exiled` run (the standoff keeps them then).
		"held-pieces": { held: ({ resident }, ctx) => heldPieces(ctx, resident).map((piece) => ({ ...piece, needers: [...piece.needers] })) },
		// Asked by the holdout tribunal right after its strike, before the listeners of `exiled` run (erratum J168).
		"holdout-pieces": {
			openFragmentDoors: (_input, ctx) => openFragmentDoors(ctx),
			lacking: ({ level, holder }, ctx) => holdoutLacking(ctx, level, holder),
			inherited: ({ resident, level }, ctx) => holdoutInherited(ctx, resident, level),
		},
	},
	pipeline: {
		rule: checkNote,
		review: { answerer: "guard", ask: askGuard, decide: decideGuard },
	},
	listeners: (kit) => [
		// After the ledger, so the points burn before the pieces whatever the game's order of mechanics is.
		kit.listen(
			ExileEvents,
			"exiled",
			(payload, ctx) => {
				// The struck of a strike that keeps are gone too (old `isGone`), though `exiled` leaves them out.
				const bequeathed = ctx.tryCall(ExileService, "bequeathed", { resident: payload.agent }) ?? [];
				if (clearsAway(payload)) onExiled(ctx, payload.agent, [...(ctx.tryCall(ExileService, "exiled", {}) ?? [payload.agent]), ...ctx.state.struck], bequeathed);
				else if (!ctx.state.struck.includes(payload.agent)) ctx.state.struck.push(payload.agent);
			},
			{ after: ["ledger"] },
		),
		kit.listen(ProgressionEvents, "level_up", ({ agent, from }, ctx) => {
			onLevelUp(ctx, agent, from);
		}),
		kit.listen(ProgressionEvents, "level_entered", ({ agent, level }, ctx) => {
			onLevelEntered(ctx, agent, level);
		}),
		kit.listen(ChannelsEvents, "dm_delivered", ({ number }, ctx) => {
			ctx.state.delivered.add(number);
		}),
	],
	facts: {
		needs: { output: NeedsFact, compute: (view) => needsOf(view, view.tryCall(ExileService, "alive", {}) ?? view.residents.ids) },
		secrets: { output: SecretsFact, compute: (view) => secretsOfDeal(view) },
		solutions: { output: SolutionsFact, compute: (view) => solutionsOf(view, view.residents.ids) },
		dealt: { output: Type.Array(Level, { description: "The dealt levels, ascending" }), compute: (view) => [...view.state.levels.keys()].sort((a, b) => a - b) },
		exclusions: {
			output: Type.Array(Type.Object({ level: Level, excluded: Residents("The banished who are out of their teams") }, { description: "One level" }), { description: "The contracted levels" }),
			compute: (view) => [...view.state.exclusions].map(([level, excluded]) => ({ level, excluded: [...excluded] })),
		},
		lacking: {
			output: Type.Array(Type.Object({ level: Level, holder: Type.String({ description: "The resident who holds the fragment" }), lacking: Residents("The teammates before the door without a copy of it") }, { description: "One fragment that is still owed" }), {
				description: "Who waits on whose fragment: per dealt level and holder, the teammates before that door who hold no copy",
			}),
			compute: (view) => {
				// The struck of a strike that keeps are gone too, though `exiled` leaves them out (old `isExiled`).
				const city = { exiled: [...(view.tryCall(ExileService, "exiled", {}) ?? []), ...view.state.struck], dms: view.tryCall(ChannelsService, "dmRecords", {}) ?? [] };
				const levels = [...view.state.levels.keys()].sort((a, b) => a - b);
				return levels.flatMap((level) => view.residents.ids.map((holder) => ({ level, holder, lacking: [...lackingFragment(view, city, level, holder)] })).filter((entry) => entry.lacking.length > 0));
			},
		},
	},
});
