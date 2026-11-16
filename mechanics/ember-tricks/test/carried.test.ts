// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The byte-identity list of the port (M4 specification 2.2): the sha256 of every carried prompt file, of the options
 * schema and of the event schemas, and the tools with their parameters. The hashes were computed from the files of
 * `legacy` (`mechanics/ember-tricks/`: the prompt files as they are; the options of `src/index.ts` and the events of
 * `src/events.ts` evaluated with the same typebox 1.3.27).
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { trickPlay } from "../src/index.ts";

/** The id this platform renamed (M6-06), from the id the old platform wrote to the id here. */
const RENAMED = { "trick-play": "ember-tricks" } as const;
/** A carried text as the old platform wrote it: the new id back to the old one where it names the mechanic (`"<id>/...`, `"<id>.`, `id: <id>/`). */
const asOld = (text: string): string => Object.entries(RENAMED).reduce((done, [old, now]) => done.replace(new RegExp(`(?<=^id: |")${now}(?=[./])`, "gm"), old), text);
const sha256 = (value: string | Buffer): string => createHash("sha256").update(asOld(value.toString())).digest("hex");
const PROMPTS = join(import.meta.dirname, "..", "prompts");
const filesOf = (folder: string): readonly string[] => readdirSync(folder, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? filesOf(join(folder, entry.name)) : [join(folder, entry.name)]));

const OLD_PROMPTS: Readonly<Record<string, string>> = {
	"ember-tricks/tools/nameTrump.md": "523245937df238f2e5f6dcce96c1c4b5e6edb3b904b3fc0f779fe9ddcb70df65",
	"ember-tricks/tools/placeBid.md": "a2d8b5e1a1e03ea0338e15a80b8b0d3f54513e2b00873fba1051a1ff6efeaab8",
	"ember-tricks/tools/playCard.md": "5e54f4482423e7316fba9b0c00a45eb665a5b790f944cd68b94b7805a48960d3",
	"ember-tricks/tools/vetoLead.md": "7190411d885ca78b2aab97e4091b7281ae7a2c44e953121df50746a9e45daa15",
	"ember-tricks/tools/viewTable.md": "e38d7d460c4285977e7fb84be0bdda196a4e6e77ac33361d7e4403c527a4f622",
};

describe("carried byte for byte", () => {
	it("has the prompt files of the old platform and no other", () => {
		const found = Object.fromEntries(filesOf(PROMPTS).map((file) => [relative(PROMPTS, file).split("\\").join("/"), sha256(readFileSync(file))]));
		expect(found).toEqual(OLD_PROMPTS);
		expect(JSON.stringify(trickPlay.head.prompts)).toBe('{"ember-tricks/tools/viewTable":[],"ember-tricks/tools/placeBid":[],"ember-tricks/tools/nameTrump":[],"ember-tricks/tools/playCard":[],"ember-tricks/tools/vetoLead":[]}');
	});

	it("has the tools, the options and the events of the old platform", () => {
		expect(trickPlay.head.tools.map((tool) => [tool.name, tool.description, tool.for, tool.free, JSON.stringify(tool.parameters)])).toEqual([
			["viewTable", "ember-tricks/tools/viewTable", ["resident"], true, '{"type":"object","properties":{}}'],
			["placeBid", "ember-tricks/tools/placeBid", ["resident"], false, '{"type":"object","required":["tricks"],"properties":{"tricks":{"type":"integer","minimum":0,"description":"The exact number of tricks you will take this round."}}}'],
			["nameTrump", "ember-tricks/tools/nameTrump", ["resident"], false, '{"type":"object","required":["suit"],"properties":{"suit":{"type":"string","description":"The suit\'s name, for example \\"Ember\\"."}}}'],
			["playCard", "ember-tricks/tools/playCard", ["resident"], false, '{"type":"object","required":["card"],"properties":{"card":{"type":"string","description":"The card, suit and rank, for example \\"Ember 7\\"."}}}'],
			["vetoLead", "ember-tricks/tools/vetoLead", ["resident"], false, '{"type":"object","properties":{}}'],
		]);
		// `quietEnds` (M4-69, P475) is new on this platform and optional: without it the schema is the old one.
		const { quietEnds: quiet, ...carried } = trickPlay.options.properties;
		expect(quiet).toMatchObject({ type: "boolean" });
		expect(sha256(JSON.stringify({ ...trickPlay.options, properties: carried }))).toBe("02f9ee9aba834146d1ce1b3992a0e078b917867de630fb3369f194f8a4ce7c9d");
		expect(sha256(JSON.stringify(trickPlay.events))).toBe("a40554012776723a90130dfb26a85a62ee82b3667851b8690330406958a3e789");
		expect(JSON.stringify(trickPlay.head.audiences)).toBe("{}");
		expect([trickPlay.id, trickPlay.head.summary]).toEqual(["ember-tricks", "A trick-taking game with exact bids, a trump named by the lowest bidder, follow-suit tricks, a lead veto and hit-or-miss scoring."]);
	});
});
