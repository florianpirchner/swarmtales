/**
 * Test harness: a composed run with scripted competitors.
 *
 * The script receives the world so tests can look up fragments and
 * passwords (white-box tests). Defaults differ from the story on purpose:
 * every competitor is activated each round and a minute has one pass (one
 * model call each), so a script reads as "one message per minute".
 */
import type { AssistantMessage, FauxResponseStep } from "@earendil-works/pi-ai";
import { composeRun, DEFAULT_LIMITS, type ComposedRun, type RunOverrides } from "../../src/cli/compose.ts";
import { ChatStatementClassifier, CLASSIFIER_ID } from "../../src/interpret/classifier.ts";
import { ChatDeliveryJudge, JUDGE_ID, type DeliveryJudge } from "../../src/interpret/judge.ts";
import { MemorySink, type EventSink, type RecordedEvent } from "../../src/engine/events.ts";
import type { World } from "../../src/engine/world.ts";
import { GAMEMASTER_ID } from "../../src/gamemaster/gamemaster.ts";
import { ScriptedModelSource, type Script } from "../../src/model/source.ts";
import nexus from "../../stories/nexus/story.ts";
import type { AnyStory } from "../../src/story/types.ts";

import { act } from "../../src/model/scripted.ts";

export { act, say } from "../../src/model/scripted.ts";

export interface FixtureOptions extends RunOverrides {
	readonly story?: AnyStory;
	readonly script: (world: World) => Script;
	readonly sinks?: readonly EventSink[];
	readonly budgetSpent?: () => number;
	/** Scripted responses of the story's game master; plays without one when omitted. */
	readonly gamemasterScript?: (world: World) => readonly FauxResponseStep[];
	/** Scripted responses of the statement classifier, one per round with statements; plays without one when omitted. */
	readonly classifierScript?: (world: World) => readonly FauxResponseStep[];
	/** The city's judge for `blame`; plays without one (the judge is absent) when omitted. */
	readonly judge?: DeliveryJudge;
	/** Scripted verdicts of a chat judge, one per question; an alternative to `judge`. */
	readonly judgeScript?: readonly FauxResponseStep[];
}

export interface Fixture extends ComposedRun {
	readonly log: MemorySink;
	run(): Promise<void>;
	toolResults(agent: string, tool: string): readonly string[];
	inputsOf(agent: string): readonly string[];
	events<T extends RecordedEvent["type"]>(type: T): readonly Extract<RecordedEvent, { type: T }>[];
}

export function createFixture(options: FixtureOptions): Fixture {
	const log = new MemorySink();
	const { story, script, sinks, budgetSpent, gamemasterScript, classifierScript, judge, judgeScript, ...overrides } = options;
	const cityJudge =
		judge ??
		(judgeScript === undefined
			? undefined
			: new ChatDeliveryJudge({ binding: new ScriptedModelSource({ [JUDGE_ID]: judgeScript }).bind(JUDGE_ID, DEFAULT_LIMITS), label: "scripted/judge", thinking: "off" }));
	const composed = composeRun({
		story: scarceFor(story ?? nexus, overrides.agents),
		overrides: { names: false, activation: "always", passesPerMinute: 1, stopWhenDone: false, stopWhenSeatsDecided: false, gamemaster: gamemasterScript !== undefined, classifier: classifierScript !== undefined, ...overrides },
		models: (world) => new ScriptedModelSource(script(world)),
		sinks: [log, ...(sinks ?? [])],
		...(cityJudge === undefined ? {} : { judge: cityJudge }),
		...(budgetSpent === undefined ? {} : { budget: { spentUsd: budgetSpent } }),
		...(gamemasterScript === undefined ? {} : { gamemasterModels: (world: World) => new ScriptedModelSource({ [GAMEMASTER_ID]: gamemasterScript(world) }) }),
		...(classifierScript === undefined
			? {}
			: {
					classifier: (world: World) =>
						new ChatStatementClassifier({
							binding: new ScriptedModelSource({ [CLASSIFIER_ID]: classifierScript(world) }).bind(CLASSIFIER_ID, DEFAULT_LIMITS),
							label: "scripted/classifier",
							thinking: "off",
						}),
				}),
	});
	return {
		...composed,
		log,
		run: () => composed.arena.run(),
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

/**
 * Mechanics tests often play with fewer competitors than the story's
 * survivor count, which the validator rejects (SPEC 1: only `survivors` of
 * `agents` remain). Lower the survivor count so such runs stay scarce.
 */
function scarceFor(story: AnyStory, agents: number | undefined): AnyStory {
	if (agents === undefined || agents < 2 || story.run.survivors < agents) return story;
	return { ...story, run: { ...story.run, survivors: agents - 1 } };
}

/** Same length as the password but certainly wrong. */
export function wrongCodeOf(password: string): string {
	return (password.startsWith("A") ? "B" : "A") + password.slice(1);
}

/** One assistant message that submits the competitor's own solution (password or code) for `level`. */
export function submit(world: World, agent: string, level: number): AssistantMessage {
	return act({ name: "submitSolution", args: { level, code: world.inspect.codeOf(agent, level) } });
}

/** Every competitor submits its own solution, one level per minute. */
export function solveEveryLevel(world: World, levels: readonly number[]): Script {
	const script: Record<string, AssistantMessage[]> = {};
	for (const id of world.competitors) script[id] = levels.map((level) => submit(world, id, level));
	return script;
}
