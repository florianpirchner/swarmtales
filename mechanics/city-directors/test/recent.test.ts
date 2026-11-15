// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The carried tests of old `test/gamemaker` that apply to the gamemaker's own text (issue M5-35): the redact half of
 * `secrets.test.ts` (the `leaks` half is `puzzles`'), the bounded "Since your last look:" and the judge's whisper of
 * `situation.test.ts` (the weaver's case is not ported, A58), and the Confessor's labels of the old `labelLines`.
 * The events come as the firings of the quiet triggers.
 */
import type { Firing } from "@swarmtales/sdk";
import { describe, expect, it } from "vitest";
import { firingLines, gamemakerOptions, gamemakerSituation, labelLines, REDACTED, SecretGuard } from "../src/index.ts";
import { lookup, oldSetup } from "./support.ts";

describe("gamemaker secret guard", () => {
	const guard = new SecretGuard(["HXG5MD", "C88Q3LYS"]);

	it("redacts fragments, partial assemblies and lowercase spellings", () => {
		expect(guard.redact("my piece is HXG, yours XG5MD")).toBe(`my piece is ${REDACTED}, yours ${REDACTED}`);
		expect(guard.redact("so it is hxg5md")).toBe(`so it is ${REDACTED}`);
		expect(guard.redact("try C88Q3LYSX next")).toBe(`try ${REDACTED} next`);
	});

	it("keeps ordinary words and resident IDs", () => {
		expect(guard.redact("A04 waits on A01 for level 4")).toBe("A04 waits on A01 for level 4");
	});

	it("redacts spelled-out and suffixed fragments", () => {
		expect(guard.redact("it is H-X-G then")).toBe(`it is ${REDACTED} then`);
		expect(guard.redact("my HXGs")).toBe(`my ${REDACTED}`);
	});
});

describe("gamemaker secret guard, factors and codes", () => {
	const guard = new SecretGuard(["HXG5MD"], ["559102", "118273", "040817"]);

	it("redacts factors from four digits on, also split into groups", () => {
		expect(guard.redact("my factor is 559102, yours?")).toBe(`my factor is ${REDACTED}, yours?`);
		expect(guard.redact("half of it: 5591")).toBe(`half of it: ${REDACTED}`);
		expect(guard.redact("send 559 102 now")).toBe(`send ${REDACTED} now`);
		expect(guard.redact("or 11-82-73")).toBe(`or ${REDACTED}`);
		expect(guard.redact("code 0408171")).toBe(`code ${REDACTED}`);
		expect(guard.redact("CF559102 or 1182pts")).toBe(`${REDACTED} or ${REDACTED}`);
		expect(guard.redact("level 8, A04, 15pts")).toBe("level 8, A04, 15pts");
	});

	it("keeps ordinary numbers readable", () => {
		expect(guard.redact("15 points at minute 120 on level 8")).toBe("15 points at minute 120 on level 8");
		expect(guard.redact("I offer 20, 25 or 30 points")).toBe("I offer 20, 25 or 30 points");
		expect(guard.redact("the year 2049")).toBe("the year 2049");
	});
});

const firing = (n: number, event: string, payload: unknown): Firing => ({ n, tick: 1, event, payload, quiet: true });
const none = new SecretGuard([]);

const setup = oldSetup("oracles/whispers/setup/whispers.story.json");
const options = gamemakerOptions({ city: setup.city, agents: 2, survivors: 1, rules: setup.rules, spec: setup.gamemaker }, lookup);
const section = { minute: 0, rules: { penalty: [2], maxAttemptsPerWindow: 2, attemptWindowMinutes: 5, rewards: [{ level: 1, reward: 10 }], survivors: 1, residents: 2 }, ranking: [], alive: [], standing: [] };

// One look at a city with `recent` since the last look (old `describeSituation`).
function situation(recent: readonly string[]): string {
	return gamemakerSituation({ "progression.section": section }, { round: 1, direction: 4, cast: [], tracks: new Map(), recent, labels: [], notes: [], budget: "0 of 3 USD" });
}

describe("the gamemaker's situation", () => {
	it("shows only the latest event lines since its last look", () => {
		const posts = Array.from({ length: 190 }, (_, index) => firing(index + 1, "channels.board_post", { postSeq: index + 1, author: "A01", text: `post ${String(index + 1)}`, kind: "player" }));
		const text = situation(firingLines(posts, none));
		expect(text).toContain("- (40 earlier lines left out)");
		expect(text).not.toContain(`board #40 A01: "post 40"`);
		expect(text).toContain(`board #41 A01: "post 41"`);
		expect(text).toContain("board #190 A01");
	});

	it("tells the gamemaker alone what the judge whispered (two channels)", () => {
		const blame = { caller: "A01", accused: "A02", dm: 4, claim: 9, outcome: "rejected", payer: "A01", penalty: 2, reason: "no denial", post: 12, judge: '"It denies nothing."', whisper: "A02 lied, but A02 is rich." };
		const text = situation(firingLines([firing(1, "receipts.blame", blame)], none));
		expect(text).toContain("A01 blamed A02 for denying DM #4 in message #9: rejected");
		expect(text).toContain('- m1 the judge told you alone: "A02 lied, but A02 is rich."');
	});

	it("shows nothing for a payload that does not fit, an event it does not know, or a label", () => {
		const lines = firingLines([firing(1, "channels.dm_sent", { from: "A01" }), firing(2, "channels.notice", { to: "A01" }), firing(3, "interpretations.interpretation", { agent: "A01" })], none);
		expect(lines).toEqual([]);
		expect(situation(lines)).toContain("Since your last look:\n- nothing happened\n");
	});
});

describe("the Confessor's labels", () => {
	const labelled = (n: number, agent: string, source: string, labels: readonly string[], targets: readonly string[] = []) => firing(n, "interpretations.interpretation", { ref: n, agent, source, labels, targets, classifier: "test" });

	it("lists public labels with their targets first, private reads and every lie apart and naming nobody", () => {
		const firings = [labelled(1, "A05", "thought", ["hesitation"]), labelled(2, "A02", "dm", ["promise", "lie"], ["A01"]), labelled(3, "A03", "board", ["refusal"]), labelled(4, "A02", "dm", ["promise"], ["A01"])];
		expect(labelLines(firings)).toEqual([
			"How residents came across (classifier labels of what they wrote):",
			"- A02: promise about A01 (dm)",
			"- A03: refusal (board)",
			"",
			"Private reads (from each resident's own thoughts; use one only in a note to that same resident, never tell anyone else):",
			"- A02: lie",
			"- A05: hesitates (risk)",
			"",
		]);
		expect(labelLines([labelled(1, "A01", "dm", ["unknown"])])).toEqual([]);
	});

	it("puts them between the events and the notes of the look", () => {
		const text = gamemakerSituation({ "progression.section": section }, { round: 1, direction: 4, cast: [], tracks: new Map(), recent: [], labels: labelLines([labelled(1, "A01", "board", ["thanks"])]), notes: [], budget: options.budgetLine });
		expect(text).toContain("- nothing happened\n\nHow residents came across (classifier labels of what they wrote):\n- A01: thanks (board)\n\nYour earlier notes (newest last):");
	});
});
