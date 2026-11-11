/**
 * The JSON files beside `events.jsonl` (`000-run.json`, `usage.json`), as far as the viewer reads
 * them. Untrusted: parsed with Typebox, lenient on fields the viewer does not use, so an older or a
 * newer file still loads.
 */
import { Type, type Static } from "typebox";
import { Check } from "typebox/value";

const Open = { additionalProperties: true } as const;

/** `000-run.json`: the run's header. */
export const RunMetaSchema = Type.Object(
	{
		run: Type.Optional(Type.String()),
		number: Type.Optional(Type.Number()),
		startedAt: Type.Optional(Type.String()),
		provider: Type.Optional(Type.String()),
		model: Type.Optional(Type.String()),
		storyId: Type.Optional(Type.String()),
		kind: Type.Optional(Type.String()),
		title: Type.Optional(Type.String()),
		effective: Type.Optional(Type.Object({ agents: Type.Optional(Type.Number()), minutes: Type.Optional(Type.Number()), seed: Type.Optional(Type.Number()) }, Open)),
		agents: Type.Optional(Type.Array(Type.Object({ agent: Type.String(), provider: Type.Optional(Type.String()), model: Type.Optional(Type.String()) }, Open))),
		/** The serialised story (a level story); a core story's runs leave it out. */
		story: Type.Optional(Type.Unknown()),
		resumedFrom: Type.Optional(Type.Unknown()),
	},
	Open,
);
export type RunMeta = Static<typeof RunMetaSchema>;

const Totals = Type.Object(
	{
		requests: Type.Optional(Type.Number()),
		input: Type.Optional(Type.Number()),
		output: Type.Optional(Type.Number()),
		cacheRead: Type.Optional(Type.Number()),
		cacheWrite: Type.Optional(Type.Number()),
		costUsd: Type.Optional(Type.Number()),
	},
	Open,
);
const PerAgent = Type.Array(Type.Intersect([Totals, Type.Object({ agent: Type.String() }, Open)]));

/** `usage.json`: tokens and cost of the run, in total and per agent, and the reporter's own. */
export const UsageFileSchema = Type.Object(
	{
		totals: Totals,
		perAgent: Type.Optional(PerAgent),
		/** A resumed run: what its prefix cost (the previous run) and what it cost itself. */
		prefix: Type.Optional(Type.Object({ totals: Totals, perAgent: Type.Optional(PerAgent) }, Open)),
		own: Type.Optional(Type.Object({ totals: Totals, perAgent: Type.Optional(PerAgent) }, Open)),
		/** Model per role, e.g. `residents: anthropic/claude-haiku-5-5`. */
		models: Type.Optional(Type.Record(Type.String(), Type.String())),
		reporter: Type.Optional(Type.Intersect([Totals, Type.Object({ model: Type.Optional(Type.String()) }, Open)])),
	},
	Open,
);
export type UsageFile = Static<typeof UsageFileSchema>;

/** Parses a JSON text; `undefined` and a reason when it is not JSON or does not fit. */
export function parseJsonFile<T>(text: string, check: (value: unknown) => value is T): { readonly value: T } | { readonly reason: string } {
	let value: unknown;
	try {
		value = JSON.parse(text);
	} catch {
		return { reason: "not JSON" };
	}
	return check(value) ? { value } : { reason: "not in the expected shape" };
}

export const isRunMeta = (value: unknown): value is RunMeta => Check(RunMetaSchema, value);
export const isUsageFile = (value: unknown): value is UsageFile => Check(UsageFileSchema, value);
export const isAnyJson = (value: unknown): value is unknown => value !== undefined;
