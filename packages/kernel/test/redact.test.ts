// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** No secret in `run_ended.detail`: the event in memory is redacted, and so is what every sink gets (M2-01). */
import { describe, expect, it } from "vitest";
import { createKernel } from "../src/index.ts";
import { adder, caught, codeOf, counter, definition, keeper } from "./sample.ts";

// Built at run time: no committed text has the shape of a key.
const KEY = `${["s", "k"].join("")}-ant-${"a1B2_c3-".repeat(4)}`;
const TOKEN = "t0K.en~".repeat(4);
const MESSAGE = `POST https://user:${TOKEN}@api.example/v1 with ${KEY} and Bearer ${TOKEN} failed`;
const REDACTED = "POST https://[redacted]@api.example/v1 with sk-[redacted] and Bearer [redacted] failed";

describe("run_ended.detail", () => {
	it("holds no secret when a handler of a plugin threw it", async () => {
		const sink = keeper();
		const thrower = (): never => {
			throw new TypeError(MESSAGE);
		};
		const kernel = createKernel(definition({ plugins: [counter(100, { tickStarted: [{ run: thrower }] })] }), { sinks: [sink] });
		expect(codeOf(await caught(() => kernel.run({ resident: adder })))).toBe("SWT-R003");
		const last = kernel.log.all().at(-1);
		expect(last).toMatchObject({ type: "run_ended", payload: { reason: "error", detail: `SWT-R003: counter: ${REDACTED}` } });
		for (const text of [JSON.stringify(kernel.log.all()), JSON.stringify(sink.events)]) {
			expect(text).toContain("[redacted]");
			expect(text).not.toContain(KEY);
			expect(text).not.toContain(TOKEN);
		}
	});

	it("holds no secret when a driver threw it, and the error itself is thrown on unchanged", async () => {
		const kernel = createKernel(definition());
		const thrown = new TypeError(MESSAGE);
		expect(await caught(() => kernel.run({ resident: () => Promise.reject<undefined>(thrown) }))).toBe(thrown);
		expect(kernel.log.all().at(-1)?.payload).toEqual({ reason: "error", detail: REDACTED });
		expect(thrown.message).toBe(MESSAGE);
	});
});
