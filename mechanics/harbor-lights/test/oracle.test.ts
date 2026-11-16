// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The mechanic against the old platform, without a scheduler: the calls of two oracle files of one game (no brain,
 * with and without the decision aid) are made in their order, and every reply, every refusal and every event of the
 * towers and of the card table must be the recorded one. The game issue compares the whole timeline with its turns.
 */
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cardTable } from "@swarmtales/mechanic-card-table";
import { defineGame } from "@swarmtales/sdk";
import { readOracle, testKernel } from "@swarmtales/testkit";
import { hintTowers } from "../src/index.ts";

/** The id this platform renamed (M6-06), from the id the oracle files hold to the id here. */
const RENAMED = { "hint-towers": "harbor-lights" } as const;
/** A source as this platform names it, from the source an oracle file holds. */
const renamedId = (id: string): string => Object.entries(RENAMED).find(([old]) => old === id)?.[1] ?? id;
const ORACLES = join(import.meta.dirname, "..", "..", "..", "oracles", "harbor-lights");
const SEATS = ["A01", "A02", "A03", "A04"];
const SUITS = ["Amber", "Cobalt", "Moss", "Rose", "Violet"].map((name) => ({ name, ranks: 7 }));

async function replayed(file: string, aid: boolean): Promise<{ readonly calls: number; readonly events: number }> {
	const oracle = readOracle(join(ORACLES, file));
	const game = defineGame({
		id: "hint-towers-oracle",
		seed: oracle.seed,
		residents: SEATS,
		mechanics: [cardTable({ suits: SUITS, seats: SEATS }), hintTowers({ games: 1, handSize: 4, signals: 6, strikes: 2, strikePenalty: 3, maxIdleMinutes: 2, maxConsecutiveForfeits: 24, quietTools: [], ...(aid ? { playableOdds: true } : {}) })],
		end: { ticks: 40 },
	});
	const test = testKernel(game);
	let calls = 0;
	for (const entry of oracle.timeline) {
		if (entry.k !== "call") continue;
		calls += 1;
		const outcome = await test.call(entry.actor.replace(/^resident:/, ""), entry.tool, entry.params);
		const recorded = entry.ok ? { ok: true, reply: entry.reply } : { ok: false, code: entry.code, detail: entry.detail };
		expect(outcome, `call ${String(calls)} (${entry.tool})`).toEqual(recorded);
	}
	const recorded = oracle.timeline.flatMap((entry) => (entry.k === "event" && entry.source !== "core" ? [{ source: renamedId(entry.source), type: entry.type, payload: entry.payload, audience: entry.audience }] : []));
	const written = test.kernel.log.all().flatMap((event) => (/\/(harbor-lights|card-table)$/.test(event.source) ? [{ source: event.source.split("/").at(-1), type: event.type, payload: event.payload, audience: event.audience }] : []));
	expect(written).toEqual(recorded);
	expect(test.kernel.fact("harbor-lights.scores")).toHaveLength(1);
	return { calls, events: written.length };
}

describe("the old platform's recordings", () => {
	it("answers every call of a whole game as recorded and writes the recorded events", async () => {
		expect(await replayed("harbor-lights-nobrain-g1-s103.json", false)).toEqual({ calls: 51, events: 75 });
	});

	it("shows the decision aid as recorded", async () => {
		expect(await replayed("harbor-lights-nobrain-aid-g1-s103.json", true)).toEqual({ calls: 51, events: 75 });
	});
});
