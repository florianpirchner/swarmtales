/** The gamemaker's situation stays bounded at scale (v08, spec section 3). */
import { describe, expect, it } from "vitest";
import type { RecordedEvent } from "../../src/engine/events.ts";
import { SecretGuard } from "../../src/gamemaker/secrets.ts";
import { describeSituation, fateReason, MAX_RECENT_LINES } from "../../src/gamemaker/situation.ts";
import { createFixture } from "../helpers/fixture.ts";

describe("the gamemaker's situation", () => {
	it("shows only the latest event lines since its last look", () => {
		const fixture = createFixture({ agents: 48, minutes: 2, script: () => ({}) });
		const recent: RecordedEvent[] = Array.from({ length: MAX_RECENT_LINES + 40 }, (_, index) => ({
			type: "board_post",
			seq: index,
			minute: 1,
			author: "A01",
			kind: "player",
			postSeq: index + 1,
			text: `post ${String(index + 1)}`,
		}));
		const text = describeSituation({ world: fixture.world, round: 1, tracks: new Map(), recent, notes: [], guard: new SecretGuard([]), budget: "0 of 3 USD" });
		expect(text).toContain("- (40 earlier lines left out)");
		expect(text).not.toContain(`board #40 A01: "post 40"`);
		expect(text).toContain(`board #41 A01: "post 41"`);
		expect(text).toContain(`board #${String(MAX_RECENT_LINES + 40)} A01`);
	});

	it("tells the gamemaker alone what the judge whispered (two channels)", () => {
		const fixture = createFixture({ agents: 6, minutes: 2, script: () => ({}) });
		const recent: RecordedEvent[] = [
			{ type: "blame", seq: 1, minute: 1, caller: "A01", accused: "A02", dm: 4, claim: 9, outcome: "rejected", payer: "A01", penalty: 2, reason: "no denial", post: 12, judge: '"It denies nothing."', whisper: "A02 lied, but A02 is rich." },
		];
		const text = describeSituation({ world: fixture.world, round: 1, tracks: new Map(), recent, notes: [], guard: new SecretGuard([]), budget: "0 of 3 USD" });
		expect(text).toContain("A01 blamed A02 for denying DM #4 in message #9: rejected");
		expect(text).toContain('- m1 the judge told you alone: "A02 lied, but A02 is rich."');
	});

	it("reads one line per change of the weaver: who, which kind, why in twelve words and after which event, never the text", () => {
		const fixture = createFixture({ agents: 6, minutes: 2, script: () => ({}) });
		const recent: RecordedEvent[] = [
			{ type: "fate_shift", seq: 9, minute: 1, agent: "A03", kind: "hard", text: "You trust no one.", reason: "branded a liar by A01 after the blame over DM four, at the board, in front of all", evidence: [4401, 4398] },
			{ type: "fate_shift", seq: 10, minute: 1, agent: "A04", kind: "soft", text: "You flinch.", reason: "accused by A01", evidence: [] },
		];
		const text = describeSituation({ world: fixture.world, round: 1, tracks: new Map(), recent, notes: [], guard: new SecretGuard([]), budget: "0 of 3 USD" });
		expect(text).toContain("- m1 A03 has changed (hard): branded a liar by A01 after the blame over DM four, at ... (after #4401)");
		expect(text).toContain("- m1 A04 has changed (soft): accused by A01\n");
		expect(text).not.toContain("You trust no one.");
		expect(fateReason("  one two  ")).toBe("one two");
	});
});
