/** Scripted agents and runs for offline tests of the new core: no model, only the virtual minute and the resident. */
import type { EventEnvelope, Host, RunEnd, ToolOutcome, Turn, TurnTaker } from "@swarmtales/contracts";
import { createHost, type HostOptions } from "@swarmtales/kernel";

export interface PlannedCall {
	readonly tool: string;
	readonly params: unknown;
}

/** What a resident does in a turn, decided from the turn alone (deterministic by construction). */
export type Plan = (turn: Turn) => readonly PlannedCall[];

export interface CallRecord {
	readonly minute: number;
	readonly resident: string;
	readonly tool: string;
	readonly outcome: ToolOutcome;
}

/** An agent that makes the planned calls one after the other; `record` collects every outcome. */
export function scriptedAgent(plan: Plan, record?: CallRecord[]): TurnTaker {
	return async (turn) => {
		for (const call of plan(turn)) {
			const outcome = await turn.call(call.tool, call.params);
			record?.push({ minute: turn.minute, resident: turn.resident, tool: call.tool, outcome });
		}
	};
}

/** An agent that does nothing. */
export const idleAgent: TurnTaker = () => Promise.resolve();

export interface StoryRun {
	readonly host: Host;
	readonly end: RunEnd;
	readonly events: readonly EventEnvelope[];
}

/** Creates a host, starts it and plays to the end. */
export async function playStory(options: HostOptions, agent: TurnTaker): Promise<StoryRun> {
	const host = createHost(options);
	if (options.resume === undefined) host.start();
	const end = await host.run(agent);
	return { host, end, events: host.log.all() };
}

/** Creates and starts a host and plays `minutes` minutes (fewer when the run ends earlier). */
export async function playMinutes(options: HostOptions, agent: TurnTaker, minutes: number): Promise<Host> {
	const host = createHost(options);
	host.start();
	for (let played = 0; played < minutes; played++) {
		if ((await host.playMinute(agent)) !== undefined) break;
	}
	return host;
}
