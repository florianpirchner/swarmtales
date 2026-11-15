// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The proof that the carried service contracts are what the old platform had. */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { StrategyBrainService } from "../src/contract.ts";

const sha256 = (value: unknown): string => createHash("sha256").update(JSON.stringify(value)).digest("hex");

describe("the carried contract", () => {
	// The sha256 of JSON.stringify of each definition, generated on the old platform (commit 9765702).
	it("is byte-identical to the old platform", () => {
		expect(StrategyBrainService.name).toBe("strategy-brain");
		expect(sha256(StrategyBrainService)).toBe("760fea8b937022ef0ba7b5d1cd8eb9b113e9e517ae553c40080a4a2c8d1995b7");
	});
});
