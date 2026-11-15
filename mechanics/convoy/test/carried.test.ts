// SPDX-License-Identifier: Apache-2.0
/**
 * The byte-identity list of the port (M4 specification 2.2): the sha256 of every carried prompt file, of the options
 * schema and of the event schemas, computed on the old platform (branch `legacy`), and the tools with their
 * parameters as the old body declared them.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { convoy } from "../src/index.ts";

const sha256 = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");
const PROMPTS = join(import.meta.dirname, "..", "prompts");
const filesOf = (folder: string): readonly string[] => readdirSync(folder, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? filesOf(join(folder, entry.name)) : [join(folder, entry.name)]));

const OLD_PROMPTS: Readonly<Record<string, string>> = {
	"convoy/game-head.md": "2de9206f733e4c0b45654e1e1f16e8d2ac3c92880207da65f2d06ed2389f6fd5",
	"convoy/role-loyal.md": "0ada44cefa51732be2b32af654a7a600b6695d707e9f81366abf28b5ab0abbfc",
	"convoy/role-saboteur.md": "ea3ed61c70974f3bbec94748739ef8fbd0adefe3428e3adcde323462798aaa02",
	"convoy/rules.md": "25cc2b397f60c3b1239969a38287f0f7371fa7b8ddce35a7e5ab7e5fc2674673",
	"convoy/task-accuse.md": "1cdb9b6a992bb3ca3da78ff6ab359547f52449761fdad9fcb88ca14631a92f15",
	"convoy/task-play.md": "0633b7d35c4d14eac829c8536cfe4fd26e659ffc35b7a12ee4839e10d7098aec",
	"convoy/task-propose.md": "fb06bca42bb4b5c2c706334e44ecf2bde5c9b37c76e133a8a35339ef13b0cc4f",
	"convoy/task-talk.md": "f88b6e81ac208ab1d9ee7a1a50da4594ac48d1dcff51b6b103d5f5eaf58d3304",
	"convoy/task-vote.md": "e5850e2e27e93b7c466f664e69fe7e147951573fd8d2925c41428b216678ebba",
	"convoy/tools/accuse.md": "2322b5a45eee17b0e35fe224b04f4ff555d997b95341fea124aa9be395c9acc7",
	"convoy/tools/audit.md": "d369c38c4eadcdb9abb5a371eb6c469f80f4c68fc0e01cf68894ae8f140eea2b",
	"convoy/tools/playCrewCard.md": "0d1ddd9ebb09a938ca04d2d4d8624805c4eb2d4647a2dfc1b027262b169febdb",
	"convoy/tools/proposeCrew.md": "dbd4696630b2aca630986cc32b823f2b15bbd6c2deaec0f00365de9f9d5e0cfd",
	"convoy/tools/speak.md": "87490d2ee5b68bb3c07a8dfd9a9d36b78b33047308d2092833cc26ec5d77d5b5",
	"convoy/tools/viewConvoy.md": "566004a3e53d7d1d048a2c4439d516d1dc64a67f287bdd9023de0a9aa4e737fd",
	"convoy/tools/voteConfidence.md": "0fc9a0de1f5af54e6f4962136af8537afac7bc1984d6723d9939a4c8979e8602",
};

const SEAT = '{"type":"string","minLength":1,"maxLength":8}';
const reason = (text: string): string => `"reason":{"type":"string","maxLength":400,"description":"${text}"}`;

describe("carried byte for byte", () => {
	it("has the prompt files of the old platform and no other", () => {
		const found = Object.fromEntries(filesOf(PROMPTS).map((file) => [relative(PROMPTS, file).split("\\").join("/"), sha256(readFileSync(file))]));
		expect(found).toEqual(OLD_PROMPTS);
		expect(sha256(JSON.stringify(convoy.head.prompts))).toBe("83b056db107e8b77d05da3ca8e791ac12488389bdd1a22eb619829bee7543dcc");
	});

	it("has the tools, the options, the events and the audiences of the old platform", () => {
		expect(convoy.head.tools.map((tool) => [tool.name, tool.description, tool.for, JSON.stringify(tool.parameters)])).toEqual([
			["viewConvoy", "convoy/tools/viewConvoy", ["resident"], '{"type":"object","properties":{}}'],
			["proposeCrew", "convoy/tools/proposeCrew", ["resident"], `{"type":"object","required":["crew"],"properties":{"crew":{"type":"array","items":${SEAT},"minItems":1,"maxItems":12,"description":"The seats of the crew (for example [\\"A01\\", \\"A04\\"]); you may name yourself."},${reason("A short reason, for the record (not shown to the table; speak to explain).")}}}`],
			["speak", "convoy/tools/speak", ["resident"], '{"type":"object","required":["text"],"properties":{"text":{"type":"string","minLength":1,"maxLength":1000,"description":"What you say to the whole table."}}}'],
			["voteConfidence", "convoy/tools/voteConfidence", ["resident"], `{"type":"object","required":["vote"],"properties":{"vote":{"anyOf":[{"type":"string","const":"yes"},{"type":"string","const":"no"}]},${reason("A short reason, for the record (not shown to the table).")}}}`],
			["playCrewCard", "convoy/tools/playCrewCard", ["resident"], `{"type":"object","required":["card"],"properties":{"card":{"anyOf":[{"type":"string","const":"safe"},{"type":"string","const":"damage"}]},${reason("A short reason, for the record (never shown to the table).")}}}`],
			["audit", "convoy/tools/audit", ["resident"], '{"type":"object","required":["seat","stage"],"properties":{"seat":{"type":"string","minLength":1,"maxLength":8,"description":"A seat that was on the crew of that stage."},"stage":{"type":"integer","minimum":1,"description":"An earlier stage."}}}'],
			["accuse", "convoy/tools/accuse", ["resident"], `{"type":"object","required":["seats"],"properties":{"seats":{"type":"array","items":${SEAT},"minItems":1,"maxItems":6,"description":"The seats you believe are the saboteurs."},${reason("A short reason, for the record.")}}}`],
		]);
		expect(sha256(JSON.stringify(convoy.options))).toBe("b1981ff7e1c45f14030f11c7c47e43a9b1759f38548cc41bc7d3ff2e3be13f95");
		expect(sha256(JSON.stringify(convoy.events))).toBe("1303bb0d2c58ec77b8c07a973889fb5875a01bd926737ca04393bf984adc333d");
		expect(JSON.stringify(convoy.head.audiences)).toBe('{"convoy_game_started":["human"],"convoy_card_played":["human"],"convoy_accused":["human"],"convoy_game_scored":["human"]}');
		expect([convoy.id, convoy.head.summary]).toEqual(["convoy", "The hidden-role card game Convoy for solo seats: secret saboteurs, crews from a rotating lead, votes of confidence, sealed safe or damage cards revealed as a count, one audit per game."]);
	});
});
