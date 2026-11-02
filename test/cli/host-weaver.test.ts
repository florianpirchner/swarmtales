/**
 * The weaver on the new host (step 18, S18-19, the CLI's `WeaverDesk`): the scripted weaver run of
 * test/snapshot/weaver.test.ts on `composeHostRun` against the old engine's `composeRun`.
 *
 * A01 accuses A02 on the board every minute; the classifier labels it, so the weaver changes A02
 * every minute (a hard change every third minute, an inner voice otherwise). Checked: the whole
 * log is the old one line for line (the inner voices at the end of A02's inputs, the rewritten
 * system prompt in A02's requests, the `fate_shift` lines), A02's system prompts per request are
 * the old ones, and a run cut at minute 4 and resumed from its own run file goes on exactly like
 * the run that was not cut (the desk's heard voices and applied shifts come back from the file).
 */
import type { FauxResponseStep } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import type { RecordedEvent } from "@swarmtales/legacy-log";
import { MemorySink, RecordedEventSchema } from "@swarmtales/chronicle";
import { act, say, ScriptedModelSource, type Script } from "@swarmtales/models";
import { boundBackend, ChatStatementClassifier, ChatWeaver, CLASSIFIER_ID, GAMEMAKER_ID, overseers, WEAVER_ID } from "@swarmtales/roles";
import { Type } from "typebox";
import { composeRun } from "../../apps/cli/src/compose.ts";
import { oldRunAsync } from "../helpers/old-engine-recorder.ts";
import { composeHostRun } from "../../apps/cli/src/host/run.ts";
import { parseResumePoint, type ResumePoint, type RunFileOut } from "../../apps/cli/src/host/snapshot.ts";
import { DEFAULT_LIMITS, resumedOverrides, type RunOverrides } from "../../apps/cli/src/run-options.ts";
import cityOfKeys from "../../stories/cityofkeys/story.ts";

const MINUTES = 8;
const CUT = 4;

function textOf(content: unknown): string {
	if (typeof content === "string") return content;
	return Array.isArray(content) ? content.map((part: unknown) => (typeof part === "object" && part !== null && "text" in part && typeof part.text === "string" ? part.text : "")).join("\n") : "";
}

/** A01 accuses A02 on the board every minute; everyone else waits. A02 notes the system prompt of every request. */
function residents(ids: readonly string[], minute: () => number, prompts: string[]): Script {
	const script: Record<string, FauxResponseStep[]> = {};
	for (const agent of ids) {
		const step: FauxResponseStep = (context) => {
			if (agent === "A02") prompts.push(textOf(context.messages[0]?.content));
			if (agent === "A01" && context.messages.at(-1)?.role !== "toolResult") return act({ name: "postBoard", args: { message: `A02 cheated me at minute ${String(minute())}.` } });
			return say(`${agent} waits.`);
		};
		script[agent] = Array.from({ length: MINUTES * 2 }, () => step);
	}
	return script;
}

function classifierSteps(): readonly FauxResponseStep[] {
	const step: FauxResponseStep = (context) => {
		const text = textOf(context.messages.findLast((message) => message.role === "user")?.content);
		const items = [...text.matchAll(/^#(\d+) A01 [^\n]*cheated/gm)].map((match) => ({ ref: Number(match[1]), labels: ["accusation"], targets: ["A02"] }));
		return act({ name: "label", args: { items } });
	};
	return Array.from({ length: MINUTES * 2 }, () => step);
}

/** A function of the dossier's minute only, so a resumed run gets the same. */
function weaverSteps(): readonly FauxResponseStep[] {
	const step: FauxResponseStep = (context) => {
		const text = textOf(context.messages.findLast((message) => message.role === "user")?.content);
		const minute = Number(/Minute (\d+)\./.exec(text)?.[1] ?? "0");
		return minute % 3 === 0
			? act({ name: "weave", args: { kind: "hard", text: `Since minute ${String(minute)} you trust no one who writes on the board.`, reason: `accused of cheating by A01 again and again, for the ${String(minute)}th time now` } })
			: act({ name: "weave", args: { kind: "soft", text: `A01's words at minute ${String(minute)} sting.`, reason: "accused by A01" } });
	};
	return Array.from({ length: MINUTES * 2 }, () => step);
}

const BASE: RunOverrides = { minutes: MINUTES, names: false, activation: "always", passesPerMinute: 1, stopWhenDone: false, stopWhenSeatsDecided: false, gamemaker: true, classifier: true, weaver: true };

interface Played {
	readonly events: readonly RecordedEvent[];
	readonly prompts: readonly string[];
}

function gamemakerSteps(): readonly FauxResponseStep[] {
	return Array.from({ length: MINUTES * 2 }, () => say("Watching."));
}

/** The old engine's weaver run, as it was recorded once before the engine went (step 18, item 7b; `test/fixtures/old-engine/`). */
async function playOld(): Promise<Played> {
	return oldRunAsync({ story: cityOfKeys, overrides: { ...BASE, level: 2 } }, Type.Object({ events: Type.Array(RecordedEventSchema), prompts: Type.Array(Type.String()) }), playOldLive);
}

/** The live old composer (recording only; deleted with the engine). */
async function playOldLive(): Promise<Played> {
	const log = new MemorySink();
	const prompts: string[] = [];
	const run = composeRun({
		story: cityOfKeys,
		overrides: { ...BASE, level: 2 },
		models: (world) => new ScriptedModelSource(residents(world.competitors, () => world.minute, prompts)),
		gamemakerModels: () => new ScriptedModelSource({ [GAMEMAKER_ID]: gamemakerSteps() }),
		classifier: () => new ChatStatementClassifier({ binding: new ScriptedModelSource({ [CLASSIFIER_ID]: classifierSteps() }).bind(CLASSIFIER_ID, DEFAULT_LIMITS), label: "scripted/classifier", thinking: "off" }),
		weaver: new ChatWeaver({ binding: new ScriptedModelSource({ [WEAVER_ID]: weaverSteps() }).bind(WEAVER_ID, DEFAULT_LIMITS), label: "scripted/weaver", thinking: "off" }),
		sinks: [log],
	});
	await run.arena.run();
	return { events: log.events, prompts };
}

async function playNew(extra: { readonly cut?: boolean; readonly resume?: ResumePoint } = {}): Promise<Played & { readonly snapshot?: ResumePoint }> {
	const log = new MemorySink();
	const prompts: string[] = [];
	let taken: ResumePoint | undefined;
	const resume = extra.resume;
	const run = composeHostRun({
		story: cityOfKeys,
		overrides: resume === undefined ? { ...BASE, level: 2 } : resumedOverrides(resume, BASE),
		models: (host) => new ScriptedModelSource(residents(host.residents, () => host.minute, prompts)),
		gamemakerModels: () => new ScriptedModelSource({ [GAMEMAKER_ID]: gamemakerSteps() }),
		classifier: boundBackend("scripted/classifier", new ScriptedModelSource({ [CLASSIFIER_ID]: classifierSteps() }).bind(CLASSIFIER_ID, DEFAULT_LIMITS), "off", overseers.classifierRuntime),
		weaver: boundBackend("scripted/weaver", new ScriptedModelSource({ [WEAVER_ID]: weaverSteps() }).bind(WEAVER_ID, DEFAULT_LIMITS), "off", overseers.weaverRuntime),
		sinks: [log],
		...(extra.cut === true
			? {
					snapshot: {
						afterLevel: 2,
						atMinute: CUT,
						stop: true,
						file: "memory",
						write: (snapshot: RunFileOut) => {
							taken = parseResumePoint(JSON.parse(JSON.stringify(snapshot)));
							return "memory";
						},
					},
				}
			: {}),
		...(resume === undefined ? {} : { resume: { point: resume, name: "snapshot-L2-M4.json" } }),
	});
	await run.run();
	return { events: log.events, prompts, ...(taken === undefined ? {} : { snapshot: taken }) };
}

/** Usage lines with the prompt size instead of its cache split; the classifier's and weaver's token counts left out (their prompts carry host seqs, S18-3). */
function comparable(events: readonly RecordedEvent[]): readonly unknown[] {
	return events.map((event) => {
		if (event.type !== "usage") return event;
		if (event.agent === CLASSIFIER_ID || event.agent === WEAVER_ID) return { ...event, input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
		return { ...event, input: event.input + event.cacheRead, cacheRead: 0, cacheWrite: 0 };
	});
}

describe("the weaver on the host", () => {
	it("plays the weaver run as the old engine did, line for line, with A02's rewritten system prompts", async () => {
		const old = await playOld();
		const fresh = await playNew();
		// The gamemaker reads a fate shift's evidence from the host log, so its "(after #n)" is a host number (S18-3); only that number differs.
		const unnumbered = (events: readonly RecordedEvent[]): readonly unknown[] =>
			comparable(events).map((event) => {
				const input: unknown = typeof event === "object" && event !== null ? Reflect.get(event, "input") : undefined;
				return typeof input === "string" && typeof event === "object" ? { ...event, input: input.replace(/\(after #\d+\)/g, "(after #n)") } : event;
			});
		expect(fresh.events.filter((event) => event.type === "fate_shift").length).toBeGreaterThan(3);
		expect(fresh.prompts.length).toBe(MINUTES);
		expect(new Set(fresh.prompts).size).toBeGreaterThan(1);
		expect(fresh.prompts).toEqual(old.prompts);
		expect(fresh.events.some((event) => event.type === "turn_input" && event.inputs.some((input) => input.startsWith("[inner voice]")))).toBe(true);
		expect(unnumbered(fresh.events)).toEqual(unnumbered(old.events));
	}, 120_000);

	it("resumes a weaver run cut at minute 4 from its own run file exactly like the run that was not cut", async () => {
		const whole = await playNew();
		const first = await playNew({ cut: true });
		const snapshot = first.snapshot;
		if (snapshot === undefined) throw new Error("no snapshot was taken");
		expect(snapshot.weaver).toBeDefined();
		const resumed = await playNew({ resume: snapshot });
		const cut = first.events.length - 1;
		const markers = 1 + snapshot.agents;
		expect(resumed.events[cut]).toMatchObject({ type: "run_resumed" });
		const boundary = Number(resumed.events[cut]?.seq);
		const moved = (seq: number, by: number): number => (seq >= boundary + by ? seq - by : seq);
		const shift = (events: readonly RecordedEvent[], by: number): readonly unknown[] =>
			comparable(events).map((event) => {
				if (typeof event !== "object" || event === null) return event;
				const ref: unknown = Reflect.get(event, "ref");
				const evidence: unknown = Reflect.get(event, "evidence");
				// The gamemaker's report names a fate shift's evidence line ("after #441"), also a log number.
				const input: unknown = Reflect.get(event, "input");
				return {
					...event,
					...(typeof input === "string" ? { input: input.replace(/\(after #(\d+)\)/g, (_all, seq: string) => `(after #${String(moved(Number(seq), by))})`) } : {}),
					seq: Number(Reflect.get(event, "seq")) - by,
					...(typeof ref === "number" ? { ref: moved(ref, by) } : {}),
					...(Array.isArray(evidence) ? { evidence: evidence.map((seq: unknown) => (typeof seq === "number" ? moved(seq, by) : seq)) } : {}),
				};
			});
		expect(shift(resumed.events.slice(cut + markers), markers)).toEqual(shift(whole.events.slice(cut), 0));
		// A02's requests after the cut see the same system prompts as in the whole run (the applied shift came back).
		expect(resumed.prompts).toEqual(whole.prompts.slice(whole.prompts.length - resumed.prompts.length));
	}, 120_000);
});
