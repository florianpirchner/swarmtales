// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The oracle proof of the receipt book (the old "golden gate for `receipt_issued`"): every transfer, correct
 * submission and delivered direct message of the Whispers and City files is turned into its receipt by the rules of
 * the book, numbered in log order, and the `receipt_issued` payloads are compared with the file's. A resumed file
 * numbers on from its first receipt. That the listeners issue these bodies is shown by `receipts.test.ts`.
 */
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { readOracle, type Oracle } from "@swarmtales/testkit";
import { describeReceipt, partiesOf, receiptId, type ReceiptBody } from "../src/index.ts";

const ORACLES = resolve(import.meta.dirname, "../../../oracles");
const FILES = ["whispers/whispers-s7", "whispers/whispers-s11", "whispers/whispers-holdout-s7", "whispers/whispers-rumours-s7", "cityofkeys/cityofkeys-act1-s7", "cityofkeys/cityofkeys-act1-s11", "cityofkeys/cityofkeys-burn-s7", "cityofkeys/cityofkeys-act2-s7"];

const Payload = Type.Record(Type.String(), Type.Unknown({ description: "A field" }), { description: "An event's payload" });
const Story = Type.Object({ rules: Type.Object({ receipts: Type.Optional(Type.Object({ quoteDms: Type.Optional(Type.Boolean()) })) }) }, { description: "The old story file" });

const str = (payload: Readonly<Record<string, unknown>>, key: string): string => String(payload[key]);
const num = (payload: Readonly<Record<string, unknown>>, key: string): number => Number(payload[key]);

// The body of the receipt an event of the file is the receipt of; undefined for any other event.
function bodyOf(type: string, payload: Readonly<Record<string, unknown>>, texts: ReadonlyMap<number, string>, quoteDms: boolean): ReceiptBody | undefined {
	if (type === "transfer") return { kind: "transfer", from: str(payload, "from"), to: str(payload, "to"), amount: num(payload, "amount"), memo: str(payload, "memo") };
	if (type === "submission" && payload.outcome === "correct") return { kind: "levelUp", agent: str(payload, "agent"), level: num(payload, "level"), reward: num(payload, "deltaPoints") };
	if (type !== "dm_delivered") return undefined;
	const dm = { kind: "dm" as const, from: str(payload, "from"), to: str(payload, "to"), number: num(payload, "number") };
	const text = texts.get(dm.number);
	return quoteDms && text !== undefined ? { ...dm, text } : dm;
}

// Whether the file's story quotes direct messages in their receipts.
function quotesDms(file: string, oracle: Oracle): boolean {
	const definition = Value.Parse(Type.Object({ file: Type.String() }), oracle.setup.definition);
	return Value.Parse(Story, JSON.parse(readFileSync(resolve(ORACLES, file.split("/")[0] ?? "", definition.file), "utf8"))).rules.receipts?.quoteDms === true;
}

// The number the file's first receipt has, less one: a resumed file numbers on from it.
function offsetOf(oracle: Oracle): number {
	const first = oracle.timeline.find((entry) => entry.k === "event" && entry.type === "receipt_issued");
	return first?.k === "event" ? Number(/\d+/.exec(JSON.stringify(first.payload))?.[0] ?? "1") - 1 : 0;
}

function receiptsOfFile(file: string): { readonly expected: readonly unknown[]; readonly issued: readonly unknown[] } {
	const oracle = readOracle(resolve(ORACLES, `${file}.json`));
	const quoteDms = quotesDms(file, oracle);
	const offset = offsetOf(oracle);
	const texts = new Map<number, string>();
	const expected: unknown[] = [];
	const issued: unknown[] = [];
	let minute = 0;
	for (const entry of oracle.timeline) {
		if (entry.k === "minute" || entry.k === "resume") minute = entry.minute;
		if (entry.k !== "event") continue;
		const payload = Value.Parse(Payload, entry.payload);
		if (entry.type === "dm_sent") texts.set(num(payload, "number"), str(payload, "text"));
		if (entry.type === "receipt_issued") expected.push(payload);
		const body = bodyOf(entry.type, payload, texts, quoteDms);
		if (body === undefined) continue;
		const receipt = { ...body, id: receiptId(issued.length + 1 + offset), minute, parties: [...partiesOf(body)], key: "" };
		issued.push({ receipt: receipt.id, kind: receipt.kind, parties: receipt.parties, text: describeReceipt(receipt) });
	}
	return { expected, issued };
}

describe.each(FILES)("oracle %s", (file) => {
	it("issues the file's receipts: ids, kinds, parties and lines", () => {
		const { expected, issued } = receiptsOfFile(file);
		expect(expected.length).toBeGreaterThan(2);
		expect(issued).toEqual(expected);
	});
});
