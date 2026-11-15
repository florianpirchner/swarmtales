// SPDX-License-Identifier: Apache-2.0
/**
 * The byte-identity list of the port (M4 specification 2.2): the sha256 of every carried prompt file, of the prompt
 * table, of the options, event and state schemas, computed on the old platform (branch `legacy`), and the tools with
 * their parameters as the old body declared them.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { holdem } from "../src/index.ts";

const sha256 = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");
const PROMPTS = join(import.meta.dirname, "..", "prompts");
const filesOf = (folder: string): readonly string[] => readdirSync(folder, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? filesOf(join(folder, entry.name)) : [join(folder, entry.name)]));

const OLD_PROMPTS: Readonly<Record<string, string>> = {
	"holdem/aid.md": "6cdf33286ebf4bb1222cd58a690ac2e67f968682e98807c5a600ce851859e7c2",
	"holdem/best.md": "4fc43b00699b5089571b0e2bb421cc0eb5b2c1c1c19338dae53d78896dcd6a1b",
	"holdem/game-head.md": "466583025873858294f21f16549c2249bdecd27c5c16e83f1dff64375180bbc2",
	"holdem/hand-head.md": "32923401730cb76bf68ce7e41d00d18e389ea69d02a0fef1bd9a12f6118416a1",
	"holdem/rules.md": "cdfe8220b7a88c6ddb139bceeb10e14b1efb39996a7c0439f92a8db818e570e3",
	"holdem/task.md": "497a602dd71d78333ee72edfbb1e7fc44baceee35deefa773a883899546eb461",
	"holdem/tools/act.md": "77c6a01fdb09681c2313fd87e06ff2ba12a83b8b859fc9f3e1afbc5ef23b2d98",
	"holdem/tools/viewTable.md": "86b291342ea27d69323767d3df057575a687a6f3d7462fedeb289e15d2b9dc40",
};

const MOVE = '{"anyOf":[{"type":"string","const":"fold"},{"type":"string","const":"check"},{"type":"string","const":"call"},{"type":"string","const":"bet"},{"type":"string","const":"raise"}]}';

describe("carried byte for byte", () => {
	it("has the prompt files of the old platform and no other", () => {
		const found = Object.fromEntries(filesOf(PROMPTS).map((file) => [relative(PROMPTS, file).split("\\").join("/"), sha256(readFileSync(file))]));
		expect(found).toEqual(OLD_PROMPTS);
		expect(sha256(JSON.stringify(holdem.head.prompts))).toBe("ec5121626e8eb43e423ff73ba5f48d225bcc51a58c648ff4e6dd195885f5fd11");
		expect(Object.keys(holdem.head.prompts).map((id) => `${id}.md`).sort()).toEqual(Object.keys(OLD_PROMPTS).sort());
	});

	it("has the tools, the options, the events, the state and the audiences of the old platform", () => {
		const tools = holdem.head.tools.map((tool) => [tool.name, tool.description, tool.for, JSON.stringify(tool.parameters)]);
		expect(tools).toEqual([
			["viewTable", "holdem/tools/viewTable", ["resident"], '{"type":"object","properties":{}}'],
			["act", "holdem/tools/act", ["resident"], `{"type":"object","required":["action"],"properties":{"action":${MOVE},"reason":{"type":"string","maxLength":400,"description":"A short reason, for the record (never shown to the other players)."}}}`],
		]);
		expect(sha256(JSON.stringify(holdem.options))).toBe("e3b4495867585d8913af7422c15db8c4bd5d9783274c3159ab5c6a4870803878");
		expect(sha256(JSON.stringify(holdem.events))).toBe("f9ca96b10b6bd152f9b52f80a9259f370f376c3bec3703784782496857d00e1e");
		expect(sha256(JSON.stringify(holdem.head.state))).toBe("37b58b84da13a4ed00e005b600da13350f171f08c83421892389f3dc8439535f");
		expect(JSON.stringify(holdem.head.audiences)).toBe('{"cards_dealt":["human"],"decision_scored":["human"],"game_scored":["human"]}');
		expect([holdem.id, holdem.head.summary]).toEqual(["holdem", "Fixed-limit Texas Hold'em for solo seats: seeded and duplicate deals, private hole cards, betting, showdown, an equity baseline for the report."]);
	});
});
