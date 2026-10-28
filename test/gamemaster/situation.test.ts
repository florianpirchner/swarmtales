/** The game master's situation stays bounded at scale (v08, spec section 3). */
import { describe, expect, it } from "vitest";
import type { RecordedEvent } from "../../src/engine/events.ts";
import { SecretGuard } from "../../src/gamemaster/secrets.ts";
import { describeSituation, MAX_RECENT_LINES } from "../../src/gamemaster/situation.ts";
import { createFixture } from "../helpers/fixture.ts";

describe("the game master's situation", () => {
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
});
