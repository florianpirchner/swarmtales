// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * What a Director reads at its look (decision A74, issue M5-67): a quiet trigger on `channels.board_post` queues the
 * posts without waking it, the look on the run frame's `round_end` takes them along, and the facts `roster.residents`,
 * `directors.active` and `channels.notes` give the roster, each resident's last call and the notes so far. The
 * Director writes what it read into its notes, so replay and resume compare it line by line.
 */
import type { ActorDriver, Kernel } from "@swarmtales/contracts";
import { defineDirector, defineGame, defineHead, defineMechanic, parseTake, RESIDENT_KIND } from "@swarmtales/sdk";
import { checkReplay, checkResumeEveryBoundary, play, scriptedDriver, type PlannedCall } from "@swarmtales/testkit";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { channels } from "../src/index.ts";

const Round = Type.Object({ round: Type.Integer({ description: "The tick plus one" }) }, { description: "A round" });

// The run frame's `round_end` after every tick's turns, as `mechanics/arena` writes it.
const frame = defineMechanic(defineHead({ id: "arena", package: "@test/frame", summary: "Ends rounds.", events: { round_end: Round } }), {
	hooks: {
		tickEnded: (ctx) => {
			ctx.emit("round_end", { round: ctx.tick + 1 });
		},
	},
});

const FACTS = ["roster.residents", "directors.active", "channels.notes"] as const;
const watcher = defineDirector(
	{ id: "gamemaker", summary: "Test: looks after each round, takes the board posts along.", on: [{ event: "arena.round_end" }, { event: "channels.board_post", quiet: true }], facts: [...FACTS], output: Type.Object({}, { description: "Nothing" }) },
	{ system: () => "s", input: () => "i", act: () => Promise.resolve() },
);

const game = defineGame({ id: "director-facts", seed: 5, residents: 3, mechanics: [channels(), frame()], directors: [{ use: watcher }], scheduler: { id: "turns", options: { order: "roster", afterBlocks: ["director"] } }, end: { ticks: 4 } });

// A01 and A02 post in tick 0, A03's empty post is refused before `execute`, A02 posts again in tick 1.
const POSTS: Readonly<Record<string, readonly PlannedCall[]>> = {
	"0 resident:A01": [{ tool: "postBoard", params: { message: "first" } }],
	"0 resident:A02": [{ tool: "postBoard", params: { message: "second" } }],
	"0 resident:A03": [{ tool: "postBoard", params: { message: "" } }],
	"1 resident:A02": [{ tool: "postBoard", params: { message: "third" } }],
};
const residents = scriptedDriver((activation) => POSTS[`${String(activation.tick)} ${activation.actor}`] ?? []);

interface Look {
	readonly tick: number;
	readonly firings: readonly (readonly unknown[])[];
	readonly facts: Readonly<Record<string, unknown>>;
}

// The engine's driver of a Director up to the look; it then leaves a note with the facts it read to one resident.
function looking(kernel: Kernel, looks: Look[]): ActorDriver {
	return async (activation) => {
		const taken = await activation.call("take", {});
		const firings = taken.ok ? (parseTake(taken.reply)?.firings ?? []) : [];
		if (firings.length === 0) return;
		const facts = Object.fromEntries(FACTS.map((key) => [key, kernel.fact(key)]));
		looks.push({ tick: activation.tick, firings: firings.map((firing) => [firing.event, firing.quiet ?? false]), facts });
		await activation.call("notify", { agent: `A0${String(activation.tick)}`, text: `I saw ${JSON.stringify([facts["directors.active"], facts["roster.residents"]])}.` });
	};
}

const drivers = (looks: Look[]) => (kernel: Kernel) => ({ [RESIDENT_KIND]: residents, "director:gamemaker": looking(kernel, looks) });

// The tick and the reader of each note.
const Notes = Type.Array(Type.Object({ tick: Type.Integer(), to: Type.String(), text: Type.String() }, { additionalProperties: false }));
const noted = (notes: unknown): readonly (readonly unknown[])[] => Value.Parse(Notes, notes).map((note) => [note.tick, note.to]);

describe("a Director's look with a quiet trigger and the facts of A74", () => {
	it("wakes only on round_end, takes the quiet posts along, and reads the roster, the last calls and the notes", async () => {
		const looks: Look[] = [];
		const { events } = await play(game, { drivers: drivers(looks) });
		const quiet = ["channels.board_post", true];
		const round = ["arena.round_end", false];
		expect(looks.map((look) => [look.tick, look.firings])).toEqual([
			[1, [quiet, quiet, round]],
			[2, [quiet, round]],
			[3, [round]],
		]);
		expect(looks.map((look) => look.facts["roster.residents"])).toEqual([["A01", "A02", "A03"], ["A01", "A02", "A03"], ["A01", "A02", "A03"]]);
		// A03's refused post reached no `execute`: it is not active (a registered change, A74).
		expect(looks.map((look) => look.facts["directors.active"])).toEqual([{ A01: 0, A02: 0 }, { A01: 0, A02: 1 }, { A01: 0, A02: 1 }]);
		expect(looks.map((look) => noted(look.facts["channels.notes"]))).toEqual([[], [[1, "A01"]], [[1, "A01"], [2, "A02"]]]);
		expect(events.filter((event) => event.type === "tool_refused").map((event) => event.actor)).toEqual(["resident:A03"]);
	});

	it("replays and resumes at every boundary to the straight log", async () => {
		expect(await checkReplay(game, drivers([]))).toEqual([]);
		expect(await checkResumeEveryBoundary(game, drivers([]))).toEqual([]);
	});
});
