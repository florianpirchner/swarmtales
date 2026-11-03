/**
 * Scripted stand-ins for the models behind overseers and for the human (docs/design/overseer-api.md
 * §6 step 8), for offline tests: `scriptedOverseer` answers each overseer's calls from a script
 * (world-tool calls first, then the answer, a model error or a throw, with a cost and an optional
 * delay to shuffle the models' speed); `scriptedHuman` gives a recorded log's human calls back at
 * the safe stops where they landed, so a replay writes the same log.
 */
import { Check } from "typebox/value";
import { CORE_EVENTS, type EventEnvelope, type HumanCall, type HumanChannel, type OverseerCall, type OverseerReply, type OverseerRuntime, type ToolOutcome } from "@swarmtales/contracts";
import type { PlannedCall } from "./agents.ts";

/** What one scripted model request does. */
export interface ScriptedAnswer {
	/** World-tool calls the "model" makes before it answers, in order. */
	readonly calls?: readonly PlannedCall[];
	/** The answer (untrusted, as a model's: the host checks it against the output schema). */
	readonly answer?: unknown;
	/** A failing model: `{ ok: false, error }`. */
	readonly error?: string;
	/** A runtime that throws. */
	readonly throws?: string;
	readonly costUsd?: number;
	/** Milliseconds before the request starts its tool calls and answers: a slow model. */
	readonly delayMs?: number;
}

/** A name's script: answers in order, or a function of the call and its number (from 0) for that name. */
export type OverseerScript = readonly ScriptedAnswer[] | ((call: OverseerCall, n: number) => ScriptedAnswer | undefined);

/** One request as the runtime saw it, with the outcomes of its tool calls. */
export interface AskedCall {
	readonly call: OverseerCall;
	readonly outcomes: readonly ToolOutcome[];
}

export interface ScriptedRuntime extends OverseerRuntime {
	/** Every request in the order the host made them. */
	readonly asked: readonly AskedCall[];
}

function wait(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

/**
 * An `OverseerRuntime` from scripts by overseer name. A name without a script, or a script that
 * runs out, fails the request (`no script`), which the host answers through the fallbacks.
 */
export function scriptedOverseer(scripts: Readonly<Record<string, OverseerScript>>): ScriptedRuntime {
	const asked: AskedCall[] = [];
	const counts = new Map<string, number>();
	return {
		asked,
		async ask(call): Promise<OverseerReply> {
			const n = counts.get(call.name) ?? 0;
			counts.set(call.name, n + 1);
			const outcomes: ToolOutcome[] = [];
			asked.push({ call, outcomes });
			const script = scripts[call.name];
			const step = script === undefined ? undefined : typeof script === "function" ? script(call, n) : script[n];
			if (step === undefined) return { ok: false, error: "no script", costUsd: 0 };
			if (step.delayMs !== undefined) await wait(step.delayMs);
			for (const planned of step.calls ?? []) outcomes.push(await call.call(planned.tool, planned.params));
			if (step.throws !== undefined) throw new Error(step.throws);
			const costUsd = step.costUsd ?? 0;
			if (step.error !== undefined) return { ok: false, error: step.error, costUsd };
			return { ok: true, answer: step.answer, costUsd, by: "model" };
		},
	};
}

/**
 * The human of a recorded log: each `tool_called` of actor `human` is given back at the safe stop
 * where the log had the length it had before the call, in the log's order. Calls the log shows
 * outside safe stops (`host.call("human", ...)` directly) are not replayed, and a resumed run skips
 * the calls of the log before its snapshot, so one channel serves a whole run and its resumes.
 */
export function scriptedHuman(events: readonly EventEnvelope[]): HumanChannel {
	const calls: { readonly seq: number; readonly call: HumanCall }[] = [];
	for (const event of events) {
		if (event.source !== "core" || event.type !== "tool_called" || event.actor !== "human") continue;
		const payload = event.payload;
		if (!Check(CORE_EVENTS.tool_called, payload)) throw new Error(`scriptedHuman: event ${String(event.seq)} is not a tool call`);
		calls.push({ seq: event.seq, call: { tool: payload.tool, params: payload.params } });
	}
	let next = 0;
	return {
		next(stop) {
			// What the run has passed (a resumed run starts later; a call made outside safe stops never matches) is skipped.
			while ((calls[next]?.seq ?? Infinity) <= stop.seq) next += 1;
			const entry = calls[next];
			if (entry?.seq !== stop.seq + 1) return undefined;
			next += 1;
			return entry.call;
		},
	};
}
