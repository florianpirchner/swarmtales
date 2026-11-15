// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The byte-identity list of the port (M4 specification 2.2): the sha256 of every carried prompt file, of the prompt
 * keys, of the options schema, of the event schemas and of the audiences, generated on the old platform (commit
 * 87844a76), and the tools as the old platform declared them.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { chess } from "../src/index.ts";

const sha256 = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");
const PROMPTS = join(import.meta.dirname, "..", "prompts");
const filesOf = (folder: string): readonly string[] => readdirSync(folder, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? filesOf(join(folder, entry.name)) : [join(folder, entry.name)]));

const OLD_PROMPTS: Readonly<Record<string, string>> = {
	"chess/advise.md": "feac1271944a15045a4c716f7b657355341b609463168bb5d4e6f642c9d1480c",
	"chess/cap-settled.md": "9fcf0f879078dafdef658e7aeb29c381d737698bf19ba4176b038e9e3a9810e8",
	"chess/check.md": "33e9d1a78feb4f3316e25c78adeba83c7bf5efd1c0336777baa80136b7d9c46d",
	"chess/coach-clean.md": "c7aff0b87eef34dea44f2cd48bdb8567a1035742ce41da6d94e3e4b6b267eed2",
	"chess/coach-move.md": "62211402afa856c37a6b146154db4c0dfd4eb38931cfeb745296aa97f38aa8ce",
	"chess/coach-review.md": "ca671c1e9c98742d591eb94c128f74260621cb7596c661dde72b5b55472f74e9",
	"chess/forfeit-warning.md": "9d7a477d946232956e4dcb5db8b42957850a71a8af2b582a459dcaff1427b199",
	"chess/fresh-context.md": "3eeedf952a05008d632b2c4fa2730c76cb2981693ac82b48ec5abf82b6be5f62",
	"chess/how-to-move.md": "d4fbfdfa4ccf7f0dd64ba953e6d403d6a304fe9a650ae30ccdb2c067936cc263",
	"chess/last-move.md": "1249da9e0d857a658b5aff68c27bbd4ff2e35490eca81788b7fe6b82c1e79f06",
	"chess/last-note.md": "42dcb6b68601a9a301194391059ff90366b363e86eae65c09f6b6ceee4eca92b",
	"chess/legal-moves.md": "0dbaa5136a72aecc886a9d1ff9b7089b693a19d5a1a9f1beb229aa88bab89168",
	"chess/rules.md": "a0d799d6fe6787ecffeca5d236d97a12f497b072912a2ca83b2ec6cce791aedf",
	"chess/still-your-move.md": "e602a6d40119522764f305ab9d14b1a0770de275fc50d2be10bbaf69542734ea",
	"chess/threats.md": "0187f633f9bb5b174d6dfa8179768841f6a6dddf6ca3becf21e92b6966fa35a4",
	"chess/tools/playMove.md": "4b8fec58c8b6b90234f98cbac909bb90eb600ad4b87a467c9a4328f5deb18ea3",
	"chess/tools/resign.md": "6d6da8b6a34cffae4ce3b6a2bb00055e61cab72c62153699615caf632b03d0b2",
	"chess/tools/viewBoard.md": "6ea8306a59696c57e88df3ff72709887ded406e010ac837e2af844c25651278a",
	"chess/your-move.md": "aecf8058334b68075822a04f94338d62df2ada239e2fb16a1d756bd797c758a1",
};

const REASON = '"reason":{"type":"string","maxLength":400,"description":"A short reason, for the record."}';

describe("carried byte for byte", () => {
	it("has the prompt files of the old platform and no other", () => {
		const found = Object.fromEntries(filesOf(PROMPTS).map((file) => [relative(PROMPTS, file).split("\\").join("/"), sha256(readFileSync(file))]));
		expect(found).toEqual(OLD_PROMPTS);
		expect(sha256(JSON.stringify(chess.head.prompts))).toBe("5ce45682f2c4a5bc6aacdcc5acc671c381d4e8981b59bf85f1ed41e7810eb0b9");
	});

	it("has the options, the events and the audiences of the old platform", () => {
		expect(sha256(JSON.stringify(chess.options))).toBe("42bc605308924132e6d5a51b5d3d64aa9bf40fa63cfeb2b6753a48fdaf42ece1");
		expect(sha256(JSON.stringify(chess.events))).toBe("792f487d0fb8583ed7be5778eaf3e4abc998dc8c2a5ab6a3e6ff03d76b29c39d");
		expect(sha256(JSON.stringify(chess.head.audiences))).toBe("64700c8f1967bb87f45c02fd5d499aefdf8e52f440ffff8fadb1afb4330fe5b5");
		expect([chess.id, chess.head.summary]).toEqual(["chess", "A match of chess games between two solo seats; chess.js checks every move and ends the games."]);
	});

	it("keeps the three tools for residents, each with a sample for the fake driver", () => {
		expect(chess.head.tools.map((tool) => [tool.name, tool.description, tool.for, tool.sampled])).toEqual([
			["viewBoard", "chess/tools/viewBoard", ["resident"], true],
			["playMove", "chess/tools/playMove", ["resident"], true],
			["resign", "chess/tools/resign", ["resident"], true],
		]);
		expect(JSON.stringify(chess.head.tools.map((tool) => tool.parameters))).toBe(
			`[{"type":"object","properties":{}},{"type":"object","required":["move"],"properties":{"move":{"type":"string","minLength":1,"maxLength":40,"description":"The move: SAN (Nf3, exd5, O-O, e8=Q) or from and to squares (g1f3, e7e8q)."},${REASON}}},{"type":"object","properties":{${REASON}}}]`,
		);
	});
});
