// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The ids an oracle file holds, read under the names this platform gave them (`13-m6-spec.md` 4.3): the files stay
 * byte-equal to the old platform, so a renamed mechanic or game is mapped when the file is read for a comparison.
 */
import type { Oracle, OracleEntry } from "./format.ts";

/** From the id a file holds to the id on this platform. */
type Ids = Readonly<Record<string, string>>;

// An id, or a name that starts with an id and a dot (an event type `<id>.<event>`, a fact `<id>.match`).
function mappedId(value: string, ids: Ids): string {
	if (Object.hasOwn(ids, value)) return ids[value] ?? value;
	const dot = value.indexOf(".");
	const head = value.slice(0, dot);
	return dot > 0 && Object.hasOwn(ids, head) ? `${ids[head] ?? head}${value.slice(dot)}` : value;
}

// The source of an input line may join the sources of several mechanics with `+`.
const mappedSource = (source: string, ids: Ids): string => source.split("+").map((part) => mappedId(part, ids)).join("+");

// Every string of a value that is an id, or starts with one and a dot; keys are kept.
function mappedDeep(value: unknown, ids: Ids): unknown {
	if (typeof value === "string") return mappedId(value, ids);
	if (Array.isArray(value)) return value.map((item: unknown) => mappedDeep(item, ids));
	if (typeof value !== "object" || value === null) return value;
	return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, mappedDeep(item, ids)]));
}

function mappedEntry(entry: OracleEntry, ids: Ids): OracleEntry {
	if (entry.k === "event") return { ...entry, source: mappedSource(entry.source, ids), payload: mappedDeep(entry.payload, ids) };
	if (entry.k === "turn") return { ...entry, inputs: entry.inputs.map((input) => ({ ...input, source: mappedSource(input.source, ids) })) };
	return entry;
}

/**
 * The oracle with every renamed id it holds mapped: the event sources and the sources of input lines, the strings of
 * event payloads that are an id or a name `<id>.<...>`, the mechanic ids of `setup.mechanics[]` and the strings of
 * their options, the game id `setup.story`, the fact of the end and the keys of `counts.events`. Texts (inputs,
 * replies, details) and the params of calls are left as they are.
 *
 * @param oracle - The oracle as the file holds it.
 * @param ids - From the id the file holds to the id on this platform; `undefined` or empty leaves the oracle as it is.
 * @returns The mapped oracle.
 */
export function renamedOracle(oracle: Oracle, ids: Ids | undefined): Oracle {
	if (ids === undefined || Object.keys(ids).length === 0) return oracle;
	const { setup, end, counts } = oracle;
	return {
		...oracle,
		setup: { ...setup, story: mappedId(setup.story, ids), mechanics: setup.mechanics.map((mechanic) => ({ id: mappedId(mechanic.id, ids), options: mappedDeep(mechanic.options, ids) })) },
		...(end === undefined ? {} : { end: { ...end, ...(end.limit === undefined ? {} : { limit: mappedId(end.limit, ids) }) } }),
		counts: { ...counts, events: Object.fromEntries(Object.entries(counts.events).map(([key, count]) => [mappedId(key, ids), count])) },
		timeline: oracle.timeline.map((entry) => mappedEntry(entry, ids)),
	};
}
