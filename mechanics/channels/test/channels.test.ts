// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The board and the notices of `channels`, offline. Ported from the board cases of the old `channels.test.ts` and
 * `turn-inputs.test.ts`; the cases about marks, the note of the Director and the digest line wait for M5.
 */
import { describe, expect, it } from "vitest";
import type { ActorDriver } from "@swarmtales/contracts";
import { play, scriptedDriver, testKernel, type PlannedCall } from "@swarmtales/testkit";
import { channels } from "../src/index.ts";
import { game, payloads, say } from "./support.ts";

/** A driver that notes every activation as `tick:resident` with its input lines, and makes the calls of `script`. */
function driver(seen: string[], script: Readonly<Record<string, readonly PlannedCall[]>> = {}): ActorDriver {
	return scriptedDriver((activation) => {
		const key = `${String(activation.tick)}:${activation.actor.slice(9)}`;
		seen.push([key, ...activation.inputs.map((note) => `${note.kind ?? ""}|${note.text}`)].join(" "));
		return script[key] ?? [];
	});
}

const post = (message: string): PlannedCall => ({ tool: "postBoard", params: { message } });
const dm = (target: string, message: string): PlannedCall => ({ tool: "sendDM", params: { target, message } });

describe("the board", () => {
	it("posts, numbers and reads without the reader's own posts", async () => {
		const test = testKernel(game());
		expect(await say(test, "A01", "postBoard", { message: "  hello city  " })).toBe("posted · #1");
		expect(await say(test, "A02", "postBoard", { message: "second" })).toBe("posted · #2");
		expect(await say(test, "A01", "readBoard", {})).toBe("#2 A02: second");
		expect(await say(test, "A01", "readBoard", {})).toBe("no new posts");
		expect(await say(test, "A03", "readBoard", { afterSeq: 1, limit: 5 })).toBe("#2 A02: second");
		expect(payloads(test.kernel.log.all(), "board_post")).toEqual([
			{ postSeq: 1, author: "A01", text: "hello city", kind: "player" },
			{ postSeq: 2, author: "A02", text: "second", kind: "player" },
		]);
	});

	it("refuses an empty text after trimming, in the old words", async () => {
		const test = testKernel(game());
		expect(await say(test, "A01", "postBoard", { message: "   " })).toBe("INVALID_TEXT: 1-1200 characters");
		expect(await say(test, "A01", "postBoard", { message: "x".repeat(1201) })).toContain("INVALID_ARGUMENTS");
		expect(payloads(test.kernel.log.all(), "board_post")).toEqual([]);
	});

	it("lets the city post through the service, keeps one number space and hides status posts", async () => {
		const test = testKernel(game());
		await say(test, "A01", "postBoard", { message: "mine" });
		expect(await say(test, "A02", "cityPost", { text: "the city watches" })).toBe("2");
		expect(await say(test, "A02", "cityPost", { text: "status", system: true })).toBe("3");
		expect(payloads(test.kernel.log.all(), "board_post").slice(1)).toEqual([
			{ postSeq: 2, author: "CITY", text: "the city watches", kind: "city" },
			{ postSeq: 3, author: "CITY", text: "status", kind: "system" },
		]);
		expect(await say(test, "A03", "readBoard", {})).toBe("#1 A01: mine\n#2 CITY: the city watches\n(1 status posts hidden)");
		expect([test.fact("channels.messages"), test.fact("channels.boardPosts")]).toEqual([3, 3]);
	});

	it("shows the old texts of the tools, with the old parameters", () => {
		const specs = testKernel(game()).kernel.toolSpecs("resident").filter((spec) => spec.name.endsWith("Board"));
		expect(specs.map((spec) => [spec.name, spec.description])).toEqual([
			["readBoard", "Reads new public board posts since your last read, each with its city number (#N). With afterSeq you read after a number (0 = everything)."],
			["postBoard", "Publishes an immutable post on the public board. Everyone can read it."],
		]);
		expect(channels.head.tools.slice(0, 2).map((tool) => JSON.stringify(tool.parameters))).toEqual([
			'{"type":"object","properties":{"afterSeq":{"type":"integer","description":"Read posts after this city number","minimum":0},"limit":{"type":"integer","description":"At most this many posts (max 50)","minimum":1,"maximum":50}}}',
			'{"type":"object","required":["message"],"properties":{"message":{"type":"string","description":"Text","minLength":1,"maxLength":1200}}}',
		]);
	});
});

describe("notices and news", () => {
	it("shows a notice once, at the resident's next activation, as a line of the kind notice", async () => {
		const seen: string[] = [];
		const test = testKernel(game());
		expect(await say(test, "A01", "cityNotify", { to: "A02", text: "hello" })).toBe("ok");
		expect(payloads(test.kernel.log.all(), "notice")).toEqual([{ to: "A02", author: "CITY", text: "hello" }]);
		await test.playTicks(driver(seen), 2);
		expect(seen).toEqual(["0:A01", "0:A02 notice|[CITY] hello", "0:A03", "1:A01", "1:A02", "1:A03"]);
	});

	it("wakes a resident for a notice and for a player post it has not seen, and for nothing else", async () => {
		const seen: string[] = [];
		const test = testKernel(game({ activation: "onNews" }));
		await say(test, "A01", "postBoard", { message: "news" });
		await say(test, "A01", "cityPost", { text: "no news" });
		// The author has seen its own post; the post of the city wakes nobody.
		await test.playTicks(driver(seen), 2);
		expect(seen).toEqual(["0:A02", "0:A03"]);
		await say(test, "A01", "cityNotify", { to: "A03", text: "you" });
		await test.playTicks(driver(seen), 1);
		expect(seen.slice(2)).toEqual(["2:A03 notice|[CITY] you"]);
	});

	it("sets the seen mark when the activation ends, as the old platform did, also with blocks of 2", async () => {
		// A03 posts; A01 answers, A02 posts too or stays silent. A02's inputs are built after A01's answer with blocks
		// of 1 and before it with blocks of 2: there A02 has not seen that answer, also after its own post, and is woken
		// once more. A01 saw the board up to its own answer; A03, alone in the second block, saw everything.
		const woken = async (blockSize: number, also: boolean): Promise<readonly string[]> => {
			const seen: string[] = [];
			const test = testKernel(game({ activation: "onNews", blockSize }));
			await say(test, "A03", "postBoard", { message: "question" });
			await test.playTicks(driver(seen, { "0:A01": [post("answer")], "0:A02": also ? [post("also")] : [] }), 2);
			return seen;
		};
		expect(await woken(1, true)).toEqual(["0:A01", "0:A02", "0:A03", "1:A01"]);
		expect(await woken(2, true)).toEqual(["0:A01", "0:A02", "0:A03", "1:A01", "1:A02"]);
		expect(await woken(1, false)).toEqual(["0:A01", "0:A02", "0:A03"]);
		expect(await woken(2, false)).toEqual(["0:A01", "0:A02", "0:A03", "1:A02"]);
	});
});

describe("conformance", () => {
	const script = {
		"0:A01": [post("one"), dm("A03", "psst")],
		"0:A03": [{ tool: "cityNotify", params: { to: "A01", text: "seen" } }, { tool: "readBoard", params: {} }],
		// A direct message that waits in a mailbox when the run is cut after two ticks.
		"1:A03": [post("two"), { tool: "cityPost", params: { text: "city" } }, dm("A01", "back")],
		"2:A01": [{ tool: "readBoard", params: {} }, post("three")],
	};
	const run = (options: Parameters<typeof play>[1] = {}) => play(game(), { drivers: { resident: driver([], script) }, ...options });

	it("is deterministic and survives a snapshot round trip at every tick", async () => {
		const straight = await run();
		expect(payloads(straight.events, "board_post")).toHaveLength(4);
		expect(payloads(straight.events, "dm_delivered")).toEqual([{ number: 2, from: "A01", to: "A03" }, { number: 5, from: "A03", to: "A01" }]);
		// The notice of the script and one per delivered message.
		expect(payloads(straight.events, "notice")).toHaveLength(3);
		expect((await run()).events).toEqual(straight.events);
		for (const cut of [1, 2, 3]) {
			const first = await run({ ticks: cut });
			const resume = { snapshot: structuredClone(first.kernel.snapshot()), log: structuredClone([...first.events]) };
			// Loading a slice and saving it again gives the slice: the board, the cursors, the mailboxes, the records, the waiting notices, the seen marks.
			expect(testKernel(game(), { resume }).kernel.snapshot()).toEqual(first.kernel.snapshot());
			const rest = await run({ resume });
			expect(rest.events).toEqual(straight.events);
			expect(rest.kernel.snapshot()).toEqual(straight.kernel.snapshot());
		}
	});
});
