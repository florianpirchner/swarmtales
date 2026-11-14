// SPDX-License-Identifier: Apache-2.0
/** The team channel with scripted residents: offline, no model. Carried from the old `team-channel.test.ts`. */
import { describe, expect, it } from "vitest";
import { Type } from "typebox";
import type { ActorDriver, Envelope } from "@swarmtales/contracts";
import { defineGame, defineHead, defineMechanic, reply } from "@swarmtales/sdk";
import { play, scriptedDriver, testKernel, type CallRecord, type PlannedCall } from "@swarmtales/testkit";
import { TeamChannelService, teamChannel } from "../src/index.ts";

/** A round opener: calls the cap reset like a game would. Its texts are inline (the old test kept them in prompt files). */
const rounds = defineMechanic(
	defineHead({
		id: "rounds",
		package: "@test/rounds",
		summary: "Opens a new round for a team.",
		requires: [TeamChannelService],
		tools: {
			newRound: { description: "Open a new round.", params: Type.Object({ team: Type.String() }), for: ["resident"] },
			newEpoch: { description: "Start a new epoch.", params: Type.Object({ team: Type.String() }), for: ["resident"] },
		},
	}),
	{
		tools: {
			newRound: {
				run: (params, ctx) => {
					ctx.call(TeamChannelService, "resetCap", { team: params.team });
					return reply("Opened.");
				},
			},
			newEpoch: {
				run: (params, ctx) => {
					ctx.call(TeamChannelService, "newEpoch", { team: params.team });
					return reply("Opened.");
				},
			},
		},
	},
);

const game = (teams: Readonly<Record<string, string[]>> = { red: ["A01", "A02"], blue: ["A03"] }) =>
	defineGame({
		id: "team-channel-test",
		seed: 3,
		residents: 4,
		mechanics: [teamChannel({ teams, maxPostsPerMove: 2 }), rounds()],
		grants: { resident: ["postTeam", "readTeam", "newRound", "newEpoch"] },
		scheduler: { id: "turns", options: { order: "roster" } },
		end: { ticks: 4 },
	});

type Script = Readonly<Record<string, readonly PlannedCall[]>>;
const post = (text: string): PlannedCall => ({ tool: "postTeam", params: { text } });
const read: PlannedCall = { tool: "readTeam", params: {} };
const SCRIPT: Script = {
	"0:A01": [post("one"), post("two"), post("three")],
	"0:A02": [read],
	"0:A03": [post("blue secret"), read],
	"0:A04": [post("spy"), read],
	"1:A01": [post("after cap"), { tool: "newRound", params: { team: "red" } }, post("new round")],
};

/** `tick:resident` to the calls of that activation; every other activation does nothing. */
function driver(seen?: string[], record?: CallRecord[], script: Script = SCRIPT): { readonly resident: ActorDriver } {
	return {
		resident: scriptedDriver((activation) => {
			const resident = activation.actor.slice(9);
			for (const note of activation.inputs) seen?.push(`${String(activation.tick)} ${resident} ${note.text}`);
			return script[`${String(activation.tick)}:${resident}`] ?? [];
		}, record),
	};
}

const payload = (event: Envelope): Readonly<Record<string, unknown>> => {
	const value = event.payload;
	return typeof value === "object" && value !== null ? Object.fromEntries(Object.entries(value)) : {};
};

const readReplies = (record: readonly CallRecord[], resident: string): string[] =>
	record.filter((entry) => entry.actor === `resident:${resident}` && entry.tool === "readTeam").map((entry) => (entry.outcome.ok ? entry.outcome.reply : entry.outcome.code));

/** Stand-in for the testkit's snapshot round trip (issue 30): the run resumed after `cut` ticks plays as the straight one. */
async function expectRoundTrip(script: Script, cut: number): Promise<void> {
	const straight = await play(game(), { drivers: driver(undefined, undefined, script) });
	const first = await play(game(), { drivers: driver(undefined, undefined, script), ticks: cut });
	const resume = { snapshot: structuredClone(first.kernel.snapshot()), log: structuredClone([...first.events]) };
	const rest = await play(game(), { drivers: driver(undefined, undefined, script), resume });
	expect(rest.events).toEqual(straight.events);
	expect(rest.kernel.snapshot()).toEqual(straight.kernel.snapshot());
}

describe("team-channel", () => {
	it("keeps the channels private, caps posts per round and reopens them with resetCap", async () => {
		const record: CallRecord[] = [];
		const seen: string[] = [];
		const run = await play(game(), { drivers: driver(seen, record) });
		const refused = run.events.filter((event) => event.type === "tool_refused").map((event) => `${event.actor.slice(9)} ${String(payload(event).code)}`);
		// A01 is capped at two posts in tick 0 and in tick 1 until newRound; A04 is in no team.
		expect(refused).toEqual(["A01 POST_CAP", "A04 NOT_TEAM_MEMBER", "A04 NOT_TEAM_MEMBER", "A01 POST_CAP"]);
		expect(run.events.filter((event) => event.type === "team_post").map((event) => `${String(payload(event).team)}/${String(payload(event).from)}/${String(payload(event).text)}`)).toEqual([
			"red/A01/one",
			"red/A01/two",
			"blue/A03/blue secret",
			"red/A01/new round",
		]);
		expect(readReplies(record, "A02")[0]).toBe("A01: one\nA01: two");
		expect(readReplies(record, "A03")[0]).toBe("A03: blue secret");
		expect(readReplies(record, "A03")[0]).not.toContain("A01");
		// A02 is told of the new posts at its next turn; the author is not told of its own.
		expect(seen.some((line) => line.startsWith("1 A02 Team message from A01: after cap")) || seen.some((line) => line.includes("A02") && line.includes("new round"))).toBe(true);
		expect(seen.filter((line) => line.includes(" A01 "))).toEqual([]);
		// Not in the old test: the texts a model reads, and the fact.
		expect(record.filter((entry) => entry.tool === "postTeam").map((entry) => (entry.outcome.ok ? entry.outcome.reply : entry.outcome.detail))[2]).toBe("no more posts this round");
		expect(seen).toContain("1 A02 Team message from A01: new round");
		expect(run.kernel.fact("team-channel.posts")).toEqual({ red: 3, blue: 1 });
	});

	it("shows readTeam only the posts of the current epoch, and announces none of the old ones", async () => {
		const epochs: Script = {
			"0:A01": [post("game one plan")],
			"0:A03": [post("blue game one")],
			"1:A01": [{ tool: "newEpoch", params: { team: "red" } }],
			"1:A02": [read],
			"2:A01": [post("game two plan")],
			"2:A02": [read],
		};
		const record: CallRecord[] = [];
		const seen: string[] = [];
		await play(game(), { drivers: driver(seen, record, epochs) });
		const replies = readReplies(record, "A02");
		expect(replies).toHaveLength(2);
		expect(replies[0]).not.toContain("game one plan");
		expect(replies[1]).toBe("A01: game two plan");
		// The other team's epoch did not move: it still has its post.
		expect(seen.filter((line) => line.includes("game one plan") && line.startsWith("2 A02"))).toEqual([]);
		for (const cut of [1, 2, 3]) await expectRoundTrip(epochs, cut);
	});

	it("is deterministic and survives a snapshot round trip", async () => {
		expect((await play(game(), { drivers: driver() })).events).toEqual((await play(game(), { drivers: driver() })).events);
		for (const cut of [1, 2, 3]) await expectRoundTrip(SCRIPT, cut);
	});

	it("documents every option and refuses a resident in two teams", () => {
		const properties = Object.entries(teamChannel.options.properties);
		expect(properties.filter(([, schema]) => !("description" in schema && typeof schema.description === "string"))).toEqual([]);
		expect(properties.map(([key]) => key)).toEqual(["teams", "maxPostsPerMove", "notify"]);
		expect(() => testKernel(game({ red: ["A01", "A02"], blue: ["A01"] }))).toThrow('team-channel: A01 is in teams "red" and "blue"');
	});
});
