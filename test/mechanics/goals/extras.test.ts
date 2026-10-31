/**
 * Goals and progression each carry a copy of the `goals-extras` API (a mechanic never imports
 * another, docs/design/carve-requests-T3.md, request 11); the host matches the copies by name, so they
 * must describe the same methods.
 */
import { describe, expect, it } from "vitest";
import { GoalsExtrasApi } from "@swarmtales/mechanic-goals";
import { GoalsExtrasApi as ProgressionCopy } from "../../../mechanics/progression/src/goals-extras.ts";

describe("goals-extras", () => {
	it("is the same API in goals and in progression", () => {
		expect(ProgressionCopy.name).toBe(GoalsExtrasApi.name);
		expect(JSON.stringify(ProgressionCopy.methods)).toBe(JSON.stringify(GoalsExtrasApi.methods));
	});
});
