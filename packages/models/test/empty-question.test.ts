// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * P481 (M5-89): a question with an empty input is no question. The asker binds no model, sends no request and writes
 * no record, as the old classifier runtime sent nothing for an empty batch; a question with an input is sent.
 */
import { Type } from "typebox";
import { describe, expect, it, vi } from "vitest";
import type { Activation } from "@swarmtales/contracts";
import { createAsker, EMPTY_QUESTION } from "../src/director.ts";
import { createCostMeter } from "../src/meter.ts";
import { say, scriptedSource } from "../src/scripted.ts";
import type { ModelSource } from "../src/source.ts";

const CONFESSOR = "director:confessor";
const OUTPUT = Type.Object({ items: Type.Array(Type.Unknown({ description: "An item" }), { description: "The items" }) }, { description: "The answer" });

describe("the asker and an empty question", () => {
	it("sends nothing and records nothing for an empty input, and asks a question with one", async () => {
		const source = scriptedSource({ [CONFESSOR]: [say('{"items":[]}')] });
		const bind = vi.fn<ModelSource["bind"]>((actor, limits) => source.bind(actor, limits));
		const meter = createCostMeter(1);
		const ask = createAsker({ bind }, meter, () => ({}));
		const record = vi.fn<Activation["record"]>();
		const activation: Activation = { actor: CONFESSOR, tick: 4, basis: 0, detail: {}, inputs: [], tools: [], call: () => Promise.resolve({ ok: false, code: "TOOL_NOT_GRANTED" }), record };
		expect(await ask(activation, { system: "Label.", input: "", output: OUTPUT })).toEqual({ ok: false, reason: "error", detail: EMPTY_QUESTION });
		expect([bind.mock.calls.length, record.mock.calls.length, meter.total.requests]).toEqual([0, 0, 0]);
		const asked = await ask(activation, { system: "Label.", input: 'Statements of this round:\n#1 A01 on the public board: "hi"', output: OUTPUT });
		expect(asked).toMatchObject({ ok: true, value: { items: [] } });
		expect([bind.mock.calls.length, record.mock.calls.map((call) => call[1])]).toEqual([1, ["request", "text", "response"]]);
	});
});
