// SPDX-License-Identifier: Apache-2.0
/** The proof that the carried service contracts are what the old platform had. */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { BrainSourceService, ConsensusSourceService } from "../src/index.ts";

const sha256 = (value: unknown): string => createHash("sha256").update(JSON.stringify(value)).digest("hex");

describe("the carried contract", () => {
	// The sha256 of JSON.stringify of each definition, generated on the old platform (commit 9765702).
	it("is byte-identical to the old platform", () => {
		expect(ConsensusSourceService.name).toBe("consensus-source");
		expect(sha256(ConsensusSourceService)).toBe("a341c85083364fb040bce18b98e141c9ddf4bd9e8044ac44955ab2ab00faf383");
		expect(BrainSourceService.name).toBe("brain-source");
		expect(sha256(BrainSourceService)).toBe("eabaa44c94bf50007ca2ccd377160d9a78eeb9eba3b0010c841bcb4b65351dae");
	});
});
