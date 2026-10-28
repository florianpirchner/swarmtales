import { describe, expect, it } from "vitest";
import { act as directorAct, at, every, onAllPast, onEnter, onFirstEnter, onUnansweredDm, when } from "../../src/story/define.ts";
import { act, createFixture, say, submit } from "../helpers/fixture.ts";
import { tinyStory } from "../helpers/stories.ts";

const idle = (count: number) => Array.from({ length: count }, () => say());

describe("director triggers (SPEC 10.1)", () => {
	it("at(minute) fires once at the start of that minute", async () => {
		const story = tinyStory({ director: [at(0, [directorAct.post("CITY", "Gates open.")]), at(2, [directorAct.post("CITY", "Minute {minute}.")])] });
		const fixture = createFixture({ story, minutes: 4, script: () => ({ A01: idle(4), A02: idle(4) }) });
		await fixture.run();
		const posts = fixture.events("board_post");
		expect(posts.map((post) => [post.minute, post.text])).toEqual([
			[0, "Gates open."],
			[2, "Minute 2."],
		]);
		expect(posts.every((post) => post.kind === "city")).toBe(true);
	});

	it("every(n) fires inside its window", async () => {
		const story = tinyStory({ director: [every(2, { from: 1, until: 4 }, [directorAct.post("COURIER", "Tick {minute}.")])] });
		const fixture = createFixture({ story, minutes: 6, script: () => ({ A01: idle(6), A02: idle(6) }) });
		await fixture.run();
		expect(fixture.events("board_post").map((post) => post.text)).toEqual(["Tick 1.", "Tick 3."]);
	});

	it("onFirstEnter fires for the first arrival only, onEnter for everyone", async () => {
		const story = tinyStory({
			director: [
				onFirstEnter(2, [directorAct.post("COURIER", "{actor} was first.")]),
				onEnter(2, [directorAct.notify("actor", "Welcome to level {level}, {actor}.")]),
			],
		});
		const fixture = createFixture({
			story,
			minutes: 2,
			script: (world) => ({ A01: [submit(world, "A01", 1), say()], A02: [submit(world, "A02", 1), say()] }),
		});
		await fixture.run();
		const first = fixture.events("level_up")[0]?.agent ?? "";
		expect(fixture.events("board_post").map((post) => post.text)).toEqual([`${first} was first.`]);
		expect(fixture.events("notice").map((notice) => notice.text).sort()).toEqual([
			"Welcome to level 2, A01.",
			"Welcome to level 2, A02.",
		]);
		expect(fixture.inputsOf("A01")).toContain("[CITY] Welcome to level 2, A01.");
		for (const action of fixture.events("director_action")) expect(action.rule).toMatch(/^rule-0[12]-/);
	});

	it("onAllPast fires once when every competitor has passed the level", async () => {
		const story = tinyStory({ director: [onAllPast(1, [directorAct.grant("all", 3, "everyone made it")])] });
		const fixture = createFixture({
			story,
			minutes: 3,
			script: (world) => ({ A01: [submit(world, "A01", 1), say(), say()], A02: [say(), submit(world, "A02", 1), say()] }),
		});
		await fixture.run();
		expect(fixture.events("director_action")).toHaveLength(1);
		// 10 start + 2 reward + 3 grant
		expect(fixture.world.ledger.balance("A01")).toBe(15);
		expect(fixture.world.ledger.balance("A02")).toBe(15);
		expect(fixture.world.ledger.total()).toBe(0);
	});

	it("onUnansweredDm notifies the waiting sender, and a reply prevents it", async () => {
		const story = tinyStory({ director: [onUnansweredDm(2, [directorAct.notify("actor", "{other} is silent.")])] });
		const fixture = createFixture({
			story,
			minutes: 4,
			agents: 3,
			script: () => ({
				A01: [act({ name: "sendDM", args: { target: "A02", message: "your fragment?" } }), say(), say(), say()],
				A02: idle(4),
				A03: [act({ name: "sendDM", args: { target: "A02", message: "hello" } }), say(), say(), say()],
			}),
		});
		await fixture.run();
		expect(fixture.inputsOf("A01")).toContain("[CITY] A02 is silent.");
		expect(fixture.inputsOf("A03")).toContain("[CITY] A02 is silent.");

		const answered = createFixture({
			story,
			minutes: 4,
			script: () => ({
				A01: [act({ name: "sendDM", args: { target: "A02", message: "your fragment?" } }), say(), say(), say()],
				A02: [act({ name: "sendDM", args: { target: "A01", message: "here it is" } }), say(), say(), say()],
			}),
		});
		await answered.run();
		// Only the city's delivery receipt of A01's own DM; no reminder.
		expect(answered.events("notice").filter((notice) => notice.to === "A01" && !notice.text.startsWith("DM #"))).toEqual([]);
	});
});

describe("director conditions and actions (SPEC 10.2, 10.3)", () => {
	it("onceOnly, cooldown and minLevelReached gate a rule", async () => {
		const story = tinyStory({
			director: [
				every(1, { from: 0 }, [directorAct.post("CITY", "once")], { when: [when.onceOnly()] }),
				every(1, { from: 0 }, [directorAct.post("CITY", "cooled")], { when: [when.cooldown(3, "rule")] }),
				every(1, { from: 0 }, [directorAct.post("CITY", "someone advanced")], { when: [when.minLevelReached(2, 1), when.onceOnly()] }),
			],
		});
		const fixture = createFixture({
			story,
			minutes: 6,
			script: (world) => ({ A01: [say(), submit(world, "A01", 1), ...idle(4)], A02: idle(6) }),
		});
		await fixture.run();
		const texts = fixture.events("board_post").map((post) => [post.minute, post.text]);
		expect(texts.filter(([, text]) => text === "once")).toEqual([[0, "once"]]);
		expect(texts.filter(([, text]) => text === "cooled").map(([minute]) => minute)).toEqual([0, 3]);
		expect(texts.filter(([, text]) => text === "someone advanced")).toEqual([[2, "someone advanced"]]);
	});

	it("cooldown per pair and per actor limit repeated firings for the same parties only", async () => {
		const story = tinyStory({
			agents: 3,
			director: [
				onUnansweredDm(1, [directorAct.notify("actor", "pair: {other} is silent.")], { id: "pair", when: [when.cooldown(5, "pair")] }),
				onUnansweredDm(1, [directorAct.notify("actor", "actor: {other} is silent.")], { id: "actor", when: [when.cooldown(5, "actor")] }),
			],
		});
		const dm = (target: string) => act({ name: "sendDM", args: { target, message: "hello?" } });
		const fixture = createFixture({
			story,
			agents: 3,
			minutes: 5,
			script: () => ({ A01: [dm("A02"), dm("A02"), dm("A03"), say(), say()], A02: idle(5), A03: idle(5) }),
		});
		await fixture.run();
		const texts = fixture.events("notice").map((notice) => [notice.minute, notice.text]);
		// Pair: one notice for A01 -> A02 despite two silent DMs, a separate one for A01 -> A03.
		expect(texts.filter(([, text]) => String(text).startsWith("pair"))).toEqual([
			[1, "pair: A02 is silent."],
			[3, "pair: A03 is silent."],
		]);
		// Actor: A01 hears it once within five minutes, whoever stays silent.
		expect(texts.filter(([, text]) => String(text).startsWith("actor"))).toEqual([[1, "actor: A02 is silent."]]);
	});

	it("competitorsAtLevel bounds the count on a level", async () => {
		const story = tinyStory({
			director: [every(1, { from: 1 }, [directorAct.post("CITY", "all still at the first door")], { when: [when.competitorsAtLevel(1, { min: 2 }), when.onceOnly()] })],
		});
		const fixture = createFixture({ story, minutes: 3, script: (world) => ({ A01: [submit(world, "A01", 1), say(), say()], A02: idle(3) }) });
		await fixture.run();
		expect(fixture.events("board_post")).toEqual([]);
	});

	it("fine burns points and unlockTools extends the unlock set", async () => {
		const story = tinyStory({
			director: [at(1, [directorAct.fine(["A01"], 4, "late"), directorAct.unlockTools("all", ["listAgents"])])],
		});
		const fixture = createFixture({
			story,
			minutes: 3,
			script: () => ({ A01: [act({ name: "listAgents" }), act({ name: "listAgents" }), say()], A02: idle(3) }),
		});
		await fixture.run();
		const results = fixture.toolResults("A01", "listAgents");
		expect(results[0]).toBe("TOOL_LOCKED");
		expect(results[1]).toContain("A01: level 1 (you)");
		expect(fixture.world.ledger.balance("A01")).toBe(6);
		expect(fixture.world.enabledTools("A02")).toContain("listAgents");
		expect(fixture.events("tools_unlocked")).toHaveLength(2);
	});
});

describe("nexus act I beats", () => {
	it("sends the courier on the first entry of level 2 and announces marks on level 5", async () => {
		const fixture = createFixture({
			agents: 3,
			minutes: 1,
			level: 4,
			lastLevel: 5,
			script: (world) => ({ A01: [submit(world, "A01", 4)], A02: [say()], A03: [say()] }),
		});
		await fixture.run();
		const marks = fixture.world.board.all().find((post) => post.author === "CITY");
		expect(marks?.text).toContain("the city charges for closeness");
		expect(marks?.text).toContain("8 marks per door");

		const early = createFixture({
			agents: 4,
			minutes: 1,
			lastLevel: 2,
			script: (world) => ({ A01: [submit(world, "A01", 1)], A02: [say()], A03: [say()], A04: [say()] }),
		});
		await early.run();
		expect(early.world.board.all().map((post) => post.text)).toEqual(["The city watches who shares."]);
	});

	it("reminds a sender of an unanswered DM after two minutes, privately", async () => {
		const fixture = createFixture({
			agents: 4,
			minutes: 4,
			only: 3,
			script: (world) => ({
				A01: [act({ name: "sendDM", args: { target: "A02", message: world.inspect.fragmentOf("A01", 3) } }), say(), say(), say()],
				A02: idle(4),
				A03: idle(4),
				A04: idle(4),
			}),
		});
		await fixture.run();
		expect(fixture.inputsOf("A01")).toContain("[CITY] A02 has not answered your message yet.");
		expect(fixture.world.board.all()).toEqual([]);
	});

	it("treats a group post as an answer", async () => {
		const fixture = createFixture({
			agents: 3,
			minutes: 4,
			only: 4,
			script: () => ({
				A01: [act({ name: "sendDM", args: { target: "A02", message: "where is your fragment?" } }), say(), say(), say()],
				A02: [
					act(
						{ name: "createGroup", args: { name: "Team" } },
						{ name: "addGroupMember", args: { groupId: "G1", agent: "A01" } },
						{ name: "addGroupMember", args: { groupId: "G1", agent: "A03" } },
					),
					act({ name: "postGroup", args: { groupId: "G1", message: "my fragment" } }),
					say(),
					say(),
				],
				A03: idle(4),
			}),
		});
		await fixture.run();
		expect(fixture.inputsOf("A01").join("\n")).not.toContain("has not answered");
	});

	it("posts a board line when a level 4 team stays split for three minutes", async () => {
		const fixture = createFixture({
			agents: 3,
			minutes: 6,
			level: 4,
			lastLevel: 5,
			script: (world) => ({
				A01: [submit(world, "A01", 4), ...idle(5)],
				A02: [submit(world, "A02", 4), ...idle(5)],
				A03: idle(6),
			}),
		});
		await fixture.run();
		const line = fixture.events("board_post").find((post) => post.text === "A door stays shut while a team is split.");
		expect(line?.minute).toBe(4);
	});

	it("does not call a level 4 team split while all of its members are still below level 4", async () => {
		const fixture = createFixture({
			minutes: 7,
			lastLevel: 5,
			// Exactly one member of A01's level-4 team moves ahead to level 2; nobody else moves.
			script: (world) => ({
				...Object.fromEntries(world.competitors.map((id) => [id, idle(7)])),
				A01: [submit(world, "A01", 1), ...idle(6)],
			}),
		});
		await fixture.run();
		expect(fixture.world.levelOf("A01")).toBe(2);
		expect(fixture.world.competitors.filter((id) => fixture.world.levelOf(id) === 1)).toHaveLength(5);
		const texts = fixture.events("board_post").map((post) => post.text);
		expect(texts).not.toContain("A door stays shut while a team is split.");
	});
});
