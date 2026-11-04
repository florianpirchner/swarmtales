/** The asymmetric arm: only team O keeps a strategy brain (option `brainTeams`), offline and scripted. */
import { describe, expect, it } from "vitest";
import { createHost, residentActor } from "@swarmtales/kernel";
import { createPromptLookup } from "@swarmtales/prompts";
import { checkDeterminism, checkSnapshotRoundTrip, playStory } from "@swarmtales/testkit";
import { coreStories } from "../../stories/index.ts";
import { tictactoeEntry } from "../../stories/tictactoe-teams/story.ts";
import { field, goldenStory, ofType, ticTacToePlayer } from "./tictactoe-support.ts";

const options = () => ({ story: goldenStory({ brainTeams: ["O"] }), prompts: createPromptLookup() });

describe("tictactoe-teams with a brain for team O only", () => {
	it("lets only O write brains, with no retro window for X", async () => {
		const run = await playStory(options(), ticTacToePlayer());
		expect(ofType(run.events, "game_ended")).toHaveLength(3);
		const written = ofType(run.events, "brain_written");
		expect(written.map((event) => field(event, "team"))).toEqual(["O", "O", "O"]);
		expect(ofType(run.events, "retro_started").map((event) => field(event, "team"))).toEqual(["O", "O", "O"]);
		expect(ofType(run.events, "retro_closed")).toHaveLength(3);
		const third = run.events.filter((event) => event.type === "turn_started").flatMap((event) => JSON.stringify(field(event, "inputs") ?? "").includes("Game 3 begins") ? [event] : []);
		expect(third.length).toBeGreaterThan(0);
	});

	it("answers BRAIN_DISABLED to X's readBrain, refuses its writeBrain, and keeps O's brain", async () => {
		const host = createHost(options());
		host.start();
		expect(await host.call(residentActor("A01"), "readBrain", {})).toMatchObject({ ok: false, code: "BRAIN_DISABLED" });
		expect(await host.call(residentActor("A01"), "writeBrain", { text: "x" })).toMatchObject({ ok: false });
		expect(host.openTools("A01")).not.toContain("writeBrain");
		expect(host.openTools("A04")).toContain("writeBrain");
		expect(await host.call(residentActor("A04"), "writeBrain", { text: "o rules" })).toMatchObject({ ok: true });
		expect(await host.call(residentActor("A05"), "readBrain", {})).toMatchObject({ ok: true });
	});

	it("tells X the result-only briefing and O its brain", async () => {
		const run = await playStory(options(), ticTacToePlayer());
		const resets = run.events.filter((event) => event.type === "turn_started").flatMap((event) => {
			const inputs: unknown = field(event, "inputs");
			return Array.isArray(inputs) ? inputs.filter((input): input is { kind: string; text: string } => typeof input === "object" && input !== null && Reflect.get(input, "kind") === "context-reset").map((input) => ({ resident: String(field(event, "resident")), text: input.text })) : [];
		});
		const third = resets.filter((reset) => reset.text.startsWith("Game 3 begins"));
		expect(third.some((reset) => reset.resident === "A01")).toBe(true);
		for (const reset of third) {
			if (["A01", "A02", "A03"].includes(reset.resident)) expect(reset.text).not.toContain("version");
			else expect(reset.text).toContain("version 3");
		}
	});

	it("is deterministic and survives a snapshot round trip", async () => {
		expect(await checkDeterminism(options(), ticTacToePlayer)).toEqual([]);
		for (const cut of [1, 4, 9]) expect(await checkSnapshotRoundTrip(options(), ticTacToePlayer, cut)).toEqual([]);
	});

	it("promises a brain only to the team that has one, and leaves the default 3x3 text unchanged", () => {
		const host = createHost(options());
		const brainO = tictactoeEntry({ brainTeams: ["O"] });
		expect(brainO.briefing("A01", host)).not.toContain("strategy brain");
		expect(brainO.briefing("A04", host)).toContain("strategy brain");
		const plain = tictactoeEntry();
		expect(plain.briefing("A01", host)).toBe(tictactoeEntry({ brainTeams: ["X", "O"] }).briefing("A01", host));
		expect(plain.briefing("A01", host)).toContain("strategy brain");
		expect(tictactoeEntry({ brain: false }).briefing("A04", host)).not.toContain("strategy brain");
		expect(coreStories["tictactoe-teams-brain-o"]?.story.id).toBe("tictactoe-teams-brain-o");
		expect(coreStories["tictactoe-teams"]?.story.id).toBe("tictactoe-teams");
	});
});
