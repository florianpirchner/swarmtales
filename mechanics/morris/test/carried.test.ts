// SPDX-License-Identifier: Apache-2.0
/**
 * The byte-identity list of the port (M4 specification 2.2): the sha256 of every carried prompt file, of the prompt
 * keys, of the options schema and of the event schemas, generated on the old platform (commit 87844a76), and the
 * tools as the old platform declared them.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { morris } from "../src/index.ts";

const sha256 = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");
const PROMPTS = join(import.meta.dirname, "..", "prompts");
const filesOf = (folder: string): readonly string[] => readdirSync(folder, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? filesOf(join(folder, entry.name)) : [join(folder, entry.name)]));

const OLD_PROMPTS: Readonly<Record<string, string>> = {
	"morris/tools/playMove.md": "702cbbc1499d1a6c965a12e7509c84d20debbdafdf0081b3eda5365acf977241",
	"morris/tools/viewBoard.md": "93413c74ae325fdaab848961b715f1c6e4e885c05b94518883f958267b1638fc",
};

describe("carried byte for byte", () => {
	it("has the prompt files of the old platform and no other", () => {
		const found = Object.fromEntries(filesOf(PROMPTS).map((file) => [relative(PROMPTS, file).split("\\").join("/"), sha256(readFileSync(file))]));
		expect(found).toEqual(OLD_PROMPTS);
		expect(sha256(JSON.stringify(morris.head.prompts))).toBe("bdb59beb6faac52ac3b516111db287247e65b3f66c33742c0b9fd01da7cd9acd");
	});

	it("has the options and the events of the old platform", () => {
		expect(sha256(JSON.stringify(morris.options))).toBe("cca47d9f1848a9bf9fe2761b35139beb58fd7cc117ddb24b94d2d555506ec870");
		expect(sha256(JSON.stringify(morris.events))).toBe("09c262954bb33491d5494f442c1f9b55460a70ba463d19863e1c8a0bf808f3d7");
		expect([morris.id, morris.head.summary]).toEqual(["morris", "Nine men's morris between two teams: placing, moving and flying, mills and removals, the captain of the turn and a match of several games."]);
	});

	it("keeps the two tools for residents, each with a sample for the fake driver", () => {
		expect(morris.head.tools.map((tool) => [tool.name, tool.description, tool.for, tool.sampled])).toEqual([
			["viewBoard", "morris/tools/viewBoard", ["resident"], true],
			["playMove", "morris/tools/playMove", ["resident"], true],
		]);
		expect(JSON.stringify(morris.head.tools.map((tool) => tool.parameters))).toBe(
			'[{"type":"object","properties":{}},{"type":"object","required":["move"],"properties":{"move":{"type":"integer","minimum":1,"description":"The move number: a point 1-24 to place on or to remove, or from * 100 + to to move a piece."}}}]',
		);
	});
});
