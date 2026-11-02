/**
 * Proof story 1 of the new core (docs/ideas/monorepo.md §2a): zero mechanics. Residents exist, the
 * clock runs, the log is written, and the run is deterministic and resumable.
 */
import { describe, expect, it } from "vitest";
import { createHost, defineCoreStory } from "@swarmtales/kernel";
import { checkDeterminism, checkSnapshotRoundTrip, idleAgent, playStory } from "@swarmtales/testkit";
import type { Turn } from "@swarmtales/contracts";

const empty = defineCoreStory({ id: "empty", seed: 7, minutes: 3, residents: 3, mechanics: [], grants: {} });

describe("the empty story", () => {
	it("has residents, a running clock and a written log", async () => {
		const turns: Turn[] = [];
		const run = await playStory({ story: empty }, (turn) => {
			turns.push(turn);
			return Promise.resolve();
		});
		expect(run.end).toEqual({ reason: "minutes", minute: 3 });
		expect(run.host.residents).toEqual(["A01", "A02", "A03"]);
		expect(run.host.mechanics).toEqual([]);
		const types = run.events.map((event) => event.type);
		expect(types[0]).toBe("run_started");
		expect(types.at(-1)).toBe("run_ended");
		expect(types.filter((type) => type === "minute_started")).toHaveLength(3);
		expect(types.filter((type) => type === "turn_started")).toHaveLength(9);
		expect(run.events.map((event) => event.seq)).toEqual(run.events.map((_, index) => index + 1));
		expect(run.events.every((event) => event.source === "core" && event.actor === "host")).toBe(true);
		expect(turns.map((turn) => turn.minute)).toEqual([0, 0, 0, 1, 1, 1, 2, 2, 2]);
		expect(turns.every((turn) => turn.tools.length === 0 && turn.inputs.length === 0)).toBe(true);
		expect(run.host.facts()).toEqual({});
	});

	it("draws the turn order from the seed", async () => {
		const order = async (seed: number): Promise<string> => {
			const run = await playStory({ story: { ...empty, seed, minutes: 6, residents: 5 } }, idleAgent);
			return run.events.flatMap((event) => (event.type === "turn_started" && typeof event.payload === "object" && event.payload !== null && "resident" in event.payload ? [String(event.payload.resident)] : [])).join(",");
		};
		expect(await order(7)).toBe(await order(7));
		expect(await order(7)).not.toBe(await order(8));
	});

	it("is deterministic and survives a snapshot round trip", async () => {
		expect(await checkDeterminism({ story: empty }, () => idleAgent)).toEqual([]);
		expect(await checkSnapshotRoundTrip({ story: empty }, () => idleAgent, 1)).toEqual([]);
	});

	it("refuses every call, since nothing is granted", async () => {
		const host = createHost({ story: empty });
		host.start();
		expect(await host.call("gamemaker", "anything", {})).toEqual({ ok: false, code: "TOOL_UNKNOWN" });
		expect(host.log.all().map((event) => event.type)).toEqual(["run_started", "tool_called", "tool_refused"]);
		expect(host.log.all()[2]?.causedBy).toBe(2);
	});

	it("rejects a snapshot of another story", () => {
		const host = createHost({ story: empty });
		host.start();
		const snapshot = host.snapshot();
		expect(() => createHost({ story: { ...empty, id: "other" }, resume: { snapshot, events: host.log.all() } })).toThrow(/another story/);
		expect(() => createHost({ story: empty, resume: { snapshot: { ...snapshot, format: "x" }, events: host.log.all() } })).toThrow();
		expect(() => createHost({ story: empty, resume: { snapshot, events: [] } })).toThrow(/seq/);
	});
});
