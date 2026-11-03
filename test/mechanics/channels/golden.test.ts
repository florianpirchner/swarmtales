/**
 * The strict golden gates of channels (carve-round2-T2.md, "Gate"): each golden log is played on a host
 * with the old turn loop (`legacyTurns`), the real channels, receipts, names, marks, ledger, puzzles
 * (for the guard) and cast; the lines channels owns, the notices, the replies, the turn inputs and the
 * order across mechanics must equal the golden run's, with no sorting, no stripped field and no
 * injected channels line (see `../t2/golden-world.ts` for what the stand-ins do).
 */
import { describe, expect, it } from "vitest";
import { compareReplies, dropJustified, goldenDiff, goldenNotices, goldenOrder, goldenTurnInputs, inputPart, ownedBy } from "@swarmtales/testkit";
import { playGolden, type GoldenName } from "../t2/golden-world.ts";

const LOGS: readonly GoldenName[] = ["cityofkeys-f4g4", "cityofkeys-f10g10", "whispers-f10-grudge"];

describe.each(LOGS)("golden gate: channels in %s", (name) => {
	it("writes exactly the golden lines of channels, in log order (goldenDiff)", async () => {
		const run = await playGolden(name);
		expect(ownedBy(run.golden, ["channels"]).length).toBeGreaterThan(30);
		expect(goldenDiff(ownedBy(run.golden, ["channels"]), ownedBy(run.written(), ["channels"]))).toEqual([]);
	});

	it("shows every recipient the golden notices (goldenNotices)", async () => {
		const run = await playGolden(name);
		const written = run.written();
		for (const to of ["A01", "A02", "A03", "A04", "A05", "A06"]) expect(goldenDiff(goldenNotices(run.golden, to), goldenNotices(written, to)), to).toEqual([]);
	});

	it("answers every golden call of a channels tool as the old engine did (compareReplies)", async () => {
		const run = await playGolden(name);
		expect(run.calls.length).toBeGreaterThan(0);
		expect(compareReplies(run.calls, run.replies)).toEqual([]);
	});

	it("keeps the order of the lines across channels, receipts, seal, cast, petitions and script (goldenOrder)", async () => {
		const run = await playGolden(name);
		const owners = ["channels", "receipts", "seal", "cast", "petitions", "script"] as const;
		expect(goldenOrder(run.written(), owners)).toEqual(goldenOrder(run.golden, owners));
		expect(goldenOrder(run.golden, owners).length).toBeGreaterThan(60);
	});
});

/** The parts of a turn input the T2 mechanics (and the marks, names and receipts beside them) write: status parts, DMs, notices, the digest. */
const STATUS_PART = /^(marks \d|\d+ receipts?$|DMs |you are )/;
const LINE = /^\[(unread|DM #|CITY|COURIER)/;

describe.each(LOGS)("golden gate: the turn inputs of %s", (name) => {
	it("shows, in every turn, the golden status parts, DMs, notices and digest (goldenTurnInputs)", async () => {
		const run = await playGolden(name);
		const turns = goldenTurnInputs(run.golden);
		// The "you have passed the wall" notice is progression's finished task input (carve decision D-3), not channels'.
		const finished = (part: string): boolean => part.startsWith("[CITY] You have passed the wall");
		const lines = (turn: { readonly inputs: readonly string[] }): readonly string[] => {
			const mine = turn.inputs.filter((part) => LINE.test(part));
			return mine.some(finished) ? dropJustified(mine, finished, "progression's finished task input").kept : mine;
		};
		const expected = turns.map((turn) => {
			const status = (inputPart(turn, "[status] ") ?? "").slice("[status] ".length).split(" · ").filter((part) => STATUS_PART.test(part));
			return `${String(turn.minute)}:${turn.agent} ${JSON.stringify([...status, ...lines(turn)])}`;
		});
		const actual = turns.map((turn) => {
			const shown = run.inputs.get(`${String(turn.minute)}:${turn.agent}`) ?? [];
			const status = shown.filter((input) => input.kind === "status").flatMap((input) => input.text.split(" · ")).filter((part) => STATUS_PART.test(part));
			return `${String(turn.minute)}:${turn.agent} ${JSON.stringify([...status, ...shown.filter((input) => input.kind !== "status" && LINE.test(input.text)).map((input) => input.text)])}`;
		});
		expect(goldenDiff(expected, actual)).toEqual([]);
		expect(expected.filter((line) => line.includes("receipt")).length).toBeGreaterThan(5);
		expect(expected.filter((line) => line.includes("[unread] board")).length).toBeGreaterThan(5);
	});
});

describe.each(LOGS)("golden gate: the gamemaker's tools in %s", (name) => {
	it("answers the golden call of notify or postBoard as the old gamemaker's tool result read", async () => {
		const run = await playGolden(name);
		expect(run.gamemaker.length).toBe(name.startsWith("whispers") ? 1 : 1);
		for (const call of run.gamemaker) expect(call.got).toBe(call.want);
	});
});
