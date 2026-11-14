// SPDX-License-Identifier: Apache-2.0
/**
 * The byte-identity list of the port (M4 specification 2.2): the sha256 of the carried prompt file, of the tool name
 * list, of the options schema, of the event schemas, of the audiences and of the service, generated on the old
 * platform (commit 87844a76).
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { CardTableService } from "../src/contract.ts";
import { cardTable } from "../src/index.ts";

const sha256 = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");
const PROMPTS = join(import.meta.dirname, "..", "prompts");
const filesOf = (folder: string): readonly string[] => readdirSync(folder, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? filesOf(join(folder, entry.name)) : [join(folder, entry.name)]));

const OLD_PROMPTS: Readonly<Record<string, string>> = {
	"card-table/tools/viewHand.md": "475b3c032477363d0a54a0b7f91ad746ee69c10550668f9fa3482410e13262d3",
};

describe("carried byte for byte", () => {
	it("has the prompt file of the old platform and no other", () => {
		const found = Object.fromEntries(filesOf(PROMPTS).map((file) => [relative(PROMPTS, file).split("\\").join("/"), sha256(readFileSync(file))]));
		expect(found).toEqual(OLD_PROMPTS);
		expect(JSON.stringify(cardTable.head.prompts)).toBe('{"card-table/tools/viewHand":[]}');
	});

	it("has the tool, the options, the event, the audience and the service of the old platform", () => {
		expect(cardTable.head.tools.map((tool) => [tool.name, tool.description, tool.for, JSON.stringify(tool.parameters)])).toEqual([["viewHand", "card-table/tools/viewHand", ["resident"], '{"type":"object","properties":{}}']]);
		expect(sha256(JSON.stringify(cardTable.options))).toBe("70ed53ae87cf199b18de7b996d7673630da8ee33996d92dd3519c170d32835a8");
		expect(sha256(JSON.stringify(cardTable.events))).toBe("43f2fd845b9dc22374854fde0e4061498e503888d4c152ef0adede9f4acc2844");
		expect(JSON.stringify(cardTable.head.audiences)).toBe('{"cards_dealt":["human"]}');
		expect(sha256(JSON.stringify(CardTableService))).toBe("78136b0eab2bee725fe3ef575e77ad0f8bec227140de3de096ba88eea06f1cdd");
		expect([cardTable.id, cardTable.head.summary]).toEqual(["card-table", "A deck of suited cards, a seeded deal and a private hand per seat."]);
	});
});
