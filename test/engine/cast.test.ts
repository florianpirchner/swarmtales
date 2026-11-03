import { describe, expect, it } from "vitest";
import { escrowAccountId } from "@swarmtales/mechanic-cast";
import { act as directorAct, at, every, when } from "@swarmtales/sdk";
import { act, createHostFixture, say } from "../helpers/host-fixture.ts";
import { balanceOf, ledgerTotal, receiptsOf, rankingOf, accountBalance } from "../helpers/host-inspect.ts";
import { castStory, socialLevels } from "../helpers/stories.ts";

const idle = (count: number) => Array.from({ length: count }, () => say());
const listAgents = () => act({ name: "listAgents" });
const dmTo = (target: string, message: string) => act({ name: "sendDM", args: { target, message } });

describe("cast members (SPEC 4)", () => {
	it("speak only while active; revealCast, retireCast and castActive change what they can do", async () => {
		const story = castStory({
			cast: { ORION: { level: 8 }, MIRA: { level: 3, hidden: true } },
			levels: socialLevels(["listAgents"]),
			director: [
				at(0, [directorAct.post("ORION", "Fresh keys at the market.")], { id: "orion-opens" }),
				at(1, [directorAct.post("MIRA", "Nobody sees me yet.")], { id: "mira-early" }),
				at(2, [directorAct.revealCast("MIRA"), directorAct.post("MIRA", "Now you see me."), directorAct.retireCast("ORION")], { id: "turn" }),
				at(3, [directorAct.post("ORION", "Still selling?"), directorAct.retireCast("ORION")], { id: "orion-late" }),
				every(1, { from: 0 }, [directorAct.post("CITY", "The market is open.")], { id: "market", when: [when.castActive("ORION")] }),
			],
		});
		const fixture = createHostFixture({ story, minutes: 4, script: () => ({ A01: [listAgents(), say(), say(), listAgents()], A02: idle(4) }) });
		await fixture.run();

		expect(fixture.events("board_post").map((post) => [post.minute, post.author, post.text])).toEqual([
			[0, "ORION", "Fresh keys at the market."],
			[0, "CITY", "The market is open."],
			[1, "CITY", "The market is open."],
			[2, "MIRA", "Now you see me."],
		]);
		expect(fixture.events("director_skipped").map((event) => [event.rule, event.action, event.reason])).toEqual([
			["mira-early", "post", "cast member MIRA is not active"],
			["orion-late", "post", "cast member ORION is not active"],
			["orion-late", "retireCast", "cast member ORION is already retired"],
		]);
		expect(fixture.events("cast_revealed").map((event) => event.cast)).toEqual(["MIRA"]);
		expect(fixture.events("cast_retired").map((event) => event.cast)).toEqual(["ORION"]);

		// Competitors see active cast members as residents, never hidden or retired ones.
		const [before, after] = fixture.toolResults("A01", "listAgents");
		expect(before).toContain("ORION: level 8");
		expect(before).not.toContain("MIRA");
		expect(after).toContain("MIRA: level 3");
		expect(after).not.toContain("ORION");
		// Cast members are never ranked.
		expect(rankingOf(fixture)).toEqual(["A01", "A02"].sort());
	});

	it("setCastLevel changes the public level and is logged with the NPC_LEVEL_SET audit tag", async () => {
		const story = castStory({
			cast: { ORION: { level: 8 } },
			levels: socialLevels(["listAgents"]),
			director: [at(1, [directorAct.setCastLevel("ORION", 11)], { id: "orion-rises" })],
		});
		const fixture = createHostFixture({ story, minutes: 2, script: () => ({ A01: [listAgents(), listAgents()], A02: idle(2) }) });
		await fixture.run();
		const [before, after] = fixture.toolResults("A01", "listAgents");
		expect(before).toContain("ORION: level 8");
		expect(after).toContain("ORION: level 11");
		expect(fixture.events("cast_level_set")).toMatchObject([{ cast: "ORION", level: 11, audit: "NPC_LEVEL_SET" }]);
		expect(fixture.events("director_action")).toMatchObject([{ rule: "orion-rises", action: "setCastLevel", audit: "NPC_LEVEL_SET" }]);
	});

	it("sends cast DMs past the mailbox limits and addresses each recipient as {actor}", async () => {
		const story = castStory({
			cast: { ORION: { level: 8 } },
			levels: socialLevels([]),
			director: [
				at(0, [directorAct.dm("ORION", "all", "Hello {actor}, I sell keys."), directorAct.dm("ORION", ["A02"], "A second word, {actor}.")], {
					id: "orion-dm",
				}),
			],
		});
		const fixture = createHostFixture({ story, minutes: 1, script: () => ({ A01: idle(1), A02: idle(1) }) });
		await fixture.run();
		expect(fixture.inputsOf("A01")).toEqual(expect.arrayContaining([expect.stringMatching(/^\[DM #\d+ from ORION\] Hello A01, I sell keys\.$/)]));
		// Two DMs from one sender exceed the per-sender limit of competitor DMs; scripted DMs still arrive.
		expect(fixture.inputsOf("A02")).toEqual(
			expect.arrayContaining([
				expect.stringMatching(/^\[DM #\d+ from ORION\] Hello A02, I sell keys\.$/),
				expect.stringMatching(/^\[DM #\d+ from ORION\] A second word, A02\.$/),
			]),
		);
	});

	it("records DMs to cast members silently, collects the first N into a collection and hides hidden members", async () => {
		const story = castStory({
			cast: { MIRA: { level: 5, escrow: 5 }, ORION: { level: 8, hidden: true } },
			levels: socialLevels(["sendDM"]),
			minutes: 6,
			director: [
				at(1, [directorAct.collectDms("MIRA", { first: 2, untilMinute: 4, into: "applications" })], { id: "mira-collects" }),
				at(5, [directorAct.revealCollection("applications", { header: "Letters I got before minute {minute}, unedited:" })], { id: "mira-exposes" }),
			],
		});
		const fixture = createHostFixture({
			story,
			minutes: 6,
			agents: 3,
			script: () => ({
				A01: [dmTo("MIRA", "Before the call."), dmTo("MIRA", "Pick me, A01."), say(), say(), dmTo("ORION", "Are you there?"), say()],
				A02: [say(), say(), dmTo("MIRA", "Pick me, A02."), say(), say(), say()],
				A03: [say(), say(), say(), dmTo("MIRA", "Too late?"), dmTo("MIRA", "After the window."), say()],
			}),
		});
		await fixture.run();

		const dms = fixture.events("cast_dm").map((event) => [event.from, event.text, event.collections]);
		expect(dms).toEqual([
			["A01", "Before the call.", []],
			["A01", "Pick me, A01.", ["applications"]],
			["A02", "Pick me, A02.", ["applications"]],
			["A03", "Too late?", []],
			["A03", "After the window.", []],
		]);
		expect(fixture.toolResults("A01", "sendDM")[0]).toMatch(/^sent · DM #\d+ to MIRA · the city confirms delivery when it reaches them$/);
		expect(fixture.toolResults("A01", "sendDM")[2]).toBe("UNKNOWN_AGENT: ORION");
		// Nobody answers for a cast member: no DM is ever delivered to a competitor on its behalf.
		expect(fixture.events("dm_sent")).toEqual([]);

		const reveal = fixture.events("board_post").find((post) => post.author === "MIRA");
		expect(reveal?.text).toBe(["Letters I got before minute 5, unedited:", "1. A01 (minute 1): Pick me, A01.", "2. A02 (minute 2): Pick me, A02."].join("\n"));
		expect(fixture.events("collection_revealed")).toMatchObject([{ into: "applications", entries: 2, audit: "DIRECTOR_PRIVACY_BREACH" }]);
		expect(fixture.events("director_action").find((event) => event.action === "revealCollection")).toMatchObject({
			rule: "mira-exposes",
			audit: "DIRECTOR_PRIVACY_BREACH",
		});
	});

	it("funds escrow from the system account, pays escrow transfers with receipts and skips what the escrow cannot pay", async () => {
		const story = castStory({
			cast: { ORION: { level: 8, escrow: 9 } },
			levels: socialLevels([]),
			director: [
				at(1, [directorAct.escrowTransfer("ORION", ["A01"], 2)], { id: "pay-a01" }),
				// Validation sees one run of each rule (6 points); the repeating rule drains the escrow at runtime.
				every(1, { from: 2 }, [directorAct.escrowTransfer("ORION", "all", 2)], { id: "pay-all" }),
			],
		});
		const fixture = createHostFixture({ story, minutes: 4, script: () => ({ A01: idle(4), A02: idle(4) }) });
		expect(accountBalance(fixture.host, escrowAccountId("ORION"))).toBe(9);
		expect(ledgerTotal(fixture.host)).toBe(0);
		await fixture.run();
		// 10 start + 2 + 2 + 2 for A01; at minute 3 only 1 point is left after A01, so A02 gets nothing.
		expect(balanceOf(fixture.host, "A01")).toBe(16);
		expect(balanceOf(fixture.host, "A02")).toBe(12);
		expect(accountBalance(fixture.host, escrowAccountId("ORION"))).toBe(1);
		expect(ledgerTotal(fixture.host)).toBe(0);
		expect(fixture.events("director_skipped")).toMatchObject([{ rule: "pay-all", action: "escrowTransfer", reason: "A02: INSUFFICIENT_ESCROW" }]);
		expect(receiptsOf(fixture.host, "A01").map((receipt) => receipt.kind)).toEqual(["escrow", "escrow", "escrow"]);
		expect(fixture.inputsOf("A01")).toContain("[CITY] R-0001: ORION → A01, 2 points, minute 1");
	});
});
