/**
 * The holdout tribunal against the old engine as it really ran (carve-round3-T4b.md must-fixes 4 and
 * 5): the old Whispers run (`World`, arena and `Gamemaker` composed by the old CLI, scripted) and
 * the new host with the real channels and its note desk play the same city. The gamemaker's texts
 * are refused by the note desk as the old `#checked` refused them (a leak, a repeat to the
 * tribunal, too long) and stripped of a signature or heading; the replies, the holdout's lines, the
 * notes and the holdout's posts and notices must be equal.
 *
 * Two differences are by design and normalized here:
 * - the old turn order is a seeded shuffle, the new last turn casts the ballots in id order, so the
 *   ballots of one minute are compared as a sorted run (the vote's result lists the voters sorted on
 *   both sides);
 * - the old city also carries DMs, receipts, the popularity vote and the whisperer, so its board
 *   numbers run higher: post and note numbers are dropped, and only the holdout's posts and notices
 *   (the author's, and the city's tribunal texts) are compared, with the same filter on both sides.
 */
import { describe, expect, it } from "vitest";
import { ownedBy, parseLegacyLog } from "@swarmtales/testkit";
import whispers from "../../../stories/whispers/story.ts";
import { FragmentModel } from "./model.ts";
import { newLines, playRealChannels } from "./real-channels.ts";
import { runWorld, WORLD_IDS, WORLD_MINUTES, type GamemakerCall } from "./world-run.ts";

const LONG = (letter: string) => `${letter} `.repeat(201);

/** The gamemaker's calls: each tool once refused for a leak, a repeat and its length, then once accepted with a signature or heading to strip. */
function notesPlan(fragment: string): Readonly<Record<number, readonly GamemakerCall[]>> {
	return {
		3: [
			{ name: "callTribunal", args: { accused: ["A01"], reason: LONG("x") } },
			{ name: "callTribunal", args: { accused: ["A01"], reason: `Ask A01 for ${fragment} at last.` } },
			{ name: "callTribunal", args: { accused: ["A01"], reason: "COURIER: A01 passed door 1 and keeps the city waiting." } },
		],
		// The note desk checks before the tribunal does: a repeat is refused as a repeat, not as a second tribunal.
		4: [{ name: "callTribunal", args: { accused: ["A01"], reason: "A01 passed door 1 and keeps the city waiting!" } }],
		6: [
			{ name: "announceTribunal", args: { text: "A01 passed door 1 and keeps the city waiting." } },
			{ name: "announceTribunal", args: { text: `The city still lacks ${fragment}.` } },
			{ name: "announceTribunal", args: { text: LONG("y") } },
			{ name: "announceTribunal", args: { text: "ECHO minute 6: A01 let the grace pass. Vote 1 is open." } },
		],
		8: [
			{ name: "permaDeath", args: { agent: "A01", reason: LONG("z") } },
			{ name: "permaDeath", args: { agent: "A01", reason: `Gone, and with it ${fragment}.` } },
			{ name: "permaDeath", args: { agent: "A01", reason: "A01 let the grace pass. Vote 1 is open." } },
			{ name: "permaDeath", args: { agent: "A01", reason: "A01 let the grace pass. Vote 2 is open." } },
		],
	};
}

/** Sorts each run of consecutive ballot lines; every other line keeps its place. */
function ballotsSorted(lines: readonly string[]): readonly string[] {
	const out: string[] = [];
	let run: string[] = [];
	const flush = () => {
		out.push(...run.sort());
		run = [];
	};
	for (const line of lines) {
		if (line.includes('"type":"holdout_ballot"')) run.push(line);
		else {
			flush();
			out.push(line);
		}
	}
	flush();
	return out;
}

/** The holdout's posts, notices and notes: by its author, or the city's tribunal and strike texts; without board numbers. */
function holdoutChannels(lines: readonly string[]): readonly string[] {
	return lines
		.filter((line) => line.includes('"author":"COURIER"') || /"text":"(THE TRIBUNAL|A01, the city has struck|A01 is struck from|A01 was struck from)/.test(line))
		.map((line) => line.replace(/"(postSeq|number)":\d+,/g, ""));
}

async function bothRuns() {
	const old = await runWorld({ calls: (world) => notesPlan(world.inspect.fragmentOf("A01", 1)), voteAt: 6 });
	const legacy = parseLegacyLog(old.events.map((event) => JSON.stringify(event)).join("\n"));
	const model = new FragmentModel(WORLD_IDS, new Map([[1, { teams: [[...WORLD_IDS]], fragments: old.fragments }]]));
	const run = await playRealChannels({
		model,
		passwords: old.passwords,
		city: whispers.city,
		minutes: WORLD_MINUTES,
		steps: {
			0: [
				(city) => {
					for (const holder of WORLD_IDS.filter((id) => id !== "A01")) for (const to of WORLD_IDS.filter((id) => id !== holder)) city.give(to, holder, 1);
				},
			],
			1: [(city) => { city.pass("A01"); }],
		},
		ballots: { 6: WORLD_IDS.filter((id) => id !== "A01").map((agent) => ({ agent, yes: true })) },
		calls: notesPlan(old.fragments.A01 ?? ""),
	});
	const oldReplies = old.events.flatMap((event) => (event.type === "gamemaker_result" ? [`gamemaker ${event.tool} ${event.text}`] : []));
	return { old: { holdout: ownedBy(legacy, ["standoff-tribunal"]), channels: ownedBy(legacy, ["channels"]), replies: oldReplies }, now: { ...newLines(run), replies: run.replies } };
}

describe("standoff-tribunal against the old Whispers run (real channels and note desk; stand-in puzzles, progression, exile over the old deal)", () => {
	it("gives the gamemaker the old replies: each refusal of the note desk in the old order, then the old success", async () => {
		const { old, now } = await bothRuns();
		expect(now.replies.filter((line) => line.startsWith("gamemaker "))).toEqual(old.replies);
		for (const code of ["INVALID_TEXT", "LEAK_BLOCKED", "REPEATED"]) for (const tool of ["callTribunal", "announceTribunal", "permaDeath"]) expect(old.replies.some((line) => line.startsWith(`gamemaker ${tool} ${code}`))).toBe(true);
	});

	it("writes the old holdout lines (ballots of one minute sorted: the old turn order is a shuffle)", async () => {
		const { old, now } = await bothRuns();
		expect(ballotsSorted(now.holdout)).toEqual(ballotsSorted(old.holdout));
		expect(old.holdout.some((line) => line.includes('"outcome":"banished"'))).toBe(true);
	});

	it("posts, notifies and notes what the old note desk did, with the signature and the heading stripped", async () => {
		const { old, now } = await bothRuns();
		expect(holdoutChannels(now.channels)).toEqual(holdoutChannels(old.channels));
		// The new side posts nothing else: the filter drops none of its lines.
		expect(holdoutChannels(now.channels).length).toBe(now.channels.length);
		const notes = now.channels.filter((line) => line.includes('"type":"gamemaker_note"'));
		expect(notes.map((line) => /"text":"([^"]*)"/.exec(line)?.[1])).toEqual(["A01 passed door 1 and keeps the city waiting.", "A01 let the grace pass. Vote 1 is open.", "A01 let the grace pass. Vote 2 is open."]);
	});
});
