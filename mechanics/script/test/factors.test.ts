// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The action `revealFactor` against the real `puzzles` (issue M5-69, decision A76, erratum J155): the city factor of an
 * additive level through the command `revealFactor` of the service `deal`, on the board or privately, with the old
 * skip reasons of `legacy` `mechanics/script/src/actions.ts` (the refusal's detail, the target's reasons, "already
 * holds it" when it reached nobody new), and replay and resume.
 */
import { describe, expect, it } from "vitest";
import type { Envelope } from "@swarmtales/contracts";
import { channels } from "@swarmtales/mechanic-channels";
import { exile } from "@swarmtales/mechanic-exile";
import { ledger } from "@swarmtales/mechanic-ledger";
import { progression } from "@swarmtales/mechanic-progression";
import { puzzles } from "@swarmtales/mechanic-puzzles";
import { defineGame } from "@swarmtales/sdk";
import { checkReplay, checkResumeEveryBoundary, idleDriver, scriptedDriver, testKernel } from "@swarmtales/testkit";
import { script, type Action, type Rule } from "../src/index.ts";
import { level } from "./support.ts";

type Target = Extract<Action, { kind: "revealFactor" }>["target"];
const reveal = (factorLevel: number, target: Target): Action => ({ kind: "revealFactor", level: factorLevel, target });
const at = (minute: number, id: string, actions: readonly Action[]): Rule => ({ id, trigger: { kind: "at", minute }, when: [], actions: [...actions] });

// Level 1 is a password, level 2 an additive level with one city factor for the board, level 3 one with a city factor per team.
const pieces = () =>
	puzzles({
		levels: [
			{ number: 1, team: { kind: "solo" }, puzzle: { kind: "fragments", length: [6, 10], overlap: 2 } },
			{ number: 2, team: { kind: "random", size: 2 }, puzzle: { kind: "additive", digits: 6, topology: "mutual", cityFactor: "board" } },
			{ number: 3, team: { kind: "random", size: 2 }, puzzle: { kind: "additive", digits: 6, topology: "mutual", cityFactor: "feast", cityFactorPer: "team" } },
		],
	});

const RULES: readonly Rule[] = [
	at(0, "board", [reveal(2, "board"), reveal(1, "board"), reveal(9, "board"), reveal(3, "board")]),
	at(1, "feast", [reveal(3, ["A01", "A09"]), reveal(3, "all"), reveal(3, ["A01"]), reveal(3, ["A02", "A03"]), reveal(3, { onLevel: 3 }), reveal(2, ["A02"])]),
];

const game = () =>
	defineGame({
		id: "script-factors",
		seed: 7,
		residents: ["A01", "A02", "A03", "A04"],
		mechanics: [ledger({ startPoints: 10 }), channels(), exile(), pieces(), progression({ levels: [level(1), level(2), level(3)], survivors: 2 }), script({ rules: [...RULES] })],
		scheduler: { id: "turns", options: { passes: 1, activation: "always", order: "roster" } },
		end: { ticks: 3 },
	});

const OWN = new Set(["director_action", "director_skipped", "board_post", "notice", "factor_revealed"]);
// The factors are dealt from the seed: a digit run reads as `#`.
const item = (event: Envelope): string => `${event.type} ${JSON.stringify(event.payload).replace(/\d{6}/g, "#")}`;
const lines = (events: readonly Envelope[]): readonly string[] => events.filter((event) => OWN.has(event.type)).map((event) => `${String(event.tick)}: ${item(event)}`);

describe("a city factor through deal", () => {
	it("releases it on the board or privately, and skips with the old reasons", async () => {
		const test = testKernel(game());
		await test.playTicks(idleDriver, 2);
		const skip = (rule: string, reason: string) => `director_skipped {"rule":"${rule}","action":"revealFactor","reason":"${reason}"}`;
		const action = (rule: string) => `director_action {"rule":"${rule}","action":"revealFactor"}`;
		const notice = (to: string, factorLevel: number) => `notice {"to":"${to}","author":"CITY","text":"City factor of level ${String(factorLevel)}: #."}`;
		const factor = (factorLevel: number, target: string, agents: readonly string[]) => `factor_revealed {"level":${String(factorLevel)},"target":"${target}","agents":${JSON.stringify(agents)}}`;
		const tick0 = [
			...[action("board"), 'board_post {"postSeq":1,"author":"CITY","text":"City factor of level 2: #.","kind":"city"}', factor(2, "board", [])],
			...[action("board"), skip("board", "level 1 has no factors"), action("board"), skip("board", "level 9 is not played in this run")],
			...[action("board"), skip("board", "every team of level 3 has its own city factor")],
		];
		const tick1 = [
			...[action("feast"), notice("A01", 3), factor(3, "notice", ["A01"]), skip("feast", "unknown competitors A09")],
			...[action("feast"), notice("A02", 3), notice("A03", 3), notice("A04", 3), factor(3, "notice", ["A02", "A03", "A04"])],
			...[action("feast"), skip("feast", "A01 already holds it"), action("feast"), skip("feast", "A02, A03 already hold it")],
			...[action("feast"), skip("feast", "no competitor to target"), action("feast"), notice("A02", 2), factor(2, "notice", ["A02"])],
		];
		expect(lines(test.kernel.log.all())).toEqual([...tick0.map((line) => `0: ${line}`), ...tick1.map((line) => `1: ${line}`)]);
	});

	it("replays and resumes from every boundary", async () => {
		const drivers = () => ({ resident: scriptedDriver(() => []) });
		expect(await checkReplay(game(), drivers)).toEqual([]);
		expect(await checkResumeEveryBoundary(game(), drivers)).toEqual([]);
	});
});
