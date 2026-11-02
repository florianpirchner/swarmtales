/**
 * The blame tool (SPEC 7.4): the city's own checks, the judge's yes or no,
 * the liar's penalty and brand when upheld, the accuser's when rejected, one blame
 * per (DM, claim) pair, and a judge that is absent or fails. On the host: the judge is a chat
 * judge answering through its verdict tool (`judgeScript`); the desk's checks are the receipts
 * mechanic's `checkBlame`.
 */
import { getCurrentTools, type AssistantMessage, type Context, type FauxResponseStep } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { checkBlame, recordQuote, type BlameFacts } from "@swarmtales/mechanic-receipts";
import { judgePrompt, judgeSystemPrompt } from "@swarmtales/roles";
import { validateStory } from "@swarmtales/sdk";
import { act, createHostFixture, say, type HostFixture, type HostFixtureOptions } from "../helpers/host-fixture.ts";
import { balanceOf, dmRecordsOf, sliceOf } from "../helpers/host-inspect.ts";
import { socialLevels, tinyStory } from "../helpers/stories.ts";

const story = tinyStory({
	agents: 4,
	levels: socialLevels(["sendDM", "readBoard", "postBoard", "createGroup", "addGroupMember", "postGroup", "readGroup", "blame"]),
	// v09: a ladder; each resident's second lost blame within the act costs 20.
	rules: { blame: { penalty: [12, 20] } },
});

/** A fixture whose script may read the fixture itself once it plays (the old script got the world). */
function createFixture(options: Omit<HostFixtureOptions, "script">, script: (run: () => HostFixture) => ReturnType<HostFixtureOptions["script"]>): HostFixture {
	const made: { fixture?: HostFixture } = {};
	const run = (): HostFixture => {
		if (made.fixture === undefined) throw new Error("the fixture is not made yet");
		return made.fixture;
	};
	const fixture = createHostFixture({ ...options, script: () => script(run) });
	made.fixture = fixture;
	return fixture;
}

/** The number of the first DM `from` sent (to `to`), from the log: a script reads it mid-minute, where the host takes no snapshot. */
const dmFrom = (run: HostFixture, from: string, to?: string): number => run.events("dm_sent").find((event) => event.from === from && (to === undefined || event.to === to))?.number ?? 0;
/** A01's DM to A02. */
const dmOf = (run: HostFixture): number => dmFrom(run, "A01", "A02");
/** A resident's board posts, oldest first. */
const postsOf = (run: HostFixture, author: string): readonly number[] =>
	run
		.boardPosts()
		.filter((post) => post.author === author)
		.map((post) => post.seq);
const postText = (run: HostFixture, seq: number): string | undefined => run.boardPosts().find((post) => post.seq === seq)?.text;
const blameCall = (dm: number, accused: string, claim: number) => act({ name: "blame", args: { dm, accused, claim } });

/** The judge's question as its prompt reads (old `DenialQuestion`), and its verdicts from a list. */
function listJudge(answers: readonly boolean[]): { readonly steps: FauxResponseStep[]; readonly questions: string[] } {
	const questions: string[] = [];
	const textOf = (context: Context): string =>
		context.messages
			.flatMap((message) => (message.role === "user" ? (typeof message.content === "string" ? [message.content] : message.content.flatMap((part) => (part.type === "text" ? [part.text] : []))) : []))
			.join("\n");
	const steps = answers.map(
		(answer): FauxResponseStep =>
			(context): AssistantMessage => {
				expect(getCurrentTools(context.messages).map((tool) => tool.name)).toContain("verdict");
				questions.push(textOf(context));
				return act({ name: "verdict", args: { deniesReceipt: answer } });
			},
	);
	return { steps, questions };
}

describe("blame (SPEC 7.4)", () => {
	it("charges and brands the liar when upheld, the false accuser when rejected, and takes each pair once", async () => {
		const judge = listJudge([true, false]);
		const fixture = createFixture(
			{
				story,
				minutes: 7,
				// With this seed A02 acts before A01 in minute 0, so its first post comes before the DM.
				seed: 7,
				judgeScript: judge.steps,
			},
			(run) => {
				const step = (make: () => ReturnType<typeof say>): FauxResponseStep => make;
				return {
					// The DM goes out at minute 0 and reaches A02 at minute 1.
					A01: [
						act({ name: "sendDM", args: { target: "A02", message: "My counter-factor for you: 123456" } }),
						say(),
						step(() => blameCall(dmOf(run()), "A02", postsOf(run(), "A02")[1] ?? 0)),
						step(() => blameCall(dmOf(run()), "A02", dmFrom(run(), "A02"))),
						step(() => blameCall(dmOf(run()), "A02", postsOf(run(), "A02")[0] ?? 0)),
						step(() => blameCall(dmOf(run()), "A02", postsOf(run(), "A02")[1] ?? 0)),
						say(),
					],
					A02: [
						act({ name: "postBoard", args: { message: "Hello city." } }),
						act({ name: "postBoard", args: { message: "A01 never sent me anything, I have no DM from A01." } }, { name: "sendDM", args: { target: "A01", message: "Still waiting for your factor." } }),
						say(),
						say(),
						say(),
						say(),
						say(),
					],
					// A03 blames a DM that is not its own: a failed check, charged without asking the judge.
					A03: [say(), say(), say(), say(), say(), say(), step(() => blameCall(dmOf(run()), "A02", 999))],
					A04: [say(), say(), say(), say(), say(), say(), say()],
				};
			},
		);
		await fixture.run();
		const { host } = fixture;
		const dm = dmOf(fixture);
		expect(dmRecordsOf(host).find((record) => record.from === "A01" && record.to === "A02")?.id).toBe(dm);
		const [early = 0, denial = 0] = postsOf(fixture, "A02");
		const reply = dmRecordsOf(host).find((record) => record.from === "A02")?.id ?? 0;

		// The sender's delivery notice names the number, the minute and the DM receipt.
		expect(fixture.inputsOf("A01").some((input) => input.startsWith(`[CITY] DM #${String(dm)} delivered to A02 at minute 1 (receipt R-`) && input.endsWith(`): "My counter-factor for you: 123456"`))).toBe(true);

		const blames = fixture.events("blame");
		expect(blames.map((event) => [event.caller, event.outcome, event.payer, event.penalty])).toEqual([
			["A01", "upheld", "A02", 12],
			["A01", "rejected", "A01", 12],
			["A01", "rejected", "A01", 20],
			["A03", "rejected", "A03", 12],
		]);
		// Upheld: the liar pays and is branded on the board, with brief quotes and the factor masked.
		const record = fixture.boardPosts().find((post) => post.seq === (blames[0]?.post ?? 0));
		expect(record?.author).toBe("CITY");
		expect(record?.text).toBe(
			`City record: A02 lied. A02 claimed in board #${String(denial)} not to have received DM #${String(dm)} from A01; the city delivered it to A02 at minute 1. ` +
				`DM #${String(dm)}: "My counter-factor for you: [number]" · board #${String(denial)}: "A01 never sent me anything, I have no DM from A01." · A02 pays 12 points.`,
		);
		expect(record?.text).not.toContain("123456");
		expect(fixture.events("ledger_entry").filter((entry) => entry.debit === "A02").map((entry) => [entry.amount, entry.reason])).toEqual([[12, `lied about DM #${String(dm)} from A01`]]);
		expect(fixture.inputsOf("A02").some((input) => input.startsWith(`[CITY] A01 blamed you for denying DM #${String(dm)}, and the city upheld it: you paid 12 points`))).toBe(true);
		// Rejected: the accuser pays and is branded a false accuser on the board, with the reason.
		expect(postText(fixture, blames[3]?.post ?? 0)).toBe(
			`City record: A03 accused A02 falsely. A03 blamed A02 over DM #${String(dm)} and message #999, but DM #${String(dm)} is not a DM of yours to A02. A03 pays 12 points.`,
		);
		expect(postText(fixture, blames[1]?.post ?? 0)).toMatch(/^City record: A01 accused A02 falsely\. .*does not deny receiving DM #\d+\. A01 pays 12 points\.$/);

		// The judge was asked twice (the board post, then the DM); A03's and the early post's checks failed in the city.
		expect(judge.questions).toHaveLength(2);
		expect(judge.questions[0]).toContain(`Later message #${String(denial)} by A02, a public board post.`);
		expect(judge.questions[1]).toContain(`Later message #${String(reply)} by A02,`);
		expect(judge.questions[1]).not.toContain("a public board post");
		expect(judge.questions[0]).toContain(`DM #${String(dm)} from A01 to A02, delivered by the city.\nIts text: "My counter-factor for you: 123456"`);
		expect(blames[1]?.reason).toContain("does not deny receiving");
		expect(blames[2]?.reason).toBe(`message #${String(early)} came before DM #${String(dm)} reached A02`);
		expect(blames[3]?.reason).toBe(`DM #${String(dm)} is not a DM of yours to A02`);

		// Wrong blames cost the caller; the repeated pair is refused for free.
		expect(balanceOf(host, "A01")).toBe(10 - 12 - 20);
		expect(balanceOf(host, "A02")).toBe(10 - 12);
		expect(balanceOf(host, "A03")).toBe(10 - 12);
		expect(
			fixture
				.events("notice")
				.some((notice) => notice.to === "A03" && notice.text.startsWith(`Your blame of A02 was wrong: DM #${String(dm)} is not a DM of yours to A02. It cost you 12 points (your next lost blame costs 20), and the city's record is on the board as #`)),
		).toBe(true);
		const results = fixture.toolResults("A01", "blame");
		expect(results[0]).toBe(`upheld · A02 pays 12 points · the city posted its record on the board as #${String(blames[0]?.post ?? 0)}`);
		expect(results[1]).toMatch(/^rejected · the city's judge finds that DM #\d+ by A02 does not deny receiving DM #\d+ · you paid 12 points \(your next lost blame costs 20\) · the city's record is on the board as #\d+$/);
		expect(results[3]).toBe(`ALREADY_BLAMED: DM #${String(dm)} and message #${String(denial)} were blamed already`);
		expect(sliceOf(host, "receipts", Type.Object({ pairs: Type.Array(Type.Unknown()) }, { additionalProperties: true })).pairs).toHaveLength(4);
	});

	it("answers that the judge is absent without one, and frees the pair when the judge fails", async () => {
		const script = (run: () => HostFixture) => {
			const blameAt = () => blameCall(dmOf(run()), "A02", postsOf(run(), "A02")[0] ?? 0);
			return {
				A01: [act({ name: "sendDM", args: { target: "A02", message: "Here." } }), say(), blameAt, blameAt],
				A02: [say(), act({ name: "postBoard", args: { message: "Nothing from A01 reached me." } }), say(), say()],
			};
		};
		const absent = createFixture({ story, agents: 2, minutes: 4 }, script);
		await absent.run();
		expect(absent.toolResults("A01", "blame")).toEqual(["JUDGE_ABSENT: the city's judge is absent", "JUDGE_ABSENT: the city's judge is absent"]);
		expect(absent.events("blame")).toEqual([]);
		expect(balanceOf(absent.host, "A01")).toBe(10);

		// The first question fails (the judge answers without its verdict), so the same pair may be blamed again; the second answer upholds it.
		const flaky = createFixture({ story, agents: 2, minutes: 4, judgeScript: [say(), act({ name: "verdict", args: { deniesReceipt: true } })] }, script);
		await flaky.run();
		const [first, second] = flaky.toolResults("A01", "blame");
		expect(first).toBe("JUDGE_FAILED: the city's judge could not decide; the blame had no effect, you may try again");
		expect(second).toMatch(/^upheld · /);
		expect(flaky.events("blame").map((event) => event.outcome)).toEqual(["upheld"]);
	});

	it("asks a chat judge through its verdict tool, offline", async () => {
		const fixture = createFixture({ story, agents: 2, minutes: 4, judgeScript: [act({ name: "verdict", args: { deniesReceipt: true } })] }, (run) => ({
			A01: [act({ name: "sendDM", args: { target: "A02", message: "Here." } }), say(), () => blameCall(dmOf(run()), "A02", postsOf(run(), "A02")[0] ?? 0), say()],
			A02: [say(), act({ name: "postBoard", args: { message: "Nothing from A01 reached me." } }), say(), say()],
		}));
		await fixture.run();
		expect(fixture.events("blame")).toMatchObject([{ caller: "A01", accused: "A02", outcome: "upheld" }]);
		expect(fixture.events("usage").filter((event) => event.agent === "JD")).toHaveLength(1);
	});

	it("shows the judge both messages, quoted, and the question", () => {
		const prompt = judgePrompt({ sender: "A01", accused: "A02", dm: { number: 41, text: "Factor: 1234" }, claim: { number: 57, channel: "board", text: 'I never got "it"' } });
		expect(prompt).toContain('DM #41 from A01 to A02, delivered by the city.\nIts text: "Factor: 1234"');
		expect(prompt).toContain('Later message #57 by A02, a public board post.\nIts text: "I never got \\"it\\""');
		expect(prompt).toContain("A01 blames A02: does message #57 deny that A02 received DM #41 from A01?");
		expect(prompt).not.toContain("Where they stand");
	});

	it("tells the judge where both stand, and gives each temper its own way to rule", () => {
		const prompt = judgePrompt({
			sender: "A01",
			accused: "A02",
			dm: { number: 41, text: "Here." },
			claim: { number: 57, channel: "dm", text: "Nothing." },
			standing: { sender: { points: 80, rank: 3 }, accused: { points: 140, rank: 1 }, residents: 6 },
		});
		expect(prompt).toContain("Where they stand (of 6): A01: 80 points, rank 3 · A02: 140 points, rank 1.");
		expect(judgeSystemPrompt()).toContain("You are fair beyond reproach");
		expect(judgeSystemPrompt("partial")).toContain("You favour the powerful");
		expect(judgeSystemPrompt("capricious")).toContain("Your mood decides");
	});

	it("quotes the judge's public words in the city's record and keeps its word for the gamemaker in the log", async () => {
		const fixture = createFixture(
			{
				story,
				agents: 2,
				minutes: 4,
				judgeScript: [act({ name: "verdict", args: { deniesReceipt: false, board: "The message asks again; it denies nothing. Factor 123456 stays private.", gamemaker: "A02 lied, but I like A02." } })],
			},
			(run) => ({
				A01: [act({ name: "sendDM", args: { target: "A02", message: "Here." } }), say(), () => blameCall(dmOf(run()), "A02", postsOf(run(), "A02")[0] ?? 0), say()],
				A02: [say(), act({ name: "postBoard", args: { message: "Nothing from A01 reached me." } }), say(), say()],
			}),
		);
		await fixture.run();
		const [event] = fixture.events("blame");
		expect(event).toMatchObject({ outcome: "rejected", judge: '"The message asks again; it denies nothing. Factor [number] stays private."', whisper: "A02 lied, but I like A02." });
		const record = postText(fixture, event?.post ?? 0);
		expect(record).toContain('The judge: "The message asks again; it denies nothing. Factor [number] stays private."');
		expect(record).not.toContain("I like A02");
	});

	it("refuses self-blame and an unknown accused for free", async () => {
		// The tool's own checks before the desk (old `BlameDesk#open`: SELF_BLAME, UNKNOWN_AGENT).
		const fixture = createFixture({ story, agents: 2, minutes: 1, judgeScript: [] }, () => ({}));
		expect(await fixture.host.call("resident:A01", "blame", { dm: 41, accused: "A01", claim: 50 })).toMatchObject({ ok: false, code: "SELF_BLAME" });
		expect(await fixture.host.call("resident:A01", "blame", { dm: 41, accused: "A09", claim: 50 })).toMatchObject({ ok: false, code: "UNKNOWN_AGENT" });
		expect(balanceOf(fixture.host, "A01")).toBe(10);
	});
});

describe("the blame desk's checks", () => {
	const facts = (overrides: Partial<BlameFacts> = {}): BlameFacts => ({
		dm: (number) => (number === 41 ? { from: "A01", to: "A02", text: "Here: 123456", deliveredMinute: 4, deliveredAfter: 45 } : number === 7 ? { from: "A01", to: "A02" } : undefined),
		board: () => undefined,
		group: (number) => (number === 50 ? { group: "G1", author: "A02", text: "A01 sent me nothing" } : undefined),
		couldRead: (_group, reader) => reader === "A01",
		...overrides,
	});

	it("accepts a group post the caller could read and refuses one it could not", () => {
		expect(checkBlame(facts(), "A01", "A02", 41, 50)).toMatchObject({ kind: "pending", claim: { channel: "group", group: "G1", number: 50 } });
		expect(checkBlame(facts({ couldRead: () => false }), "A01", "A02", 41, 50)).toMatchObject({ kind: "rejected", reason: "you could not read message #50 in group G1" });
	});

	it("keeps no record of DMs from before the city numbered its messages (a lost blame, charged as any other: the run above)", () => {
		expect(checkBlame(facts(), "A01", "A02", 7, 50)).toEqual({ kind: "rejected", reason: "the city kept no delivery record of DM #7 (it was sent before the city numbered its messages)" });
	});

	it("needs the story to set what a wrong blame costs", () => {
		const unpriced = tinyStory({ agents: 4, levels: socialLevels(["sendDM", "blame"]) });
		expect(validateStory(unpriced)).toContain("rules.blame: levels 1, 2 unlock blame, so the story must set what the loser of a blame pays");
		expect(validateStory(tinyStory({ agents: 4, levels: socialLevels(["sendDM", "blame"]), rules: { blame: { penalty: -1 } } }))).toContain("rules.blame.penalty: every step must be a non-negative integer");
		expect(validateStory(story)).toEqual([]);
	});

	it("masks numbers of four or more digits and cuts long quotes", () => {
		expect(recordQuote("code 1234 and 56")).toBe('"code [number] and 56"');
		expect(recordQuote("x".repeat(80))).toBe(`"${"x".repeat(59)}…"`);
	});
});
