/** The team channel with scripted agents: offline, no model. */
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { Type } from "typebox";
import type { EventEnvelope, Turn, TurnTaker } from "@swarmtales/contracts";
import { createPromptLookup } from "@swarmtales/prompts";
import { defineCoreStory, defineMechanic, reply, type HostOptions } from "@swarmtales/kernel";
import { checkDeterminism, checkOptionsDocumented, checkSnapshotRoundTrip, playStory, scriptedAgent, type CallRecord, type PlannedCall } from "@swarmtales/testkit";
import { TeamChannelApi, teamChannel } from "@swarmtales/mechanic-team-channel";

/** A round opener: calls the cap reset like a game would. */
const rounds = defineMechanic(
	{
		id: "rounds",
		summary: "Opens a new round for a team.",
		requires: [TeamChannelApi],
		options: Type.Object({}),
		state: () => undefined,
		events: {},
		prompts: { "rounds/tools/newRound": [], "rounds/tools/newEpoch": [], "rounds/opened": [] },
	},
	(kit) => ({
		tools: [
			kit.tool({
				name: "newRound",
				description: "rounds/tools/newRound",
				parameters: Type.Object({ team: Type.String() }),
				suggest: ["resident"],
				execute: (params, ctx) => {
					ctx.call(TeamChannelApi, "resetCap", { team: params.team });
					return reply(ctx.prompt("rounds/opened", {}));
				},
			}),
			kit.tool({
				name: "newEpoch",
				description: "rounds/tools/newEpoch",
				parameters: Type.Object({ team: Type.String() }),
				suggest: ["resident"],
				execute: (params, ctx) => {
					ctx.call(TeamChannelApi, "newEpoch", { team: params.team });
					return reply(ctx.prompt("rounds/opened", {}));
				},
			}),
		],
	}),
);

const PROMPTS = fileURLToPath(new URL("prompts", import.meta.url));
const REPO = fileURLToPath(new URL("../../../mechanics", import.meta.url));

function options(): HostOptions {
	const story = defineCoreStory({
		id: "team-channel-test",
		seed: 3,
		minutes: 4,
		residents: 4,
		mechanics: [teamChannel.with({ teams: { red: ["A01", "A02"], blue: ["A03"] }, maxPostsPerMove: 2 }), rounds.with({})],
		grants: { resident: ["postTeam", "readTeam", "newRound", "newEpoch"] },
		turns: { order: (view) => view.residents },
	});
	return { story, prompts: createPromptLookup({ mechanics: { rounds: PROMPTS, "team-channel": `${REPO}/team-channel/prompts` } }) };
}

const post = (text: string): PlannedCall => ({ tool: "postTeam", params: { text } });
const read: PlannedCall = { tool: "readTeam", params: {} };
const SCRIPT: Readonly<Record<string, readonly PlannedCall[]>> = {
	"0:A01": [post("one"), post("two"), post("three")],
	"0:A02": [read],
	"0:A03": [post("blue secret"), read],
	"0:A04": [post("spy"), read],
	"1:A01": [post("after cap"), { tool: "newRound", params: { team: "red" } }, post("new round")],
};

function agent(seen?: string[], record?: CallRecord[], script: Readonly<Record<string, readonly PlannedCall[]>> = SCRIPT): TurnTaker {
	const plan = (turn: Turn): readonly PlannedCall[] => {
		for (const note of turn.inputs) seen?.push(`${String(turn.minute)} ${turn.resident} ${note.text}`);
		return script[`${String(turn.minute)}:${turn.resident}`] ?? [];
	};
	return scriptedAgent(plan, record);
}

const payload = (event: EventEnvelope): Readonly<Record<string, unknown>> => {
	const value = event.payload;
	return typeof value === "object" && value !== null ? Object.fromEntries(Object.entries(value)) : {};
};

describe("team-channel", () => {
	it("keeps the channels private, caps posts per round and reopens them with resetCap", async () => {
		const record: CallRecord[] = [];
		const seen: string[] = [];
		const run = await playStory(options(), agent(seen, record));
		const refused = run.events.filter((event) => event.type === "tool_refused").map((event) => `${event.actor.slice(9)} ${String(payload(event).code)}`);
		// A01 is capped at two posts in minute 0 and in minute 1 until newRound; A04 is in no team.
		expect(refused).toEqual(["A01 POST_CAP", "A04 NOT_TEAM_MEMBER", "A04 NOT_TEAM_MEMBER", "A01 POST_CAP"]);
		expect(run.events.filter((event) => event.type === "team_post").map((event) => `${String(payload(event).team)}/${String(payload(event).from)}/${String(payload(event).text)}`)).toEqual([
			"red/A01/one",
			"red/A01/two",
			"blue/A03/blue secret",
			"red/A01/new round",
		]);
		const replies = (resident: string): string[] => record.filter((entry) => entry.resident === resident && entry.tool === "readTeam").map((entry) => (entry.outcome.ok ? entry.outcome.reply : entry.outcome.code));
		expect(replies("A02")[0]).toBe("A01: one\nA01: two");
		expect(replies("A03")[0]).toBe("A03: blue secret");
		expect(replies("A03")[0]).not.toContain("A01");
		// A02 is told of the new posts at its next turn; the author is not told of its own.
		expect(seen.some((line) => line.startsWith("1 A02 Team message from A01: after cap")) || seen.some((line) => line.includes("A02") && line.includes("new round"))).toBe(true);
		expect(seen.filter((line) => line.includes(" A01 "))).toEqual([]);
	});

	it("shows readTeam only the posts of the current epoch, and announces none of the old ones", async () => {
		const epochs: Readonly<Record<string, readonly PlannedCall[]>> = {
			"0:A01": [post("game one plan")],
			"0:A03": [post("blue game one")],
			"1:A01": [{ tool: "newEpoch", params: { team: "red" } }],
			"1:A02": [read],
			"2:A01": [post("game two plan")],
			"2:A02": [read],
		};
		const record: CallRecord[] = [];
		const seen: string[] = [];
		await playStory(options(), agent(seen, record, epochs));
		const replies = record.filter((entry) => entry.resident === "A02" && entry.tool === "readTeam").map((entry) => (entry.outcome.ok ? entry.outcome.reply : entry.outcome.code));
		expect(replies).toHaveLength(2);
		expect(replies[0]).not.toContain("game one plan");
		expect(replies[1]).toBe("A01: game two plan");
		// The other team's epoch did not move: it still has its post.
		expect(seen.filter((line) => line.includes("game one plan") && line.startsWith("2 A02"))).toEqual([]);
		for (const cut of [1, 2, 3]) expect(await checkSnapshotRoundTrip(options, () => agent(undefined, undefined, epochs), cut)).toEqual([]);
	});

	it("is deterministic and survives a snapshot round trip", async () => {
		expect(await checkDeterminism(options, () => agent())).toEqual([]);
		for (const cut of [1, 2, 3]) expect(await checkSnapshotRoundTrip(options, () => agent(), cut)).toEqual([]);
	});

	it("documents every option and refuses a resident in two teams", () => {
		expect(checkOptionsDocumented(teamChannel)).toEqual([]);
	});
});
