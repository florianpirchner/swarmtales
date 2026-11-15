// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The head of `exile`: the eleven prompt texts carried byte for byte from the old platform, and the two tools. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { exile } from "../src/index.ts";

describe("the head", () => {
	it("carries the eleven prompt texts of the old platform; only the ids differ", () => {
		// The sha256 of the old files: `library/prompts/<old id>.md`, the last three `mechanics/exile/prompts/<old id>.md`.
		const old: readonly (readonly [string, string, string])[] = [
			["exile/tools/payRansom", "tools/payRansom", "9bca50fa92f96186ef6c7228659e6402dc0fe854444fd0fa03dc6fe3f2af9357"],
			["exile/tools/lastWill", "tools/lastWill", "f115a507db48b4fda6557e93d6aef71b7f68d32c340ef3422021f73696c49e16"],
			["exile/replies/locked", "replies/locked", "70f509570c857b3348bb1283497fe786aec9052bc745265380856cf93a5d8d24"],
			["exile/replies/ransom-covered", "replies/ransom-covered", "9335ccdfee90b2b936e535d4702de4f82d92f0de976fb7fbe7a2fbe17d685317"],
			["exile/replies/ransom-paid", "replies/ransom-paid", "a1be51d9a8856405cebfcf64573ce56d1ed793be02a3a635f77d65c0685ae913"],
			["exile/replies/will-invalid", "replies/will-invalid", "a14ade8c2566a5d54b3d9f99d46f0fae7dbc4185833c977d461102e99fc0c7f6"],
			["exile/replies/will-written", "replies/will-written", "ea7d6bafd87ab8fbd9f3120aa9ad1a02c1ea04d44bb8eceadff86b7c198ce4b2"],
			["exile/status/gate", "competitor/status/gate", "4ec98a3c40da79a8d67f88df936fd03119c40ba909d54752ac6a48770d80206b"],
			["exile/status-exiled", "exile/status-exiled", "ec7cb8367c5998d857bf8dd6752719770ad577b001808621f8d794553dfcdf6a"],
			["exile/ransom-toward", "exile/ransom-toward", "61440d4345e572c1c0137974291ddfdb928789c41359fc27680e5bc19ca1b419"],
			["exile/will-points", "exile/will-points", "0a569d629d919e05892ea719968e9a589aeb79498b95646c4749ed487d5c3389"],
		];
		for (const [id, oldId, sha256] of old) {
			const text = readFileSync(new URL(`../prompts/${id}.md`, import.meta.url), "utf8").replace(`id: ${id}`, `id: ${oldId}`);
			expect([id, createHash("sha256").update(text).digest("hex")]).toEqual([id, sha256]);
		}
		expect(Object.keys(exile.head.prompts).sort()).toEqual(old.map(([id]) => id).sort());
		expect(exile.head.tools.map((tool) => [tool.name, tool.description, tool.for])).toEqual([
			["payRansom", "exile/tools/payRansom", ["resident"]],
			["lastWill", "exile/tools/lastWill", ["resident"]],
		]);
	});
});
