// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The seal's tick among the door, the standoff and the door clock (decision A96, issue M5-83): a game that loads
 * `progression`, `standoff` and `seal` together is accepted (before, the `after` lists formed a cycle, SWT-R016),
 * and in the City's load order (`progression` before the seal) one tick runs the old `HOOK_ORDER.minuteStarted`:
 * the door (100), the seal (400), the door clock (700).
 */
import { readFileSync } from "node:fs";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { describe, expect, it } from "vitest";
import { channels } from "@swarmtales/mechanic-channels";
import { exile } from "@swarmtales/mechanic-exile";
import { ledger } from "@swarmtales/mechanic-ledger";
import { LevelPiecesService, progression } from "@swarmtales/mechanic-progression";
import { standoff } from "@swarmtales/mechanic-standoff";
import { defineGame, defineHead, defineMechanic } from "@swarmtales/sdk";
import { testKernel } from "@swarmtales/testkit";
import { seal, SealOptions } from "../src/index.ts";

const story = Parse(
	Type.Object({ seal: SealOptions }),
	JSON.parse(readFileSync(new URL("../../../oracles/cityofkeys/setup/cityofkeys.story.json", import.meta.url), "utf8")),
);

const piecesHead = defineHead({ id: "puzzles", package: "@test/puzzles", summary: "Test: one code for every level.", provides: [LevelPiecesService] });
const pieces = defineMechanic(piecesHead, {
	services: {
		"level-pieces": {
			deal: () => null,
			solutionOf: () => "123456",
			kindOf: () => "additive",
			teamOf: ({ resident }) => ({ members: [resident], leader: resident }),
			taskValues: () => ({ length: "6", overlap: "0", fragment: "", digits: "6", factors: "" }),
			holders: () => [],
		},
	},
});

const RESIDENTS = ["A01", "A02", "A03"] as const;

// The seal's act begins at level 8; its door holds who passes until all have, and door 9 opens on the clock at
// minute 4, the minute the seal's first auction opens (announceAfter 4).
function game() {
	return defineGame({
		id: "seal-order",
		seed: 7,
		residents: [...RESIDENTS],
		mechanics: [
			ledger({ startPoints: 30 }),
			channels(),
			exile(),
			pieces(),
			progression({
				levels: [
					{ number: 8, title: "Door 8", reward: 5, tools: [], task: "Door {level}" },
					{ number: 9, title: "Door 9", reward: 5, tools: [], task: "Door {level}", opensAt: 4 },
				],
				startLevel: 8,
				holdAfter: 8,
			}),
			standoff(),
			seal({ ...story.seal, perResidents: 3 }),
		],
		scheduler: { id: "turns", options: { passes: 1, activation: "always", order: "roster", inputs: [{ kind: "status", join: " · " }] } },
		end: { ticks: 6 },
	});
}

const idle = () => Promise.resolve();
// A notice as its first sentence; any other payload as it is.
const shown = (payload: unknown): unknown => (typeof payload === "object" && payload !== null && "text" in payload && typeof payload.text === "string" ? payload.text.split(".")[0] : payload);

describe("the seal's tick among the door and the door clock", () => {
	it("loads with progression and standoff, and ticks after the door (100) and before the door clock (700)", async () => {
		const test = testKernel(game());
		await test.playTicks(idle, 4);
		// The three pass door 8 before minute 4 and wait at it; minute 4 opens it, then the auction, then door 9's clock.
		for (const resident of RESIDENTS) expect(await test.call(resident, "submitSolution", { level: 8, code: "123456" })).toMatchObject({ ok: true });
		await test.playTicks(idle, 1);
		const minute4 = test.kernel.log.all().filter((event) => event.tick === 4);
		const started = minute4.findIndex((event) => event.type === "tick_started");
		const hooks = minute4.slice(started).filter((event) => ["level_entered", "seal_auction_opened", "notice"].includes(event.type));
		expect(hooks.map((event) => [event.type, shown(event.payload)])).toEqual([
			...RESIDENTS.map((agent) => ["level_entered", { agent, level: 9 }]),
			["seal_auction_opened", { seal: 1, until: 7 }],
			...RESIDENTS.map(() => ["notice", "Door 9 is open now, at minute 4"]),
		]);
	});
});
