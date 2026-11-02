/**
 * The weaver in a composed run (`--weaver`): scripted residents, classifier,
 * gamemaker and weaver. A01 accuses A02 on the board every minute; the
 * classifier labels it, so A02 is touched every minute and the weaver changes
 * it. Checked: the inner voice at the end of A02's inputs, the rewritten
 * system prompt in A02's requests, the gamemaker's line, `weaver.md`, a
 * snapshot and resume that goes on exactly like the run that is not
 * stopped, and that without the weaver nothing changes.
 */
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { FauxResponseStep } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { describe, expect, it } from "vitest";
import type { Host } from "@swarmtales/contracts";
import { boundBackend, CLASSIFIER_ID, GAMEMAKER_ID, INNER_VOICE_HEAD, overseers, SHIFT_HEADING, WEAVER_ID } from "@swarmtales/roles";
import type { RecordedEvent } from "@swarmtales/legacy-log";
import { WeaverLog, MemorySink } from "@swarmtales/chronicle";
import { act, say, type Script, ScriptedModelSource } from "@swarmtales/models";
import { composeHostRun } from "../../apps/cli/src/host/run.ts";
import { prefixLines, type ResumePoint } from "../../apps/cli/src/host/snapshot.ts";
import { DEFAULT_LIMITS, resumedOverrides, type RunOverrides } from "../../apps/cli/src/run-options.ts";
import cityOfKeys from "../../stories/cityofkeys/story.ts";
import { createHostFixture } from "../helpers/host-fixture.ts";
import { sliceIn, snapshotTaker } from "../helpers/host-snapshot.ts";
import { submit } from "../helpers/host-inspect.ts";

const MINUTES = 8;
const CUT = 4;

function textOf(content: unknown): string {
	if (typeof content === "string") return content;
	return Array.isArray(content) ? content.map((part: unknown) => (typeof part === "object" && part !== null && "text" in part && typeof part.text === "string" ? part.text : "")).join("\n") : "";
}

/** A01 accuses A02 on the board every minute; everyone else waits. A02 notes the system prompt of every request. */
function residents(host: Host, prompts: string[]): Script {
	const script: Record<string, FauxResponseStep[]> = {};
	for (const agent of host.residents) {
		const step: FauxResponseStep = (context) => {
			if (agent === "A02") prompts.push(textOf(context.messages[0]?.content));
			if (agent === "A01" && context.messages.at(-1)?.role !== "toolResult") return act({ name: "postBoard", args: { message: `A02 cheated me at minute ${String(host.minute)}.` } });
			return say(`${agent} waits.`);
		};
		script[agent] = Array.from({ length: MINUTES * 2 }, () => step);
	}
	return script;
}

/** Labels every post of A01 that says "cheated" as an accusation of A02. */
function classifierSteps(): readonly FauxResponseStep[] {
	const step: FauxResponseStep = (context) => {
		const text = textOf(context.messages.findLast((message) => message.role === "user")?.content);
		const items = [...text.matchAll(/^#(\d+) A01 [^\n]*cheated/gm)].map((match) => ({ ref: Number(match[1]), labels: ["accusation"], targets: ["A02"] }));
		return act({ name: "label", args: { items } });
	};
	return Array.from({ length: MINUTES * 2 }, () => step);
}

/** Every third minute a hard change, otherwise an inner voice; a function of the dossier only, so a resumed run gets the same. */
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

interface Played {
	readonly events: readonly RecordedEvent[];
	readonly prompts: readonly string[];
	readonly systemPrompts: readonly string[];
	readonly snapshot?: ResumePoint;
	readonly directory: string;
	/** The weaver's changes as the host logged them: their evidence is in host numbers, as the gamemaker reads it (S18-3). */
	readonly hostShifts: readonly { readonly kind: string; readonly evidence: readonly number[] }[];
}

interface PlayOptions {
	readonly weaver?: boolean;
	readonly classifier?: boolean;
	readonly snapshot?: { readonly stop: boolean };
	readonly resume?: ResumePoint;
}

async function play(options: PlayOptions = {}): Promise<Played> {
	const log = new MemorySink();
	const directory = mkdtempSync(join(tmpdir(), "weaver-"));
	const prompts: string[] = [];
	const base: RunOverrides = {
		minutes: MINUTES,
		names: false,
		activation: "always",
		passesPerMinute: 1,
		stopWhenDone: false,
		stopWhenSeatsDecided: false,
		gamemaker: true,
		classifier: options.classifier ?? true,
		...(options.weaver === true ? { weaver: true } : {}),
	};
	const resume = options.resume;
	const taker = options.snapshot === undefined ? undefined : snapshotTaker({ afterLevel: 2, atMinute: CUT, stop: options.snapshot.stop });
	const run = composeHostRun({
		story: cityOfKeys,
		overrides: resume === undefined ? { ...base, level: 2 } : resumedOverrides(resume, base),
		models: (host) => new ScriptedModelSource(residents(host, prompts)),
		gamemakerModels: () => new ScriptedModelSource({ [GAMEMAKER_ID]: Array.from({ length: MINUTES * 2 }, () => say("Watching.")) }),
		classifier: boundBackend("scripted/classifier", new ScriptedModelSource({ [CLASSIFIER_ID]: classifierSteps() }).bind(CLASSIFIER_ID, DEFAULT_LIMITS), "off", overseers.classifierRuntime),
		...(options.weaver === true ? { weaver: boundBackend("scripted/weaver", new ScriptedModelSource({ [WEAVER_ID]: weaverSteps() }).bind(WEAVER_ID, DEFAULT_LIMITS), "off", overseers.weaverRuntime) } : {}),
		sinks: [log, new WeaverLog(join(directory, "weaver.md"))],
		...(taker === undefined ? {} : { snapshot: taker.request }),
		...(resume === undefined ? {} : { resume: { point: resume, name: "snapshot-M4.json" } }),
	});
	await run.run();
	const systemPrompts = run.host.residents.map((id) => run.residents.runner(id)?.systemPrompt ?? "");
	const snapshot = taker?.taken()?.point;
	const hostShifts = run.host.log.ofType("weaver", "fate_shift").map((event) => Parse(HostShift, event.payload));
	return { events: log.events, prompts, systemPrompts, directory, hostShifts, ...(snapshot === undefined ? {} : { snapshot }) };
}

function ofType<T extends RecordedEvent["type"]>(events: readonly RecordedEvent[], type: T): readonly Extract<RecordedEvent, { type: T }>[] {
	return events.filter((event): event is Extract<RecordedEvent, { type: T }> => event.type === type);
}

/** Events as compared across runs: numbers after the cut moved by the resume's markers, the prompt cache's split ignored. */
function comparable(events: readonly RecordedEvent[], shift = 0, from = Number.POSITIVE_INFINITY): readonly unknown[] {
	const moved = (seq: number): number => (seq > from ? seq - shift : seq);
	return events.map((event) => {
		const seq = event.seq - shift;
		if (event.type === "usage") return { ...event, seq, input: event.input + event.cacheRead, cacheRead: 0, cacheWrite: 0 };
		if (event.type === "interpretation") return { ...event, seq, ref: moved(event.ref) };
		if (event.type === "fate_shift") return { ...event, seq, evidence: event.evidence.map(moved) };
		// The gamemaker's line names the event a change came after.
		if (event.type === "gamemaker_turn") return { ...event, seq, input: event.input.replace(/\(after #(\d+)\)/g, (_, number: string) => `(after #${String(moved(Number(number)))})`) };
		return { ...event, seq };
	});
}

const HostShift = Type.Object({ kind: Type.String(), evidence: Type.Array(Type.Integer()) }, { additionalProperties: true });

/** The acts the progression ended and began (old `world.isActOver`, `world.currentAct`). */
const Acts = Type.Object({ endedActs: Type.Array(Type.Integer()), actStarts: Type.Array(Type.Object({ fromLevel: Type.Integer(), minute: Type.Integer() })) }, { additionalProperties: true });

describe("the weaver in a run", () => {
	it("changes A02 after the accusations: an inner voice at the end of its inputs, a rewritten prompt, a line for the gamemaker", async () => {
		const played = await play({ weaver: true });
		const shifts = ofType(played.events, "fate_shift");
		expect(shifts.length).toBeGreaterThan(2);
		expect(shifts.every((event) => event.agent === "A02")).toBe(true);
		expect(ofType(played.events, "usage").filter((event) => event.agent === WEAVER_ID).length).toBe(shifts.length);

		// The inner voice is the last input of A02's next step.
		const soft = shifts.find((event) => event.kind === "soft");
		if (soft === undefined) throw new Error("no soft change");
		const next = ofType(played.events, "turn_input").find((event) => event.agent === "A02" && event.seq > soft.seq);
		expect(next?.inputs.at(-1)).toBe(`${INNER_VOICE_HEAD}${soft.text}`);
		expect(ofType(played.events, "turn_input").filter((event) => event.inputs.some((input) => input === `${INNER_VOICE_HEAD}${soft.text}`))).toHaveLength(1);

		// The hard change rewrites A02's prompt, and its next request carries it.
		const hard = shifts.find((event) => event.kind === "hard");
		if (hard === undefined) throw new Error("no hard change");
		expect(played.systemPrompts[1]).toContain(`${SHIFT_HEADING}\n${shifts.filter((event) => event.kind === "hard").at(-1)?.text ?? ""}`);
		expect(played.systemPrompts[0]).not.toContain(SHIFT_HEADING);
		expect(played.prompts[0]).not.toContain(SHIFT_HEADING);
		expect(played.prompts.at(-1)).toContain(SHIFT_HEADING);

		// The gamemaker reads what kind of event moved A02, built in code: never the text, never the model's reason.
		const look = ofType(played.events, "gamemaker_turn").find((event) => event.seq > hard.seq);
		expect(hard.triggers).toEqual(["accusation"]);
		// The gamemaker names the evidence by its host number (S18-3): that of the same change in the host's log.
		const hostHard = played.hostShifts.find((shift) => shift.kind === "hard");
		expect(hostHard?.evidence.length).toBe(hard.evidence.length);
		expect(look?.input).toContain(`A02 has changed (hard): after an accusation (after #${String(Math.max(...(hostHard?.evidence ?? [])))})`);
		expect(look?.input).not.toContain(hard.text);
		expect(look?.input).not.toContain(hard.reason);

		// weaver.md lists every change.
		const file = readFileSync(join(played.directory, "weaver.md"), "utf8");
		expect(file).toContain(`## Minute ${String(hard.minute)}: A02, hard change (#${String(hard.seq)})`);
		expect(file.match(/^## Minute/gm)).toHaveLength(shifts.length);
	}, 30_000);

	it("goes on after a snapshot exactly like the run that is not stopped, with the same rewritten prompt", async () => {
		const whole = await play({ weaver: true, snapshot: { stop: false } });
		const first = await play({ weaver: true, snapshot: { stop: true } });
		const snapshot = first.snapshot;
		if (snapshot === undefined) throw new Error("no snapshot was taken");
		expect(snapshot.weaver?.shifts.map((entry) => entry.agent)).toEqual(["A02"]);
		const cut = prefixLines(snapshot);
		expect(comparable(first.events.slice(0, cut))).toEqual(comparable(whole.events.slice(0, cut)));

		const resumed = await play({ weaver: true, resume: snapshot });
		const markers = 1 + snapshot.agents;
		const after = comparable(resumed.events.slice(cut + markers), markers, cut);
		expect(ofType(resumed.events.slice(cut), "fate_shift").length).toBeGreaterThan(0);
		expect(after).toEqual(comparable(whole.events.slice(cut)));
		expect(resumed.systemPrompts).toEqual(whole.systemPrompts);
		// The first request after the resume already carries the change of the run before.
		expect(resumed.prompts[0]).toContain(`${SHIFT_HEADING}\n${snapshot.weaver?.shifts[0]?.text ?? "-"}`);

		// A resume without the weaver keeps who A02 has become, and changes nothing more.
		const plain = await play({ resume: snapshot });
		expect(plain.systemPrompts[1]).toContain(snapshot.weaver?.shifts[0]?.text ?? "-");
		expect(ofType(plain.events.slice(cut), "fate_shift")).toHaveLength(0);
	}, 60_000);

	it("changes nothing without --weaver, and asks nothing when no hard fact touches anyone", async () => {
		const off = await play();
		expect(ofType(off.events, "fate_shift")).toHaveLength(0);
		expect(ofType(off.events, "usage").filter((event) => event.agent === WEAVER_ID)).toHaveLength(0);
		expect(off.systemPrompts.some((prompt) => prompt.includes(SHIFT_HEADING))).toBe(false);

		// Without the classifier no accusation is a fact: the weaver stays silent and the run is the same.
		const quietOn = await play({ weaver: true, classifier: false });
		const quietOff = await play({ classifier: false });
		expect(comparable(quietOn.events)).toEqual(comparable(quietOff.events));
		expect(quietOn.systemPrompts).toEqual(quietOff.systemPrompts);
	}, 60_000);

	it("writes A02's character for Act II once Act I is over, from the act's changes", async () => {
		const fixture = createHostFixture({
			level: 7,
			minutes: 5,
			script: (host) => {
				const script: Record<string, FauxResponseStep[]> = {};
				for (const agent of host.residents) {
					const accuse = act({ name: "postBoard", args: { message: "A02 cheated me." } });
					script[agent] = [...(agent === "A01" ? [accuse] : [say()]), submit(host, agent, 7), ...Array.from({ length: 4 }, () => say())];
				}
				return script;
			},
			classifierScript: classifierSteps(),
			weaverScript: Array.from({ length: 6 }, (): FauxResponseStep => (context) => {
				const text = textOf(context.messages.findLast((message) => message.role === "user")?.content);
				return text.includes("is over.")
					? act({ name: "weave", args: { kind: "hard", text: "You enter the wall alone, and you like it.", reason: "Act I branded you a cheat" } })
					: act({ name: "weave", args: { kind: "hard", text: "You trust no one.", reason: "accused by A01" } });
			}),
		});
		await fixture.run();
		const acts = sliceIn({ host: fixture.host.snapshot() }, "progression", Acts);
		expect(acts.endedActs).toContain(7);
		expect(Math.max(7, ...acts.actStarts.map((start) => start.fromLevel))).toBe(8);
		const shifts = fixture.events("fate_shift");
		expect(shifts.map((event) => event.kind)).toEqual(["hard", "act"]);
		expect(shifts[1]).toMatchObject({ agent: "A02", text: "You enter the wall alone, and you like it.", evidence: [shifts[0]?.seq] });
		expect(fixture.runners()[1]?.systemPrompt).toContain(`${SHIFT_HEADING}\nYou enter the wall alone, and you like it.`);
		expect(fixture.runners()[1]?.systemPrompt).not.toContain("You trust no one.");
	}, 30_000);
});
