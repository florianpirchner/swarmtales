/**
 * The figure cues and the direction block moved into the CLI (apps/cli/src/host/direction.ts, step 18
 * team R1) give the old engine's texts (packages/engine/src/direction.ts) for every figure of the
 * stories, the whisperer's direction, every dial value, with and without rivals in the city and an
 * author, and the same cue lines minute by minute. The old side was recorded once before the engine
 * went (step 18, item 7b; `test/fixtures/old-engine/`).
 */
import { describe, expect, it } from "vitest";
import { Type } from "typebox";
import type { FigureDirection } from "@swarmtales/contracts";
import * as moved from "../../apps/cli/src/host/direction.ts";
import cityOfKeys from "../../stories/cityofkeys/story.ts";
import whispers from "../../stories/whispers/story.ts";
import { replayOld } from "../helpers/old-engine.ts";

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

const AUTHORS = [undefined, "THE AUTHOR"] as const;

const OldDial = Type.Object({
	level: Type.Unknown(),
	figures: Type.Array(Type.Union([Type.Null(), Type.Object({ figure: Type.Unknown(), blocks: Type.Array(Type.Union([Type.String(), Type.Null()])), brief: Type.Optional(Type.String()) })])),
});

const OldCues = Type.Object({ size: Type.Number(), lines: Type.Array(Type.Array(Type.String())), characterOnly: Type.Boolean() });

describe("the direction texts moved into the CLI", () => {
	it("has figures with direction to compare", () => {
		expect(DIRECTIONS.length).toBeGreaterThan(5);
	});

	it.each(Array.from({ length: 11 }, (_, value) => value))("dial %i: the same level, directed figure, block and brief line", (value) => {
		const recorded = replayOld({ value, directions: DIRECTIONS }, OldDial);
		expect(moved.directionLevel(value)).toBe(recorded.level);
		const level = moved.directionLevel(value);
		DIRECTIONS.forEach(([, direction], at) => {
			const before = recorded.figures[at];
			const after = moved.directFigure(level, direction, playedBy);
			expect(after ?? null).toEqual(before?.figure ?? null);
			if (before === undefined || before === null || after === undefined) return;
			AUTHORS.forEach((author, which) => {
				expect(moved.directionBlock(after, display, author) ?? null).toBe(before.blocks[which]);
			});
			expect(moved.briefLine(after)).toBe(before.brief);
		});
	});

	it("refuses the same dial values", () => {
		const values = [-1, 11, 2.5];
		const refused = replayOld({ values }, Type.Array(Type.String()));
		values.forEach((value, at) => {
			expect(() => moved.directionLevel(value)).toThrow(RangeError);
			expect(refused[at]).toBe("RangeError");
		});
	});

	it("gives the same cue lines minute by minute, with the full text every ten minutes and on a first step", () => {
		const cues = new Map([
			["A01", { brief: "Brief one.", full: "Full one." }],
			["A02", { full: "Full two." }],
		]);
		const minutes = [0, 1, 3, 9, 10, 11, 19, 20, 21, 33];
		// A02 joins late: its first step shows the full text whatever the minute.
		const steps = ["A01", "A02", "A03"].flatMap((agent) => (agent === "A02" ? minutes.slice(3) : minutes).map((minute) => [agent, minute] as const));
		const recorded = replayOld({ cues: [...cues], steps }, OldCues);
		const after = new moved.FigureCues(cues);
		expect(after.size).toBe(recorded.size);
		steps.forEach(([agent, minute], at) => {
			expect(after.linesFor(agent, minute)).toEqual(recorded.lines[at]);
		});
		expect(recorded.characterOnly).toBe(true);
	});

	it("finds the same figure", () => {
		const figures = cityOfKeys.coreMotives?.figures;
		const ids = [...FIGURE_IDS, "nobody", undefined];
		const recorded = replayOld({ figures, ids: ids.map((id) => id ?? null) }, Type.Array(Type.Unknown()));
		ids.forEach((id, at) => {
			expect(moved.figureOf(figures, id) ?? null).toEqual(recorded[at]);
		});
	});
});
