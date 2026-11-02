/**
 * Edges of progression the review's mutants slipped through (docs/design/carve-round3-T3.md, B):
 * the door's second chance in a minute (M7), the residents of an act start (M16), the acts at a
 * stop (M17), two acts noted at once (M23) and a resident with no progress (M26). The old order
 * is `Arena#nextMinute` and `World#alive`, `#noteActStarts` and `closeActs` (world.ts).
 */
import { describe, expect, it } from "vitest";
import type { TurnTaker } from "@swarmtales/contracts";
import { city, ExileControl, payloads, play, solve } from "./support.ts";

/** An agent that runs `action` once per minute, at the first turn. */
function once(action: (minute: number) => Promise<void>): TurnTaker {
	let done = -1;
	return async (turn) => {
		if (done === turn.minute) return;
		done = turn.minute;
		await action(turn.minute);
	};
}

describe("the door", () => {
	it("opens a second time in the minute the last laggard leaves (M7)", async () => {
		const exile = new ExileControl();
		// A06 never passes door 3; the tribunal's tick at the start of minute 5 takes it out of the city.
		exile.leavesAt.set(5, ["A06"]);
		const { host } = city({ holdAfter: 3, exile });
		const agent = once(async (minute) => {
			if (minute !== 1) return;
			for (const id of ["A01", "A02", "A03", "A04", "A05"]) for (const level of [1, 2, 3]) await solve(host, id, level);
		});
		await play(host, 5, agent);
		expect(host.facts()["progression.door"]).toBe(3);
		expect(host.facts()["progression.levels"]).toContainEqual({ agent: "A01", level: 3, held: true });
		await host.playMinute(agent);
		expect(host.minute).toBe(6);
		// The first chance of minute 5 (before the tick) found A06 still in the city; the second one, after it, opened the door.
		const opened = host.log.ofType("progression", "level_entered").filter((event) => event.minute === 5);
		expect(opened.map((event) => event.payload)).toContainEqual({ agent: "A01", level: 4 });
		expect(host.facts()["progression.door"]).toBeNull();
	});
});

describe("acts", () => {
	it("starts an act with the residents who are in the city, not the exiled (M16)", () => {
		const exile = new ExileControl();
		exile.gone.add("A06");
		const { host } = city({ exile });
		expect(payloads(host, "progression", "act_started")).toEqual([{ fromLevel: 1, residents: ["A01", "A02", "A03", "A04", "A05"] }]);
	});

	it("ends its acts when the run ends, and none when it is stopped (M17, D-14)", async () => {
		const stopped = city();
		await play(stopped.host, 2);
		stopped.host.stop("test");
		expect(stopped.host.ended?.reason).toBe("stopped");
		expect(payloads(stopped.host, "progression", "act_ended")).toEqual([]);

		const finished = city({ minutes: 2 });
		await play(finished.host, 2);
		expect(finished.host.ended?.reason).not.toBe("stopped");
		expect(payloads(finished.host, "progression", "act_ended")).toEqual([{ fromLevel: 1 }]);
	});

	it("notes several acts that begin at once in ascending order (M23)", () => {
		const { host } = city({ progression: { startLevel: 10, acts: [9, 5] } });
		expect(payloads(host, "progression", "act_started").map((payload): unknown => Reflect.get(Object(payload), "fromLevel"))).toEqual([5, 9, 10]);
		expect(payloads(host, "progression", "act_ended")).toEqual([{ fromLevel: 5 }, { fromLevel: 9 }]);
	});
});

describe("progress", () => {
	it("says -1 for a resident who has solved nothing, and the minute of the last level-up otherwise (M26)", async () => {
		const { host } = city();
		const progress = async (resident: string): Promise<string> => {
			const outcome = await host.call("script", "peekLastProgress", { resident });
			return outcome.ok ? outcome.reply : outcome.code;
		};
		await play(host, 3);
		expect(await progress("A01")).toBe("-1");
		await host.playMinute(once(async () => solve(host, "A01", 1)));
		expect(await progress("A01")).toBe("3");
		expect(await progress("A02")).toBe("-1");
	});
});
