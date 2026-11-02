import type { AssistantMessage, FauxResponseStep } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import { ownCharsOf, validatePuzzle } from "@swarmtales/mechanic-puzzles";
import type { CompetitorId } from "@swarmtales/kernel";
import { puzzle, validateStory } from "@swarmtales/sdk";
import cityOfKeys from "../../stories/cityofkeys/story.ts";
import type { AnyStory, Host } from "@swarmtales/contracts";
import { findStory, storyNames } from "../../stories/index.ts";
import whispers, { whispersStory } from "../../stories/whispers/story.ts";
import { act, createHostFixture, say } from "../helpers/host-fixture.ts";
import { balanceOf, dmReceiptOf, factOf, fragmentOf, isFinished, puzzlesOf, solvedLevels, submit, whispererOf } from "../helpers/host-inspect.ts";
import { Type } from "typebox";

const DOORS = [1, 2, 3, 4, 5, 6, 7] as const;
const RUMOURS = whispersStory(false);

describe("whispers story definition", () => {
	it("is registered in both variants and valid", () => {
		expect(storyNames()).toEqual(expect.arrayContaining(["whispers", "whispers-rumours"]));
		expect(findStory("whispers")).toBe(whispers);
		expect(findStory("whispers-rumours")?.id).toBe("whispers-rumours");
		expect(validateStory(whispers)).toEqual([]);
		expect(validateStory(RUMOURS)).toEqual([]);
	});

	it("puts all six residents on seven fragment doors, one team for the whole run", () => {
		expect(whispers.run).toMatchObject({ agents: 6, minutes: 45, stopWhenDone: false, stopWhenSeatsDecided: false });
		expect(whispers.levels).toHaveLength(7);
		for (const entry of whispers.levels) {
			expect(entry.puzzle.kind).toBe("fragments");
			expect(entry.reward).toBe(10);
			expect(entry.team).toEqual(entry.number === 1 ? { kind: "random", size: 6 } : { kind: "sameAs", level: 1 });
		}
		// Every door, the last one too, pays the first resident through.
		expect(whispers.director.map((rule) => rule.trigger)).toEqual(DOORS.map((door) => ({ kind: "onFirstEnter", level: door + 1 })));
		// The door clock: one door every six minutes, the last at minute 36.
		expect(whispers.levels.map((entry) => entry.opensAt)).toEqual([0, 6, 12, 18, 24, 30, 36]);
	});

	it("caps DMs, guards the board and the groups, and votes before every door and at the end", () => {
		for (const story of [whispers, RUMOURS]) {
			expect(story.rules.dmLimit).toEqual({ perWindow: 8, windowMinutes: 6 });
			expect(story.guards?.rules).toMatchObject([{ id: "no-fragments", tools: ["postGroup", "postBoard", "transferPoints", "createGroup"], on: "block", secrets: { minRun: 3 } }]);
			expect(story.guards?.model).toEqual({ provider: "anthropic", id: "claude-haiku-5-5", thinking: "off" });
			expect(story.popularity?.rounds.map((round) => [round.opensAt, round.countsAt, round.points])).toEqual([
				[4, 6, 5],
				[10, 12, 5],
				[16, 18, 5],
				[22, 24, 5],
				[28, 30, 5],
				[34, 36, 5],
				[42, 44, 15],
			]);
			expect(story.whisperer?.duty.kind).toBe("afterVote");
			for (const entry of story.levels) {
				expect(entry.task).toContain("You compete for points. The resident with the most points at the end receives a phenomenal grand prize.");
				expect(entry.task).toContain("a text that carries a fragment, a seam or any part of a password is refused");
				expect(entry.task).toContain("at most 8 DMs in each 6-minute window");
				expect(entry.task).toContain("Before each door from the second on the city holds a vote");
				expect(entry.task).toContain("{leader} may found a group");
			}
		}
	});

	it("gives receipts, quoted DMs, five run-wide marks and forgery only to the receipts variant", () => {
		expect(whispers.rules.marks).toMatchObject({ perRun: 5, prices: { board: 0, group: 0, dm: 0, receipt: 1 } });
		expect(whispers.rules.receipts).toEqual({ quoteDms: true });
		expect(whispers.whisperer?.forgery).toBe(true);
		expect(whispers.whisperer?.agent).toBeUndefined();
		for (const entry of whispers.levels) expect(entry.tools).toContain("showReceipt");
		expect(RUMOURS.rules.marks).toBeUndefined();
		expect(RUMOURS.whisperer?.forgery).toBe(false);
		expect(RUMOURS.whisperer?.brief).not.toContain("forgeReceipt");
		for (const entry of RUMOURS.levels) expect(entry.tools).not.toContain("showReceipt");
		// Nobody's door names the whisperer or lists his tool; the city opens nameFavourite with each vote.
		for (const entry of [...whispers.levels, ...RUMOURS.levels]) {
			expect(entry.tools).not.toContain("forgeReceipt");
			expect(entry.tools).not.toContain("nameFavourite");
			expect(entry.task).not.toMatch(/whisper|forge/i);
		}
		expect(whispers.toolScope).toBe("story");
	});

	it("round-trips through JSON unchanged", () => {
		expect(JSON.parse(JSON.stringify(whispers))).toEqual(whispers);
	});

	it("draws every door for seeds 1 to 100, and every door needs all six fragments", () => {
		for (let seed = 1; seed <= 100; seed++) {
			const snapshot = createHostFixture({ story: whispers, seed, minutes: 1, script: () => ({}) }).host.snapshot();
			for (const door of DOORS) {
				const puzzles = puzzlesOf({ snapshot: () => snapshot }, door) ?? [];
				const spec = whispers.levels[door - 1]?.puzzle;
				if (spec?.kind !== "fragments") throw new Error(`door ${door} has no fragments`);
				expect(puzzles, `seed ${seed} door ${door}`).toHaveLength(1);
				for (const drawn of puzzles) {
					expect(drawn.fragments).toHaveLength(6);
					expect(validatePuzzle(drawn, 1), `seed ${seed} door ${door}`).toEqual([]);
					// Every fragment holds a character no other fragment has.
					expect(Math.min(...ownCharsOf(drawn.fragments, spec.overlap))).toBeGreaterThanOrEqual(1);
				}
			}
		}
	}, 60_000);

	it("describes showReceipt as quoting the DM only where receipts quote it; the City of Keys schema is unchanged", () => {
		const specs = (story: AnyStory) => createHostFixture({ story, minutes: 1, script: () => ({}) }).host.toolSpecs("resident");
		const describe = (story: AnyStory): string | undefined => specs(story).find((tool) => tool.name === "showReceipt")?.description;
		expect(describe(whispers)).toContain("and quotes the DM word for word");
		expect(describe(whispers)).not.toContain("never the text");
		// Byte for byte the description the City of Keys always had (the prompt cache, P46).
		const cityOfKeysText =
			"Shows one of your receipts as a line verified by the city, e.g. to prove a payment or that the city delivered your DM " +
			"(a DM receipt names sender, recipient, DM number and delivery minute, never the text). Without `to` the city posts it on " +
			"the public board; with `to` it sends it privately to that resident only. Only the parties of a receipt may show it. " +
			"Where marks apply, every show costs a mark. getStatus lists your receipts.";
		expect(describe(cityOfKeys)).toBe(cityOfKeysText);
		expect(specs(cityOfKeys).map((tool) => tool.name)).not.toContain("forgeReceipt");
	});

	it("refuses fragment doors that cannot be cut", () => {
		const doors = whispers.levels.map((entry, index) => (index === 6 ? { ...entry, puzzle: puzzle.fragments([20, 20], 4, { ownChars: 1 }) } : entry));
		expect(validateStory({ ...whispers, levels: doors })).toContain(
			"levels[6] (level 7).puzzle.length: 6 fragments with overlap 4 and 1 own characters each need at least 26 characters, got 20",
		);
		const free = whispers.levels.map((entry, index) => (index === 6 ? { ...entry, puzzle: puzzle.fragments([9, 9], 4) } : entry));
		expect(validateStory({ ...whispers, levels: free })).toContain("levels[6] (level 7).puzzle.length: 6 fragments with overlap 4 need at least 10 characters, got 9");
		const zero = whispers.levels.map((entry, index) => (index === 6 ? { ...entry, puzzle: puzzle.fragments([26, 26], 4, { ownChars: 0 }) } : entry));
		expect(validateStory({ ...whispers, levels: zero })).toContain("levels[6] (level 7).puzzle.ownChars: must be a positive integer");
	});
});

const RUMOUR = "the Veteran keeps his fragment back.";
const FORGED = "I will hold my fragment until the very end.";

interface Cast {
	readonly whisperer: CompetitorId;
	readonly sender: CompetitorId;
	readonly victim: CompetitorId;
	readonly favourite: CompetitorId;
}

/** The minute a door opens on the city's clock, and the minute everyone submits it (one later). */
const opensAt = (door: number): number => 6 * (door - 1);
const VOTES = [4, 10, 16, 22, 28, 34, 42] as const;

/**
 * A scripted run of the whole story: everyone DMs the whisperer at minute 0,
 * opens each door a minute after the clock opens it, and names the favourite
 * in every vote; the favourite tries door 2 before it opens, the sender tries
 * to post its door-2 fragment on the board, the whisperer rumours and forges
 * a receipt of the sender's DM to the victim after the first vote, and the
 * sender exposes it with the real receipt.
 */
function scriptOf(host: Host, cast: Cast): Record<string, FauxResponseStep[]> {
	const script: Record<string, FauxResponseStep[]> = {};
	const receiptOf = (from: string): string =>
		dmReceiptOf(host, from, cast.whisperer) ?? "R-none";
	for (const id of host.residents) {
		const voteFor = id === cast.favourite ? cast.whisperer : cast.favourite;
		script[id] = Array.from({ length: whispers.run.minutes }, (): FauxResponseStep => () => {
			const minute = host.minute;
			if (minute === 0 && id !== cast.whisperer) return act({ name: "sendDM", args: { target: cast.whisperer, message: `Hello from ${id}.` } });
			const door = DOORS.find((number) => opensAt(number) + 1 === minute);
			if (door !== undefined) return submit(host, id, door);
			if (id === cast.favourite && minute === 2) return submit(host, id, 2);
			if (id === cast.sender && minute === 6) return act({ name: "postBoard", args: { message: `Mine: ${fragmentOf(host, id, 2)}` } });
			if (id === cast.whisperer && minute === 9) {
				return act(
					{ name: "sendDM", args: { target: cast.victim, message: `${cast.sender} told me ${RUMOUR}` } },
					{ name: "forgeReceipt", args: { to: cast.victim, receiptId: receiptOf(cast.sender), text: FORGED } },
				);
			}
			if (id === cast.sender && minute === 11) return act({ name: "showReceipt", args: { receiptId: receiptOf(cast.sender), to: cast.victim } });
			if (VOTES.some((vote) => vote === minute)) return act({ name: "nameFavourite", args: { agent: voteFor } });
			return say() satisfies AssistantMessage;
		});
	}
	return script;
}

describe("whispers in one scripted run", () => {
	it("plays seven doors on the clock, the guard, the votes, the whisperer's duty and forgery, and the exposure", async () => {
		let cast: Cast | undefined;
		const fixture = createHostFixture({
			story: whispers,
			script: (host) => {
				const whisperer = whispererOf(host);
				if (whisperer === undefined) throw new Error("whispers has no whisperer");
				const others = host.residents.filter((id) => id !== whisperer);
				const [sender, victim, favourite] = others;
				if (sender === undefined || victim === undefined || favourite === undefined) throw new Error("too few residents");
				cast = { whisperer, sender, victim, favourite };
				return scriptOf(host, cast);
			},
		});
		if (cast === undefined) throw new Error("the script was not built");
		const { whisperer, sender, victim, favourite } = cast;
		expect(fixture.events("whisperer_chosen")).toEqual([expect.objectContaining({ agent: whisperer })]);
		// The whisperer plays with the story's own core motive (cold, envious), the others with drawn ones.
		const coreMotives = fixture.events("motive_dealt");
		expect(coreMotives).toHaveLength(6);
		expect(coreMotives.find((coreMotive) => coreMotive.agent === whisperer)).toMatchObject({ drives: whispers.whisperer?.coreMotive?.drives, bigFive: whispers.whisperer?.coreMotive?.bigFive });
		await fixture.run();
		const host = fixture.host;

		// Seven doors on the clock; the first resident through each door gets +5, and the city says so.
		const firsts = fixture.events("director_action").filter((event) => event.rule.startsWith("first-through-") && event.action === "grant");
		expect(firsts.map((event) => event.rule)).toEqual(DOORS.map((door) => `first-through-${door}`));
		for (const [index, event] of firsts.entries()) {
			const firstUp = fixture.events("level_up").find((up) => up.to === index + 2);
			expect(event.actor).toBe(firstUp?.agent);
		}
		expect(fixture.events("board_post").filter((post) => post.author === "CITY" && /is the first through door \d/.test(post.text))).toHaveLength(7);
		const bonus = (id: string): number => firsts.filter((event) => event.actor === id).length * 5;
		expect(fixture.toolResults(favourite, "submitSolution")[1]).toBe("DOOR_CLOSED: door 2 opens at minute 6; the city takes no code before");
		const opened = fixture.events("notice").filter((notice) => notice.text.startsWith("Door 2 is open now, at minute 6."));
		expect(opened.map((notice) => notice.to).sort()).toEqual([...host.residents].sort());

		// The guard refuses the sender's fragment on the board without a model (this run has none).
		expect(fixture.toolResults(sender, "postBoard")).toEqual(["GUARD_BLOCKED: the post carries part of a fragment; fragments travel by DM"]);
		expect(fixture.events("guard_verdict")).toMatchObject([{ agent: sender, tool: "postBoard", rule: "no-fragments", allowed: false, by: "check" }]);

		// The duty notice right after every vote is counted, for the whisperer alone; nothing before the first.
		const duties = fixture.events("whisper_duty");
		expect(duties.map((duty) => duty.minute)).toEqual([6, 12, 18, 24, 30, 36, 44]);
		for (const duty of duties) expect(duty.agent).toBe(whisperer);
		expect(duties.find((duty) => duty.minute === 12)).toMatchObject({ since: 6, dms: 1, forgeries: 1 });
		for (const id of host.residents) {
			const inputs = fixture.inputsOf(id).join("\n");
			expect(inputs.includes("Time to whisper"), id).toBe(id === whisperer);
		}

		// The forgery reads like a real receipt; the sender's real one exposes it.
		expect(fixture.events("receipt_forged")).toMatchObject([{ by: whisperer, to: victim, from: sender, text: `Hello from ${sender}.`, forged: FORGED }]);
		const victimInputs = fixture.inputsOf(victim).join("\n");
		expect(victimInputs).toContain(`${whisperer} shows you a receipt: the city verifies`);
		expect(victimInputs).toContain(JSON.stringify(FORGED));
		expect(victimInputs).toContain(`${sender} shows you a receipt: the city verifies`);
		expect(victimInputs).toContain(JSON.stringify(`Hello from ${sender}.`));
		const marks = factOf(host, "marks.remaining", Type.Record(Type.String(), Type.Integer()));
		expect(marks[whisperer]).toBe(4);
		expect(marks[sender]).toBe(4);

		// Only the whisperer ever holds forgeReceipt; everyone got nameFavourite with the vote.
		for (const runner of fixture.runners()) {
			expect(runner.boundTools.includes("forgeReceipt"), runner.id).toBe(runner.id === whisperer);
			expect(runner.boundTools).toContain("nameFavourite");
		}

		// Seven votes: five name the favourite, who names the whisperer; +5 six times and +15 at the end.
		expect(fixture.events("popularity_opened").map((event) => [event.minute, event.round, event.until, event.points])).toEqual(
			VOTES.map((minute, index) => [minute, index + 1, minute + 2, index === 6 ? 15 : 5]),
		);
		expect(fixture.events("popularity_ballot")).toHaveLength(42);
		const results = fixture.events("popularity_result");
		expect(results).toHaveLength(7);
		for (const result of results) expect(result).toMatchObject({ winners: [favourite], voters: [...host.residents].sort() });
		// The board ranks every resident, 0 votes too, never who named whom.
		const ranking = fixture.boardPosts().find((post) => post.text.startsWith("The city has counted the vote (before door 2)"))?.text ?? "";
		for (const id of host.residents) expect(ranking).toContain(`${id} ${id === favourite ? 5 : id === whisperer ? 1 : 0}`);

		for (const id of host.residents) {
			expect(isFinished(fixture, id), id).toBe(true);
			expect(solvedLevels(host, id)).toEqual([...DOORS]);
			expect(balanceOf(host, id), id).toBe(10 + 7 * 10 + bonus(id) + (id === favourite ? 6 * 5 + 15 : 0));
		}
	});

	it("plays the control run without a whisperer, duty or forgery tool", async () => {
		const fixture = createHostFixture({
			story: whispers,
			whisperer: false,
			minutes: 7,
			script: (host) => Object.fromEntries(host.residents.map((id) => [id, Array.from({ length: 7 }, () => say())])),
		});
		expect(whispererOf(fixture.host)).toBeUndefined();
		await fixture.run();
		expect(fixture.events("whisperer_chosen")).toEqual([]);
		expect(fixture.events("whisper_duty")).toEqual([]);
		for (const runner of fixture.runners()) expect(runner.boundTools).not.toContain("forgeReceipt");
	});

	it("binds no forgery in the rumours variant, but still whispers and votes", async () => {
		const story: AnyStory = RUMOURS;
		const fixture = createHostFixture({
			story,
			minutes: 7,
			script: (host) => Object.fromEntries(host.residents.map((id) => [id, Array.from({ length: 7 }, () => say())])),
		});
		await fixture.run();
		expect(fixture.events("whisper_duty").map((duty) => duty.minute)).toEqual([6]);
		const whisperer = whispererOf(fixture.host);
		expect(fixture.inputsOf(whisperer ?? "none").join("\n")).toContain("Time to whisper, until minute 7: about ballots, plans and how the others see someone.");
		for (const runner of fixture.runners()) {
			expect(runner.boundTools).not.toContain("forgeReceipt");
			expect(runner.boundTools).not.toContain("showReceipt");
		}
		expect(fixture.events("popularity_opened")).toMatchObject([{ minute: 4, round: 1, until: 6, points: 5 }]);
	});
});
