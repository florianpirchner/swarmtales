// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The cost cap of a live run (P471, P472; decision A46, issue M4-68), on the committed log of the cap smoke
 * `hello-game-002` (cap 0.001 USD, runtime revision 4): the replay meters the cap of the manifest again and replays
 * the run equal; the meter of revision 5 reserves the dearest answer so far and would have stopped the run under
 * its cap. The run was played before the rename (M6-06): it names the mechanic `grid` by its old id, so `swt replay`
 * of the folder plays it at the commit its manifest names (`13-m6-spec.md` 4.3), and the replays here read its log
 * with the new id. `swt replay` of a capped run at the head is proven by `live.test.ts` (P471).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { StoredEnvelopeSchema, type Envelope, type EventSink } from "@swarmtales/contracts";
import { DIRECTOR_RECORDS } from "@swarmtales/engine";
import { createCostMeter, DIRECTOR_MODEL_RECORDS, formatUsd, RESIDENT_RECORDS, type CostMeter } from "@swarmtales/models";
import { replay } from "@swarmtales/testkit";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { describe, expect, it } from "vitest";
import { resolveFile } from "../src/run.ts";
import { cli } from "./support.ts";

const HELLO = fileURLToPath(new URL("../../../games/hello/game.ts", import.meta.url));
const RUN = fileURLToPath(new URL("fixtures/cap-run", import.meta.url));
const Cost = Type.Object({ costUsd: Type.Number({ description: "The cost of the answer in USD" }) }, { description: "The cost of a `response`" });
const log: readonly Envelope[] = readFileSync(join(RUN, "events.jsonl"), "utf8")
	.trimEnd()
	.split("\n")
	.map((line) => Parse(StoredEnvelopeSchema, JSON.parse(line)));
/** The id this platform renamed (M6-06), from the id the log holds to the id here. */
const RENAMED = { "grid-game": "grid" } as const;
// The log under the new id: its sources, tools, plugins and facts.
const renamed: readonly Envelope[] = log.map((event) => Parse(StoredEnvelopeSchema, JSON.parse(Object.entries(RENAMED).reduce((text, [old, now]) => text.replaceAll(old, now), JSON.stringify(event)))));
const costs = log.filter((event) => event.type === "response").map((event) => Parse(Cost, event.payload).costUsd);

// The gate of the resident session over the logged answers: a request is sent only while the meter's limit holds.
function sentUnder(meter: CostMeter): number {
	let sent = 0;
	for (const costUsd of costs) {
		if (meter.limit.check() !== undefined) break;
		meter.add("resident:ada", { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, costUsd });
		sent += 1;
	}
	return sent;
}

describe("the cost cap of a live run", () => {
	it("replays a run that ended at its cap equal: the replay meters the cap of the manifest (P471)", async () => {
		const io = { cwd: process.cwd(), now: () => new Date(0), out: () => undefined, err: () => undefined, env: {} };
		const records = [RESIDENT_RECORDS, DIRECTOR_RECORDS, DIRECTOR_MODEL_RECORDS];
		const { game } = await resolveFile({ file: HELLO, seed: 1 }, io, records);
		const meter = createCostMeter(0.001, { revision: 4 });
		const sink: EventSink = {
			write: (event) => {
				if (event.source === RESIDENT_RECORDS.id && event.type === "response") meter.add(event.actor, { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, ...Parse(Cost, event.payload) });
			},
		};
		expect((await replay({ game, log: renamed, records, ports: { limits: [meter.limit], sinks: [sink] } })).firstDifference).toBeUndefined();
	});

	it("is replayed by `swt replay` at its own commit: at the head its game is another (13-m6-spec.md 4.3)", async () => {
		const swt = cli(process.cwd());
		const { code, err } = await swt("replay", RUN, "--game", HELLO);
		expect([code, err]).toEqual([1, expect.stringContaining("SWT-C031: the replayed log differs at line 1")]);
	});

	it("differs at the cap's `limit_reached` without the meter, as before the fix (P471)", async () => {
		const io = { cwd: process.cwd(), now: () => new Date(0), out: () => undefined, err: () => undefined, env: {} };
		const records = [RESIDENT_RECORDS, DIRECTOR_RECORDS, DIRECTOR_MODEL_RECORDS];
		const { game } = await resolveFile({ file: HELLO, seed: 1 }, io, records);
		const again = await replay({ game, log: renamed, records });
		expect(again.firstDifference?.line).toBe(155);
		expect(renamed[154]?.payload).toEqual({ limit: "models.budget", reason: "cost 0.00 USD reached the cap of 0.00 USD" });
	});

	it("keeps the logged run under its cap with the reservation of revision 5, where revision 4 passed it by 33 % (P472)", () => {
		const old = createCostMeter(0.001, { revision: 4 });
		expect(sentUnder(old)).toBe(14);
		expect(old.total.costUsd).toBeCloseTo(0.001332, 6);
		expect(old.limit.check()).toBe("cost 0.00 USD reached the cap of 0.00 USD");
		const reserved = createCostMeter(0.001);
		expect(sentUnder(reserved)).toBe(12);
		expect(reserved.total.costUsd).toBeLessThan(0.001);
		expect(reserved.limit.check()).toBe("cost 0.000815355 USD and the dearest answer so far (0.0002021 USD) reach the cap of 0.001 USD");
		expect(formatUsd(old.total.costUsd)).toBe("0.001331885");
	});
});
