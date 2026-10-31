/**
 * Differential test of the whispers mechanic against the old World, on the Whispers story itself:
 * the same scripted DMs, ballots and forgeries (every refusal of `forgeReceipt` and `nameFavourite`
 * in the old order) answer alike, write the same whisperer, duty, vote and forgery events and the
 * same notices and board posts of the city, and leave the same whisperer, forgeries and vote in the
 * snapshot. Both sides run at figure direction 10 (the quota is measured). The old side is the
 * composed run of the CLI with scripted competitors, the new one the mechanics on the host with
 * stand-ins for channels, exile, puzzles and progression.
 */
import { describe, expect, it } from "vitest";
import { defineCoreStory } from "@swarmtales/kernel";
import { ledger } from "@swarmtales/mechanic-ledger";
import { marks } from "@swarmtales/mechanic-marks";
import { receipts } from "@swarmtales/mechanic-receipts";
import { legacyTurns } from "@swarmtales/mechanic-shared";
import { whispers } from "@swarmtales/mechanic-whispers";
import { createPromptLookup } from "@swarmtales/prompts";
import type { PlannedCall } from "@swarmtales/testkit";
import whispersStory from "../../../stories/whispers/story.ts";
import { channelsStandIn, ids, recordOf } from "../t1/support.ts";
import { courier, newOwned, oldNotices, oldOwned, payloadOf, playNew, playOld } from "../t1/differential.ts";
import { exileStandIn, progressionStandIn, puzzlesStandIn } from "../t1/stand-ins.ts";
import { options as storyOptions } from "../t1/whispers-options.ts";

const MINUTES = 20;
const dm = (target: string, message: string): PlannedCall => ({ tool: "sendDM", params: { target, message } });
const vote = (agent: string): PlannedCall => ({ tool: "nameFavourite", params: { agent } });
const forge = (to: string, receiptId: string, text: string): PlannedCall => ({ tool: "forgeReceipt", params: { to, receiptId, text } });

/** DMs to the whisperer (A06 with this seed), refused and accepted forgeries, and ballots in every round up to minute 18. */
const plan = (agent: string, minute: number): readonly PlannedCall[] => {
	if (minute === 0 && agent !== "A06") return [dm("A06", `Hello from ${agent}`)];
	if (minute === 1 && agent === "A06") return [dm("A02", "Have you seen how A03 votes?"), dm("A03", "A02 says things about you")];
	if (minute === 2 && agent === "A01") return [forge("A02", "R-0001", "hello")];
	if (minute === 2 && agent === "A06") return [forge("A03", "R-0099", "x"), forge("A03", "R-0002", "x"), forge("A03", "R-0001", "   "), forge("A06", "R-0001", "x"), forge("Z99", "R-0001", "x"), forge("A03", "r-1", "A01 wrote that A02 cheats")];
	if ([4, 5, 10, 11, 16, 17].includes(minute) && agent !== "A06") return [vote(agent === "A01" ? "A03" : "A01"), vote("A06")];
	if ([4, 5, 10, 11, 16, 17].includes(minute) && agent === "A06") return [vote("A06"), vote("Z99"), vote("A03")];
	if (minute === 8 && agent === "A06") return [dm("A02", "Door 2, mine: 9"), forge("A04", "R-0002", "A02 asked me to tell you")];
	if (minute === 13 && agent === "A06") return [dm("A04", "A02 and A05 talk a lot"), forge("A05", "R-0001", "A01 never said so")];
	if (minute === 14 && agent === "A02") return [dm("A05", "A04 asked about you")];
	return [];
};

describe("the Whispers story against the old World", () => {
	it("answers every vote and forgery alike and writes the same events, notices and posts", async () => {
		const story = { ...whispersStory };
		const old = await playOld({ story, agents: 6, minutes: MINUTES, plan, figureDirection: 10, seed: 7 });
		const configured = storyOptions(whispersStory);
		const channels = channelsStandIn();
		const definition = defineCoreStory({
			id: "whispers-differential",
			seed: 7,
			minutes: MINUTES,
			residents: ids(6),
			mechanics: [
				ledger.with({ startPoints: 10 }),
				channels.use,
				exileStandIn([]),
				puzzlesStandIn([]),
				progressionStandIn().use,
				marks.with(configured.marks),
				receipts.with({ quoteDms: true }),
				courier(channels.log),
				whispers.with({ ...configured.whispers, direction: { level: 10, defies: false } }),
			],
			grants: { resident: ["sendDM", "nameFavourite", "forgeReceipt", "showReceipt"] },
			turns: legacyTurns({ passesPerMinute: 1, blockSize: 1, activation: "always" }),
		});
		const fresh = await playNew({ story: definition, prompts: createPromptLookup() }, plan);
		// `sendDM` is channels' (a stand-in answers it): only its acknowledgement is compared.
		// A tool that is not enabled: the old runner says "Tool X not found", the host TOOL_LOCKED (the same refusal).
	const ack = (reply: string): string => {
		if (reply.startsWith("false|sent")) return "false|sent";
		if (/^true\|Tool \w+ not found$/.test(reply) || reply.startsWith("true|TOOL_LOCKED")) return "true|locked";
		return reply;
	};
		for (const [at, replies] of old.replies) expect(fresh.replies.get(at)?.map(ack), at).toEqual(replies.map(ack));
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
		expect(channels.log.notices.filter((entry) => mark(entry.text)).map((entry) => `${entry.to}|${entry.text}`)).toEqual(wanted);
		const posts = (text: string): boolean => text.startsWith("THE CITY ASKS") || text.startsWith("The city has counted the vote");
		expect(channels.log.posts.filter((post) => posts(post.text)).map((post) => post.text)).toEqual(old.lines.filter((line) => line.type === "board_post" && line.author === "CITY" && posts(String(line.text))).map((line) => String(line.text)));
		// The state: the whisperer, the forgeries and the vote.
		const legacy = old.world.snapshot().whispers;
		const saved = fresh.host.snapshot().mechanics.whispers?.data;
		expect(saved).toMatchObject({ whisperer: legacy?.whisperer, round: legacy?.popularity?.round, phase: legacy?.popularity?.state });
		expect(Reflect.get(typeof saved === "object" && saved !== null ? saved : {}, "forgeries")).toEqual((legacy?.forgeries ?? []).map((minute, index) => ({ minute, to: legacy?.forgedTo?.[index] })));
		expect(fresh.events.filter((event) => event.type === "receipt_forged").map((event) => payloadOf(event).forged)).toEqual(old.lines.filter((line) => line.type === "receipt_forged").map((line) => line.forged));
		// The measured orders at the end of the run (old `whisperDutyNow`).
		const status = old.world.whisperDutyNow();
		const now = fresh.host.facts()["whispers.dutyNow"];
		expect(now).toEqual(status === undefined ? null : { agent: status.agent, since: status.since, nextVote: status.nextVote, whispers: status.whispers, recipients: [...status.recipients], needWhispers: status.needWhispers, needRecipients: status.needRecipients, met: status.met, ...(status.busiest === undefined ? {} : { busiest: [...status.busiest.pair] }) });
	});
});
