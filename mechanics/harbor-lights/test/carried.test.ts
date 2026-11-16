// SPDX-License-Identifier: LicenseRef-SUL-1.0
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

/** The id this platform renamed (M6-06), from the id the old platform wrote to the id here. */
const RENAMED = { "hint-towers": "harbor-lights" } as const;
/** A carried text as the old platform wrote it: the new id back to the old one where it names the mechanic (`"<id>/...`, `"<id>.`, `id: <id>/`). */
const asOld = (text: string): string => Object.entries(RENAMED).reduce((done, [old, now]) => done.replace(new RegExp(`(?<=^id: |")${now}(?=[./])`, "gm"), old), text);
const sha256 = (value: string | Buffer): string => createHash("sha256").update(asOld(value.toString())).digest("hex");
const PROMPTS = join(import.meta.dirname, "..", "prompts");
const filesOf = (folder: string): readonly string[] => readdirSync(folder, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? filesOf(join(folder, entry.name)) : [join(folder, entry.name)]));

const OLD_PROMPTS: Readonly<Record<string, string>> = {
	"harbor-lights/tools/discardSlot.md": "d597f7cf2eb2fc4e133b07a829572fad94797eac9a112bff5b52d8238d583c61",
	"harbor-lights/tools/giveSignal.md": "a75ed0e10ffc7dad2d2d92bfc9f0a1a4733b69088fd64ecb4359a73f3d6a5b51",
	"harbor-lights/tools/playSlot.md": "e5adc2050eb5c84bfe149c127edd5efc48ceaa9a602e46a949932a91ad3e4067",
	"harbor-lights/tools/viewTowers.md": "b7c63a63b4bffab65d39db352cf65ddc8b489ff7747603aa862e0024e6d5eae1",
};

const SLOT = '{"type":"object","required":["slot"],"properties":{"slot":{"type":"integer","minimum":1,"description":"Your slot, from 1 (your oldest card)."}}}';

describe("carried byte for byte", () => {
	it("has the prompt files of the old platform and no other", () => {
		const found = Object.fromEntries(filesOf(PROMPTS).map((file) => [relative(PROMPTS, file).split("\\").join("/"), sha256(readFileSync(file))]));
		expect(found).toEqual(OLD_PROMPTS);
		expect(JSON.stringify(hintTowers.head.prompts)).toBe('{"harbor-lights/tools/viewTowers":[],"harbor-lights/tools/giveSignal":[],"harbor-lights/tools/playSlot":[],"harbor-lights/tools/discardSlot":[]}');
	});

	it("has the tools, the options, the events and the audiences of the old platform", () => {
		expect(hintTowers.head.tools.map((tool) => [tool.name, tool.description, tool.for, JSON.stringify(tool.parameters)])).toEqual([
			["viewTowers", "harbor-lights/tools/viewTowers", ["resident"], '{"type":"object","properties":{}}'],
			["giveSignal", "harbor-lights/tools/giveSignal", ["resident"], '{"type":"object","required":["to","about"],"properties":{"to":{"type":"string","description":"The seat you signal, for example \\"A03\\"."},"about":{"type":"string","description":"One suit name (for example \\"Moss\\") or one rank (for example \\"3\\")."}}}'],
			["playSlot", "harbor-lights/tools/playSlot", ["resident"], SLOT],
			["discardSlot", "harbor-lights/tools/discardSlot", ["resident"], SLOT],
		]);
		expect(sha256(JSON.stringify(hintTowers.options))).toBe("b7377d588e373ea4a7152c2efc2752f3e1f4707d977a88f9b3caa27644d416ad");
		expect(sha256(JSON.stringify(hintTowers.events))).toBe("3773d312c7339d42fed749cf104bb455552ea087ebcdd5ccc1d37b5ae71749d3");
		expect(JSON.stringify(hintTowers.head.audiences)).toBe('{"deal_revealed":["human"],"card_drawn":["human"],"game_scored":["human"]}');
		expect([hintTowers.id, hintTowers.head.summary]).toEqual(["harbor-lights", "A cooperative game of hidden hands: signals about suit or rank, towers lit in rank order, bridged losses."]);
	});
});
