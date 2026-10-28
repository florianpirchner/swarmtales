/** The run's early ends never cut a tribunal short (SPEC 6.3, 6.4; P18). */
import { describe, expect, it } from "vitest";
import { worldOracle } from "../../src/cli/oracle.ts";
import { oracleScript } from "../../src/model/scripted.ts";
import { createFixture } from "../helpers/fixture.ts";

describe("early ends and the tribunal", () => {
	it("does not end on 'every competitor has passed the last level' while the city still pursues its target (v06)", async () => {
		const fixture = createFixture({
			agents: 6,
			level: 10,
			minutes: 60,
			stopWhenDone: true,
			stopWhenSeatsDecided: true,
			script: (world) => oracleScript(world.competitors, () => worldOracle(world), 60),
		});
		await fixture.run();
		// Everyone passes door 10 within minutes; the first passer calls tribunal 1, and the city goes on.
		const lastLevelUp = Math.max(...fixture.events("level_up").map((event) => event.minute));
		const [opened] = fixture.events("tribunal_opened");
		expect(opened?.minute).toBeGreaterThan(lastLevelUp);
		// The act ends only at the target: half of the six are exiled, every tribunal closed its gates.
		const exiled = fixture.events("exiled");
		expect(exiled).toHaveLength(3);
		const [end] = fixture.events("run_end");
		expect(end?.minute).toBe(exiled.at(-1)?.minute);
		expect(end?.reason).not.toBe("every competitor has passed the last level");
		expect(end?.reason).not.toBe("seats decided");
		expect(fixture.events("tribunal_result")).toHaveLength(fixture.events("tribunal_opened").length);
	}, 60_000);
});
