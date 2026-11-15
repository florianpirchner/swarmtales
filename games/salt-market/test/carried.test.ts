// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The byte-identity list of the game (M4 specification 2.2, rules 5, 8 and 9): the sha256 of the briefings with and
 * without a brain, generated on the old platform (`briefing(brain)` of `stories/salt-market/story.ts` for every
 * trader, as the JSON of the record trader to text), the tool names a trader is shown, the model block without an
 * output cap, the run length, and the old variant names against the options that give them (the variant test of the
 * old `test/stories/salt-market.test.ts`). The prompt files are the mechanic's and are pinned by
 * `mechanics/salt-market/test/carried.test.ts`.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { saltMarketGame, type SaltMarketOptions } from "../game.ts";
import { VARIANTS } from "./support.ts";

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");

/** The old parser (`saltMarketEntryByName` of `stories/salt-market/story.ts`), carried as the reference of the names; the options it gave. */
const NAME = /^salt-market(-nobrain)?(-nospoil)?(?:-g(\d+))?(?:-r(\d+))?$/;
const numberOf = (text: string | undefined): number | undefined => (text === undefined ? undefined : Number(text));
const outside = (value: number | undefined, least: number): boolean => value !== undefined && (value < least || value > 20);
function parseSaltMarket(id: string): SaltMarketOptions | undefined {
	const match = NAME.exec(id);
	if (match === null) return undefined;
	const [games, rounds] = [numberOf(match[3]), numberOf(match[4])];
	if (outside(games, 1) || outside(rounds, 2)) return undefined;
	return { ...(match[1] === "-nobrain" ? { brain: false } : {}), ...(match[2] === "-nospoil" ? { spoil: false } : {}), ...(games === undefined ? {} : { games }), ...(rounds === undefined ? {} : { rounds }) };
}

describe("carried byte for byte", () => {
	it.each([
		[true, "7812a7fb369d6dbb48fe300856fc72e8c946ac5007ae8bbecf83838417837119"],
		[false, "e647cb93905501ba96465aa6433d1318eeaa56f02610635ec2636134217e79ae"],
	])("has the briefings of the old platform, brain %s", (brain, hash) => {
		const game = saltMarketGame({ brain });
		expect(Object.keys(game.briefing ?? {})).toEqual(game.residents);
		expect(sha256(JSON.stringify(game.briefing))).toBe(hash);
	});

	it("shows a trader the tools of the old game, in its order, and locks only writeBrain", () => {
		const trading = ["viewMarket", "offer", "accept", "decline", "withdraw", "give", "say"];
		expect(saltMarketGame().grants?.resident).toEqual([...trading, "readBrain", "writeBrain"]);
		expect(sha256(JSON.stringify(saltMarketGame().grants?.resident))).toBe("4ea301a2ffcf1747c78816487e5c84227720856131b1852c65198b663b853dfd");
		expect(saltMarketGame({ brain: false }).grants?.resident).toEqual(trading);
		expect([saltMarketGame().locked, saltMarketGame({ brain: false }).locked]).toEqual([["writeBrain"], []]);
		// The old hook numbers of the turn lines: the brain (300), the market (350).
		expect(saltMarketGame().scheduler).toEqual({ id: "turns", options: { passes: 3, activation: "onNews", inputs: [{ kind: "context-reset" }, { source: "strategy-brain" }, { source: "salt-market" }] } });
		// The market before the brain: the round clock ends a round before the brain opens its retro window.
		expect(saltMarketGame().mechanics.map((use) => use.mechanic.id)).toEqual(["salt-market", "strategy-brain"]);
	});

	it("carries the model block of the old entry without an output cap: the default of 4000 stands", () => {
		for (const options of [{}, { brain: false }, { games: 1 }]) expect(saltMarketGame(options).model).toEqual({ id: "anthropic/claude-haiku-5-5" });
		expect(saltMarketGame().title).toBe("Salt Market");
	});

	it("gives every old variant name of an oracle file and of the old runs index by the options of its row", () => {
		for (const [name, options] of Object.entries(VARIANTS)) expect(saltMarketGame(parseSaltMarket(name)), name).toEqual(saltMarketGame(options));
		expect(saltMarketGame(parseSaltMarket("salt-market-nospoil"))).not.toEqual(saltMarketGame());
		expect([parseSaltMarket("salt-market-nobrain-g3-r8"), parseSaltMarket("salt-market-r1"), parseSaltMarket("salt-market-g21")]).toEqual([{ brain: false, games: 3, rounds: 8 }, undefined, undefined]);
		for (const options of Object.values(VARIANTS)) expect(saltMarketGame(options).id).toBe("salt-market");
	});

	it("has the old registry defaults: four traders, four games of six rounds, seed 41, 42 ticks", () => {
		expect(saltMarketGame()).toMatchObject({ seed: 41, residents: ["A01", "A02", "A03", "A04"], end: { ticks: 42 }, limits: { maxCallsPerTick: 12 }, win: { fact: "salt-market.scores" } });
		expect(saltMarketGame({ games: 1 }).end).toEqual({ ticks: 7 + 4 + 4 });
		expect(saltMarketGame({ games: 3, rounds: 8 }).end).toEqual({ ticks: 27 + 8 + 4 });
		expect(saltMarketGame({ ticks: 9 }).end).toEqual({ ticks: 9 });
	});
});
