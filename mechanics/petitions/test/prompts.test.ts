// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The head of `petitions`: the seventeen prompt texts carried byte for byte from the old platform, the tools and the staged tool. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { petitions } from "../src/index.ts";

describe("the head", () => {
	it("carries the seventeen prompt texts of the old platform; only the ids of the library's ten differ", () => {
		// The sha256 of the old files: `library/prompts/<old id>.md` for `tools/` and `replies/` (but `resolvePetition`), else `mechanics/petitions/prompts/<old id>.md`.
		const old: readonly (readonly [string, string, string])[] = [
			["petitions/tools/signPetition", "tools/signPetition", "473342ad750a204357c86283457e8fc08fcee11442613207797a5aae8a065525"],
			["petitions/tools/listPetitions", "tools/listPetitions", "93e319f750c278bad271afd44d8b8d07cc56d01a1083c5c2dd1b32a1e2a403fa"],
			["petitions/replies/petition-signatures", "replies/petition-signatures", "93f9a46ce6f09c6422ca22ab099f205f19dcf60a57687434e402291a33e7329d"],
			["petitions/replies/petition-signers", "replies/petition-signers", "4b1ddc7a2ac28b9eb1ee6c55aa1394e93e35e72d5b9d422f424bda482b153c5e"],
			["petitions/replies/petition-secret", "replies/petition-secret", "ae9f21a8351bd98ed60ae65170ecbb45b89b1c81b265741b58f6b2e698c21941"],
			["petitions/replies/petition-you-signed", "replies/petition-you-signed", "c4cb80166642e9eedfd5e0a5b0fb83cc3a2ee49e950143c19591d160d8ca056b"],
			["petitions/replies/petition-you-not-signed", "replies/petition-you-not-signed", "461ea53a6a60e1a2a6aae921d7af1c65e42684402438886789942e4f07335261"],
			["petitions/replies/petition-signed", "replies/petition-signed", "899fddb94ad1ac099962e3bd3ddc771b5523e5ee4cf66b7fb44235dbfda38723"],
			["petitions/replies/petitions-none", "replies/petitions-none", "8bb3fdd1281711e51216ee78e4395259e56b7cad90aeb19767ab29d39b061510"],
			["petitions/tools/resolvePetition", "tools/resolvePetition", "cc1abe8d2e74c61366b26ca1ff556d6ee863a0e2deb56d9f46b2542b0e86ce2b"],
			["petitions/signed-by", "petitions/signed-by", "891b8d20785533b7ab8ac3b18c5ab87b5d411b7c6393458c8d99c3ba11808b16"],
			["petitions/visibility-public", "petitions/visibility-public", "e00bb36f546a5f0ec57a2c47ee2a22180b6d5e47d128447a70f8b70d3b173048"],
			["petitions/visibility-secret", "petitions/visibility-secret", "2fd8dd5355249fd395462ec8028e0a4b45894e7920c6976d0bdf9e520f89e553"],
			["petitions/noun-one", "petitions/noun-one", "a06e7a5392d2f6fbec665b0a908966269e9bd125050e09a901c58127862dabd9"],
			["petitions/noun-many", "petitions/noun-many", "caf301da3bb91222d60fe83fb51f52382d5a404b9c2e8e38e7e12f3f1428cbec"],
			["petitions/opened", "petitions/opened", "e8630d72960c81db439461d921b06622f2f922c45df2ffdb2c4561e06571de30"],
			["petitions/resolved", "petitions/resolved", "b9bf3a1354c761d3d65feddf6404bedb42b90c9e77e566526efa11f10a1cc0d5"],
		];
		for (const [id, oldId, sha256] of old) {
			const text = readFileSync(new URL(`../prompts/${id}.md`, import.meta.url), "utf8").replace(`id: ${id}`, `id: ${oldId}`);
			expect([id, createHash("sha256").update(text).digest("hex")]).toEqual([id, sha256]);
		}
		expect(Object.keys(petitions.head.prompts).sort()).toEqual(old.map(([id]) => id).sort());
		expect(petitions.head.tools.map((tool) => [tool.name, tool.description, tool.for])).toEqual([
			["resolvePetition", "petitions/tools/resolvePetition", ["script"]],
			["signPetition", "petitions/tools/signPetition", ["resident"]],
			["listPetitions", "petitions/tools/listPetitions", ["resident"]],
		]);
		expect(petitions.head.stages).toEqual(["resolvePetition"]);
	});
});
