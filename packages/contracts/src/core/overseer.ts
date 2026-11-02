/**
 * Overseers (docs/design/overseer-api.md §1): model-backed roles that watch the run and act in it
 * only through granted tools. A definition (head and body, like a mechanic) is used in a story under
 * a name (`terminator.as("terminator-1")`); several names may use one definition. The kernel never
 * calls a model: the app hands it an `OverseerRuntime`, the testkit a scripted one. Standing orders
 * and the human's policy (§4.2, §5) live here too, because they address overseers by name.
 */
import type { Static, TSchema } from "typebox";
import type { ResidentsView, StateSetup } from "./context.ts";
import type { DecisionsView } from "./decision.ts";
import type { EventEnvelope, EventLogView, EventSchemas, EventsDefinition } from "./events.ts";
import type { OptionsInput, PlainPromptId, SnapshotSlice } from "./mechanic.ts";
import type { ToolLimit, ToolOutcome, ToolSpec } from "./tools.ts";
import type { Actor, PromptKeys, RandomLabel, RandomSource } from "./values.ts";

/** The variable every overseer input prompt ends with; the runtime fills it (§4.2). */
export const STANDING_ORDERS = "standingOrders";

/** Prompt ids whose variables include `standingOrders`: what an overseer's `input` must be. */
export type InputPromptId<P extends PromptKeys> = { [K in keyof P]: typeof STANDING_ORDERS extends P[K][number] ? K : never }[keyof P] & string;

export type OverseerTrigger =
	/** After the mechanics' phases of that hook and the calls they staged. */
	| { readonly hook: "minuteStarted" | "between" | "runEnded"; readonly order?: number }
	/** In the `between` slot of minutes start, start + every, ... (virtual minutes). */
	| { readonly schedule: { readonly every: number; readonly start?: number }; readonly order?: number }
	/** An event of a mechanic (its `defineEvents`) or of the core; `self` is the overseer's story name. */
	| { readonly event: EventsDefinition | "core"; readonly type: string; when?(payload: unknown, self: string): boolean }
	/** A fact (`<mechanic>.<fact>`), checked in the `between` slot. */
	| { readonly fact: string; when(value: unknown): boolean; readonly order?: number }
	/** Asked by a tool's `consult` whose `role` is the overseer's story name (stage `consult`). */
	| { readonly consult: true };

export interface OverseerLimits {
	/** Model calls per run. */
	readonly maxCalls?: number;
	/** Per run; the story's run cap still applies on top. */
	readonly maxCostUsd?: number;
	/** Successful world-tool calls, counted under the key `overseer:<name>` over every tool granted to the name. */
	readonly maxInterventions?: ToolLimit;
}

/** The static part of an overseer: plain data that fixes the types. */
export interface OverseerHead<Id extends string, O extends TSchema, S, E extends EventSchemas, P extends PromptKeys, Out extends TSchema> {
	/** Namespaced for third parties: `acme/terminator`. */
	readonly id: Id;
	readonly summary: string;
	/** Typebox, every property with a description (conformance). */
	readonly options: O;
	/** `() => undefined` for none; a state needs a snapshot slice. */
	readonly state: (setup: StateSetup<O>) => S;
	/** What `settle` may emit; source = the definition id. */
	readonly events: E;
	/** Per event type, the default audience (§4.1); the story overrides by `<source>.<type>`. */
	readonly audiences?: Partial<Readonly<Record<keyof E & string, readonly string[]>>>;
	/** Prompt id to variables, files in the plugin's `prompts/` folder. */
	readonly prompts: P;
	/** The system prompt: no variables, so the cache prefix is fixed. */
	readonly system: PlainPromptId<P>;
	/** The per-call prompt; it must declare and end with `{{standingOrders}}` (§4.2). */
	readonly input: InputPromptId<P>;
	/** The answer; parsed with Typebox, never trusted. */
	readonly output: Out;
	/** The model-side tool the answer is given through (the judge's `verdict`); no world effect. */
	readonly answer: { readonly tool: string; readonly description: PlainPromptId<P> };
	/** `slot` names the model in swt.config (models per role); `fallback` the slot tried when it fails. */
	readonly model: { readonly slot: string; readonly fallback?: string };
	/**
	 * `long`: remembers across calls; one-off instructions arrive in its next call. `short`: called
	 * fresh, the prompt built from the template and the inputs every time; instructions are standing
	 * orders with a lifetime.
	 */
	readonly lifetime: "long" | "short";
	readonly triggers: readonly OverseerTrigger[];
	/** World tools its prompt expects; the loader refuses a story that does not grant them to the name. */
	readonly needs?: readonly string[];
	readonly limits?: OverseerLimits;
}

/** The type parameters of one overseer, bundled. */
export interface OverseerShape {
	readonly options: TSchema;
	readonly state: unknown;
	readonly events: EventSchemas;
	readonly prompts: PromptKeys;
	readonly input: string;
	readonly output: TSchema;
}

export interface OverseerShapeOf<O extends TSchema, S, E extends EventSchemas, P extends PromptKeys, I extends string, Out extends TSchema> extends OverseerShape {
	readonly options: O;
	readonly state: S;
	readonly events: E;
	readonly prompts: P;
	readonly input: I;
	readonly output: Out;
}

/** The shape of an overseer head. */
export type OverseerShapeOfHead<H> =
	H extends OverseerHead<string, infer O, infer S, infer E, infer P, infer Out> ? OverseerShapeOf<O, S, E, P, H["input"], Out> : never;

/** What one call's input prompt takes from `calls`: its variables without `standingOrders`, which the runtime fills. */
export type CallVariables<H extends OverseerShape> = Readonly<Record<Exclude<NonNullable<H["prompts"][H["input"]]>[number], typeof STANDING_ORDERS>, string | number>>;

/** What fired: the trigger and its data (the event, the fact value, the consult question). */
export type Fired =
	| { readonly kind: "hook"; readonly hook: string; readonly minute: number }
	| { readonly kind: "schedule"; readonly minute: number }
	| { readonly kind: "event"; readonly event: EventEnvelope }
	| { readonly kind: "fact"; readonly value: unknown }
	| { readonly kind: "consult"; readonly question: unknown; readonly tool: string; readonly actor: Actor };

/** What an overseer's code sees: no host, no other state; the log filtered by audience (§4.1). */
export interface OverseerContext<H extends OverseerShape> {
	/** The story name, e.g. `terminator-2`. */
	readonly self: string;
	readonly options: Static<H["options"]>;
	readonly state: H["state"];
	readonly minute: number;
	readonly residents: ResidentsView;
	/** Only events whose audience is absent or names `self`. */
	readonly log: EventLogView;
	facts(): Readonly<Record<string, unknown>>;
	/** Open decisions it may amend (§3). */
	readonly decisions: DecisionsView;
	/** Names for ids, as residents read them. */
	display(text: string): string;
	emit<K extends keyof H["events"] & string>(type: K, payload: Static<H["events"][K]>): void;
	prompt<K extends keyof H["prompts"] & string>(id: K, variables: Readonly<Record<NonNullable<H["prompts"][K]>[number], string | number>>): string;
	rng(...labels: readonly RandomLabel[]): RandomSource;
}

export interface OverseerBody<H extends OverseerShape> {
	/** The calls one firing makes: zero (skip), one, or several (one per batch, one per resident). */
	calls(fired: Fired, ctx: OverseerContext<H>): readonly CallVariables<H>[];
	/** After a parsed answer (or the fallback answer): emit declared events, update state. Synchronous. */
	settle?(output: Static<H["output"]>, call: { readonly index: number; readonly fired: Fired }, ctx: OverseerContext<H>): void;
	/** The fail-open answer when the model and the fallback model failed; `undefined`: do nothing. */
	fallback(fired: Fired, ctx: OverseerContext<H>): Static<H["output"]> | undefined;
	/**
	 * A system prompt composed in code from the options (the gamemaker's dial variants), in place of
	 * the head's `system`; `undefined` keeps the head's. The host asks once, at the first call, and
	 * sends that text with every call of the run, so the cache prefix stays fixed.
	 */
	system?(ctx: OverseerContext<H>): string | undefined;
	/** Required when the state is not `undefined` (as for mechanics). */
	readonly snapshot?: SnapshotSlice;
}

/** A slice of an overseer's state, versioned like a mechanic's. */
export interface OverseerSnapshotDefinition<H extends OverseerShape, Snap extends TSchema> {
	readonly version: number;
	readonly schema: Snap;
	save(state: H["state"]): Static<Snap>;
	load(data: Static<Snap>, setup: StateSetup<H["options"]>): H["state"];
	readonly migrations?: Readonly<Record<number, (data: unknown) => unknown>>;
}

/** Typed constructors for an overseer's body. */
export interface OverseerKit<H extends OverseerShape> {
	snapshot<Snap extends TSchema>(definition: OverseerSnapshotDefinition<H, Snap>): SnapshotSlice;
}

/** A finished overseer with its types erased, as the host holds it. */
export interface OverseerDefinition<Id extends string = string, O extends TSchema = TSchema, E extends EventSchemas = EventSchemas> {
	readonly id: Id;
	readonly summary: string;
	readonly options: O;
	readonly events: E;
	readonly prompts: PromptKeys;
	readonly system: string;
	readonly input: string;
	readonly output: TSchema;
	readonly answer: { readonly tool: string; readonly description: string };
	readonly model: { readonly slot: string; readonly fallback?: string };
	readonly lifetime: "long" | "short";
	readonly triggers: readonly OverseerTrigger[];
	readonly needs: readonly string[];
	readonly limits: OverseerLimits | undefined;
	/** Per event type, the default audience of its events. */
	readonly audiences?: Partial<Readonly<Record<string, readonly string[]>>>;
	/** Fills defaults and checks the options; throws with the overseer's id on a bad value. */
	parseOptions(raw: unknown): Static<O>;
	/** The body bound to one story name (`defineOverseer`); the host holds the instance. */
	instantiate(port: OverseerPort, options: unknown): OverseerInstance;
	/** The definition under a story name; a story's `limits` tighten the head's, never lift them. */
	as<const N extends string>(name: N, options?: OptionsInput<O> & { readonly limits?: OverseerLimits }): OverseerUse<N, this>;
}

/** An overseer in a story: its name, its definition and the options it was given. */
export interface OverseerUse<N extends string = string, D extends OverseerDefinition = OverseerDefinition> {
	readonly name: N;
	readonly overseer: D;
	readonly options: unknown;
	readonly limits?: OverseerLimits;
}

/** The names of a story's overseers. */
export type NameOf<Os extends readonly OverseerUse[]> = Os[number]["name"];

/** What the host hands one overseer instance: its own view of the run, nothing of the host itself. */
export interface OverseerPort {
	/** The story name. */
	readonly name: string;
	readonly seed: number;
	minute(): number;
	readonly residents: ResidentsView;
	/** Filtered by audience (§4.1). */
	readonly log: EventLogView;
	facts(): Readonly<Record<string, unknown>>;
	readonly decisions: DecisionsView;
	display(text: string): string;
	/** An event of the definition (source = its id), checked against its schema. */
	emit(type: string, payload: unknown): void;
	render(prompt: string, variables: Readonly<Record<string, string | number>>, declared: readonly string[]): string;
	rng(...labels: readonly RandomLabel[]): RandomSource;
}

/** One overseer under its story name, with its types erased, as the host runs it. */
export interface OverseerInstance {
	/** Whether the state is not `undefined`; such an overseer needs a snapshot slice. */
	readonly stateful: boolean;
	readonly snapshot: SnapshotSlice | undefined;
	/** The variables of each call one firing makes (without `standingOrders`). */
	calls(fired: Fired): readonly Readonly<Record<string, string | number>>[];
	/** Runs `settle` with an output already checked against the head's `output`. */
	settle(output: unknown, call: { readonly index: number; readonly fired: Fired }): void;
	/** The body's fail-open answer, checked against `output`; `undefined`: do nothing. */
	fallback(fired: Fired): { readonly output: unknown } | undefined;
	/** The body's composed system prompt; absent or `undefined`: the head's `system` prompt. */
	system?(): string | undefined;
}

/** One model request the host hands the app's runtime. */
export interface OverseerCall {
	readonly definition: string;
	readonly name: string;
	/** The model slot to use: the head's `model.slot`, or its `model.fallback` on the second try. */
	readonly slot: string;
	readonly system: string;
	readonly input: string;
	/** The world tools granted to the name, as `host.toolSpecs` lists them. */
	readonly tools: readonly ToolSpec[];
	/** The head's `output`; with an active order of mode `order` an object output gains the field `orders` (§4.2). */
	readonly answerSchema: TSchema;
	/**
	 * Runs a world tool as this overseer through the full pipeline (nested: nothing else runs
	 * meanwhile). Several calls of one firing ask at once, but each one's tool calls wait until the
	 * calls before it are answered, so the log does not depend on the models' speed.
	 */
	call(tool: string, params: unknown): Promise<ToolOutcome>;
}

export type OverseerReply =
	| { readonly ok: true; readonly answer: unknown; readonly costUsd: number; readonly by: "model" | "fallback-model" }
	| { readonly ok: false; readonly error: string; readonly costUsd: number };

/** Implemented in the roles package, scripted in the testkit. */
export interface OverseerRuntime {
	/** One model request including its tool loop. */
	ask(call: OverseerCall): Promise<OverseerReply>;
}

/** An instruction to an overseer, kept until its lifetime ends (§4.2). */
export interface StandingOrder {
	/** The seq of its `human_note`. */
	readonly id: number;
	/** An overseer's grant name. */
	readonly target: string;
	readonly text: string;
	readonly mode: "advice" | "order";
	readonly lifetime: { readonly untilMinute: number } | { readonly calls: number } | "untilRevoked";
	/** The minute it was issued. */
	readonly issued: number;
	/** Calls that carried it. */
	readonly used: number;
}

/** What the story allows the human (§5). */
export interface HumanPolicy {
	/** Instructions to residents; off by default. */
	readonly residents?: boolean;
	/** Who also hears an instruction; `choose`: the call's `copy` says. */
	readonly copyTo?: "never" | "gamemaker" | "choose";
	/** Whether the gamemaker may know a human is above it. */
	readonly gamemakerKnows?: boolean;
}
