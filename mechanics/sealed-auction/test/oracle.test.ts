// SPDX-License-Identifier: Apache-2.0
/**
 * The mechanic alone against two oracle files whose run the brain does not touch: the silent file (no resident ever
 * acts, so the deals, the lot timer, the resolutions without a bid, the references and the end of the match depend on
 * the seed and the mechanic only) and the control arm without a brain (the scripted bidders of the old test). The
 * mechanic's events must be the file's, payload for payload and in the file's key order. The game's test plays all
 * five files at level 3.
 */
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { ActorDriver } from "@swarmtales/contracts";
import { idleDriver, play, readOracle } from "@swarmtales/testkit";
import { auctionGame, player } from "./support.ts";

const FOLDER = resolve(import.meta.dirname, "../../../oracles/blind-bid");

// The mechanic's events of the file, and those of the mechanic alone on the file's seed and turn order.
async function bothOf(file: string, driver: ActorDriver, order: "roster" | "seeded"): Promise<readonly (readonly string[])[]> {
	const oracle = readOracle(resolve(FOLDER, file));
	const recorded = oracle.timeline.flatMap((entry) => (entry.k === "event" && entry.source === "sealed-auction" ? [JSON.stringify({ type: entry.type, payload: entry.payload })] : []));
	const game = { ...auctionGame(), seed: oracle.seed, scheduler: { id: "turns", options: { passes: 4, activation: "onNews", order } } };
	const run = await play(game, { drivers: { resident: driver } });
	const played = run.events.filter((event) => event.source.endsWith("/sealed-auction")).map((event) => JSON.stringify({ type: event.type, payload: event.payload }));
	return [recorded, played];
}

describe("the oracle files the brain does not touch", () => {
	it("has the mechanic's events of the silent run, in which the lot timer passes for every seat", async () => {
		const [recorded, played] = await bothOf("blind-bid-s13-silent.json", idleDriver, "roster");
		expect(recorded).toHaveLength(49);
		expect(played).toEqual(recorded);
	});

	it("has the mechanic's events of the scripted run without a brain, bid for bid", async () => {
		const [recorded, played] = await bothOf("blind-bid-nobrain-s7.json", player, "seeded");
		expect(recorded).toHaveLength(121);
		expect(played).toEqual(recorded);
	});
});
