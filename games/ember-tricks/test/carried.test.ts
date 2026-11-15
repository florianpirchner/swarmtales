// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The byte-identity list of the game (M4 specification 2.2, rules 5, 8 and 9): the sha256 of the eight briefings
 * (four seats, with and without notes), generated on the old platform (`emberTricksEntry({ brain }).briefing(seat,
 * host)` with four residents, at `v0-final`), the tool lists a resident is shown, the model block of the old entry,
 * and the params behind every old variant name. The prompt files of the tools are the mechanic's (`trick-play`).
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { briefings, SEATS } from "../briefing.ts";
import { emberTricksGame } from "../game.ts";
import { arm, VARIANTS } from "./support.ts";

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");

const OLD_BRIEFINGS: readonly (readonly [boolean, readonly string[]])[] = [
	[true, ["2accb7b78814528de8e6c92d17d55114aaaf67586a9be76c8198cc1c67139868", "35517030b94f6e6b4e95ef2183dabb082c1754f0ad53492ce270284d9d8a66ef", "11797034ea26ce4eabaf9cbcd505042b508bd91e873ccda5d197784e8907dd39", "a8945b90aae42e8e35ae590a336847e4047ee883c46a69e6edbfd68f6b357b95"]],
	[false, ["29316b89eb45f04616ab45d92f27e1c69d8bd0cd4fb0084bb51a915a0266703c", "63545ce4a2052cd6924258b90dad44af24e21c284c9d0fa85ffa16f620b77652", "3a6d9e0672e97de69b95c24d6764052b53652c2d94240f9a3b2b9a09417106bb", "1c607de824e370d15cf0ffc05da612e4776372108e8167b2155d5c984338269f"]],
];

/** The old name grammar (`EMBER_NAME` of the old `stories/index.ts`), carried only to pin the params table against it. */
const EMBER_NAME = /^ember-tricks(-nobrain)?(-sum|-calib|-mcretro|-mcbid)?(?:-g(\d+))?(?:-r(\d+))?$/;
const LEVERS: Readonly<Record<string, string>> = { "-sum": "bidSum", "-calib": "calibration", "-mcretro": "mcRetro", "-mcbid": "mcBid" };
const outside = (value: string | undefined, most: number): boolean => value !== undefined && (Number(value) < 1 || Number(value) > most);
function oldParams(name: string): Readonly<Record<string, unknown>> | undefined {
	const match = EMBER_NAME.exec(name);
	if (match === null) return undefined;
	const [, nobrain, lever, games, last] = match;
	if (outside(games, 20) || outside(last, 10)) return undefined;
	return { ...(lever === undefined ? {} : { lever: LEVERS[lever] }), ...(games === undefined ? {} : { games: Number(games) }), ...(nobrain === undefined ? {} : { brain: false }), ...(last === undefined ? {} : { rounds: Number(last) }) };
}

describe("carried byte for byte", () => {
	it.each(OLD_BRIEFINGS)("has the briefings of the old platform: notes %s", (brain, old) => {
		const texts = emberTricksGame({ brain }).briefing;
		expect(Object.entries(typeof texts === "object" ? texts : {}).map(([seat, text]) => [seat, sha256(text)])).toEqual(SEATS.map((seat, index) => [seat, old[index]]));
		expect(briefings(brain, 6).A01).toContain("6 residents in all");
	});

	it("shows a resident the tools of the old game, in its order, and keeps the old model block and turn lines", () => {
		const shown = (brain: boolean) => [emberTricksGame({ brain }).grants?.resident, emberTricksGame({ brain }).locked];
		expect(shown(true)).toEqual([["viewTable", "placeBid", "nameTrump", "playCard", "vetoLead", "readBrain", "writeBrain"], ["writeBrain"]]);
		expect(shown(false)).toEqual([["viewTable", "placeBid", "nameTrump", "playCard", "vetoLead"], []]);
		// The old entry set no output cap: the default of 4000 stands.
		expect(emberTricksGame().model).toBe("anthropic/haiku");
		// The old hook numbers of the turn lines: the brain (300), trick play (350).
		expect(emberTricksGame().scheduler?.options).toEqual({ passes: 8, activation: "onNews", inputs: [{ kind: "context-reset" }, { source: "strategy-brain" }, { source: "trick-play" }] });
	});

	it("gives every old variant name by its params, and the old registry default by the default params", () => {
		for (const [name, params] of Object.entries(VARIANTS)) expect(oldParams(name), name).toEqual(params);
		for (const name of ["ember-tricks-sum-calib", "ember-tricks-r11", "ember-tricks-g0"]) expect(oldParams(name), name).toBeUndefined();
		for (const params of Object.values(VARIANTS)) expect(arm(params).id).toBe("ember-tricks");
		expect(arm()).toMatchObject({ seed: 23, residents: [...SEATS], end: { ticks: 2 * 54 + 6 }, limits: { maxCallsPerTick: 8 }, win: { fact: "trick-play.totals" } });
		expect(arm({ games: 4 }).end).toEqual({ ticks: 222 });
		expect(arm({ games: 1, rounds: 3 }).end).toEqual({ ticks: 30 });
	});
});
