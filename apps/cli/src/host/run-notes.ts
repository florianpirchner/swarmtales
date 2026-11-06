/**
 * Two numbers that decide whether a model comparison can be trusted, read back from a run's `events.jsonl`:
 * the turns that ended at the output cap (a thinking model that spent the whole cap inside its thinking makes no tool
 * call, P94) and the moves a team forfeited. Printed at the end of a core-story run.
 */
import { existsSync, readFileSync } from "node:fs";

export interface RunNotes {
	readonly cappedTurns: number;
	readonly forfeits: number;
}

/** Counts `usage` events whose output reached the cap and events named `*forfeit*`; malformed lines are skipped. */
export function readRunNotes(eventsFile: string, outputCap: number): RunNotes {
	if (!existsSync(eventsFile)) return { cappedTurns: 0, forfeits: 0 };
	let cappedTurns = 0;
	let forfeits = 0;
	for (const line of readFileSync(eventsFile, "utf8").split("\n")) {
		if (line === "") continue;
		let event: unknown;
		try {
			event = JSON.parse(line);
		} catch {
			continue;
		}
		if (typeof event !== "object" || event === null) continue;
		const type: unknown = Reflect.get(event, "type");
		if (type === "usage") {
			const output: unknown = Reflect.get(event, "output");
			if (typeof output === "number" && output >= outputCap * 0.99) cappedTurns += 1;
		} else if (typeof type === "string" && type.includes("forfeit")) forfeits += 1;
	}
	return { cappedTurns, forfeits };
}

/** The line printed under the cost: say plainly when a run is clean. */
export function describeRunNotes(notes: RunNotes, outputCap: number): string {
	if (notes.cappedTurns === 0 && notes.forfeits === 0) return "no turn at the output cap, no forfeited move";
	return `${String(notes.cappedTurns)} turns ended at the output cap of ${String(outputCap)} tokens, ${String(notes.forfeits)} forfeited moves`;
}
