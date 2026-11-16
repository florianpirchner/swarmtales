// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The lanterns mechanic: a scripted match, the deadlines, the refusals, the keeper's silence in the team chat, the
 * samples of the fake driver and its conformance (offline). Carried from "lanterns, scripted match" of
 * `test/stories/lanterns.test.ts`.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkDeterminism, checkOptionsDocumented, checkPackage, checkSnapshotRoundTrip, fakeDriver, idleDriver, play, testKernel } from "@swarmtales/testkit";
import { clueGrid } from "../src/index.ts";
import { field, lanterns, ofType, player } from "./support.ts";

const players = { drivers: { resident: player } };

describe("a match", () => {
	it("plays four games with a rotating keeper, sealed targets and a brain per team", async () => {
		const run = await play(lanterns(), players);
		expect(run.end).toMatchObject({ reason: "limit", limit: "lanterns.match" });
		const started = ofType(run.events, "clue_game_started");
		expect(started.map((event) => field(event, "keepers"))).toEqual([
			{ amber: "A01", teal: "A04" },
			{ amber: "A02", teal: "A05" },
			{ amber: "A03", teal: "A06" },
			{ amber: "A01", teal: "A04" },
		]);
		// Four games: each team has the first clue twice (P196).
		expect(started.map((event) => field(event, "startingTeam"))).toEqual(["amber", "teal", "amber", "teal"]);
		// The team without the first clue has one word fewer (P196).
		const owners = ofType(run.events, "clue_key_dealt").map((event) => {
			const key = field(event, "key");
			const count = (owner: string): number => (Array.isArray(key) ? key.filter((entry: unknown) => typeof entry === "object" && entry !== null && Reflect.get(entry, "owner") === owner).length : 0);
			return [count("amber"), count("teal")];
		});
		expect(owners).toEqual([[6, 5], [5, 6], [6, 5], [5, 6]]);
		for (const type of ["clue_key_dealt", "clue_intent", "clue_closed", "clue_game_scored"]) {
			const events = ofType(run.events, type);
			expect(events.length).toBeGreaterThan(0);
			expect(events.every((event) => JSON.stringify(event.audience) === JSON.stringify(["human"]))).toBe(true);
		}
		expect(ofType(run.events, "clue_given").every((event) => event.audience === undefined || event.audience.length === 0)).toBe(true);
		expect(ofType(run.events, "clue_game_ended")).toHaveLength(4);
		// No extra guess: a clue never has more guesses than its number.
		expect(ofType(run.events, "clue_closed").every((event) => {
			const guesses = field(event, "guesses");
			const number = field(event, "number");
			return Array.isArray(guesses) && typeof number === "number" && guesses.length <= Math.max(number, 0);
		})).toBe(true);
		expect(ofType(run.events, "clue_match_ended").map((event) => field(event, "scores"))).toEqual([run.kernel.fact("lanterns.scores")]);
		expect(run.kernel.fact("lanterns.results")).toHaveLength(4);
		expect(ofType(run.events, "clue_word_revealed").length).toBeGreaterThan(10);
		// Before game 1 and after games 1 to 3, each team writes its brain.
		expect(ofType(run.events, "brain_written", "strategy-brain")).toHaveLength(8);
	});

	it("loses a clue turn when the keeper says nothing and still ends the match", async () => {
		const run = await play(lanterns({ brain: false, games: 1, maxClues: 2 }), { drivers: { resident: idleDriver } });
		expect(run.end).toMatchObject({ reason: "limit", limit: "lanterns.match" });
		const closed = ofType(run.events, "clue_closed");
		expect(closed.map((event) => [field(event, "team"), field(event, "end"), event.tick])).toEqual([["amber", "no-clue", 1], ["teal", "no-clue", 3], ["amber", "no-clue", 5], ["teal", "no-clue", 7]]);
	});

	it("ends a caller's turn that neither guesses nor stops", async () => {
		const test = testKernel(lanterns({ brain: false, games: 1 }));
		const own = [...(await keeperView(test)).matchAll(/([a-z]+) \(amber\)/g)].map((match) => String(match[1]));
		expect(await test.call("A01", "giveClue", { word: "quixotic", number: 1, targets: own.slice(0, 1) })).toMatchObject({ ok: true });
		await test.playTicks(idleDriver, 2);
		expect(ofType(test.kernel.log.all(), "clue_closed").map((event) => [field(event, "end"), field(event, "caller")])).toEqual([["timeout", "A02"]]);
		expect(test.openTools("A04")).toContain("giveClue");
	});
});

// What the keeper of game 1 sees: the grid with the owner of every hidden word.
async function keeperView(test: ReturnType<typeof testKernel>): Promise<string> {
	const view = await test.call("A01", "viewGrid", {});
	return view.ok ? view.reply : "";
}

describe("the tools", () => {
	it("checks clues, keeps the keeper silent, and hands the turn on after a wrong word", async () => {
		const test = testKernel(lanterns({ brain: false, games: 1 }));
		const text = await keeperView(test);
		expect([...text.matchAll(/[a-z]+ \((amber|teal|fog|shadow)\)/g)]).toHaveLength(20);
		expect(text).toContain("Your task: give team amber's clue");
		expect(text).toContain("hidden words left");
		const ofOwner = (owner: string): string[] => [...text.matchAll(new RegExp(`([a-z]+) \\(${owner}\\)`, "g"))].map((match) => String(match[1]));
		const [first = "", second = ""] = ofOwner("amber");
		const [teal = ""] = ofOwner("teal");
		const [fog = ""] = ofOwner("fog");
		const seekerView = await test.call("A02", "viewGrid", {});
		expect(seekerView.ok && seekerView.reply).not.toContain("(amber)");
		expect(await test.call("A04", "giveClue", { word: "quixotic", number: 1, targets: [teal] })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(await test.call("A01", "giveClue", { word: first, number: 1, targets: [first] })).toMatchObject({ ok: false, code: "BAD_CLUE" });
		expect(await test.call("A01", "giveClue", { word: "quixotic", number: 2, targets: [first] })).toMatchObject({ ok: false, code: "BAD_TARGETS" });
		expect(await test.call("A01", "giveClue", { word: "quixotic", number: 1, targets: [teal] })).toMatchObject({ ok: false, code: "BAD_TARGETS" });
		expect(await test.call("A01", "giveClue", { word: "quixotic", number: 2, targets: [first, second] })).toMatchObject({ ok: true });
		expect(await test.call("A02", "postTeam", { text: "I read the first and the second" })).toMatchObject({ ok: true });
		expect(await test.call("A03", "guess", { word: first })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(await test.call("A02", "endGuesses", {})).toMatchObject({ ok: false, code: "GUESS_FIRST" });
		expect(await test.call("A02", "guess", { word: "nowhere" })).toMatchObject({ ok: false, code: "NOT_ON_GRID" });
		const hit = await test.call("A02", "guess", { word: first.toUpperCase() });
		expect(hit.ok && hit.reply).toContain("guess again");
		expect(await test.call("A02", "guess", { word: first })).toMatchObject({ ok: false, code: "ALREADY_REVEALED" });
		const miss = await test.call("A02", "guess", { word: fog });
		expect(miss.ok && miss.reply).toContain("Your turn is over");
		const after = await test.call("A05", "viewGrid", {});
		expect(after.ok && after.reply).toContain("Team teal waits for a clue from its keeper A04");
		expect(await test.call("A04", "giveClue", { word: "quixotic", number: 1, targets: [teal] })).toMatchObject({ ok: true });
	});

	it("refuses a keeper's team post at the lock stage while a game runs, with the prompt's text, and writes nothing", async () => {
		const test = testKernel(lanterns({ brain: false, games: 1 }));
		const silent = "Keepers may not post in the team chat while a game is running: your clue is the only thing you may tell your seekers. You may post again in the talk between games.";
		// Both keepers are silent, also the one whose team is not on turn; a seeker is not.
		for (const keeper of ["A01", "A04"]) expect(await test.call(keeper, "postTeam", { text: "it is the first and the second" })).toMatchObject({ ok: false, code: "KEEPER_SILENT", detail: silent });
		// The lock stage comes before the arguments are checked, and the tool leaves the keeper's open tools.
		expect(await test.call("A01", "postTeam", {})).toMatchObject({ ok: false, code: "KEEPER_SILENT" });
		expect(test.openTools("A01")).not.toContain("postTeam");
		expect(test.openTools("A02")).toContain("postTeam");
		expect(test.openTools("A01")).toContain("readTeam");
		expect(ofType(test.kernel.log.all(), "team_post", "team-channel")).toHaveLength(0);
		expect(test.kernel.log.all().filter((event) => event.type === "tool_refused" && field(event, "code") === "KEEPER_SILENT").map((event) => field(event, "stage"))).toEqual(["lock", "lock", "lock"]);
	});

	it("lets a keeper post again in the talk between two games", async () => {
		const run = await play(lanterns({ games: 2 }), players);
		const posts = ofType(run.events, "team_post", "team-channel").filter((event) => field(event, "text") === "retro talk from A01");
		// Before game 1 and after game 1: A01 kept game 1 and posts in both retro windows.
		expect(posts).toHaveLength(2);
	});
});

describe("the fake driver", () => {
	it("plays accepted calls of every tool of the mechanic and ends the match", async () => {
		const run = await play(lanterns({ brain: false, games: 2 }), { drivers: (kernel) => ({ resident: fakeDriver(kernel, 5) }) });
		expect(run.end).toMatchObject({ reason: "limit", limit: "lanterns.match" });
		const accepted = (tool: string): number => run.events.filter((event) => event.type === "tool_result" && field(event, "as") === tool).length;
		for (const tool of ["viewGrid", "giveClue", "guess", "endGuesses"]) expect(accepted(tool), tool).toBeGreaterThan(0);
		// A sample is a legal call: the mechanic refuses no call of the fake keeper or the fake caller.
		expect(run.events.filter((event) => event.type === "tool_refused" && event.tool?.includes("/lanterns/") === true).map((event) => field(event, "code"))).toEqual([]);
	});
});

describe("mechanic conformance", () => {
	it("fits its package, and documents every option", () => {
		const packageJson: unknown = JSON.parse(readFileSync(join(import.meta.dirname, "..", "package.json"), "utf8"));
		expect(checkPackage(clueGrid, packageJson)).toEqual([]);
		expect(checkOptionsDocumented(clueGrid)).toEqual([]);
	});

	it("is deterministic and survives a snapshot round trip inside a game and inside a retro window", async () => {
		expect(await checkDeterminism(lanterns(), () => player)).toEqual([]);
		for (const cut of [0, 3, 9]) expect(await checkSnapshotRoundTrip(lanterns(), () => player, cut)).toEqual([]);
		// Silent residents: the cut falls between a clue turn's opening and its deadline.
		expect(await checkSnapshotRoundTrip(lanterns({ brain: false, games: 1, maxClues: 2 }), () => idleDriver, 2)).toEqual([]);
	});
});
