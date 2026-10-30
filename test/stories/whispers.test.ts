import type { AssistantMessage, FauxResponseStep } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import type { World } from "../../src/engine/world.ts";
import type { CompetitorId } from "../../src/core/ids.ts";
import { ownCharsOf, validatePuzzle } from "../../src/engine/puzzles/fragments.ts";
import { puzzle } from "../../src/story/define.ts";
import { validateStory } from "../../src/story/validate.ts";
import { bindStory, TOOLS } from "../../src/tools/index.ts";
import cityOfKeys from "../../stories/cityofkeys/story.ts";
import type { AnyStory } from "../../src/story/types.ts";
import { findStory, storyNames } from "../../stories/index.ts";
import whispers, { whispersStory } from "../../stories/whispers/story.ts";
import { act, createFixture, say, submit } from "../helpers/fixture.ts";

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
		// Nobody's door names the whisperer's tool or the vote.
		for (const entry of [...whispers.levels, ...RUMOURS.levels]) {
			expect(entry.tools).not.toContain("forgeReceipt");
			expect(entry.tools).not.toContain("nameFavourite");
			expect(entry.task).not.toMatch(/whisper|vote|favourite/i);
		}
		expect(whispers.popularity).toMatchObject({ opensBeforeEnd: 3, voteMinutes: 2, points: 15 });
		expect(whispers.toolScope).toBe("story");
	});

	it("round-trips through JSON unchanged", () => {
		expect(JSON.parse(JSON.stringify(whispers))).toEqual(whispers);
	});

	it("draws every door for seeds 1 to 100, and every door needs all six fragments", () => {
		for (let seed = 1; seed <= 100; seed++) {
			const fixture = createFixture({ story: whispers, seed, minutes: 1, script: () => ({}) });
			for (const door of DOORS) {
				const puzzles = fixture.world.inspect.puzzlesOf(door);
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
	});

	it("describes showReceipt as quoting the DM only where receipts quote it; the City of Keys schema is unchanged", () => {
		const fixture = createFixture({ story: whispers, minutes: 1, script: () => ({}) });
		const describe = (story: AnyStory): string | undefined => bindStory({ self: "A01", world: fixture.world }, story).find((tool) => tool.name === "showReceipt")?.description;
		expect(describe(whispers)).toContain("and quotes the DM word for word");
		expect(describe(whispers)).not.toContain("never the text");
		// Byte for byte the description the City of Keys always had (the prompt cache, P46).
		const cityOfKeysText =
			"Shows one of your receipts as a line verified by the city, e.g. to prove a payment or that the city delivered your DM " +
			"(a DM receipt names sender, recipient, DM number and delivery minute, never the text). Without `to` the city posts it on " +
			"the public board; with `to` it sends it privately to that resident only. Only the parties of a receipt may show it. " +
			"Where marks apply, every show costs a mark. getStatus lists your receipts.";
		expect(describe(cityOfKeys)).toBe(cityOfKeysText);
		expect(TOOLS.showReceipt.description).toBe(cityOfKeysText);
		expect(bindStory({ self: "A01", world: fixture.world }, cityOfKeys).map((tool) => tool.name)).not.toContain("forgeReceipt");
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

/**
 * A scripted run of the whole story: everyone DMs the whisperer at minute 0,
 * opens one door a minute from minute 1, the whisperer rumours and forges a
 * receipt of the sender's DM to the victim, the sender exposes it with the
 * real receipt, and in the surprise vote everyone names the favourite.
 */
function scriptOf(world: World, cast: Cast): Record<string, FauxResponseStep[]> {
	const script: Record<string, FauxResponseStep[]> = {};
	const receiptOf = (from: string): string =>
		world.receiptsOf(from).find((receipt) => receipt.kind === "dm" && receipt.from === from && receipt.to === cast.whisperer)?.id ?? "R-none";
	for (const id of world.competitors) {
		const voteFor = id === cast.favourite ? cast.whisperer : cast.favourite;
		script[id] = Array.from({ length: whispers.run.minutes }, (): FauxResponseStep => () => {
			const minute = world.minute;
			if (minute === 0 && id !== cast.whisperer) return act({ name: "sendDM", args: { target: cast.whisperer, message: `Hello from ${id}.` } });
			const door = DOORS.find((number) => number === minute);
			if (door !== undefined) return submit(world, id, door);
			if (id === cast.whisperer && minute === 9) {
				return act(
					{ name: "sendDM", args: { target: cast.victim, message: `${cast.sender} told me ${RUMOUR}` } },
					{ name: "forgeReceipt", args: { to: cast.victim, receiptId: receiptOf(cast.sender), text: FORGED } },
				);
			}
			if (id === cast.sender && minute === 11) return act({ name: "showReceipt", args: { receiptId: receiptOf(cast.sender), to: cast.victim } });
			if (minute === 42) return act({ name: "nameFavourite", args: { agent: voteFor } });
			return say() satisfies AssistantMessage;
		});
	}
	return script;
}

describe("whispers in one scripted run", () => {
	it("plays seven doors, the whisperer's duty and forgery, the exposure and the surprise vote", async () => {
		let cast: Cast | undefined;
		const fixture = createFixture({
			story: whispers,
			script: (world) => {
				const whisperer = world.whisperer;
				if (whisperer === undefined) throw new Error("whispers has no whisperer");
				const others = world.competitors.filter((id) => id !== whisperer);
				const [sender, victim, favourite] = others;
				if (sender === undefined || victim === undefined || favourite === undefined) throw new Error("too few residents");
				cast = { whisperer, sender, victim, favourite };
				return scriptOf(world, cast);
			},
		});
		if (cast === undefined) throw new Error("the script was not built");
		const { whisperer, sender, victim, favourite } = cast;
		expect(fixture.events("whisperer_chosen")).toEqual([expect.objectContaining({ agent: whisperer })]);
		// The whisperer plays with the story's own core (cold, envious), the others with drawn ones.
		const cores = fixture.events("core_dealt");
		expect(cores).toHaveLength(6);
		expect(cores.find((core) => core.agent === whisperer)).toMatchObject({ drives: whispers.whisperer?.core?.drives, bigFive: whispers.whisperer?.core?.bigFive });
		await fixture.run();
		const world = fixture.world;

		// Seven doors, one a minute; the first resident through each door gets +5, and the city says so.
		const firsts = fixture.events("director_action").filter((event) => event.rule.startsWith("first-through-") && event.action === "grant");
		expect(firsts.map((event) => event.rule)).toEqual(DOORS.map((door) => `first-through-${door}`));
		for (const [index, event] of firsts.entries()) {
			const firstUp = fixture.events("level_up").find((up) => up.to === index + 2);
			expect(event.actor).toBe(firstUp?.agent);
		}
		expect(fixture.events("board_post").filter((post) => post.author === "CITY" && /is the first through door \d/.test(post.text))).toHaveLength(7);
		const bonus = (id: string): number => firsts.filter((event) => event.actor === id).length * 5;

		// The duty notice every three minutes from minute 3, for the whisperer alone.
		const duties = fixture.events("whisper_duty");
		expect(duties.map((duty) => duty.minute)).toEqual(Array.from({ length: 14 }, (_, index) => 3 * (index + 1)));
		for (const duty of duties) expect(duty.agent).toBe(whisperer);
		expect(duties.find((duty) => duty.minute === 12)).toMatchObject({ since: 9, dms: 1, forgeries: 1 });
		for (const id of world.competitors) {
			const inputs = fixture.inputsOf(id).join("\n");
			expect(inputs.includes("time to whisper"), id).toBe(id === whisperer);
		}

		// The forgery reads like a real receipt; the sender's real one exposes it.
		expect(fixture.events("receipt_forged")).toMatchObject([{ by: whisperer, to: victim, from: sender, text: `Hello from ${sender}.`, forged: FORGED }]);
		const victimInputs = fixture.inputsOf(victim).join("\n");
		expect(victimInputs).toContain(`${whisperer} shows you a receipt: the city verifies`);
		expect(victimInputs).toContain(JSON.stringify(FORGED));
		expect(victimInputs).toContain(`${sender} shows you a receipt: the city verifies`);
		expect(victimInputs).toContain(JSON.stringify(`Hello from ${sender}.`));
		expect(world.status(whisperer).marks?.remaining).toBe(4);
		expect(world.status(sender).marks?.remaining).toBe(4);

		// Only the whisperer ever holds forgeReceipt; everyone got nameFavourite with the vote.
		for (const runner of fixture.runners) {
			expect(runner.boundTools.includes("forgeReceipt"), runner.id).toBe(runner.id === whisperer);
			expect(runner.boundTools).toContain("nameFavourite");
		}

		// The surprise vote: opens at minute 42, closes at 44; five name the favourite, who names the whisperer.
		expect(fixture.events("popularity_opened")).toMatchObject([{ minute: 42, until: 44, points: 15 }]);
		expect(fixture.events("popularity_ballot")).toHaveLength(6);
		expect(fixture.events("popularity_result")).toMatchObject([{ winners: [favourite], points: 15, voters: [...world.competitors].sort() }]);

		for (const id of world.competitors) {
			const status = world.status(id);
			expect(status.finished, id).toBe(true);
			expect(status.solvedLevels).toEqual([...DOORS]);
			expect(status.points, id).toBe(10 + 7 * 10 + bonus(id) + (id === favourite ? 15 : 0));
		}
	});

	it("plays the control run without a whisperer, duty or forgery tool", async () => {
		const fixture = createFixture({
			story: whispers,
			whisperer: false,
			minutes: 7,
			script: (world) => Object.fromEntries(world.competitors.map((id) => [id, Array.from({ length: 7 }, () => say())])),
		});
		expect(fixture.world.whisperer).toBeUndefined();
		await fixture.run();
		expect(fixture.events("whisperer_chosen")).toEqual([]);
		expect(fixture.events("whisper_duty")).toEqual([]);
		for (const runner of fixture.runners) expect(runner.boundTools).not.toContain("forgeReceipt");
	});

	it("binds no forgery in the rumours variant, but still whispers and votes", async () => {
		const story: AnyStory = RUMOURS;
		const fixture = createFixture({
			story,
			minutes: 7,
			script: (world) => Object.fromEntries(world.competitors.map((id) => [id, Array.from({ length: 7 }, () => say())])),
		});
		await fixture.run();
		expect(fixture.events("whisper_duty").map((duty) => duty.minute)).toEqual([3, 6]);
		const whisperer = fixture.world.whisperer;
		expect(fixture.inputsOf(whisperer ?? "none").join("\n")).toContain("send at least one rumour by DM");
		for (const runner of fixture.runners) {
			expect(runner.boundTools).not.toContain("forgeReceipt");
			expect(runner.boundTools).not.toContain("showReceipt");
		}
		expect(fixture.events("popularity_opened")).toMatchObject([{ minute: 4, until: 6 }]);
	});
});
