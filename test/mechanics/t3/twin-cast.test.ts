/**
 * `listAgents` against the old engine with a revealed cast member (carve round 3, T3 request 1): the
 * old `residents()` lists the competitors and then the active cast; progression reads the cast
 * through `CastExtrasApi.active` and lists the same lines in the same order.
 */
import { describe, expect, it } from "vitest";
import type { World } from "@swarmtales/engine";
import cityOfKeys from "../../../stories/cityofkeys/story.ts";
import { Twin } from "./twin.ts";
import { twinCast } from "./twin-standins.ts";

describe("twin: listAgents with the active cast", () => {
	it("lists the revealed STEWARD after the competitors, as the old world does, and not before the reveal or after the retirement", async () => {
		const oracle: { world: World | undefined } = { world: undefined };
		const twin = new Twin({ story: cityOfKeys, extra: [twinCast(oracle).with()] });
		oracle.world = twin.world;
		await twin.minuteWith(async () => {
			const hidden = await twin.same("A01", "listAgents", {});
			expect(hidden).not.toContain("STEWARD");
			twin.world.revealCast("STEWARD");
			const shown = await twin.same("A01", "listAgents", {});
			expect(shown.split("\n").at(-1)).toBe("STEWARD: level 10");
			expect(shown.split("\n")).toHaveLength(twin.ids.length + 1);
			twin.world.retireCast("STEWARD");
			expect(await twin.same("A01", "listAgents", {})).not.toContain("STEWARD");
		});
	});
});
