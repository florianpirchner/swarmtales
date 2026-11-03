/**
 * The puzzles' part of the gamemaker's report (step 18, item 2): who each resident in the city
 * depends on at its current level (old `dependenciesOf`, packages/roles/src/gamemaker/situation.ts)
 * for "Who waits on whom", and the secrets of the dealt levels for the report's guard (old
 * `secretGuardOf`, look.ts). Facts, computed live; the app's report renders them.
 */
import { Type, type Static } from "typebox";
import { Parse } from "typebox/value";
import { ExileApi, ProgressionApi } from "@swarmtales/mechanic-shared";
import { dealView, lastLevelOf, solutionOf } from "./deal.ts";
import type { PuzzlesView } from "./head.ts";

const Id = Type.String();
const Int = Type.Integer();

export const NeedsFact = Type.Array(
	Type.Object({
		agent: Id,
		level: Int,
		/** Whether the story deals the level as fragments (a level whose task names no teammate then hides its team). */
		fragments: Type.Boolean(),
		/** Every teammate on a fragments level, the certificate and counter-factor holders on an additive one. */
		on: Type.Array(Id),
	}),
);

export type Needs = Static<typeof NeedsFact>;

export const SecretsFact = Type.Object({ passwords: Type.Array(Type.String()), numbers: Type.Array(Type.String()) });

/**
 * Each resident's code and own fragment on every dealt level (old `world.inspect.codeOf` and
 * `fragmentOf`): what the scripted provider's oracle (`--provider scripted`) and white-box tests
 * read. Like `secrets` it is never shown to a model (R2-4).
 */
export const SolutionsFact = Type.Array(Type.Object({ level: Int, agent: Id, code: Type.Union([Type.String(), Type.Null()]), fragment: Type.Union([Type.String(), Type.Null()]) }));

export type Solutions = Static<typeof SolutionsFact>;

/** The solutions of every dealt level, level by level, residents in roster order. */
export function solutionsOf(view: PuzzlesView): Solutions {
	return [...view.state.levels.keys()]
		.sort((a, b) => a - b)
		.flatMap((level) => {
			const puzzle = view.state.levels.get(level)?.puzzle;
			return view.residents.ids.map((agent) => ({
				level,
				agent,
				code: solutionOf(view, level, agent),
				fragment: puzzle?.kind === "fragments" ? (puzzle.fragments.get(agent) ?? null) : null,
			}));
		});
}

/** The solutions from an untrusted fact value. */
export function solutionsFrom(value: unknown): Solutions {
	return Parse(SolutionsFact, value);
}

/** Who must reach `level` before `agent` can open it (old `dependenciesOf`). */
function dependenciesOf(view: PuzzlesView, level: number, agent: string): readonly string[] {
	const puzzle = view.state.levels.get(level)?.puzzle;
	if (puzzle?.kind !== "additive") return view.state.planner.teamOf(level, agent).members.filter((member) => member !== agent);
	const deal = dealView(view, level, puzzle.deal);
	const own = deal.holdings.find((holding) => holding.agent === agent);
	const certificate = own === undefined ? undefined : deal.teams[own.team]?.certificateHolder;
	return [...new Set([certificate, own?.counterHolder])].filter((member): member is string => member !== undefined && member !== agent).sort();
}

/** The dependencies of every resident in the city on its current played level. */
export function needsOf(view: PuzzlesView): Needs {
	const alive = view.tryCall(ExileApi, "alive", {}) ?? view.residents.ids;
	const last = lastLevelOf(view);
	return alive.flatMap((agent) => {
		const level = view.tryCall(ProgressionApi, "levelOf", { resident: agent });
		if (level === undefined || level > last) return [];
		const definition = view.options.levels.find((entry) => entry.number === level);
		if (definition === undefined) return [];
		return [{ agent, level, fragments: definition.puzzle.kind === "fragments", on: [...dependenciesOf(view, level, agent)] }];
	});
}

/** The dependencies from an untrusted fact value (the host's `facts()`). */
export function needsFrom(value: unknown): Needs {
	return Parse(NeedsFact, value);
}

/** The secrets from an untrusted fact value. */
export function secretsFrom(value: unknown): Static<typeof SecretsFact> {
	return Parse(SecretsFact, value);
}
