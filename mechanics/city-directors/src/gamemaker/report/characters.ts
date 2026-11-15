// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Who the residents are, carried from old `apps/cli/src/host/report.ts` (`characterLines`) with the figure's
 * direction of old `apps/cli/src/host/direction.ts` (`directFigure`): core motive and secret goal from the facts
 * `motives.lines` and `goals.texts`, and from direction 8 the figure's material, the figure of each resident from
 * `motives.coreMotives` and its direction from the gamemaker's options.
 */
import { Type, type Static } from "typebox";
import type { DirectionLevel } from "../spec.ts";

/**
 * A text per resident: the value of the facts `motives.lines` and `goals.texts`.
 *
 * @public
 */
export const LinesSchema = Type.Record(Type.String({ description: "A resident id" }), Type.String({ description: "Its text" }), { description: "A text per resident" });

/**
 * The figure each resident plays: the value of the fact `motives.coreMotives` (the field read here).
 *
 * @public
 */
export const FiguresSchema = Type.Record(Type.String({ description: "A resident id" }), Type.Object({ figure: Type.Optional(Type.String({ description: "The figure's id" })) }, { description: "Its core motive" }), { description: "The figure per resident" });

/**
 * The parts of a figure that steer what it does (old `FigureDirection`, the fields the report reads).
 *
 * @public
 */
export const FigureDirectionSchema = Type.Object(
	{
		tendencies: Type.Array(Type.String({ description: "A line" }), { description: "Shown from direction 8" }),
		orders: Type.Array(Type.String({ description: "A line" }), { description: "Shown at direction 10" }),
		duty: Type.Optional(Type.String({ description: "One move per act, shown at direction 10" })),
		rivals: Type.Array(Type.Object({ figure: Type.String({ description: "The other figure" }), text: Type.String({ description: "The line" }) }, { description: "A rival" }), { description: "Shown from direction 8, for figures that play" }),
	},
	{ description: "A figure's direction" },
);

/**
 * A figure of the game's cast and its direction, as the gamemaker's options hold it.
 *
 * @public
 */
export const FigureSchema = Type.Object({ id: Type.String({ description: "The figure's id" }), direction: Type.Optional(FigureDirectionSchema) }, { description: "A figure" });

/**
 * A figure of the game's cast.
 *
 * @public
 */
export type Figure = Static<typeof FigureSchema>;

/** What the report reads for this block. */
export interface CharacterInput {
	readonly lines: Static<typeof LinesSchema>;
	readonly figures: Static<typeof FiguresSchema>;
	readonly goals: Static<typeof LinesSchema>;
	readonly cast: readonly Figure[];
	readonly direction: DirectionLevel;
}

// The direction of the figure a resident plays, from direction 8.
function directionOf(input: CharacterInput, agent: string): Figure["direction"] {
	const id = input.direction < 8 ? undefined : input.figures[agent]?.figure;
	return id === undefined ? undefined : input.cast.find((figure) => figure.id === id)?.direction;
}

// The figure's material for the line, from direction 8 (old `directFigure` at the gamemaker's level).
function directedParts(input: CharacterInput, agent: string, alive: readonly string[]): readonly string[] {
	const direction = directionOf(input, agent);
	if (direction === undefined) return [];
	const playedBy = (figure: string): string | undefined => alive.find((other) => input.figures[other]?.figure === figure);
	const rivals = direction.rivals.flatMap((rival) => {
		const by = playedBy(rival.figure);
		return by === undefined ? [] : [`${by} (${rival.text})`];
	});
	const ten = input.direction >= 10;
	return [
		...(direction.tendencies.length > 0 ? [`tendencies: ${direction.tendencies.join(" ")}`] : []),
		...(rivals.length > 0 ? [`rivals: ${rivals.join(" ")}`] : []),
		...(ten && direction.orders.length > 0 ? [`orders: ${direction.orders.join(" ")}`] : []),
		...(ten && direction.duty !== undefined ? [`duty this act: ${direction.duty}`] : []),
	];
}

/**
 * The "Who they are" block with the blank line after it, or none (old `characterLines`).
 *
 * @param input - The facts, the cast and the direction.
 * @param alive - The residents in the city, in the run's order.
 * @returns The lines.
 */
export function characterLines(input: CharacterInput, alive: readonly string[]): readonly string[] {
	const entries = alive.flatMap((agent) => {
		const line = input.lines[agent];
		const goal = input.goals[agent];
		if (line === undefined && goal === undefined) return [];
		const parts = [...(line === undefined ? [] : [`core motive: ${line}`]), ...(goal === undefined ? [] : [`secret goal: ${goal}`]), ...directedParts(input, agent, alive)];
		return [`- ${agent}: ${parts.join(" · ")}`];
	});
	if (entries.length === 0) return [];
	return ["Who they are (private: use a resident's core motive or goal only in a note to that same resident, never on the board or to anyone else):", ...entries, ""];
}
