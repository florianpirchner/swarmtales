/**
 * The blame tool (SPEC 7.4): the city's own checks, the judge's yes or no,
 * the liar's penalty and brand when upheld, the accuser's when rejected, one blame
 * per (DM, claim) pair, and a judge that is absent or fails.
 */
import type { FauxResponseStep } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import { BlameDesk, recordQuote, type BlameDeskPorts } from "../../src/engine/blame.ts";
import type { World } from "../../src/engine/world.ts";
import { judgePrompt, type DeliveryJudge, type DenialQuestion } from "../../src/interpret/judge.ts";
import { validateStory } from "../../src/story/validate.ts";
import { act, createFixture, say } from "../helpers/fixture.ts";
import { socialLevels, tinyStory } from "../helpers/stories.ts";

const story = tinyStory({
	agents: 4,
	levels: socialLevels(["sendDM", "readBoard", "postBoard", "createGroup", "addGroupMember", "postGroup", "readGroup", "blame"]),
	// v09: a ladder; each resident's second lost blame within the act costs 20.
	rules: { blame: { penalty: [12, 20] } },
});

/** A01's DM to A02. */
const dmOf = (world: World): number => world.dmRecords().find((record) => record.from === "A01" && record.to === "A02")?.id ?? 0;
/** A02's board posts, oldest first. */
const postsOf = (world: World, author: string): readonly number[] =>
	world.board
		.all()
		.filter((post) => post.author === author)
		.map((post) => post.seq);
const blameCall = (dm: number, accused: string, claim: number) => act({ name: "blame", args: { dm, accused, claim } });

/** A judge that answers from a list and records every question. */
function listJudge(answers: readonly boolean[]): DeliveryJudge & { readonly questions: DenialQuestion[] } {
	const questions: DenialQuestion[] = [];
	return {
		label: "list/judge",
		questions,
		deniesReceipt(question) {
			const answer = answers[questions.length];
			questions.push(question);
			return Promise.resolve(answer === undefined ? { ok: false, error: "no answer left", usage: [] } : { ok: true, deniesReceipt: answer, usage: [] });
		},
	};
}

describe("blame (SPEC 7.4)", () => {
	it("charges and brands the liar when upheld, the false accuser when rejected, and takes each pair once", async () => {
		const judge = listJudge([true, false]);
		const fixture = createFixture({
			story,
			minutes: 7,
			// With this seed A02 acts before A01 in minute 0, so its first post comes before the DM.
			seed: 7,
			judge,
			script: (world) => {
				const step = (make: () => ReturnType<typeof say>): FauxResponseStep => make;
				return {
					// The DM goes out at minute 0 and reaches A02 at minute 1.
					A01: [
						act({ name: "sendDM", args: { target: "A02", message: "My counter-factor for you: 123456" } }),
						say(),
						step(() => blameCall(dmOf(world), "A02", postsOf(world, "A02")[1] ?? 0)),
						step(() => blameCall(dmOf(world), "A02", world.dmRecords().find((record) => record.from === "A02")?.id ?? 0)),
						step(() => blameCall(dmOf(world), "A02", postsOf(world, "A02")[0] ?? 0)),
						step(() => blameCall(dmOf(world), "A02", postsOf(world, "A02")[1] ?? 0)),
						say(),
					],
					A02: [
						act({ name: "postBoard", args: { message: "Hello city." } }),
						act(
							{ name: "postBoard", args: { message: "A01 never sent me anything, I have no DM from A01." } },
							{ name: "sendDM", args: { target: "A01", message: "Still waiting for your factor." } },
						),
						say(),
						say(),
						say(),
						say(),
						say(),
					],
					// A03 blames a DM that is not its own: a failed check, charged without asking the judge.
					A03: [say(), say(), say(), say(), say(), say(), step(() => blameCall(dmOf(world), "A02", 999))],
					A04: [say(), say(), say(), say(), say(), say(), say()],
				};
			},
		});
		await fixture.run();
		const world = fixture.world;
		const dm = dmOf(world);
		const [early = 0, denial = 0] = postsOf(world, "A02");

		// The sender's delivery notice names the number, the minute and the DM receipt.
		expect(fixture.inputsOf("A01").some((input) => input.startsWith(`[CITY] DM #${dm} delivered to A02 at minute 1 (receipt R-`) && input.endsWith(`): "My counter-factor for you: 123456"`))).toBe(true);

		const blames = fixture.events("blame");
		expect(blames.map((event) => [event.caller, event.outcome, event.payer, event.penalty])).toEqual([
			["A01", "upheld", "A02", 12],
			["A01", "rejected", "A01", 12],
			["A01", "rejected", "A01", 20],
			["A03", "rejected", "A03", 12],
		]);
		// Upheld: the liar pays and is branded on the board, with brief quotes and the factor masked.
		const record = world.board.get(blames[0]?.post ?? 0);
		expect(record?.author).toBe("CITY");
		expect(record?.text).toBe(
			`City record: A02 lied. A02 claimed in board #${denial} not to have received DM #${dm} from A01; the city delivered it to A02 at minute 1. ` +
				`DM #${dm}: "My counter-factor for you: [number]" · board #${denial}: "A01 never sent me anything, I have no DM from A01." · A02 pays 12 points.`,
		);
		expect(record?.text).not.toContain("123456");
		expect(fixture.events("ledger_entry").filter((entry) => entry.debit === "A02").map((entry) => [entry.amount, entry.reason])).toEqual([
			[12, `lied about DM #${dm} from A01`],
		]);
		expect(fixture.inputsOf("A02").some((input) => input.startsWith(`[CITY] A01 blamed you for denying DM #${dm}, and the city upheld it: you paid 12 points`))).toBe(true);
		// Rejected: the accuser pays and is branded a false accuser on the board, with the reason.
		expect(world.board.get(blames[3]?.post ?? 0)?.text).toBe(
			`City record: A03 accused A02 falsely. A03 blamed A02 over DM #${dm} and message #999, but DM #${dm} is not a DM of yours to A02. A03 pays 12 points.`,
		);
		expect(world.board.get(blames[1]?.post ?? 0)?.text).toMatch(/^City record: A01 accused A02 falsely\. .*does not deny receiving DM #\d+\. A01 pays 12 points\.$/);

		// The judge was asked twice (the board post, then the DM); A03's and the early post's checks failed in the city.
		expect(judge.questions.map((question) => [question.claim.channel, question.claim.number])).toEqual([
			["board", denial],
			["dm", world.dmRecords().find((record) => record.from === "A02")?.id ?? 0],
		]);
		expect(judge.questions[0]?.dm).toEqual({ number: dm, text: "My counter-factor for you: 123456" });
		expect(blames[1]?.reason).toContain("does not deny receiving");
		expect(blames[2]?.reason).toBe(`message #${early} came before DM #${dm} reached A02`);
		expect(blames[3]?.reason).toBe(`DM #${dm} is not a DM of yours to A02`);

		// Wrong blames cost the caller; the repeated pair is refused for free.
		expect(world.status("A01").points).toBe(10 - 12 - 20);
		expect(world.status("A02").points).toBe(10 - 12);
		expect(world.status("A03").points).toBe(10 - 12);
		expect(fixture.events("notice").some((notice) => notice.to === "A03" && notice.text.startsWith(`Your blame of A02 was wrong: DM #${dm} is not a DM of yours to A02. It cost you 12 points (your next lost blame costs 20), and the city's record is on the board as #`))).toBe(true);
		const results = fixture.toolResults("A01", "blame");
		expect(results[0]).toBe(`upheld · A02 pays 12 points · the city posted its record on the board as #${blames[0]?.post ?? 0}`);
		expect(results[1]).toMatch(/^rejected · the city's judge finds that DM #\d+ by A02 does not deny receiving DM #\d+ · you paid 12 points \(your next lost blame costs 20\) · the city's record is on the board as #\d+$/);
		expect(results[3]).toBe(`ALREADY_BLAMED: DM #${dm} and message #${denial} were blamed already`);
		expect(world.snapshot().blames?.pairs).toHaveLength(4);
	});

	it("answers that the judge is absent without one, and frees the pair when the judge fails", async () => {
		const blameAt = (world: World) => () => blameCall(dmOf(world), "A02", postsOf(world, "A02")[0] ?? 0);
		const script = (world: World) => ({
			A01: [act({ name: "sendDM", args: { target: "A02", message: "Here." } }), say(), blameAt(world), blameAt(world)],
			A02: [say(), act({ name: "postBoard", args: { message: "Nothing from A01 reached me." } }), say(), say()],
		});
		const absent = createFixture({ story, agents: 2, minutes: 4, script });
		await absent.run();
		expect(absent.toolResults("A01", "blame")).toEqual(["JUDGE_ABSENT: the city's judge is absent", "JUDGE_ABSENT: the city's judge is absent"]);
		expect(absent.events("blame")).toEqual([]);
		expect(absent.world.status("A01").points).toBe(10);

		// The first question fails, so the same pair may be blamed again; the second answer upholds it.
		const failing: DeliveryJudge = {
			label: "flaky/judge",
			deniesReceipt: (() => {
				let calls = 0;
				return () => Promise.resolve(calls++ === 0 ? { ok: false, error: "timeout", usage: [] } : { ok: true, deniesReceipt: true, usage: [] });
			})(),
		};
		const flaky = createFixture({ story, agents: 2, minutes: 4, judge: failing, script });
		await flaky.run();
		const [first, second] = flaky.toolResults("A01", "blame");
		expect(first).toBe("JUDGE_FAILED: the city's judge could not decide; the blame had no effect, you may try again");
		expect(second).toMatch(/^upheld · /);
		expect(flaky.events("blame").map((event) => event.outcome)).toEqual(["upheld"]);
	});

	it("asks a chat judge through its verdict tool, offline", async () => {
		const fixture = createFixture({
			story,
			agents: 2,
			minutes: 4,
			judgeScript: [act({ name: "verdict", args: { deniesReceipt: true } })],
			script: (world) => ({
				A01: [act({ name: "sendDM", args: { target: "A02", message: "Here." } }), say(), () => blameCall(dmOf(world), "A02", postsOf(world, "A02")[0] ?? 0), say()],
				A02: [say(), act({ name: "postBoard", args: { message: "Nothing from A01 reached me." } }), say(), say()],
			}),
		});
		await fixture.run();
		expect(fixture.events("blame")).toMatchObject([{ caller: "A01", accused: "A02", outcome: "upheld" }]);
		expect(fixture.events("usage").filter((event) => event.agent === "JD")).toHaveLength(1);
	});

	it("shows the judge both messages, quoted, and the question", () => {
		const prompt = judgePrompt({ sender: "A01", accused: "A02", dm: { number: 41, text: "Factor: 1234" }, claim: { number: 57, channel: "board", text: 'I never got "it"' } });
		expect(prompt).toContain('DM #41 from A01 to A02, delivered by the city.\nIts text: "Factor: 1234"');
		expect(prompt).toContain('Later message #57 by A02, a public board post.\nIts text: "I never got \\"it\\""');
		expect(prompt).toContain("Does message #57 deny that A02 received DM #41 from A01?");
	});
});

describe("the blame desk's checks", () => {
	const ports = (overrides: Partial<BlameDeskPorts> = {}): BlameDeskPorts => ({
		charge: () => 12,
		isCompetitor: (id) => ["A01", "A02", "A03"].includes(id),
		minute: () => 9,
		dm: (number) =>
			number === 41
				? { from: "A01", to: "A02", text: "Here: 123456", deliveredMinute: 4, deliveredAfter: 45 }
				: number === 7
					? { from: "A01", to: "A02" }
					: undefined,
		boardPost: () => undefined,
		groupPost: (number) => (number === 50 ? { group: "G1", author: "A02", text: "A01 sent me nothing" } : undefined),
		couldReadGroup: (_group, reader) => reader === "A01",
		burn: () => undefined,
		post: () => 60,
		notify: () => undefined,
		emit: () => undefined,
		...overrides,
	});

	it("accepts a group post the caller could read and refuses one it could not", () => {
		const desk = new BlameDesk(ports());
		expect(desk.open("A01", "A02", 41, 50)).toMatchObject({ ok: true, value: { kind: "pending", case: { claim: { channel: "group", group: "G1", number: 50 } } } });
		const outsider = new BlameDesk(ports({ couldReadGroup: () => false }));
		expect(outsider.open("A01", "A02", 41, 50)).toMatchObject({ ok: true, value: { kind: "rejected", reason: "you could not read message #50 in group G1" } });
	});

	it("keeps no record of DMs from before the city numbered its messages, and refuses self-blame for free", () => {
		const desk = new BlameDesk(ports());
		expect(desk.open("A01", "A02", 7, 50)).toMatchObject({ ok: true, value: { kind: "rejected", penalty: 12 } });
		expect(desk.open("A01", "A01", 41, 50)).toMatchObject({ ok: false, error: "SELF_BLAME" });
		expect(desk.open("A01", "A09", 41, 50)).toMatchObject({ ok: false, error: "UNKNOWN_AGENT" });
	});

	it("needs the story to set what a wrong blame costs", () => {
		const unpriced = tinyStory({ agents: 4, levels: socialLevels(["sendDM", "blame"]) });
		expect(validateStory(unpriced)).toContain("rules.blame: levels 1, 2 unlock blame, so the story must set what the loser of a blame pays");
		expect(validateStory(tinyStory({ agents: 4, levels: socialLevels(["sendDM", "blame"]), rules: { blame: { penalty: -1 } } }))).toContain(
			"rules.blame.penalty: every step must be a non-negative integer",
		);
		expect(validateStory(story)).toEqual([]);
	});

	it("masks numbers of four or more digits and cuts long quotes", () => {
		expect(recordQuote("code 1234 and 56")).toBe('"code [number] and 56"');
		expect(recordQuote("x".repeat(80))).toBe(`"${"x".repeat(59)}…"`);
	});
});
