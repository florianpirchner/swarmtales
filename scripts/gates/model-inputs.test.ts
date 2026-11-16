// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The proving test of the rename (`13-m6-spec.md` 4.3, issue M6-06): for every renamed game, what its residents' models
 * are given in a fake run at the fake seed of the games list is byte-equal before and after the rename. Per resident
 * the system prompt as `swt run` builds it; per resident and turn the input lines, the tools as shown (name,
 * description, parameter schema), and every outcome of a call, as the model reads it. Each of these is hashed, and
 * the hashes of a game are pinned below as they were recorded on `2e9d969c`, before the apply, and hold after it.
 * The City's game hash stays the one its Act I base snapshot binds, so the base still resumes.
 */
import { createHash } from "node:crypto";
import type { ActorDriver, Activation } from "@swarmtales/contracts";
import { fakeDriver } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { played, resolveFile } from "../../apps/cli/src/index.ts";
import { residentPrompts } from "../../apps/cli/src/resident-prompts.ts";
import { GAMES } from "../../games/index.ts";
import { createKernel } from "../../packages/kernel/src/index.ts";
import { REPO_ROOT } from "../lib/files.ts";

/** The renamed games, by their folder, with the sha256 of their model inputs, recorded before the rename (at the old folder names). */
const PINNED: Readonly<Record<string, string>> = {
	hello: "87d0aabacddcd9e104f710404a99feaa058e878f4f4eaf37f4df11cc4061278d",
	tictactoe: "cd9e64248849d4884d766e2e0cfbee63e4b4781faa593b09cf2c357ad3097506",
	quarry: "b8480dc85a2be5681dc39bd4d34b0e0e5b1f05e2131b512694964319cf886fed",
	"econ-lab": "ad3a68cbfc80562272d2a8f5acc3ba4986943284aeabdb41ded928c90fe5a1fa",
	"harbor-lights": "699fd8eefd170fcef480104eef5e0de260cf01b51d8326668ee051ff920c1079",
	lanterns: "031981f8d78fb77371620a45209667f57f82b16ad3cb5499b687027e5bcbd519",
	morris: "843d0989258f6faa05af92c0474003ec1ecc0255d237f572702d2930798b5fa1",
	"blind-bid": "d816441a023a5511a5608e2dcb15f099f1625c58c98ca0b46fb187150c0cc37f",
	"ember-tricks": "325ed6690e2078ab331e0c3472c0464f7889902dd12daf6deec378a76e1be3a9",
};

/** The game hash of the City's Act I base snapshot, `city/base/city-001/snapshots/t8.json` on `data/runs`. */
const CITY_BASE = "9418a743ae8e7c820ac3c323f0e3c620312af006d84ffed09952244fa0cfa1ad";

const sha = (value: unknown): string => createHash("sha256").update(JSON.stringify(value)).digest("hex");

/** The turn as the model would be sent it, and the outcomes of the calls the fake driver makes in it. */
function recording(activation: Activation, turns: unknown[]): Activation {
	const calls: unknown[] = [];
	turns.push({ actor: activation.actor, tick: activation.tick, inputs: activation.inputs.map((note) => note.text), tools: activation.tools, calls });
	return {
		...activation,
		call: async (as, params) => {
			const outcome = await activation.call(as, params);
			calls.push({ as, params, outcome });
			return outcome;
		},
		record: (source, type, payload) => activation.record(source, type, payload),
	};
}

/**
 * The model inputs of a game's fake run, hashed per resident (the system prompt) and per resident and turn.
 *
 * @param file - The game file from the repository root.
 * @param seed - The fake seed.
 * @returns The hashes, in the order of the run.
 */
async function modelInputs(file: string, seed: number): Promise<readonly string[]> {
	const { game, texts } = await resolveFile({ file, seed }, { cwd: REPO_ROOT });
	const kernel = createKernel(game.definition, { sinks: [] });
	if (game.win !== undefined) kernel.fact(game.win);
	const prompts = residentPrompts(game, texts, kernel);
	const fake = fakeDriver(kernel, game.definition.seed);
	const turns: unknown[] = [];
	const residents = new Set(Object.keys(prompts));
	const driver: ActorDriver = (activation) => (residents.has(activation.actor) ? fake(recording(activation, turns)) : fake(activation));
	await played(kernel, Object.fromEntries(game.definition.actors.map((actor) => [actor.id, driver])));
	return [...Object.entries(prompts).map(sha), ...turns.map(sha)];
}

describe("the rename keeps every model input (13-m6-spec.md 4.3)", () => {
	const entries = GAMES.filter((entry) => Object.hasOwn(PINNED, entry.name));

	it("pins every renamed game of the games list", () => {
		expect(entries.map((entry) => entry.name).sort()).toEqual(Object.keys(PINNED).sort());
	});

	it.each(entries)("$name: the system prompts, input lines, tools and call outcomes of its fake run are the recorded ones", async (entry) => {
		const hashes = await modelInputs(entry.file, entry.fakeSeeds[0] ?? 7);
		expect(hashes.length).toBeGreaterThan(2);
		expect(sha(hashes)).toBe(PINNED[entry.name]);
	});

	// A54: the Act I base resumes only under its game hash; none of the City's mechanics is renamed (4.3).
	it("leaves the City's game hash the one of its Act I base, city/base/city-001 (games/city/RUNS.md)", async () => {
		const { game } = await resolveFile({ file: "games/city/game.ts", seed: 7 }, { cwd: REPO_ROOT });
		expect(game.definition.game.hash).toBe(CITY_BASE);
	});
});
