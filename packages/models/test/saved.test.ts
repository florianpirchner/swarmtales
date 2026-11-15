// SPDX-License-Identifier: Apache-2.0
/**
 * A saved session (M5 spec 4.5, row 1): one session saved between two steps and loaded into a new one asks its
 * model what the first would have asked next, also when a tool was declared late (the provider library writes that
 * declaration into the conversation) and when the snapshot file sorted every key; a saved session that does not fit
 * is refused with `SWT-X042`. No request leaves the process: the global `fetch` rejects.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TranscriptContext } from "@earendil-works/pi-ai";
import type { Activation, ActorId, ToolSpec } from "@swarmtales/contracts";
import { createToolsNotice } from "../src/driver/notice.ts";
import { parseSavedSessions, type SavedSession } from "../src/driver/saved.ts";
import { createResidentSession, type ResidentSession } from "../src/driver/session.ts";
import { createCostMeter } from "../src/meter.ts";
import { act, say, scriptedSource, type ScriptStep } from "../src/scripted.ts";

const A01: ActorId = "resident:A01";
const LIMITS = { maxOutputTokens: 4000, timeoutMs: 5000 };
const object = (properties: Readonly<Record<string, unknown>>): ToolSpec["parameters"] => ({ type: "object", properties, description: "The arguments" });
const LOOK: ToolSpec = { name: "look", description: "Look around.", parameters: object({}) };
const MOVE: ToolSpec = { name: "move", description: "Move.", parameters: object({ to: { type: "string", description: "Where" }, by: { type: "integer", description: "How far" } }) };
const redact = (text: string): string => text.replaceAll("hunter2", "[redacted]");

// What each request sent, as the provider library gives it to the provider.
function noted(seen: string[], steps: readonly ScriptStep[]): readonly ScriptStep[] {
	return steps.map((step): ScriptStep => (context: TranscriptContext, options, state, model) => {
		seen.push(JSON.stringify(context.messages));
		return typeof step === "function" ? step(context, options, state, model) : step;
	});
}

function session(seen: string[], steps: readonly ScriptStep[], tools: readonly ToolSpec[], saved?: SavedSession): ResidentSession {
	const binding = scriptedSource({ [A01]: noted(seen, steps) }).bind(A01, LIMITS);
	return createResidentSession({ actor: A01, systemPrompt: "You walk.", tools, binding, thinking: "off", meter: createCostMeter(100), redact, ...(saved === undefined ? {} : { saved }) });
}

function activation(tick: number, text: string): Activation {
	return {
		actor: A01,
		tick,
		basis: 0,
		detail: {},
		inputs: [{ source: "test", kind: "line", text }],
		tools: [],
		call: (as) => Promise.resolve({ ok: true, reply: `${as} done.` }),
		record: (source, type, payload) => ({ seq: 0, tick, source, type, actor: A01, payload }),
	};
}

// A value as a snapshot file gives it back: every object's keys sorted.
const sorted = (value: unknown): unknown => JSON.parse(JSON.stringify(value, (_key, inner: unknown) => (typeof inner === "object" && inner !== null && !Array.isArray(inner) ? Object.fromEntries(Object.entries(inner).sort(([left], [right]) => (left < right ? -1 : 1))) : inner)));

beforeEach(() => {
	vi.stubGlobal("fetch", () => Promise.reject(new TypeError("a test reached the global fetch")));
	vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-15T10:00:00.000Z") });
});
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe("a saved session", () => {
	it("asks the same next request after a load, with a late tool and a pending tool result, from a sorted file", async () => {
		const answers = [say("I look."), act({ name: "move", args: { to: "north", by: 2 } }), say("Moved, hunter2."), say("Here.")];
		const seen: string[] = [];
		const straight = session(seen, answers, [LOOK]);
		await straight.step(activation(0, "Start."), { open: ["look"] });
		straight.declare([MOVE]);
		expect(await straight.step(activation(1, "Move now."), { open: ["look", "move"] })).toEqual({ pending: true });
		const saved = parseSavedSessions(sorted({ [A01]: straight.save() }), redact)[A01];
		expect(saved).toMatchObject({ format: 1, initial: ["look"], declared: ["look", "move"] });
		expect(saved?.messages.some((message) => message.includes('"toolsAdded"'))).toBe(true);
		expect(saved?.messages.some((message) => message.includes('{"to":"north","by":2}'))).toBe(true);
		const resumedSeen: string[] = [];
		const resumed = session(resumedSeen, answers.slice(2), [LOOK], saved);
		resumed.declare([MOVE]);
		expect([resumed.pending, resumed.messages, resumed.declared]).toEqual([true, straight.messages, straight.declared]);
		await straight.step(activation(2, "Go on."), { open: ["look", "move"] });
		await resumed.step(activation(2, "Go on."), { open: ["look", "move"] });
		expect([seen.length, resumedSeen.length]).toEqual([3, 1]);
		expect(resumedSeen[0]).toBe(seen[2]);
		expect(seen[2]).toContain('"toolResult"');
		// What the session saves is redacted; the conversation in memory is not changed by a save.
		await straight.step(activation(3, "And?"), { open: ["look", "move"] });
		expect(JSON.stringify(straight.save())).not.toContain("hunter2");
		expect(seen[3]).toContain("hunter2");
	});

	it("remembers the last tools notice of a saved session", () => {
		const texts = { render: (_owner: string, _id: string, variables: Readonly<Record<string, string | number>>): string => String(variables.tools) };
		expect(createToolsNotice(texts, ["look"]).next(["look"])).toEqual([]);
		expect(createToolsNotice(texts, ["look"]).next(["look", "move"])).toEqual(["look, move"]);
		const notice = createToolsNotice(texts);
		notice.next(["look"]);
		expect(notice.last).toEqual(["look"]);
		notice.forget();
		expect(notice.last).toBeUndefined();
	});

	it("refuses a saved session that does not fit (SWT-X042)", async () => {
		const seen: string[] = [];
		const first = session(seen, [say()], [LOOK]);
		await first.step(activation(0, "Start."), { open: ["look"] });
		const saved = first.save();
		expect(() => session(seen, [], [LOOK, MOVE], saved)).toThrow("SWT-X042");
		expect(() => session(seen, [], [LOOK], { ...saved, messages: ["{not json"] })).toThrow("SWT-X042");
		expect(() => session(seen, [], [LOOK], { ...saved, messages: ['{"role":"assistant","content":"no blocks"}'] })).toThrow("SWT-X042");
		expect(() => parseSavedSessions({ [A01]: { ...saved, format: 2 } }, redact)).toThrow("SWT-X042");
		expect(() => parseSavedSessions({ [A01]: { ...saved, key: "x" } }, redact)).toThrow("SWT-X042");
	});
});
