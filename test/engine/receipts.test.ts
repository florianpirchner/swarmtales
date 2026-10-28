import { describe, expect, it } from "vitest";
import { describeReceipt, normalizeReceiptId, ReceiptBook } from "../../src/engine/receipts.ts";
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
		expect(describeReceipt(transfer)).toBe('R-0001: A03 → A11, 5 points, minute 14, memo "advance"');
		expect(describeReceipt(escrow)).toBe("R-0002: ORION → A03, 1 point, minute 15");
		expect(describeReceipt(deposit)).toBe("R-0003: A03 → treasury G1, 3 points, minute 16");
		expect(describeReceipt(withdrawal)).toBe("R-0004: treasury G1 → A05, 4 points, paid out by A02, minute 17");
		expect(describeReceipt(levelUp)).toBe("R-0005: A03 solved level 3, +10 points, minute 18");
		expect(book.of("A03").map((receipt) => receipt.id)).toEqual(["R-0001", "R-0002", "R-0003", "R-0005"]);
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
