// SPDX-License-Identifier: Apache-2.0
/**
 * The binders of one mechanic instance: each turns one declared part of the head and its handlers of the body into
 * the erased form the kernel holds. Every value that crosses into or out of the instance (tool arguments, service
 * input and output, payloads of other mechanics' events, fact values, snapshot slices) is checked against its
 * schema here, so the kernel deals only in `unknown` and repeats no check.
 */
import type { TSchema } from "typebox";
import { Check, Errors, Parse } from "typebox/value";
import { SwtError, type ActorId, type Answerable, type Listener, type ServiceDefinition } from "@swarmtales/contracts";
import { factMismatch, payloadMismatch, serviceMismatch, sliceMismatch } from "../errors.ts";
import type { FactView, MechanicContext, MechanicShape, ToolContext } from "./context-types.ts";
import { bindReview } from "./hooks.ts";
import type { InstanceParts, MechanicKit, SliceSpec } from "./parts.ts";

/**
 * What the kit needs from its neighbours `context.ts` and `arguments.ts`. `define-mechanic.ts` passes the three
 * functions; a test passes stand-ins.
 *
 * @public
 */
export interface KitBinding {
	/** The context of a tool (with the caller) or of everything else (without an actor): `contextFor` of `context.ts`. */
	contextFor<M extends MechanicShape>(parts: InstanceParts<M>, actor?: ActorId): ToolContext<M>;
	/** The read-only view of facts and run limits: `viewFor` of `context.ts`. */
	viewFor<M extends MechanicShape>(parts: InstanceParts<M>): FactView<M>;
	/** The raw arguments converted to the schema's types: `convertArguments` of `arguments.ts`. */
	convertArguments(schema: TSchema, raw: unknown): unknown;
}

// The first place where `value` does not match `schema`.
function mismatch(schema: TSchema, value: unknown): { readonly path: string; readonly message: string } {
	const first = Errors(schema, value)[0];
	return { path: first?.instancePath ?? "", message: first?.message ?? "does not match its schema" };
}

// A type guard with a real check behind it: a value that matches the state schema is the state of a mechanic that is its own slice.
function isOwnSlice<M extends MechanicShape>(spec: SliceSpec<M>, value: unknown): value is M["state"] {
	return spec.snapshot === undefined && Check(spec.schema, value);
}

// `record[key]` with its exact type (an index access on a generic would widen it).
function entry<T extends object, K extends keyof T>(record: T, key: K): T[K] {
	return record[key];
}

// One call of a provided service: the method is found, the input parsed, the implementation run, the output parsed.
function serve<M extends MechanicShape>(parts: InstanceParts<M>, service: ServiceDefinition, run: ((input: unknown, ctx: MechanicContext<M>, caller: string) => unknown) | undefined, method: string, input: unknown, caller: string, ctx: MechanicContext<M>): unknown {
	const at = { service: service.name, method, provider: parts.port.id, caller };
	const declared = Object.hasOwn(service.methods, method) ? service.methods[method] : undefined;
	if (declared === undefined) throw new SwtError(serviceMismatch({ ...at, side: "input", path: "", message: `the service has no method "${method}"` }));
	if (run === undefined) throw new SwtError(serviceMismatch({ ...at, side: "output", path: "", message: "the provider has no implementation of the method" }));
	let parsed: unknown;
	try {
		parsed = Parse(declared.input, input);
	} catch {
		throw new SwtError(serviceMismatch({ ...at, side: "input", ...mismatch(declared.input, input) }));
	}
	const output = run(parsed, ctx, caller);
	try {
		return Parse(declared.output, output);
	} catch {
		throw new SwtError(serviceMismatch({ ...at, side: "output", ...mismatch(declared.output, output) }));
	}
}

// The slice binder: without `snapshot` the state is its own slice.
function bindSlice<M extends MechanicShape>(parts: InstanceParts<M>, spec: SliceSpec<M>): ReturnType<MechanicKit<M>["slice"]> {
	const at = { mechanic: parts.port.id, package: parts.head.package };
	const migrated = (data: unknown, version: number): unknown => {
		if (version > spec.version) throw new SwtError(sliceMismatch({ ...at, problem: "newer", version, known: spec.version }));
		let current = data;
		for (let step = version; step < spec.version; step++) {
			const migrate = spec.migrations?.[step];
			if (migrate === undefined) throw new SwtError(sliceMismatch({ ...at, problem: "no-migration", version: step }));
			current = migrate(current);
		}
		return current;
	};
	return {
		version: spec.version,
		save() {
			const data: unknown = spec.snapshot === undefined ? parts.state.value : spec.snapshot.save(parts.state.value);
			if (!Check(spec.schema, data)) throw new SwtError(sliceMismatch({ ...at, problem: "saved", ...mismatch(spec.schema, data) }));
			return data;
		},
		load(data, version) {
			const current = migrated(data, version);
			let parsed: unknown;
			try {
				parsed = Parse(spec.schema, current);
			} catch {
				throw new SwtError(sliceMismatch({ ...at, problem: "loaded", ...mismatch(spec.schema, current) }));
			}
			if (spec.snapshot !== undefined) parts.state.value = spec.snapshot.load(parsed, parts.setup);
			else if (isOwnSlice(spec, parsed)) parts.state.value = parsed;
		},
	};
}

// The listener binder: the payload is parsed with the declaring mechanic's schema before the handler sees it.
function bindListen<M extends MechanicShape>(parts: InstanceParts<M>, bind: KitBinding): MechanicKit<M>["listen"] {
	return (source, type, handler, options) => {
		const schema = entry(entry(source, "events"), type);
		const listener: Listener = {
			source: source.id,
			type,
			schema,
			run: (event) => {
				let payload;
				try {
					payload = Parse(schema, event.payload);
				} catch {
					throw new SwtError(payloadMismatch({ mechanic: source.id, type, ...mismatch(schema, event.payload) }));
				}
				handler(payload, bind.contextFor(parts), { ...event, type, payload });
			},
		};
		return options?.after === undefined ? listener : { ...listener, after: options.after };
	};
}

/**
 * Builds the binders of one instance. `define-mechanic.ts` calls them once per entry of the head and the body.
 *
 * A bound part throws an `SwtError` when a value does not match its schema: `SWT-M022` for a service input or
 * output (also for a method the service or the provider does not have), `SWT-M021` for the payload a listener is
 * handed, `SWT-M023` for a fact value, `SWT-M024` for a snapshot slice. A tool's `prepare` throws nothing for
 * arguments that do not fit: it answers undefined.
 *
 * @param parts - The instance: port, erased head, parsed options, state, setup and texts.
 * @param bind - The functions of `context.ts` and `arguments.ts` the binders call.
 * @returns The binders `tool`, `provide`, `listen`, `fact`, `limit` and `slice`.
 * @throws SwtError `tool` passes on what the prompt lookup throws when the description is a prompt id without a text.
 *
 * @public
 */
export function createKit<M extends MechanicShape>(parts: InstanceParts<M>, bind: KitBinding): MechanicKit<M> {
	const id = parts.port.id;
	return {
		tool(declared, handlers) {
			const variables = Object.hasOwn(parts.head.prompts, declared.description) ? parts.head.prompts[declared.description] : undefined;
			return {
				name: declared.name,
				description: variables === undefined ? declared.description : parts.texts.render(id, declared.description, {}, variables),
				parameters: declared.parameters,
				free: declared.free,
				...(handlers.review === undefined ? {} : { answerer: handlers.review.answerer }),
				prepare(raw, actor) {
					const converted = bind.convertArguments(declared.parameters, raw);
					let params;
					try {
						params = Parse(declared.parameters, converted);
					} catch {
						return undefined;
					}
					const ctx = bind.contextFor(parts, actor);
					return { params, rule: () => handlers.check?.(params, ctx), execute: (answer) => handlers.run(params, ctx, answer), review: (answerable: Answerable) => (handlers.review === undefined ? undefined : bindReview(handlers.review, params, ctx, answerable)) };
				},
				...(handlers.sample === undefined ? {} : { sample: (actor, random) => handlers.sample?.(bind.contextFor(parts, actor), random) }),
			};
		},
		provide(service, implementation) {
			return { service, call: (method, input, caller) => serve(parts, service, Object.hasOwn(implementation, method) ? implementation[method] : undefined, method, input, caller, bind.contextFor(parts)) };
		},
		listen: bindListen(parts, bind),
		fact(spec) {
			return {
				output: spec.output,
				compute() {
					const value: unknown = spec.compute(bind.viewFor(parts));
					if (Check(spec.output, value)) return value;
					// The binder is not told the name of the fact, so the issue names the mechanic only.
					throw new SwtError(factMismatch({ mechanic: id, package: parts.head.package, ...mismatch(spec.output, value) }));
				},
			};
		},
		limit(limitId, spec) {
			return { id: limitId, summary: spec.summary, check: () => spec.breached(bind.viewFor(parts)) };
		},
		slice: (spec) => bindSlice(parts, spec),
	};
}
