/**
 * Building blocks for scripted (offline) competitors.
 *
 * Tests script every response explicitly. The CLI's `--provider scripted`
 * uses {@link oracleScript}: competitors that read the solution from the
 * world's observer view and submit it, so a full run can be exercised
 * without a model or API key.
 */
import {
	fauxAssistantMessage,
	fauxText,
	fauxToolCall,
	type AssistantMessage,
	type FauxResponseStep,
	type JsonObject,
} from "@earendil-works/pi-ai";
import type { CompetitorId } from "@swarmtales/kernel";
import type { Script } from "./source.ts";

export interface ToolInvocation {
	readonly name: string;
	readonly args?: JsonObject;
}

/** One assistant message with tool calls (executed sequentially). */
export function act(...calls: readonly ToolInvocation[]): AssistantMessage {
	return fauxAssistantMessage(calls.map((call) => fauxToolCall(call.name, call.args ?? {})));
}

/** One assistant message without tool calls; it ends the activation. */
export function say(text = "I wait for the next clue."): AssistantMessage {
	return fauxAssistantMessage(fauxText(text));
}

/** The observer view an oracle competitor needs. */
export interface OracleView {
	/** Current level and its solution, or `undefined` when nothing is left to solve. */
	solutionFor(agent: CompetitorId): { readonly level: number; readonly code: string } | undefined;
}

/**
 * Every competitor submits its current solution once per activation and then
 * ends the activation. `steps` bounds the number of model calls per agent.
 */
export function oracleScript(agents: readonly CompetitorId[], view: () => OracleView, steps: number): Script {
	const script: Partial<Record<CompetitorId, readonly FauxResponseStep[]>> = {};
	for (const agent of agents) {
		script[agent] = Array.from({ length: steps }, (): FauxResponseStep => (context) => {
			const last = context.messages.at(-1);
			if (last?.role === "toolResult") return say("Submitted. Waiting for the next minute.");
			const solution = view().solutionFor(agent);
			if (solution === undefined) return say("Nothing left to solve. Watching the city.");
			return act({ name: "submitSolution", args: { level: solution.level, code: solution.code } });
		});
	}
	return script;
}
