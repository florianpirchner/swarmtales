// SPDX-License-Identifier: Apache-2.0
/**
 * From a Director's firing to the line that fired it. No payload holds a place on the log (decision A34): the
 * reply of a Director's `take` lists each firing with its number `n`, its tick, its event and its payload, and the
 * record `asked` cites the numbers. This file finds the line: the line of that tick with that type and payload.
 */
import { canonicalJson } from "@swarmtales/chain";
import type { Envelope } from "@swarmtales/contracts";
import { Type, type Static } from "typebox";
import { Check } from "typebox/value";

/**
 * The canonical name of the tool a Director takes its firings with.
 *
 * @public
 */
export const TAKE_TOOL = "@swarmtales/sdk/directors/take";

const TakenSchema = Type.Object(
	{
		firings: Type.Array(
			Type.Object({ n: Type.Integer({ description: "The number of the firing" }), tick: Type.Integer({ description: "The tick of the event" }), event: Type.String({ description: "`<plugin id>.<event type>`" }), payload: Type.Unknown({ description: "The payload of the event" }) }, { description: "One firing" }),
			{ description: "The firings, in log order" },
		),
	},
	{ description: "The reply of a Director's `take`, as far as it names firings" },
);
const ReplySchema = Type.Object({ reply: Type.String({ description: "The reply text" }) }, { description: "The payload of `tool_result`, as far as it is read here" });

/**
 * One firing of a Director with the lines it belongs to.
 *
 * @public
 */
export interface FoundFiring {
	/** The actor id of the Director (`director:warden`): the actor of its record `asked`. */
	readonly director: string;
	/** The number of the firing among the firings of this Director, from 1: what `asked.firings` holds. */
	readonly n: number;
	/** The tick of the event that fired. */
	readonly tick: number;
	/** The trigger, `<plugin id>.<event type>`. */
	readonly event: string;
	/** The payload of the event that fired. */
	readonly payload: unknown;
	/** The seq of the `tool_result` of `take` that lists the firing. */
	readonly taken: number;
	/** The seq of the line that fired; absent when the log does not hold it. */
	readonly trigger?: number;
}

// The reply of a `take` that answered: the firings it lists; any other line has none.
function takenBy(line: Envelope): Static<typeof TakenSchema>["firings"] {
	if (line.type !== "tool_result" || line.tool !== TAKE_TOOL || !Check(ReplySchema, line.payload)) return [];
	try {
		const value: unknown = JSON.parse(line.payload.reply);
		return Check(TakenSchema, value) ? value.firings : [];
	} catch {
		return [];
	}
}

// What a trigger names a line by: its tick and `<plugin id>.<event type>`; the plugin id ends the canonical source.
const nameOf = (line: Envelope): string => `${String(line.tick)} ${line.source.slice(line.source.lastIndexOf("/") + 1)}.${line.type}`;

/**
 * Finds, for every firing a Director took, the line of the log that fired it.
 *
 * The way from `asked.firings[i]` to the trigger: take the entry whose `director` is the actor of the `asked` line
 * and whose `n` is `asked.firings[i]`; its `trigger` is the seq. The line is the one of the firing's tick whose
 * source ends in the plugin id, whose type is the event type and whose payload equals the firing's payload
 * (compared as canonical JSON). Lines of one tick with the same type and payload are told apart by their order:
 * `n` counts in log order, so the k-th such firing of a Director is the k-th such line.
 *
 * @param log - The lines of a run, in log order (`events.jsonl`, parsed).
 * @returns The firings in the order the Directors took them.
 * @example
 * ```ts
 * const found = findFirings(log).find((firing) => firing.director === asked.actor && firing.n === 1);
 * console.log(`asked #${String(asked.seq)}, fired by #${String(found?.trigger)}`);
 * ```
 *
 * @public
 */
export function findFirings(log: readonly Envelope[]): readonly FoundFiring[] {
	const lines = new Map<string, Envelope[]>();
	const used = new Map<string, number>();
	const found: FoundFiring[] = [];
	for (const line of log) {
		for (const firing of takenBy(line)) {
			const payload = canonicalJson(firing.payload);
			const key = `${line.actor} ${String(firing.tick)} ${firing.event} ${payload}`;
			const rank = used.get(key) ?? 0;
			used.set(key, rank + 1);
			const trigger = (lines.get(`${String(firing.tick)} ${firing.event}`) ?? []).filter((candidate) => canonicalJson(candidate.payload) === payload)[rank]?.seq;
			found.push({ director: line.actor, ...firing, taken: line.seq, ...(trigger === undefined ? {} : { trigger }) });
		}
		const name = nameOf(line);
		const same = lines.get(name);
		if (same === undefined) lines.set(name, [line]);
		else same.push(line);
	}
	return found;
}
