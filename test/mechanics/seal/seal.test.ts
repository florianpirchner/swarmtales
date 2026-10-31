/**
 * The seal's wiring on the new host (team T4b): the status parts with a standing bid and for a
 * bearer (the old `sealParts`; the goldens show only the auction without a bid), the locks of the
 * old `enabledTools`, and `SealApi.onExiled` called by another mechanic.
 */
import { describe, expect, it } from "vitest";
import type { TurnTaker } from "@swarmtales/contracts";
import { SealApi } from "@swarmtales/mechanic-shared";
import { runProbe } from "../standoff/support/probe.ts";
import { startHost } from "../standoff/support/host.ts";
import { sealStory, worldFor, type Scenario } from "./differential.ts";

const SCENARIO: Scenario = {
	residents: ["A01", "A02", "A03"],
	points: { A01: 20, A02: 20, A03: 20 },
	rule: { act: 8, announceAfter: 1, bidMinutes: 2, perResidents: 12, spacing: 6 },
	minutes: 10,
	actStartAt: 0,
	missing: 1,
	steps: {},
};

describe("seal on the new host (stand-in exile, tribunal, progression, ledger, channels)", () => {
	it("shows the auction with the resident's own bid, then the seal its bearer holds, in the old words", async () => {
		const world = worldFor(SCENARIO);
		const host = startHost(sealStory(SCENARIO, world));
		const seen: string[] = [];
		const watch: TurnTaker = (turn) => {
			if (turn.resident === "A01") seen.push(`${String(turn.minute)} ${turn.inputs.filter((note) => note.source === "seal").map((note) => note.text).join(" | ")}`);
			return Promise.resolve();
		};
		await host.playMinute(watch);
		await host.playMinute(watch);
		expect(await host.call("resident:A01", "bid", { points: 4 })).toEqual({ ok: true, reply: "your bid of 4 points stands in secret · the bidding closes at minute 3" });
		await host.playMinute(watch);
		await host.playMinute(watch);
		expect(seen).toEqual([
			"0 ",
			"1 black seal auction: secret bids with bid(points) until minute 3",
			"2 black seal auction: secret bids with bid(points) until minute 3 (your bid: 4)",
			"3 you bear a black seal: permaDeath(resident), once, until the act ends",
		]);
		expect(host.facts()["seal.borne"]).toBe(1);
	});

	it("locks bid outside an auction and permaDeath for everyone but the bearer, as the old enabledTools", async () => {
		const world = worldFor(SCENARIO);
		const host = startHost(sealStory(SCENARIO, world));
		const code = async (who: string, tool: string, params: unknown) => {
			const outcome = await host.call(`resident:${who}`, tool, params);
			return outcome.ok ? "ok" : outcome.code;
		};
		expect(await code("A01", "bid", { points: 1 })).toBe("TOOL_LOCKED");
		await host.playMinute(() => Promise.resolve());
		await host.playMinute(() => Promise.resolve());
		expect(await code("A01", "bid", { points: 1 })).toBe("ok");
		expect(await code("A01", "bid", { points: -1 })).toBe("INVALID_ARGUMENTS");
		world.standings.set("A02", { kind: "gate", until: 9 });
		expect(await code("A02", "bid", { points: 1 })).toBe("TOOL_LOCKED");
		expect(await code("A01", "permaDeath", { target: "A03" })).toBe("TOOL_LOCKED");
		await host.playMinute(() => Promise.resolve());
		expect(await code("A03", "permaDeath", { target: "A02" })).toBe("TOOL_LOCKED");
	});

	it("loses its seal when another mechanic tells it its bearer left the city (SealApi.onExiled)", async () => {
		const world = worldFor(SCENARIO);
		const host = startHost(sealStory(SCENARIO, world));
		await host.playMinute(() => Promise.resolve());
		await host.playMinute(() => Promise.resolve());
		await host.call("resident:A01", "bid", { points: 4 });
		await host.playMinute(() => Promise.resolve());
		await host.playMinute(() => Promise.resolve());
		expect(host.facts()["seal.borne"]).toBe(1);
		await runProbe(host, (ctx) => ctx.tryCall(SealApi, "onExiled", { resident: "A01" }));
		expect(host.facts()["seal.borne"]).toBe(0);
		expect(world.noticesOf("A01").at(-1)).toBe("Unused, the black seal crumbles in your hands.");
	});
});
