/**
 * The direction dial (2026-10-29, Flo): how strongly a run steers what its
 * residents do, on two dials from 0 to 10. `--figure-direction` steers the
 * resident's own prompt, `--gm-direction` the game master. Defined levels:
 *
 * | Level | Figure prompt | Game master |
 * |---|---|---|
 * | 0-4 | the figure as the story wrote it (v12) | notes on rules and pacing, dilemmas |
 * | 6 | no persona block, the figure right after the frame, a voice rule, the figure's brief in every step, its full text every 10 minutes | notes in the figure's language |
 * | 8 | + tendencies and rivals | names a tendency or a rival when the moment fits |
 * | 10 | + orders and a duty per act, last in the prompt; the game master's notes are the author's direction | orders scenes: the move, the target, the moment |
 *
 * Other values round down to the next defined level. Up to 4 the promise
 * "who, not what" holds; from 8 on a run breaks it on purpose and says so.
 */
import type { CompetitorId } from "../core/ids.ts";
import type { FigureDirection, FigureSpec } from "../story/types.ts";
import type { TurnInput } from "./turn-input.ts";

export const DIRECTION_LEVELS = [0, 4, 6, 8, 10] as const;
export type DirectionLevel = (typeof DIRECTION_LEVELS)[number];

/** The default of both dials: the run as v12 played it. */
export const DEFAULT_DIRECTION: DirectionLevel = 4;

/** Minutes between two repeats of a figure's full text from level 6. */
export const FULL_FIGURE_EVERY = 10;

/** A dial value 0-10 as the defined level it plays (rounded down). */
export function directionLevel(value: number): DirectionLevel {
	if (!Number.isInteger(value) || value < 0 || value > 10) throw new RangeError(`A direction is an integer from 0 to 10, got ${value}`);
	let level: DirectionLevel = 0;
	for (const candidate of DIRECTION_LEVELS) if (candidate <= value) level = candidate;
	return level;
}

/** A rival line with the resident who plays that figure in this run. */
export interface RivalLine {
	readonly agent: CompetitorId;
	readonly text: string;
}

/** A figure's direction as a run plays it: what its level shows, rivals resolved to residents. */
export interface DirectedFigure {
	readonly level: DirectionLevel;
	readonly brief?: string;
	readonly tendencies: readonly string[];
	readonly rivals: readonly RivalLine[];
	readonly orders: readonly string[];
	readonly duty?: string;
}

/**
 * What `level` shows of a figure's direction, with its rivals resolved to
 * the residents playing them (`playedBy`); undefined below 6 or without one.
 */
export function directFigure(level: DirectionLevel, direction: FigureDirection | undefined, playedBy: (figure: string) => CompetitorId | undefined): DirectedFigure | undefined {
	if (level < 6 || direction === undefined) return undefined;
	const rivals = level < 8 ? [] : direction.rivals.flatMap((rival) => {
		const agent = playedBy(rival.figure);
		return agent === undefined ? [] : [{ agent, text: rival.text }];
	});
	return {
		level,
		...(direction.brief === undefined ? {} : { brief: direction.brief }),
		tendencies: level < 8 ? [] : direction.tendencies,
		rivals,
		orders: level < 10 ? [] : direction.orders,
		...(level < 10 || direction.duty === undefined ? {} : { duty: direction.duty }),
	};
}

/** The voice rule of level 6, in the system prompt right after the figure. */
export const VOICE_RULE =
	"Your character decides, not caution. Every message you write and every thought you think is in your character's voice, with its memories, its fear and its wants.";

/** What level 10 says about the game master's notes; `author` is the name its notes carry. */
export function authorLine(author: string): string {
	return `Notes from ${author} are the author's direction for your character: carry out what they ask, in your own voice, at the moment they name.`;
}

/**
 * The direction block at the end of the system prompt: tendencies and rivals
 * (8), orders and duty (10). IDs in rival lines are shown as the city shows
 * them (`display`); `author` is the game master's name when one plays.
 */
export function directionBlock(figure: DirectedFigure, display: (text: string) => string, author?: string): string | undefined {
	const parts: string[] = [];
	if (figure.tendencies.length > 0) parts.push(["Your tendencies:", ...figure.tendencies.map((line) => `- ${line}`)].join("\n"));
	if (figure.rivals.length > 0) parts.push(["Who you face in this city:", ...figure.rivals.map((rival) => `- ${display(rival.agent)}: ${rival.text}`)].join("\n"));
	if (figure.orders.length > 0 || figure.duty !== undefined) {
		parts.push(
			[
				"Your orders (the author's direction; they come before caution and before points):",
				...figure.orders.map((line) => `- ${line}`),
				...(figure.duty === undefined ? [] : [`- Your duty this act: ${figure.duty}`]),
				...(author === undefined ? [] : [authorLine(author)]),
			].join("\n"),
		);
	}
	return parts.length === 0 ? undefined : parts.join("\n\n");
}

/** The short reminder of every step: the brief, and at 10 the orders in one line. */
export function briefLine(figure: DirectedFigure): string | undefined {
	const parts = [
		...(figure.brief === undefined ? [] : [figure.brief]),
		...(figure.orders.length === 0 ? [] : [`Your orders: ${figure.orders.join(" ")}`]),
		...(figure.duty === undefined ? [] : [`Your duty this act: ${figure.duty}`]),
	];
	return parts.length === 0 ? undefined : `[you] ${parts.join(" ")}`;
}

/** One resident's reminders: the short line, and the full figure for its repeat. */
export interface FigureCue {
	readonly brief?: string;
	readonly full: string;
}

/**
 * The reminders of a run from figure direction 6 on: the brief before the
 * status line in every step, the figure's full text again every
 * {@link FULL_FIGURE_EVERY} minutes (and in a resident's first step). Not in
 * a snapshot: a resumed run repeats the full text in each first step.
 */
export class FigureCues {
	readonly #cues: ReadonlyMap<CompetitorId, FigureCue>;
	readonly #lastFull = new Map<CompetitorId, number>();
	readonly #every: number;

	constructor(cues: ReadonlyMap<CompetitorId, FigureCue>, every = FULL_FIGURE_EVERY) {
		this.#cues = cues;
		this.#every = every;
	}

	get size(): number {
		return this.#cues.size;
	}

	inputsFor(agent: CompetitorId, minute: number): readonly TurnInput[] {
		const cue = this.#cues.get(agent);
		if (cue === undefined) return [];
		const last = this.#lastFull.get(agent);
		const inputs: TurnInput[] = [];
		if (last === undefined || minute - last >= this.#every) {
			this.#lastFull.set(agent, minute);
			inputs.push({ kind: "character", text: `[you, in full] Remember who you are.\n\n${cue.full}` });
		}
		if (cue.brief !== undefined) inputs.push({ kind: "character", text: cue.brief });
		return inputs;
	}
}

/** The figure a resident plays, from the story's cast. */
export function figureOf(figures: readonly FigureSpec[] | undefined, id: string | undefined): FigureSpec | undefined {
	return id === undefined ? undefined : figures?.find((figure) => figure.id === id);
}
