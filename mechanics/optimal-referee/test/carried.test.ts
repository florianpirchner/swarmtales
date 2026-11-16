// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The byte-identity list of the port (M1 specification 8): the sha256 of the tool name list, of the options schema
 * and of the event schemas, generated on the old platform (commit 9765702). The mechanic has no prompt file.
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { optimalReferee } from "../src/index.ts";

const sha256 = (value: unknown): string => createHash("sha256").update(JSON.stringify(value)).digest("hex");

describe("carried byte for byte", () => {
	it("has the tool names, the options, the events and the audience of the old platform, and no prompt", () => {
		expect(sha256(optimalReferee.head.tools.map((tool) => tool.name))).toBe("4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945");
		expect(sha256(optimalReferee.options)).toBe("885a485efcc13838d78b8cab1d4da5ef4a136fbc17f2af871a054d245bc26e5e");
		expect(sha256(optimalReferee.events)).toBe("ec83f62d4b433b7b95dcd3ed1e8880c52bb1b6d4c76b359a6746aaedd0838e3f");
		expect(optimalReferee.head.audiences).toEqual({ move_scored: ["human"] });
		expect([optimalReferee.id, optimalReferee.head.summary]).toEqual(["optimal-referee", "Scores every grid move against minimax (value before and after, class); read-only, for the human and the reporter."]);
		expect([optimalReferee.head.prompts, existsSync(join(import.meta.dirname, "..", "prompts"))]).toEqual([{}, false]);
	});
});
