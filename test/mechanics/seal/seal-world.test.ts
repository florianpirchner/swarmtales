/**
 * The seal through the old `World` (carve-round3-T4b.md must-fix 5): the City of Keys composed by the
 * old CLI (`composeRun` through `createFixture`), started at door 8 so Act II begins at minute 0,
 * with scripted residents who bid, tie and break the seal. Nothing on the old side is wired by hand:
 * the `SealHouse` ports of world.ts:636-661, `enabledTools` (world.ts:1459-1461), `sealParts`
 * (turn-input.ts:72-83), the ledger's burns and the tribunal's strike are the World's own.
 *
 * seal-differential.test.ts plays its scenarios on a hand-built old side that copies exactly that
 * wiring (differential.ts `runOld`) and on the new host. This test checks the copy against the
 * World: the same calls, in the World's order, on the hand-built old side and on the new host must
 * give the World's seal events, posts, notices, burns, strikes, replies and every turn's seal status
 * parts. What it does not reach through the World: a resident at the gate during an auction (a gate
 * needs the old tribunal's own nomination and vote, which this short scripted run does not play),
 * which the hand-built side alone covers ("ties and the gate" in seal-differential.test.ts).
 */
import type { RecordedEvent } from "@swarmtales/legacy-log";
import { RecordedEventSchema } from "@swarmtales/chronicle";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import cityOfKeys from "../../../stories/cityofkeys/story.ts";
import { SEAL } from "../../../stories/cityofkeys/characters.ts";
import { replayOld } from "../../helpers/old-engine.ts";
import { runNew, runOld, type Action, type Scenario, type SealRecord } from "./differential.ts";

const IDS = ["A01", "A02", "A03", "A04", "A05", "A06"] as const;
const MINUTES = 12;

/** What the residents call: A01 bids alone, A02 and A03 tie at 7 (fewer points, then the seeded draw); at minute 8 everyone but A06 tries the seal on A06. */
function planned(minute: number, id: string): { readonly name: "bid"; readonly args: { readonly points: number } } | { readonly name: "permaDeath"; readonly args: { readonly target: string } } | undefined {
	if (minute === 4 && id === "A01") return { name: "bid", args: { points: 5 } };
	if (minute === 5 && (id === "A02" || id === "A03")) return { name: "bid", args: { points: 7 } };
	if (minute === 8 && id !== "A06") return { name: "permaDeath", args: { target: "A06" } };
	return undefined;
}

/** The World's run: its log, the points before it and the tribunal's count when the auction opened. */
const WorldRun = Type.Object({ events: Type.Array(RecordedEventSchema), points: Type.Record(Type.String(), Type.Number()), missing: Type.Number() });

/** The World's run, as it was recorded once before the engine went (step 18, item 7b; `test/fixtures/old-engine/`). */
function worldRun() {
	return Promise.resolve(replayOld({ story: cityOfKeys, ids: IDS, minutes: MINUTES, calls: IDS.map((id) => Array.from({ length: MINUTES }, (_unused, minute) => planned(minute, id) ?? null)) }, WorldRun));
}

const template = (text: string): RegExp => new RegExp(`^${text.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\{\w+\}/g, "[\\s\\S]*?")}$`);
const SEAL_TEXTS = Object.values(SEAL.texts).map(template);
const isSealText = (text: string): boolean => SEAL_TEXTS.some((pattern) => pattern.test(text));
const SEAL_PART = /^(black seal auction|you bear a black seal)/;

/** The World's run in the shapes of the hand-built record. */
function worldRecord(events: readonly RecordedEvent[]): SealRecord & { readonly inputs: readonly (readonly [number, string])[] } {
	const record: { readonly [K in keyof SealRecord]: string[] } & { readonly inputs: (readonly [number, string])[] } = { events: [], posts: [], notices: [], burns: [], strikes: [], replies: [], status: [], inputs: [] };
	for (const event of events) {
		if (event.type.startsWith("seal_")) {
			const { type, minute, ...payload } = event;
			record.events.push(JSON.stringify({ type, ...Object.fromEntries(Object.entries(payload).filter(([key]) => key !== "seq")), minute }));
		} else if (event.type === "board_post" && event.author === "CITY" && isSealText(event.text)) record.posts.push(`CITY ${event.text}`);
		else if (event.type === "notice" && event.author === "CITY" && isSealText(event.text)) record.notices.push(`${event.to} CITY ${event.text}`);
		else if (event.type === "ledger_entry" && event.reason.includes("black seal")) record.burns.push(`${event.debit} ${String(event.amount)} ${event.reason}`);
		else if (event.type === "exiled" && event.by === "seal") record.strikes.push(`${event.agent} seal`);
		else if (event.type === "tool_result" && (event.tool === "bid" || event.tool === "permaDeath")) record.replies.push(event.text);
		else if (event.type === "turn_input") {
			const status = event.inputs.find((input) => input.startsWith("[status] ")) ?? "";
			const parts = status.slice("[status] ".length).split(" · ").filter((part) => SEAL_PART.test(part));
			record.status.push(`${String(event.minute)} ${event.agent} ${JSON.stringify(parts)}`);
			record.inputs.push([event.minute, event.agent]);
		}
	}
	return record;
}

/** The World's calls as a hand-built scenario, in the World's turn order. */
function scenarioOf(events: readonly RecordedEvent[], points: Readonly<Record<string, number>>, missing: number): Scenario {
	const steps: Record<number, Action[]> = {};
	for (const event of events) {
		if (event.type !== "tool_call") continue;
		const call = planned(event.minute, event.agent);
		if (call?.name !== event.tool) continue;
		const action: Action = call.name === "bid" ? { kind: "bid", agent: event.agent, points: call.args.points } : { kind: "use", agent: event.agent, target: call.args.target };
		(steps[event.minute] ??= []).push(action);
	}
	const { act: actLevel, announceAfter, bidMinutes, perResidents, spacing } = SEAL;
	return { residents: IDS, points, rule: { act: actLevel, announceAfter, bidMinutes, perResidents, spacing }, minutes: MINUTES, actStartAt: 0, missing, steps };
}

/** The hand-built status at the turns the World played (the World skips a resident once it left). */
function atTurns(record: SealRecord, inputs: readonly (readonly [number, string])[]): readonly string[] {
	return inputs.map(([minute, agent]) => record.status.find((line) => line.startsWith(`${String(minute)} ${agent} `)) ?? `${String(minute)} ${agent} missing`);
}

describe("seal through the old World (createFixture: the old CLI's World, arena and tribunal)", () => {
	it("gives the hand-built old side and the new host the World's seal events, posts, notices, burns, strikes, replies and status parts", async () => {
		const { events, points, missing } = await worldRun();
		const world = worldRecord(events);
		// The run reaches what it is for: an auction, a tie, a win, locked calls and a broken seal.
		expect(world.events.map((line) => /"type":"(\w+)"/.exec(line)?.[1])).toEqual(["seal_auction_opened", "seal_bid", "seal_bid", "seal_bid", "seal_won", "seal_used"]);
		expect(world.replies.filter((reply) => reply.startsWith("TOOL_LOCKED")).length).toBe(4);
		expect(world.status.some((line) => line.includes("(your bid: 7)"))).toBe(true);
		expect(missing).toBeGreaterThan(0);
		expect([world.posts.length, world.notices.length, world.burns.length, world.strikes]).toEqual([3, 3, 3, ["A06 seal"]]);
		const scenario = scenarioOf(events, points, missing);
		for (const side of [runOld(scenario).record, (await runNew(scenario)).record]) {
			expect(side.events).toEqual(world.events);
			expect(side.posts).toEqual(world.posts);
			expect(side.notices).toEqual(world.notices);
			expect(side.burns).toEqual(world.burns);
			expect(side.strikes).toEqual(world.strikes);
			expect(side.replies).toEqual(world.replies);
			expect(atTurns(side, world.inputs)).toEqual(world.status);
		}
	});
});
