// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Sample 2 in process: the fake run plays the match, every move is the cell the team voted for and each team talks
 * in its own channel; the grant override takes `readTeam` away; `--set games=2` is another game; `game.yaml` is the
 * same game as `game.ts`; and without the vote's provider the game is refused with the error the README shows. No
 * model is asked.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveFile } from "@swarmtales/cli/src/run.ts";
import { fakeDriver, play, type Played } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import family from "../game.ts";

const SAMPLE = join(import.meta.dirname, "..");
const SEED = 2;
const game = family.build({ games: 1 });
type Envelope = Played["events"][number];
const fake = { seed: SEED, drivers: (kernel: Parameters<typeof fakeDriver>[0]) => ({ resident: fakeDriver(kernel, SEED) }) };

const payloads = (events: readonly Envelope[], type: string): readonly Readonly<Record<string, unknown>>[] =>
	events.filter((event) => event.type === type).map((event) => (typeof event.payload === "object" && event.payload !== null ? Object.fromEntries(Object.entries(event.payload)) : {}));
const toolsCalled = (events: readonly Envelope[]): ReadonlySet<string | undefined> => new Set(events.filter((event) => event.type === "tool_result").map((event) => event.tool?.split("/").at(-1)));

/** The hash of the game a file of the sample resolves to, with the overrides of `--set`. */
const hashOf = async (file: string, params?: Readonly<Record<string, unknown>>): Promise<string> =>
	(await resolveFile({ file, seed: undefined, ...(params === undefined ? {} : { params }) }, { cwd: SAMPLE })).game.definition.game.hash;

describe("sample 2: grid, team-channel and consensus", () => {
	it("plays the match; each move is the cell its team agreed on, and each team posts in its own channel", async () => {
		const { end, events } = await play(game, fake);
		expect(end).toMatchObject({ reason: "limit", limit: "grid.match" });
		const moves = payloads(events, "move_played");
		const agreed = payloads(events, "consensus_reached");
		expect(moves.length).toBeGreaterThan(4);
		expect(moves.map((move) => [move.side, move.cell, move.forfeit])).toEqual(agreed.map((vote) => [vote.team, vote.cell, false]));
		const teams: Readonly<Record<string, readonly unknown[]>> = { X: ["A01", "A02"], O: ["A03", "A04"] };
		const posts = payloads(events, "team_post");
		expect(posts.length).toBeGreaterThan(0);
		expect(posts.filter((post) => !(teams[String(post.team)] ?? []).includes(post.from))).toEqual([]);
		expect(payloads(events, "tool_refused")).toEqual([]);
		// The load order follows the services, not the order of the list.
		const reordered = await play({ ...game, mechanics: [...game.mechanics].reverse() }, fake);
		expect(reordered.events.map((event) => [event.type, event.payload])).toEqual(events.map((event) => [event.type, event.payload]));
	});

	it("the grant override takes readTeam from the residents, and the fake run calls every other tool", async () => {
		const { definition } = (await resolveFile({ file: "game.ts", seed: undefined }, { cwd: SAMPLE })).game;
		const granted = (definition.grants.resident ?? []).map((tool) => definition.names[tool]);
		expect(granted).toEqual(["postTeam", "viewBoard", "playMove", "proposeMove", "castVote"]);
		expect([...toolsCalled((await play(game, fake)).events)].sort()).toEqual([...granted].sort());
	});

	it("--set games=2 is another game, and game.yaml is the same game as game.ts", async () => {
		const base = await hashOf("game.ts");
		expect(await hashOf("game.yaml")).toBe(base);
		expect(await hashOf("game.ts", { games: 1 })).toBe(base);
		expect(await hashOf("game.ts", { games: 2 })).not.toBe(base);
		await expect(hashOf("game.yaml", { games: 2 })).rejects.toThrow(/SWT-G041/);
	});

	it("without grid, the provider of the vote's source, the game is refused with the error of the README", async () => {
		const error: unknown = await play({ ...game, mechanics: game.mechanics.slice(1) }, fake).catch((thrown: unknown) => thrown);
		const shown = String(error).replace(/^SwtError: /, "");
		expect(shown).toMatch(/^error SWT-G030: mechanic "consensus" needs the service "consensus-source"/);
		expect(readFileSync(join(SAMPLE, "README.md"), "utf8")).toContain(`\`\`\`text\n${shown}\n\`\`\``);
	});
});
