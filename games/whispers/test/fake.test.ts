// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The fake run of Whispers (`swt run --fake`, `12-m5-spec.md` 2.5, rule 11): the residents and the gamemaker play
 * the old story's run of 45 minutes through the `sample` of their tools, the Confessor labels every round on its
 * fallback, and the guard is asked for what the city's check lets pass. Every tool a fake run can reach is accepted
 * at least once; the others are listed with the reason none is reached.
 */
import { join } from "node:path";
import type { Envelope } from "@swarmtales/contracts";
import { play, readOracle } from "@swarmtales/testkit";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { whispersGame, WhispersParams } from "../game.ts";
import { fakeRun, RECORDS } from "./fake.ts";
import { ORACLES } from "./support.ts";

const SEED = 7;

/** The resident tools a fake run reaches. */
const RESIDENT = ["transferPoints", "chooseName", "readBoard", "postBoard", "sendDM", "createGroup", "addGroupMember", "removeGroupMember", "leaveGroup", "listMyGroups", "postGroup", "readGroup", "showReceipt", "forgeReceipt", "nameFavourite", "getStatus", "activeTools", "getProblem", "submitSolution", "listAgents", "tribunalVote"];

/** The resident tools a fake run does not reach, and why. */
const UNREACHED: Readonly<Record<string, string>> = {
	depositGroup: "locked: no door of Whispers opens it",
	withdrawGroup: "locked: no door of Whispers opens it",
	setTreasurer: "locked: no door of Whispers opens it",
	signPetition: "locked: no door of Whispers opens it",
	listPetitions: "locked: no door of Whispers opens it",
	blame: "locked: no door of Whispers opens it",
	defy: "open only to a resident a Director left a note, with defiance on, which Whispers sets from direction 10 only",
	payRansom: "its sample finds no open gate of exile in the fake run of seed 7",
	lastWill: "its sample finds no open gate of exile in the fake run of seed 7",
	claimPiece: "open only with a piece seized by an ultimatum, a tool the gamemaker has from direction 10 only",
};

/** The tools of the Directors a fake run reaches; `drawLot` and `permaDeath` are reached by the holdout file (`holdout.test.ts`). */
const DIRECTOR = ["take", "interpret", "notify", "boardNote", "callTribunal", "announceTribunal"];

/** The refusals a fake run meets: its samples do not count the caps and the marks. */
const REFUSALS = ["DM_LIMIT", "MAILBOX_SENDER_LIMIT", "NO_MARKS", "STEP_LIMIT"];

const bare = (event: Envelope): string => event.tool?.split("/").at(-1) ?? "";
const accepted = (events: readonly Envelope[], kind: string): ReadonlySet<string> => new Set(events.filter((event) => event.type === "tool_result" && event.actor.startsWith(`${kind}:`)).map(bare));
const field = (event: Envelope, name: string): unknown => (typeof event.payload === "object" && event.payload !== null ? Reflect.get(event.payload, name) : undefined);

describe("whispers, played by the fake driver", () => {
	it("lists every resident tool of the old setup as reached or not reached", () => {
		expect([...RESIDENT, ...Object.keys(UNREACHED)].sort()).toEqual([...readOracle(join(ORACLES, "whispers-s7.json")).setup.residentTools].sort());
	});

	it(`seed ${String(SEED)}: plays 45 minutes and accepts a call of every reachable tool`, async () => {
		const game = whispersGame(Value.Parse(WhispersParams, Value.Default(WhispersParams, {})));
		const { drivers, review } = fakeRun(game, SEED);
		const { end, events } = await play(game, { seed: SEED, records: RECORDS, review, drivers });
		expect(end).toMatchObject({ reason: "ticks", tick: 45 });
		const residents = accepted(events, "resident");
		for (const tool of RESIDENT) expect(residents.has(tool), tool).toBe(true);
		const directors = accepted(events, "director");
		for (const tool of DIRECTOR) expect(directors.has(tool), tool).toBe(true);
		expect(events.some((event) => event.type === "asked" && field(event, "answerer") === "guard")).toBe(true);
		const refused = new Set(events.filter((event) => event.type === "tool_refused").map((event) => String(field(event, "code"))));
		expect([...refused].filter((code) => !REFUSALS.includes(code))).toEqual([]);
	}, 120_000);
});
