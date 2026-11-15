// SPDX-License-Identifier: LicenseRef-SUL-1.0
import { describe, expect, it } from "vitest";
import { SwtError } from "@swarmtales/contracts";
import { ordered } from "../src/order.ts";
import type { Placed } from "../src/parts.ts";

/** The load order of tic-tac-toe teams (3.4). */
const LOAD = ["team-channel", "grid-game", "consensus", "strategy-brain", "optimal-referee"];

/** The registrations of one hook: the listed plugins in load order, with the `after` lists given. */
function hook(plugins: readonly string[], after: Readonly<Record<string, readonly string[]>> = {}): readonly Placed[] {
	return LOAD.filter((plugin) => plugins.includes(plugin)).map((plugin) => ({ plugin, ...(after[plugin] === undefined ? {} : { after: after[plugin] }) }));
}
/** The code and the summary of what `run` throws: of an `SwtError` its first issue, else the error's name and message. */
function failure(run: () => unknown): { readonly code: string; readonly summary: string; readonly fix: string } {
	try {
		run();
	} catch (thrown) {
		if (thrown instanceof SwtError) return { code: thrown.code, summary: thrown.issues[0]?.summary ?? "", fix: thrown.issues[0]?.fix ?? "" };
		return { code: thrown instanceof Error ? thrown.name : "", summary: String(thrown), fix: "" };
	}
	return { code: "nothing thrown", summary: "", fix: "" };
}
const run = (entries: readonly Placed[]): readonly string[] => ordered(entries).map((entry) => entry.plugin);

describe("ordered: the table of 3.4", () => {
	it.each([
		["runStarted: grid-game after strategy-brain", hook(["strategy-brain", "grid-game"], { "grid-game": ["strategy-brain"] }), ["strategy-brain", "grid-game"]],
		["tickStarted: load order", hook(["consensus", "strategy-brain"]), ["consensus", "strategy-brain"]],
		["tickEnded: load order", hook(["consensus", "strategy-brain"]), ["consensus", "strategy-brain"]],
		["inputs: load order", hook(["strategy-brain", "grid-game", "team-channel", "consensus"]), ["team-channel", "grid-game", "consensus", "strategy-brain"]],
		["listeners of game_started: load order", hook(["strategy-brain", "optimal-referee"]), ["strategy-brain", "optimal-referee"]],
		["an `after` id that is not loaded is ignored", hook(["grid-game", "consensus"], { "grid-game": ["absent"] }), ["grid-game", "consensus"]],
	])("%s", (_name, entries, expected) => {
		expect(run(entries)).toEqual(expected);
	});

	it("is stable: it moves only what must wait, and keeps the order a plugin lists its own entries in", () => {
		const entries = [{ plugin: "a", id: 1, after: ["c"] }, { plugin: "b", id: 2 }, { plugin: "a", id: 3, after: ["a"] }, { plugin: "c", id: 4 }, { plugin: "c", id: 5 }];
		expect(ordered(entries).map((entry) => entry.id)).toEqual([2, 3, 4, 5, 1]);
		expect(entries.map((entry) => entry.id)).toEqual([1, 2, 3, 4, 5]);
	});

	it("a cycle is SWT-R016 and names the plugins", () => {
		const cycle = (): unknown => ordered([{ plugin: "free" }, { plugin: "a", after: ["b"] }, { plugin: "b", after: ["a"] }]);
		expect(failure(cycle)).toMatchObject({ code: "SWT-R016", summary: "the `after` relations of a, b form a cycle" });
	});
});
