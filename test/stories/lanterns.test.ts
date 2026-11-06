/** Lanterns, the word-clue game, through the real mechanics: rules, a scripted match and the host's refusals, offline. */
import { describe, expect, it } from "vitest";
import type { CoreStory, TurnTaker } from "@swarmtales/contracts";
import { createHost, createRng, residentActor } from "@swarmtales/kernel";
import { createPromptLookup } from "@swarmtales/prompts";
import { checkDeterminism, checkSnapshotRoundTrip, idleAgent, playStory } from "@swarmtales/testkit";
import { clueProblem, dealGrid, keeperOf, landedOf, referenceOf, scoreGame, seekersOf, stemOf, WORD_POOL, type Card, type ClueRecord } from "../../mechanics/clue-grid/src/model.ts";
import { lanternsStory, type LanternsOptions } from "../../stories/lanterns/story.ts";
import { findCoreStory } from "../../stories/index.ts";
import { field, ofType } from "./tictactoe-support.ts";

const as = residentActor;

function story(extra: LanternsOptions = {}): CoreStory {
	const base = lanternsStory(extra);
	return { ...base, turns: { ...base.turns, order: (view) => view.residents } };
}

const options = (extra: LanternsOptions = {}) => ({ story: story(extra), prompts: createPromptLookup() });

const texts = (inputs: readonly { readonly text: string }[]): string => inputs.map((note) => note.text).join("\n");

/** The hidden words of a grid as a seeker sees it: every cell that is not `[word: owner]`. */
function hiddenIn(grid: string): string[] {
	return grid
		.split("\n")
		.flatMap((row) => row.split(" | "))
		.map((cell) => cell.trim())
		.filter((cell) => cell !== "" && !cell.startsWith("["));
}

/** Keepers clue their first two hidden words; the caller reveals the first hidden word of the grid and stops; the partner advises. */
const player: TurnTaker = async (turn) => {
	const told = texts(turn.inputs);
	if (told.includes("Retro after game") || told.includes("Before game 1")) {
		await turn.call("postTeam", { text: `retro talk from ${turn.resident}` });
		if (told.includes("You are the retro captain")) await turn.call("writeBrain", { text: "Keepers clue two words at a time; seekers stop once the clue is used up." });
		return;
	}
	const own = /Your team's hidden words: ([^.]+)\./.exec(told)?.[1];
	if (own !== undefined) {
		const words = own.split(", ");
		const number = Math.min(2, words.length);
		await turn.call("giveClue", { word: "quixotic", number, targets: words.slice(0, number), reason: "script" });
		return;
	}
	if (told.includes("You call the guesses")) {
		const view = await turn.call("viewGrid", {});
		const grid = view.ok ? (/The grid \(revealed[^\n]*\n((?:[^\n]*\|[^\n]*\n?)+)/.exec(view.reply)?.[1] ?? "") : "";
		const first = hiddenIn(grid)[0];
		if (first === undefined) return;
		const result = await turn.call("guess", { word: first, reason: "script" });
		if (result.ok && result.reply.includes("You may guess again")) await turn.call("endGuesses", {});
		return;
	}
	if (told.includes("Advise")) await turn.call("postTeam", { text: `${turn.resident}: go with the first word.` });
};

const card = (word: string, owner: Card["owner"], revealed = false, by: Card["by"] = null): Card => ({ word, owner, revealed, by });

describe("Lanterns rules", () => {
	it("has a pool with no word inside another and no shared stem", () => {
		expect(new Set(WORD_POOL).size).toBe(WORD_POOL.length);
		expect(WORD_POOL.length).toBeGreaterThan(200);
		// No word is also the name of an owner: "shadow" on the grid read as a shadow card in the first run (P190).
		expect(WORD_POOL.filter((word) => ["amber", "teal", "fog", "shadow"].includes(word))).toEqual([]);
		const clashes = WORD_POOL.flatMap((a) => WORD_POOL.filter((b) => a !== b && ((a.length >= 3 && b.includes(a)) || stemOf(a) === stemOf(b))).map((b) => `${a}/${b}`));
		expect(clashes).toEqual([]);
	});

	it("deals 20 words: six per team, two shadows, the rest fog", () => {
		const rng = createRng(5);
		const grid = dealGrid({ size: 20, perTeam: 6, shadows: 2 }, (items) => rng.shuffle(items));
		expect(grid).toHaveLength(20);
		expect(new Set(grid.map((entry) => entry.word)).size).toBe(20);
		const count = (owner: Card["owner"]) => grid.filter((entry) => entry.owner === owner).length;
		expect([count("amber"), count("teal"), count("shadow"), count("fog")]).toEqual([6, 6, 2, 6]);
		expect(() => dealGrid({ size: 10, perTeam: 6, shadows: 0 }, (items) => [...items])).toThrow();
	});

	it("refuses clues that are not one word, are on the grid, hold a grid word or share its stem", () => {
		const grid = [card("river", "amber"), card("lantern", "teal"), card("fox", "fog")];
		expect(clueProblem("water", grid)).toBeUndefined();
		expect(clueProblem("Water", grid)).toBeUndefined();
		expect(clueProblem("deep water", grid)).toContain("one word");
		expect(clueProblem("h2o", grid)).toContain("one word");
		expect(clueProblem("River", grid)).toContain("on the grid");
		expect(clueProblem("riverbank", grid)).toContain("too close");
		expect(clueProblem("lant", grid)).toContain("too close");
		expect(clueProblem("rivers", grid)).toContain("too close");
		expect(clueProblem("foxes", grid)).toContain("too close");
		// Two letters are too short to count as inside a word.
		expect(clueProblem("ox", grid)).toBeUndefined();
	});

	it("lands a clue only when its first `number` guesses are own words", () => {
		const guess = (owner: Card["owner"]) => ({ word: "w", owner, by: "A02", target: false });
		expect(landedOf({ team: "amber", number: 2, guesses: [guess("amber"), guess("amber"), guess("fog")] })).toBe(true);
		expect(landedOf({ team: "amber", number: 2, guesses: [guess("amber"), guess("teal")] })).toBe(false);
		expect(landedOf({ team: "amber", number: 2, guesses: [guess("amber")] })).toBe(false);
		expect(landedOf({ team: "amber", number: 1, guesses: [guess("amber")] })).toBe(false);
	});

	it("scores words for their owner, shadows against the revealer, landed clues and the finish", () => {
		const grid = [card("a", "amber", true, "amber"), card("b", "amber", true, "teal"), card("c", "teal", true, "teal"), card("d", "shadow", true, "teal"), card("e", "teal")];
		const clue = (team: "amber" | "teal", landed: boolean): ClueRecord => ({ game: 1, team, keeper: "", caller: "", clueNo: 1, word: "x", number: 2, targets: [], guesses: [], end: "stopped", landed });
		const scores = scoreGame(grid, [clue("amber", true), clue("teal", false)], "amber", { wordPoints: 1, shadowPenalty: 3, landedBonus: 1, finishBonus: 3 });
		// Amber: two words (one revealed by teal), a landed clue and the finish.
		expect(scores.amber).toEqual({ words: 2, shadows: 0, landed: 1, finished: true, total: 6 });
		// Teal: one word, one shadow.
		expect(scores.teal).toEqual({ words: 1, shadows: 1, landed: 0, finished: false, total: -2 });
	});

	it("measures how much of what the keeper meant the seekers found", () => {
		const clues: ClueRecord[] = [
			{ game: 1, team: "amber", keeper: "A01", caller: "A02", clueNo: 1, word: "sea", number: 2, targets: ["ship", "whale"], guesses: [{ word: "ship", owner: "amber", by: "A02", target: true }, { word: "pearl", owner: "amber", by: "A02", target: false }, { word: "fox", owner: "fog", by: "A02", target: false }], end: "wrong", landed: true },
			{ game: 1, team: "amber", keeper: "A01", caller: "A03", clueNo: 2, word: "", number: 0, targets: [], guesses: [], end: "no-clue", landed: false },
		];
		expect(referenceOf("amber", clues)).toMatchObject({ clues: 2, missedClues: 1, meanNumber: 2, guesses: 3, ownHits: 2, targetHits: 1, recall: 0.5, precision: 0.667, fogHits: 1 });
	});

	it("rotates the keeper through the team, one game each", () => {
		const team = ["A01", "A02", "A03"];
		expect([1, 2, 3, 4].map((game) => keeperOf(team, game))).toEqual(["A01", "A02", "A03", "A01"]);
		expect(seekersOf(team, 2)).toEqual(["A01", "A03"]);
	});
});

describe("lanterns, scripted match", () => {
	it("plays three games with a rotating keeper, sealed targets and a brain per team", async () => {
		const run = await playStory(options(), player);
		expect(run.end).toMatchObject({ reason: "referee", limit: "clue-grid.match" });
		const started = ofType(run.events, "clue_game_started");
		expect(started.map((event) => field(event, "keepers"))).toEqual([
			{ amber: "A01", teal: "A04" },
			{ amber: "A02", teal: "A05" },
			{ amber: "A03", teal: "A06" },
		]);
		expect(started.map((event) => field(event, "startingTeam"))).toEqual(["amber", "teal", "amber"]);
		for (const type of ["clue_key_dealt", "clue_intent", "clue_closed", "clue_game_scored"]) {
			const events = ofType(run.events, type);
			expect(events.length).toBeGreaterThan(0);
			expect(events.every((event) => JSON.stringify(event.audience) === JSON.stringify(["human"]))).toBe(true);
		}
		expect(ofType(run.events, "clue_given").every((event) => event.audience === undefined || event.audience.length === 0)).toBe(true);
		expect(ofType(run.events, "clue_game_ended")).toHaveLength(3);
		expect(ofType(run.events, "clue_match_ended")).toHaveLength(1);
		expect(ofType(run.events, "clue_word_revealed").length).toBeGreaterThan(10);
		// Before game 1 and after games 1 and 2, each team writes its brain.
		expect(ofType(run.events, "brain_written")).toHaveLength(6);
	});

	it("starts every game from a fresh context with the rules, the role and the team's brain", async () => {
		const run = await playStory(options(), player);
		const resets = run.events.filter((event) => event.type === "turn_started").flatMap((event) => {
			const inputs: unknown = field(event, "inputs");
			return Array.isArray(inputs) ? inputs.filter((input): input is { kind: string; text: string } => typeof input === "object" && input !== null && Reflect.get(input, "kind") === "context-reset").map((input) => ({ resident: event.actor, text: input.text })) : [];
		});
		const second = resets.filter((reset) => reset.text.startsWith("Game 2 begins"));
		expect(second.length).toBeGreaterThan(0);
		for (const reset of second) expect(reset.text).toContain("strategy brain (version 2");
	});

	it("loses a clue turn when the keeper says nothing and still ends the match", async () => {
		const run = await playStory(options({ brain: false, games: 1, maxClues: 2 }), idleAgent);
		expect(run.end).toMatchObject({ reason: "referee", limit: "clue-grid.match" });
		const closed = ofType(run.events, "clue_closed");
		expect(closed).toHaveLength(4);
		expect(closed.every((event) => field(event, "end") === "no-clue")).toBe(true);
	});

	it("checks clues, keeps the keeper silent, and hands the turn on after a wrong word", async () => {
		const host = createHost(options({ brain: false, games: 1 }));
		host.start();
		const keeperView = await host.call(as("A01"), "viewGrid", {});
		const text = keeperView.ok ? keeperView.reply : "";
		const owners = [...text.matchAll(/([a-z]+) \((amber|teal|fog|shadow)\)/g)].map((match) => ({ word: match[1] ?? "", owner: match[2] ?? "" }));
		expect(owners).toHaveLength(20);
		expect(text).toContain("Your task: give team amber's clue");
		const ofOwner = (owner: string) => owners.filter((entry) => entry.owner === owner).map((entry) => entry.word);
		const [first = "", second = ""] = ofOwner("amber");
		const seekerView = await host.call(as("A02"), "viewGrid", {});
		expect(seekerView.ok && seekerView.reply).not.toContain("(amber)");
		expect(await host.call(as("A04"), "giveClue", { word: "quixotic", number: 1, targets: [ofOwner("teal")[0] ?? ""] })).toMatchObject({ ok: false });
		expect(await host.call(as("A01"), "giveClue", { word: first, number: 1, targets: [first] })).toMatchObject({ ok: false, code: "BAD_CLUE" });
		expect(await host.call(as("A01"), "giveClue", { word: "quixotic", number: 2, targets: [first] })).toMatchObject({ ok: false, code: "BAD_TARGETS" });
		expect(await host.call(as("A01"), "giveClue", { word: "quixotic", number: 1, targets: [ofOwner("teal")[0] ?? ""] })).toMatchObject({ ok: false, code: "BAD_TARGETS" });
		expect(await host.call(as("A01"), "postTeam", { text: "it is the first and the second" })).toMatchObject({ ok: false, code: "KEEPER_SILENT" });
		expect(await host.call(as("A01"), "giveClue", { word: "quixotic", number: 2, targets: [first, second] })).toMatchObject({ ok: true });
		expect(await host.call(as("A02"), "postTeam", { text: "I read the first and the second" })).toMatchObject({ ok: true });
		expect(await host.call(as("A03"), "guess", { word: first })).toMatchObject({ ok: false });
		expect(await host.call(as("A02"), "endGuesses", {})).toMatchObject({ ok: false, code: "GUESS_FIRST" });
		const hit = await host.call(as("A02"), "guess", { word: first.toUpperCase() });
		expect(hit.ok && hit.reply).toContain("guess again");
		expect(await host.call(as("A02"), "guess", { word: first })).toMatchObject({ ok: false, code: "ALREADY_REVEALED" });
		const miss = await host.call(as("A02"), "guess", { word: ofOwner("fog")[0] ?? "" });
		expect(miss.ok && miss.reply).toContain("Your turn is over");
		const after = await host.call(as("A05"), "viewGrid", {});
		expect(after.ok && after.reply).toContain("Team teal waits for a clue from its keeper A04");
		expect(await host.call(as("A04"), "giveClue", { word: "quixotic", number: 1, targets: [ofOwner("teal")[0] ?? ""] })).toMatchObject({ ok: true });
	});

	it("is registered with its arms and parsed by name", () => {
		for (const name of ["lanterns", "lanterns-nobrain"]) expect(findCoreStory(name)?.story.id).toBe(name);
		expect(findCoreStory("lanterns-nobrain-g2-c6")?.story.id).toBe("lanterns-nobrain-g2-c6");
		expect(findCoreStory("lanterns-g0")).toBeUndefined();
	});

	it("is deterministic and survives a snapshot round trip inside a game and inside a retro window", async () => {
		expect(await checkDeterminism(options(), () => player)).toEqual([]);
		for (const cut of [0, 3, 9]) expect(await checkSnapshotRoundTrip(options(), () => player, cut)).toEqual([]);
	});
});
