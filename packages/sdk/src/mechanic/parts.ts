// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The seams between the files of `mechanic/` (type-only): what `define-mechanic.ts` hands to `context.ts`,
 * `hooks.ts` and `kit.ts` for one instance, and the binders `kit.ts` gives back. No file needs an inert kit: the
 * tools are data of the head.
 */
import type { TSchema } from "typebox";
import type { CanonicalTool, Fact, KernelTool, PluginPort, PromptLookup, ProvidedService, RunLimit, ServiceDefinition, SnapshotSlice } from "@swarmtales/contracts";
import type { MechanicContext, MechanicShape, ServiceImplementation, Setup } from "./context-types.ts";
import type { BodyParts, DeclaredTool, FactSpec, LimitSpec, ListenKit, PluginHead, SnapshotSpec, ToolHandlers } from "./types.ts";

/**
 * One instance while it is bound: the port, the erased head, the parsed options, the state and the texts.
 *
 * @internal
 */
export interface InstanceParts<M extends MechanicShape> {
	/** The untyped primitives the kernel gave this instance. */
	readonly port: PluginPort;
	/** The erased head: its events, prompts and package. */
	readonly head: PluginHead;
	/** The options, parsed, with defaults filled. */
	readonly options: M["options"];
	/** Where the instance keeps its state; a snapshot load replaces the value. */
	readonly state: { value: M["state"] };
	/** What the state of a fresh run was built from; a snapshot load gets it too. */
	readonly setup: Setup<M["options"]>;
	/** The lookup that renders the mechanic's prompts. */
	readonly texts: PromptLookup;
	/** The tools of the game, bare name to canonical name: a lock names another mechanic's tool by it. */
	readonly tools?: ReadonlyMap<string, CanonicalTool>;
	/** Canonical name to shown name, from the game: `ctx.stage` names a tool as the grant of `script` shows it. */
	readonly names?: Readonly<Record<string, string>>;
}

/**
 * The slice of an instance as `define-mechanic.ts` hands it to the kit. Without `snapshot` the state is its own slice.
 *
 * @internal
 */
export interface SliceSpec<M extends MechanicShape> {
	/** The version of the saved form. */
	readonly version: number;
	/** The schema of the saved form. */
	readonly schema: TSchema;
	/** How a state that is not plain JSON is saved and loaded. */
	readonly snapshot?: SnapshotSpec<M["state"], unknown, M["options"]>;
	/** `migrations[v]` turns a slice of version `v` into version `v + 1`. */
	readonly migrations?: Readonly<Record<number, (data: unknown) => unknown>>;
}

/**
 * The binders of one instance (`createKit(parts)` in `kit.ts`): each turns one declared part and its handlers into
 * the erased form the kernel holds. `define-mechanic.ts` calls them once per entry of the head and the body.
 *
 * @internal
 */
export interface MechanicKit<M extends MechanicShape> extends ListenKit<M> {
	/** Binds a declared tool to its handlers: `prepare` converts the arguments, checks them, then binds `check` and `run`. */
	tool(declared: DeclaredTool, handlers: ToolHandlers<M, TSchema>): KernelTool;
	/** Binds a provided service; input and output are checked against the method's schemas (SWT-M022). */
	provide(service: ServiceDefinition, implementation: ServiceImplementation<ServiceDefinition, MechanicContext<M>>): ProvidedService;
	/** Binds a fact; its value is checked against `output`. */
	fact(spec: FactSpec<M, TSchema>): Fact;
	/** Binds a run limit under the bare id. */
	limit(id: string, spec: LimitSpec<M>): RunLimit;
	/** Binds the snapshot slice: migrates, checks the schema and replaces the state on load. */
	slice(spec: SliceSpec<M>): SnapshotSlice;
}

/**
 * A body with every type erased: what the implementation of `defineMechanic` works on. The body of the generic
 * signature fits it (`const erased: ErasedBody = body` inside `defineMechanic<H, F>`), and so does an implementation
 * signature `(head: AnyHead, body: ErasedBody)` under the typed overload. A body of one concrete head does not: its
 * service functions take a narrower input.
 *
 * @internal
 */
export interface ErasedBody extends BodyParts<MechanicShape, Readonly<Record<string, TSchema>>> {
	/** The handlers of the declared tools, by bare name. */
	readonly tools?: Readonly<Record<string, ToolHandlers<MechanicShape, TSchema>>>;
	/** The implementations of the provided services, by service name. */
	readonly services?: Readonly<Record<string, ServiceImplementation<ServiceDefinition, MechanicContext<MechanicShape>>>>;
}
