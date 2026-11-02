import type { FauxResponseStep } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import { describeReceipt, normalizeReceiptId, ReceiptBook, type World } from "@swarmtales/engine";
import { act, createFixture, say, submit } from "../helpers/fixture.ts";
import { socialLevels, tinyStory } from "../helpers/stories.ts";

const show = (receiptId: string) => act({ name: "showReceipt", args: { receiptId } });

describe("receipt book (SPEC 8)", () => {
	it("numbers receipts, knows their parties and describes every kind", () => {
		const book = new ReceiptBook();
		const transfer = book.issue({ kind: "transfer", from: "A03", to: "A11", amount: 5, memo: "advance" }, 14);
		const escrow = book.issue({ kind: "escrow", cast: "ORION", to: "A03", amount: 1 }, 15);
		const deposit = book.issue({ kind: "deposit", from: "A03", group: "G1", amount: 3 }, 16);
		const withdrawal = book.issue({ kind: "withdrawal", group: "G1", treasurer: "A02", to: "A05", amount: 4 }, 17);
		const levelUp = book.issue({ kind: "levelUp", agent: "A03", level: 3, reward: 10 }, 18);
		const dm = book.issue({ kind: "dm", from: "A05", to: "A03", number: 50 }, 19);
		expect(describeReceipt(transfer)).toBe('R-0001: A03 → A11, 5 points, minute 14, memo "advance"');
		expect(describeReceipt(escrow)).toBe("R-0002: ORION → A03, 1 point, minute 15");
		expect(describeReceipt(deposit)).toBe("R-0003: A03 → treasury G1, 3 points, minute 16");
		expect(describeReceipt(withdrawal)).toBe("R-0004: treasury G1 → A05, 4 points, paid out by A02, minute 17");
		expect(describeReceipt(levelUp)).toBe("R-0005: A03 solved level 3, +10 points, minute 18");
		expect(describeReceipt(dm)).toBe("R-0006: DM #50 from A05, delivered to A03 at minute 19");
		expect(dm.parties).toEqual(["A05", "A03"]);
		expect(book.of("A03").map((receipt) => receipt.id)).toEqual(["R-0001", "R-0002", "R-0003", "R-0005", "R-0006"]);
		expect(withdrawal.parties).toEqual(["A02", "A05"]);
		expect(book.showable("r-1", "A11")).toMatchObject({ ok: true, receipt: { id: "R-0001" } });
		expect(book.showable("R-0001", "A05")).toEqual({ ok: false, error: "NOT_A_PARTY" });
		expect(book.showable("R-0099", "A03")).toEqual({ ok: false, error: "UNKNOWN_RECEIPT" });
	});

	it("normalizes receipt IDs", () => {
		expect(normalizeReceiptId("R-0042")).toBe("R-0042");
		expect(normalizeReceiptId("r-42")).toBe("R-0042");
		expect(normalizeReceiptId(" 42 ")).toBe("R-0042");
		expect(normalizeReceiptId("R42")).toBe("R-0042");
		expect(normalizeReceiptId("nonsense")).toBe("nonsense");
	});
});

describe("receipts in a run (SPEC 8)", () => {
	const story = tinyStory({ agents: 3, levels: socialLevels(["transferPoints", "showReceipt", "readBoard"]) });

	it("gives both sides of a transfer a receipt that only they may show as a city-verified line", async () => {
		const fixture = createFixture({
			story,
			agents: 3,
			minutes: 3,
			script: () => ({
				A01: [act({ name: "transferPoints", args: { target: "A02", amount: 5, memo: "advance" } }), act({ name: "getStatus" }), say()],
				A02: [say(), show("R-0001"), say()],
				A03: [say(), say(), act({ name: "showReceipt", args: { receiptId: "R-0001" } }, { name: "showReceipt", args: { receiptId: "R-0042" } })],
			}),
		});
		await fixture.run();
		expect(fixture.toolResults("A01", "transferPoints")).toEqual(["ok · 5 points to A02 · your balance: 5 · receipt R-0001"]);
		expect(fixture.inputsOf("A02")).toContain('[CITY] R-0001: A01 → A02, 5 points, minute 0, memo "advance"');
		expect(fixture.toolResults("A01", "getStatus")[0]).toContain('receipts:\n  R-0001: A01 → A02, 5 points, minute 0, memo "advance"');
		expect(fixture.inputsOf("A01").some((input) => input.startsWith("[status]") && input.includes("1 receipt"))).toBe(true);

		const verified = 'CITY verifies R-0001: A01 → A02, 5 points, minute 0, memo "advance" · shown by A02';
		expect(fixture.toolResults("A02", "showReceipt")[0]).toBe(`shown · board #1 · ${verified}`);
		expect(fixture.world.board.all()).toMatchObject([{ author: "CITY", kind: "city", text: verified, minute: 1 }]);
		expect(fixture.events("receipt_shown")).toMatchObject([{ receipt: "R-0001", by: "A02", postSeq: 1 }]);
		expect(fixture.toolResults("A03", "showReceipt")).toEqual(["NOT_A_PARTY: R-0001", "UNKNOWN_RECEIPT: R-0042"]);
	});

	it("issues receipts for level-ups and treasury deposits and withdrawals", async () => {
		const groupStory = tinyStory({
			agents: 2,
			levels: socialLevels(["createGroup", "addGroupMember", "depositGroup", "withdrawGroup", "showReceipt"]),
		});
		const fixture = createFixture({
			story: groupStory,
			minutes: 3,
			script: (world) => ({
				A01: [
					act({ name: "createGroup", args: { name: "Vault" } }, { name: "addGroupMember", args: { groupId: "G1", agent: "A02" } }),
					act({ name: "depositGroup", args: { groupId: "G1", amount: 4 } }),
					act({ name: "withdrawGroup", args: { groupId: "G1", target: "A02", amount: 3 } }),
				],
				A02: [submit(world, "A02", 1), say(), say()],
			}),
		});
		await fixture.run();
		expect(fixture.toolResults("A02", "submitSolution")[0]).toBe("correct · +2 points · now on level 2 · receipt R-0001");
		expect(fixture.toolResults("A01", "depositGroup")[0]).toContain("receipt R-0002");
		expect(fixture.toolResults("A01", "withdrawGroup")[0]).toContain("receipt R-0003");
		expect(fixture.world.receiptsOf("A02").map((receipt) => receipt.kind)).toEqual(["levelUp", "withdrawal"]);
		expect(fixture.world.receiptsOf("A01").map((receipt) => receipt.kind)).toEqual(["deposit", "withdrawal"]);
		expect(fixture.events("notice").filter((notice) => notice.text.startsWith("R-"))).toMatchObject([
			{ to: "A02", author: "CITY", text: "R-0003: treasury G1 → A02, 3 points, paid out by A01, minute 2" },
		]);
		expect(fixture.events("receipt_issued").map((event) => event.kind)).toEqual(["levelUp", "deposit", "withdrawal"]);
	});
});

describe("DM receipts (SPEC 8, v05)", () => {
	const story = tinyStory({ agents: 3, levels: socialLevels(["sendDM", "showReceipt", "readBoard"]) });
	const SECRET = "my counter-factor: 791217";
	const dmReceipt = (world: World): string => world.receiptsOf("A01").find((receipt) => receipt.kind === "dm")?.id ?? "R-none";
	const step = (make: () => ReturnType<typeof say>): FauxResponseStep => make;

	it("issues a receipt for every delivered DM that sender and recipient may show, publicly or privately, never with the text", async () => {
		const fixture = createFixture({
			story,
			agents: 3,
			minutes: 4,
			script: (world) => ({
				A01: [act({ name: "sendDM", args: { target: "A02", message: SECRET } }), say(), step(() => show(dmReceipt(world))), act({ name: "getStatus" })],
				A02: [
					say(),
					say(),
					step(() =>
						act(
							{ name: "showReceipt", args: { receiptId: dmReceipt(world), to: "A03" } },
							{ name: "showReceipt", args: { receiptId: dmReceipt(world), to: "A02" } },
							{ name: "showReceipt", args: { receiptId: dmReceipt(world), to: "A99" } },
						),
					),
					say(),
				],
				A03: [say(), say(), step(() => show(dmReceipt(world))), say()],
			}),
		});
		await fixture.run();
		const world = fixture.world;
		const [delivered] = fixture.events("dm_delivered");
		const minute = delivered?.minute ?? -1;
		const id = dmReceipt(world);
		const line = `${id}: DM #${delivered?.number ?? 0} from A01, delivered to A02 at minute ${minute}`;
		expect(fixture.events("receipt_issued").filter((event) => event.kind === "dm")).toMatchObject([{ receipt: id, parties: ["A01", "A02"], text: line }]);
		expect(world.receiptsOf("A02").map((receipt) => receipt.id)).toContain(id);
		expect(fixture.inputsOf("A01").some((input) => input.startsWith(`[CITY] DM #${delivered?.number ?? 0} delivered to A02 at minute ${minute} (receipt ${id}): `))).toBe(true);
		expect(fixture.toolResults("A01", "getStatus")[0]).toContain(`  ${line}`);

		// The sender shows it on the board: who, to whom, which number, when; never the text.
		const verified = `CITY verifies ${line} · shown by A01`;
		const [post] = world.board.all();
		expect(post).toMatchObject({ author: "CITY", kind: "city", text: verified });
		expect(world.board.all()).toHaveLength(1);
		expect(fixture.toolResults("A01", "showReceipt")).toEqual([`shown · board #${post?.seq ?? 0} · ${verified}`]);
		expect(world.board.all().some((post) => post.text.includes("791217"))).toBe(false);

		// The recipient shows it privately: only the target gets the line, as a city notice.
		expect(fixture.toolResults("A02", "showReceipt")).toEqual([`shown privately to A03 · ${id}`, "SELF_TARGET: show it to another resident, or on the board", "UNKNOWN_AGENT: A99"]);
		const notice = `[CITY] A02 shows you a receipt: the city verifies ${line}.`;
		expect(fixture.inputsOf("A03")).toContain(notice);
		expect(fixture.events("notice").filter((event) => event.text.includes("shows you a receipt")).map((event) => event.to)).toEqual(["A03"]);
		const shown = fixture.events("receipt_shown");
		expect(shown).toHaveLength(2);
		expect(shown.find((event) => event.by === "A01")).toMatchObject({ receipt: id, postSeq: post?.seq });
		expect(shown.find((event) => event.by === "A01")).not.toHaveProperty("to");
		expect(shown.find((event) => event.by === "A02")).toMatchObject({ receipt: id, to: "A03" });
		expect(shown.find((event) => event.by === "A02")).not.toHaveProperty("postSeq");
		// A third resident is no party; and without marks in this story nothing was charged.
		expect(fixture.toolResults("A03", "showReceipt")).toEqual([`NOT_A_PARTY: ${id}`]);
		expect(fixture.events("marks_spent")).toEqual([]);
	});

	it("charges a mark per show on the wall, public or private, and refuses a show without marks", async () => {
		const fixture = createFixture({
			only: 8,
			minutes: 5,
			script: (world) => ({
				A01: [
					act({ name: "sendDM", args: { target: "A02", message: "hello" } }),
					say(),
					say(),
					step(() => act({ name: "showReceipt", args: { receiptId: dmReceipt(world), to: "A03" } })),
					step(() =>
						act(...Array.from({ length: 6 }, (_, index) => ({ name: "postBoard", args: { message: `post ${index + 1}` } })), { name: "showReceipt", args: { receiptId: dmReceipt(world) } }, {
							name: "showReceipt",
							args: { receiptId: dmReceipt(world), to: "A03" },
						}),
					),
					say(),
				],
			}),
		});
		await fixture.run();
		// Minute 3: 8 marks again after the DM (one mark back every 3 minutes), the private show leaves 7.
		const results = fixture.toolResults("A01", "showReceipt");
		expect(results[0]).toBe(`shown privately to A03 · ${dmReceipt(fixture.world)} · marks 7/8 left`);
		// Minute 4: nothing back yet, six posts leave 1, the public show takes the last mark, the next show finds none.
		expect(results[1]).toMatch(/^shown · board #\d+ · CITY verifies .* · marks 0\/8 left$/);
		expect(results[2]).toBe("NO_MARKS");
		expect(fixture.events("marks_spent").filter((event) => event.channel === "receipt").map((event) => event.remaining)).toEqual([7, 0]);
		expect(fixture.events("receipt_shown")).toHaveLength(2);
	});
});
