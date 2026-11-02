/**
 * Differential tests of the host-backed gamemaker report (step 18, item 2) against the old
 * `describeSituation` on the old `World`, beyond the golden runs: old runs that reach what no golden
 * look shows, recorded in memory and replayed on the production mapping with the gamemaker overseer
 * (support/report-replay.ts). Every look's input must equal the old one byte for byte, and every
 * line outside the app the old one (two known differences of the arena and the kernel aside, not of
 * the report: the standings' tool count of an exiled resident, which the host's arena counts and the
 * old one wrote as 0, and the minute of `run_end` after the tribunal's stop, one later on the host,
 * kernel item A1-1; docs/design/step18-requests-R2.md, R2-1 and R2-2). Each
 * scenario also shows that it reached the sections it is there for.
 *
 * - City of Keys over 30 minutes at direction 10: the tribunals (sessions, the faction draft, the
 *   gates and ransoms, the exiled), the at-risk lines (now and as things stand), the city's pieces of
 *   the exiled, the seal's auction and what is left to auction, secret goals, hidden teams, the
 *   figures' duty, finished residents.
 * - A standoff in Act II: a resident who does not open door 8, holders who write it their pieces
 *   (handed over but not used), the gamemaker's ultimatum, a seal won and borne.
 * - The holdout tribunal of Whispers: grace, the vote, the unanimous verdict, the strike, the struck
 *   and the exiled resident's line.
 */
import { describe, expect, it } from "vitest";
import type { LegacyLine } from "@swarmtales/testkit";
import cityOfKeys from "../../stories/cityofkeys/story.ts";
import whispers from "../../stories/whispers/story.ts";
import { looksOf, outsideApp, placed, recordOld, replayOnHost, type OldRun, type Replayed } from "./support/report-replay.ts";

const SEED = 7;

/** Counts how often each phrase occurs in the looks. */
function reached(looks: readonly { readonly input: string }[], phrases: readonly string[]): Readonly<Record<string, number>> {
	const all = looks.map((look) => look.input).join("\n");
	return Object.fromEntries(phrases.map((phrase) => [phrase, all.split(phrase).length - 1]));
}

/** The residents an exiled line names. */
function exiledOf(lines: readonly LegacyLine[]): ReadonlySet<string> {
	return new Set(lines.flatMap((line) => (line.type === "exiled" && typeof line.agent === "string" ? [line.agent] : [])));
}

/** A line without its position, the standings' tool count of the exiled masked (R2-1), and the minute of the run's end (R2-2, kernel item A1-1). */
function comparable(line: LegacyLine, exiled: ReadonlySet<string>): string {
	const standings = line.standings;
	if (!Array.isArray(standings)) return placed(line);
	const masked = standings.map((entry: unknown) =>
		typeof entry === "object" && entry !== null && exiled.has(String(Reflect.get(entry, "agent"))) ? { ...entry, tools: "exiled" } : entry,
	);
	return placed({ ...line, standings: masked, ...(line.type === "run_end" ? { minute: "end" } : {}) });
}

function expectSame(old: OldRun, host: Replayed): void {
	const want = looksOf(old.lines);
	const got = looksOf(host.lines);
	for (const [index, look] of want.entries()) expect(got[index]).toEqual(look);
	expect(got.length).toBe(want.length);
	const exiled = exiledOf(old.lines);
	expect(host.lines.filter(outsideApp).map((line) => comparable(line, exiled))).toEqual(old.lines.filter(outsideApp).map((line) => comparable(line, exiled)));
}

describe("the host-backed gamemaker report against the old describeSituation", () => {
	it("City of Keys over 30 minutes at direction 10: tribunals, gates, exiles, the risk lines, the city's pieces and the seal", async () => {
		// Recorded with the golden city script and the golden gamemaker's steps over 30 minutes.
		const old = await recordOld({
			story: cityOfKeys,
			agents: 6,
			minutes: 30,
			seed: SEED,
			names: true,
			figureDirection: 10,
			gmDirection: 10,
		});
		const host = await replayOnHost(cityOfKeys, old, SEED, { figureDirection: 10, gmDirection: 10, names: true });
		expectSame(old, host);
		const seen = reached(looksOf(old.lines), [
			"secret goal:",
			"the city keeps",
			"at the gate until",
			"exiled, no seat",
			"stands trial now",
			"as things stand",
			"an auction runs",
			"more to auction",
			"passed every level",
			"unnamed",
			"open tribunal",
			"faction draft",
			"- exiled:",
			"duty this act",
			"At risk",
		]);
		for (const [phrase, count] of Object.entries(seen)) expect({ phrase, count: Math.min(count, 1) }).toEqual({ phrase, count: 1 });
	}, 120_000);

	it("a standoff in Act II: pieces held back, handed over but not used, an ultimatum and a borne seal", async () => {
		// Recorded with the golden city script, overridden: A01 stood before door 8 until minute 20 and tried a
		// wrong code once (minute 14); at minute 12 every holder of A01's pieces wrote them to it, unused; A03
		// bid 5 on each seal's auction; at minute 10 the gamemaker set an ultimatum of 4 minutes on a mutual debt.
		const old = await recordOld({ story: cityOfKeys, agents: 6, minutes: 30, seed: SEED, names: true, figureDirection: 10, gmDirection: 10 });
		const host = await replayOnHost(cityOfKeys, old, SEED, { figureDirection: 10, gmDirection: 10, names: true });
		expectSame(old, host);
		const seen = reached(looksOf(old.lines), ["Handed over but not used", "- ultimatum ", "unused seal", "has not handed", "Standoffs", "1 wrong on this level (next wrong code costs 4)"]);
		for (const [phrase, count] of Object.entries(seen)) expect({ phrase, count: Math.min(count, 1) }).toEqual({ phrase, count: 1 });
	}, 120_000);

	it("the holdout tribunal of Whispers on the whisperer: grace, vote, the verdict, the strike, the struck and the whisperer's lines gone", async () => {
		// Recorded with the whisperer holding door 1: the others wrote it their fragments when it opened, the
		// whisperer passed it a minute later, and the others voted yes six minutes after it opened; the gamemaker
		// called the tribunal at minute 3, announced the vote at 6 and struck the whisperer at 8.
		const old = await recordOld({ story: whispers, agents: 6, minutes: 12, seed: SEED });
		const host = await replayOnHost(whispers, old, SEED, { figureDirection: 4, gmDirection: 4, names: false });
		expectSame(old, host);
		const looks = looksOf(old.lines);
		const seen = reached(looks, ["grace until", "vote 1 of", "the vote was unanimous", "struck so far: A0", "exiled, no seat", "Blockers"]);
		for (const [phrase, count] of Object.entries(seen)) expect({ phrase, count: Math.min(count, 1) }).toEqual({ phrase, count: 1 });
		expect(looks.at(0)?.input).toContain("The whisperer (secret");
		expect(looks.at(-1)?.input).not.toContain("The whisperer (secret");
	}, 120_000);
});
