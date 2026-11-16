// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Sample 3 in process. First, whether the game format lets two residents play on different models: it does not, and
 * the README shows the error. Then the fake run: only the captains play, a resident is shown the posts of its own
 * team only and the captain's notice only as captain; every resident reads the briefing of its role and a line no
 * other resident reads, and carries its role. No model is asked.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveFile } from "@swarmtales/cli/src/run.ts";
import { fakeDriver, play, type Played } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import game from "../game.ts";

const SAMPLE = join(import.meta.dirname, "..");
const SEED = 3;
const fake = { seed: SEED, drivers: (kernel: Parameters<typeof fakeDriver>[0]) => ({ resident: fakeDriver(kernel, SEED) }) };
const TEAM: Readonly<Record<string, string>> = { A01: "X", A02: "X", A03: "O", A04: "O" };
const CAPTAINS = ["A01", "A03"];
type Envelope = Played["events"][number];

const record = (value: unknown): Readonly<Record<string, unknown>> => (typeof value === "object" && value !== null ? Object.fromEntries(Object.entries(value)) : {});
const payloads = (events: readonly Envelope[], type: string): readonly Readonly<Record<string, unknown>>[] => events.filter((event) => event.type === type).map((event) => record(event.payload));

/** Every input a resident was shown when its turn opened, as [resident, source, text]. */
function shown(events: readonly Envelope[]): readonly (readonly [string, string, string])[] {
	return payloads(events, "activation_opened").flatMap((opened) => {
		const resident = String(opened.actor).replace("resident:", "");
		const inputs: readonly unknown[] = Array.isArray(opened.inputs) ? opened.inputs : [];
		return inputs.map((input) => [resident, String(record(input).source), String(record(input).text)] as const);
	});
}

describe("sample 3: roles and private texts", () => {
	it("first test: the game format has one model for every resident, so a model per resident is refused", async () => {
		const error: unknown = await resolveFile({ file: "test/mixed-models.yaml", seed: undefined }, { cwd: SAMPLE }).catch((thrown: unknown) => thrown);
		const message = String(error).replace(/^SwtError: /, "");
		expect(message).toMatch(/^error SWT-G001: `model` of the game matches none of the forms the format allows\n {2}at model\n/);
		expect(readFileSync(join(SAMPLE, "README.md"), "utf8")).toContain(`\`\`\`text\n${message}\n\`\`\``);
	});

	it("plays the match; only the captains play, and a resident is shown its own team's posts only", async () => {
		const { end, events } = await play(game, fake);
		expect(end).toMatchObject({ reason: "limit", limit: "grid.match" });
		const moves = payloads(events, "move_played");
		expect(moves.length).toBeGreaterThan(4);
		expect(new Set(moves.map((move) => move.by))).toEqual(new Set(CAPTAINS));
		expect(payloads(events, "tool_refused")).toEqual([]);
		const inputs = shown(events);
		const posts = inputs.filter(([, source]) => source === "team-channel");
		expect(posts.length).toBeGreaterThan(0);
		expect(posts.filter(([resident, , text]) => TEAM[/^Team message from (A\d\d):/.exec(text)?.[1] ?? ""] !== TEAM[resident])).toEqual([]);
		const proposals = inputs.filter(([, source]) => source === "consensus").map(([resident, , text]) => [resident, /^(A\d\d) proposes/.exec(text)?.[1]] as const);
		expect(proposals.filter(([, by]) => by !== undefined).length).toBeGreaterThan(0);
		expect(proposals.filter(([resident, by]) => by !== undefined && TEAM[by] !== TEAM[resident])).toEqual([]);
		const told = new Set(inputs.filter(([, source, text]) => source === "grid" && text.includes("you are its captain")).map(([resident]) => resident));
		expect(told).toEqual(new Set(CAPTAINS));
	});

	it("every resident reads the text of its role and a line of its own, and carries its role", async () => {
		const { briefings, definition } = (await resolveFile({ file: "game.ts", seed: undefined }, { cwd: SAMPLE })).game;
		const texts = ["A01", "A02", "A03", "A04"].map((id) => briefings[`resident:${id}`] ?? "");
		const [captain, adviser] = [texts[0]?.split("\n")[0], texts[1]?.split("\n")[0]];
		expect(texts.map((text) => text.split("\n")[0])).toEqual([captain, adviser, captain, adviser]);
		const own = texts.map((text) => text.split("\n")[1] ?? "");
		expect(own.every((line) => line.length > 0)).toBe(true);
		expect(own.map((line) => texts.filter((text) => text.includes(line)).length)).toEqual([1, 1, 1, 1]);
		expect(definition.actors.map((actor) => [actor.id, actor.shared.role])).toEqual([
			["resident:A01", "captain"],
			["resident:A02", "adviser"],
			["resident:A03", "captain"],
			["resident:A04", "adviser"],
		]);
	});
});
