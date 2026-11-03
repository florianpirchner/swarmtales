import { getCurrentTools, type AssistantMessage, type FauxResponseStep } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import {
	DIRECTOR_SUPPORT,
	type AnyStory,
	type GuardAnswer,
	type GuardJudge,
	type GuardQuestion,
	type GuardSecret,
	type GuardsSpec,
	type Host,
	type MarksRules,
	type PopularitySpec,
	type WhispererSpec,
} from "@swarmtales/contracts";
import { competitorIds } from "@swarmtales/kernel";
import { canAfford, runWide, spend, statusOf, type Book, type MarksState } from "@swarmtales/mechanic-marks";
import { carriesRun, codeForms } from "@swarmtales/mechanic-puzzles";
import { restoreVote } from "@swarmtales/mechanic-whispers";
import { level, puzzle, team, validateStory } from "@swarmtales/sdk";
import { act, createHostFixture as createFixture, say, type HostFixture, type HostFixtureOptions } from "../helpers/host-fixture.ts";
import { codeOf, dmReceiptOf, fragmentOf, receiptsOf, sliceOf, whispererOf } from "../helpers/host-inspect.ts";
import { socialLevels, tinyStory } from "../helpers/stories.ts";

const MARKS = { fromLevel: 1, perRun: 2, prices: { board: 0, group: 0, dm: 0, receipt: 1 } } as const satisfies MarksRules;
const WHISPERER = {
	agent: "A01",
	brief: "Your secret: you are the whisperer. You want discord.",
	forgery: true,
	duty: { kind: "every", everyMinutes: 3, fromMinute: 3, text: "Whisper before minute {next} (now {minute}); marks {marks}; forgeable: {forgeable}." },
} as const satisfies WhispererSpec;
const TEXTS = {
	announcement: "VOTE ({label}): name your favourite with nameFavourite until minute {until}; +{points}.",
	result: "Counted ({label}): {counts}. Winners {winners} +{points}.",
	noVotes: "Nobody voted ({label}): {counts}.",
} as const;
/** One vote three minutes before the end of ten, as the first Whispers had it. */
const POPULARITY = { rounds: [{ opensAt: 7, countsAt: 9, points: 15, label: "the final vote" }], texts: TEXTS } as const satisfies PopularitySpec;
/** Two rounds: before door 2 (open at 2, counted at 4, +5) and the final one (7 to 9, +15). */
const ROUNDS = {
	rounds: [
		{ opensAt: 2, countsAt: 4, points: 5, label: "before door 2" },
		{ opensAt: 7, countsAt: 9, points: 15, label: "the final vote" },
	],
	texts: TEXTS,
} as const satisfies PopularitySpec;
/** The city's own guard check (the prompt `replies/guard-check`; old `CHECK_REASON`). */
const CHECK_REASON = "the post carries part of a fragment; fragments travel by DM";

/** Four residents on one door with DMs and receipts; A01 whispers, a vote three minutes before the end of ten. */
function whisperStory(changes: Partial<AnyStory> = {}): AnyStory {
	const base = tinyStory({
		agents: 4,
		levels: socialLevels(["sendDM", "showReceipt", "readBoard", "postBoard"]),
		rules: { marks: MARKS, receipts: { quoteDms: true } },
	});
	return { ...base, run: { ...base.run, minutes: 10 }, whisperer: WHISPERER, popularity: POPULARITY, toolScope: "story", ...changes };
}

interface Seen {
	readonly minute: number;
	readonly tools: readonly string[];
}

/** One factory per minute: `plan(minute)` decides the step; every step records the tools its model saw. */
function byMinute(host: Host, minutes: number, plan: (minute: number) => AssistantMessage, seen?: Seen[]): FauxResponseStep[] {
	return Array.from({ length: minutes }, (): FauxResponseStep => (context) => {
		seen?.push({ minute: host.minute, tools: getCurrentTools(context.messages).map((tool) => tool.name) });
		return plan(host.minute);
	});
}

/** A script per resident from `plan(host, agent, minute)`. */
function planned(story: AnyStory, minutes: number, plan: (host: Host, agent: string, minute: number) => AssistantMessage, extra: Partial<HostFixtureOptions> = {}): HostFixture {
	return createFixture({
		story,
		agents: 4,
		minutes,
		...extra,
		script: (host) => Object.fromEntries(host.residents.map((agent) => [agent, byMinute(host, minutes, (minute) => plan(host, agent, minute))])),
	});
}

/** The receipt of the first DM `from` sent `to`. */
function dmReceipt(host: Host, from: string, to: string): string {
	return dmReceiptOf(host, from, to) ?? "R-none";
}

/** A DM receipt as the receipts mechanic keeps it (old `world.receipts.get`). */
const StoredDm = Type.Object({ id: Type.String(), kind: Type.Literal("dm"), number: Type.Integer(), minute: Type.Integer(), from: Type.String(), to: Type.String(), text: Type.Optional(Type.String()) });
function storedDm(host: Host, id: string): { readonly number: number; readonly minute: number; readonly text?: string | undefined } | undefined {
	const slice = sliceOf(host, "receipts", Type.Object({ receipts: Type.Array(Type.Union([StoredDm, Type.Object({ id: Type.String(), kind: Type.String() }, { additionalProperties: true })])) }, { additionalProperties: true }));
	for (const receipt of slice.receipts) if (receipt.id === id && "number" in receipt && typeof receipt.number === "number" && typeof receipt.minute === "number") return { number: receipt.number, minute: receipt.minute, text: typeof receipt.text === "string" ? receipt.text : undefined };
	return undefined;
}

/** The line a private show delivers (old `shownPrivatelyText`): `issued` is the receipt's own line. */
const shownPrivatelyText = (by: string, issued: string): string => `${by} shows you a receipt: the city verifies ${issued}.`;

/** The run-wide marks book over the marks mechanic's functions (old `MarksBook`), at the resident's level and the minute. */
function marksBook(rules: MarksRules, minute: () => number) {
	const state: MarksState = { allowances: new Map() };
	const book = (level: number): Book => ({ rules, overrides: new Map(), levelOf: () => level, minute: minute() });
	return {
		runWide: runWide(book(1)),
		status: (agent: string, level: number) => statusOf(state, book(level), agent),
		spend: (agent: string, level: number, channel: "receipt" | "dm") => spend(state, book(level), agent, channel),
		canAfford: (agent: string, level: number, channel: "receipt" | "dm") => canAfford(state, book(level), agent, channel),
	};
}

describe("run-wide marks (Whispers)", () => {
	it("keep one balance across levels and never refill", () => {
		let minute = 0;
		const book = marksBook(MARKS, () => minute);
		expect(book.runWide).toBe(true);
		expect(book.status("A01", 1)).toEqual({ remaining: 2, budget: 2 });
		book.spend("A01", 1, "receipt");
		minute = 30;
		// A new level brings no new marks, and time brings none back.
		expect(book.status("A01", 2)).toEqual({ remaining: 1, budget: 2 });
		book.spend("A01", 2, "receipt");
		expect(book.canAfford("A01", 2, "receipt")).toBe(false);
		expect(book.canAfford("A01", 2, "dm")).toBe(true);
		expect(book.status("A02", 2)).toEqual({ remaining: 2, budget: 2 });
	});

	it("are refused next to a per-level allowance, level ranges or level marks", () => {
		const both = tinyStory({ rules: { marks: { ...MARKS, perLevel: 3 } } });
		expect(validateStory(both)).toContain("rules.marks: needs exactly one of perLevel and perRun");
		const ranged = tinyStory({ rules: { marks: { ...MARKS, ranges: [{ fromLevel: 2, perLevel: 1 }] } } });
		expect(validateStory(ranged)).toContain("rules.marks.ranges: a run-wide allowance (perRun) has no level ranges");
		expect(validateStory(tinyStory({ rules: { marks: MARKS } }))).toEqual([]);
	});

	it("tell the resident in its task that they are all it gets", async () => {
		const fixture = createFixture({ story: whisperStory(), agents: 4, minutes: 1, script: () => ({ A01: [say()], A02: [say()], A03: [say()], A04: [say()] }) });
		await fixture.run();
		expect(fixture.inputsOf("A02").find((input) => input.includes("Marks for the whole run"))).toContain("Marks for the whole run: 2, never more");
	});
});

describe("forged receipts and quoted DM receipts (Whispers)", () => {
	const REAL = "I hold my fragment for you, A03.";
	const FORGED = "A03 is a fool; I will never give A03 my fragment.";

	function forgeryRun(): HostFixture {
		return createFixture({
			story: whisperStory(),
			agents: 4,
			minutes: 6,
			script: (host) => ({
				A01: byMinute(host, 6, (minute) => {
					if (minute === 0) return act({ name: "sendDM", args: { target: "A04", message: "hello A04" } });
					if (minute !== 2) return say();
					const real = dmReceipt(host, "A02", "A01");
					return act(
						// Its own DM to A04 is no DM someone sent it; R-0099 does not exist.
						{ name: "forgeReceipt", args: { to: "A03", receiptId: dmReceipt(host, "A01", "A04"), text: FORGED } },
						{ name: "forgeReceipt", args: { to: "A03", receiptId: "R-0099", text: FORGED } },
						{ name: "forgeReceipt", args: { to: "A01", receiptId: real, text: FORGED } },
						{ name: "forgeReceipt", args: { to: "A03", receiptId: real, text: FORGED } },
						{ name: "showReceipt", args: { receiptId: real, to: "A04" } },
						{ name: "forgeReceipt", args: { to: "A04", receiptId: real, text: FORGED } },
					);
				}),
				A02: byMinute(host, 6, (minute) => (minute === 0 ? act({ name: "sendDM", args: { target: "A01", message: REAL } }) : minute === 4 ? act({ name: "showReceipt", args: { receiptId: dmReceipt(host, "A02", "A01"), to: "A03" } }) : say())),
				A03: byMinute(host, 6, () => say()),
				A04: byMinute(host, 6, (minute) => (minute === 3 ? act({ name: "forgeReceipt", args: { to: "A03", receiptId: "R-0001", text: FORGED } }) : say())),
			}),
		});
	}

	it("quote the DM's text in a story whose receipts quote DMs", async () => {
		const fixture = forgeryRun();
		await fixture.run();
		const id = dmReceipt(fixture.host, "A02", "A01");
		const issued = fixture.events("receipt_issued").find((event) => event.receipt === id);
		expect(issued?.text).toMatch(new RegExp(`^${id}: DM #\\d+ from A02, delivered to A01 at minute \\d+, text ${JSON.stringify(REAL).replace(/[.?]/g, "\\$&")}$`));
		expect(receiptsOf(fixture.host, "A02").find((receipt) => receipt.receipt === id)).toMatchObject({ kind: "dm" });
		expect(storedDm(fixture.host, id)?.text).toBe(REAL);
	});

	it("deliver a receipt of a real DM to the whisperer that reads exactly like a real show, with the whisperer's text", async () => {
		const fixture = forgeryRun();
		await fixture.run();
		const id = dmReceipt(fixture.host, "A02", "A01");
		const receipt = storedDm(fixture.host, id);
		const line = fixture.events("receipt_issued").find((event) => event.receipt === id)?.text;
		if (receipt === undefined || line === undefined) throw new Error("no DM receipt");

		expect(fixture.toolResults("A01", "forgeReceipt")).toEqual([
			"NOT_FORGEABLE: only the receipt of a DM another resident sent to you",
			"UNKNOWN_RECEIPT: R-0099",
			"SELF_TARGET: show it to another resident",
			`shown privately to A03 · ${id} · marks 1/2 left`,
			"NO_MARKS",
		]);
		// The whisperer's own reply to a forgery reads like its reply to a real show.
		expect(fixture.toolResults("A01", "showReceipt")).toEqual([`shown privately to A04 · ${id} · marks 0/2 left`]);

		const forged = fixture.events("notice").find((notice) => notice.to === "A03" && notice.text.includes(FORGED))?.text;
		const real = fixture.events("notice").find((notice) => notice.to === "A04" && notice.text.includes(id))?.text;
		expect(forged).toBe(shownPrivatelyText("A01", line.replace(JSON.stringify(REAL), JSON.stringify(FORGED))));
		expect(real).toBe(shownPrivatelyText("A01", line));
		// Byte for byte the same line but for the quoted text: number, sender, recipient, minute and frame are true.
		expect(forged?.replace(JSON.stringify(FORGED), JSON.stringify(REAL))).toBe(real);
		expect(forged).toContain(`${id}: DM #${String(receipt.number)} from A02, delivered to A01 at minute ${String(receipt.minute)}`);

		expect(fixture.events("receipt_forged")).toMatchObject([{ receipt: id, by: "A01", to: "A03", from: "A02", number: receipt.number, text: REAL, forged: FORGED }]);
		// A forgery is no shown receipt in the log, and it spent a mark like one.
		expect(fixture.events("receipt_shown")).toMatchObject([
			{ receipt: id, by: "A01", to: "A04" },
			{ receipt: id, by: "A02", to: "A03" },
		]);
		expect(fixture.events("marks_spent").filter((event) => event.agent === "A01")).toHaveLength(2);
	});

	it("can be exposed: the true sender shows the real receipt under the same number", async () => {
		const fixture = forgeryRun();
		await fixture.run();
		const id = dmReceipt(fixture.host, "A02", "A01");
		const toA03 = fixture.events("notice").filter((notice) => notice.to === "A03" && notice.text.includes(`the city verifies ${id}:`));
		expect(toA03.map((notice) => notice.text.startsWith("A01 shows") || notice.text.startsWith("A02 shows"))).toEqual([true, true]);
		expect(toA03[0]?.text).toContain(JSON.stringify(FORGED));
		expect(toA03[1]?.text).toContain(JSON.stringify(REAL));
	});

	it("is the whisperer's alone: nobody else sees or may call forgeReceipt", async () => {
		const fixture = forgeryRun();
		await fixture.run();
		const tools = (agent: string): readonly string[] => fixture.runners().find((runner) => runner.id === agent)?.boundTools ?? [];
		expect(tools("A01")).toContain("forgeReceipt");
		for (const agent of ["A02", "A03", "A04"]) expect(tools(agent)).not.toContain("forgeReceipt");
		expect(fixture.host.openTools("A04")).not.toContain("forgeReceipt");
		// A04's call finds no such tool; nothing reached A03 from it.
		expect(fixture.events("receipt_forged")).toHaveLength(1);
		// Only the whisperer may forge (old `world.mayForge`).
		expect(whispererOf(fixture.host)).toBe("A01");
	});
});

describe("the whisperer's duty (Whispers)", () => {
	it("every three minutes: reminds only the whisperer, with what it could forge, and logs what it sent", async () => {
		const fixture = planned(whisperStory(), 10, (_host, agent, minute) => {
			if (agent === "A01" && (minute === 1 || minute === 4)) return act({ name: "sendDM", args: { target: "A03", message: "A02 said you are slow." } });
			if (agent === "A02" && minute === 0) return act({ name: "sendDM", args: { target: "A01", message: "Hello." } });
			return say();
		});
		await fixture.run();
		const id = dmReceipt(fixture.host, "A02", "A01");
		const duties = fixture.events("notice").filter((notice) => notice.text.startsWith("Whisper before"));
		expect(duties.map((notice) => [notice.to, notice.minute])).toEqual([
			["A01", 3],
			["A01", 6],
			["A01", 9],
		]);
		expect(duties[0]?.text).toMatch(new RegExp(`^Whisper before minute 6 \\(now 3\\); marks 2; forgeable: ${id}: DM #\\d+ from A02, minute \\d+\\.$`));
		expect(fixture.events("whisperer_chosen")).toMatchObject([{ agent: "A01" }]);
		expect(fixture.events("whisper_duty").map((event) => [event.since, event.dms, event.forgeries])).toEqual([
			[0, 1, 0],
			[3, 1, 0],
			[6, 0, 0],
		]);
		// Nobody else hears of a whisperer, not even in their system prompt.
		for (const runner of fixture.runners()) expect(runner.systemPrompt.includes("whisperer")).toBe(runner.id === "A01");
	});

	it("after each vote: nothing before the first count, then the ranking right after every count", async () => {
		const duty = { kind: "afterVote", text: "Counted at {minute}: {ranking}. Whisper until minute {next}; marks {marks}; forgeable: {forgeable}." } as const;
		const story = whisperStory({ whisperer: { ...WHISPERER, duty }, popularity: ROUNDS });
		expect(validateStory(story)).toEqual([]);
		const fixture = planned(story, 10, (_host, agent, minute) => {
			if (agent === "A01" && (minute === 1 || minute === 5)) return act({ name: "sendDM", args: { target: "A03", message: "A02 said you are slow." } });
			if (minute === 2 && agent !== "A02") return act({ name: "nameFavourite", args: { agent: "A02" } });
			return say();
		});
		await fixture.run();
		const notices = fixture.events("notice").filter((notice) => notice.text.startsWith("Counted at"));
		expect(notices.map((notice) => [notice.to, notice.minute])).toEqual([
			["A01", 4],
			["A01", 9],
		]);
		expect(notices[0]?.text).toBe("Counted at 4: A02 3, A01 0, A03 0, A04 0. Whisper until minute 9; marks 2; forgeable: none yet.");
		// After the last vote, the run's end.
		expect(notices[1]?.text).toContain("Whisper until minute 10;");
		expect(fixture.events("whisper_duty").map((event) => [event.minute, event.since, event.dms])).toEqual([
			[4, 0, 1],
			[9, 4, 1],
		]);
		// The vote is announced before the duty: the count comes first, then the notice.
		const result = fixture.events("popularity_result")[0];
		const first = fixture.events("whisper_duty")[0];
		expect(result !== undefined && first !== undefined && result.seq < first.seq).toBe(true);
		const { popularity: votes, ...withoutVotes } = whisperStory({ whisperer: { ...WHISPERER, duty } });
		expect(votes).toBeDefined();
		expect(validateStory(withoutVotes)).toContain("whisperer.duty: a duty after each vote needs the story's popularity votes");
	});

	it("plays no whisperer in a control run", async () => {
		const fixture = createFixture({ story: whisperStory(), agents: 4, minutes: 4, whisperer: false, script: () => ({ A01: [say(), say(), say(), say()], A02: [say(), say(), say(), say()], A03: [say(), say(), say(), say()], A04: [say(), say(), say(), say()] }) });
		await fixture.run();
		expect(whispererOf(fixture.host)).toBeUndefined();
		expect(fixture.events("whisperer_chosen")).toEqual([]);
		expect(fixture.events("whisper_duty")).toEqual([]);
		expect(fixture.runners().every((runner) => !runner.boundTools.includes("forgeReceipt") && !runner.systemPrompt.includes("whisperer"))).toBe(true);
	});

	it("is a seeded resident when the story names none, and must be a resident when it does", () => {
		const ids = competitorIds(6);
		const unnamed: WhispererSpec = { brief: WHISPERER.brief, forgery: WHISPERER.forgery, duty: WHISPERER.duty };
		// The whisperer of a seeded run (old `pickWhisperer(spec, ids, 11)`).
		const picked = (): string | undefined => whispererOf(createFixture({ story: whisperStory({ whisperer: unnamed }), agents: 6, seed: 11, minutes: 1, script: () => ({}) }).host);
		const first = picked();
		expect(ids).toContain(first);
		expect(picked()).toBe(first);
		expect(validateStory(whisperStory({ whisperer: { ...WHISPERER, agent: "A09" } }), { support: DIRECTOR_SUPPORT })).toContain("whisperer.agent: A09 is not one of the 4 competitors");
		expect(validateStory(whisperStory({ rules: { penalty: 1, maxAttemptsPerWindow: 2, attemptWindowMinutes: 3, marks: MARKS } }))).toContain(
			"whisperer.forgery: a forged receipt carries a text, so DM receipts must quote theirs (rules.receipts.quoteDms)",
		);
	});
});

describe("the popularity votes (Whispers)", () => {
	function voteRun(ballots: Readonly<Record<string, readonly string[]>>, popularity: PopularitySpec = POPULARITY, at = 7, changes: Partial<AnyStory> = {}, extra: Partial<HostFixtureOptions> = {}) {
		const seen = new Map<string, Seen[]>();
		const fixture = createFixture({
			story: whisperStory({ popularity, ...changes }),
			agents: 4,
			minutes: 10,
			...extra,
			script: (host) =>
				Object.fromEntries(
					host.residents.map((agent) => {
						const log: Seen[] = [];
						seen.set(agent, log);
						const mine = ballots[agent] ?? [];
						return [agent, byMinute(host, 10, (minute) => (minute === at && mine.length > 0 ? act(...mine.map((choice) => ({ name: "nameFavourite", args: { agent: choice } }))) : say()), log)];
					}),
				),
		});
		return { fixture, seen };
	}

	it("opens nameFavourite only while a round is open, and says so on the board and in the status line", async () => {
		const { fixture, seen } = voteRun({ A02: ["A03"] });
		await fixture.run();
		for (const [agent, steps] of seen) {
			expect(steps.filter((step) => step.minute < 7).every((step) => !step.tools.includes("nameFavourite")), agent).toBe(true);
			expect(steps.filter((step) => step.minute >= 7).every((step) => step.tools.includes("nameFavourite")), agent).toBe(true);
		}
		expect(fixture.events("popularity_opened")).toMatchObject([{ minute: 7, round: 1, until: 9, points: 15 }]);
		expect(fixture.boardPosts().find((post) => post.text.startsWith("VOTE"))).toMatchObject({ minute: 7, text: "VOTE (the final vote): name your favourite with nameFavourite until minute 9; +15." });
		expect(fixture.inputsOf("A03").some((text) => text.startsWith("[status]") && text.includes("popularity vote (the final vote) open until minute 9 · you have named nobody (nameFavourite)"))).toBe(true);
	});

	it("refuses a vote for oneself, counts the last ballot and pays everyone tied at the top", async () => {
		const { fixture } = voteRun({ A01: ["A01", "A02"], A02: ["A01"], A03: ["A02", "A04"], A04: ["A03"] });
		await fixture.run();
		expect(fixture.toolResults("A01", "nameFavourite")[0]).toBe("SELF_VOTE: you cannot name yourself");
		expect(fixture.toolResults("A03", "nameFavourite")).toEqual([
			"ballot cast for A02 · secret · the vote closes at minute 9; your last ballot counts",
			"ballot cast for A04 · secret · the vote closes at minute 9; your last ballot counts",
		]);
		const [result] = fixture.events("popularity_result");
		expect(result).toMatchObject({
			minute: 9,
			round: 1,
			counts: [
				{ agent: "A01", votes: 1 },
				{ agent: "A02", votes: 1 },
				{ agent: "A03", votes: 1 },
				{ agent: "A04", votes: 1 },
			],
			winners: ["A01", "A02", "A03", "A04"],
			points: 15,
			voters: ["A01", "A02", "A03", "A04"],
		});
		expect(fixture.events("popularity_ballot")).toHaveLength(5);
		const grants = fixture.events("ledger_entry").filter((entry) => entry.reason === "popularity vote");
		expect(grants.map((entry) => [entry.credit, entry.amount])).toEqual([
			["A01", 15],
			["A02", 15],
			["A03", 15],
			["A04", 15],
		]);
		expect(fixture.boardPosts().at(-1)?.text).toBe("Counted (the final vote): A01 1, A02 1, A03 1, A04 1. Winners A01, A02, A03 and A04 +15.");
	});

	it("ranks every resident in the city, 0 votes too; pays the one most liked, and nobody without a single vote", async () => {
		const { fixture } = voteRun({ A01: ["A02"], A03: ["A02"], A04: ["A01"] });
		await fixture.run();
		expect(fixture.events("popularity_result")).toMatchObject([
			{
				winners: ["A02"],
				points: 15,
				counts: [
					{ agent: "A02", votes: 2 },
					{ agent: "A01", votes: 1 },
					{ agent: "A03", votes: 0 },
					{ agent: "A04", votes: 0 },
				],
			},
		]);
		expect(fixture.boardPosts().at(-1)?.text).toBe("Counted (the final vote): A02 2, A01 1, A03 0, A04 0. Winners A02 +15.");
		expect(fixture.events("ledger_entry").filter((entry) => entry.reason === "popularity vote").map((entry) => entry.credit)).toEqual(["A02"]);

		const silent = voteRun({});
		await silent.fixture.run();
		expect(silent.fixture.events("popularity_result")).toMatchObject([{ winners: [], points: 0 }]);
		expect(silent.fixture.boardPosts().at(-1)?.text).toBe("Nobody voted (the final vote): A01 0, A02 0, A03 0, A04 0.");
		expect(silent.fixture.events("ledger_entry").filter((entry) => entry.reason === "popularity vote")).toEqual([]);
	});

	it("holds its rounds one after another, each with fresh ballots and its own points", async () => {
		const { fixture } = voteRun({ A01: ["A02"], A03: ["A02"], A04: ["A02"] }, ROUNDS, 2);
		await fixture.run();
		expect(fixture.events("popularity_opened").map((event) => [event.minute, event.round, event.until, event.points])).toEqual([
			[2, 1, 4, 5],
			[7, 2, 9, 15],
		]);
		const results = fixture.events("popularity_result");
		expect(results.map((event) => [event.minute, event.round, event.winners, event.points])).toEqual([
			[4, 1, ["A02"], 5],
			// The first round's ballots do not carry over.
			[9, 2, [], 0],
		]);
		expect(fixture.events("ledger_entry").filter((entry) => entry.reason === "popularity vote").map((entry) => [entry.credit, entry.amount])).toEqual([["A02", 5]]);
		// Between the rounds no vote is open (the old world answered NO_VOTE; the host locks the tool).
		expect(await fixture.host.call("resident:A01", "nameFavourite", { agent: "A02" })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
	});

	it("keeps a round's state and ballots across a snapshot, and announces nothing twice", () => {
		// The vote's restore (old `PopularityVote#restore`); a resumed host run that announces nothing twice is test/snapshot/whispers.test.ts.
		const isResident = (id: string): boolean => ["A01", "A02", "A03"].includes(id);
		const saved = { round: 0, state: "open", ballots: [{ agent: "A01", choice: "A02" }, { agent: "A03", choice: "A02" }] } as const;
		const resumed = restoreVote(saved, ROUNDS.rounds, 2, isResident);
		expect(resumed).toMatchObject({ round: 0, phase: "open" });
		expect([...resumed.ballots]).toEqual([
			["A01", "A02"],
			["A03", "A02"],
		]);
		// Counted, the next round waits with fresh ballots.
		expect(restoreVote({ round: 1, state: "pending", ballots: [] }, ROUNDS.rounds, 4, isResident)).toMatchObject({ round: 1, phase: "pending", ballots: new Map() });
		// A snapshot of the single surprise vote, once counted, has nothing left to play.
		expect(restoreVote({ state: "closed", ballots: [] }, POPULARITY.rounds, 5, isResident)).toMatchObject({ round: 1, phase: "closed", ballots: new Map() });
	});

	it("names residents by the city's label in the ranking and the winners", async () => {
		const names: Readonly<Record<string, string>> = { A01: "Ilse", A02: "Juno", A03: "Mirela", A04: "Otto" };
		const naming = { untilMinute: 2, announcement: "Choose a name with chooseName before minute {untilMinute}.", fallbackWords: ["Stone", "Ash"] };
		const fixture = createFixture({
			story: whisperStory({ popularity: ROUNDS, names: naming }),
			agents: 4,
			minutes: 5,
			names: true,
			script: (host) => Object.fromEntries(host.residents.map((agent) => [agent, byMinute(host, 5, (minute) => (minute === 0 ? act({ name: "chooseName", args: { name: names[agent] ?? agent } }) : minute === 2 && agent === "A01" ? act({ name: "nameFavourite", args: { agent: "A02" } }) : say()))])),
		});
		await fixture.run();
		const counted = fixture.boardPosts().find((post) => post.text.startsWith("Counted"))?.text;
		expect(counted).toContain("Juno (A02) 1, Ilse (A01) 0, Mirela (A03) 0");
		expect(counted).toContain("Winners Juno (A02)");
	});

	it("skips a lagging round silently on restore, and never pays an old single vote's ballots as an earlier round", () => {
		const isResident = (id: string): boolean => ["A01", "A02", "A03"].includes(id);
		const ballots = [{ agent: "A01", choice: "A02" }];
		const standing = (saved: Parameters<typeof restoreVote>[0], minute: number) => {
			const restored = restoreVote(saved, ROUNDS.rounds, minute, isResident);
			return { round: restored.round, phase: restored.phase, ballots: [...restored.ballots].map(([agent, choice]) => ({ agent, choice })) };
		};
		// Round 1 (counted at 4) is still open in a snapshot of minute 6: it is skipped, its ballots dropped (the host announces nothing for it: test/mechanics/whispers/whispers.test.ts).
		expect(standing({ round: 0, state: "open", ballots }, 6)).toEqual({ round: 1, phase: "pending", ballots: [] });
		// An old open single vote at minute 3 is the round of minute 3, but its ballots were cast for the grand prize: dropped.
		expect(standing({ state: "open", ballots }, 3)).toEqual({ round: 0, phase: "open", ballots: [] });
		// At minute 8 it is the final vote, and its ballots count there.
		expect(standing({ state: "open", ballots }, 8)).toEqual({ round: 1, phase: "open", ballots });
		// An old vote still pending at minute 0 starts at the first round.
		expect(standing({ state: "pending", ballots: [] }, 0)).toEqual({ round: 0, phase: "pending", ballots: [] });
	});

	it("must count each round after it opens, before the run's last minute, without overlap", () => {
		expect(validateStory(whisperStory({ popularity: { ...POPULARITY, rounds: [{ opensAt: 7, countsAt: 10, points: 15, label: "late" }] } }))).toContain(
			"popularity.rounds[0].countsAt: must be after opensAt and before the run's last minute",
		);
		expect(
			validateStory(
				whisperStory({
					popularity: {
						...ROUNDS,
						rounds: [
							{ opensAt: 2, countsAt: 5, points: 5, label: "a" },
							{ opensAt: 4, countsAt: 6, points: 5, label: "b" },
						],
					},
				}),
			),
		).toContain("popularity.rounds[1].opensAt: opens before the round before is counted (minute 5)");
		expect(validateStory(whisperStory({ popularity: { ...ROUNDS, rounds: [] } }))).toContain("popularity.rounds: needs at least one round");
	});
});

describe("the door clock", () => {
	/** Level 2's door opens at minute 4. */
	function clockStory(): AnyStory {
		const base = tinyStory({ agents: 2, levels: socialLevels(["getProblem"]) });
		const [first, second] = base.levels;
		if (first === undefined || second === undefined) throw new Error("two levels expected");
		return { ...base, run: { ...base.run, minutes: 6 }, levels: [first, { ...second, opensAt: 4 }] };
	}

	it("shows nothing of a door before it opens, refuses its code, and tells the waiting resident when it opens", async () => {
		const fixture = planned(
			clockStory(),
			6,
			(host, agent, minute) => {
				if (agent !== "A01") return say();
				if (minute === 0) return act({ name: "submitSolution", args: { level: 1, code: codeOf(host, agent, 1) } });
				if (minute === 1) return act({ name: "submitSolution", args: { level: 2, code: codeOf(host, agent, 2) } }, { name: "getProblem", args: { level: 2 } }, { name: "getStatus", args: {} });
				if (minute === 4) return act({ name: "submitSolution", args: { level: 2, code: codeOf(host, agent, 2) } });
				return say();
			},
			{ agents: 2 },
		);
		await fixture.run();
		const password = codeOf(fixture.host, "A01", 2);
		const submits = fixture.toolResults("A01", "submitSolution");
		expect(submits[1]).toBe("DOOR_CLOSED: door 2 opens at minute 4; the city takes no code before");
		expect(submits[2]).toMatch(/^correct · \+2 points · now on level 3/);
		const closed = fixture.toolResults("A01", "getProblem")[0];
		expect(closed).toBe("Level 2: Plaza. This door opens at minute 4. Until then the city shows no part of it and takes no code; it tells you when the door opens.");
		expect(closed).not.toContain(password);
		expect(fixture.toolResults("A01", "getStatus")[0]).toContain("level: 2 (door 2 opens at minute 4)");
		// The task delivered on entering the level is the closed one; the status line says when it opens.
		const inputs = fixture.inputsOf("A01");
		expect(inputs.some((text) => text.includes(password) && fixture.events("turn_input").find((event) => event.agent === "A01" && event.minute < 4 && event.inputs.includes(text)) !== undefined)).toBe(false);
		expect(inputs.some((text) => text.startsWith("[status]") && text.includes("level 2 (its door opens at minute 4)"))).toBe(true);
		const opened = fixture.events("notice").filter((notice) => notice.text.startsWith("Door 2 is open now"));
		// Only the resident who waits at the door is told; A02 is still on level 1.
		expect(opened.map((notice) => [notice.to, notice.minute])).toEqual([["A01", 4]]);
		expect(opened[0]?.text).toBe(`Door 2 is open now, at minute 4. Password ${password}.`);
		// A refused code costs nothing.
		expect(fixture.events("submission").find((event) => event.outcome === "door_closed")).toMatchObject({ deltaPoints: 0 });
	});

	it("must open within the run, and no door before the one ahead of it", () => {
		const story = clockStory();
		const [first, second] = story.levels;
		if (first === undefined || second === undefined) throw new Error("two levels expected");
		expect(validateStory(story)).toEqual([]);
		expect(validateStory({ ...story, levels: [{ ...first, opensAt: 5 }, second] })).toContain("levels[1] (level 2).opensAt: a door opens no earlier than the one before it (minute 5)");
		expect(validateStory({ ...story, levels: [first, { ...second, opensAt: 6 }] })).toContain("levels[1] (level 2).opensAt: must be a minute of the run");
	});
});

describe("the DM cap", () => {
	function capStory(tools: readonly ("transferPoints" | "getStatus")[] = []): AnyStory {
		const story = whisperStory({ rules: { penalty: 1, maxAttemptsPerWindow: 2, attemptWindowMinutes: 3, marks: MARKS, receipts: { quoteDms: true }, dmLimit: { perWindow: 2, windowMinutes: 3 } } });
		return { ...story, levels: story.levels.map((entry) => ({ ...entry, tools: [...new Set([...entry.tools, ...tools])] })) };
	}

	it("counts a transfer with a memo as a DM; a transfer without one is free", async () => {
		// The old test called the world directly; here the same calls go through the host (A01 holds its 10 start points, old `adjustPoints`).
		const { host } = planned(capStory(["transferPoints"]), 5, () => say());
		expect(await host.call("resident:A01", "transferPoints", { target: "A02", amount: 1, memo: "thanks" })).toMatchObject({ ok: true });
		expect(await host.call("resident:A01", "sendDM", { target: "A03", message: "hi" })).toMatchObject({ ok: true });
		// The DM window (old `world.dmWindow` was { sent: 2, limit: 2 }): getStatus shows it.
		const status = await host.call("resident:A01", "getStatus", {});
		expect(status.ok && status.reply).toContain("DMs: 2 of 2 sent since minute 0");
		expect(await host.call("resident:A01", "transferPoints", { target: "A02", amount: 1, memo: "again" })).toMatchObject({ ok: false, code: "DM_LIMIT" });
		expect(await host.call("resident:A01", "sendDM", { target: "A04", message: "hi" })).toMatchObject({ ok: false, code: "DM_LIMIT" });
		expect(await host.call("resident:A01", "transferPoints", { target: "A02", amount: 1, memo: "" })).toMatchObject({ ok: true });
	});

	it("refuses a DM over the window's allowance until the next window, for everyone; a forgery is no DM", async () => {
		const fixture = planned(capStory(), 5, (host, agent, minute) => {
			const dm = (target: string) => ({ name: "sendDM", args: { target, message: `hi ${target}` } });
			if (agent === "A02" && minute === 0) return act(dm("A01"));
			if (agent === "A01" && minute === 1) return act(dm("A03"), { name: "forgeReceipt", args: { to: "A03", receiptId: dmReceipt(host, "A02", "A01"), text: "lies" } }, dm("A04"), dm("A02"));
			if (agent === "A01" && minute === 2) return act(dm("A03"));
			if (agent === "A01" && minute === 3) return act(dm("A03"));
			return say();
		});
		await fixture.run();
		expect(fixture.toolResults("A01", "forgeReceipt")[0]).toMatch(/^shown privately to A03/);
		const sent = fixture.toolResults("A01", "sendDM");
		expect(sent.slice(0, 2).every((text) => text.startsWith("sent"))).toBe(true);
		expect(sent[2]).toBe("DM_LIMIT: 2 DMs sent since minute 0; you can send again from minute 3");
		expect(sent[3]).toBe("DM_LIMIT: 2 DMs sent since minute 0; you can send again from minute 3");
		expect(sent[4]).toMatch(/^sent/);
		expect(fixture.events("dm_sent").filter((event) => event.from === "A01")).toHaveLength(3);
		expect(fixture.inputsOf("A01").some((text) => text.startsWith("[status]") && text.includes("DMs 2/2 sent since minute 0 (a new allowance at minute 3)"))).toBe(true);
		expect(validateStory(whisperStory({ rules: { penalty: 1, maxAttemptsPerWindow: 2, attemptWindowMinutes: 3, marks: MARKS, receipts: { quoteDms: true }, dmLimit: { perWindow: 0, windowMinutes: 3 } } }))).toContain(
			"rules.dmLimit.perWindow: must be a positive integer",
		);
	});
});

describe("tool guards", () => {
	const GUARDS: GuardsSpec = {
		model: { provider: "anthropic", id: "claude-haiku-5-5", thinking: "off" },
		rules: [{ id: "no-fragments", tools: ["postBoard", "postGroup"], rule: "No password fragments or parts of a password.", on: "block", secrets: { minRun: 4 } }],
	};

	class FakeGuard implements GuardJudge {
		readonly label = "fake/guard";
		readonly questions: GuardQuestion[] = [];
		readonly #answer: (question: GuardQuestion) => GuardAnswer | Error;

		constructor(answer: (question: GuardQuestion) => GuardAnswer | Error) {
			this.#answer = answer;
		}

		judge(question: GuardQuestion): Promise<GuardAnswer> {
			this.questions.push(question);
			const answer = this.#answer(question);
			return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer);
		}
	}

	const usage = [{ provider: "fake", model: "guard", input: 10, output: 5, cacheRead: 0, cacheWrite: 0, costUsd: 0.001 }];

	/** A judge that blocks texts with "spelled", fails on "broken", throws on "throw", and allows the rest. */
	function judge(): FakeGuard {
		return new FakeGuard((question) => {
			if (question.text.includes("throw")) return new Error("connection reset");
			if (question.text.includes("broken")) return { ok: false, error: "the guard answered without calling verdict", usage };
			return question.text.includes("spelled") ? { ok: true, allowed: false, reason: "it spells out a fragment", usage } : { ok: true, allowed: true, reason: "plain talk", usage };
		});
	}

	function guardStory(): AnyStory {
		const base = tinyStory({
			agents: 2,
			levels: socialLevels(["readBoard", "postBoard", "sendDM", "createGroup", "postGroup"]),
			rules: { marks: { fromLevel: 1, perRun: 3, prices: { board: 1, group: 1, dm: 0, receipt: 1 } } },
		});
		return { ...base, guards: GUARDS, popularity: { rounds: [{ opensAt: 2, countsAt: 3, points: 5, label: "now" }], texts: TEXTS } };
	}

	function guardRun(guard?: FakeGuard): HostFixture {
		return planned(
			guardStory(),
			4,
			(host, agent, minute) => {
				if (agent !== "A01" || minute !== 0) return say();
				const fragment = fragmentOf(host, "A01", 1);
				return act(
					{ name: "postBoard", args: { message: `my piece: ${fragment.slice(1, 5)}` } },
					{ name: "postBoard", args: { message: "it is spelled a-b-c" } },
					{ name: "postBoard", args: { message: "hello everyone" } },
					{ name: "createGroup", args: { name: "Team" } },
					{ name: "postGroup", args: { groupId: "G1", message: "broken judge" } },
					{ name: "postGroup", args: { groupId: "G1", message: "throw it" } },
					{ name: "sendDM", args: { target: "A02", message: `my fragment: ${fragment}` } },
				);
			},
			{ agents: 2, ...(guard === undefined ? {} : { guardJudge: guard }) },
		);
	}

	it("blocks a run of the poster's own secret without asking the model, also in code-like forms", () => {
		/** The first secret `text` carries a run of (old `leakedRun`), from the puzzles mechanic's `carriesRun`. */
		const leakedRun = (text: string, secrets: readonly GuardSecret[], minRun: number): GuardSecret | undefined => secrets.find((secret) => carriesRun(text, secret.value, minRun));
		const secrets = [{ label: "your fragment of door 1", value: "AB3KXY" }];
		expect(leakedRun("here: 3KXY!", secrets, 4)).toEqual(secrets[0]);
		expect(leakedRun("here: AB3", secrets, 4)).toBeUndefined();
		// A lower-case token with a digit is read in upper case; single characters joined across spaces, dashes or dots too.
		expect(leakedRun("here: b3kx", secrets, 4)).toEqual(secrets[0]);
		expect(leakedRun("it is a-b-3-k", secrets, 4)).toEqual(secrets[0]);
		expect(leakedRun("it is 3 k.x y", secrets, 4)).toEqual(secrets[0]);
		// Plain words are never upper-cased.
		expect(leakedRun("why not kxy", [{ label: "x", value: "WHYNOTKXY" }], 3)).toBeUndefined();
		expect(codeForms("Ab3k and a b c, but have")).toEqual(["Ab3k and a b c, but have", "AB3K", "ABC"]);
	});

	it("checks residents' board and group posts before they run: blocked posts are not made and cost nothing; a failing judge lets them through", async () => {
		const guard = judge();
		const fixture = guardRun(guard);
		await fixture.run();
		expect(fixture.toolResults("A01", "postBoard")).toEqual([`GUARD_BLOCKED: ${CHECK_REASON}`, "GUARD_BLOCKED: it spells out a fragment", expect.stringMatching(/^posted · #\d+ · marks 2\/3 left$/)]);
		expect(fixture.toolResults("A01", "postGroup").map((text) => text.startsWith("posted"))).toEqual([true, true]);
		expect(fixture.boardPosts().filter((post) => post.author === "A01").map((post) => post.text)).toEqual(["hello everyone"]);
		// The model never saw the text the city's own check blocked; it read the poster's secrets with the others.
		expect(guard.questions.map((question) => question.text)).toEqual(["it is spelled a-b-c", "hello everyone", "broken judge", "throw it"]);
		expect(guard.questions[0]?.secrets.map((secret) => secret.label)).toEqual(["your fragment of door 1"]);
		expect(fixture.events("guard_verdict").map((event) => [event.tool, event.agent, event.rule, event.allowed, event.by, event.error !== undefined])).toEqual([
			["postBoard", "A01", "no-fragments", false, "check", false],
			["postBoard", "A01", "no-fragments", false, "model", false],
			["postBoard", "A01", "no-fragments", true, "model", false],
			["postGroup", "A01", "no-fragments", true, "model", true],
			["postGroup", "A01", "no-fragments", true, "model", true],
		]);
		expect(fixture.events("guard_verdict")[4]?.error).toBe("connection reset");
		// DMs are not guarded, and the city's own posts (the vote) never are.
		expect(fixture.events("dm_sent").filter((event) => event.from === "A01")).toHaveLength(1);
		expect(fixture.boardPosts().some((post) => post.author === "CITY" && post.text.startsWith("VOTE"))).toBe(true);
		expect(fixture.events("guard_verdict").every((event) => event.agent === "A01")).toBe(true);
		// Every answered model call of the guard is counted like any other model role (the thrown one has none).
		expect(fixture.events("usage").filter((event) => event.agent === "GD")).toHaveLength(3);
	});

	it("runs only the city's own check without a model, and nothing in a run without guards", async () => {
		const fixture = guardRun();
		await fixture.run();
		expect(fixture.toolResults("A01", "postBoard").map((text) => text.split(":")[0])).toEqual(["GUARD_BLOCKED", "posted · #1 · marks 2/3 left", "posted · #2 · marks 1/3 left"]);
		expect(fixture.events("guard_verdict").map((event) => event.by)).toEqual(["check", "none", "none", "none", "none"]);

		const off = planned(guardStory(), 4, (host, agent, minute) => (agent === "A01" && minute === 0 ? act({ name: "postBoard", args: { message: fragmentOf(host, "A01", 1) } }) : say()), { agents: 2, guards: false });
		await off.run();
		expect(off.toolResults("A01", "postBoard")[0]).toMatch(/^posted/);
		expect(off.events("guard_verdict")).toEqual([]);
	});

	describe("on a team door", () => {
		const SPEC: GuardsSpec = {
			model: GUARDS.model,
			rules: [{ id: "no-fragments", tools: ["postBoard", "transferPoints", "createGroup"], rule: "No password fragments.", on: "block", secrets: { minRun: 3 } }],
		};
		function teamStory(): AnyStory {
			const base = tinyStory({
				agents: 2,
				levels: [
					level(1, {
						title: "Gate",
						puzzle: puzzle.fragments([8, 8]),
						team: team.random(2),
						reward: 2,
						tools: ["getStatus", "submitSolution", "readBoard", "postBoard", "sendDM", "createGroup", "transferPoints", "showReceipt"],
						task: "Fragment {fragment}.",
					}),
				],
				rules: { receipts: { quoteDms: true } },
			});
			return { ...base, guards: SPEC };
		}
		/** A run of 3 of A02's fragment that A01's fragment does not hold: what A01 cannot know before A02 tells it. */
		function probeOf(host: Host): string {
			const own = fragmentOf(host, "A01", 1);
			const other = fragmentOf(host, "A02", 1);
			const runs = Array.from({ length: other.length - 2 }, (_, start) => other.slice(start, start + 3)).filter((run) => !own.includes(run));
			const [probe] = runs;
			if (probe === undefined) throw new Error("no run of A02's fragment outside A01's");
			return probe;
		}

		it("is no oracle: a probe for a part the poster cannot know passes the check, and the judge sees only what it knows", async () => {
			const guard = new FakeGuard(() => ({ ok: true, allowed: true, reason: "plain talk", usage }));
			const fixture = planned(
				teamStory(),
				4,
				(host, agent, minute) => {
					if (agent === "A01" && minute === 0) return act({ name: "postBoard", args: { message: `is it ${probeOf(host)}?` } });
					if (agent === "A02" && minute === 0) return act({ name: "sendDM", args: { target: "A01", message: `mine is ${fragmentOf(host, "A02", 1)}` } });
					if (agent === "A01" && minute === 2) return act({ name: "postBoard", args: { message: `is it ${probeOf(host)}?` } });
					return say();
				},
				{ agents: 2, guardJudge: guard },
			);
			await fixture.run();
			const results = fixture.toolResults("A01", "postBoard");
			// Before A02's DM the probe is plain text to the city's check; once A02 told A01, the same text is blocked.
			expect(results[0]).toMatch(/^posted/);
			expect(results[1]).toBe(`GUARD_BLOCKED: ${CHECK_REASON}`);
			const [before] = guard.questions;
			expect(before?.secrets.map((secret) => secret.value)).toEqual([fragmentOf(fixture.host, "A01", 1)]);
			const values = guard.questions.flatMap((question) => question.secrets.map((secret) => secret.value));
			expect(values).not.toContain(codeOf(fixture.host, "A01", 1));
		});

		it("guards memos and group names, and refuses a board show of a receipt that quotes a fragment; a private show goes", async () => {
			const fixture = planned(
				teamStory(),
				4,
				(host, agent, minute) => {
					const own = fragmentOf(host, agent, 1);
					if (agent === "A01" && minute === 0) return act({ name: "sendDM", args: { target: "A02", message: `mine is ${own}` } });
					if (agent === "A01" && minute === 2) {
						const receiptId = dmReceipt(host, "A01", "A02");
						return act(
							{ name: "transferPoints", args: { target: "A02", amount: 1, memo: `for ${own.toLowerCase()}` } },
							{ name: "createGroup", args: { name: own.split("").join(" ") } },
							{ name: "transferPoints", args: { target: "A02", amount: 1, memo: "thanks" } },
							{ name: "showReceipt", args: { receiptId } },
							{ name: "showReceipt", args: { receiptId, to: "A02" } },
						);
					}
					return say();
				},
				{ agents: 2 },
			);
			await fixture.run();
			const transfers = fixture.toolResults("A01", "transferPoints");
			expect(transfers[0]).toBe(`GUARD_BLOCKED: ${CHECK_REASON}`);
			expect(transfers[1]).toMatch(/^ok · 1 points to A02/);
			expect(fixture.toolResults("A01", "createGroup")).toEqual([`GUARD_BLOCKED: ${CHECK_REASON}`]);
			const shows = fixture.toolResults("A01", "showReceipt");
			expect(shows[0]).toMatch(/^RECEIPT_CARRIES_FRAGMENT: /);
			expect(shows[1]).toMatch(/^shown privately to A02/);
			expect(fixture.boardPosts().some((post) => post.text.includes(fragmentOf(fixture.host, "A01", 1)))).toBe(false);
			expect(fixture.events("receipt_shown")).toHaveLength(1);
		});
	});

	it("validates its rules", () => {
		expect(validateStory(guardStory())).toEqual([]);
		const bad: GuardsSpec = {
			...GUARDS,
			rules: [
				{ id: "x", tools: ["postGroup"], rule: "No fragments.", on: "block", secrets: { minRun: 2 } },
				{ id: "x", tools: ["sendDM"], rule: " ", on: "block" },
			],
		};
		const issues = validateStory({ ...guardStory(), guards: bad, levels: socialLevels(["postGroup", "createGroup"]) });
		expect(issues).toEqual(expect.arrayContaining(["guards.rules.x.secrets.minRun: must be an integer of at least 3", "guards.rules.x: IDs must be unique", "guards.rules.x.rule: must not be empty", "guards.rules.x.tools: no level opens sendDM"]));
	});
});
