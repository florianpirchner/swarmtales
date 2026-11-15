// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The byte-identity list of the port (M1 specification 8): the sha256 of every carried prompt file, of the tool name
 * list, of the options schema and of the event schemas, generated on the old platform (commit 9765702).
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { gridGame } from "../src/index.ts";

const sha256 = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");
const PROMPTS = join(import.meta.dirname, "..", "prompts");
const filesOf = (folder: string): readonly string[] => readdirSync(folder, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? filesOf(join(folder, entry.name)) : [join(folder, entry.name)]));

const OLD_PROMPTS: Readonly<Record<string, string>> = {
	"grid-game/tools/playMove.md": "5c9a5a0456312921589e32f7c065fa4058d5a9aeb942aa1047c0a3200aa954d4",
	"grid-game/tools/viewBoard.md": "90b09f4a41010e7437f4feaa76c10f4053a5b073d936c0de48cf24d00e54266a",
};

describe("carried byte for byte", () => {
	it("has the prompt files of the old platform and no other", () => {
		const found = Object.fromEntries(filesOf(PROMPTS).map((file) => [relative(PROMPTS, file).split("\\").join("/"), sha256(readFileSync(file))]));
		expect(found).toEqual(OLD_PROMPTS);
		expect(Object.keys(gridGame.head.prompts).map((id) => `${id}.md`).sort()).toEqual(Object.keys(OLD_PROMPTS));
	});

	it("has the tool names, the options and the events of the old platform", () => {
		expect(sha256(JSON.stringify(gridGame.head.tools.map((tool) => tool.name)))).toBe("bbc0d34cb540acc7aa946a39280a26156800dbb1dd644678eae5ba41bad292e0");
		expect(sha256(JSON.stringify(gridGame.options))).toBe("ced0ade5f4e45bb66c17927d39901e3ad6db1b932c2ef0edcef6db4229796762");
		expect(sha256(JSON.stringify(gridGame.events))).toBe("c124fc8cb64ed56ed696389e54f5875704eff0952c825dabb583ce246d1f25b5");
		expect([gridGame.id, gridGame.head.summary]).toEqual(["grid-game", "A board game between two teams: the board, the captain of the turn, win detection and a match of several games."]);
	});
});
