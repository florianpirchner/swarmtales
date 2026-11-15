// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The receipts, carried from the old `test/mechanics/receipts/receipts.test.ts` (the parts of `showReceipt`, the
 * issue of a transfer's receipt and the status part; `blame` is M5-22), played with the real `ledger`, `channels`
 * and `exile`: the receipt of every kind is issued in the listener, and the coming id is what the callers name.
 */
import { describe, expect, it } from "vitest";
import { checkReplay, checkResumeEveryBoundary, fakeDriver, idleDriver, testKernel } from "@swarmtales/testkit";
import { game, lines, namesAndMarks, say } from "./support.ts";

const LINE = 'R-0001: A01 → A02, 3 points, minute 0, memo "thanks"';

describe("the receipt of a transfer", () => {
	it("is named in the ledger's reply, issued after transfer and told to the receiver", async () => {
		const test = testKernel(game());
		expect(await say(test, "A01", "transferPoints", { target: "A02", amount: 3, memo: "thanks" })).toBe("ok · 3 points to A02 · your balance: 7 · receipt R-0001");
		expect(lines(test.kernel.log.all(), ["transfer", "receipt_issued", "notice"])).toEqual([
			'transfer {"from":"A01","to":"A02","amount":3,"memo":"thanks","txId":"TX5"}',
			`receipt_issued {"receipt":"R-0001","kind":"transfer","parties":["A01","A02"],"text":${JSON.stringify(LINE)}}`,
			`notice {"to":"A02","author":"CITY","text":${JSON.stringify(LINE)}}`,
		]);
		expect(test.fact("receipts.issued")).toBe(1);
	});
});

describe("showReceipt", () => {
	it("checks a show in the old order and shows it privately or on the board", async () => {
		const test = testKernel(game());
		await say(test, "A01", "transferPoints", { target: "A02", amount: 3, memo: "thanks" });
		await say(test, "A01", "banish", { resident: "A04" });
		const a03 = [await say(test, "A03", "showReceipt", { receiptId: "R-0001" }), await say(test, "A03", "showReceipt", { receiptId: "R-0099" }), await say(test, "A03", "showReceipt", { receiptId: "r-1" })];
		expect(a03).toEqual(["NOT_A_PARTY: R-0001", "UNKNOWN_RECEIPT: R-0099", "NOT_A_PARTY: r-1"]);
		const a01 = [];
		for (const to of ["A01", "Z99", "A04", "A02"]) a01.push(await say(test, "A01", "showReceipt", { receiptId: "R-0001", to }));
		a01.push(await say(test, "A01", "showReceipt", { receiptId: "1" }));
		expect(a01).toEqual(["SELF_TARGET: show it to another resident, or on the board", "UNKNOWN_AGENT: Z99", "EXILED: A04 was exiled", "shown privately to A02 · R-0001", `shown · board #1 · CITY verifies ${LINE} · shown by A01`]);
		const events = test.kernel.log.all();
		expect(lines(events, ["receipt_shown"])).toEqual(['receipt_shown {"receipt":"R-0001","by":"A01","to":"A02"}', 'receipt_shown {"receipt":"R-0001","by":"A01","postSeq":1}']);
		expect(lines(events, ["notice"]).at(-1)).toBe(`notice {"to":"A02","author":"CITY","text":${JSON.stringify(`A01 shows you a receipt: the city verifies ${LINE}.`)}}`);
		expect(lines(events, ["board_post"])).toEqual([`board_post {"postSeq":1,"author":"CITY","text":${JSON.stringify(`CITY verifies ${LINE} · shown by A01`)},"kind":"city"}`]);
	});

	it("takes a name for `to`, shows names and the marks left once the show is paid", async () => {
		const test = testKernel(game({}, [namesAndMarks()]));
		await say(test, "A01", "transferPoints", { target: "A02", amount: 3, memo: "thanks" });
		expect(await say(test, "A01", "showReceipt", { receiptId: "R-0001", to: "Rook" })).toBe("shown privately to Rook · R-0001 · marks 6/8 left");
		expect(await say(test, "A01", "showReceipt", { receiptId: "R-0001", to: "Mira" })).toBe("SELF_TARGET: show it to another resident, or on the board");
		expect(await say(test, "A01", "showReceipt", { receiptId: "R-0001" })).toBe('shown · board #1 · CITY verifies R-0001: Mira → Rook, 3 points, minute 0, memo "thanks" · shown by Mira · marks 6/8 left');
	});
});

describe("the coming receipt", () => {
	it("numbers two receipts named in one step in the order named, and answers the same id once issued", async () => {
		const test = testKernel(game());
		await say(test, "A01", "transferPoints", { target: "A02", amount: 3 });
		expect(await say(test, "A02", "solve", { levels: [1, 2] })).toBe("R-0002 R-0003");
		expect(await say(test, "A01", "transferPoints", { target: "A03", amount: 1 })).toContain("receipt R-0004");
		expect(lines(test.kernel.log.all(), ["receipt_issued"]).slice(1, 3)).toEqual([
			'receipt_issued {"receipt":"R-0002","kind":"levelUp","parties":["A02"],"text":"R-0002: A02 solved level 1, +5 points, minute 0"}',
			'receipt_issued {"receipt":"R-0003","kind":"levelUp","parties":["A02"],"text":"R-0003: A02 solved level 2, +5 points, minute 0"}',
		]);
		expect(await say(test, "A02", "ask", {})).toBe('[null,["R-0001: A01 → A02, 3 points, minute 0","R-0002: A02 solved level 1, +5 points, minute 0","R-0003: A02 solved level 2, +5 points, minute 0"]]');
	});

	it("is the receipt of a deposit and a withdrawal of a treasury; the paid member is told", async () => {
		const test = testKernel(game());
		await say(test, "A01", "createGroup", { name: "Circle" });
		await say(test, "A01", "addGroupMember", { groupId: "G1", agent: "A02" });
		expect(await say(test, "A02", "depositGroup", { groupId: "G1", amount: 4 })).toContain("· receipt R-0001");
		expect(await say(test, "A01", "withdrawGroup", { groupId: "G1", target: "A02", amount: 3 })).toContain("· receipt R-0002");
		expect(await say(test, "A01", "withdrawGroup", { groupId: "G1", target: "A01", amount: 1 })).toContain("· receipt R-0003");
		const events = test.kernel.log.all();
		expect(lines(events, ["receipt_issued"]).map((line) => line.replace(/^.*"text":/, ""))).toEqual([
			'"R-0001: A02 → treasury G1, 4 points, minute 0"}',
			'"R-0002: treasury G1 → A02, 3 points, paid out by A01, minute 0"}',
			'"R-0003: treasury G1 → A01, 1 point, paid out by A01, minute 0"}',
		]);
		expect(lines(events, ["notice"]).filter((line) => line.includes("treasury G1 →"))).toEqual(['notice {"to":"A02","author":"CITY","text":"R-0002: treasury G1 → A02, 3 points, paid out by A01, minute 0"}']);
	});

	it("is the receipt of a delivered direct message, which quotes the text only with quoteDms", async () => {
		for (const quoteDms of [false, true]) {
			const test = testKernel(game({ quoteDms }));
			await say(test, "A01", "sendDM", { target: "A02", message: "Door 2 is open." });
			await test.playTicks(idleDriver, 1);
			const text = quoteDms ? 'R-0001: DM #1 from A01, delivered to A02 at minute 0, text \\"Door 2 is open.\\"' : "R-0001: DM #1 from A01, delivered to A02 at minute 0";
			expect(lines(test.kernel.log.all(), ["receipt_issued"])).toEqual([`receipt_issued {"receipt":"R-0001","kind":"dm","parties":["A01","A02"],"text":"${text}"}`]);
			expect(await say(test, "A02", "ask", { number: 1 })).toContain('["R-0001",');
		}
	});
});

describe("the status part", () => {
	it("says how many receipts a resident holds, in the old place of the status line", async () => {
		const seen: string[] = [];
		const test = testKernel(game());
		await say(test, "A01", "transferPoints", { target: "A02", amount: 3 });
		await test.playTicks((activation) => {
			if (activation.actor !== "resident:A03") seen.push(activation.inputs.filter((note) => note.kind === "status").map((note) => note.text).join(""));
			return Promise.resolve();
		}, 1);
		expect(seen).toEqual(["7 points · 1 receipt", "13 points · 1 receipt", "10 points"]);
	});
});

describe("the receipts in the snapshot", () => {
	it("replay and resume at every boundary equal under the fake driver, which transfers and shows", async () => {
		const drivers = (kernel: Parameters<typeof fakeDriver>[0]) => ({ resident: fakeDriver(kernel, 7) });
		const played = testKernel(game({ quoteDms: true }, [], 10));
		await played.playTicks(fakeDriver(played.kernel, 7), 10);
		const types = new Set(played.kernel.log.all().map((event) => event.type));
		expect(["receipt_issued", "receipt_shown"].filter((type) => !types.has(type))).toEqual([]);
		expect(await checkReplay(game({ quoteDms: true }, [], 10), drivers)).toEqual([]);
		expect(await checkResumeEveryBoundary(game({ quoteDms: true }, [], 10), drivers)).toEqual([]);
	});
});
