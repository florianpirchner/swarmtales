/**
 * Differential test of the whispers mechanic against the old World, on the Whispers story itself:
 * the same scripted DMs, ballots and forgeries (every refusal of `forgeReceipt` and `nameFavourite`
 * in the old order) answer alike, write the same whisperer, duty, vote and forgery events and the
 * same notices and board posts of the city, and leave the same whisperer, forgeries and vote in the
 * snapshot. Both sides run at figure direction 10 (the quota is measured). The old side is the
 * composed run of the CLI with scripted competitors, the new one the mechanics on the host with the
 * real channels, ledger, marks, receipts, puzzles and progression (test/mechanics/t1/city.ts). The
 * story grants what the old arena offered (`storyToolNames`, R2-D7); the exile is not loaded here
 * (whispers-exile.test.ts has the real one).
 */
import { describe, expect, it } from "vitest";
import { storyToolNames } from "@swarmtales/engine";
import { defineCoreStory } from "@swarmtales/kernel";
import { legacyTurns } from "@swarmtales/mechanic-shared";
import { whispers } from "@swarmtales/mechanic-whispers";
import { createPromptLookup } from "@swarmtales/prompts";
import type { PlannedCall } from "@swarmtales/testkit";
import whispersStory from "../../../stories/whispers/story.ts";
import { ids, recordOf } from "../t1/support.ts";
import { newOwned, oldNotices, oldOwned, payloadOf, playNew, playOld } from "../t1/differential.ts";
import { realCity } from "../t1/city.ts";
import { options as storyOptions } from "../t1/whispers-options.ts";

const MINUTES = 20;
/** The tools of the mechanics this city loads (channels, ledger, receipts, whispers, progression). */
const PROVIDED: ReadonlySet<string> = new Set(["readBoard", "postBoard", "sendDM", "createGroup", "addGroupMember", "removeGroupMember", "leaveGroup", "listMyGroups", "postGroup", "readGroup", "depositGroup", "withdrawGroup", "setTreasurer", "defy", "transferPoints", "showReceipt", "blame", "forgeReceipt", "nameFavourite", "getStatus", "getProblem", "submitSolution", "listAgents", "activeTools"]);

const dm = (target: string, message: string): PlannedCall => ({ tool: "sendDM", params: { target, message } });
const vote = (agent: string): PlannedCall => ({ tool: "nameFavourite", params: { agent } });
const forge = (to: string, receiptId: string, text: string): PlannedCall => ({ tool: "forgeReceipt", params: { to, receiptId, text } });

/** DMs to the whisperer (A06 with this seed), refused and accepted forgeries, and ballots in every round up to minute 18. */
const plan = (agent: string, minute: number): readonly PlannedCall[] => {
	if (minute === 0 && agent !== "A06") return [dm("A06", `Hello from ${agent}`)];
	if (minute === 1 && agent === "A06") return [dm("A02", "Have you seen how A03 votes?"), dm("A03", "A02 says things about you")];
	if (minute === 2 && agent === "A06") return [forge("A03", "R-0099", "x"), forge("A03", "R-0002", "x"), forge("A03", "R-0001", "   "), forge("A06", "R-0001", "x"), forge("Z99", "R-0001", "x"), forge("A03", "r-1", "A01 wrote that A02 cheats")];
	if ([4, 5, 10, 11, 16, 17].includes(minute) && agent !== "A06") return [vote(agent === "A01" ? "A03" : "A01"), vote("A06")];
	if ([4, 5, 10, 11, 16, 17].includes(minute) && agent === "A06") return [vote("A06"), vote("Z99"), vote("A03")];
	if (minute === 8 && agent === "A06") return [dm("A02", "Door 2, mine: 9"), forge("A04", "R-0002", "A02 asked me to tell you")];
	if (minute === 13 && agent === "A06") return [dm("A04", "A02 and A05 talk a lot"), forge("A05", "R-0001", "A01 never said so")];
	if (minute === 14 && agent === "A02") return [dm("A05", "A04 asked about you")];
	// Three DMs between A01 and A02 and one between A03 and A04 in the last window (since the vote counted at 18): the busiest pair needs its count.
	if (minute === 18 && agent === "A01") return [dm("A02", "Door 3?")];
	if (minute === 19 && agent === "A01") return [dm("A02", "Door 3, yours?")];
	if (minute === 19 && agent === "A02") return [dm("A01", "Door 3: 4")];
	if (minute === 19 && agent === "A03") return [dm("A04", "Hello")];
	return [];
};

describe("the Whispers story against the old World", () => {
	it("answers every vote and forgery alike and writes the same events, notices and posts", async () => {
		const old = await playOld({ story: { ...whispersStory }, agents: 6, minutes: MINUTES, plan, figureDirection: 10, seed: 7 });
		const configured = storyOptions(whispersStory);
		const definition = defineCoreStory({
			id: "whispers-differential",
			seed: 7,
			minutes: MINUTES,
			residents: ids(6),
			mechanics: [...realCity(whispersStory), whispers.with({ ...configured.whispers, direction: { level: 10, defies: false } })],
			grants: { resident: storyToolNames(whispersStory).filter((name) => PROVIDED.has(name)) },
			turns: legacyTurns({ passesPerMinute: 1, blockSize: 1, activation: "always" }),
		});
		const fresh = await playNew({ story: definition, prompts: createPromptLookup() }, plan);
		for (const [at, replies] of old.replies) expect(fresh.replies.get(at), at).toEqual(replies);
		const events = newOwned(fresh, ["whispers"]);
		expect(events.length).toBeGreaterThan(30);
		expect(events).toEqual(oldOwned(old, ["whispers"]));
		const mark = (text: string): boolean => text.startsWith("[for you alone]") || text.startsWith("THE CITY ASKS") || text.includes("shows you a receipt: the city verifies");
		const notice = (line: string): string => {
			const parsed = recordOf(line);
			return `${String(parsed.to)}|${String(parsed.text)}`;
		};
		const wanted = oldNotices(old).map(notice).filter((line) => mark(line.slice(line.indexOf("|") + 1)));
		expect(wanted.length).toBeGreaterThan(12);
		const channelLines = newOwned(fresh, ["channels"]);
		expect(channelLines.filter((line) => line.includes('"type":"notice"')).map(notice).filter((line) => mark(line.slice(line.indexOf("|") + 1)))).toEqual(wanted);
		const posts = (text: string): boolean => text.startsWith("THE CITY ASKS") || text.startsWith("The city has counted the vote");
		const cityPosts = channelLines.map(recordOf).filter((line) => line.type === "board_post" && line.author === "CITY" && posts(String(line.text))).map((line) => String(line.text));
		expect(cityPosts).toEqual(old.lines.filter((line) => line.type === "board_post" && line.author === "CITY" && posts(String(line.text))).map((line) => String(line.text)));
		// The state: the whisperer, the forgeries and the vote.
		const legacy = old.world.snapshot().whispers;
		const saved = fresh.host.snapshot().mechanics.whispers?.data;
		expect(saved).toMatchObject({ whisperer: legacy?.whisperer, round: legacy?.popularity?.round, phase: legacy?.popularity?.state });
		expect(Reflect.get(typeof saved === "object" && saved !== null ? saved : {}, "forgeries")).toEqual((legacy?.forgeries ?? []).map((minute, index) => ({ minute, to: legacy?.forgedTo?.[index] })));
		expect(fresh.events.filter((event) => event.type === "receipt_forged").map((event) => payloadOf(event).forged)).toEqual(old.lines.filter((line) => line.type === "receipt_forged").map((line) => line.forged));
		// The measured orders at the end of the run (old `whisperDutyNow`).
		const status = old.world.whisperDutyNow();
		const now = fresh.host.facts()["whispers.dutyNow"];
		// The whole busiest value (pair and count) of the old status: three DMs between A01 and A02.
		expect(status?.busiest).toEqual({ pair: ["A01", "A02"], dms: 3 });
		expect(Reflect.get(typeof now === "object" && now !== null ? now : {}, "busiest")).toEqual({ pair: [...(status?.busiest?.pair ?? [])], dms: status?.busiest?.dms });
		expect(now).toEqual(status === undefined ? null : { agent: status.agent, since: status.since, nextVote: status.nextVote, whispers: status.whispers, recipients: [...status.recipients], needWhispers: status.needWhispers, needRecipients: status.needRecipients, met: status.met, ...(status.busiest === undefined ? {} : { busiest: { pair: [...status.busiest.pair], dms: status.busiest.dms } }) });
	});
});
