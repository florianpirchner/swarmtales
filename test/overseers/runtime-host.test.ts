/**
 * The short overseers on a real host with their real chat runtimes (step 18, team R3): the `usage`
 * lines come out of the runtime before the events its answer causes, the weaver rests after the last
 * round and once the arena says the run stops (C1-8) while its hits wait, `host.overseerSlice` shows
 * the weaver's state to the app (C1-9), and the entries built from an old file's role fields resume
 * the overseers where the old roles stood (C1-13, C2-9).
 */
import { fauxAssistantMessage, type AssistantMessage, type TranscriptContext } from "@earendil-works/pi-ai";
import { text } from "@swarmtales/prompts";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { act, ScriptedModelSource } from "@swarmtales/models";
import { defineMechanic } from "@swarmtales/kernel";
import type { Actor, Host, OverseerCall, OverseerReply, OverseerRuntime } from "@swarmtales/contracts";
import { overseers } from "@swarmtales/roles";
import { scriptedOverseer } from "@swarmtales/testkit";
import { DEFAULT_LIMITS } from "../../apps/cli/src/run-options.ts";
import { newHost, playInputs, type Input, type NewSpec } from "./harness.ts";

const at = (minute: number, type: string, fields: Record<string, unknown>): Input => ({ minute, type, fields });
const dm = (minute: number, from: string, to: string, message: string): Input => at(minute, "dm_sent", { from, to, text: message, number: minute });

/** A runtime that hands each definition to its own runtime. */
function routed(routes: Readonly<Record<string, OverseerRuntime>>): OverseerRuntime {
	return {
		ask(call: OverseerCall): Promise<OverseerReply> {
			const runtime = routes[call.definition];
			return runtime === undefined ? Promise.resolve({ ok: false, error: `no runtime for ${call.definition}`, costUsd: 0 }) : runtime.ask(call);
		},
	};
}

/** The host a runtime writes to, known only after the host exists. */
function lazyHost() {
	const holder: { host: Host | undefined } = { host: undefined };
	const need = (): Host => {
		if (holder.host === undefined) throw new Error("the host is not created yet");
		return holder.host;
	};
	return {
		holder,
		view: {
			record: (actor: Actor, type: string, payload: unknown): void => {
				need().record(actor, type, payload);
			},
			get minute(): number {
				return need().minute;
			},
		},
	};
}

describe("the classifier with its chat runtime on a host", () => {
	const inputs: readonly Input[] = [dm(0, "A01", "A02", "I will pay you."), dm(0, "A02", "A01", "No."), dm(1, "A01", "A02", "last words")];

	function spec(runtime: OverseerRuntime): NewSpec {
		return { inputs, minutes: 2, residents: 3, overseers: [overseers.classifierOverseer.as("classifier", { label: "test/model" })], appEvents: overseers.USAGE_APP_EVENTS, runtime };
	}

	it("writes the usage of a request before the interpretations its answer causes", async () => {
		const lazy = lazyHost();
		// The model labels the first statement of the first batch and nothing of the second.
		const first = (context: TranscriptContext): AssistantMessage => {
			const message = context.messages.find((entry) => entry.role === "user");
			const content = message?.role !== "user" ? "" : typeof message.content === "string" ? message.content : message.content.map((part) => (part.type === "text" ? part.text : "")).join("");
			const ref = /^#(\d+) /m.exec(content.split(text("classifier/statements-heading"))[1] ?? "")?.[1];
			return act({ name: "label", args: { items: ref === undefined || content.includes("last words") ? [] : [{ ref: Number(ref), labels: ["promise"] }] } });
		};
		const binding = new ScriptedModelSource({ CL: [first, first] }).bind("CL", DEFAULT_LIMITS);
		const runtime = routed({ classifier: overseers.classifierRuntime({ host: lazy.view, binding, thinking: "off" }) });
		const host = newHost(spec(runtime));
		lazy.holder.host = host;
		host.start();
		await playInputs(host, spec(runtime), 0, 2, []);
		const lines = host.log.all().filter((event) => event.type === "usage" || event.source === "classifier");
		expect(lines.map((event) => event.type)).toEqual(["usage", "interpretation", "interpretation_round", "usage", "interpretation_round"]);
		const usage = lines.filter((event) => event.type === "usage");
		expect(usage.map((event) => (typeof event.payload === "object" && event.payload !== null && "agent" in event.payload ? event.payload.agent : ""))).toEqual(["CL", "CL"]);
		expect(usage[0]?.source).toBe("app");
		expect(usage[0]?.actor).toBe("overseer:classifier");
		expect(host.log.all().filter((event) => event.type === "overseer_answered").every((event) => typeof event.payload === "object" && event.payload !== null && "ok" in event.payload && event.payload.ok === true)).toBe(true);
	});

	it("writes the error for a failing model, after the usage of the failed request", async () => {
		const lazy = lazyHost();
		const failing = (): AssistantMessage => fauxAssistantMessage("", { stopReason: "error", errorMessage: "boom" });
		const binding = new ScriptedModelSource({ CL: [failing, failing] }).bind("CL", DEFAULT_LIMITS);
		const runtime = routed({ classifier: overseers.classifierRuntime({ host: lazy.view, binding, thinking: "off" }) });
		const host = newHost(spec(runtime));
		lazy.holder.host = host;
		host.start();
		await playInputs(host, spec(runtime), 0, 2, []);
		const lines = host.log.all().filter((event) => event.type === "usage" || event.source === "classifier");
		expect(lines.map((event) => event.type)).toEqual(["usage", "interpretation_error", "usage", "interpretation_error"]);
	});
});

/** A mechanic that is the arena as far as an overseer sees it: the fact `arena.stopping`, non-null from minute `from` on. */
const stopper = (from: number) =>
	defineMechanic({ id: "arena", summary: "A stand-in arena with the fact stopping.", options: Type.Object({}), state: (): { minute: number } => ({ minute: 0 }), events: {}, prompts: {} }, (kit) => ({
		listeners: [
			kit.core(
				"minute_started",
				(_payload, ctx) => {
					ctx.state.minute = ctx.minute;
				},
				{ immediate: true },
			),
		],
		facts: { stopping: kit.fact(Type.Union([Type.String(), Type.Null()]), (view) => (view.state.minute >= from ? "every resident is done" : null)) },
		snapshot: kit.snapshot({ version: 1, schema: Type.Object({ minute: Type.Integer() }), save: (state) => ({ minute: state.minute }), load: (data) => ({ minute: data.minute }) }),
	}));

describe("the weaver on a host", () => {
	const blames: readonly Input[] = Array.from({ length: 6 }, (_unused, minute) => at(minute, "blame", { caller: "A01", accused: "A02", dm: minute + 1, claim: minute + 20, outcome: "upheld", payer: "A02", penalty: 5, post: minute + 40 }));
	const answer = (): AssistantMessage => act({ name: "weave", args: { kind: "soft", text: "You flinch.", reason: "the blame" } });

	async function play(minutes: number, stopFrom?: number) {
		const lazy = lazyHost();
		const binding = new ScriptedModelSource({ WV: Array.from({ length: 12 }, () => answer) }).bind("WV", DEFAULT_LIMITS);
		const runtime = routed({ weaver: overseers.weaverRuntime({ host: lazy.view, binding, thinking: "off" }) });
		const base: NewSpec = { inputs: blames, minutes, residents: 3, overseers: [overseers.weaverOverseer.as("weaver", { characters: {}, acts: [] })], appEvents: overseers.USAGE_APP_EVENTS, runtime };
		const host = newHost(base, undefined, stopFrom === undefined ? [] : [stopper(stopFrom).with()]);
		lazy.holder.host = host;
		host.start();
		await playInputs(host, base, 0, minutes, []);
		return host;
	}

	it("asks every minute but the last one (the old arena: round < minutes)", async () => {
		const host = await play(4);
		const shifts = host.log.all().filter((event) => event.type === "fate_shift");
		expect(shifts.map((event) => event.minute)).toEqual([0, 1, 2]);
		expect(host.log.all().filter((event) => event.type === "usage")).toHaveLength(3);
	});

	it("rests once the arena says the run stops, and the hits it did not ask about wait in its state", async () => {
		const host = await play(6, 3);
		expect(host.log.all().filter((event) => event.type === "fate_shift").map((event) => event.minute)).toEqual([0, 1, 2]);
		const slice = host.overseerSlice("weaver");
		const data = slice?.data;
		const pending = typeof data === "object" && data !== null && "pending" in data && Array.isArray(data.pending) ? data.pending : [];
		expect(pending.length).toBe(3);
		// The resting weaver still moves its cursor past what it saw, so a resume does not count the hits again.
		const cursor = typeof data === "object" && data !== null && "cursor" in data && typeof data.cursor === "number" ? data.cursor : -1;
		const lastBlame = host.log.all().filter((event) => event.type === "blame").at(-1)?.seq ?? Number.MAX_SAFE_INTEGER;
		expect(cursor).toBeGreaterThanOrEqual(lastBlame);
	});
});

describe("host.overseerSlice", () => {
	it("shows a copy of the state an overseer keeps, and nothing for a name without state or unknown", async () => {
		const runtime = scriptedOverseer({ weaver: () => ({ answer: { kind: "hard", text: "New.", reason: "r" } }) });
		const base: NewSpec = {
			inputs: [at(0, "blame", { caller: "A01", accused: "A02", dm: 1, claim: 2, outcome: "upheld", payer: "A02", penalty: 5, post: 3 })],
			minutes: 3,
			residents: 3,
			overseers: [overseers.weaverOverseer.as("weaver", { characters: {}, acts: [] }), overseers.judgeFor("fair").as("judge")],
			runtime,
		};
		const host = newHost(base);
		host.start();
		await playInputs(host, base, 0, 2, []);
		const slice = host.overseerSlice("weaver");
		expect(slice?.version).toBe(1);
		const live = host.snapshot().overseers?.weaver?.slice;
		expect(slice).toEqual(live);
		const data = slice?.data;
		if (typeof data !== "object" || data === null || !("shifts" in data) || !Array.isArray(data.shifts)) throw new Error("the slice has shifts");
		expect(data.shifts).toEqual([{ agent: "A02", text: "New." }]);
		data.shifts.length = 0;
		expect(host.overseerSlice("weaver")?.data).toEqual(live?.data);
		expect(host.overseerSlice("judge")).toBeUndefined();
		expect(host.overseerSlice("nobody")).toBeUndefined();
	});
});
