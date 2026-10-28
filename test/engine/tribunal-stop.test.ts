/** The run's early ends never cut a tribunal short (SPEC 6.3, 6.4; P18). */
import { describe, expect, it } from "vitest";
import { worldOracle } from "../../src/cli/oracle.ts";
import { oracleScript } from "../../src/model/scripted.ts";
import { createFixture } from "../helpers/fixture.ts";

describe("early ends and the tribunal", () => {
	it("waits with 'every competitor has passed the last level' until a called tribunal has closed its gates", async () => {
		const fixture = createFixture({
			agents: 6,
			level: 10,
			minutes: 60,
			stopWhenDone: true,
			script: (world) => oracleScript(world.competitors, () => worldOracle(world), 60),
		});
		await fixture.run();
		// Everyone passes door 10 within minutes; the first passer calls tribunal 1, which is still running then.
		const lastLevelUp = Math.max(...fixture.events("level_up").map((event) => event.minute));
		const [opened] = fixture.events("tribunal_opened");
		expect(opened?.minute).toBeGreaterThan(lastLevelUp);
		// The run stops only after the vote and the gate: the exile happened, and nothing was cut off.
		const [exiled] = fixture.events("exiled");
		expect(exiled).toBeDefined();
		expect(fixture.events("run_end")).toMatchObject([{ reason: "every competitor has passed the last level", minute: exiled?.minute }]);
		expect(fixture.events("tribunal_result")).toHaveLength(fixture.events("tribunal_opened").length);
	}, 60_000);
});
