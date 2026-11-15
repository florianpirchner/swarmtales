// SPDX-License-Identifier: Apache-2.0
/**
 * The byte-identity list of the port (M1 specification 8): the sha256 of every carried prompt file, of the tool name
 * list, of the options schema and of the event schemas, generated on the old platform (commit 9765702).
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { strategyBrain } from "../src/index.ts";

const sha256 = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");
const PROMPTS = join(import.meta.dirname, "..", "prompts");
const filesOf = (folder: string): readonly string[] => readdirSync(folder, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? filesOf(join(folder, entry.name)) : [join(folder, entry.name)]));

const OLD_PROMPTS: Readonly<Record<string, string>> = {
	"strategy-brain/brain-text.md": "55dbe949a08c89b11370c89de24aa784cbe8b46ba141a19991f6b2785ba97742",
	"strategy-brain/briefing-brain-solo.md": "04a86741cc8eafbfce35908e5fc528ec1e7380d1db45328cd6a164535da45878",
	"strategy-brain/briefing-brain.md": "88c17f7261f7e1dab5f6121ba436232baf363e914b9e88a378277c0c752a8cbf",
	"strategy-brain/briefing-head-solo.md": "50b4f86a0eae4ca0878739d9292ced5b79d81c1759562e807967444e60111f1e",
	"strategy-brain/briefing-head.md": "ebfab5e92bb22ac98fd75b5e21b291d2bbcb710de9b96bd5c8c81a417e658dd6",
	"strategy-brain/briefing-nobrain-solo.md": "8f08dd29dcfb7b855c1266eb44c93388b73e047b6e9d4ae6a8c4ccf777cc8480",
	"strategy-brain/briefing-nobrain.md": "f42269eedfc371ec5def3ebca7f125cfc5e73b8789b2fb1e095a0035bac5329a",
	"strategy-brain/briefing-none.md": "66462a4f72899ced625d172160cf3a2f3c5730437fca62f695625e3386d943cb",
	"strategy-brain/briefing-results.md": "477cb15ea69c7c0bbfdc35bc11da5f24f91257ad2b888f4191e91b3999db6bbb",
	"strategy-brain/empty-solo.md": "b3d17ff410062dfeff20e425d16b494e489a01a3174cf6bd206149be154f4496",
	"strategy-brain/empty.md": "8601c26db9ea6bc7409650442e62b1a4212e784d7a0971fe27747d80b2f3a166",
	"strategy-brain/retro-captain.md": "22edb7e4437ceeb3843b87d4ba84a53dd5d620264004db0d8394f8bf462b539e",
	"strategy-brain/retro-current.md": "517530fd4be68d39c8367a6041b4a5a0b881851a0a0f12f4f2c972f2dc0d02fd",
	"strategy-brain/retro-open-solo.md": "66016ae634b6efc041d15518c089bc8f086c4f2f2cf3366504b76b7eb74eb368",
	"strategy-brain/retro-open.md": "688b43a1e905701084a281804a628c2f0cb1a24dfd9c3d44ad3889e9c5904ce7",
	"strategy-brain/retro-review.md": "5660396332150bd6b709041a2f06c4c11c734ebb58336832e4905980dda884cc",
	"strategy-brain/retro-rules.md": "3046f13ad3218679f48d404e0af06818485dc16f975821cf94982bfac46266bf",
	"strategy-brain/retro-start-solo.md": "fd04650d0479edc85cf18009d7c80f3cffd20d668f86bad6ca0ce3eeb9be68c6",
	"strategy-brain/retro-start.md": "d3fa2f1e7c5f18245756fd99aa9cd060d961bf9b7d9d747292492d43351c0c10",
	"strategy-brain/tools/readBrain.md": "919859ccdffc0d07c5f7d48b437add2feb9b3f6b685c56e3cbbe4531d5dcc51b",
	"strategy-brain/tools/writeBrain.md": "51c94868462fc7be9b8ff42801b84c1a17627ed076fa45ef9249b589f3e698f9",
	"strategy-brain/written.md": "f3e49c7396205c0bfac71d3754d11c6c7de694149b26da9b323d5af5198d3170",
};

describe("carried byte for byte", () => {
	it("has the prompt files of the old platform and no other", () => {
		const found = Object.fromEntries(filesOf(PROMPTS).map((file) => [relative(PROMPTS, file).split("\\").join("/"), sha256(readFileSync(file))]));
		expect(found).toEqual(OLD_PROMPTS);
		expect(Object.keys(strategyBrain.head.prompts).map((id) => `${id}.md`).sort()).toEqual(Object.keys(OLD_PROMPTS).sort());
	});

	it("has the tool names, the options, the events and the audience of the old platform", () => {
		expect(sha256(JSON.stringify(strategyBrain.head.tools.map((tool) => tool.name)))).toBe("e0d2088e974a24465a03d73edd1574d91dcf103a10951de63cd5e8e813db2e4f");
		// `showResults` (M2-29, the cure of LH19), `tooLongDetail` (M4-15, P446) and `quietEnds` (M4-69, P474) are new on
		// this platform and optional: without them the schema is the old one.
		const { showResults: added, tooLongDetail: cut, quietEnds: quiet, ...carried } = strategyBrain.options.properties;
		expect(added).toMatchObject({ type: "boolean" });
		expect(quiet).toMatchObject({ type: "boolean" });
		expect(cut).toMatchObject({ anyOf: [{ const: "plain" }, { const: "cut" }] });
		expect(sha256(JSON.stringify({ ...strategyBrain.options, properties: carried }))).toBe("67f5452444cfd8be7f1066be7420098e3e66e7fde207f6808da2e02d3c9d0e90");
		expect(sha256(JSON.stringify(strategyBrain.events))).toBe("dd7d64765444715bc7f19a4d6a6260eb8e9683e00a820ccd5d8716409ca5a6e4");
		expect(strategyBrain.head.audiences).toEqual({ brain_written: ["human"] });
		expect([strategyBrain.id, strategyBrain.head.summary]).toEqual(["strategy-brain", "A bounded, versioned text per team, written in a retro window between games and handed to the next game's briefing."]);
	});
});
