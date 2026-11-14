// SPDX-License-Identifier: Apache-2.0
/** The proof that the carried service contracts are what the old platform had. */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { TeamChannelService } from "../src/contract.ts";

const sha256 = (value: unknown): string => createHash("sha256").update(JSON.stringify(value)).digest("hex");

describe("the carried contract", () => {
	// The sha256 of JSON.stringify of each definition, generated on the old platform (commit 9765702).
	it("is byte-identical to the old platform", () => {
		expect(TeamChannelService.name).toBe("team-channel");
		expect(sha256(TeamChannelService)).toBe("a125f1df4539c52f85f317b5fee69ba912469c20dba6b46788108ea18225933a");
	});
});
