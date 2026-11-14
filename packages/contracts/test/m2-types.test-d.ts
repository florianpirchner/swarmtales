// SPDX-License-Identifier: Apache-2.0
/**
 * The type test of the M2 contracts (M2 specification, 2.3 to 2.6). `tsc -b` compiles this file; nothing here runs.
 * It shows three things: the static type of each new schema is the type the specification names; every addition to
 * an interface that the kernel, the sdk or the engine implements or builds is optional, so a value of M1 still
 * fits; and a hand-written implementer of each new interface fits. The lines that must not compile show that the
 * comparisons are strict.
 */
import type { Static } from "typebox";
import type { JsonValue } from "../src/values.ts";
import type { GameData, ModelChoice, ModelChoiceSchema } from "../src/game/index.ts";
import { KERNEL_EVENTS, type Envelope, type EventSink, type KernelDefinition, type KernelPorts, type RecordSource, type RunLimit } from "../src/kernel/index.ts";
import type { MetricDefinition, RunManifest } from "../src/run/index.ts";

/** The type with `readonly` on every property and every list, at every depth. A JSON value is readonly already. */
type Frozen<T> = JsonValue extends T ? T : T extends object ? { readonly [K in keyof T]: Frozen<T[K]> } : T;

/** True when the two types are the same type, not only assignable to each other. */
type Same<A, B> = (<T>(probe: T) => T extends Frozen<A> ? 1 : 2) extends <T>(probe: T) => T extends Frozen<B> ? 1 : 2 ? true : false;

/** Compiles only for `true`. */
type Holds<T extends true> = T;

/** The keys of `T` that may be left out. */
type OptionalKeys<T> = { [K in keyof T]-?: Partial<Pick<T, K>> extends Pick<T, K> ? K : never }[keyof T];

/** A model choice, as 2.4 writes it. */
interface ExpectedModelChoice {
	id: string;
	thinking?: "off" | "minimal" | "low" | "medium" | "high";
	maxOutputTokens?: number;
}

/** The model of an actor in the manifest, as 2.5 writes it. */
interface ExpectedManifestModel {
	provider: string;
	requestedId: string;
	resolvedId: string;
	params: { temperature: number | "provider-default"; topP: number | "provider-default"; maxOutputTokens: number | "provider-default"; thinking: string };
	pricing: string;
}

type ManifestModel = NonNullable<RunManifest["actors"][number]["model"]>;

export type Equalities = [
	Holds<Same<Static<typeof ModelChoiceSchema>, ExpectedModelChoice>>,
	Holds<Same<ModelChoice, ExpectedModelChoice>>,
	Holds<Same<GameData["model"], string | ExpectedModelChoice | undefined>>,
	Holds<Same<ManifestModel, ExpectedManifestModel>>,
	Holds<Same<RunManifest["actors"][number]["textHashes"], Record<string, string>>>,
	// What M2 adds to the two interfaces is optional, and nothing else became optional or required.
	Holds<Same<OptionalKeys<KernelDefinition>, "records">>,
	Holds<Same<OptionalKeys<KernelPorts>, "sinks" | "limits" | "redact">>,
	Holds<Same<KernelDefinition["records"], readonly RecordSource[] | undefined>>,
	Holds<Same<KernelPorts["limits"], readonly RunLimit[] | undefined>>,
	Holds<Same<KernelPorts["redact"], ((text: string) => string) | undefined>>,
	Holds<Same<ReturnType<RunLimit["check"]>, string | undefined>>,
	Holds<Same<ReturnType<MetricDefinition["compute"]>, number | undefined>>,
	Holds<Same<OptionalKeys<MetricDefinition>, "unit">>,
];

/** The definition without the field of M2: what the sdk of M1 builds. */
type DefinitionOfM1 = Omit<KernelDefinition, "records">;

// A value of M1 still fits: the sdk's definition, and the ports the engine and the testkit pass.
export const definitionOfM1 = (definition: DefinitionOfM1): KernelDefinition => definition;
export const portsOfM1 = (sinks: readonly EventSink[]): readonly KernelPorts[] => [{}, { sinks }];
export const gameOfM1: Pick<GameData, "model"> = { model: "anthropic/haiku" };

// A hand-written implementer of each new interface.
export const records: RecordSource = { id: "@example/driver/resident", events: KERNEL_EVENTS };
let spent = 0;
export const budget: RunLimit = { id: "example.budget", summary: "The run spends at most 1 USD", check: () => (spent > 1 ? "the run spent more than 1 USD" : undefined) };
export const spend = (usd: number): void => void (spent += usd);
export const ports: KernelPorts = { limits: [budget], redact: (text) => text.replaceAll("secret", "[redacted]") };
export const choice: ModelChoice = { id: "anthropic/haiku", thinking: "medium", maxOutputTokens: 4000 };
export const game: Pick<GameData, "model"> = { model: choice };
export const moves: MetricDefinition = {
	id: "moves",
	title: "Moves played",
	unit: "moves",
	reads: ["move_played"],
	compute: (events: readonly Envelope[]) => (events.length === 0 ? undefined : events.length),
};

// The comparisons are strict, and the required parts are required.
export type Strict = [
	// @ts-expect-error -- `thinking` is one of five words
	Holds<Same<Static<typeof ModelChoiceSchema>, { id: string; thinking?: string; maxOutputTokens?: number }>>,
	// @ts-expect-error -- `pricing` is required inside a model
	Holds<Same<ManifestModel, Omit<ExpectedManifestModel, "pricing">>>,
	// @ts-expect-error -- `records` is optional, not required
	Holds<Same<OptionalKeys<KernelDefinition>, never>>,
	// @ts-expect-error -- a game's model is not any object
	Holds<Same<GameData["model"], string | object | undefined>>,
];
// @ts-expect-error -- a run limit needs `check`
export const noCheck: RunLimit = { id: "example.budget", summary: "The run spends at most 1 USD" };
// @ts-expect-error -- a record source declares its events
export const noEvents: RecordSource = { id: "@example/driver/resident" };
// @ts-expect-error -- a metric says which events it reads
export const noReads: MetricDefinition = { id: "moves", title: "Moves played", compute: () => 1 };
// @ts-expect-error -- "absent" is `undefined`, never `null`
export const nullMetric: MetricDefinition = { ...moves, compute: () => null };
// @ts-expect-error -- a model choice has no sampling field
export const sampled: ModelChoice = { id: "anthropic/haiku", temperature: 0 };
