/**
 * The golden gate of the private notices progression sends (docs/design/carve-round2-T3.md, "Gate"):
 * the holder notices (with the price the marks mechanic names), the notices of a door that waits and
 * of a door that opens, in the golden's order and with its words. The replay plays the golden's
 * progression calls only, so the notices other mechanics send do not come; `dropJustified` says so.
 */
import { describe, expect, it } from "vitest";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { dropJustified, goldenNotices } from "@swarmtales/testkit";
import { GOLDEN_NAMES, goldenLog, progressionHost, replay, storyOf } from "./harness.ts";
import type { Notice } from "./standins.ts";

const OURS = /has reached door \d+ and needs |^Level \d+ passed\. The next door opens|^Door \d+ is open now/;
const NoticeLine = Type.Object({ to: Type.String(), text: Type.String() });

describe("progression: the notices against the golden", () => {
	it.each(GOLDEN_NAMES)("%s: holder and door notices equal the golden's, in order", async (name) => {
		const notices: Notice[] = [];
		const host = progressionHost(name, notices);
		await replay(host, name);
		// The holdout tribunal's rule under a task is the standoff tribunal's line (carve-requests-round2-T3.md, 1): left out of the golden's text.
		const rule = storyOf(name).holdout?.texts.rule;
		const withoutRule = (text: string): string => text.split("\n").filter((line) => line !== rule).join("\n");
		const golden = goldenNotices(goldenLog(name)).map((line) => Parse(NoticeLine, JSON.parse(line))).map((line) => ({ ...line, text: withoutRule(line.text) }));
		const { kept } = dropJustified(golden, (line) => !OURS.test(line.text), "notices of the tribunal, the cast, the gamemaker and the channels are other mechanics'");
		const ours = notices.filter((notice) => OURS.test(notice.text));
		expect(ours.length).toBeGreaterThan(0);
		expect(ours.map((notice) => `${notice.to}: ${notice.text}`)).toEqual(kept.map((line) => `${line.to}: ${line.text}`));
	}, 60_000);
});
