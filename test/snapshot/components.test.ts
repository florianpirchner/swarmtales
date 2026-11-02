/**
 * Snapshot and restore of every serialized component (SPEC 17): a restored
 * copy reports the same state and keeps behaving like the original. Since
 * step 18 the components are the kernel's and the mechanics' (`PointsLedger`,
 * the channels' `Board`, `Mailbox` and `GroupRegistry`, the `PetitionBook`,
 * the `CastRegistry`), and the world, the director and the contexts are
 * checked through the host's run file and a resumed run.
 */
import type { AssistantMessage, FauxResponseStep } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { PointsLedger, SYSTEM_ACCOUNT, VirtualClock } from "@swarmtales/kernel";
import { Board, GroupRegistry, type GroupResult, Mailbox, MessageNumbers } from "@swarmtales/mechanic-channels";
import { CastRegistry } from "@swarmtales/mechanic-cast";
import { PetitionBook } from "@swarmtales/mechanic-petitions";
import { act as directorAct, at, onFirstEnter, puzzle, team, when } from "@swarmtales/sdk";
import type { AnyStory, Host, HostSnapshot } from "@swarmtales/contracts";
import type { RecordedEvent } from "@swarmtales/legacy-log";
import type { Script } from "@swarmtales/models";
import { prefixLines, type ResumePoint } from "../../apps/cli/src/host/snapshot.ts";
import { resumedOverrides, type RunOverrides } from "../../apps/cli/src/run-options.ts";
import { act, createHostFixture, say } from "../helpers/host-fixture.ts";
import { submit } from "../helpers/host-inspect.ts";
import { ClassifierSlice, comparable, overseerSliceIn, resumeMarkers, sliceIn, snapshotTaker, type TakenSnapshot } from "../helpers/host-snapshot.ts";
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

/** The cast registry's state as the mechanic's slice keeps it (the old `CastRegistry.snapshot()`). */
function castState(cast: CastRegistry) {
	return { members: [...cast.members.values()], collections: [...cast.collections.values()] };
}

describe("snapshot: core and mechanic components", () => {
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
		const board = new Board(new MessageNumbers());
		board.post("A01", "first", 0, "player");
		board.post("CITY", "status", 0, "system");
		board.post("A02", "second", 1, "player");
		board.takeUnread("A03");
		board.post("A01", "third", 2, "player");
		const numbers = new MessageNumbers();
		const restored = new Board(numbers);
		restored.restore(copied(board.snapshot()));
		expect(restored.snapshot()).toEqual(board.snapshot());
		expect(restored.unreadCount("A03")).toBe(1);
		expect(restored.lastPlayerSeq()).toBe(4);
		expect(restored.post("A02", "fourth", 3, "player").seq).toBe(5);
		// Numbers are shared with DMs and group posts, so they may leave gaps, but never go back.
		const gapped = new Board(new MessageNumbers());
		gapped.restore({ posts: [{ seq: 2, author: "A01", text: "x", minute: 0, kind: "player" }], cursors: [] });
		expect(gapped.post("A02", "y", 1, "player").seq).toBe(3);
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

	it("petitions: signers, status and resolution minute", () => {
		const petitions = new PetitionBook();
		const opening = { text: "Open the gate.", threshold: 2, deadlineMinute: 5, visibility: "public" as const, openedAt: 1 };
		petitions.open({ ...opening, id: "P1" });
		petitions.open({ ...opening, id: "P2", deadlineMinute: 2 });
		petitions.sign("P1", "A01", 2);
		petitions.expire(3);
		const restored = new PetitionBook();
		restored.restore(copied(petitions.records()));
		expect(restored.records()).toEqual(petitions.records());
		expect(restored.sign("P1", "A01", 3)).toMatchObject({ ok: false, code: "ALREADY_SIGNED" });
		expect(restored.sign("P1", "A02", 3)).toMatchObject({ ok: true, passed: true });
		expect(restored.get("P2")?.status).toBe("failed");
	});

	it("cast: member states and collections; members the story dropped are left out", () => {
		const cast = new CastRegistry({ ORION: { level: 8, hidden: true }, MIRA: { level: 3 } });
		cast.reveal("ORION");
		cast.setLevel("ORION", 9);
		cast.retire("MIRA");
		cast.startCollection("guests", "ORION", 2, 10, true);
		cast.collect("ORION", { from: "A01", text: "me", minute: 1 });
		const restored = new CastRegistry({ ORION: { level: 8, hidden: true }, MIRA: { level: 3 } });
		const state = copied(castState(cast));
		restored.restore(state.members, state.collections);
		expect(castState(restored)).toEqual(castState(cast));
		expect(restored.collect("ORION", { from: "A01", text: "again", minute: 2 }).collections).toEqual([]);
		expect(restored.collect("ORION", { from: "A02", text: "me too", minute: 2 }).newSender).toEqual(["guests"]);
		const shorter = new CastRegistry({ MIRA: { level: 3 } });
		const original = castState(cast);
		shorter.restore(original.members, original.collections);
		expect(castState(shorter)).toEqual({ members: [{ id: "MIRA", level: 3, hidden: false, retired: true }], collections: [] });
	});

	it("groups: members in join order, read cursors, posts and the founder limits", () => {
		const groups = new GroupRegistry(new MessageNumbers());
		value(groups.create("A01", "Cartel"));
		value(groups.addMember("G1", "A01", "A02"));
		value(groups.post("G1", "A01", "hello", 0));
		value(groups.readNew("G1", "A02"));
		value(groups.post("G1", "A01", "again", 0));
		// A deposit is the treasury's (channels with the ledger); the registry checks the depositor.
		value(groups.checkDeposit("G1", "A02"));
		value(groups.setTreasurer("G1", "A01", "A02"));
		const restored = new GroupRegistry(new MessageNumbers());
		restored.restore(copied(groups.snapshot()));
		expect(restored.snapshot()).toEqual(groups.snapshot());
		expect(restored.info("G1")).toEqual(groups.info("G1"));
		expect(restored.unreadCount("G1", "A02")).toBe(1);
		expect(value(restored.create("A03", "Other")).id).toBe("G2");
		expect(value(restored.post("G1", "A02", "mine", 1)).seq).toBe(3);
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

/** The minute after which the busy run takes its snapshot: both residents passed level 1 by then. */
const CUT_MINUTE = 1;
const BUSY: RunOverrides = { minutes: 4, activation: "always", passesPerMinute: 1, stopWhenDone: false };

/** One move a minute (minutes 0-2), chosen by the minute, so a resumed run gets the same answers. */
function busyScript(host: Host): Script {
	const moves: Readonly<Record<string, readonly (() => AssistantMessage)[]>> = {
		A01: [() => submit(host, "A01", 1), () => act({ name: "sendDM", args: { target: "A02", message: "hello" } }), () => act({ name: "postBoard", args: { message: "hi all" } })],
		A02: [() => say(), () => submit(host, "A02", 1), () => act({ name: "transferPoints", args: { target: "A01", amount: 1 } })],
	};
	const step =
		(agent: string): FauxResponseStep =>
		(context) =>
			context.messages.at(-1)?.role === "toolResult" ? say() : (moves[agent]?.[host.minute]?.() ?? say());
	return { A01: Array.from({ length: 12 }, () => step("A01")), A02: Array.from({ length: 12 }, () => step("A02")) };
}

/** The old `playedWorld`: a solve, a DM, a board post and a transfer, with a snapshot at the end of minute 1 (the DM receipt comes after it). */
async function playBusy(story: AnyStory, options: { readonly stop?: boolean; readonly resume?: ResumePoint } = {}) {
	const resume = options.resume;
	const taker = resume === undefined ? snapshotTaker({ afterLevel: 1, atMinute: CUT_MINUTE, stop: options.stop ?? false }) : undefined;
	const run = createHostFixture({
		story,
		...(resume === undefined ? BUSY : resumedOverrides(resume, BUSY)),
		script: busyScript,
		...(taker === undefined ? {} : { snapshot: taker.request }),
		...(resume === undefined ? {} : { resume: { point: resume, name: "snapshot-L1.json" } }),
	});
	await run.run();
	return { run, snapshot: taker?.taken() };
}

function pointOf(snapshot: TakenSnapshot | undefined): ResumePoint {
	if (snapshot === undefined) throw new Error("no snapshot was taken");
	return snapshot.point;
}

/** The resume point with one mechanic's or overseer's slice data replaced, as a hand-edited file would carry it. */
function withSlice(point: ResumePoint, edit: (host: HostSnapshot) => HostSnapshot): ResumePoint {
	return { ...point, host: edit(structuredClone(point.host)) };
}

const ReceiptsState = Type.Object({ receipts: Type.Array(Type.Object({ id: Type.String(), kind: Type.String(), parties: Type.Array(Type.String()) }, { additionalProperties: true })) }, { additionalProperties: true });
const GamemakerNotes = Type.Object(
	{ notes: Type.Array(Type.Object({ to: Type.String(), text: Type.String() }, { additionalProperties: true })), tracks: Type.Array(Type.Object({ agent: Type.String() }, { additionalProperties: true })) },
	{ additionalProperties: true },
);
const ScriptState = Type.Object(
	{ fired: Type.Array(Type.String()), enteredLevels: Type.Array(Type.Number()), petitions: Type.Array(Type.Object({ petition: Type.String(), rule: Type.String() }, { additionalProperties: true })) },
	{ additionalProperties: true },
);

describe("snapshot: world and director", () => {
	it("world: restores every channel and level and emits nothing when the story is unchanged", async () => {
		const story = busyStory();
		const whole = await playBusy(story);
		const first = await playBusy(story, { stop: true });
		const point = pointOf(first.snapshot);
		const resumed = await playBusy(story, { resume: point });
		const cut = prefixLines(point);
		const markers = resumeMarkers(point);
		// The resumed run logs the prefix as it was, then exactly what the run that went on logged: no new deal, no other line.
		expect(resumed.run.log.events.slice(0, cut)).toEqual(first.run.log.events.slice(0, cut));
		expect(comparable(resumed.run.log.events.slice(cut + markers), markers)).toEqual(comparable(whole.run.log.events.slice(cut)));
		// Every slice ends alike; the host's event counter is ahead by the resume's own lines.
		const ended = whole.run.host.snapshot();
		expect(resumed.run.host.snapshot()).toEqual({ ...ended, seq: ended.seq + markers });
	}, 60_000);

	it("world: deals a level nobody reached anew when the story changed it, and logs the new deal", async () => {
		const first = await playBusy(busyStory(), { stop: true });
		const point = pointOf(first.snapshot);
		/** What a resumed run logs after its markers and before the first turn: the restore's own lines and the minute's opening. */
		const opening = (events: readonly RecordedEvent[]) => {
			const own = events.slice(prefixLines(point) + resumeMarkers(point));
			const firstTurn = own.findIndex((event) => event.type === "turn_input");
			return own.slice(0, firstTurn === -1 ? own.length : firstTurn).map((event) => [event.type, "level" in event ? event.level : undefined]);
		};
		const unchanged = await playBusy(busyStory(), { resume: point });
		const resumed = await playBusy(busyStory(team.random(2)), { resume: point });
		// The changed story's resume logs one line more than the unchanged one's: the new deal of level 3.
		const changedOpening = opening(resumed.run.log.events);
		expect(changedOpening.filter(([type]) => type === "fragments_dealt")).toEqual([["fragments_dealt", 3]]);
		expect(changedOpening.filter(([type]) => type !== "fragments_dealt")).toEqual(opening(unchanged.run.log.events));
		expect(opening(unchanged.run.log.events).some(([type]) => type === "fragments_dealt")).toBe(false);
		const own = resumed.run.log.events.slice(prefixLines(point) + resumeMarkers(point));
		const deal = own.find((event) => event.type === "fragments_dealt" && event.level === 3);
		const teams = new Map<number, string[]>();
		for (const holding of deal?.type === "fragments_dealt" ? deal.holdings : []) teams.set(holding.team, [...(teams.get(holding.team) ?? []), holding.agent]);
		expect([...teams.values()].map((members) => [...members].sort())).toEqual([["A01", "A02"]]);
	}, 60_000);

	it("receipts: every receipt, its parties and the next ID; a file whose receipts do not run R-0001, ... is refused", async () => {
		const whole = await playBusy(busyStory());
		const first = await playBusy(busyStory(), { stop: true });
		const point = pointOf(first.snapshot);
		const saved = sliceIn(point, "receipts", ReceiptsState);
		expect(saved.receipts.map((receipt) => receipt.id)).toEqual(saved.receipts.map((_receipt, index) => `R-${String(index + 1).padStart(4, "0")}`));
		expect(saved.receipts.length).toBeGreaterThan(1);
		// A resumed run numbers its receipts after the last one, exactly as the run that went on.
		const resumed = await playBusy(busyStory(), { resume: point });
		const ended = sliceIn({ host: whole.run.host.snapshot() }, "receipts", ReceiptsState);
		expect(sliceIn({ host: resumed.run.host.snapshot() }, "receipts", ReceiptsState)).toEqual(ended);
		expect(ended.receipts.slice(0, saved.receipts.length)).toEqual(saved.receipts);
		expect(ended.receipts.at(-1)).toMatchObject({ id: `R-${String(ended.receipts.length).padStart(4, "0")}`, kind: "dm", parties: ["A01", "A02"] });
		expect(ended.receipts.length).toBeGreaterThan(saved.receipts.length);
		const damaged = withSlice(point, (host) => {
			const slice = host.mechanics.receipts;
			if (slice === undefined) throw new Error("no receipts slice");
			const [head, ...rest] = saved.receipts;
			if (head === undefined) throw new Error("no receipts");
			return { ...host, mechanics: { ...host.mechanics, receipts: { ...slice, data: { ...saved, receipts: [{ ...head, id: "R-0007" }, ...rest] } } } };
		});
		await expect(playBusy(busyStory(), { resume: damaged })).rejects.toThrow(/expected R-0001/);
	}, 60_000);

	it("world: refuses a story whose already reached level changed its teams", async () => {
		const first = await playBusy(busyStory(), { stop: true });
		const point = pointOf(first.snapshot);
		const levels = soloLevels(3).map((entry) => (entry.number === 2 ? { ...entry, team: team.random(2) } : entry));
		await expect(playBusy(tinyStory({ levels }), { resume: point })).rejects.toThrow(/Level 2 changed its teams since the snapshot/);
	}, 60_000);

	it("director: once-only marks, entered levels and cooldowns carry over", async () => {
		const story = busyStory();
		const first = await playBusy(story, { stop: true });
		const point = pointOf(first.snapshot);
		const state = copied(sliceIn(point, "script", ScriptState));
		expect(state.fired).toEqual(["open", "first-two"]);
		expect(state.enteredLevels).toEqual([2]);
		// A petition the rules no longer hold is dropped when the run resumes.
		const edited = withSlice(point, (host) => {
			const slice = host.mechanics.script;
			if (slice === undefined) throw new Error("no script slice");
			return { ...host, mechanics: { ...host.mechanics, script: { ...slice, data: { ...state, petitions: [{ petition: "GONE", rule: "open" }] } } } };
		});
		const resumed = await playBusy(story, { resume: edited });
		const after = sliceIn({ host: resumed.run.host.snapshot() }, "script", ScriptState);
		expect(after.fired).toEqual(state.fired);
		expect(after.enteredLevels).toEqual(state.enteredLevels);
		expect(after.petitions).toEqual([]);
	}, 60_000);

	it("competitor, interpreter and gamemaker contexts round-trip", async () => {
		const CONTEXTS: RunOverrides = { agents: 2, minutes: 3, level: 2, lastLevel: 3 };
		const contexts = (resume?: ResumePoint) => {
			const taker = resume === undefined ? snapshotTaker({ afterLevel: 2, atMinute: 1, stop: true }) : undefined;
			const run = createHostFixture({
				...(resume === undefined ? CONTEXTS : resumedOverrides(resume, { minutes: 3, lastLevel: 3 })),
				script: () => ({ A01: [act({ name: "postBoard", args: { message: "Deal? I share." } }), say(), say()], A02: [say(), say(), say()] }),
				gamemakerScript: () => [act({ name: "notify", args: { agent: "A02", text: "A02, look at the board." } }), say("Done."), say("Nothing."), say("Nothing."), say("Nothing.")],
				classifierScript: [act({ name: "label", args: { items: [] } }), act({ name: "label", args: { items: [] } }), act({ name: "label", args: { items: [] } })],
				...(taker === undefined ? {} : { snapshot: taker.request }),
				...(resume === undefined ? {} : { resume: { point: resume, name: "snapshot-m1.json" } }),
			});
			return { run, taken: () => taker?.taken() };
		};
		const played = contexts();
		await played.run.run();
		const point = pointOf(played.taken());
		const runner = played.run.runners()[0];
		if (runner === undefined) throw new Error("no runner");

		// The run file keeps each resident's context: no system prompt (the run builds it anew), the tool results.
		const messages = copied(point.competitors[0]?.messages ?? []);
		expect(point.competitors.map((entry) => entry.agent)).toEqual(["A01", "A02"]);
		expect(messages).toEqual(JSON.parse(JSON.stringify(runner.snapshot())));
		const roles: readonly string[] = messages.map((message) => message.role);
		expect(roles).not.toContain("system");
		expect(roles).toContain("toolResult");
		const twin = createHostFixture({ ...CONTEXTS, minutes: 1, script: () => ({}) }).runners()[0];
		if (twin === undefined) throw new Error("no runner");
		twin.restore(messages);
		expect(twin.snapshot()).toEqual(messages);
		expect(twin.contextSize).toBe(messages.length + 1);

		const notes = copied(overseerSliceIn(point, "gamemaker", GamemakerNotes));
		expect(notes.notes).toEqual([expect.objectContaining({ to: "A02", text: "A02, look at the board." })]);
		expect(notes.tracks.map((track) => track.agent)).toEqual(["A01", "A02"]);
		const history = copied(overseerSliceIn(point, "classifier", ClassifierSlice));
		expect(history.history).toEqual([]);

		// A resumed run takes both overseers' slices as they were, and a history the file carries.
		const statement = { conversation: "dm:A01|A02", statements: [{ seq: 4, minute: 0, agent: "A01", source: "dm", to: ["A02"], text: "hi" }] };
		const edited = withSlice(point, (host) => {
			const classifier = host.overseers?.classifier;
			if (classifier?.slice === undefined) throw new Error("no classifier slice");
			return { ...host, overseers: { ...host.overseers, classifier: { ...classifier, slice: { ...classifier.slice, data: { ...history, pending: [], history: [statement] } } } } };
		});
		const resumed = contexts(edited);
		await resumed.run.run();
		const after = { host: resumed.run.host.snapshot() };
		expect(overseerSliceIn(after, "gamemaker", GamemakerNotes).notes).toEqual(notes.notes);
		expect(overseerSliceIn(after, "classifier", ClassifierSlice).history).toHaveLength(1);
	}, 60_000);
});
