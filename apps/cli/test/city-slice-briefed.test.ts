// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The variant `briefed` of the city slice through the command line (issue M3-33): the command of a live smoke, with
 * `--fake` in the place of the models. `swt run games/city-slice/family.ts --set briefed=true` with the committed
 * hand file writes a run folder that verifies and replays; its manifest names the param, its texts hold the briefing
 * of every resident, and the system prompt a model resident is sent holds it too. Seed 3 ends the fake session in a
 * verdict (A04), so the amendment of the hand file lands.
 */
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { jsonHash } from "@swarmtales/chain";
import { RunManifestSchema } from "@swarmtales/contracts";
import { DIRECTOR_RECORDS } from "@swarmtales/engine";
import { systemPrompt } from "@swarmtales/models";
import { createPromptLookup } from "@swarmtales/prompts";
import { isGameFamily } from "@swarmtales/sdk";
import { replay } from "@swarmtales/testkit";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadGame } from "../src/load-game.ts";
import { RUN_RECORDS } from "../src/records.ts";
import { cli, eventsOf, type Printed, type StoredEnvelope } from "./support.ts";

const FAMILY = fileURLToPath(new URL("../../../games/city-slice/family.ts", import.meta.url));
const HAND = fileURLToPath(new URL("../../../games/city-slice/hands/amend.jsonl", import.meta.url));
const RESIDENTS = ["A01", "A02", "A03", "A04", "A05", "A06"];
const RUN = "briefed/city-slice-001";
const Texts = Type.Record(Type.String({ description: "A key" }), Type.String({ description: "A text" }), { description: "texts.json" });

let cwd = "";
let swt: (...args: readonly string[]) => Promise<Printed> = () => Promise.reject(new Error("before all"));
let run: Printed = { code: -1, out: [], err: "", issue: undefined };
beforeAll(async () => {
	cwd = mkdtempSync(join(tmpdir(), "swt-briefed-"));
	swt = cli(cwd);
	run = await swt("run", FAMILY, "--set", "briefed=true", "--fake", "--seed", "3", "--out", "briefed", "--snapshot-at", "6", "--hand", HAND);
});
afterAll(() => {
	rmSync(cwd, { recursive: true, force: true });
});

const told = (events: readonly StoredEnvelope[], ...types: readonly string[]): readonly unknown[] => events.filter((event) => types.includes(event.type)).map((event) => [event.tick, event.type, event.payload]);

describe("the briefed city slice through the command line", () => {
	it("plays to its end with the hand file: the session is announced, the verdict is amended and carried out, the folder verifies", async () => {
		expect([run.code, run.err, run.out[1]]).toEqual([0, "", "city-slice seed 3: ended after 12 ticks (tick limit)"]);
		expect(readdirSync(join(cwd, RUN, "snapshots"))).toEqual(["t6.json", "t7.json"]);
		expect(await swt("log", "verify", RUN)).toMatchObject({ code: 0, out: [expect.stringMatching(/^ok, \d+ lines, head [0-9a-f]{64}$/)] });
		const events = eventsOf(join(cwd, RUN));
		const noticed = events.filter((event) => event.type === "activation_opened" && JSON.stringify(event.payload).includes("[CITY] The court is in session since tick 4"));
		expect(noticed.map((event) => [event.tick, event.actor]).sort()).toEqual(RESIDENTS.map((id) => [4, `resident:${id}`]));
		expect(told(events, "decision_proposed", "decision_amended", "decision_settled", "exiled")).toMatchObject([
			[6, "decision_proposed", { decision: "D1", proposal: { exiled: "A04" }, deadline: 8 }],
			[8, "decision_amended", { by: "human", proposal: { exiled: "A02" } }],
			[8, "decision_settled", { changed: true, proposal: { exiled: "A02" } }],
			[8, "exiled", { agent: "A02", by: "court" }],
		]);
	});

	it("records the param and the briefing of every resident; the system prompt of a model resident holds the briefing", () => {
		const manifest = Parse(RunManifestSchema, JSON.parse(readFileSync(join(cwd, RUN, "manifest.json"), "utf8")));
		const texts = Parse(Texts, JSON.parse(readFileSync(join(cwd, RUN, "texts.json"), "utf8")));
		expect([manifest.game.params, manifest.human]).toEqual([{ briefed: true }, true]);
		const briefing = texts["briefing/resident:A01"] ?? "";
		expect(briefing).toContain("The court holds one session.");
		for (const id of RESIDENTS) {
			expect(texts[`briefing/resident:${id}`]).toBe(briefing);
			expect(manifest.actors.find((actor) => actor.id === `resident:${id}`)?.textHashes.briefing).toBe(jsonHash(briefing));
			expect(systemPrompt({ id, passes: 1, briefing }, createPromptLookup())).toContain(`\n${briefing}\n`);
		}
	});

	it("replays from the family with the param of the manifest, and not as the game without the briefing", async () => {
		const { game } = await loadGame(FAMILY, cwd);
		if (!isGameFamily(game)) throw new RangeError("family.ts exports the family of the city slice");
		const log = eventsOf(join(cwd, RUN));
		const again = await replay({ game: game.build({ briefed: true }), log, records: [DIRECTOR_RECORDS, RUN_RECORDS] });
		expect([again.firstDifference, again.equal, again.log.length]).toEqual([undefined, true, log.length]);
		expect((await replay({ game: game.build({ briefed: false }), log, records: [DIRECTOR_RECORDS, RUN_RECORDS] })).equal).toBe(false);
	});

	it("without the param the family plays the game of `game.ts`: the same log as the plain file", async () => {
		const plain = fileURLToPath(new URL("../../../games/city-slice/game.ts", import.meta.url));
		expect([(await swt("run", FAMILY, "--fake", "--seed", "7", "--out", "off")).code, (await swt("run", plain, "--fake", "--seed", "7", "--out", "plain")).code]).toEqual([0, 0]);
		expect(eventsOf(join(cwd, "off/city-slice-001"))).toEqual(eventsOf(join(cwd, "plain/city-slice-001")));
	});
});
