// SPDX-License-Identifier: Apache-2.0
/**
 * The byte-identity list of the port (M4 specification 2.2): the sha256 of every carried prompt file, of the options
 * schema and of the event schemas, the tools with their parameters and the audiences, generated on the old platform
 * (commit 87844a76).
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { hintTowers } from "../src/index.ts";

const sha256 = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");
const PROMPTS = join(import.meta.dirname, "..", "prompts");
const filesOf = (folder: string): readonly string[] => readdirSync(folder, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? filesOf(join(folder, entry.name)) : [join(folder, entry.name)]));

const OLD_PROMPTS: Readonly<Record<string, string>> = {
	"hint-towers/tools/discardSlot.md": "d597f7cf2eb2fc4e133b07a829572fad94797eac9a112bff5b52d8238d583c61",
	"hint-towers/tools/giveSignal.md": "a75ed0e10ffc7dad2d2d92bfc9f0a1a4733b69088fd64ecb4359a73f3d6a5b51",
	"hint-towers/tools/playSlot.md": "e5adc2050eb5c84bfe149c127edd5efc48ceaa9a602e46a949932a91ad3e4067",
	"hint-towers/tools/viewTowers.md": "b7c63a63b4bffab65d39db352cf65ddc8b489ff7747603aa862e0024e6d5eae1",
};

const SLOT = '{"type":"object","required":["slot"],"properties":{"slot":{"type":"integer","minimum":1,"description":"Your slot, from 1 (your oldest card)."}}}';

describe("carried byte for byte", () => {
	it("has the prompt files of the old platform and no other", () => {
		const found = Object.fromEntries(filesOf(PROMPTS).map((file) => [relative(PROMPTS, file).split("\\").join("/"), sha256(readFileSync(file))]));
		expect(found).toEqual(OLD_PROMPTS);
		expect(JSON.stringify(hintTowers.head.prompts)).toBe('{"hint-towers/tools/viewTowers":[],"hint-towers/tools/giveSignal":[],"hint-towers/tools/playSlot":[],"hint-towers/tools/discardSlot":[]}');
	});

	it("has the tools, the options, the events and the audiences of the old platform", () => {
		expect(hintTowers.head.tools.map((tool) => [tool.name, tool.description, tool.for, JSON.stringify(tool.parameters)])).toEqual([
			["viewTowers", "hint-towers/tools/viewTowers", ["resident"], '{"type":"object","properties":{}}'],
			["giveSignal", "hint-towers/tools/giveSignal", ["resident"], '{"type":"object","required":["to","about"],"properties":{"to":{"type":"string","description":"The seat you signal, for example \\"A03\\"."},"about":{"type":"string","description":"One suit name (for example \\"Moss\\") or one rank (for example \\"3\\")."}}}'],
			["playSlot", "hint-towers/tools/playSlot", ["resident"], SLOT],
			["discardSlot", "hint-towers/tools/discardSlot", ["resident"], SLOT],
		]);
		expect(sha256(JSON.stringify(hintTowers.options))).toBe("b7377d588e373ea4a7152c2efc2752f3e1f4707d977a88f9b3caa27644d416ad");
		expect(sha256(JSON.stringify(hintTowers.events))).toBe("3773d312c7339d42fed749cf104bb455552ea087ebcdd5ccc1d37b5ae71749d3");
		expect(JSON.stringify(hintTowers.head.audiences)).toBe('{"deal_revealed":["human"],"card_drawn":["human"],"game_scored":["human"]}');
		expect([hintTowers.id, hintTowers.head.summary]).toEqual(["hint-towers", "A cooperative game of hidden hands: signals about suit or rank, towers lit in rank order, bridged losses."]);
	});
});
