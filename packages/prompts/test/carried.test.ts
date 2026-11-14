// SPDX-License-Identifier: Apache-2.0
/**
 * The four kernel replies are carried byte for byte: their sha256 is the one of the same file at `v0-final`
 * (`git show v0-final:library/prompts/replies/core/<name>.md | sha256sum`, taken at commit 9765702).
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createPromptLookup, libraryDir } from "../src/index.ts";

/** File name without `.md`, its sha256 at `v0-final`, and the text a model reads. */
const REPLIES: readonly (readonly [string, string, string])[] = [
	["unknown-tool", "8ad382aa8da8cbdf9397168931d03a8dcbde5f0f24a29b5f70bcb13afdd59de8", "no such tool exists"],
	["not-granted", "e7553de599fc0bc106be6ce473180d9687a2afe068505cd80568f3abaaa4cd1d", "this tool is not given to your role in this story"],
	["locked", "5139dfc9662a216f1f65887d54dafd1218b55af969108dd6d2ed1389cd270fb8", "not available to you at this level or in this phase; activeTools lists the tools you can use now"],
	["steps", "22b472ac97b90667d778a27f61843b47de5101523c16266e48d6e3ff31823b57", "you have used up your actions for this minute"],
];

describe("the carried kernel replies", () => {
	const folder = join(libraryDir(), "replies", "core");

	it("holds exactly the four reply files of M1", () => {
		expect(readdirSync(folder).sort()).toEqual(REPLIES.map(([name]) => `${name}.md`).sort());
	});

	it.each(REPLIES)("%s.md is byte-identical to v0-final and renders through the lookup", (name, sha256, text) => {
		expect(createHash("sha256").update(readFileSync(join(folder, `${name}.md`))).digest("hex")).toBe(sha256);
		expect(createPromptLookup({ mechanics: {} }).render("kernel", `replies/core/${name}`, {}, [])).toBe(text);
	});
});
