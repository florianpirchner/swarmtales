/**
 * The figure cues and the direction block moved into the CLI (apps/cli/src/host/direction.ts, step 18
 * team R1) give the old engine's texts (packages/engine/src/direction.ts) for every figure of the
 * stories, the whisperer's direction, every dial value, with and without rivals in the city and an
 * author, and the same cue lines minute by minute.
 */
import { describe, expect, it } from "vitest";
import * as old from "@swarmtales/engine";
import type { FigureDirection } from "@swarmtales/contracts";
import * as moved from "../../apps/cli/src/host/direction.ts";
import cityOfKeys from "../../stories/cityofkeys/story.ts";
import whispers from "../../stories/whispers/story.ts";

const DIRECTIONS: readonly (readonly [string, FigureDirection])[] = [
	...[cityOfKeys, whispers].flatMap((story) => (story.coreMotives?.figures ?? []).flatMap((figure) => (figure.direction === undefined ? [] : [[`${story.id}/${figure.id}`, figure.direction] as const]))),
	...[cityOfKeys, whispers].flatMap((story) => (story.whisperer?.direction === undefined ? [] : [[`${story.id}/whisperer`, story.whisperer.direction] as const])),
];

const FIGURE_IDS = [cityOfKeys, whispers].flatMap((story) => (story.coreMotives?.figures ?? []).map((figure) => figure.id));

/** Every second figure is played by a resident still in the city. */
const playedBy = (figure: string): string | undefined => {
	const at = FIGURE_IDS.indexOf(figure);
	return at >= 0 && at % 2 === 0 ? `A0${String((at % 9) + 1)}` : undefined;
};

const display = (text: string): string => text.replace(/A0(\d)/g, "Resident $1");

describe("the direction texts moved into the CLI", () => {
	it("has figures with direction to compare", () => {
		expect(DIRECTIONS.length).toBeGreaterThan(5);
	});

	it.each(Array.from({ length: 11 }, (_, value) => value))("dial %i: the same level, directed figure, block and brief line", (value) => {
		expect(moved.directionLevel(value)).toBe(old.directionLevel(value));
		const level = moved.directionLevel(value);
		for (const [, direction] of DIRECTIONS) {
			const before = old.directFigure(level, direction, playedBy);
			const after = moved.directFigure(level, direction, playedBy);
			expect(after).toEqual(before);
			if (before === undefined || after === undefined) continue;
			for (const author of [undefined, "THE AUTHOR"]) expect(moved.directionBlock(after, display, author)).toBe(old.directionBlock(before, display, author));
			expect(moved.briefLine(after)).toBe(old.briefLine(before));
		}
	});

	it("refuses the same dial values", () => {
		for (const value of [-1, 11, 2.5]) {
			expect(() => moved.directionLevel(value)).toThrow(RangeError);
			expect(() => old.directionLevel(value)).toThrow(RangeError);
		}
	});

	it("gives the same cue lines minute by minute, with the full text every ten minutes and on a first step", () => {
		const cues = new Map([
			["A01", { brief: "Brief one.", full: "Full one." }],
			["A02", { full: "Full two." }],
		]);
		const before = new old.FigureCues(cues);
		const after = new moved.FigureCues(cues);
		expect(after.size).toBe(before.size);
		const minutes = [0, 1, 3, 9, 10, 11, 19, 20, 21, 33];
		for (const agent of ["A01", "A02", "A03"]) {
			// A02 joins late: its first step shows the full text whatever the minute.
			for (const minute of agent === "A02" ? minutes.slice(3) : minutes) {
				expect(after.linesFor(agent, minute)).toEqual(before.inputsFor(agent, minute).map((input) => input.text));
			}
		}
		expect(before.inputsFor("A01", 50).every((input) => input.kind === "character")).toBe(true);
	});

	it("finds the same figure", () => {
		const figures = cityOfKeys.coreMotives?.figures;
		for (const id of [...FIGURE_IDS, "nobody", undefined]) expect(moved.figureOf(figures, id)).toBe(old.figureOf(figures, id));
	});
});
