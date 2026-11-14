// SPDX-License-Identifier: Apache-2.0
/**
 * The byte-identity list of the port (specification of M1, section 8): the prompt files, the tools and the events
 * of `consensus` are what the old platform had. The sha256 values are those of the files of the old platform
 * (`sha256sum mechanics/consensus/prompts/consensus/**`), and the forfeits were recorded there by playing the old
 * toy game of `consensus.test.ts` with the same options and scripts.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { consensus } from "../src/index.ts";
import { move, playToy, propose, vote, type Gate, type Script } from "./toy.ts";

const PROMPTS = fileURLToPath(new URL("../prompts", import.meta.url));

/** Prompt id to the sha256 of its file on the old platform. */
const FILES: Readonly<Record<string, string>> = {
	"consensus/go-ahead": "c2eb7fde4abe4a2749d7df8e6857f7cb6a88345cc793efda76335db67545b125",
	"consensus/proposed": "dc4703bc86803289184145941d2a9adc20f93b34a430cb435125217b350e7521",
	"consensus/reached": "7b95bb3741bdd8aa96e0bed0d9e5454ad1de2e45b76bcf93bda53843b4de2d47",
	"consensus/rejected-notice": "9957187e30f34aab0cc0f8079b3db717d1733f266e978e8501f609f0ecbfd221",
	"consensus/rejected": "ee6a65163fe0e3e6f968cc1a3dfb542ae4032cc28f8c2ff3ab56eafeca224706",
	"consensus/vote-recorded": "9e604a9dfccd65449dea3707fa583657524ea59495afbdf0468e0acf40ec0c70",
	"consensus/vote-request": "88472f4cb1251270b3d16537a00fc345a1412dc58981d349eb6e86f7fd1cff6b",
	"consensus/tools/castVote": "8d42a5ba84065e7588f06dd5241152be0a5292aaea7e53693b5d59b4792e75a3",
	"consensus/tools/proposeMove": "72c4672141007d076f734a3d886b880e746fa364ed2252069c4b58d4f4badcdc",
};

const AGREED: Script = { "0:1:A01": [propose(4)], "0:1:A02": [vote(true)], "0:1:A03": [vote(true)], "0:2:A01": [move(4)] };
const INVALID = "3 forfeits in a row and no agreed move: the teams did not play";

/** Options, script and what the old platform wrote: tick, event type and payload of every forfeit and move. */
const RECORDED: readonly (readonly [Gate, Script, readonly unknown[]])[] = [
	[{ maxRounds: 2 }, {}, [[1, "move_played", { team: "red", cell: 5, forfeit: true }], [1, "consensus_forfeited", { team: "red", cell: 5, rounds: 2 }], [3, "move_played", { team: "blue", cell: 2, forfeit: true }], [3, "consensus_forfeited", { team: "blue", cell: 2, rounds: 2 }]]],
	[{ maxRounds: 2, seed: 99 }, {}, [[1, "move_played", { team: "red", cell: 1, forfeit: true }], [1, "consensus_forfeited", { team: "red", cell: 1, rounds: 2 }], [3, "move_played", { team: "blue", cell: 8, forfeit: true }], [3, "consensus_forfeited", { team: "blue", cell: 8, rounds: 2 }]]],
	[{ maxRounds: 2, ticks: 5 }, AGREED, [[0, "move_played", { team: "red", cell: 4, forfeit: false }], [2, "move_played", { team: "blue", cell: 2, forfeit: true }], [2, "consensus_forfeited", { team: "blue", cell: 2, rounds: 2 }], [4, "move_played", { team: "red", cell: 5, forfeit: true }], [4, "consensus_forfeited", { team: "red", cell: 5, rounds: 2 }]]],
	[
		{ maxRounds: 1, maxConsecutiveForfeits: 3, ticks: 12 },
		{},
		[[0, "move_played", { team: "red", cell: 2, forfeit: true }], [0, "consensus_forfeited", { team: "red", cell: 2, rounds: 1 }], [1, "move_played", { team: "blue", cell: 5, forfeit: true }], [1, "consensus_forfeited", { team: "blue", cell: 5, rounds: 1 }], [2, "move_played", { team: "red", cell: 1, forfeit: true }], [2, "consensus_forfeited", { team: "red", cell: 1, rounds: 1 }], [2, "match_invalid", { reason: INVALID, forfeits: 3 }]],
	],
];

describe("the carried consensus mechanic", () => {
	it("holds exactly the nine prompt files of the old platform, byte for byte, and declares each", () => {
		const found = readdirSync(PROMPTS, { recursive: true, encoding: "utf8" }).filter((path) => path.endsWith(".md")).map((path) => path.replaceAll("\\", "/").slice(0, -3));
		expect(found.sort()).toEqual(Object.keys(FILES).sort());
		for (const [id, sha256] of Object.entries(FILES)) expect([id, createHash("sha256").update(readFileSync(`${PROMPTS}/${id}.md`)).digest("hex")]).toEqual([id, sha256]);
		expect(Object.keys(consensus.head.prompts).sort()).toEqual(Object.keys(FILES).sort());
	});

	it("declares the old tools, in the old order, with the old parameters, grants and events", () => {
		expect(consensus.head.tools.map((tool) => [tool.name, tool.description, JSON.stringify(tool.parameters), tool.for])).toEqual([
			["proposeMove", "consensus/tools/proposeMove", '{"type":"object","required":["cell","reason"],"properties":{"cell":{"type":"integer"},"reason":{"type":"string"}}}', ["resident"]],
			["castVote", "consensus/tools/castVote", '{"type":"object","required":["agree","reason"],"properties":{"agree":{"type":"boolean"},"reason":{"type":"string"}}}', ["resident"]],
		]);
		expect(Object.keys(consensus.events)).toEqual(["move_proposed", "vote_cast", "consensus_reached", "consensus_forfeited", "consensus_deadlocked", "match_invalid"]);
		expect([consensus.id, consensus.head.requires.map((service) => service.name), consensus.head.provides.map((service) => service.name)]).toEqual(["consensus", ["consensus-source"], ["consensus"]]);
	});

	it.each(RECORDED)("plays %j as the old platform did: the same seeded forfeits at the same ticks", async (gate, script, recorded) => {
		const run = await playToy(gate, script);
		const played = run.events.filter((event) => ["consensus_forfeited", "match_invalid", "move_played"].includes(event.type)).map((event) => [event.tick, event.type, event.payload]);
		expect(played).toEqual(recorded);
	});
});
