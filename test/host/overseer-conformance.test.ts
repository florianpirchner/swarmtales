/**
 * Conformance for overseers (docs/design/overseer-api.md §6 step 8, §7 risk 1) with the testkit's
 * checks: an overseer's options are documented, a story with overseers and a human gives the same
 * events for the same seed and survives a snapshot round trip, and no mechanic draws with
 * `random()`, whose stream moves with the log's position (every new core event an overseer or the
 * human writes would move a golden mechanic's draws).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { createHost, defineOverseer, type HostOptions } from "@swarmtales/kernel";
import type { TurnTaker } from "@swarmtales/contracts";
import { checkDeterminism, checkNoLogRandom, checkOptionsDocumented, checkSnapshotRoundTrip, playStory, scriptedHuman, scriptedOverseer } from "@swarmtales/testkit";
import { tally, TallyEvents, watcher } from "./proof/tally.ts";

function sources(directory: string): readonly string[] {
	return readdirSync(directory).flatMap((entry) => {
		const path = join(directory, entry);
		return statSync(path).isDirectory() ? sources(path) : path.endsWith(".ts") ? [path] : [];
	});
}

const MECHANIC_SOURCES = readdirSync("mechanics")
	.map((name) => join("mechanics", name, "src"))
	.filter((path) => statSync(path, { throwIfNoEntry: false })?.isDirectory() === true)
	.flatMap((path) => sources(path));

describe("overseer conformance", () => {
	it("documents every option of an overseer, and finds an undocumented one", () => {
		expect(checkOptionsDocumented(watcher({ triggers: [] }))).toEqual([]);
		const loose = defineOverseer(
			{
				id: "loose",
				summary: "Undocumented.",
				options: Type.Object({ temper: Type.String() }),
				state: () => undefined,
				events: {},
				prompts: { "l/system": [], "l/input": ["standingOrders"], "l/answer": [] },
				system: "l/system",
				input: "l/input",
				output: Type.Object({}),
				answer: { tool: "answer", description: "l/answer" },
				model: { slot: "default" },
				lifetime: "short",
				triggers: [],
			},
			() => ({ calls: () => [], fallback: () => undefined }),
		);
		expect(checkOptionsDocumented(loose)).toEqual(['loose: option "temper" has no description']);
	});

	it("gives the same events for the same seed and survives snapshot cuts, with overseers, orders and a replayed human", async () => {
		const spec = { triggers: [{ hook: "between" as const }, { event: TallyEvents, type: "poked" }] };
		const base = (): HostOptions => ({
			story: { id: "conf", seed: 21, minutes: 4, residents: 3, mechanics: [tally.with()], overseers: [watcher(spec).as("w-1")], grants: { resident: ["poke", "mark"], "w-1": ["mark"], human: ["instruct"] } },
			overseers: scriptedOverseer({ "w-1": (call) => ({ answer: { note: call.input.length > 40 ? "ordered" : "free" }, costUsd: 0.002, calls: [{ tool: "mark", params: { note: "m" } }] }) }),
			human: true,
		});
		const agent = (): TurnTaker => async (turn) => {
			if (turn.resident === "A02") await turn.call("poke", {});
		};
		// A live run with one instruction, recorded; the checks replay it through scriptedHuman.
		const host = createHost(base());
		host.start();
		void host.hand()?.instruct({ target: "w-1", text: "mark less" });
		await host.run(agent());
		const live = host.log.all();
		expect(live.some((event) => event.type === "human_note")).toBe(true);
		const replayed = (): HostOptions => ({ ...base(), human: scriptedHuman(live) });
		expect(JSON.stringify((await playStory(replayed(), agent())).events)).toBe(JSON.stringify(live));
		expect(await checkDeterminism(replayed, agent)).toEqual([]);
		for (const cut of [1, 2, 3]) expect(await checkSnapshotRoundTrip(replayed, agent, cut)).toEqual([]);
	});

	it("finds no draw with random() in any mechanic's sources", () => {
		expect(MECHANIC_SOURCES.length).toBeGreaterThan(50);
		expect(checkNoLogRandom(MECHANIC_SOURCES.map((path) => ({ path, text: readFileSync(path, "utf8") })))).toEqual([]);
	});

	it("names ctx.random() and setup.random(), but not Math.random or a comment", () => {
		const text = ["const a = ctx.random().int(1, 6);", "const b = setup.random ();", "const c = Math.random();", "// ctx.random() is not used here", "const d = ctx.rng(\"deal\").next();"].join("\n");
		expect(checkNoLogRandom([{ path: "m.ts", text }])).toEqual(["m.ts:1: draws with random(), which depends on the log's position", "m.ts:2: draws with random(), which depends on the log's position"]);
	});
});
