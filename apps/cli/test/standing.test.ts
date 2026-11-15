// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The standing checks of every game of the games list through the command line, part 1 (`standing-part.ts` says
 * what they check and how the parts deal the boundaries), and the test that the list is read whole.
 */
import { describe, expect, it } from "vitest";
import { describeStandingPart, LIST, RUNS } from "./standing-part.ts";

describe("the games list of the standing checks", () => {
	it("every line of the games list is read, and the list holds a game", () => {
		expect(RUNS.length).toBeGreaterThan(0);
		expect(new Set(RUNS.map((run) => run.name)).size).toBe(LIST.match(/\bname: "/g)?.length);
	});
});

describeStandingPart(0);
