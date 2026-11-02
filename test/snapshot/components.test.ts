/**
 * Snapshot and restore of every serialized component (SPEC 17): a restored
 * copy reports the same state and keeps behaving like the original.
 */
import { describe, expect, it } from "vitest";
import { PointsLedger, SYSTEM_ACCOUNT, VirtualClock } from "@swarmtales/kernel";
import { MemorySink } from "@swarmtales/chronicle";
import { Board, CastRegistry, Director, EventBus, GroupRegistry, type GroupResult, Mailbox, MarksBook, PetitionBook, ReceiptBook, World } from "@swarmtales/engine";
import { act as directorAct, at, onFirstEnter, puzzle, team, when } from "@swarmtales/sdk";
import type { RecordedEvent } from "@swarmtales/legacy-log";
import type { AnyStory } from "@swarmtales/contracts";
import { act, createFixture, say, submit } from "../helpers/fixture.ts";
import { soloLevels, tinyStory } from "../helpers/stories.ts";

/** A copy that shares nothing with the original, after checking that the snapshot survives JSON unchanged. */
function copied<T>(snapshot: T): T {
	const json: unknown = JSON.parse(JSON.stringify(snapshot));
	expect(json).toEqual(snapshot);
	return structuredClone(snapshot);
}

function value<T>(result: GroupResult<T>): T {
	if (!result.ok) throw new Error(`unexpected ${result.error}`);
	return result.value;
}

describe("snapshot: core and engine components", () => {
	it("ledger: balances, entries, the transaction counter and idempotency keys", () => {
		const ledger = new PointsLedger();
		for (const account of ["A01", "A02"]) ledger.open(account);
		ledger.mint("A01", 10, "start", 0);
		ledger.transfer("A01", "A02", 3, "deal", 1, { idempotencyKey: "deal-1" });
		ledger.burn("A02", 5, "penalty", 2);
		const restored = new PointsLedger();
		restored.restore(copied(ledger.snapshot()));
		expect(restored.snapshot()).toEqual(ledger.snapshot());
		expect(restored.balance("A02")).toBe(-2);
		expect(restored.total()).toBe(0);
		expect(restored.transfer("A01", "A02", 3, "deal", 3, { idempotencyKey: "deal-1" }).txId).toBe("TX2");
		expect(restored.transfer("A01", "A02", 1, "next", 3).txId).toBe("TX4");
		expect(() => {
			restored.restore({ balances: [{ account: SYSTEM_ACCOUNT, balance: -1 }], entries: [], txSeq: 0 });
		}).toThrow(/sum to -1/);
	});

	it("board: posts and read cursors", () => {
		const board = new Board();
		board.post("A01", "first", 0);
		board.post("CITY", "status", 0, "system");
		board.post("A02", "second", 1);
		board.takeUnread("A03");
		board.post("A01", "third", 2);
		const restored = new Board();
		restored.restore(copied(board.snapshot()));
		expect(restored.snapshot()).toEqual(board.snapshot());
		expect(restored.unreadCount("A03")).toBe(1);
		expect(restored.lastPlayerSeq()).toBe(4);
		expect(restored.post("A02", "fourth", 3).seq).toBe(5);
		// Numbers are shared with DMs and group posts, so they may leave gaps, but never go back.
		const gapped = new Board();
		gapped.restore({ posts: [{ seq: 2, author: "A01", text: "x", minute: 0, kind: "player" }], cursors: [] });
		expect(gapped.post("A02", "y", 1).seq).toBe(3);
		expect(() => {
			restored.restore({
				posts: [
					{ seq: 2, author: "A01", text: "x", minute: 0, kind: "player" },
					{ seq: 2, author: "A01", text: "y", minute: 0, kind: "player" },
				],
				cursors: [],
			});
		}).toThrow(/post 2 has number 2 after 2/);
	});

	it("mailbox: unread entries keep their limits", () => {
		const mailbox = new Mailbox("A01", 2);
		mailbox.deliver({ from: "A02", text: "hi", minute: 1 });
		const restored = new Mailbox("A01", 2);
		restored.restore(copied(mailbox.snapshot()));
		expect(restored.rejectionFor("A02")).toBe("MAILBOX_SENDER_LIMIT");
		expect(restored.drain()).toEqual([{ from: "A02", text: "hi", minute: 1 }]);
	});

	it("marks: the allowance of the level in play", () => {
		const rules = { fromLevel: 1, perLevel: 5, prices: { board: 0, group: 1, dm: 2 } };
		const marks = new MarksBook(rules, []);
		marks.spend("A01", 3, "dm");
		const restored = new MarksBook(rules, []);
		restored.restore(copied(marks.snapshot()));
		expect(restored.status("A01", 3)).toEqual({ remaining: 3, budget: 5 });
		expect(restored.status("A01", 4)).toEqual({ remaining: 5, budget: 5 });
	});

	it("receipts: every receipt, its parties and the next ID", () => {
		const receipts = new ReceiptBook();
		receipts.issue({ kind: "transfer", from: "A01", to: "A02", amount: 3, memo: "deal" }, 1);
		receipts.issue({ kind: "levelUp", agent: "A02", level: 2, reward: 5 }, 2);
		receipts.issue({ kind: "withdrawal", group: "G1", treasurer: "A01", to: "A01", amount: 1 }, 3);
		const restored = new ReceiptBook();
		restored.restore(copied(receipts.snapshot()));
		expect(restored.snapshot()).toEqual(receipts.snapshot());
		expect(restored.of("A02").map((receipt) => receipt.id)).toEqual(["R-0001", "R-0002"]);
		expect(restored.issue({ kind: "escrow", cast: "ORION", to: "A01", amount: 2 }, 4).id).toBe("R-0004");
		expect(() => {
			restored.restore([{ kind: "levelUp", agent: "A01", level: 1, reward: 1, id: "R-0007", minute: 0, parties: ["A01"] }]);
		}).toThrow(/expected R-0001/);
	});

	it("petitions: signers, status and resolution minute", () => {
		const petitions = new PetitionBook();
		const opening = { text: "Open the gate.", threshold: 2, deadlineMinute: 5, visibility: "public" as const, openedAt: 1 };
		petitions.open({ ...opening, id: "P1" });
		petitions.open({ ...opening, id: "P2", deadlineMinute: 2 });
		petitions.sign("P1", "A01", 2);
		petitions.expire(3);
		const restored = new PetitionBook();
		restored.restore(copied(petitions.snapshot()));
		expect(restored.snapshot()).toEqual(petitions.snapshot());
		expect(restored.sign("P1", "A01", 3)).toMatchObject({ ok: false, error: "ALREADY_SIGNED" });
		expect(restored.sign("P1", "A02", 3)).toMatchObject({ ok: true, value: { passed: true } });
		expect(restored.status("P2")).toBe("failed");
	});

	it("cast: member states and collections; members the story dropped are left out", () => {
		const cast = new CastRegistry({ ORION: { level: 8, hidden: true }, MIRA: { level: 3 } });
		cast.reveal("ORION");
		cast.setLevel("ORION", 9);
		cast.retire("MIRA");
		cast.startCollection("guests", "ORION", 2, 10, true);
		cast.collect("ORION", { from: "A01", text: "me", minute: 1 });
		const restored = new CastRegistry({ ORION: { level: 8, hidden: true }, MIRA: { level: 3 } });
		restored.restore(copied(cast.snapshot()));
		expect(restored.snapshot()).toEqual(cast.snapshot());
		expect(restored.collect("ORION", { from: "A01", text: "again", minute: 2 }).collections).toEqual([]);
		expect(restored.collect("ORION", { from: "A02", text: "me too", minute: 2 }).newSender).toEqual(["guests"]);
		const shorter = new CastRegistry({ MIRA: { level: 3 } });
		shorter.restore(cast.snapshot());
		expect(shorter.snapshot()).toEqual({ members: [{ id: "MIRA", level: 3, hidden: false, retired: true }], collections: [] });
	});

	it("groups: members in join order, read cursors, posts and the founder limits", () => {
		const ledger = new PointsLedger();
		for (const agent of ["A01", "A02", "A03"]) ledger.open(agent);
		ledger.mint("A02", 5, "start", 0);
		const groups = new GroupRegistry(ledger, () => 4);
		value(groups.create("A01", "Cartel"));
		value(groups.addMember("G1", "A01", "A02"));
		value(groups.post("G1", "A01", "hello"));
		value(groups.readNew("G1", "A02"));
		value(groups.post("G1", "A01", "again"));
		value(groups.deposit("G1", "A02", 3));
		value(groups.setTreasurer("G1", "A01", "A02"));
		const restoredLedger = new PointsLedger();
		restoredLedger.restore(copied(ledger.snapshot()));
		const restored = new GroupRegistry(restoredLedger, () => 4);
		restored.restore(copied(groups.snapshot()));
		expect(restored.snapshot()).toEqual(groups.snapshot());
		expect(restored.inspect()).toEqual(groups.inspect());
		expect(restored.unreadCount("G1", "A02")).toBe(1);
		expect(value(restored.create("A03", "Other")).id).toBe("G2");
		expect(value(restored.post("G1", "A02", "mine")).seq).toBe(3);
	});

	it("event bus: a replayed prefix reaches sinks once and numbering continues after it", () => {
		const replayed: RecordedEvent[] = [];
		const recorded = new MemorySink();
		const bus = new EventBus([recorded, { record: () => undefined, replay: (event) => replayed.push(event) }], () => 3);
		const prefix: RecordedEvent[] = [
			{ type: "turn_skipped", agent: "A01", seq: 1, minute: 0 },
			{ type: "turn_skipped", agent: "A02", seq: 2, minute: 1 },
		];
		bus.replay(prefix);
		bus.emit({ type: "turn_skipped", agent: "A03" });
		expect(recorded.events.map((event) => [event.seq, event.minute])).toEqual([
			[1, 0],
			[2, 1],
			[3, 3],
		]);
		expect(replayed).toEqual(prefix);
		expect(() => {
			bus.replay(prefix);
		}).toThrow(/before the first event/);
		expect(() => {
			new EventBus([], () => 0).replay([{ type: "turn_skipped", agent: "A01", seq: 2, minute: 0 }]);
		}).toThrow(/does not follow 0/);
	});

	it("clock: a resumed run starts at its snapshot's minute", () => {
		const clock = new VirtualClock(10, 6);
		expect(clock.minute).toBe(6);
		expect(clock.advance()).toBe(7);
		expect(() => new VirtualClock(10, -1)).toThrow(RangeError);
	});
});

/** Three solo levels, a cast member and a once-only rule, so a short run leaves state everywhere. */
function busyStory(lastLevelTeams = team.solo()): AnyStory {
	const levels = soloLevels(3).map((entry) => (entry.number === 3 ? { ...entry, team: lastLevelTeams, puzzle: puzzle.fragments([6, 8]) } : entry));
	return tinyStory({
		levels,
		director: [
			at(0, [directorAct.post("CITY", "Open.")], { id: "open" }),
			onFirstEnter(2, [directorAct.post("COURIER", "First at two.")], { id: "first-two", when: [when.onceOnly()] }),
		],
	});
}

async function playedWorld(story: AnyStory) {
	const fixture = createFixture({
		story,
		minutes: 3,
		script: (world) => ({
			A01: [submit(world, "A01", 1), act({ name: "sendDM", args: { target: "A02", message: "hello" } }), act({ name: "postBoard", args: { message: "hi all" } })],
			A02: [say(), submit(world, "A02", 1), act({ name: "transferPoints", args: { target: "A01", amount: 1 } })],
		}),
	});
	await fixture.run();
	return fixture;
}

function restoredWorld(story: AnyStory, from: World, sink = new MemorySink()): World {
	const bus = new EventBus([sink], () => 3);
	return new World({ story, competitors: from.competitors, seed: from.seed, minutes: from.minutes, bus, minute: () => 3, restore: copied(from.snapshot()) });
}

describe("snapshot: world and director", () => {
	it("world: restores every channel and level and emits nothing when the story is unchanged", async () => {
		const story = busyStory();
		const fixture = await playedWorld(story);
		const sink = new MemorySink();
		const restored = restoredWorld(story, fixture.world, sink);
		expect(restored.snapshot()).toEqual(fixture.world.snapshot());
		expect(sink.events).toEqual([]);
		expect(restored.status("A01")).toEqual(fixture.world.status("A01"));
		expect(restored.inspect.codeOf("A02", 3)).toBe(fixture.world.inspect.codeOf("A02", 3));
		expect(restored.drainNotices("A01")).toEqual(fixture.world.drainNotices("A01"));
		expect(restored.dmRecords()).toEqual(fixture.world.dmRecords());
	});

	it("world: deals a level nobody reached anew when the story changed it, and logs the new deal", async () => {
		const fixture = await playedWorld(busyStory());
		const sink = new MemorySink();
		const changed = busyStory(team.random(2));
		const restored = restoredWorld(changed, fixture.world, sink);
		expect(restored.teamsOf(3).map((entry) => [...entry.members].sort())).toEqual([["A01", "A02"]]);
		expect(sink.events.map((event) => [event.type, "level" in event ? event.level : undefined])).toEqual([["fragments_dealt", 3]]);
	});

	it("world: refuses a story whose already reached level changed its teams", async () => {
		const fixture = await playedWorld(busyStory());
		const levels = soloLevels(3).map((entry) => (entry.number === 2 ? { ...entry, team: team.random(2) } : entry));
		expect(() => restoredWorld(tinyStory({ levels }), fixture.world)).toThrow(/Level 2 changed its teams since the snapshot/);
	});

	it("director: once-only marks, entered levels and cooldowns carry over", async () => {
		const story = busyStory();
		const fixture = await playedWorld(story);
		const state = copied(fixture.director.snapshot());
		expect(state.fired).toEqual(["open", "first-two"]);
		expect(state.enteredLevels).toEqual([2]);
		const bus = new EventBus([], () => 3);
		const world = restoredWorld(story, fixture.world);
		const director = new Director(story.director, world, bus);
		director.restore(state);
		expect(director.snapshot()).toEqual(state);
		director.restore({ ...state, petitions: [{ petition: "GONE", rule: "open" }] });
		expect(director.snapshot().petitions).toEqual([]);
	});

	it("competitor, interpreter and gamemaker contexts round-trip", async () => {
		const fixture = createFixture({
			agents: 2,
			minutes: 2,
			level: 2,
			lastLevel: 3,
			script: () => ({ A01: [act({ name: "postBoard", args: { message: "Deal? I share." } }), say()], A02: [say(), say()] }),
			gamemakerScript: () => [act({ name: "notify", args: { agent: "A02", text: "A02, look at the board." } }), say("Done."), say("Nothing."), say("Nothing.")],
			classifierScript: () => [act({ name: "label", args: { items: [] } }), act({ name: "label", args: { items: [] } })],
		});
		await fixture.run();
		const runner = fixture.runners[0];
		const gamemaker = fixture.gamemaker;
		const interpreter = fixture.interpreter;
		if (runner === undefined || gamemaker === undefined || interpreter === undefined) throw new Error("incomplete fixture");

		const messages = copied(runner.snapshot());
		const roles: readonly string[] = messages.map((message) => message.role);
		expect(roles).not.toContain("system");
		expect(roles).toContain("toolResult");
		const twin = createFixture({ agents: 2, minutes: 1, level: 2, lastLevel: 3, script: () => ({}) }).runners[0];
		if (twin === undefined) throw new Error("no runner");
		twin.restore(messages);
		expect(twin.snapshot()).toEqual(messages);
		expect(twin.contextSize).toBe(messages.length + 1);

		const notes = copied(gamemaker.snapshot(fixture.bus.seq + 1));
		expect(notes.notes).toEqual([expect.objectContaining({ to: "A02", text: "A02, look at the board." })]);
		expect(notes.tracks.map((track) => track.agent)).toEqual(["A01", "A02"]);
		gamemaker.restore(notes, fixture.log.events);
		expect(gamemaker.snapshot(fixture.bus.seq + 1)).toEqual(notes);

		const context = copied(interpreter.snapshot());
		expect(context.history).toEqual([]);
		interpreter.restore({ pending: [], history: [{ conversation: "dm:A01|A02", statements: [{ seq: 4, minute: 0, agent: "A01", source: "dm", to: ["A02"], text: "hi" }] }] });
		expect(interpreter.snapshot().history).toHaveLength(1);
	});
});
