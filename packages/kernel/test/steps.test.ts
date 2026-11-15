// SPDX-License-Identifier: LicenseRef-SUL-1.0
import { describe, expect, it } from "vitest";
import { createSteps } from "../src/steps.ts";

describe("the step counter (3.3 stage 1)", () => {
	it("lets an actor make `max` steps in a tick and refuses the next ones", () => {
		const steps = createSteps(2, ["worker:A01", "worker:A02"]);
		expect([steps.step("worker:A01"), steps.step("worker:A01"), steps.step("worker:A01"), steps.step("worker:A01")]).toEqual([true, true, false, false]);
		expect(steps.step("worker:A02")).toBe(true);
	});

	it("sets every counter back when a tick starts", () => {
		const steps = createSteps(1, ["worker:A01", "worker:A02"]);
		expect([steps.step("worker:A01"), steps.step("worker:A01"), steps.step("worker:A02")]).toEqual([true, false, true]);
		steps.tickStarted();
		expect([steps.step("worker:A01"), steps.step("worker:A02"), steps.step("worker:A02")]).toEqual([true, true, false]);
	});

	it("does not count a reserved id or an id the definition does not list", () => {
		const steps = createSteps(1, ["worker:A01"]);
		for (const actor of ["script", "human", "kernel", "worker:A09"] as const) {
			expect([steps.step(actor), steps.step(actor), steps.step(actor)]).toEqual([true, true, true]);
		}
		expect([steps.step("worker:A01"), steps.step("worker:A01")]).toEqual([true, false]);
	});

	it("has no limit when none is given", () => {
		const steps = createSteps(undefined, ["worker:A01"]);
		expect(Array.from({ length: 50 }, () => steps.step("worker:A01")).every(Boolean)).toBe(true);
	});
});
