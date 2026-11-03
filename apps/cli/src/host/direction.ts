/**
 * The direction dial's resident side on the new host (step 18, team R1): moved here from
 * packages/engine/src/direction.ts, which went with the engine (step 18, item 8;
 * test/cli/host-direction.test.ts pins the texts). The figure cues are
 * the app's (S1-8): the runner puts them before the mechanics' turn inputs, as the old arena did.
 *
 * | Level | Figure prompt |
 * |---|---|
 * | 0-4 | the figure as the story wrote it (v12) |
 * | 6 | no persona block, the figure right after the frame, a voice rule, the figure's brief in every step, its full text every 10 minutes |
 * | 8 | + tendencies and rivals |
 * | 10 | + orders and a duty per act, last in the prompt; the gamemaker's notes are the author's direction |
 *
 * Other values round down to the next defined level.
 */
import { render, text } from "@swarmtales/prompts";
import type { DirectionLevel, FigureDirection, FigureSpec, ResidentId } from "@swarmtales/contracts";

export { directionLevel, type DirectionLevel } from "@swarmtales/contracts";

/** Minutes between two repeats of a figure's full text from level 6. */
export const FULL_FIGURE_EVERY = 10;


/** A figure's direction as a run plays it: what its level shows, rivals resolved to residents. */
export interface DirectedFigure {
	readonly level: DirectionLevel;
	readonly brief?: string;
	readonly tendencies: readonly string[];
	readonly rivals: readonly { readonly agent: ResidentId; readonly text: string }[];
	readonly orders: readonly string[];
	readonly duty?: string;
}

/** What `level` shows of a figure's direction, rivals resolved to the residents playing them; undefined below 6 or without one. */
export function directFigure(level: DirectionLevel, direction: FigureDirection | undefined, playedBy: (figure: string) => ResidentId | undefined): DirectedFigure | undefined {
	if (level < 6 || direction === undefined) return undefined;
	const rivals =
		level < 8
			? []
			: direction.rivals.flatMap((rival) => {
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

/**
 * The direction block at the end of the system prompt: tendencies and rivals (8), orders and duty
 * (10). Ids in rival lines are shown as the city shows them (`display`); `author` is the
 * gamemaker's name when one plays.
 */
export function directionBlock(figure: DirectedFigure, display: (text: string) => string, author?: string): string | undefined {
	const parts: string[] = [];
	if (figure.tendencies.length > 0) parts.push([text("competitor/direction/tendencies-heading"), ...figure.tendencies.map((line) => `- ${line}`)].join("\n"));
	if (figure.rivals.length > 0) parts.push([text("competitor/direction/rivals-heading"), ...figure.rivals.map((rival) => `- ${display(rival.agent)}: ${rival.text}`)].join("\n"));
	if (figure.orders.length > 0 || figure.duty !== undefined) {
		parts.push(
			[
				text("competitor/direction/orders-heading"),
				...figure.orders.map((line) => `- ${line}`),
				...(figure.duty === undefined ? [] : [`- ${render("competitor/direction/duty", { duty: figure.duty })}`]),
				...(author === undefined ? [] : [render("competitor/direction/author-line", { author })]),
			].join("\n"),
		);
	}
	return parts.length === 0 ? undefined : parts.join("\n\n");
}

/** The short reminder of every step: the brief, and at 10 the orders in one line. */
export function briefLine(figure: DirectedFigure): string | undefined {
	const parts = [
		...(figure.brief === undefined ? [] : [figure.brief]),
		...(figure.orders.length === 0 ? [] : [render("competitor/direction/orders-line", { orders: figure.orders.join(" ") })]),
		...(figure.duty === undefined ? [] : [render("competitor/direction/duty", { duty: figure.duty })]),
	];
	return parts.length === 0 ? undefined : render("competitor/direction/brief", { parts: parts.join(" ") });
}

/** One resident's reminders: the short line, and the full figure for its repeat. */
export interface FigureCue {
	readonly brief?: string;
	readonly full: string;
}

/**
 * The reminders of a run from figure direction 6 on: the brief before the status line in every
 * step, the figure's full text again every {@link FULL_FIGURE_EVERY} minutes (and in a resident's
 * first step). Not in a snapshot: a resumed run repeats the full text in each first step. The
 * texts are raw; the runner shows them as the city does (`Host.display`).
 */
export class FigureCues {
	readonly #cues: ReadonlyMap<ResidentId, FigureCue>;
	readonly #lastFull = new Map<ResidentId, number>();
	readonly #every: number;

	constructor(cues: ReadonlyMap<ResidentId, FigureCue>, every = FULL_FIGURE_EVERY) {
		this.#cues = cues;
		this.#every = every;
	}

	get size(): number {
		return this.#cues.size;
	}

	linesFor(agent: ResidentId, minute: number): readonly string[] {
		const cue = this.#cues.get(agent);
		if (cue === undefined) return [];
		const last = this.#lastFull.get(agent);
		const lines: string[] = [];
		if (last === undefined || minute - last >= this.#every) {
			this.#lastFull.set(agent, minute);
			lines.push(render("competitor/direction/full", { full: cue.full }));
		}
		if (cue.brief !== undefined) lines.push(cue.brief);
		return lines;
	}
}

/** The figure a resident plays, from the story's cast. */
export function figureOf(figures: readonly FigureSpec[] | undefined, id: string | undefined): FigureSpec | undefined {
	return id === undefined ? undefined : figures?.find((figure) => figure.id === id);
}
