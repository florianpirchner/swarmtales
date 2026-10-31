/**
 * Progression and puzzles each carry a copy of the `puzzles-extras` API (a mechanic never imports
 * another, docs/design/carve-requests-T3.md, request 1); the host matches the copies by name, so they
 * must describe the same methods.
 */
import { describe, expect, it } from "vitest";
import { PuzzlesExtrasApi as ProgressionCopy } from "../../../mechanics/progression/src/puzzles-extras.ts";
import { PuzzlesExtrasApi } from "@swarmtales/mechanic-puzzles";

describe("puzzles-extras", () => {
	it("is the same API in puzzles and in progression", () => {
		expect(ProgressionCopy.name).toBe(PuzzlesExtrasApi.name);
		expect(JSON.stringify(ProgressionCopy.methods)).toBe(JSON.stringify(PuzzlesExtrasApi.methods));
	});
});
