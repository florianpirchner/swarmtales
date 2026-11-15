// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The byte-identity list of the port (M4 specification 2.2): the sha256 of every carried prompt file, of the tool name
 * list, of the tools with their parameters, of the options schema and of the event schemas, computed on the old
 * platform (branch `legacy`).
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { liarsDice } from "../src/index.ts";

const sha256 = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");
const PROMPTS = join(import.meta.dirname, "..", "prompts");
const filesOf = (folder: string): readonly string[] => readdirSync(folder, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? filesOf(join(folder, entry.name)) : [join(folder, entry.name)]));

const OLD_PROMPTS: Readonly<Record<string, string>> = {
	"liars-dice/game-head.md": "71f2f7df7b05c39e0cde7d4726dc888da9d3b3be875e55cc845392f0387be359",
	"liars-dice/rules.md": "1a8674264f532370e948fabe409c8e653c13132d29b732d4ca5c9c4519501e81",
	"liars-dice/task.md": "1f15276b55f12e62c8828d385372d41fcc2d8c821eedc6d2c30b44329e6442c2",
	"liars-dice/tools/bid.md": "c4177921a06c5850616cae7f87b611206206a12d21bb829ef97e7605b2a33c48",
	"liars-dice/tools/liar.md": "0beb484e455f868b6bb154af646816b8f5f7cd007566eba93e06fe01a89e2895",
	"liars-dice/tools/viewTable.md": "5c14297cb15f3787551c43afdfe51f4c1cc24f4cbed9f102eade53def71c44d7",
};

describe("carried byte for byte", () => {
	it("has the prompt files of the old platform and no other", () => {
		const found = Object.fromEntries(filesOf(PROMPTS).map((file) => [relative(PROMPTS, file).split("\\").join("/"), sha256(readFileSync(file))]));
		expect(found).toEqual(OLD_PROMPTS);
		expect(Object.keys(liarsDice.head.prompts).map((id) => `${id}.md`).sort()).toEqual(Object.keys(OLD_PROMPTS).sort());
	});

	it("has the tool names, the tool parameters, the options, the events and the audiences of the old platform", () => {
		expect(sha256(JSON.stringify(liarsDice.head.tools.map((tool) => tool.name)))).toBe("16761c94eab951182f87c5cb9e7215827ef71ffbcb509fa950a436a761b8f4a0");
		expect(sha256(JSON.stringify(liarsDice.head.tools.map((tool) => [tool.name, tool.description, tool.parameters, tool.for])))).toBe("fbbec877dc835d47bef109198aeb561eac6a3c49d0bbfc50160d240a3652a41a");
		expect(sha256(JSON.stringify(liarsDice.options))).toBe("9d4b22a84de99d632a80128e0e82a2cb81ad5a951ff3e3eaed34acc7967337b3");
		expect(sha256(JSON.stringify(liarsDice.events))).toBe("841e266985c10f78952d4cacca477c55d194dc0c49b8d0f5655cdb110495c33c");
		expect(liarsDice.head.audiences).toEqual({ dice_rolled: ["human"], dice_decision_scored: ["human"], dice_game_scored: ["human"] });
		expect([liarsDice.id, liarsDice.head.summary]).toEqual(["liars-dice", "Liar's dice for solo seats: secret seeded rolls, escalating bids checked by the engine, liar calls that reveal every die, a probability baseline for the report."]);
	});
});
