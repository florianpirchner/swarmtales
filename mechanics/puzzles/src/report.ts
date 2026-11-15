// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The puzzles' facts for the gamemaker's report and the scripted oracle (old `report.ts`): who each resident in the
 * city depends on at its level (`needs`, old `dependenciesOf`), the secrets of the dealt levels (`secrets`) and each
 * resident's code and fragment (`solutions`). Never shown to a resident.
 */
import { Type } from "typebox";
import { dealView, lastLevelOf } from "./deal.ts";
import type { PuzzlesReader } from "./head.ts";
import { levelOf } from "./standing.ts";
import { solutionOf } from "./text.ts";

const Id = Type.String({ description: "A resident id" });
const Level = Type.Integer({ description: "A level number" });
const OrNull = (description: string) => Type.Union([Type.String({ description }), Type.Null({ description: "None" })], { description });

/** The fact `needs`: each resident's dependencies on its level. */
export const NeedsFact = Type.Array(
	Type.Object(
		{
			agent: Id,
			level: Level,
			fragments: Type.Boolean({ description: "Whether the game deals the level as fragments" }),
			on: Type.Array(Id, { description: "Every teammate on a fragment level, the certificate and counter-factor holders on an additive one" }),
		},
		{ description: "Who one resident waits on" },
	),
	{ description: "Who waits on whom, residents in the city in roster order" },
);

/** The fact `secrets`: the passwords and the all-digit values of the dealt levels. */
export const SecretsFact = Type.Object(
	{ passwords: Type.Array(Type.String({ description: "A password" }), { description: "The passwords" }), numbers: Type.Array(Type.String({ description: "A value" }), { description: "The factors, salts and codes" }) },
	{ description: "The secrets of the deal" },
);

/** The fact `solutions`: each resident's code and own fragment on every dealt level. */
export const SolutionsFact = Type.Array(Type.Object({ level: Level, agent: Id, code: OrNull("The code"), fragment: OrNull("The own fragment") }, { description: "One resident on one level" }), {
	description: "The solutions, level by level, residents in roster order",
});

// Who must reach `level` before `agent` can open it (old `dependenciesOf`).
function dependenciesOf(reader: PuzzlesReader, level: number, agent: string): readonly string[] {
	const puzzle = reader.state.levels.get(level)?.puzzle;
	if (puzzle?.kind !== "additive") return reader.state.planner.teamOf(level, agent).members.filter((member) => member !== agent);
	const deal = dealView(reader, level, puzzle.deal);
	const own = deal.holdings.find((holding) => holding.agent === agent);
	const certificate = own === undefined ? undefined : deal.teams[own.team]?.certificateHolder;
	return [...new Set([certificate, own?.counterHolder])].filter((member): member is string => member !== undefined && member !== agent).sort();
}

/**
 * The dependencies of every resident in the city on its level.
 *
 * @param reader - The view.
 * @param alive - The residents in the city.
 * @returns One entry per resident on a played level.
 */
export function needsOf(reader: PuzzlesReader, alive: readonly string[]): { agent: string; level: number; fragments: boolean; on: string[] }[] {
	return alive.flatMap((agent) => {
		const level = levelOf(reader, agent);
		const definition = reader.options.levels.find((entry) => entry.number === level);
		if (level > lastLevelOf(reader) || definition === undefined) return [];
		return [{ agent, level, fragments: definition.puzzle.kind === "fragments", on: [...dependenciesOf(reader, level, agent)] }];
	});
}

/**
 * The solutions of every dealt level, level by level, residents in roster order.
 *
 * @param reader - The view.
 * @param residents - The residents.
 * @returns The code and the own fragment of each.
 */
export function solutionsOf(reader: PuzzlesReader, residents: readonly string[]): { level: number; agent: string; code: string | null; fragment: string | null }[] {
	return [...reader.state.levels.keys()]
		.sort((a, b) => a - b)
		.flatMap((level) => {
			const puzzle = reader.state.levels.get(level)?.puzzle;
			return residents.map((agent) => ({ level, agent, code: solutionOf(reader, level, agent), fragment: puzzle?.kind === "fragments" ? (puzzle.fragments.get(agent) ?? null) : null }));
		});
}
