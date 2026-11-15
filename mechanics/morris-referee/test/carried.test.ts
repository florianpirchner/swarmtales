// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The byte-identity list of the port (M4 specification 2.2): the sha256 of the tool name list, of the options schema
 * and of the event schemas, generated on the old platform (commit 87844a76). The mechanic has no prompt file.
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { morrisReferee } from "../src/index.ts";

const sha256 = (value: unknown): string => createHash("sha256").update(JSON.stringify(value)).digest("hex");

describe("carried byte for byte", () => {
	it("has the tool names, the options, the events and the audience of the old platform, and no prompt", () => {
		expect(sha256(morrisReferee.head.tools.map((tool) => tool.name))).toBe("4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945");
		expect(sha256(morrisReferee.options)).toBe("729d0a3de70107c7a3fa1f3dbe24063ad8389f257254e5f3f2a69d71156e9cff");
		expect(sha256(morrisReferee.events)).toBe("e30396da1c7ada5e5e3a17c5da59d00a4bf937dcb8c4b4a1cb64026712ce1316");
		expect(morrisReferee.head.audiences).toEqual({ move_scored: ["human"] });
		expect([morrisReferee.id, morrisReferee.head.summary, morrisReferee.head.version]).toEqual([
			"morris-referee",
			"Scores every morris turn against a depth-limited alpha-beta search (best and played value, class); read-only, for the human and the reporter.",
			1,
		]);
		expect([morrisReferee.head.prompts, existsSync(join(import.meta.dirname, "..", "prompts"))]).toEqual([{}, false]);
	});
});
