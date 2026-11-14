// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import { GAME_FORMAT_VERSION } from "./index.ts";

describe("contracts", () => {
	it("states version 1 of the game definition format", () => {
		expect(GAME_FORMAT_VERSION).toBe(1);
	});
});
