/**
 * The spike of issue 14 (DECISIONS.md D1): a one-object `mechanic({...})` as sugar on today's
 * head-and-body model. The types infer everything from the object; the runtime part splits the
 * object into a head and a body and hands both to the kernel's `defineMechanic`, so a mechanic
 * written this way runs on today's kernel unchanged.
 *
 * The order of the properties inside the one object does not matter (measured on `channels`): the
 * declaring properties are not context-sensitive, so TypeScript reads them before any handler.
 * `head({...})`, `mechanicOf(head, body)` and `toolsFor(head, {...})` are the same form with the
 * declaring part written apart, for mechanics whose helpers live outside the object.
 */
import type { Static, TObject, TSchema, TUndefined } from "typebox";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import type {
	ApiDefinition,
	ApiImplementation,
	DecisionSchemas,
	EventListener,
	EventSchemas,
	FactView,
	GrantRole,
	GuardHandlers,
	MechanicBody,
	MechanicCommits,
	MechanicContext,
	MechanicDefinition,
	MechanicFact,
	MechanicHead,
	MechanicHooks,
	MechanicJob,
	MechanicKit,
	MechanicTool,
	PipelineHandlers,
	PlainPromptId,
	PresentationHandlers,
	PromptKeys,
	ProvidedApi,
	Refusal,
	RunLimit,
	Shape,
	StateSetup,
	ToolContext,
	ToolDescription,
	ToolLimit,
	ToolOutcome,
	TurnPolicy,
} from "@swarmtales/contracts";
import { defineMechanic } from "@swarmtales/kernel";

/** The options schema of a mechanic that declares none. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- the empty property set of `Type.Object({})`
export type NoOptions = TObject<{}>;

/** The empty set of a keyed part (events, prompts, decisions, tools) that is left out. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/consistent-type-definitions -- an empty keyed part; an interface would not be assignable to a record
export type None = {};

/** One tool in the `tools` object; its name is the property key. */
export interface ToolSpec<M extends Shape<TSchema, unknown, EventSchemas, PromptKeys, readonly ApiDefinition[], readonly ApiDefinition[], readonly ApiDefinition[], DecisionSchemas>, P extends TSchema> {
	/** A prompt id of this mechanic without variables, or one with variables taken from the options. */
	readonly description: PlainPromptId<M["prompts"]> | ToolDescription<M>;
	readonly params: P;
	/** The grant names the mechanic suggests (today's `suggest`). */
	readonly for?: readonly GrantRole[];
	/** The grant names this tool serves (all when left out). */
	readonly serves?: readonly GrantRole[];
	readonly limit?: ToolLimit;
	/** A read-only look: not counted as a step. */
	readonly free?: boolean;
	/** The tool's own program-checkable rule (stage `rule`). */
	check?(params: Static<P>, ctx: ToolContext<M>): Refusal | undefined;
	/** The text a story guard checks. */
	guardText?(params: Static<P>): string | undefined;
	run(params: Static<P>, ctx: ToolContext<M>): ToolOutcome;
}

/** One fact in the `facts` object. */
export interface FactSpec<M extends Shape<TSchema, unknown, EventSchemas, PromptKeys, readonly ApiDefinition[], readonly ApiDefinition[], readonly ApiDefinition[], DecisionSchemas>, F extends TSchema> {
	readonly output: F;
	compute(view: FactView<M>): Static<F>;
}

/** One referee limit in the `limits` object; its id is the property key. */
export interface LimitSpec<M extends Shape<TSchema, unknown, EventSchemas, PromptKeys, readonly ApiDefinition[], readonly ApiDefinition[], readonly ApiDefinition[], DecisionSchemas>> {
	readonly summary: string;
	breached(view: FactView<M>): string | undefined;
}

/** How a state that is not plain JSON is saved and loaded; left out, save and load are the identity. */
export interface SnapshotSpec<S, O extends TSchema, Snap extends TSchema> {
	save(state: S): Static<Snap>;
	load(data: Static<Snap>, setup: StateSetup<O>): S;
}

/** The state a mechanic holds: its custom state `C` when `snapshot` gives one, else the value of the state schema. */
export type StateOf<Snap extends TSchema, C> = [C] extends [never] ? Static<Snap> : C;

/** The services of a mechanic, keyed by the name of each provided API. */
export type ServicesOf<M extends Shape<TSchema, unknown, EventSchemas, PromptKeys, readonly ApiDefinition[], readonly ApiDefinition[], readonly ApiDefinition[], DecisionSchemas>> = {
	readonly [N in M["provides"][number]["name"]]: ApiImplementation<Extract<M["provides"][number], { readonly name: N }>, MechanicContext<M>>;
};

/** The typed constructors `listeners` receives. */
export type ListenKit<M extends Shape<TSchema, unknown, EventSchemas, PromptKeys, readonly ApiDefinition[], readonly ApiDefinition[], readonly ApiDefinition[], DecisionSchemas>> = Pick<MechanicKit<M>, "on" | "listen" | "core">;

/** The tool name of a key: `postBoard`, or `gamemaker/postBoard` for a second tool of the same name. */
export type ToolNameOf<K> = K extends `${string}/${infer N}` ? N : K & string;

/** The one object. */
export interface MechanicSpec<
	Id extends string,
	O extends TSchema,
	Snap extends TSchema,
	C,
	E extends EventSchemas,
	P extends PromptKeys,
	R extends readonly ApiDefinition[],
	Pv extends readonly ApiDefinition[],
	U extends readonly ApiDefinition[],
	D extends DecisionSchemas,
	TP extends Readonly<Record<string, TSchema>>,
	F extends Readonly<Record<string, TSchema>>,
> {
	readonly id: Id;
	/** One line for `swt module show`. */
	readonly summary: string;
	/** Typebox schema of the options; left out: none. */
	readonly options?: O;
	/** The schema of the state (and of its snapshot slice); left out: no state. */
	readonly state?: Snap;
	/** Only for a state that is not plain JSON (classes, maps, sets): how it is saved into the slice and loaded from it. */
	readonly snapshot?: SnapshotSpec<C, O, Snap>;
	/** Version of the snapshot slice (default 1) and the migrations from older versions. */
	readonly version?: number;
	readonly migrations?: Readonly<Record<number, (data: unknown) => unknown>>;
	readonly events?: E;
	readonly audiences?: Partial<Readonly<Record<keyof E & string, readonly string[]>>>;
	readonly prompts?: P;
	readonly requires?: R;
	readonly provides?: Pv;
	readonly uses?: U;
	readonly decisions?: D;
	/** The initial state of a fresh run. */
	readonly start?: (setup: StateSetup<O>) => NoInfer<StateOf<Snap, C>>;
	readonly tools?: { readonly [K in keyof TP]: ToolSpec<Shape<O, StateOf<Snap, C>, E, P, R, Pv, U, D>, TP[K]> };
	readonly services?: ServicesOf<Shape<O, StateOf<Snap, C>, E, P, R, Pv, U, D>>;
	readonly listeners?: (kit: ListenKit<Shape<O, StateOf<Snap, C>, E, P, R, Pv, U, D>>) => readonly EventListener[];
	readonly hooks?: MechanicHooks<Shape<O, StateOf<Snap, C>, E, P, R, Pv, U, D>>;
	readonly pipeline?: PipelineHandlers<Shape<O, StateOf<Snap, C>, E, P, R, Pv, U, D>>;
	readonly facts?: { readonly [K in keyof F]: FactSpec<Shape<O, StateOf<Snap, C>, E, P, R, Pv, U, D>, F[K]> };
	readonly limits?: Readonly<Record<string, LimitSpec<Shape<O, StateOf<Snap, C>, E, P, R, Pv, U, D>>>>;
	readonly jobs?: Readonly<Record<string, MechanicJob<Shape<O, StateOf<Snap, C>, E, P, R, Pv, U, D>>>>;
	readonly commits?: MechanicCommits<Shape<O, StateOf<Snap, C>, E, P, R, Pv, U, D>>;
	readonly turns?: TurnPolicy;
	readonly presentation?: PresentationHandlers<Shape<O, StateOf<Snap, C>, E, P, R, Pv, U, D>>;
	readonly guard?: GuardHandlers<Shape<O, StateOf<Snap, C>, E, P, R, Pv, U, D>>;
}

/** A mechanic defined with the one object: today's definition plus its head, for `CtxOf`. */
export type OneMechanic<
	Id extends string,
	O extends TSchema,
	S,
	E extends EventSchemas,
	P extends PromptKeys,
	R extends readonly ApiDefinition[],
	Pv extends readonly ApiDefinition[],
	U extends readonly ApiDefinition[],
	D extends DecisionSchemas,
	Names extends string,
> = MechanicDefinition<Id, O, E, Names> & {
	/** The static part, plain data: readable without running any handler. */
	readonly head: MechanicHead<Id, O, S, E, P, R, Pv, U, D>;
	/** The tools as declared: name, description, parameters and grants, without their handlers. */
	readonly toolList: readonly DeclaredTool[];
};

/** What can be read of a tool without running the mechanic. */
export interface DeclaredTool {
	readonly name: string;
	readonly description: string;
	readonly parameters: TSchema;
	readonly for: readonly GrantRole[];
	readonly serves: readonly GrantRole[] | undefined;
}

/** The declaring properties of the one object, for a head written apart (`head({...})`) and spread into `mechanic({...head, ...})`. */
export type HeadSpec<
	Id extends string,
	O extends TSchema,
	Snap extends TSchema,
	C,
	E extends EventSchemas,
	P extends PromptKeys,
	R extends readonly ApiDefinition[],
	Pv extends readonly ApiDefinition[],
	U extends readonly ApiDefinition[],
	D extends DecisionSchemas,
> = Pick<
	MechanicSpec<Id, O, Snap, C, E, P, R, Pv, U, D, None, None>,
	"id" | "summary" | "options" | "state" | "snapshot" | "version" | "migrations" | "events" | "audiences" | "prompts" | "requires" | "provides" | "uses" | "decisions" | "start"
> & {
	/** Phantom, never set: the head the properties make, for `CtxOf`. */
	readonly head?: MechanicHead<Id, O, StateOf<Snap, C>, E, P, R, Pv, U, D>;
};

/**
 * The declaring part of a mechanic written apart, so that helpers outside the one object can name
 * their context (`CtxOf<typeof head>`) without referring to the mechanic that calls them.
 */
export function head<
	const Id extends string,
	O extends TSchema = NoOptions,
	Snap extends TSchema = TUndefined,
	C = never,
	E extends EventSchemas = None,
	const P extends PromptKeys = None,
	const R extends readonly ApiDefinition[] = [],
	const Pv extends readonly ApiDefinition[] = [],
	const U extends readonly ApiDefinition[] = [],
	const D extends DecisionSchemas = None,
>(spec: HeadSpec<Id, O, Snap, C, E, P, R, Pv, U, D>): HeadSpec<Id, O, Snap, C, E, P, R, Pv, U, D> {
	return spec;
}

/** The shape a head written apart declares. */
export type ShapeOfHead<H> = H extends { readonly head?: MechanicHead<string, infer O, infer S, infer E, infer P, infer R, infer Pv, infer U, infer D> } ? Shape<O, S, E, P, R, Pv, U, D> : never;

/** The handler part of the one object: everything that is not the head. */
export type BodySpec<
	Id extends string,
	O extends TSchema,
	Snap extends TSchema,
	C,
	E extends EventSchemas,
	P extends PromptKeys,
	R extends readonly ApiDefinition[],
	Pv extends readonly ApiDefinition[],
	U extends readonly ApiDefinition[],
	D extends DecisionSchemas,
	TP extends Readonly<Record<string, TSchema>>,
	F extends Readonly<Record<string, TSchema>>,
> = Pick<MechanicSpec<Id, O, Snap, C, E, P, R, Pv, U, D, TP, F>, "tools" | "services" | "listeners" | "hooks" | "pipeline" | "facts" | "limits" | "jobs" | "commits" | "turns" | "presentation" | "guard">;

/**
 * Head and body with one registration site: the head written apart (`head({...})`), the body a
 * plain object. The same result as `mechanic({ ...head, ...body })`.
 */
export function mechanicOf<
	const Id extends string,
	O extends TSchema,
	Snap extends TSchema,
	C,
	E extends EventSchemas,
	const P extends PromptKeys,
	const R extends readonly ApiDefinition[],
	const Pv extends readonly ApiDefinition[],
	const U extends readonly ApiDefinition[],
	const D extends DecisionSchemas,
	TP extends Readonly<Record<string, TSchema>> = None,
	F extends Readonly<Record<string, TSchema>> = None,
>(declared: HeadSpec<Id, O, Snap, C, E, P, R, Pv, U, D>, body: BodySpec<Id, O, Snap, C, E, P, R, Pv, U, D, TP, F>): OneMechanic<Id, O, StateOf<Snap, C>, E, P, R, Pv, U, D, ToolNameOf<keyof TP>> {
	return mechanic({ ...declared, ...body });
}

/**
 * Tools written in another file than the mechanic, typed by a head written apart; spread into `tools`.
 */
export function toolsFor<H, TP extends Readonly<Record<string, TSchema>>>(_declared: H, tools: { readonly [K in keyof TP]: ToolSpec<ShapeOfHead<H>, TP[K]> }): { readonly [K in keyof TP]: ToolSpec<ShapeOfHead<H>, TP[K]> } {
	return tools;
}

/** The context of hooks, listeners, jobs and services of a one-object mechanic (or of a head written apart). */
export type CtxOf<Mech> = Mech extends { readonly head?: MechanicHead<string, infer O, infer S, infer E, infer P, infer R, infer Pv, infer U, infer D> } ? MechanicContext<Shape<O, S, E, P, R, Pv, U, D>> : never;

/** The context of the tools of a one-object mechanic. */
export type ToolCtxOf<Mech> = Mech extends { readonly head?: MechanicHead<string, infer O, infer S, infer E, infer P, infer R, infer Pv, infer U, infer D> } ? ToolContext<Shape<O, S, E, P, R, Pv, U, D>> : never;

const NO_OPTIONS: NoOptions = Type.Object({});

/** The shape with every type erased: what the runtime part works on. */
type AnyShape = Shape<TSchema, unknown, EventSchemas, PromptKeys, readonly ApiDefinition[], readonly ApiDefinition[], readonly ApiDefinition[], DecisionSchemas>;
type AnySpec = MechanicSpec<string, TSchema, TSchema, unknown, EventSchemas, PromptKeys, readonly ApiDefinition[], readonly ApiDefinition[], readonly ApiDefinition[], DecisionSchemas, Readonly<Record<string, TSchema>>, Readonly<Record<string, TSchema>>>;
type AnyMechanic = OneMechanic<string, TSchema, unknown, EventSchemas, PromptKeys, readonly ApiDefinition[], readonly ApiDefinition[], readonly ApiDefinition[], DecisionSchemas, string>;

function nameOf(key: string): string {
	const cut = key.lastIndexOf("/");
	return cut === -1 ? key : key.slice(cut + 1);
}

/** A loaded slice put into a fresh state object, for a state that is its own slice. */
function refill<S>(fresh: S, data: unknown): S {
	if (typeof fresh !== "object" || fresh === null || typeof data !== "object" || data === null) throw new Error("a state without `snapshot` must be a plain object");
	for (const key of Object.keys(fresh)) Reflect.deleteProperty(fresh, key);
	Object.assign(fresh, structuredClone(data));
	return fresh;
}

/**
 * Defines a mechanic with one object. Every type is inferred: no type argument, no cast. The
 * typed signature is the only overload; the implementation below works on the erased shape, as
 * the kernel's own `bind` does.
 */
export function mechanic<
	const Id extends string,
	O extends TSchema = NoOptions,
	Snap extends TSchema = TUndefined,
	C = never,
	E extends EventSchemas = None,
	const P extends PromptKeys = None,
	const R extends readonly ApiDefinition[] = [],
	const Pv extends readonly ApiDefinition[] = [],
	const U extends readonly ApiDefinition[] = [],
	const D extends DecisionSchemas = None,
	TP extends Readonly<Record<string, TSchema>> = None,
	F extends Readonly<Record<string, TSchema>> = None,
>(spec: MechanicSpec<Id, O, Snap, C, E, P, R, Pv, U, D, TP, F>): OneMechanic<Id, O, StateOf<Snap, C>, E, P, R, Pv, U, D, ToolNameOf<keyof TP>>;
export function mechanic(spec: AnySpec): AnyMechanic {
	type M = AnyShape;
	const start = spec.start;
	const head: MechanicHead<string, TSchema, unknown, EventSchemas, PromptKeys, readonly ApiDefinition[], readonly ApiDefinition[], readonly ApiDefinition[], DecisionSchemas> = {
		id: spec.id,
		summary: spec.summary,
		options: spec.options ?? NO_OPTIONS,
		state: (setup) => start?.(setup),
		events: spec.events ?? {},
		...(spec.audiences === undefined ? {} : { audiences: spec.audiences }),
		...(spec.prompts === undefined ? {} : { prompts: spec.prompts }),
		...(spec.requires === undefined ? {} : { requires: spec.requires }),
		...(spec.provides === undefined ? {} : { provides: spec.provides }),
		...(spec.uses === undefined ? {} : { uses: spec.uses }),
		...(spec.decisions === undefined ? {} : { decisions: spec.decisions }),
	};
	const toolEntries = Object.entries(spec.tools ?? {});
	const toolList: DeclaredTool[] = toolEntries.map(([key, tool]) => ({
		name: nameOf(key),
		description: typeof tool.description === "string" ? tool.description : tool.description.prompt,
		parameters: tool.params,
		for: tool.for ?? [],
		serves: tool.serves,
	}));
	const build = (kit: MechanicKit<M>): MechanicBody<M, readonly MechanicTool[]> => {
		const tools = toolEntries.map(([key, tool]) =>
			kit.tool({
				name: nameOf(key),
				description: tool.description,
				parameters: tool.params,
				...(tool.limit === undefined ? {} : { limit: tool.limit }),
				...(tool.for === undefined ? {} : { suggest: tool.for }),
				...(tool.serves === undefined ? {} : { serves: tool.serves }),
				...(tool.free === undefined ? {} : { free: tool.free }),
				...(tool.check === undefined ? {} : { rule: (params, ctx) => tool.check?.(params, ctx) }),
				...(tool.guardText === undefined ? {} : { guardText: (params) => tool.guardText?.(params) }),
				execute: (params, ctx) => tool.run(params, ctx),
			}),
		);
		const implementations = spec.services ?? {};
		const services: ProvidedApi[] = (spec.provides ?? []).map((api) => {
			const implementation = implementations[api.name];
			if (implementation === undefined) throw new Error(`${spec.id}: provides "${api.name}" but \`services\` has no entry of that name`);
			return kit.provide(api, implementation);
		});
		const stray = Object.keys(implementations).find((name) => !(spec.provides ?? []).some((api) => api.name === name));
		if (stray !== undefined) throw new Error(`${spec.id}: \`services\` implements "${stray}" without declaring it in provides`);
		const facts: Record<string, MechanicFact> = {};
		for (const [name, fact] of Object.entries(spec.facts ?? {})) facts[name] = kit.fact(fact.output, (view) => fact.compute(view));
		const limits: RunLimit[] = Object.entries(spec.limits ?? {}).map(([id, limit]) => kit.limit(id, limit.summary, (view) => limit.breached(view)));
		const schema = spec.state;
		const custom = spec.snapshot;
		const snapshot =
			schema === undefined
				? undefined
				: kit.snapshot({
						version: spec.version ?? 1,
						schema,
						save: (state) => (custom === undefined ? Parse(schema, structuredClone(state)) : custom.save(state)),
						load: (data, setup) => (custom === undefined ? refill(head.state(setup), data) : custom.load(data, setup)),
						...(spec.migrations === undefined ? {} : { migrations: spec.migrations }),
					});
		return {
			tools,
			services,
			...(spec.listeners === undefined ? {} : { listeners: spec.listeners(kit) }),
			facts,
			limits,
			...(spec.hooks === undefined ? {} : { hooks: spec.hooks }),
			...(spec.pipeline === undefined ? {} : { pipeline: spec.pipeline }),
			...(spec.jobs === undefined ? {} : { jobs: spec.jobs }),
			...(spec.commits === undefined ? {} : { commits: spec.commits }),
			...(snapshot === undefined ? {} : { snapshot }),
			...(spec.turns === undefined ? {} : { turns: spec.turns }),
			...(spec.presentation === undefined ? {} : { presentation: spec.presentation }),
			...(spec.guard === undefined ? {} : { guard: spec.guard }),
		};
	};
	const definition = defineMechanic(head, build);
	const result: AnyMechanic = {
		...definition,
		head,
		toolList,
		with(options) {
			return { mechanic: result, options: options ?? {} };
		},
	};
	return result;
}

/*
 * The third form, the one the verdict recommends for the fail case: the head declares the tools as
 * data (name, description, parameters, grants) and the body holds only handlers, keyed by the names
 * the head declared. The type of the mechanic then follows from the head alone, so a helper can
 * take `CtxOf<typeof head>`, nothing is inferred from the body, and the tools can be read without
 * running a handler.
 */

/** A tool as the head declares it: data only. */
export interface ToolDeclaration<O extends TSchema, P extends PromptKeys, Params extends TSchema> {
	/** A prompt id of this mechanic without variables, or one with variables taken from the options. */
	readonly description: PlainPromptId<P> | { readonly prompt: keyof P & string; variables(options: Static<O>): Readonly<Record<string, string | number | { readonly prompt: PlainPromptId<P> }>> };
	readonly params: Params;
	readonly for?: readonly GrantRole[];
	readonly serves?: readonly GrantRole[];
	readonly limit?: ToolLimit;
	readonly free?: boolean;
}

/** The handlers of one declared tool. */
export interface ToolHandlers<M extends Shape<TSchema, unknown, EventSchemas, PromptKeys, readonly ApiDefinition[], readonly ApiDefinition[], readonly ApiDefinition[], DecisionSchemas>, Params extends TSchema> {
	check?(params: Static<Params>, ctx: ToolContext<M>): Refusal | undefined;
	guardText?(params: Static<Params>): string | undefined;
	run(params: Static<Params>, ctx: ToolContext<M>): ToolOutcome;
}

/** A head that declares its tools. */
export type DeclaredHead<
	Id extends string,
	O extends TSchema,
	Snap extends TSchema,
	C,
	E extends EventSchemas,
	P extends PromptKeys,
	R extends readonly ApiDefinition[],
	Pv extends readonly ApiDefinition[],
	U extends readonly ApiDefinition[],
	D extends DecisionSchemas,
	TP extends Readonly<Record<string, TSchema>>,
> = HeadSpec<Id, O, Snap, C, E, P, R, Pv, U, D> & {
	readonly tools?: { readonly [K in keyof TP]: ToolDeclaration<O, P, TP[K]> };
};

/** Declares a head with its tools: plain data plus `start` and `snapshot`. */
export function declare<
	const Id extends string,
	O extends TSchema = NoOptions,
	Snap extends TSchema = TUndefined,
	C = never,
	E extends EventSchemas = None,
	const P extends PromptKeys = None,
	const R extends readonly ApiDefinition[] = [],
	const Pv extends readonly ApiDefinition[] = [],
	const U extends readonly ApiDefinition[] = [],
	const D extends DecisionSchemas = None,
	TP extends Readonly<Record<string, TSchema>> = None,
>(spec: DeclaredHead<Id, O, Snap, C, E, P, R, Pv, U, D, TP>): DeclaredHead<Id, O, Snap, C, E, P, R, Pv, U, D, TP> {
	return spec;
}

/** The body of a mechanic whose head declares the tools: handlers only. */
export type HandlerBody<
	Id extends string,
	O extends TSchema,
	Snap extends TSchema,
	C,
	E extends EventSchemas,
	P extends PromptKeys,
	R extends readonly ApiDefinition[],
	Pv extends readonly ApiDefinition[],
	U extends readonly ApiDefinition[],
	D extends DecisionSchemas,
	TP extends Readonly<Record<string, TSchema>>,
	F extends Readonly<Record<string, TSchema>>,
> = Omit<BodySpec<Id, O, Snap, C, E, P, R, Pv, U, D, TP, F>, "tools"> & {
	readonly tools?: { readonly [K in keyof TP]: ToolHandlers<Shape<O, StateOf<Snap, C>, E, P, R, Pv, U, D>, TP[K]> };
};

/**
 * Head and body with one registration site, the head declaring the tools. Only `F` (the facts) is
 * inferred from the body; everything else is fixed by the head.
 */
export function implement<
	const Id extends string,
	O extends TSchema,
	Snap extends TSchema,
	C,
	E extends EventSchemas,
	const P extends PromptKeys,
	const R extends readonly ApiDefinition[],
	const Pv extends readonly ApiDefinition[],
	const U extends readonly ApiDefinition[],
	const D extends DecisionSchemas,
	TP extends Readonly<Record<string, TSchema>>,
	F extends Readonly<Record<string, TSchema>> = None,
>(declared: DeclaredHead<Id, O, Snap, C, E, P, R, Pv, U, D, TP>, body: HandlerBody<Id, O, Snap, C, E, P, R, Pv, U, D, TP, F>): OneMechanic<Id, O, StateOf<Snap, C>, E, P, R, Pv, U, D, ToolNameOf<keyof TP>>;
export function implement(declared: AnyDeclaredHead, body: AnyHandlerBody): AnyMechanic {
	const handlers = body.tools ?? {};
	const tools: Record<string, ToolSpec<AnyShape, TSchema>> = {};
	for (const [key, tool] of Object.entries(declared.tools ?? {})) {
		const own = handlers[key];
		if (own === undefined) throw new Error(`${declared.id}: the head declares the tool "${key}" but the body has no handlers for it`);
		tools[key] = { ...tool, ...own };
	}
	const stray = Object.keys(handlers).find((key) => !Object.hasOwn(declared.tools ?? {}, key));
	if (stray !== undefined) throw new Error(`${declared.id}: the body has handlers for "${stray}", which the head does not declare`);
	return mechanic({ ...declared, ...body, tools });
}

/**
 * Handlers of some declared tools, written apart from `implement` (in a second file, or above it):
 * a unit the compiler and the editor check alone. Spread into the body's `tools`.
 */
export function handlersFor<H extends { readonly tools?: Readonly<Record<string, { readonly params: TSchema }>> }, K extends keyof NonNullable<H["tools"]>>(
	_declared: H,
	handlers: { readonly [N in K]: ToolHandlers<ShapeOfHead<H>, NonNullable<H["tools"]>[N]["params"]> },
): { readonly [N in K]: ToolHandlers<ShapeOfHead<H>, NonNullable<H["tools"]>[N]["params"]> } {
	return handlers;
}

type AnyDeclaredHead = DeclaredHead<string, TSchema, TSchema, unknown, EventSchemas, PromptKeys, readonly ApiDefinition[], readonly ApiDefinition[], readonly ApiDefinition[], DecisionSchemas, Readonly<Record<string, TSchema>>>;
type AnyHandlerBody = HandlerBody<string, TSchema, TSchema, unknown, EventSchemas, PromptKeys, readonly ApiDefinition[], readonly ApiDefinition[], readonly ApiDefinition[], DecisionSchemas, Readonly<Record<string, TSchema>>, Readonly<Record<string, TSchema>>>;
