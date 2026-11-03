import { describe, expect, it } from "vitest";
import cityOfKeys from "../../stories/cityofkeys/story.ts";
import { gamemaker } from "@swarmtales/sdk";
import { dealValues } from "@swarmtales/mechanic-puzzles";
import { act, createHostFixture as createFixture, say } from "../helpers/host-fixture.ts";
import { codeOf, factorsOf, fragmentOf, submit, teamOf } from "../helpers/host-inspect.ts";

describe("gamemaker", () => {
	it("reads a filtered report after every round and delivers a private note", async () => {
		const note = "A02, A01 is waiting on you; the board is free.";
		const fixture = createFixture({
			agents: 2,
			minutes: 3,
			level: 2,
			lastLevel: 3,
			script: (host) => ({
				A01: [act({ name: "postBoard", args: { message: `my fragment ${fragmentOf(host, "A01", 2)}` } }), say(), say()],
				A02: [say(), say(), say()],
			}),
			gamemakerScript: () => [act({ name: "notify", args: { agent: "A02", text: note } }), say("Done."), say("Nothing to add.")],
		});
		await fixture.run();
		const turns = fixture.events("gamemaker_turn");
		expect(turns.map((turn) => turn.round)).toEqual([1, 2]);
		const report = turns[0]?.input ?? "";
		expect(report).toMatch(/board #\d+ A01/);
		expect(report).toContain("[code]");
		for (const agent of ["A01", "A02"]) expect(report).not.toContain(fragmentOf(fixture.host, agent, 2));
		expect(fixture.events("gamemaker_note")).toEqual([expect.objectContaining({ to: "A02", author: "COURIER", text: note })]);
		expect(fixture.inputsOf("A02")).toEqual(expect.arrayContaining([expect.stringMatching(new RegExp(`^\\[COURIER #\\d+\\] ${note}$`))]));
		expect(turns[1]?.input).toContain(`to A02: "${note}"`);
	});

	it("never sees a factor, salt or code of the wall and blocks a note that carries one", async () => {
		let leaked = "";
		const fixture = createFixture({
			minutes: 2,
			level: 8,
			lastLevel: 8,
			script: (host) => {
				const deal = factorsOf(host, 8);
				const mine = deal?.holdings.find((holding) => holding.counterHolder === "A01");
				leaked = mine?.counterFactor ?? "";
				const idle = Object.fromEntries(host.residents.map((id) => [id, [say(), say()]]));
				return {
					...idle,
					A01: [act({ name: "sendDM", args: { target: mine?.agent ?? "A02", message: `Your counter-factor: ${leaked}. My salt is ${deal?.holdings[0]?.salt ?? ""}.` } }), say()],
				};
			},
			gamemakerScript: () => [act({ name: "notify", args: { agent: "A02", text: `A02, try ${leaked}.` } }), say("Done."), say("Nothing.")],
		});
		await fixture.run();
		const report = fixture.events("gamemaker_turn")[0]?.input ?? "";
		expect(report).toMatch(/DM #\d+ A01 ->/);
		expect(report).toContain("[code]");
		const deal = factorsOf(fixture.host, 8);
		for (const value of deal === undefined ? [] : dealValues(deal)) expect(report).not.toContain(value);
		expect(fixture.events("gamemaker_result")[0]?.text).toMatch(/^LEAK_BLOCKED/);
		expect(fixture.events("gamemaker_note")).toEqual([]);
	});

	it("reads names and writes to a resident by its name (v08)", async () => {
		const fixture = createFixture({
			agents: 2,
			minutes: 3,
			only: 1,
			names: true,
			script: () => ({ A01: [act({ name: "chooseName", args: { name: "Mira" } }), say(), say()], A02: [say(), say(), say()] }),
			gamemakerScript: () => [act({ name: "notify", args: { agent: "mira", text: "Mira, the door is open." } }), say("Done."), say("Nothing.")],
		});
		await fixture.run();
		const report = fixture.events("gamemaker_turn")[0]?.input ?? "";
		expect(report).toContain("Mira");
		expect(report).not.toMatch(/\bA01\b(?! is now called)/);
		expect(fixture.events("gamemaker_note")).toEqual([expect.objectContaining({ to: "A01", text: "Mira, the door is open." })]);
		expect(fixture.events("gamemaker_result")[0]?.text).toMatch(/^delivered to Mira as #\d+$/);
	});

	it("blocks a note with a password piece and enforces the note budget", async () => {
		const fixture = createFixture({
			agents: 2,
			minutes: 2,
			only: 1,
			script: () => ({ A01: [say(), say()], A02: [say(), say()] }),
			gamemakerScript: (host) => [
				act(
					{ name: "notify", args: { agent: "A01", text: `Try ${codeOf(host, "A01", 1)}` } },
					{ name: "notify", args: { agent: "A01", text: "A01, the door will not wait." } },
					{ name: "notify", args: { agent: "A01", text: "A01, really." } },
					{ name: "notify", args: { agent: "A09", text: "Hello." } },
				),
				say("Done."),
			],
		});
		await fixture.run();
		const results = fixture.events("gamemaker_result").map((event) => event.text);
		expect(results[0]).toMatch(/^LEAK_BLOCKED/);
		expect(results[1]).toMatch(/^delivered to A01 as #\d+$/);
		expect(results[2]).toMatch(/^BUDGET/);
		expect(results[3]).toMatch(/^UNKNOWN_AGENT/);
		expect(fixture.events("gamemaker_note")).toHaveLength(1);
	});

	it("names who waits on whom", async () => {
		const fixture = createFixture({
			agents: 6,
			minutes: 2,
			level: 4,
			script: (host) => {
				const leader = teamOf(host, 4, "A01").leader;
				return { [leader]: [submit(host, leader, 4)] };
			},
			gamemakerScript: () => [say("Watching.")],
		});
		await fixture.run();
		const report = fixture.events("gamemaker_turn")[0]?.input ?? "";
		expect(report).toMatch(/\(level 5\) waits on A\d\d \(level 4\)/);
		expect(report).not.toContain("hides its teams");
	});

	it("marks a team the task hides", async () => {
		const fixture = createFixture({
			agents: 6,
			minutes: 2,
			level: 6,
			script: (host) => ({ A01: [submit(host, "A01", 6)] }),
			gamemakerScript: () => [say("Watching.")],
		});
		await fixture.run();
		const report = fixture.events("gamemaker_turn")[0]?.input ?? "";
		expect(report).toMatch(/A01 \(level 7\) waits on 2 unnamed teammates on level 6 \(this level hides its teams\)/);
		for (const mate of teamOf(fixture.host, 7, "A01").members.filter((member) => member !== "A01")) {
			expect(report).not.toMatch(new RegExp(`waits on [^\n]*${mate}`));
		}
	});

	it("does not play when the run is composed without it", async () => {
		const fixture = createFixture({ agents: 2, minutes: 1, only: 1, script: () => ({ A01: [say()], A02: [say()] }) });
		await fixture.run();
		// No gamemaker overseer: no system prompt (old `fixture.gamemaker`).
		expect(fixture.gamemakerPrompt).toBeUndefined();
		expect(fixture.events("gamemaker_turn")).toEqual([]);
	});

	it("looks only every n rounds, never after the last one, and survives a failing model", async () => {
		const fixture = createFixture({
			agents: 2,
			minutes: 5,
			only: 1,
			story: { ...cityOfKeys, gamemaker: { ...gamemaker({ model: cityOfKeys.model, brief: "Test." }), every: 2 } },
			script: () => ({ A01: [say(), say(), say(), say(), say()], A02: [say(), say(), say(), say(), say()] }),
			gamemakerScript: () => [
				() => {
					throw new Error("provider down");
				},
				say("Back."),
			],
		});
		await fixture.run();
		expect(fixture.events("gamemaker_turn").map((turn) => turn.round)).toEqual([2, 4]);
		expect(fixture.events("gamemaker_error")).toHaveLength(1);
		expect(fixture.events("run_end")).toHaveLength(1);
	});

	it("limits board posts per window and frees the budget once the window has passed", async () => {
		const post = (text: string) => act({ name: "postBoard", args: { text } });
		const fixture = createFixture({
			agents: 2,
			minutes: 5,
			only: 1,
			script: () => ({ A01: [say(), say(), say(), say(), say()], A02: [say(), say(), say(), say(), say()] }),
			gamemakerScript: () => [post("The doors are watching."), post("Again."), say(), say(), post("Later."), say()],
		});
		await fixture.run();
		const results = fixture.events("gamemaker_result").map((event) => `${event.minute}:${event.text.split(":")[0] ?? ""}`);
		expect(results[0]).toMatch(/^0:posted as #/);
		expect(results[1]).toBe("0:BUDGET");
		expect(results[2]).toMatch(/^3:posted as #/);
	});
});

describe("gamemaker writing rules", () => {
	it("strips a signature and a self-made minute heading from a board post", async () => {
		const post = (text: string) => act({ name: "postBoard", args: { text } });
		const fixture = createFixture({
			agents: 2,
			minutes: 4,
			only: 1,
			story: { ...cityOfKeys, gamemaker: { ...gamemaker({ model: cityOfKeys.model, brief: "Test." }), windowMinutes: 1 } },
			script: () => ({ A01: [say(), say(), say(), say()], A02: [say(), say(), say(), say()] }),
			gamemakerScript: () => [post("CITY minute 30: Two doors stand open."), say(), post("COURIER: minute 1 - Points move."), say(), post("Minute 2: The ranking holds."), say()],
		});
		await fixture.run();
		expect(fixture.events("gamemaker_note").map((note) => note.text)).toEqual(["Two doors stand open.", "Points move.", "The ranking holds."]);
	});

	it("states the length limit and keeps dependencies off the board", async () => {
		const { gamemakerSystemPrompt, MAX_NOTE_LENGTH } = await import("@swarmtales/roles");
		const prompt = gamemakerSystemPrompt({ city: "NEXUS", agents: 6, survivors: 2, rules: cityOfKeys.rules, spec: gamemaker({ model: cityOfKeys.model, brief: "Test." }) });
		expect(MAX_NOTE_LENGTH).toBe(400);
		expect(prompt).toContain("at most 400 characters per note or board post");
		expect(prompt).toContain("Who waits on whom, and who holds whose factor or fragment, goes only into a private note to the residents\n  concerned, never into a board post.");
	});
});

describe("gamemaker roles", () => {
	it("is a coach by default and names the level ranges of several roles", async () => {
		const { gamemakerSystemPrompt } = await import("@swarmtales/roles");
		const base = { city: "NEXUS", agents: 6, survivors: 2, rules: cityOfKeys.rules };
		const coach = gamemaker({ model: cityOfKeys.model, brief: "Test." });
		expect(coach.roles).toEqual([{ fromLevel: 1, role: "coach" }]);
		expect(gamemakerSystemPrompt({ ...base, spec: coach })).toContain("This is a tutorial");
		const acts = gamemaker({ model: cityOfKeys.model, brief: "Test.", roles: [{ fromLevel: 1, role: "coach" }, { fromLevel: 8, role: "director" }] });
		const prompt = gamemakerSystemPrompt({ ...base, spec: acts });
		expect(prompt).toContain("For residents on levels 1-7 you are a coach.");
		expect(prompt).toContain("For residents on levels 8 and up you are a director.");
		expect(prompt).toContain("Only 2 of 6 residents survive");
	});
});
