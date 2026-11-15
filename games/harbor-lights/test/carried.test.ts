// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The byte-identity list of the game (M4 specification 2.2, rules 5, 8 and 9): the sha256 of the twenty-four
 * briefings (four seats, three arms, soft and hard strikes) and of the retro question, generated on the old platform
 * (`harborLightsEntry({ brain, strikes }).briefing(seat, host)` with four residents, at `v0-final`), the tool lists a
 * resident is shown, the model block of the old entry, and the params behind every old variant name.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { briefings, SEATS } from "../briefing.ts";
import { harborLightsGame, SIGNAL_QUESTION } from "../game.ts";
import { arm, VARIANTS } from "./support.ts";

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");
const hashes = (...values: readonly string[]): Readonly<Record<string, string>> => Object.fromEntries(SEATS.map((seat, index) => [seat, values[index] ?? ""]));

const OLD_BRIEFINGS: readonly (readonly ["crew" | "solo" | "nobrain", boolean, Readonly<Record<string, string>>])[] = [
	["crew", true, hashes("04e8b7fa28124e50faaac372815418c628ca3dc720c3b97f41b425b2ff60d88f", "ca19f96a2b5dd11105b3f840064c5703adbf540bcfa2b363e2afbb547146a36a", "e164ef58616ca6aa9543b63e40226877f689107c008025c5c0349d805450a377", "5b6f033ec4cb1d3734691a2aa1036d19dde1d1e851be729ebe28b04482c1ad42")],
	["crew", false, hashes("1e3065945d9e4e4295c22610d1387776b8acd99455ef46f04312f90c20276b1a", "3d01b85db671dba98964c1c09f1fce9a3d3d36079efe0215c4a9eeee1a63b8ca", "070bf0c489022f402a277e92fb2f9a4ce038e5f8596546e282b081868ca938af", "5d90ced027729d8732e8bf310bece45f8f0caa2e03a7132443a42f93c03995ea")],
	["solo", true, hashes("c5d48b68d3e873d119d2d2f3bfaaf55c1e431cc1894d9d573e57d639eec20a26", "e923a4d75e6ef005c238e159817665e5464823f6527b722002a7934f1c83221c", "37d911d6e3fcb2c4e3d1e11c99f5452979ce1f0795bd65a191b18811259f68c8", "683a461c52aa9cd4250ef374e118e8ab595d3991adf77f46b37f67a554bd5985")],
	["solo", false, hashes("ee285137ca1b00e2c9f8204affbfdb138ba1d49b052c9a2fe928c1bcabd35652", "149a6b927293017f9db5113fe9fb0c910ede982b65c9bbbee255b68aea0e6840", "98fb2df7db2553c96c177ee898d8464a9b823a7bc7010374a36b7963c2f2fed9", "cfce91b9ea0cfa3c8c020f2b21fc8152afa9a65818291b9aec7eecbc95e94263")],
	["nobrain", true, hashes("abc9e0a060ac86600451ac2aa501a1401a7bb36a9e3c2e3892599c95ff75cabf", "0649fe0e81125be6e072588a65a8d0984b8d40e6467d52a430ff42c96ac71691", "cc60038a50652f348f560188b20e4c9df3b93f3a8abbce696dc1da71560a7f53", "67c16a7ecfaf739e4559efc7fae1840694474ef5c39619abf94c1ab86f10bc0b")],
	["nobrain", false, hashes("7dfa13e6d777b4081bac6ecb3a50024788b19b425ac966bf9df43a3300f31370", "59f1e94cdbb3f6d8d28b6b4e7c6846ac49f987957051b9ba8df23d5721228a80", "2f8e7f9931195d4b89f2e6997deab584a29a9e82aece70e120809987804cc642", "4072b761fa1e4d552f30c3cf452b264266401df41871cd7d3ac7ce66b8c8dd80")],
];

/** The old name grammar (`HARBOR_NAME` of the old game file), carried only to pin the params table against it. */
const HARBOR_NAME = /^harbor-lights(-solo|-nobrain)?(-hard-strikes)?(-aid)?(?:-g(\d+))?$/;
function oldParams(name: string): Readonly<Record<string, unknown>> | undefined {
	const match = HARBOR_NAME.exec(name);
	if (match === null) return undefined;
	const [, brain, hard, aid, games] = match;
	return { ...(brain === undefined ? {} : { brain: brain.slice(1) }), ...(aid === undefined ? {} : { aid: true }), ...(games === undefined ? {} : { games: Number(games) }), ...(hard === undefined ? {} : { strikes: "hard" }) };
}

describe("carried byte for byte", () => {
	it.each(OLD_BRIEFINGS)("has the briefings of the old platform: %s, soft strikes %s", (brain, soft, old) => {
		const strikes = soft ? "soft" : "hard";
		const texts = harborLightsGame({ brain, strikes }).briefing;
		expect(Object.entries(typeof texts === "object" ? texts : {}).map(([seat, text]) => [seat, sha256(text)])).toEqual(Object.entries(old));
		expect(briefings(brain, soft, 6).A01).toContain("6 residents in all");
	});

	it("shows a resident the tools of the old game, in its order, and keeps the old model block and retro question", () => {
		const shown = (brain: "crew" | "solo" | "nobrain") => [harborLightsGame({ brain }).grants?.resident, harborLightsGame({ brain }).locked];
		expect(shown("crew")).toEqual([["viewTowers", "giveSignal", "playSlot", "discardSlot", "postTeam", "readTeam", "readBrain", "writeBrain"], ["writeBrain"]]);
		expect(shown("solo")).toEqual([["viewTowers", "giveSignal", "playSlot", "discardSlot", "readBrain", "writeBrain"], ["writeBrain"]]);
		expect(shown("nobrain")).toEqual([["viewTowers", "giveSignal", "playSlot", "discardSlot"], []]);
		// The old entry set no output cap: the default of 4000 stands.
		expect(harborLightsGame().model).toBe("anthropic/haiku");
		expect(sha256(SIGNAL_QUESTION)).toBe("472d5080970458f4ff5c6c6529a5fd66a4d973afbfc20acbb51a3e752b0f7c83");
		// The old hook numbers of the turn lines: the brain (300), the hint towers (350), the team chat (400).
		expect(harborLightsGame().scheduler?.options).toMatchObject({ inputs: [{ kind: "context-reset" }, { source: "strategy-brain" }, { source: "hint-towers" }] });
	});

	it("gives every old variant name by its params, and the old registry default by the default params", () => {
		for (const [name, params] of Object.entries(VARIANTS)) expect(oldParams(name), name).toEqual(params);
		expect(oldParams("harbor-lights-soft-strikes")).toBeUndefined();
		for (const params of Object.values(VARIANTS)) expect(arm(params).id).toBe("harbor-lights");
		expect(arm()).toMatchObject({ seed: 31, residents: [...SEATS], end: { ticks: 3 * 33 + 7 }, limits: { maxCallsPerTick: 12 }, win: { fact: "hint-towers.scores" } });
		expect(arm({ games: 1 }).end).toEqual({ ticks: 40 });
	});
});
