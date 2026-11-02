/**
 * Test harness on the new host (step 18): a composed run (`composeHostRun`) with scripted
 * residents, the successor of `fixture.ts` on the old `World`.
 *
 * The script receives the host so tests can look up fragments and codes through the host's facts
 * (white-box tests). Defaults differ from the story on purpose: every resident is activated each
 * minute and a minute has one pass (one model call each), so a script reads as "one message per
 * minute".
 */
import type { FauxResponseStep } from "@earendil-works/pi-ai";
import type { EventSink, RecordedEvent } from "@swarmtales/legacy-log";
import type { AnyStory, GuardJudge, Host } from "@swarmtales/contracts";
import { MemorySink } from "@swarmtales/chronicle";
import { type Script, ScriptedModelSource } from "@swarmtales/models";
import { boundBackend, GAMEMAKER_ID, overseers, type HostResidentRunner } from "@swarmtales/roles";
import { composeHostRun, type HostComposedRun, type HostComposeOptions } from "../../apps/cli/src/host/run.ts";
import { DEFAULT_LIMITS, type RunOverrides } from "../../apps/cli/src/run-options.ts";
import cityOfKeys from "../../stories/cityofkeys/story.ts";

export { act, say } from "@swarmtales/models";

export interface HostFixtureOptions extends RunOverrides {
	readonly story?: AnyStory;
	readonly script: (host: Host) => Script;
	readonly sinks?: readonly EventSink[];
	/** Scripted responses of the story's gamemaker; plays without one when omitted. */
	readonly gamemakerScript?: (host: Host) => readonly FauxResponseStep[];
	/** Scripted responses of the statement classifier, one per batch; plays without one when omitted. */
	readonly classifierScript?: readonly FauxResponseStep[];
	/** Scripted verdicts of the judge, one per question; plays without a judge (the judge is absent) when omitted. */
	readonly judgeScript?: readonly FauxResponseStep[];
	/** The tool guards' judge (SPEC 20); a story's guards run only the city's own check when omitted. */
	readonly guardJudge?: GuardJudge;
	/** Scripted answers of the weaver (`--weaver`), one per question; plays without it when omitted. */
	readonly weaverScript?: readonly FauxResponseStep[];
	readonly promptAddenda?: HostComposeOptions["promptAddenda"];
	/** Whether the run counts its spend against `--budget` (the CLI's `budget`). */
	readonly budget?: boolean;
	readonly resume?: HostComposeOptions["resume"];
	readonly snapshot?: HostComposeOptions["snapshot"];
	readonly meta?: HostComposeOptions["meta"];
}

export interface BoardPostLine {
	readonly seq: number;
	readonly author: string;
	readonly text: string;
	readonly minute: number;
	readonly kind: Extract<RecordedEvent, { type: "board_post" }>["kind"];
}

export interface HostFixture extends HostComposedRun {
	readonly log: MemorySink;
	/** Each resident's runner, in roster order (old `ComposedRun.runners`). */
	runners(): readonly HostResidentRunner[];
	/** The board's posts, from the log's `board_post` lines (old `world.board.all()`). */
	boardPosts(): readonly BoardPostLine[];
	toolResults(agent: string, tool: string): readonly string[];
	inputsOf(agent: string): readonly string[];
	events<T extends RecordedEvent["type"]>(type: T): readonly Extract<RecordedEvent, { type: T }>[];
}

/**
 * Mechanics tests often play with fewer residents than the story's survivor count, which the
 * validator rejects (SPEC 1: only `survivors` of `agents` remain). Lower the survivor count so such
 * runs stay scarce.
 */
function scarceFor(story: AnyStory, agents: number | undefined): AnyStory {
	if (agents === undefined || agents < 2 || story.run.survivors < agents) return story;
	return { ...story, run: { ...story.run, survivors: agents - 1 } };
}

const scripted = (id: string, steps: readonly FauxResponseStep[]) => new ScriptedModelSource({ [id]: steps }).bind(id, DEFAULT_LIMITS);

export function createHostFixture(options: HostFixtureOptions): HostFixture {
	const log = new MemorySink();
	const { story, script, sinks, gamemakerScript, classifierScript, judgeScript, weaverScript, guardJudge, promptAddenda, budget, resume, snapshot, meta, ...overrides } = options;
	const composed = composeHostRun({
		story: scarceFor(story ?? cityOfKeys, overrides.agents),
		overrides: {
			names: false,
			activation: "always",
			passesPerMinute: 1,
			stopWhenDone: false,
			stopWhenSeatsDecided: false,
			gamemaker: gamemakerScript !== undefined,
			classifier: classifierScript !== undefined,
			weaver: weaverScript !== undefined,
			...overrides,
		},
		models: (host) => new ScriptedModelSource(script(host)),
		sinks: [log, ...(sinks ?? [])],
		...(gamemakerScript === undefined ? {} : { gamemakerModels: (host: Host) => new ScriptedModelSource({ [GAMEMAKER_ID]: gamemakerScript(host) }) }),
		...(classifierScript === undefined ? {} : { classifier: boundBackend("scripted/classifier", scripted("CL", classifierScript), "off", overseers.classifierRuntime) }),
		...(judgeScript === undefined ? {} : { judge: boundBackend("scripted/judge", scripted("JD", judgeScript), "off", overseers.judgeRuntime) }),
		...(weaverScript === undefined ? {} : { weaver: boundBackend("scripted/weaver", scripted("WV", weaverScript), "off", overseers.weaverRuntime) }),
		...(guardJudge === undefined ? {} : { guardJudge }),
		...(promptAddenda === undefined ? {} : { promptAddenda }),
		...(budget === undefined ? {} : { budget }),
		...(resume === undefined ? {} : { resume }),
		...(snapshot === undefined ? {} : { snapshot }),
		...(meta === undefined ? {} : { meta }),
	});
	return {
		...composed,
		log,
		runners: () => composed.host.residents.flatMap((id) => composed.residents.runner(id) ?? []),
		boardPosts: () => log.ofType("board_post").map((event) => ({ seq: event.postSeq, author: event.author, text: event.text, minute: event.minute, kind: event.kind })),
		toolResults: (agent, tool) =>
			log
				.ofType("tool_result")
				.filter((event) => event.agent === agent && event.tool === tool)
				.map((event) => event.text),
		inputsOf: (agent) =>
			log
				.ofType("turn_input")
				.filter((event) => event.agent === agent)
				.flatMap((event) => event.inputs),
		events: (type) => log.ofType(type),
	};
}
