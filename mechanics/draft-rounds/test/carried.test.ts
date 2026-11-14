// SPDX-License-Identifier: Apache-2.0
/**
 * The byte-identity list of the port (M2 specification 7): the sha256 of every carried prompt file, of the tool name
 * list, of the options schema, of the event schemas and of the tool parameters, generated on the old platform
 * (commit 9765702).
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { draftRounds } from "../src/index.ts";

const sha256 = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");
const PROMPTS = join(import.meta.dirname, "..", "prompts");
const filesOf = (folder: string): readonly string[] => readdirSync(folder, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? filesOf(join(folder, entry.name)) : [join(folder, entry.name)]));

const OLD_PROMPTS: Readonly<Record<string, string>> = {
	"draft-rounds/game-head.md": "d06a87acfc8100653977a1306e1a89257cda8d691c748f9d1001a487480fedec",
	"draft-rounds/rules.md": "a6b417eb451f092af53e0b38afa40b4159d73576621275c5d993c09bca537ea9",
	"draft-rounds/task-pick.md": "1b4efd8d0360834ea3607458df28b192ff458b064289ee6ceb4ca7b7199fe2b0",
	"draft-rounds/tools/pick.md": "161ba036a26b2b0d60515ca8422765cbc2155ab3210c992ed201341e56d096d7",
	"draft-rounds/tools/viewTable.md": "966c44da6608c94c25874d4ed69c5ea8d694d27ca62a6c18bc31e314feb5d630",
};

describe("carried byte for byte", () => {
	it("has the prompt files of the old platform and no other", () => {
		const found = Object.fromEntries(filesOf(PROMPTS).map((file) => [relative(PROMPTS, file).split("\\").join("/"), sha256(readFileSync(file))]));
		expect(found).toEqual(OLD_PROMPTS);
		expect(sha256(JSON.stringify(draftRounds.head.prompts))).toBe("eea50fe930721245f38a0f489314460c55087a2d2cea07a6fd402f598a4d0d25");
	});

	it("has the tool names, the options, the events and the audiences of the old platform", () => {
		expect(sha256(JSON.stringify(draftRounds.head.tools.map((tool) => tool.name)))).toBe("5a11844e8658b1853517e4e3387a87f5165d8af4fba4399121fa3703b92eb6f9");
		// `frozenHands` (lesson LH18) and `showEarlierPoints` (M2-29, the cure of LH19) came after the port: optional and without a default, so the options of a game that leaves them out are the old ones.
		const { frozenHands, showEarlierPoints, ...carried } = draftRounds.options.properties;
		for (const added of [frozenHands, showEarlierPoints]) {
			expect(added).toMatchObject({ type: "boolean" });
			expect(added).not.toHaveProperty("default");
		}
		expect(sha256(JSON.stringify({ ...draftRounds.options, properties: carried }))).toBe("066ea439078b2d4b27fa59e5faa7c0afcb1d0bf5a50e502406b6813bd5d54533");
		expect(sha256(JSON.stringify(draftRounds.events))).toBe("a091fdca9dbe6391f4e79d351b23761845e394850ed316cf541e800ff7473a0d");
		expect(sha256(JSON.stringify(draftRounds.head.audiences))).toBe("7aa195f38976aa3a25301c0bfebd4a72cf15a99ae3358966a45eb77084fa8cd8");
		expect([draftRounds.id, draftRounds.head.summary]).toEqual(["draft-rounds", "The drafting game Quarry for solo seats: packs passed around a table, one sealed pick each, quarries of four resources scored at the end of a game."]);
	});

	it("keeps the tools for residents, with the burn parameter also when burns are off (P442)", () => {
		expect(draftRounds.head.tools.map((tool) => [tool.name, tool.description, tool.for])).toEqual([
			["viewTable", "draft-rounds/tools/viewTable", ["resident"]],
			["pick", "draft-rounds/tools/pick", ["resident"]],
		]);
		expect(JSON.stringify(draftRounds.head.tools.map((tool) => tool.parameters))).toBe(
			'[{"type":"object","properties":{}},{"type":"object","required":["card"],"properties":{"card":{"type":"string","minLength":1,"maxLength":8,"description":"The id of the card you keep (for example A3)."},"burn":{"type":"string","maxLength":8,"description":"Optional: the id of a second card of the pack to destroy before the pack moves on (limited per game)."},"reason":{"type":"string","maxLength":400,"description":"A short reason, for the record."}}}]',
		);
	});
});
