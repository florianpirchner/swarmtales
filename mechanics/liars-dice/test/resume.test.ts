// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * A resume through a snapshot file of a table whose seats are out of key order (M6-32): a snapshot file sorts the keys
 * of every object, so the dice and the counts of the running round, and those of the public record, come back in key
 * order. The texts a seat reads ("Dice: ...", "dice per seat ...") and the events must keep the table order.
 */
import { describe, expect, it } from "vitest";
import { checkReplay, checkResumeEveryBoundary } from "@swarmtales/testkit";
import { diceGame, player } from "./support.ts";

const game = diceGame({ games: 1, dice: 2 }, 4, ["A03", "A01", "A04", "A02"]);
const drivers = (): { resident: typeof player } => ({ resident: player });

describe("liar's dice resumed with its seats out of key order", () => {
	it("is the straight run from every sampled boundary, and replays", async () => {
		expect(await checkResumeEveryBoundary(game, drivers)).toEqual([]);
		expect(await checkReplay(game, drivers)).toEqual([]);
	});
});
