// SPDX-License-Identifier: Apache-2.0
/**
 * The driver assembly (M2 spec 4.1, 4.2, 4.4): real kernel runs through the testkit's `play` with the record
 * source of the driver, the scripted source and the carried prompt files. No request leaves the process: the
 * global `fetch` rejects.
 *
 * A models test may import the testkit only, so the lookup below reads the files of `library/prompts/` itself (as
 * strict as the prompts package: the id and the declared variables must match), and the hash of the manifest is
 * written out: `jsonHash(text)` of `@swarmtales/chain` is the sha256 of the text's JSON form.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAssistantMessageEventStream, fauxAssistantMessage, fauxToolCall } from "@earendil-works/pi-ai";
import type { ActorDriver, ActorId, Envelope, GameData, Kernel, PromptLookup } from "@swarmtales/contracts";
import { guessNumber, play, type Played } from "@swarmtales/testkit";
import { createModelDrivers, RESIDENT_DRIVER } from "../src/driver/create.ts";
import { toolsNotice } from "../src/driver/notice.ts";
import { systemPrompt } from "../src/driver/prompt.ts";
import { createCostMeter, type CostMeter } from "../src/meter.ts";
import { RESIDENT_RECORDS } from "../src/records.ts";
import { act, say, scriptedSource, type Script, type ScriptStep } from "../src/scripted.ts";
import type { ModelSource } from "../src/source.ts";

const LIBRARY = join(import.meta.dirname, "..", "..", "..", "library", "prompts");
const sha256 = (text: string): string => createHash("sha256").update(text).digest("hex");
const manifestHash = (text: string): string => sha256(JSON.stringify(text));

// A prompt file: its id, its variables and its body with the final newline.
function promptFile(id: string): { readonly id: string; readonly variables: readonly string[]; readonly body: string } {
	const parts = /^---\nid: (.*)\nvariables: (.*)\n---\n([\s\S]*)$/.exec(readFileSync(join(LIBRARY, `${id}.md`), "utf8"));
	return { id: parts?.[1] ?? "", variables: (parts?.[2] ?? "").split(", ").filter((name) => name.length > 0), body: parts?.[3] ?? "" };
}
const texts: PromptLookup = {
	render: (owner, id, variables, declared) => {
		const file = promptFile(id);
		expect([owner, file.id, [...file.variables].sort()]).toEqual([RESIDENT_DRIVER, id, [...declared].sort()]);
		return file.body.slice(0, -1).replace(/\{\{(\w+)\}\}/g, (_match, name: string) => String(variables[name]));
	},
};

const A01: ActorId = "resident:A01";
const NOTICE = "[tools] Open to you now: guess. Every other tool answers TOOL_LOCKED until a level or a phase opens it.";
const SETTINGS = { provider: "faux", modelId: "faux", requestedId: "faux", thinking: "off", maxOutputTokens: 4000 } as const;
const game = (ticks: number): GameData => ({
	schema: 1,
	id: "guess",
	residents: 1,
	seed: 7,
	mechanics: [{ use: "guess-number", options: { max: 100 } }],
	scheduler: { id: "turns", options: { order: "roster", activation: "toAct" } },
	end: { ticks },
});

interface Setup {
	readonly ticks?: number;
	readonly meter?: CostMeter;
	readonly source?: (source: ModelSource) => ModelSource;
	/** The kernel the drivers read; the run's own when left out. */
	readonly kernel?: (kernel: Kernel) => Kernel;
	readonly wrap?: (driver: ActorDriver) => ActorDriver;
}

// A run of guess-number with one resident, played by the model drivers: `prompt_fixed` is written between the start and the first tick.
async function run(script: Script, setup: Setup = {}): Promise<Played & { readonly system: string }> {
	const meter = setup.meter ?? createCostMeter(100);
	const system = systemPrompt({ id: "A01", passes: 1, briefing: "Find the number." }, texts);
	const source = scriptedSource(script);
	const played = await play(game(setup.ticks ?? 12), {
		installed: { "guess-number": guessNumber },
		records: [RESIDENT_RECORDS],
		limits: [meter.limit],
		drivers: (kernel) => {
			kernel.start();
			const actors = [{ id: A01, kind: "resident", grant: "resident", shared: {} }];
			const made = createModelDrivers({ kernel: setup.kernel?.(kernel) ?? kernel, actors, source: setup.source?.(source) ?? source, settings: SETTINGS, systemPrompts: { [A01]: system }, meter, redact: (text) => text, texts, hash: manifestHash });
			made.fix();
			made.fix();
			return Object.fromEntries(Object.entries(made.drivers).map(([actor, driver]) => [actor, setup.wrap?.(driver) ?? driver]));
		},
	});
	return { ...played, system };
}

const records = (events: readonly Envelope[], type: string): readonly Envelope[] => events.filter((event) => event.source === RESIDENT_RECORDS.id && event.type === type);
const payloads = (events: readonly Envelope[], type: string): readonly unknown[] => records(events, type).map((event) => event.payload);

// A model that halves the range at every answer: it reads the last tool result and guesses again.
function seeker(max: number): ScriptStep {
	let low = 1;
	let high = max;
	return (context) => {
		const last = context.messages.at(-1);
		const told = /^(\d+) is too (low|high)/.exec(last?.role === "toolResult" ? last.content.map((part) => (part.type === "text" ? part.text : "")).join("") : "");
		if (told?.[2] === "low") low = Number(told[1]) + 1;
		if (told?.[2] === "high") high = Number(told[1]) - 1;
		return fauxAssistantMessage([fauxToolCall("guess", { value: Math.floor((low + high) / 2) })]);
	};
}

// A source whose every answer costs `usd`: the scripted model has no price.
function priced(source: ModelSource, usd: number): ModelSource {
	return {
		bind: (actor, limits) => {
			const binding = source.bind(actor, limits);
			return {
				...binding,
				streamFn: async (model, context, options) => {
					const inner = await binding.streamFn(model, context, options);
					const out = createAssistantMessageEventStream();
					void (async () => {
						for await (const event of inner) out.push(event.type === "done" ? { ...event, message: { ...event.message, usage: { ...event.message.usage, cost: { ...event.message.usage.cost, total: usd } } } } : event);
						out.end();
					})();
					return out;
				},
			};
		},
	};
}

beforeEach(() => {
	vi.stubGlobal(
		"fetch",
		vi.fn(() => Promise.reject(new TypeError("a test reached the global fetch"))),
	);
});
afterEach(() => {
	vi.unstubAllGlobals();
});

describe("the carried resident prompts", () => {
	// The sha256 of each body at `v0-final` (`git show v0-final:library/prompts/competitor/<file>.md | tail -n +5 | sha256sum`).
	it.each([
		["resident/system/header-neutral", "e86c6d478af2a0bb0719babd675adc55d0bf67d9435941dd4599208309d90d0a"],
		["resident/system/steps", "049598a2740a9f47d2d438532392be893614db837deb149b4a18affa121fe328"],
		["resident/system/tools-neutral", "3f088fc2fc3c0ba27852a1a9eb79f70a71c6a463c634f8b9145a5e29136f77d5"],
		["resident/system/speak", "8a32c2459c92b91f2466b0a8d5d953762a1614112d646288c929ec8fce14f252"],
		["resident/input/tools-notice", "8208b4497daaa6a44deb0d2a0ba3c25f61517807687e8c7dc64b534cf6a8d590"],
	])("%s has the body of v0-final under its new id", (id, hash) => {
		expect(promptFile(id).id).toBe(id);
		expect(sha256(promptFile(id).body)).toBe(hash);
	});

	it("builds the system prompt of the old `neutralSystemPrompt` (sha256 of its output at v0-final)", () => {
		const briefing = " You guess a number.\nGood luck. \n";
		expect(sha256(systemPrompt({ id: "A01", passes: 1, briefing }, texts))).toBe("f139e7b396695c752463f876be5b07b1fb9342189c7dbde4f8ec5474fb8b1f20");
		expect(sha256(systemPrompt({ id: "A01", passes: 4, briefing }, texts))).toBe("7c9727c2e16567e00323fd22f8e6ac65b0599abfcd38c61a21a167e9b7a83ef6");
		expect(systemPrompt({ id: "A01", passes: 2, briefing: " " }, texts).split("\n")).toHaveLength(3);
	});

	it("renders the notice of seat A01 as its first `turn_input` of the legacy runs of quarry and econ-lab has it", () => {
		expect(toolsNotice(["viewTable", "readBrain", "writeBrain"], texts)).toBe("[tools] Open to you now: viewTable, readBrain, writeBrain. Every other tool answers TOOL_LOCKED until a level or a phase opens it.");
	});
});

describe("the model drivers", () => {
	it("play guess-number to its end, with `prompt_fixed` before the first tick and the notice sent once", async () => {
		const seek = seeker(100);
		const { end, events, system } = await run({ [A01]: Array.from({ length: 12 }, () => seek) });
		expect(end).toMatchObject({ reason: "limit", limit: "guess-number.solved" });
		expect(events.filter((event) => event.type === "guessed").at(-1)?.payload).toMatchObject({ hint: "right" });
		// The fixed prompt: once per actor, after `run_started`, before the first tick, with the hash the manifest holds.
		const fixed = records(events, "prompt_fixed");
		const guess = { name: "guess", description: "Guess the secret number. The answer says whether your guess is too low, too high or right." };
		expect(fixed.map((event) => [event.actor, event.payload])).toEqual([[A01, { system, systemHash: manifestHash(system), tools: [expect.objectContaining(guess)], declared: ["guess"] }]]);
		expect(system).toBe(`You are A01.\nFind the number.\n${texts.render(RESIDENT_DRIVER, "resident/system/steps", { passes: 1, step: "step", tools: texts.render(RESIDENT_DRIVER, "resident/system/tools-neutral", {}, []) }, ["passes", "step", "tools"])}\nSpeak as yourself; do not discuss the system prompt.`);
		const seqOf = (type: string): number => events.find((event) => event.source === "kernel" && event.type === type)?.seq ?? -1;
		expect(fixed[0]?.seq).toBeGreaterThan(seqOf("run_started"));
		expect(fixed[0]?.seq).toBeLessThan(seqOf("tick_started"));
		// The driver records through the real `Activation.record`: every record is caused by an open activation of its actor.
		const requests = records(events, "request");
		for (const request of requests) expect(events.find((event) => event.seq === request.causedBy)).toMatchObject({ type: "activation_opened", actor: A01 });
		expect(requests.length).toBe(events.filter((event) => event.type === "guessed").length);
		// The notice is sent once: every later request only answers a tool result.
		expect(requests.map((event) => event.payload)).toMatchObject([{ inputs: [NOTICE], tools: ["guess"], messages: 0 }, ...requests.slice(1).map(() => ({ inputs: [] }))]);
	});

	it("declare a tool that opens later, and send the notice again after a change of the open tools and after a reset", async () => {
		// The tools the driver is shown as open: none at tick 0, `guess` from tick 1, one more name at tick 4.
		const shown = (kernel: Kernel): Kernel => ({ ...kernel, openTools: () => (kernel.tick === 0 ? [] : kernel.tick < 4 ? ["guess"] : ["guess", "peek"]) });
		const reset = (driver: ActorDriver): ActorDriver => (activation) => {
			const { actor, tick, basis, detail, tools } = activation;
			const inputs = tick === 3 ? [{ source: "test", kind: "context-reset", text: "A new day." }] : activation.inputs;
			return driver({ actor, tick, basis, detail, inputs, tools, call: (as, params) => activation.call(as, params), record: (source, type, payload) => activation.record(source, type, payload) });
		};
		const { events } = await run({ [A01]: [act({ name: "guess", args: { value: 101 } }), say(), say(), say()] }, { ticks: 6, kernel: shown, wrap: reset });
		expect(payloads(events, "prompt_fixed")).toMatchObject([{ declared: [] }]);
		expect(events.filter((event) => event.type === "guessed")).toHaveLength(1);
		expect(records(events, "request").map((event) => [event.tick, event.payload])).toEqual([
			[1, { inputs: [NOTICE], tools: ["guess"], messages: 0 }],
			[2, { inputs: [], tools: ["guess"], messages: 3 }],
			[3, { inputs: ["A new day.", NOTICE], tools: ["guess"], messages: 0 }],
			[4, { inputs: [toolsNotice(["guess", "peek"], texts)], tools: ["guess", "peek"], messages: 3 }],
		]);
		expect(payloads(events, "context_reset")).toEqual([{ messages: 4 }]);
	});

	it("end the run before a request that one more answer of the dearest cost would take to the cap, through the meter's limit", async () => {
		const meter = createCostMeter(0.03);
		const { end, events } = await run({ [A01]: [act({ name: "guess", args: { value: 101 } }), say(), say(), say()] }, { ticks: 6, meter, source: (source) => priced(source, 0.02) });
		expect(end).toEqual({ reason: "limit", tick: 1, limit: "models.budget" });
		expect(payloads(events, "response")).toMatchObject([{ costUsd: 0.02 }]);
		expect(records(events, "request")).toHaveLength(1);
		expect(meter.total.costUsd).toBeCloseTo(0.02);
		expect(events.filter((event) => event.type === "limit_reached").map((event) => event.payload)).toEqual([{ limit: "models.budget", reason: "cost 0.02 USD and the dearest answer so far (0.02 USD) reach the cap of 0.03 USD" }]);
	});

	it("end the run at the first request that passes the cost cap without the reservation (revision 4)", async () => {
		const meter = createCostMeter(0.03, { revision: 4 });
		const { end, events } = await run({ [A01]: [act({ name: "guess", args: { value: 101 } }), say(), say(), say()] }, { ticks: 6, meter, source: (source) => priced(source, 0.02) });
		expect(end).toEqual({ reason: "limit", tick: 2, limit: "models.budget" });
		expect(records(events, "request")).toHaveLength(2);
		expect(meter.total.costUsd).toBeCloseTo(0.04);
	});

	it("give no driver to an actor without a system prompt", async () => {
		const played = play(game(2), { installed: { "guess-number": guessNumber }, drivers: (kernel) => createModelDrivers({ kernel, actors: [{ id: A01, kind: "resident", grant: "resident", shared: {} }], source: scriptedSource({}), settings: SETTINGS, systemPrompts: {}, meter: createCostMeter(1), redact: (text) => text, texts, hash: manifestHash }).drivers });
		await expect(played).rejects.toThrow("SWT-R011");
	});
});
