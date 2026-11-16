// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The byte-identity list of the port (M4 specification 2.2): the sha256 of every carried prompt file, of the prompt
 * variables, of the options schema, of the event schemas and the audiences, and the tools with their parameters,
 * generated on the old platform (commit 87844a76).
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { clueGrid } from "../src/index.ts";

/** The id this platform renamed (M6-06), from the id the old platform wrote to the id here. */
const RENAMED = { "clue-grid": "lanterns" } as const;
/** A carried text as the old platform wrote it: the new id back to the old one where it names the mechanic (`"<id>/...`, `"<id>.`, `id: <id>/`). */
const asOld = (text: string): string => Object.entries(RENAMED).reduce((done, [old, now]) => done.replace(new RegExp(`(?<=^id: |")${now}(?=[./])`, "gm"), old), text);
const sha256 = (value: string | Buffer): string => createHash("sha256").update(asOld(value.toString())).digest("hex");
const PROMPTS = join(import.meta.dirname, "..", "prompts");
const filesOf = (folder: string): readonly string[] => readdirSync(folder, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? filesOf(join(folder, entry.name)) : [join(folder, entry.name)]));

const OLD_PROMPTS: Readonly<Record<string, string>> = {
	"lanterns/game-head.md": "34ff729bbf9e3cc70cb0f614c344592823ff667e5f4449c2bd53d3f667564cd4",
	"lanterns/keeper-silent.md": "d81164d5b58d3d386df8c4cf3ad91999cc915fe779ce563356d5a2a6149c53f8",
	"lanterns/rules.md": "acf007783cb3b808ac0bc2740c894f98ee6f503e50c8a022ef8614d29ccef4de",
	"lanterns/task-caller.md": "139b46065656de9397f6e5f8776610efeac3c452905f27f612d4b2ca3b574458",
	"lanterns/task-clue.md": "b724b7afaae628c5334821db0cbc1cc06ad385d80076aaa288f84a4711f9e7a6",
	"lanterns/task-partner.md": "800c8edd0a60b3d7cab61e5c354b3e5a80b6a2d316f1f1129963283f717e558e",
	"lanterns/tools/endGuesses.md": "a8ec0b98ce6a0a4baecb277734e2bccb222845590b21d22d394e0324bc1f6431",
	"lanterns/tools/giveClue.md": "3f5a57910bdcfe004943b58c7ba205cd5f6d768c4ea6441d145e48157aee250c",
	"lanterns/tools/guess.md": "f3f78a00ac37f3bbcecd708eb3a55cb3059e2e218d17608586953d78772adc3c",
	"lanterns/tools/viewGrid.md": "ba1c0a51e1c7fda33d56d56bbe267366095956a37f6d09da4ceed62f96a77847",
};

describe("carried byte for byte", () => {
	it("has the prompt files of the old platform and no other", () => {
		const found = Object.fromEntries(filesOf(PROMPTS).map((file) => [relative(PROMPTS, file).split("\\").join("/"), sha256(readFileSync(file))]));
		expect(found).toEqual(OLD_PROMPTS);
		expect(sha256(JSON.stringify(clueGrid.head.prompts))).toBe("1f64d7751a560cb3391f9b28a04f43edee4d9c998f07fa58e57b1a719cbf9ed6");
	});

	it("has the options, the events and the audiences of the old platform", () => {
		expect(sha256(JSON.stringify(clueGrid.options))).toBe("120601c90e72d4ad6e99f1ed5db434ecae2b1c40a52dfaca4dffeb08d5ad5349");
		expect(sha256(JSON.stringify(clueGrid.events))).toBe("f02a6103b414d7cd82157ee40dfe70e8d69a1c40a76f7e2155c602479fa6b386");
		expect(JSON.stringify(clueGrid.head.audiences)).toBe('{"clue_key_dealt":["human"],"clue_intent":["human"],"clue_closed":["human"],"clue_game_scored":["human"]}');
		expect([clueGrid.id, clueGrid.head.summary]).toEqual(["lanterns", "The word-clue game Lanterns for two teams: a keeper gives one-word clues, the seekers reveal words on a grid of hidden owners."]);
	});

	it("keeps the four tools for residents, with their parameters", () => {
		expect(clueGrid.head.tools.map((tool) => [tool.name, tool.description, tool.for])).toEqual([
			["viewGrid", "lanterns/tools/viewGrid", ["resident"]],
			["giveClue", "lanterns/tools/giveClue", ["resident"]],
			["guess", "lanterns/tools/guess", ["resident"]],
			["endGuesses", "lanterns/tools/endGuesses", ["resident"]],
		]);
		// The text is `JSON.stringify` of the four parameter schemas of the old `index.ts` (lines 508 to 539).
		expect(sha256(JSON.stringify(clueGrid.head.tools.map((tool) => tool.parameters)))).toBe("d9d454b545262ee881573cd7ea85ce812a7619a41a37b59b366c56ef7de588b1");
	});
});
