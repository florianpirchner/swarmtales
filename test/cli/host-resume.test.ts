/**
 * Run snapshots and resumes on the new host (step 18, items 5 and 6; the old engine's
 * test/snapshot/resume.test.ts on `composeHostRun`):
 *
 * - a scripted City of Keys run with the gamemaker and the classifier, held at the door of level 7
 *   and snapshotted there, logs exactly what the old engine logged for the same run (differential);
 * - resumed from its own snapshot (`swarmtales-run`, through JSON and its schema as a file would go),
 *   it continues exactly like the uninterrupted run;
 * - resumed from the old engine's snapshot file (`agent-arena-snapshot`, converted), it continues
 *   exactly like the old engine resumed from it;
 * - the same seed plays the same run twice.
 */
import type { FauxResponseStep } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import { Check } from "typebox/value";
import { describe, expect, it } from "vitest";
import { parseSnapshot, type RunSnapshot } from "@swarmtales/chronicle";
import type { Host } from "@swarmtales/contracts";
import { MemorySink, type RecordedEvent, type World } from "@swarmtales/engine";
import { act, say, ScriptedModelSource, type Script } from "@swarmtales/models";
import { boundBackend, ChatStatementClassifier, CLASSIFIER_ID, GAMEMAKER_ID, overseers } from "@swarmtales/roles";
import { composeRun, resumeOverrides } from "../../apps/cli/src/compose.ts";
import { composeHostRun } from "../../apps/cli/src/host/run.ts";
import { parseResumePoint, type ResumePoint, type RunFileOut } from "../../apps/cli/src/host/snapshot.ts";
import { DEFAULT_LIMITS, resumedOverrides, type RunOverrides } from "../../apps/cli/src/run-options.ts";
import cityOfKeys from "../../stories/cityofkeys/story.ts";
import { codeOf } from "../golden/host-scripts.ts";

const MINUTES = 26;

/** What a resident's step reads of the city: its minute, its level, whether it is done, its code. */
interface CityView {
	readonly residents: readonly string[];
	minute(): number;
	finished(agent: string): boolean;
	level(agent: string): number;
	code(agent: string, level: number): string;
}

function worldView(world: World): CityView {
	return {
		residents: world.competitors,
		minute: () => world.minute,
		finished: (agent) => world.isFinished(agent),
		level: (agent) => world.levelOf(agent),
		code: (agent, level) => world.inspect.codeOf(agent, level),
	};
}

const Ranking = Type.Object({ ranking: Type.Array(Type.Object({ agent: Type.String(), level: Type.Integer(), finished: Type.Boolean() }, { additionalProperties: true })) }, { additionalProperties: true });

function hostView(host: Host): CityView {
	const row = (agent: string) => {
		const section = host.facts()["progression.section"];
		if (!Check(Ranking, section)) throw new Error("no progression section");
		const entry = section.ranking.find((candidate) => candidate.agent === agent);
		if (entry === undefined) throw new Error(`no ranking row of ${agent}`);
		return entry;
	};
	return {
		residents: host.residents,
		minute: () => host.minute,
		finished: (agent) => row(agent).finished,
		level: (agent) => row(agent).level,
		code: (agent, level) => codeOf(host, agent, level),
	};
}

function textOf(content: string | readonly { readonly type: string; readonly text?: string }[]): string {
	return typeof content === "string" ? content : content.map((part) => part.text ?? "").join("\n");
}

/** Residents that solve their doors but stumble and talk on the way (test/snapshot/resume.test.ts). */
function chattyScript(city: CityView): Script {
	const script: Record<string, FauxResponseStep[]> = {};
	city.residents.forEach((agent, index) => {
		const step: FauxResponseStep = (context) => {
			const minute = city.minute();
			const neighbour = city.residents[(index + 1) % city.residents.length] ?? agent;
			const status = `[status] minute ${String(minute)} · `;
			const steps = context.messages.filter((message) => message.role === "user" && textOf(message.content).includes(status)).length;
			if (steps === 1 || steps === 3) {
				if (city.finished(agent)) return act({ name: "postBoard", args: { message: `${agent} watches at minute ${String(minute)}.` } });
				const level = city.level(agent);
				const code = city.code(agent, level);
				const wrong = (minute + index) % 4 === 0;
				return act({ name: "submitSolution", args: { level, code: wrong ? (code.startsWith("1") ? "2" : "1") + code.slice(1) : code } });
			}
			if (steps === 2) {
				switch ((minute + index) % 4) {
					case 0:
						return act({ name: "sendDM", args: { target: neighbour, message: `Deal? I help you at minute ${String(minute)}.` } });
					case 1:
						return act({ name: "transferPoints", args: { target: neighbour, amount: 1, memo: "a deal" } });
					case 2:
						return act({ name: "createGroup", args: { name: `circle of ${agent}` } });
					default:
						return act({ name: "readBoard", args: {} });
				}
			}
			return say(`${agent} waits.`);
		};
		script[agent] = Array.from({ length: MINUTES * 4 }, () => step);
	});
	return script;
}

/** The gamemaker writes one note a look, to a resident chosen by the minute. */
function gamemakerScript(city: CityView): readonly FauxResponseStep[] {
	const step: FauxResponseStep = (context) => {
		if (context.messages.at(-1)?.role === "toolResult") return say("Done.");
		const agent = city.residents[city.minute() % city.residents.length] ?? "A01";
		return act({ name: "notify", args: { agent, text: `${agent}, the city keeps count.` } });
	};
	return Array.from({ length: MINUTES * 3 }, () => step);
}

/** The classifier labels every statement that offers a deal as an offer. */
function classifierScript(): readonly FauxResponseStep[] {
	const step: FauxResponseStep = (context) => {
		const prompt = context.messages.findLast((message) => message.role === "user");
		const text = typeof prompt?.content === "string" ? prompt.content : "";
		const items = [...text.matchAll(/^#(\d+) (A\d+) [^\n]*Deal\?/gm)].map((match) => ({ ref: Number(match[1]), labels: ["offer"], targets: [] }));
		return act({ name: "label", args: { items } });
	};
	return Array.from({ length: MINUTES * 2 }, () => step);
}

interface Played<S> {
	readonly events: readonly RecordedEvent[];
	readonly snapshot?: S;
}

const BASE: RunOverrides = { minutes: MINUTES, gamemaker: true, classifier: true };

async function playOld(extra: { readonly snapshotAfter?: number; readonly stop?: boolean; readonly resume?: RunSnapshot } = {}): Promise<Played<RunSnapshot>> {
	const log = new MemorySink();
	let taken: RunSnapshot | undefined;
	const resume = extra.resume;
	const run = composeRun({
		story: cityOfKeys,
		overrides: resume === undefined ? BASE : resumeOverrides(resume, BASE),
		models: (world) => new ScriptedModelSource(chattyScript(worldView(world))),
		gamemakerModels: (world) => new ScriptedModelSource({ [GAMEMAKER_ID]: gamemakerScript(worldView(world)) }),
		classifier: () => new ChatStatementClassifier({ binding: new ScriptedModelSource({ [CLASSIFIER_ID]: classifierScript() }).bind(CLASSIFIER_ID, DEFAULT_LIMITS), label: "scripted/classifier", thinking: "off" }),
		sinks: [log],
		meta: { run: resume === undefined ? "first" : "resumed" },
		...(extra.snapshotAfter === undefined
			? {}
			: {
					snapshot: {
						afterLevel: extra.snapshotAfter,
						stop: extra.stop ?? false,
						write: (snapshot) => {
							taken = parseSnapshot(JSON.parse(JSON.stringify(snapshot)));
							return "memory";
						},
					},
				}),
		...(resume === undefined ? {} : { resume: { snapshot: resume, name: "snapshot-L7.json" } }),
	});
	await run.arena.run();
	return { events: log.events, ...(taken === undefined ? {} : { snapshot: taken }) };
}

async function playNew(extra: { readonly snapshotAfter?: number; readonly stop?: boolean; readonly resume?: ResumePoint } = {}): Promise<Played<ResumePoint>> {
	const log = new MemorySink();
	let taken: ResumePoint | undefined;
	const resume = extra.resume;
	const run = composeHostRun({
		story: cityOfKeys,
		overrides: resume === undefined ? BASE : resumedOverrides(resume, BASE),
		models: (host) => new ScriptedModelSource(chattyScript(hostView(host))),
		gamemakerModels: (host) => new ScriptedModelSource({ [GAMEMAKER_ID]: gamemakerScript(hostView(host)) }),
		classifier: boundBackend("scripted/classifier", new ScriptedModelSource({ [CLASSIFIER_ID]: classifierScript() }).bind(CLASSIFIER_ID, DEFAULT_LIMITS), "off", overseers.classifierRuntime),
		sinks: [log],
		meta: { run: resume === undefined ? "first" : "resumed" },
		...(extra.snapshotAfter === undefined
			? {}
			: {
					snapshot: {
						afterLevel: extra.snapshotAfter,
						stop: extra.stop ?? false,
						file: "memory",
						write: (snapshot: RunFileOut) => {
							// Through JSON and the schema, as a file would go.
							taken = parseResumePoint(JSON.parse(JSON.stringify(snapshot)));
							return "memory";
						},
					},
				}),
		...(resume === undefined ? {} : { resume: { point: resume, name: "snapshot-L7.json" } }),
	});
	await run.run();
	return { events: log.events, ...(taken === undefined ? {} : { snapshot: taken }) };
}

/**
 * Events as compared across runs and processes: with the prompt size instead of its split into
 * input and cache tokens, since the scripted provider's prompt cache starts cold in a new run.
 */
function comparable(events: readonly RecordedEvent[]): readonly unknown[] {
	return events.map((event) => {
		if (event.type !== "usage") return event;
		// The classifier reads the host log's numbers (S18-3), so its prompt and answer differ from the old in digits: its token counts are not compared.
		if (event.agent === CLASSIFIER_ID) return { ...event, input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
		return { ...event, input: event.input + event.cacheRead, cacheRead: 0, cacheWrite: 0 };
	});
}

describe("run snapshots on the host", () => {
	it("plays the held run and its snapshot after level 7 as the old engine did, line for line", async () => {
		const old = await playOld({ snapshotAfter: 7 });
		const fresh = await playNew({ snapshotAfter: 7 });
		expect(fresh.events.length).toBeGreaterThan(1000);
		expect(fresh.events.filter((event) => event.type === "interpretation").length).toBeGreaterThan(0);
		expect(fresh.events.filter((event) => event.type === "gamemaker_note").length).toBeGreaterThan(0);
		expect(fresh.snapshot?.round).toBe(old.snapshot?.round);
		expect(comparable(fresh.events)).toEqual(comparable(old.events));
	}, 120_000);

	it("resumes its own snapshot so that the run continues exactly like the uninterrupted one", async () => {
		const whole = await playNew({ snapshotAfter: 7 });
		const first = await playNew({ snapshotAfter: 7, stop: true });
		const snapshot = first.snapshot;
		if (snapshot === undefined) throw new Error("no snapshot was taken");
		expect(first.events.at(-1)).toMatchObject({ type: "run_end", reason: "snapshot after level 7 written to memory; stopped there" });
		expect(snapshot.competitors.every((entry) => entry.messages.length > 0)).toBe(true);
		const resumed = await playNew({ resume: snapshot });
		const cut = first.events.length - 1;
		// The prefix is the first run's up to its end line, then `run_resumed` and the profiles at the snapshot's minute.
		expect(resumed.events.slice(0, cut)).toEqual(first.events.slice(0, cut));
		const markers = 1 + snapshot.agents;
		expect(resumed.events[cut]).toMatchObject({ type: "run_resumed", snapshot: "snapshot-L7.json", level: 7, round: snapshot.round, minute: snapshot.minute });
		expect(resumed.events.slice(cut + 1, cut + markers).map((event) => event.type)).toEqual(Array.from({ length: snapshot.agents }, () => "agent_profile"));
		// The markers move every later line by `markers`, also the lines a classifier verdict points at (`ref`).
		const boundary = Number(resumed.events[cut]?.seq);
		const moved = (seq: number, by: number): number => (seq >= boundary + by ? seq - by : seq);
		const shift = (events: readonly RecordedEvent[], by: number): readonly unknown[] =>
			comparable(events).map((event) => {
				if (typeof event !== "object" || event === null) return event;
				const ref: unknown = Reflect.get(event, "ref");
				return { ...event, seq: Number(Reflect.get(event, "seq")) - by, ...(typeof ref === "number" ? { ref: moved(ref, by) } : {}) };
			});
		const after = shift(resumed.events.slice(cut + markers), markers);
		expect(after.length).toBeGreaterThan(200);
		expect(after).toEqual(shift(whole.events.slice(cut), 0));
	}, 120_000);

	it("resumes the old engine's snapshot file as the old engine resumed it", async () => {
		const first = await playOld({ snapshotAfter: 7, stop: true });
		const snapshot = first.snapshot;
		if (snapshot === undefined) throw new Error("no snapshot was taken");
		const old = await playOld({ resume: snapshot });
		const fresh = await playNew({ resume: parseResumePoint(JSON.parse(JSON.stringify(snapshot))) });
		expect(fresh.events.length).toBeGreaterThan(snapshot.events.length + 200);
		expect(comparable(fresh.events)).toEqual(comparable(old.events));
	}, 120_000);

	it("plays the same run twice for the same seed", async () => {
		const once = await playNew();
		const twice = await playNew();
		expect(once.events.length).toBeGreaterThan(1000);
		expect(twice.events).toEqual(once.events);
	}, 120_000);
});
