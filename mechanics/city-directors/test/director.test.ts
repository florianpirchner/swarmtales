// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The gamemaker in a real kernel (`12-m5-spec.md` 4.4): a Director that acts by tool use, woken after a round by the
 * run frame's `round_end` (every round, or every few), reading the facts its head lists. Two stand-in mechanics play
 * the run frame (`arena`) and the progression's fact; a test driver takes the firings as the engine's does and keeps
 * each look's input.
 */
import type { ActorDriver, Kernel } from "@swarmtales/contracts";
import { defineGame, defineHead, defineMechanic, parseTake, RESIDENT_KIND, type DirectorDefinition, type Firing } from "@swarmtales/sdk";
import { idleDriver, play } from "@swarmtales/testkit";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { defineGamemaker, gamemaker, gamemakerOptions, GAMEMAKER_FACTS } from "../src/index.ts";
import { lookup, oldSetup } from "./support.ts";

const Round = Type.Object({ round: Type.Integer({ description: "The tick plus one" }) }, { description: "A round" });

// The run frame's `round_end` after every tick's turns, as `mechanics/arena` writes it.
const frame = defineMechanic(defineHead({ id: "arena", package: "@test/frame", summary: "Ends rounds.", events: { round_end: Round } }), {
	hooks: {
		tickEnded: (ctx) => {
			ctx.emit("round_end", { round: ctx.tick + 1 });
		},
	},
});

const section = (tick: number) => ({
	minute: tick,
	rules: { penalty: [2], maxAttemptsPerWindow: 2, attemptWindowMinutes: 5, rewards: [{ level: 1, reward: 10 }], survivors: 1, residents: 2 },
	ranking: ["A01", "A02"].map((agent, index) => ({ agent, points: 10, rank: index + 1, level: 1, standing: { kind: "alive" }, finished: false, waiting: null, nextPenalty: 2, open: 10 })),
	alive: ["A01", "A02"],
	standing: [],
});

const progression = defineMechanic(defineHead({ id: "progression", package: "@test/progression", summary: "Reports." }), {
	facts: { section: { output: Type.Unknown({ description: "The report's data" }), compute: (view) => section(view.tick) } },
});

const setup = oldSetup("oracles/whispers/setup/whispers.story.json");
const options = gamemakerOptions({ city: setup.city, agents: 2, survivors: 1, rules: setup.rules, spec: setup.gamemaker }, lookup);

// The engine's driver of a Director up to the look: take the firings, build the context, keep the input.
function lookingDriver(director: DirectorDefinition, kernel: Kernel, looks: { tick: number; firings: readonly Firing[]; system: string; input: string }[]): ActorDriver {
	return async (activation) => {
		const taken = await activation.call("take", {});
		const firings = taken.ok ? (parseTake(taken.reply)?.firings ?? []) : [];
		if (firings.length === 0) return;
		const ctx = { name: "gamemaker", options: director.parseOptions(options), tick: activation.tick, firings, facts: Object.fromEntries(director.facts.map((key) => [key, kernel.fact(key)])) };
		looks.push({ tick: activation.tick, firings, system: director.system(ctx), input: director.input(ctx) });
	};
}

async function run(director: DirectorDefinition, ticks: number) {
	const game = defineGame({ id: "look", seed: 3, residents: 2, mechanics: [progression(), frame()], directors: [{ use: director, options }], scheduler: { id: "turns", options: { afterBlocks: ["director"] } }, end: { ticks } });
	const looks: { tick: number; firings: readonly Firing[]; system: string; input: string }[] = [];
	await play(game, { drivers: (kernel) => ({ [RESIDENT_KIND]: idleDriver, "director:gamemaker": lookingDriver(director, kernel, looks) }) });
	return looks;
}

describe("the gamemaker Director", () => {
	it("acts by tool use, reads the facts of the old report and nothing else", () => {
		expect(gamemaker.acts).toBe("tools");
		expect(gamemaker.facts).toEqual(GAMEMAKER_FACTS);
		expect(gamemaker.on.map((trigger) => ("event" in trigger ? trigger.event : trigger.every))).toEqual(["arena.round_end"]);
	});

	it("looks at the start of the tick after each round, never after the last one, with the round in the header", async () => {
		const looks = await run(defineGamemaker({ facts: ["progression.section"] }), 4);
		expect(looks.map((look) => [look.tick, look.firings.map((firing) => firing.payload)])).toEqual([
			[1, [{ round: 1 }]],
			[2, [{ round: 2 }]],
			[3, [{ round: 3 }]],
		]);
		expect(looks[0]?.system).toBe(options.system);
		expect(looks[1]?.input.split("\n")[0]).toBe("Minute 2 (after round 2). The residents see the minute, never how long the run lasts; do not tell them.");
		// Until issue 35 keeps them: fresh tracks, nothing since the last look, no notes, the whole budget.
		expect(looks[1]?.input).toContain("- A01: level 1 since minute 0 (2 min), 10 points, rank 1, 0 wrong on this level (next wrong code costs 2), 10 points still open, has not acted yet");
		expect(looks[1]?.input.split("\n").slice(-7)).toEqual([
			"Since your last look:",
			"- nothing happened",
			"",
			"Your earlier notes (newest last):",
			"- none",
			"",
			"Budget: 1 note(s) per resident and 1 board post(s) per 3 minutes. No note possible right now to: nobody. Board posts left: 1.",
		]);
	});

	it("looks after every few rounds with the game's every", async () => {
		const looks = await run(defineGamemaker({ facts: ["progression.section"], every: 2 }), 6);
		expect(looks.map((look) => look.tick)).toEqual([2, 4]);
	});

	it("fails the look on a fact no loaded mechanic computes (SWT-R015)", async () => {
		await expect(run(gamemaker, 2)).rejects.toThrow(/SWT-R015|motives\.lines/);
	});
});
