// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** Review of M2, part A: the reason of a run limit is a text of the outside and passes the redaction port like `run_ended.detail`. */
import { describe, expect, it } from "vitest";
import type { RunLimit } from "@swarmtales/contracts";
import { createKernel } from "../src/index.ts";
import { definition, keeper } from "./sample.ts";

// A value no pattern knows: only the port of the run can take it out.
const HELD = ["q", "7", "Zk", "33", "RwT"].join("");

describe("review A: the redaction port", () => {
	it("K2: takes a held value out of `limit_reached.reason`, in memory and in every sink", async () => {
		const sink = keeper();
		const limit: RunLimit = { id: "host.stop", summary: "the host stopped the run", check: () => `stopped for ${HELD}` };
		const kernel = createKernel(definition(), { sinks: [sink], limits: [limit], redact: (text) => text.replaceAll(HELD, "[redacted]") });
		const end = await kernel.run({ resident: () => Promise.resolve(undefined) });
		expect(end).toMatchObject({ reason: "limit", limit: "host.stop" });
		const reached = sink.events.filter((event) => event.type === "limit_reached").map((event) => event.payload);
		expect(reached).toEqual([{ limit: "host.stop", reason: "stopped for [redacted]" }]);
		expect(JSON.stringify(kernel.log.all())).not.toContain(HELD);
	});
});
