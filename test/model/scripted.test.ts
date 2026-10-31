import { describe, expect, it } from "vitest";
import { oracleScript, ScriptedModelSource } from "@swarmtales/models";
import { worldOracle } from "../../apps/cli/src/oracle.ts";
import { createFixture } from "../helpers/fixture.ts";

describe("oracle script (offline runs)", () => {
	it("lets every competitor submit its own solution and finish the story", async () => {
		const fixture = createFixture({ minutes: 11, passesPerMinute: 3, script: (world) => oracleScript(world.competitors, () => worldOracle(world), 40) });
		await fixture.run();
		for (const id of fixture.world.competitors) expect(fixture.world.isFinished(id)).toBe(true);
		expect(fixture.events("turn_error")).toEqual([]);
	});

	it("binds a fresh scripted model per competitor", () => {
		const source = new ScriptedModelSource({});
		const first = source.bind("A01", { maxOutputTokens: 10, timeoutMs: 10 });
		const second = source.bind("A02", { maxOutputTokens: 10, timeoutMs: 10 });
		expect(first.model).not.toBe(second.model);
	});
});
