// SPDX-License-Identifier: Apache-2.0
/**
 * The byte-identity list of the port (specification of M1, section 8): the prompt files, the tools and the events
 * of `team-channel` are what the old platform had. The sha256 values are those of the files of the old platform
 * (`sha256sum mechanics/team-channel/prompts/team-channel/**`).
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { teamChannel } from "../src/index.ts";

const PROMPTS = fileURLToPath(new URL("../prompts", import.meta.url));

/** Prompt id to the sha256 of its file on the old platform. */
const FILES: Readonly<Record<string, string>> = {
	"team-channel/empty": "1866c9e5395e0a6e687088fbd4bd4a9f8b9252fd7e9a79619115ba3407d063de",
	"team-channel/notice": "7f35dd8f89353b301783628ef50159a349bc98940598b7512cededd269d1d236",
	"team-channel/posted": "ab5f62c1d743a8bf2276cf4a1499ceb1f4be2c85ea677d0583e714cac4ec7194",
	"team-channel/tools/postTeam": "3e66dcbbd5c9bf58a7b5b9699c74a94db9eb7769c6cf10c769cab6195300830a",
	"team-channel/tools/readTeam": "de33c289e9c593e6e96e751070b34f036ba14e4bfea3ad164417cf505c620ea6",
};

describe("the carried team-channel mechanic", () => {
	it("holds exactly the five prompt files of the old platform, byte for byte, and declares each", () => {
		const found = readdirSync(PROMPTS, { recursive: true, encoding: "utf8" }).filter((path) => path.endsWith(".md")).map((path) => path.replaceAll("\\", "/").slice(0, -3));
		expect(found.sort()).toEqual(Object.keys(FILES).sort());
		for (const [id, sha256] of Object.entries(FILES)) expect([id, createHash("sha256").update(readFileSync(`${PROMPTS}/${id}.md`)).digest("hex")]).toEqual([id, sha256]);
		expect(Object.keys(teamChannel.head.prompts).sort()).toEqual(Object.keys(FILES).sort());
	});

	it("declares the old tools, in the old order, with the old parameters, grants and events", () => {
		expect(teamChannel.head.tools.map((tool) => [tool.name, tool.description, JSON.stringify(tool.parameters), tool.for])).toEqual([
			["postTeam", "team-channel/tools/postTeam", '{"type":"object","required":["text"],"properties":{"text":{"type":"string","minLength":1}}}', ["resident"]],
			["readTeam", "team-channel/tools/readTeam", '{"type":"object","properties":{}}', ["resident"]],
		]);
		expect(Object.keys(teamChannel.events)).toEqual(["team_post"]);
		expect([teamChannel.id, teamChannel.head.provides.map((service) => service.name)]).toEqual(["team-channel", ["team-channel"]]);
	});
});
