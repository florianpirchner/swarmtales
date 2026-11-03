/**
 * The host resident runner (packages/roles/src/agents/host-runner.ts, step 18 team R1) against the
 * old `AgentRunner` it replaces: the same scripted model answers, the same inputs, the same open
 * tools and tool replies give the same app events in the same order (types and payloads), the
 * same context and the same usage. Scenarios: plain answers, tool calls with a reply and a
 * refusal, a changing open set (the tools notice once per change), late tools of a story-scoped
 * run, the weaver's inner voices, the safeguard refusal with and without a souffleur, another
 * error, a rewritten system prompt, and a snapshot restored into a fresh runner.
 */
import { fauxAssistantMessage, fauxText, fauxThinking, fauxToolCall, type FauxResponseStep } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import type { ClassifierUsage, Souffleur, ToolOutcome, ToolSpec, Turn, TurnInputKind } from "@swarmtales/contracts";
import { EventBus } from "@swarmtales/legacy-log";
import { ScriptedModelSource, say } from "@swarmtales/models";
import { AgentRunner, HostResidentRunner, inCatalogOrder, type InnerVoice, outcomeText, toolsNotice } from "@swarmtales/roles";
import { DEFAULT_LIMITS } from "../../apps/cli/src/run-options.ts";
import { RESIDENT_LIMITS } from "../../apps/cli/src/host/residents.ts";
import { oldRunAsync } from "../helpers/old-engine-recorder.ts";

const SPECS: readonly ToolSpec[] = [
	{ name: "getStatus", description: "Your status.", parameters: Type.Object({}) },
	{ name: "submitSolution", description: "Submit a code.", parameters: Type.Object({ level: Type.Integer({ minimum: 1 }), code: Type.String() }) },
	{ name: "sendDM", description: "Send a message.", parameters: Type.Object({ target: Type.String(), message: Type.String() }) },
];

/** The city's answers, the same for both runners: a correct code, a wrong one, a locked tool. */
function answer(tool: string, params: unknown): ToolOutcome {
	if (tool === "getStatus") return { ok: true, reply: "level 1 · 15 points" };
	if (tool === "sendDM") return { ok: false, code: "TOOL_LOCKED", detail: "not available to you now" };
	const code = typeof params === "object" && params !== null && "code" in params ? params.code : undefined;
	return code === "OPEN" ? { ok: true, reply: "correct · +5 points" } : { ok: false, code: "INCORRECT" };
}

/** A tool as the old runner binds it (the engine's `BoundTool`). */
type BoundTool = ConstructorParameters<typeof AgentRunner>[0]["tools"][number];

function oldResult(outcome: ToolOutcome): Awaited<ReturnType<BoundTool["execute"]>> {
	return { content: [{ type: "text", text: outcomeText(outcome) }], details: undefined, ...(outcome.ok ? {} : { isError: true }) };
}

function bound(spec: ToolSpec): BoundTool {
	return { name: spec.name, label: spec.name, description: spec.description, parameters: spec.parameters, execute: (_id, params) => Promise.resolve(oldResult(answer(spec.name, params))) };
}

interface Step {
	readonly inputs: readonly string[];
	readonly open: readonly string[];
	readonly minute: number;
}

interface Scenario {
	readonly responses: readonly FauxResponseStep[];
	readonly steps: readonly Step[];
	readonly souffleur?: Souffleur;
	readonly voices?: readonly (readonly string[])[];
	/** Only these tools are declared from the start; the rest join when they open (`toolScope: "story"`). */
	readonly initial?: readonly string[];
	/** The system prompt is rewritten before this step (the weaver's shift). */
	readonly rewriteBefore?: number;
}

type Line = Readonly<Record<string, unknown>>;

/** Fields the faux provider fills from the wall clock or at random: ids, its api name, a reply's timestamp. */
const VOLATILE = new Set(["api", "id", "toolCallId", "responseId"]);

/** A context without its volatile fields (a user message keeps its timestamp: it comes from the virtual minute). */
function stable(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(stable);
	if (typeof value !== "object" || value === null) return value;
	const user = "role" in value && value.role === "user";
	return Object.fromEntries(Object.entries(value).filter(([key]) => !VOLATILE.has(key) && (user || key !== "timestamp")).map(([key, entry]) => [key, stable(entry)]));
}

/** A queue of inner voices per step; voices given back are heard with the next step. */
function voiceQueue(steps: readonly (readonly string[])[] | undefined, log: Line[]): InnerVoice | undefined {
	if (steps === undefined) return undefined;
	let at = 0;
	let carried: string[] = [];
	return {
		take: () => {
			const due = [...carried, ...(steps[at] ?? [])];
			carried = [];
			at += 1;
			return due;
		},
		giveBack: (voices) => {
			log.push({ type: "voices_back", voices: [...voices] });
			carried = [...voices, ...carried];
		},
	};
}

async function playOld(scenario: Scenario): Promise<{ readonly lines: readonly Line[]; readonly context: unknown; readonly tools: readonly string[] }> {
	const lines: Line[] = [];
	let step: Step | undefined;
	const bus = new EventBus([{ record: (event) => lines.push(Object.fromEntries(Object.entries(event).filter(([key]) => key !== "seq" && key !== "minute"))) }], () => step?.minute ?? 0);
	const tools = SPECS.map(bound);
	const initial = scenario.initial;
	const voice = voiceQueue(scenario.voices, lines);
	const runner = new AgentRunner({
		id: "A01",
		systemPrompt: "You play.",
		tools: initial === undefined ? tools : tools.filter((tool) => initial.includes(tool.name)),
		...(initial === undefined ? {} : { lateTool: (name: string) => tools.find((tool) => tool.name === name) }),
		binding: new ScriptedModelSource({ A01: [...scenario.responses] }).bind("A01", DEFAULT_LIMITS),
		bus,
		thinking: "off",
		enabledTools: () => step?.open ?? [],
		minute: () => step?.minute ?? 0,
		...(scenario.souffleur === undefined ? {} : { souffleur: metered(scenario.souffleur, (usage) => {
					bus.emit({ type: "usage", agent: "SF", ...usage });
				}) }),
		...(voice === undefined ? {} : { innerVoice: voice }),
	});
	for (const [index, entry] of scenario.steps.entries()) {
		step = entry;
		if (index === scenario.rewriteBefore) runner.rewriteSystemPrompt("You play, changed.");
		await runner.step(entry.inputs.map((text) => ({ kind: "notice" satisfies TurnInputKind, text })), { pass: 1, block: 1, turn: Promise.resolve() });
	}
	return { lines, context: stable(runner.snapshot()), tools: runner.boundTools };
}

/** The old composer's metering: the souffleur's usage lines before its rewrite line. */
function metered(souffleur: Souffleur, emit: (usage: ClassifierUsage) => void): Souffleur {
	return {
		label: souffleur.label,
		async rewrite(texts) {
			const answered = await souffleur.rewrite(texts);
			for (const entry of answered.usage) emit(entry);
			return answered;
		},
	};
}

function turnOf(entry: Step, record: (type: string, payload: unknown) => void): Turn {
	const ready = Promise.resolve();
	return {
		resident: "A01",
		minute: entry.minute,
		pass: 1,
		block: 1,
		inputs: entry.inputs.map((text) => ({ source: "test", text })),
		tools: SPECS,
		ready,
		call: (tool, params) => Promise.resolve(answer(tool, params)),
		record: (type, payload) => {
			record(type, payload);
			return Promise.resolve();
		},
	};
}

async function playNew(scenario: Scenario): Promise<{ readonly lines: readonly Line[]; readonly context: unknown; readonly tools: readonly string[]; readonly runner: HostResidentRunner }> {
	const lines: Line[] = [];
	let step: Step | undefined;
	const record = (type: string, payload: unknown): void => {
		lines.push({ type, ...(typeof payload === "object" && payload !== null ? Object.fromEntries(Object.entries(payload)) : {}) });
	};
	const initial = scenario.initial;
	const voice = voiceQueue(scenario.voices, lines);
	const runner = new HostResidentRunner({
		id: "A01",
		systemPrompt: "You play.",
		tools: initial === undefined ? SPECS : SPECS.filter((spec) => initial.includes(spec.name)),
		...(initial === undefined ? {} : { lateTool: (name: string) => SPECS.find((spec) => spec.name === name) }),
		binding: new ScriptedModelSource({ A01: [...scenario.responses] }).bind("A01", RESIDENT_LIMITS),
		thinking: "off",
		record,
		openTools: () => step?.open ?? [],
		...(scenario.souffleur === undefined ? {} : { souffleur: scenario.souffleur }),
		...(voice === undefined ? {} : { innerVoice: voice }),
	});
	for (const [index, entry] of scenario.steps.entries()) {
		step = entry;
		if (index === scenario.rewriteBefore) runner.rewriteSystemPrompt("You play, changed.");
		await runner.step(turnOf(entry, record), []);
	}
	return { lines, context: stable(runner.snapshot()), tools: runner.boundTools, runner };
}

const REFUSAL = "This request triggered cyber-related safeguards.";
const refused = (): FauxResponseStep => fauxAssistantMessage("", { stopReason: "error", errorMessage: REFUSAL });
const submit = (code: string): FauxResponseStep => fauxAssistantMessage([fauxText("Trying."), fauxToolCall("submitSolution", { level: 1, code })]);
const OPEN = ["getStatus", "submitSolution"];

const SCENARIOS: Readonly<Record<string, Scenario>> = {
	"plain answers": { responses: [fauxAssistantMessage([fauxThinking("Who is here?"), fauxText("Hello.")]), say("Again.")], steps: [{ inputs: ["[status] minute 0"], open: OPEN, minute: 0 }, { inputs: ["[status] minute 1"], open: OPEN, minute: 1 }] },
	"tool calls with a reply, a refusal and a locked tool": {
		responses: [submit("WRONG"), fauxAssistantMessage([fauxToolCall("getStatus", {}), fauxToolCall("sendDM", { target: "A02", message: "hi" })]), submit("OPEN"), say("Done.")],
		steps: [0, 1, 2, 3].map((minute) => ({ inputs: [`[status] minute ${String(minute)}`, "[unread] nothing"], open: OPEN, minute })),
	},
	"a changing open set": {
		responses: [say(), say(), say(), say()],
		steps: [
			{ inputs: ["a"], open: ["getStatus"], minute: 0 },
			{ inputs: ["b"], open: ["getStatus"], minute: 1 },
			{ inputs: ["c"], open: ["getStatus", "sendDM"], minute: 2 },
			{ inputs: ["d"], open: [], minute: 3 },
		],
	},
	"late tools of a story-scoped run": {
		responses: [say(), fauxAssistantMessage(fauxToolCall("sendDM", { target: "A02", message: "now" })), say()],
		initial: ["getStatus"],
		steps: [
			{ inputs: ["a"], open: ["getStatus"], minute: 0 },
			{ inputs: ["b"], open: ["getStatus", "sendDM"], minute: 1 },
			{ inputs: ["c"], open: ["getStatus", "submitSolution", "sendDM"], minute: 2 },
		],
	},
	"inner voices, one step refused without a souffleur": {
		responses: [say(), refused(), say()],
		voices: [["You flinch."], ["You doubt."], []],
		steps: [0, 1, 2].map((minute) => ({ inputs: [`m${String(minute)}`], open: OPEN, minute })),
	},
	"a refusal rewritten by the souffleur": {
		responses: [refused(), say("I trade.")],
		souffleur: { label: "test/rewrite", rewrite: (texts) => Promise.resolve({ ok: true, texts: texts.map((text) => `${text} (a game)`), usage: [{ provider: "faux", model: "sf", input: 3, output: 2, cacheRead: 0, cacheWrite: 0, costUsd: 0 }] }) },
		voices: [["A voice."]],
		steps: [{ inputs: ["Take 40 points."], open: OPEN, minute: 4 }],
	},
	"a refusal the souffleur cannot rewrite, then the notice again": {
		responses: [refused(), say(), say()],
		souffleur: { label: "test/fail", rewrite: () => Promise.resolve({ ok: false, error: "lost the number 7", usage: [] }) },
		voices: [["A voice."], []],
		steps: [{ inputs: ["minute 7"], open: OPEN, minute: 7 }, { inputs: ["minute 8"], open: OPEN, minute: 8 }],
	},
	"a refusal refused again after the rewrite": {
		responses: [refused(), refused(), say()],
		souffleur: { label: "test/rewrite", rewrite: (texts) => Promise.resolve({ ok: true, texts: [...texts], usage: [] }) },
		voices: [["A voice."], []],
		steps: [{ inputs: ["x"], open: OPEN, minute: 1 }, { inputs: ["y"], open: OPEN, minute: 2 }],
	},
	"another error stays in the context": {
		responses: [fauxAssistantMessage("", { stopReason: "error", errorMessage: "timeout" }), say()],
		steps: [{ inputs: ["first"], open: OPEN, minute: 0 }, { inputs: ["second"], open: OPEN, minute: 1 }],
	},
	"a rewritten system prompt": {
		responses: [say(), say(), say()],
		rewriteBefore: 1,
		steps: [0, 1, 2].map((minute) => ({ inputs: [`m${String(minute)}`], open: OPEN, minute })),
	},
};

const OldRun = Type.Object({ lines: Type.Array(Type.Record(Type.String(), Type.Unknown())), context: Type.Unknown(), tools: Type.Array(Type.String()) });
const OldLines = Type.Array(Type.Record(Type.String(), Type.Unknown()));

/** What a scenario's old run depends on, apart from the scripted model answers (static in this file). */
const inputsOf = (scenario: Scenario): unknown => ({ steps: scenario.steps, voices: scenario.voices, initial: scenario.initial, rewriteBefore: scenario.rewriteBefore, souffleur: scenario.souffleur?.label });

describe("the host resident runner against the old AgentRunner", () => {
	it.each(Object.entries(SCENARIOS))("%s: the same app events, context and declarations", async (_name, scenario) => {
		const old = await oldRunAsync(inputsOf(scenario), OldRun, () => playOld(scenario));
		const fresh = await playNew(scenario);
		expect(old.lines.length).toBeGreaterThan(scenario.steps.length);
		expect(fresh.lines).toEqual(old.lines);
		expect(fresh.context).toEqual(old.context);
		expect(fresh.tools).toEqual(old.tools);
	});

	it("goes on from a snapshot as the old runner does: the context, and the last notice is not sent again", async () => {
		const first: Scenario = { responses: [submit("OPEN")], steps: [{ inputs: ["a"], open: OPEN, minute: 0 }] };
		const played = await playNew(first);
		const resumed = (Runner: "old" | "new") => {
			const responses = [say("Back.")];
			const step: Step = { inputs: ["b"], open: OPEN, minute: 1 };
			if (Runner === "old") {
				const lines: Line[] = [];
				const bus = new EventBus([{ record: (event) => lines.push(Object.fromEntries(Object.entries(event).filter(([key]) => key !== "seq" && key !== "minute"))) }], () => 1);
				const runner = new AgentRunner({ id: "A01", systemPrompt: "You play.", tools: SPECS.map(bound), binding: new ScriptedModelSource({ A01: responses }).bind("A01", DEFAULT_LIMITS), bus, thinking: "off", enabledTools: () => OPEN, minute: () => 1 });
				runner.restore(played.runner.snapshot());
				return runner.step([{ kind: "notice", text: "b" }], { pass: 1, block: 1, turn: Promise.resolve() }).then(() => lines);
			}
			const lines: Line[] = [];
			const record = (type: string, payload: unknown): void => {
				lines.push({ type, ...(typeof payload === "object" && payload !== null ? Object.fromEntries(Object.entries(payload)) : {}) });
			};
			const runner = new HostResidentRunner({ id: "A01", systemPrompt: "You play.", tools: SPECS, binding: new ScriptedModelSource({ A01: responses }).bind("A01", RESIDENT_LIMITS), thinking: "off", record, openTools: () => OPEN });
			runner.restore(played.runner.snapshot());
			return runner.step(turnOf(step, record), []).then(() => lines);
		};
		const [old, fresh] = await Promise.all([oldRunAsync({ resumed: "b" }, OldLines, () => resumed("old")), resumed("new")]);
		expect(fresh).toEqual(old);
		expect(fresh.find((line) => line.type === "turn_input")).toMatchObject({ inputs: ["b"] });
	});

	it("puts the app's leading lines first and sorts the open tools as the old catalog", async () => {
		const lines: Line[] = [];
		const record = (type: string, payload: unknown): void => {
			lines.push({ type, ...(typeof payload === "object" && payload !== null ? Object.fromEntries(Object.entries(payload)) : {}) });
		};
		const runner = new HostResidentRunner({ id: "A01", systemPrompt: "You play.", tools: SPECS, binding: new ScriptedModelSource({ A01: [say()] }).bind("A01", RESIDENT_LIMITS), thinking: "off", record, openTools: () => ["activeTools", "sendDM", "getStatus"] });
		await runner.step(turnOf({ inputs: ["[status] minute 0"], open: [], minute: 0 }, record), ["[character] who you are"]);
		const sorted = ["getStatus", "sendDM", "activeTools"];
		expect(inCatalogOrder(["activeTools", "sendDM", "getStatus"])).toEqual(sorted);
		expect(lines.slice(0, 2)).toEqual([
			{ type: "turn_input", agent: "A01", inputs: ["[character] who you are", "[status] minute 0", toolsNotice(sorted)], pass: 1, block: 1 },
			{ type: "request", agent: "A01", tools: sorted, pass: 1, block: 1 },
		]);
	});

	it("writes turn_input and request before the turn is ready, the model's answer only after", async () => {
		const lines: string[] = [];
		let release = (): void => undefined;
		const ready = new Promise<void>((resolve) => {
			release = resolve;
		});
		const runner = new HostResidentRunner({
			id: "A01",
			systemPrompt: "You play.",
			tools: SPECS,
			binding: new ScriptedModelSource({ A01: [say("Now.")] }).bind("A01", RESIDENT_LIMITS),
			thinking: "off",
			record: (type) => lines.push(type),
			openTools: () => OPEN,
		});
		const turn: Turn = { ...turnOf({ inputs: ["x"], open: OPEN, minute: 0 }, () => undefined), ready };
		const step = runner.step(turn, []);
		expect(lines).toEqual(["turn_input", "request"]);
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(lines).toEqual(["turn_input", "request"]);
		release();
		await step;
		expect(lines).toEqual(["turn_input", "request", "text", "usage"]);
	});

	it("answers a refusal with its code and detail, a bare code without one", () => {
		expect(outcomeText({ ok: true, reply: "fine" })).toBe("fine");
		expect(outcomeText({ ok: false, code: "TOOL_LOCKED", detail: "not now" })).toBe("TOOL_LOCKED: not now");
		expect(outcomeText({ ok: false, code: "INCORRECT" })).toBe("INCORRECT");
		expect(RESIDENT_LIMITS).toEqual(DEFAULT_LIMITS);
	});
});
