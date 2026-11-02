/**
 * The rate window of wrong codes against the old engine (docs/design/carve-round3-T3.md, M15): a
 * wrong code counts for `attemptWindowMinutes` minutes, so exactly that many minutes later it is
 * forgotten (`minute - at < window`, old `World#submit`). The story allows two wrong codes in five
 * minutes.
 */
import { describe, expect, it } from "vitest";
import cityOfKeys from "../../../stories/cityofkeys/story.ts";
import { Twin } from "./twin.ts";

describe("twin: the window of wrong codes", () => {
	it("forgets a wrong code exactly one window later (M15)", async () => {
		const window = cityOfKeys.rules.attemptWindowMinutes;
		const allowed = cityOfKeys.rules.maxAttemptsPerWindow;
		const twin = new Twin({ story: cityOfKeys });
		const wrong = (): Promise<string> => twin.same("A01", "submitSolution", { level: 1, code: "Q".repeat(twin.codeOf("A01", 1).length) });
		const replies: string[] = [];
		await twin.minuteWith();
		// The wrong codes of minute 1 fill the window.
		await twin.minuteWith(async () => {
			for (let attempt = 0; attempt < allowed; attempt++) replies.push(await wrong());
		});
		// One minute before the edge the window still holds them.
		await twin.minutes(window - 2);
		await twin.minuteWith(async () => {
			replies.push(await wrong());
		});
		expect(twin.minute).toBe(window);
		// At the edge (`window` minutes after the first wrong code) they are forgotten: an answer, not the rate limit.
		await twin.minuteWith(async () => {
			replies.push(await wrong());
		});
		expect(twin.minute).toBe(1 + window);
		twin.expectSameLog();
		twin.expectSameState();
		expect(replies.slice(0, allowed).every((text) => text.startsWith("INCORRECT"))).toBe(true);
		expect(replies[allowed]).toMatch(/^RATE_LIMITED/);
		expect(replies[allowed + 1]).toMatch(/^INCORRECT/);
	});
});
