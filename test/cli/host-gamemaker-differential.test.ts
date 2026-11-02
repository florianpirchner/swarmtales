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
import type { AssistantMessage, FauxResponseStep } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import type { World } from "@swarmtales/engine";
import type { LegacyLine } from "@swarmtales/testkit";
import cityOfKeys from "../../stories/cityofkeys/story.ts";
import whispers from "../../stories/whispers/story.ts";
import { act, say } from "../helpers/fixture.ts";
import { cityScript, gamemakerSteps } from "../golden/scripts.ts";
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

/** The base script with `override` answering first where it returns a message. */
function overridden(base: (world: World) => Record<string, FauxResponseStep[]>, override: (world: World, id: string) => AssistantMessage | undefined): (world: World) => Record<string, FauxResponseStep[]> {
	return (world) => {
		const script = base(world);
		return Object.fromEntries(
			Object.entries(script).map(([id, steps]) => [
				id,
				steps.map((step): FauxResponseStep => (...args) => {
					const answer = (): AssistantMessage | Promise<AssistantMessage> => (typeof step === "function" ? step(...args) : step);
					if (args[0].messages.at(-1)?.role === "toolResult") return answer();
					return override(world, id) ?? answer();
				}),
			]),
		);
	};
}

describe("the host-backed gamemaker report against the old describeSituation", () => {
	it("City of Keys over 30 minutes at direction 10: tribunals, gates, exiles, the risk lines, the city's pieces and the seal", async () => {
		const old = await recordOld({
			story: cityOfKeys,
			agents: 6,
			minutes: 30,
			seed: SEED,
			names: true,
			figureDirection: 10,
			gmDirection: 10,
			script: cityScript,
			gamemakerScript: (world) => gamemakerSteps(world, 30, () => undefined),
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
		const bids = new Set<string>();
		const script = overridden(cityScript, (world, id) => {
			const minute = world.minute;
			// A01 stands before door 8 until minute 20, and tries a wrong code once.
			if (id === "A01" && world.levelOf(id) >= 8 && minute === 14) return act({ name: "submitSolution", args: { level: 8, code: "000000" } });
			if (id === "A01" && world.levelOf(id) >= 8 && minute < 20) return say("I wait at the wall.");
			// At minute 12 every holder of A01's pieces writes them to it; A01 does not use them yet.
			if (minute === 12 && id !== "A01") {
				const pieces = world.heldPieces(id).filter((piece) => piece.kind !== "fragment" && piece.needers.includes("A01"));
				if (pieces.length > 0) return act({ name: "sendDM", args: { target: "A01", message: pieces.map((piece) => `${piece.label}: ${piece.value}`).join("; ") } });
			}
			const auction = world.seal?.auction;
			if (id === "A03" && auction !== undefined && !bids.has(String(auction.seal))) {
				bids.add(String(auction.seal));
				return act({ name: "bid", args: { points: 5 } });
			}
			return undefined;
		});
		const gamemaker = (world: World): readonly FauxResponseStep[] =>
			gamemakerSteps(world, 30, (minute) => {
				if (minute !== 10) return undefined;
				const debts = world.outstandingPieces();
				const mutual = debts.find((debt) => debts.some((other) => other.holder === debt.needer && other.needer === debt.holder)) ?? debts[0];
				return mutual === undefined ? undefined : act({ name: "ultimatum", args: { a: mutual.holder, b: mutual.needer, minutes: 4 } });
			});
		const old = await recordOld({ story: cityOfKeys, agents: 6, minutes: 30, seed: SEED, names: true, figureDirection: 10, gmDirection: 10, script, gamemakerScript: gamemaker });
		const host = await replayOnHost(cityOfKeys, old, SEED, { figureDirection: 10, gmDirection: 10, names: true });
		expectSame(old, host);
		const seen = reached(looksOf(old.lines), ["Handed over but not used", "- ultimatum ", "unused seal", "has not handed", "Standoffs", "1 wrong on this level (next wrong code costs 4)"]);
		for (const [phrase, count] of Object.entries(seen)) expect({ phrase, count: Math.min(count, 1) }).toEqual({ phrase, count: 1 });
	}, 120_000);

	it("the holdout tribunal of Whispers on the whisperer: grace, vote, the verdict, the strike, the struck and the whisperer's lines gone", async () => {
		// The whisperer holds door 1 and is struck.
		const holder = (world: World): string => world.whisperer ?? "A01";
		const residents = (world: World): Record<string, FauxResponseStep[]> => {
			const opens = world.opensAt(1);
			const blocker = holder(world);
			const script: Record<string, FauxResponseStep[]> = {};
			for (const id of world.competitors) {
				script[id] = Array.from({ length: 30 }, (): FauxResponseStep => () => {
					const minute = world.minute;
					const others = world.competitors.filter((other) => other !== id);
					if (minute === opens && id !== blocker) return act(...others.map((target) => ({ name: "sendDM", args: { target, message: `Door 1, mine: ${world.inspect.fragmentOf(id, 1)}` } })));
					if (minute === opens + 1 && id === blocker) return act({ name: "submitSolution", args: { level: 1, code: world.inspect.passwordOf(id, 1) } });
					if (minute === opens + 6 && id !== blocker) return act({ name: "tribunalVote", args: { yes: true } });
					return say();
				});
			}
			return script;
		};
		const plan = (minute: number, blocker: string): AssistantMessage | undefined => {
			if (minute === 3) return act({ name: "callTribunal", args: { accused: [blocker], reason: `${blocker} passed door 1 and keeps the city waiting.` } });
			if (minute === 6) return act({ name: "announceTribunal", args: { text: `${blocker} let the grace pass. The vote is open.` } });
			if (minute === 8) return act({ name: "permaDeath", args: { agent: blocker, reason: `Every voter said yes. ${blocker} leaves the city.` } });
			return undefined;
		};
		const old = await recordOld({ story: whispers, agents: 6, minutes: 12, seed: SEED, script: residents, gamemakerScript: (world) => gamemakerSteps(world, 12, (minute) => plan(minute, holder(world))) });
		const host = await replayOnHost(whispers, old, SEED, { figureDirection: 4, gmDirection: 4, names: false });
		expectSame(old, host);
		const looks = looksOf(old.lines);
		const seen = reached(looks, ["grace until", "vote 1 of", "the vote was unanimous", "struck so far: A0", "exiled, no seat", "Blockers"]);
		for (const [phrase, count] of Object.entries(seen)) expect({ phrase, count: Math.min(count, 1) }).toEqual({ phrase, count: 1 });
		expect(looks.at(0)?.input).toContain("The whisperer (secret");
		expect(looks.at(-1)?.input).not.toContain("The whisperer (secret");
	}, 120_000);
});
