// SPDX-License-Identifier: Apache-2.0
/** The proof that the carried service contracts are what the old platform had. */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ConsensusService } from "../src/contract.ts";

const sha256 = (value: unknown): string => createHash("sha256").update(JSON.stringify(value)).digest("hex");

describe("the carried contract", () => {
	// The sha256 of JSON.stringify of each definition, generated on the old platform (commit 9765702).
	it("is byte-identical to the old platform", () => {
		expect(ConsensusService.name).toBe("consensus");
		expect(sha256(ConsensusService)).toBe("38ccbd09fea87bc7c8c5920ce13f8e10d652e7f561a4d80916b7871ad01b6d8c");
	});
});
