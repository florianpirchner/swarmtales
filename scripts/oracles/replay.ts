/**
 * Replays the tool calls of a recorded live run (`events.jsonl`, the legacy line format) on a fresh host: each
 * resident gets the calls its model made, turn by turn. The agent below behaves towards the host as the live
 * runner did (`HostResidentRunner`): it makes no request on a turn with nothing to read and nothing to answer,
 * and it tells the host whether its context ends with unanswered tool results.
 */
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { Type } from "typebox";
import { Check } from "typebox/value";
import type { Host, ToolOutcome, TurnTaker } from "@swarmtales/contracts";
import { inCatalogOrder, toolsNotice } from "@swarmtales/roles";
import type { OracleSource } from "./format.ts";

const Line = Type.Object({ type: Type.String(), agent: Type.Optional(Type.String()) }, { additionalProperties: true });
const TurnInput = Type.Object({ agent: Type.String(), inputs: Type.Array(Type.String()) }, { additionalProperties: true });
const ToolCall = Type.Object({ agent: Type.String(), tool: Type.String(), args: Type.Optional(Type.Unknown()) }, { additionalProperties: true });
const ToolResult = Type.Object({ agent: Type.String(), text: Type.String() }, { additionalProperties: true });
const RunEnd = Type.Object({ type: Type.Literal("run_end"), reason: Type.Optional(Type.String()) }, { additionalProperties: true });

/** The log's text; a recorded log may be stored gzipped (`events.jsonl.gz`). */
function logText(path: string): string {
	return path.endsWith(".gz") ? gunzipSync(readFileSync(path)).toString("utf8") : readFileSync(path, "utf8");
}

/** Whether the recorded run ended by the game's own end or its minute limit (not stopped from outside). */
export function endedByItself(path: string): boolean {
	const last: unknown = JSON.parse(logText(path).trimEnd().split("\n").at(-1) ?? "null");
	return Check(RunEnd, last) && (last.reason === "referee" || last.reason === "minutes");
}

interface RecordedCall {
	readonly tool: string;
	readonly args: unknown;
	result?: string;
}

interface RecordedTurn {
	readonly inputs: readonly string[];
	readonly calls: RecordedCall[];
}

/** The recorded turns per resident, each with the calls of its one model request and their answers. */
export function recordedTurns(path: string): Map<string, RecordedTurn[]> {
	const turns = new Map<string, RecordedTurn[]>();
	const pending = new Map<string, RecordedCall[]>();
	for (const text of logText(path).split("\n")) {
		if (text.length === 0) continue;
		const line: unknown = JSON.parse(text);
		if (!Check(Line, line)) continue;
		if (line.type === "turn_input" && Check(TurnInput, line)) {
			const list = turns.get(line.agent) ?? [];
			list.push({ inputs: line.inputs, calls: [] });
			turns.set(line.agent, list);
			pending.set(line.agent, []);
		} else if (line.type === "tool_call" && Check(ToolCall, line)) {
			const call: RecordedCall = { tool: line.tool, args: line.args ?? {} };
			turns.get(line.agent)?.at(-1)?.calls.push(call);
			pending.get(line.agent)?.push(call);
		} else if (line.type === "tool_result" && Check(ToolResult, line)) {
			const call = pending.get(line.agent)?.shift();
			if (call !== undefined) call.result = line.text;
		}
	}
	return turns;
}

/** The text a model read for an outcome (`outcomeText` of the live runner). */
function outcomeText(outcome: ToolOutcome): string {
	if (outcome.ok) return outcome.reply;
	return outcome.detail === undefined ? outcome.code : `${outcome.code}: ${outcome.detail}`;
}

export interface ReplayAgent {
	readonly take: TurnTaker;
	readonly awaitsAnswer: (resident: string) => boolean;
	/** Every recorded turn was played and the recording was stopped from outside: nothing is left to replay. */
	readonly done: () => boolean;
	readonly fidelity: () => NonNullable<OracleSource["fidelity"]>;
	/** The first turns whose inputs or answers differ from the recording, for a look. */
	readonly differences: readonly string[];
}

/** An agent that plays the recorded turns of `path` on `host`. */
export function replayAgent(host: Host, path: string): ReplayAgent {
	const turns = recordedTurns(path);
	const awaits = new Set<string>();
	const announced = new Map<string, string>();
	const stats = { turns: 0, turnsWithEqualInputs: 0, calls: 0, callsWithEqualResult: 0 };
	const differences: string[] = [];
	const note = (text: string): void => {
		if (differences.length < 12) differences.push(text);
	};
	const take: TurnTaker = async (turn) => {
		const id = turn.resident;
		if (turn.inputs.some((line) => line.kind === "context-reset")) {
			announced.delete(id);
			awaits.delete(id);
		}
		const open = inCatalogOrder(host.openTools(id));
		const key = open.join(",");
		const notice = key === announced.get(id) || open.length === 0 ? [] : [toolsNotice(open)];
		if (notice.length > 0) announced.set(id, key);
		const texts = [...turn.inputs.map((line) => line.text), ...notice];
		if (texts.length === 0 && !awaits.has(id)) return;
		const recorded = turns.get(id)?.shift();
		if (recorded === undefined) {
			awaits.delete(id);
			return;
		}
		stats.turns++;
		if (recorded.inputs.length === texts.length && recorded.inputs.every((text, index) => text === texts[index])) stats.turnsWithEqualInputs++;
		else note(`minute ${String(turn.minute)} ${id}: inputs differ\n  recorded: ${JSON.stringify(recorded.inputs)}\n  replayed: ${JSON.stringify(texts)}`);
		for (const call of recorded.calls) {
			const outcome = await turn.call(call.tool, call.args);
			stats.calls++;
			if (call.result === outcomeText(outcome)) stats.callsWithEqualResult++;
			else note(`minute ${String(turn.minute)} ${id} ${call.tool}: answer differs\n  recorded: ${JSON.stringify(call.result)}\n  replayed: ${JSON.stringify(outcomeText(outcome))}`);
		}
		if (recorded.calls.length > 0) awaits.add(id);
		else awaits.delete(id);
	};
	const left = (): number => [...turns.values()].reduce((sum, list) => sum + list.length, 0);
	const stopped = !endedByItself(path);
	return { take, awaitsAnswer: (resident) => awaits.has(resident), done: () => stopped && left() === 0, fidelity: () => ({ ...stats, turnsLeft: left() }), differences };
}
