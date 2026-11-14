// SPDX-License-Identifier: Apache-2.0
/** Records (M2 specification, 2.3): events of a declared source outside the plugins, for a person only, redacted in memory. */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import type { ActorDriver, Envelope, KernelDefinition, KernelPorts } from "@swarmtales/contracts";
import { createKernel } from "../src/index.ts";
import { A, adder, caught, codeOf, definition, keeper, types } from "./sample.ts";

const NOTES = "@sample/notes";
const said = Type.Object({ text: Type.String({ description: "The text" }) }, { description: "Something was said" });
const game = (more: Partial<KernelDefinition> = {}): KernelDefinition => ({ ...definition(), records: [{ id: NOTES, events: { said } }], ...more });
// A value no pattern knows: only the port of the run can take it out.
const HELD = ["v", "9", "Qx", "71", "LmZ"].join("");
const redact = (text: string): string => text.replaceAll(HELD, "[redacted]");
const thrown = (code: () => unknown): string | undefined => {
	try {
		code();
	} catch (error) {
		return codeOf(error);
	}
	return undefined;
};
/** A driver that records once, calls the tool, and keeps what `record` answered. */
const noting = (kept: Envelope[], source = NOTES, type = "said"): ActorDriver => async (activation) => {
	kept.push(activation.record(source, type, { text: `I add ${HELD}`, deep: [{ text: HELD }], count: 1 }));
	await activation.call("plus", 1);
};

describe("Activation.record", () => {
	it("writes an event of the source, caused by the activation, with its actor, for a person only", async () => {
		const kept: Envelope[] = [];
		const sink = keeper();
		const kernel = createKernel(game({ limits: { maxTicks: 1 } }), { sinks: [sink] });
		await kernel.run({ resident: noting(kept) });
		const opened = kernel.log.ofType("kernel", "activation_opened")[0];
		const [event] = kernel.log.ofType(NOTES, "said");
		expect(event).toEqual({ seq: (opened?.seq ?? 0) + 1, tick: 0, source: NOTES, type: "said", actor: A, causedBy: opened?.seq, audience: ["human"], payload: { text: `I add ${HELD}`, deep: [{ text: HELD }], count: 1 } });
		expect(kept).toEqual([event]);
		expect(sink.events).toContainEqual(event);
		expect(types(kernel.log.all()).slice(2, 5)).toEqual(["activation_opened", "said", "tool_called"]);
	});

	it.each([
		["an undeclared source", "@sample/other", "said"],
		["an undeclared type", NOTES, "sung"],
		["a type that only the prototype has", NOTES, "toString"],
	])("refuses %s with SWT-R017 and writes nothing", async (_name, source, type) => {
		const kernel = createKernel(game());
		expect(codeOf(await caught(() => kernel.run({ resident: noting([], source, type) })))).toBe("SWT-R017");
		expect(kernel.log.all().filter((event) => event.source === source)).toEqual([]);
	});

	it("refuses every record when the definition declares none, and a record after the activation closed", async () => {
		const bare = createKernel(definition());
		expect(codeOf(await caught(() => bare.run({ resident: noting([]) })))).toBe("SWT-R017");
		const late: (() => unknown)[] = [];
		const kernel = createKernel(game({ limits: { maxTicks: 1 } }));
		await kernel.run({ resident: (activation) => Promise.resolve(void late.push(() => activation.record(NOTES, "said", { text: "late" }))) });
		expect(late.map(thrown)).toEqual(["SWT-R017"]);
		expect(kernel.log.ofType(NOTES, "said")).toEqual([]);
	});

	it("ends the run when a sink throws at the record", async () => {
		const kernel = createKernel(game(), { sinks: [{ write: (event) => (event.source === NOTES ? broken() : undefined) }] });
		expect(codeOf(await caught(() => kernel.run({ resident: noting([]) })))).toBe("SWT-R020");
		expect(kernel.ended?.reason).toBe("error");
	});
});

function broken(): never {
	throw new RangeError("the disk is full");
}

describe("Kernel.record", () => {
	it("writes between two ticks with the given actor and no cause", async () => {
		const kernel = createKernel(game());
		kernel.start();
		const first = kernel.record(NOTES, A, "said", { text: "before the first tick" });
		expect(first).toEqual({ seq: 2, tick: 0, source: NOTES, type: "said", actor: A, audience: ["human"], payload: { text: "before the first tick" } });
		await kernel.run({ resident: adder }, { ticks: 1 });
		expect(kernel.record(NOTES, "script", "said", { text: "after it" })).toMatchObject({ tick: 1, actor: "script" });
		expect(kernel.log.ofType(NOTES, "said")).toHaveLength(2);
	});

	it("is SWT-R017 before the start, inside a tick, after the end, and for what is not declared", async () => {
		const kernel = createKernel(game({ limits: { maxTicks: 1 } }));
		const write = (): unknown => kernel.record(NOTES, A, "said", { text: "x" });
		expect(thrown(write)).toBe("SWT-R017");
		kernel.start();
		expect(thrown(() => kernel.record(NOTES, A, "sung", {}))).toBe("SWT-R017");
		expect(thrown(() => kernel.record("@sample/other", A, "said", {}))).toBe("SWT-R017");
		const inside: (string | undefined)[] = [];
		await kernel.run({ resident: () => Promise.resolve(void inside.push(thrown(write))) });
		expect(inside).toEqual(["SWT-R017"]);
		expect(kernel.ended?.reason).toBe("ticks");
		expect(thrown(write)).toBe("SWT-R017");
		expect(kernel.log.ofType(NOTES, "said")).toEqual([]);
	});

	it("is SWT-R001 once the run failed", async () => {
		const kernel = createKernel(game());
		await caught(() => kernel.run({ resident: () => Promise.reject<undefined>(new RangeError("no")) }));
		expect(thrown(() => kernel.record(NOTES, A, "said", {}))).toBe("SWT-R001");
	});
});

describe("a record source", () => {
	it("is refused with SWT-R002 when it has the source of a plugin", () => {
		expect(thrown(() => createKernel(game({ records: [{ id: "@sample/counter/counter", events: { added: said } }] })))).toBe("SWT-R002");
	});
});

describe("the redaction port", () => {
	const ports = (sink: ReturnType<typeof keeper>, port: boolean): KernelPorts => (port ? { sinks: [sink], redact } : { sinks: [sink] });

	it("takes a held value out of every string of a recorded payload, in memory", async () => {
		const sink = keeper();
		const kernel = createKernel(game({ limits: { maxTicks: 1 } }), ports(sink, true));
		const given = { text: HELD, deep: [{ text: `x ${HELD}` }], [HELD]: 7 };
		kernel.start();
		kernel.record(NOTES, A, "said", given);
		await kernel.run({ resident: noting([]) });
		const payloads = kernel.log.ofType(NOTES, "said").map((event) => event.payload);
		expect(payloads).toEqual([{ text: "[redacted]", deep: [{ text: "x [redacted]" }], [HELD]: 7 }, { text: "I add [redacted]", deep: [{ text: "[redacted]" }], count: 1 }]);
		expect(sink.events.filter((event) => event.source === NOTES).map((event) => event.payload)).toEqual(payloads);
		expect(given.text).toBe(HELD);
	});

	it("takes it out of the detail of a failed run, and the pattern redaction alone would not", async () => {
		const details = await Promise.all(
			[true, false].map(async (port) => {
				const sink = keeper();
				const kernel = createKernel(game(), ports(sink, port));
				await caught(() => kernel.run({ resident: () => Promise.reject<undefined>(new RangeError(`refused for ${HELD}`)) }));
				expect(sink.events.at(-1)).toEqual(kernel.log.all().at(-1));
				return kernel.log.all().at(-1)?.payload;
			}),
		);
		expect(details).toEqual([{ reason: "error", detail: "refused for [redacted]" }, { reason: "error", detail: `refused for ${HELD}` }]);
	});

	it("uses the pattern redaction for a record when no port is given", () => {
		const kernel = createKernel(game());
		kernel.start();
		const key = `${["s", "k"].join("")}-${"aB3_".repeat(6)}`;
		expect(kernel.record(NOTES, A, "said", { text: `key ${key}` }).payload).toEqual({ text: "key sk-[redacted]" });
	});
});
