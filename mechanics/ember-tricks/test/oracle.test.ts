// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The mechanic against the old platform, without a scheduler: the calls of three oracle files (the first game of
 * each; the brain's calls left out) are made in their order, and every reply, every refusal and every event of trick
 * play and of the card table must be the recorded one, and at every turn the table a seat on turn read in its inputs
 * is what `viewTable` answers it (the bid-aid file shows 32 worths of the reference stream there). The silent file is
 * played with idle seats: the forfeit stream's actions land in the recorded ticks. The game issue compares the whole
 * timeline with its turns and the brain.
 */
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cardTable } from "@swarmtales/mechanic-card-table";
import { defineGame } from "@swarmtales/sdk";
import { idleDriver, play, readOracle, testKernel } from "@swarmtales/testkit";
import { trickPlay } from "../src/index.ts";
import { SEATS } from "./support.ts";

/** The id this platform renamed (M6-06), from the id the oracle files hold to the id here. */
const RENAMED = { "trick-play": "ember-tricks" } as const;
/** A source as this platform names it, from the source an oracle file holds. */
const renamedId = (id: string): string => Object.entries(RENAMED).find(([old]) => old === id)?.[1] ?? id;
const ORACLES = join(import.meta.dirname, "..", "..", "..", "oracles", "ember-tricks");
const RULES: Parameters<typeof trickPlay>[0] = { rounds: [1, 2, 3, 4, 5, 6, 7, 8], trump: "lowestBidderNames", vetoTokens: 1, scoring: { hit: 10, perTrick: 3, miss: "square", missBase: 5 }, maxIdleMinutes: 3, maxConsecutiveForfeits: 24, briefEveryRound: true, bidSum: false };

async function replayed(file: string, options: Parameters<typeof trickPlay>[0]): Promise<{ readonly calls: number; readonly events: number; readonly tables: number }> {
	const oracle = readOracle(join(ORACLES, file));
	const game = defineGame({ id: "trick-play-oracle", seed: oracle.seed, residents: SEATS, mechanics: [cardTable({ seats: SEATS }), trickPlay({ ...RULES, ...options })], end: { ticks: 60 } });
	const test = testKernel(game);
	let calls = 0;
	const tables: [unknown, unknown][] = [];
	for (const entry of oracle.timeline) {
		// The table a seat on turn read in its turn's inputs is what `viewTable` answers it now (the worth at the bid included).
		const table = entry.k === "turn" ? entry.inputs.find((input) => renamedId(input.source) === "ember-tricks" && input.text.startsWith("Game ") && input.text.includes("\nYour hand: ")) : undefined;
		if (entry.k === "turn" && table !== undefined) tables.push([await test.call(entry.resident, "viewTable", {}), { ok: true, reply: table.text }]);
		if (entry.k !== "call" || entry.tool === "readBrain" || entry.tool === "writeBrain") continue;
		calls += 1;
		const outcome = await test.call(entry.actor.replace(/^resident:/, ""), entry.tool, entry.params);
		const recorded = entry.ok ? { ok: true, reply: entry.reply } : { ok: false, code: entry.code, detail: entry.detail };
		expect(outcome, `call ${String(calls)} (${entry.tool})`).toEqual(recorded);
	}
	const recorded = oracle.timeline.flatMap((entry) => (entry.k === "event" && /^(ember-tricks|card-table)$/.test(renamedId(entry.source)) ? [{ source: renamedId(entry.source), type: entry.type, payload: entry.payload, audience: entry.audience }] : []));
	const written = test.kernel.log.all().flatMap((event) => (/\/(ember-tricks|card-table)$/.test(event.source) ? [{ source: event.source.split("/").at(-1), type: event.type, payload: event.payload, audience: event.audience }] : []));
	expect(written).toEqual(recorded);
	const differ = tables.filter(([now, then]) => JSON.stringify(now) !== JSON.stringify(then));
	expect(differ.slice(0, 1)).toEqual([]);
	return { calls, events: written.length, tables: tables.length };
}

describe("the old platform's recordings", () => {
	it("answers every call of a whole match of one game as recorded and writes the recorded events", async () => {
		expect(await replayed("ember-tricks-g1-s31.json", { games: 1, calibration: false, reference: "off" })).toEqual({ calls: 327, events: 251, tables: 188 });
	});

	it("shows the bidder the worth of its hand from the reference stream as recorded", async () => {
		expect(await replayed("ember-tricks-mcbid-g4-s32.json", { games: 4, calibration: true, reference: "bid" })).toEqual({ calls: 319, events: 248, tables: 186 });
	});

	it("forfeits for silent seats from the forfeit stream, in the recorded ticks, until the match is called off", async () => {
		const oracle = readOracle(join(ORACLES, "ember-tricks-s13-silent.json"));
		const game = defineGame({ id: "trick-play-oracle", seed: oracle.seed, residents: SEATS, mechanics: [cardTable({ seats: SEATS }), trickPlay({ ...RULES, games: 2, calibration: false, reference: "off" })], end: { ticks: 114 } });
		const run = await play(game, { drivers: { resident: idleDriver } });
		let tick = 0;
		const recorded = oracle.timeline.flatMap((entry) => {
			if (entry.k === "minute") tick = entry.minute;
			return entry.k === "event" && /^(ember-tricks|card-table)$/.test(renamedId(entry.source)) ? [[tick, entry.type, entry.payload]] : [];
		});
		expect(run.events.filter((event) => /\/(ember-tricks|card-table)$/.test(event.source)).map((event) => [event.tick, event.type, event.payload])).toEqual(recorded);
		expect(recorded).toHaveLength(37);
		expect(run.end).toMatchObject({ reason: "limit", limit: "ember-tricks.match", tick: 72 });
	});

	it("plays the first game of the calibration lever as recorded", async () => {
		expect(await replayed("ember-tricks-calib-g4-s32.json", { games: 4, calibration: true, reference: "off" })).toEqual({ calls: 324, events: 250, tables: 188 });
	});
});
