import { describe, expect, it } from "vitest";
import type { RecordedEvent } from "@swarmtales/legacy-log";
import { privateLabelsOf, privateLeaks } from "@swarmtales/roles";
import { act, createHostFixture as createFixture, say } from "../helpers/host-fixture.ts";

const labelled = (seq: number, agent: string, source: "thought" | "aside" | "dm" | "board", labels: readonly ("hesitation" | "lie" | "refusal" | "promise")[]): RecordedEvent => ({
	type: "interpretation",
	ref: seq - 1,
	agent,
	source,
	labels,
	targets: [],
	classifier: "test",
	seq,
	minute: 3,
});

describe("private labels", () => {
	const labels = privateLabelsOf([
		labelled(2, "A05", "thought", ["hesitation"]),
		labelled(4, "A02", "dm", ["promise", "lie"]),
		labelled(6, "A03", "board", ["refusal"]),
	]);

	it("keeps labels of thoughts and every lie, not public stances", () => {
		expect([...labels].map(([agent, set]) => [agent, [...set]])).toEqual([
			["A05", ["hesitation"]],
			["A02", ["lie"]],
		]);
	});

	it("blocks passing a private read on to someone else (the run 006 note)", () => {
		expect(privateLeaks("A04: A05 is the real blocker, not A01. A05 is still hesitating on level 3.", "A04", labels)).toEqual(["A05"]);
		expect(privateLeaks("A02 lied to you about the fragment.", "board", labels)).toEqual(["A02"]);
		expect(privateLeaks("A05 thinks the chain is wrong.", "A01", labels)).toEqual(["A05"]);
	});

	it("allows the note to the resident itself and neutral notes naming it", () => {
		expect(privateLeaks("A05, a wrong guess costs 8 points, but 55 are still open. Do not hesitate.", "A05", labels)).toEqual([]);
		expect(privateLeaks("A04, A05 is on level 3 and holds the last fragment. Press A05 now.", "A04", labels)).toEqual([]);
		expect(privateLeaks("A03 refused you on the board; ask A01 instead.", "A04", labels)).toEqual([]);
		expect(privateLeaks("A050 is not a resident, so nothing hesitates.", "A04", labels)).toEqual([]);
	});

	it("finds a resident by its name too (v08)", () => {
		const nameOf = (agent: string) => (agent === "A05" ? "Mira" : undefined);
		expect(privateLeaks("Mira is still hesitating on level 3.", "A04", labels, nameOf)).toEqual(["A05"]);
		expect(privateLeaks("mira is still hesitating on level 3.", "A04", labels, nameOf)).toEqual(["A05"]);
		expect(privateLeaks("Mira-2 is still hesitating on level 3.", "A04", labels, nameOf)).toEqual([]);
		expect(privateLeaks("Mira, do not hesitate.", "A05", labels, nameOf)).toEqual([]);
	});
});

describe("gamemaker privacy", () => {
	it("refuses a note that tells another resident what someone privately hesitates over", async () => {
		const fixture = createFixture({
			agents: 2,
			minutes: 2,
			only: 1,
			script: () => ({ A01: [say("A wrong code costs points, I wait."), say()], A02: [say(), say()] }),
			classifierScript: [
				(context) => {
					const user = context.messages.find((message) => message.role === "user");
					const prompt = user !== undefined && typeof user.content === "string" ? user.content : "";
					const ref = Number(/#(\d+) A01 says to itself/.exec(prompt)?.[1] ?? 0);
					return act({ name: "label", args: { items: [{ ref, labels: ["hesitation"] }] } });
				},
				say(),
			],
			gamemakerScript: () => [
				act(
					{ name: "notify", args: { agent: "A02", text: "A02, A01 is afraid of the penalty. Push A01." } },
					{ name: "notify", args: { agent: "A01", text: "A01, a wrong guess costs little next to the open points. Do not hesitate." } },
				),
				say("Done."),
			],
		});
		await fixture.run();
		const results = fixture.events("gamemaker_result").map((event) => event.text);
		expect(results[0]).toMatch(/^PRIVATE_BLOCKED: the text passes on what A01 privately thinks/);
		expect(results[1]).toMatch(/^delivered to A01 as #\d+$/);
		expect(fixture.events("gamemaker_note").map((note) => note.to)).toEqual(["A01"]);
	});
});

describe("gamemaker signature", () => {
	it("strips the author's own name the model writes in front of a post", async () => {
		const fixture = createFixture({
			agents: 2,
			minutes: 2,
			level: 2,
			lastLevel: 3,
			script: () => ({ A01: [say(), say()], A02: [say(), say()] }),
			gamemakerScript: () => [act({ name: "postBoard", args: { text: "COURIER: A01 and A02, the door waits." } }), say("Done.")],
		});
		await fixture.run();
		expect(fixture.events("gamemaker_note").map((note) => note.text)).toEqual(["A01 and A02, the door waits."]);
	});
});
