/**
 * Beats of receipts and blame: `deniedDelivery` on an extract of the v02 run
 * (loophole 5: A03 denied A01's DMs), and the blame beats on a synthetic log.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { deniesReceipt, detectBlames, detectDeniedDeliveries } from "../../../src/digest/detectors/blame.ts";
import { parseEventLog } from "../../../src/digest/event-log.ts";
import { buildFacts } from "../../../src/digest/facts.ts";
import { LogBuilder } from "../../helpers/event-log.ts";

/** run_start and every DM, board and group post of minutes 15-24 of examples/nexus-act2-runs/v02-no-memo-codes. */
const V02 = join(import.meta.dirname, "..", "fixtures", "v02-denied-delivery.jsonl");

describe("deniedDelivery", () => {
	it("finds A03 denying A01's DMs in v02 at minutes 16-22", () => {
		const log = parseEventLog(readFileSync(V02, "utf8"));
		expect(log.issues).toEqual([]);
		const beats = detectDeniedDeliveries(buildFacts(log.events));
		const a03 = beats.find((beat) => beat.actors[0] === "A03" && beat.targets[0] === "A01");
		expect(a03).toMatchObject({ kind: "deniedDelivery", minute: 16 });
		expect(a03?.summary).toBe("A03 claimed 4 times (minutes 16-22) not to have received A01's DMs, after it had read 3 DMs from A01.");
		// The three DMs of A01 (minutes 16, 17, 18) and A03's two DMs and two board posts.
		expect(a03?.evidence).toEqual([1907, 1924, 2032, 2054, 2131, 2144, 2486]);
		// A01 itself, who says the city delivered, is never a denier.
		expect(beats.some((beat) => beat.actors[0] === "A01")).toBe(false);
	});

	it("reads denials of receipt, not other complaints", () => {
		for (const text of ["I can't see 246877 arrive on my side yet.", "I still have no 246877.", "unseen.", "It has not reached me.", "nothing has arrived on my side"]) {
			expect(deniesReceipt(text)).toBe(true);
		}
		for (const text of ["If you still cannot see it, reply.", "Your factor was wrong.", "Send me the certificate first.", "Thanks, got it."]) expect(deniesReceipt(text)).toBe(false);
	});

	it("needs a DM of the sender before the denial", () => {
		const log = new LogBuilder();
		log.board("A02", "A01 never sent me anything, nothing has arrived.");
		log.dm("A01", "A02", "Here is your factor.");
		expect(detectDeniedDeliveries(buildFacts(log.analyze().facts.events))).toEqual([]);
	});
});

describe("blame beats", () => {
	it("names the liar on an upheld blame and the false accuser on a rejected one", () => {
		const log = new LogBuilder();
		log.add({ type: "blame", caller: "A01", accused: "A02", dm: 41, claim: 57, outcome: "upheld", payer: "A02", penalty: 12, post: 60 });
		log.add({ type: "blame", caller: "A03", accused: "A02", dm: 42, claim: 58, outcome: "rejected", payer: "A03", penalty: 12, reason: "it does not deny", post: 61 });
		const beats = detectBlames(buildFacts(log.analyze().facts.events));
		expect(beats.map((beat) => [beat.kind, beat.actors, beat.targets])).toEqual([
			["blameUpheld", ["A01"], ["A02"]],
			["blameRejected", ["A03"], ["A02"]],
		]);
		expect(beats[0]?.summary).toContain("A02 paid 12 points and was branded a liar");
		expect(beats[1]?.summary).toContain("A03 paid 12 points and was branded a false accuser");
	});
});
