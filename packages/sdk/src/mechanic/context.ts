// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The contexts of one mechanic instance over the kernel's untyped `PluginPort`. Author words become kernel words
 * here, once: a resident id (`A01`) is the actor `resident:A01`, and a mechanic's own tool (`playMove`) is the
 * canonical `<package>/<id>/playMove`. What crosses the port is checked against its schema, so no value needs a
 * type assertion. The typed `then` job of a staged call (`onStaged`) lives here too: it checks what the kernel hands it.
 */
import { Type, type TSchema } from "typebox";
import { Check, Errors } from "typebox/value";
import { actorId, kindOf, nameOf, SwtError, type ActorId, type ActorsView, type CanonicalTool, type JsonValue, type ServiceDefinition, type StagedOutcome } from "@swarmtales/contracts";
import { commandInView, payloadMismatch, serviceMismatch } from "../errors.ts";
import type { FactView, MechanicContext, MechanicShape, ResidentAccess, ResidentsPort, ResidentsView, ServiceMethodName, ServiceOutput, ToolContext, ToolName } from "./context-types.ts";
import type { InstanceParts } from "./parts.ts";

/**
 * The actor kind of a resident: the part of its actor id before the colon.
 *
 * @public
 */
export const RESIDENT_KIND = "resident";

/**
 * Reads the resident id of an actor.
 *
 * @param actor - The actor id.
 * @returns The bare id (`A01` of `resident:A01`); undefined when the actor is no resident.
 *
 * @public
 */
export function residentOf(actor: ActorId): string | undefined {
	return kindOf(actor) === RESIDENT_KIND ? nameOf(actor) : undefined;
}

/**
 * Builds the actor id of a resident.
 *
 * @param resident - The bare resident id.
 * @returns The actor id `resident:<id>`.
 *
 * @public
 */
export function actorOf(resident: string): ActorId {
	return actorId(RESIDENT_KIND, resident);
}

// `record[key]` with its exact type: a property access on a generic would widen a schema to `TSchema`.
function at<T extends object, K extends keyof T>(record: T, key: K): T[K] {
	return record[key];
}

// The first mismatch of a value that failed `Check`.
function mismatch(schema: TSchema, value: unknown): { readonly path: string; readonly message: string } {
	const first = Errors(schema, value)[0];
	return { path: first === undefined || first.instancePath === "" ? "/" : first.instancePath, message: first?.message ?? "does not match its schema" };
}

// Calls a service through the port and checks the answer against the method's output schema (SWT-M022).
function callChecked<M extends MechanicShape, A extends ServiceDefinition, K extends ServiceMethodName<A>>(parts: InstanceParts<M>, service: A, method: K, input: unknown): ServiceOutput<A, K> {
	const schema = at(at(at(service, "methods"), method), "output");
	const output = parts.port.call(service.name, method, input);
	if (Check(schema, output)) return output;
	// The port does not say who provides a service, so the issue names no provider.
	throw new SwtError(serviceMismatch({ service: service.name, method, side: "output", caller: parts.port.id, ...mismatch(schema, output) }));
}

// Refuses a method that is declared and is no query (SWT-M025), before the port is asked: a view only reads.
function queryOnly<M extends MechanicShape>(parts: InstanceParts<M>, service: ServiceDefinition, method: string): void {
	const declared = Object.hasOwn(service.methods, method) ? service.methods[method] : undefined;
	if (declared !== undefined && declared.kind !== "query") throw new SwtError(commandInView({ mechanic: parts.port.id, package: parts.head.package, service: service.name, method }));
}

function residentsView<M extends MechanicShape>({ port }: InstanceParts<M>): ResidentsView {
	return {
		get ids() {
			return port.actors.ofKind(RESIDENT_KIND).map(nameOf);
		},
		has: (id) => port.actors.has(actorOf(id)),
		mayAct: (id) => port.actors.mayAct(actorOf(id)),
	};
}

function residentsOf<M extends MechanicShape>(parts: InstanceParts<M>): ResidentsPort {
	const view = residentsView(parts);
	const { actors } = parts.port;
	return {
		get ids() {
			return view.ids;
		},
		has: (id) => view.has(id),
		mayAct: (id) => view.mayAct(id),
		suspend(id, reason) {
			actors.suspend(actorOf(id), reason);
		},
		resume(id) {
			actors.resume(actorOf(id));
		},
	};
}

// The actors without the commands of the port: a mechanic suspends residents through `ctx.residents`.
function actorsView(actors: ActorsView): ActorsView {
	return {
		get ids() {
			return actors.ids;
		},
		ofKind: (kind) => actors.ofKind(kind),
		has: (id) => actors.has(id),
		mayAct: (id) => actors.mayAct(id),
		shared: (id, key) => actors.shared(id, key),
	};
}

// A `ToolRef` holds no package, so it names a tool of this mechanic; so does a bare name the mechanic declares.
// Any other bare name is the tool of another mechanic of the game, as on the old platform.
function canonicalOf<M extends MechanicShape>({ port, head, tools }: InstanceParts<M>, tool: ToolName): CanonicalTool {
	const name = typeof tool === "string" ? tool : tool.name;
	const other = typeof tool === "string" && !head.tools.some((declared) => declared.name === name) ? tools?.get(name) : undefined;
	return other ?? `${port.source}/${name}`;
}

function accessOf<M extends MechanicShape>(parts: InstanceParts<M>): ResidentAccess {
	return {
		lock(resident, tool) {
			parts.port.access.lock(actorOf(resident), canonicalOf(parts, tool));
		},
		unlock(resident, tool) {
			parts.port.access.unlock(actorOf(resident), canonicalOf(parts, tool));
		},
		isLocked: (resident, tool) => parts.port.access.isLocked(actorOf(resident), canonicalOf(parts, tool)),
		isOpen: (resident, tool) => parts.port.access.isOpen(actorOf(resident), canonicalOf(parts, tool)),
	};
}

/**
 * Builds the context of one instance: of a tool when an actor calls, else of hooks, listeners, jobs, services and
 * pipeline handlers.
 *
 * @param parts - The parts of the instance.
 * @param actor - Who calls; `kernel` when left out, and the context then has no resident.
 * @returns The context. `state` and `tick` are live; `emit`, `call` and `tryCall` throw an `SwtError` with
 * `SWT-M021` (a payload that does not match the head's schema) or `SWT-M022` (a service output that does not
 * match the method's schema).
 *
 * @public
 */
export function contextFor<M extends MechanicShape>(parts: InstanceParts<M>, actor: ActorId = "kernel"): ToolContext<M> {
	const { port, head } = parts;
	return {
		mechanic: port.id,
		seed: port.seed,
		actor,
		resident: residentOf(actor),
		options: parts.options,
		get state() {
			return parts.state.value;
		},
		get tick() {
			return port.tick();
		},
		ticks: port.maxTicks,
		residents: residentsOf(parts),
		actors: actorsView(port.actors),
		schedule: port.schedule,
		access: accessOf(parts),
		emit(type, payload) {
			const schema = head.events[type];
			// An event the head does not declare goes to the port unchecked: the kernel refuses it.
			if (schema !== undefined && !Check(schema, payload)) throw new SwtError(payloadMismatch({ mechanic: port.id, type, package: head.package, ...mismatch(schema, payload) }));
			port.emit(type, payload);
		},
		call: (service, method, input) => callChecked(parts, service, method, input),
		has: (service) => port.has(service.name),
		tryCall: (service, method, input) => (port.has(service.name) ? callChecked(parts, service, method, input) : undefined),
		// The kernel finds a staged tool by the name the grant of `script` shows it by.
		stage: (tool, params, options) => { port.stage(parts.names?.[canonicalOf(parts, tool)] ?? (typeof tool === "string" ? tool : tool.name), params, options); },
		prompt: (id, variables) => parts.texts.render(port.id, id, variables, head.prompts[id] ?? []),
		rng: (...labels) => port.rng(...labels),
	};
}

/**
 * Builds the read-only view of one instance, for its facts and run limits.
 *
 * @param parts - The parts of the instance.
 * @returns The view. `state` and `tick` are live; `call` and `tryCall` throw an `SwtError` with `SWT-M022` for a
 * service output that does not match the method's schema, and with `SWT-M025` for a method that is a command
 * (the type of the view refuses it too); the command is not called.
 *
 * @public
 */
export function viewFor<M extends MechanicShape>(parts: InstanceParts<M>): FactView<M> {
	const { port } = parts;
	return {
		options: parts.options,
		get state() {
			return parts.state.value;
		},
		get tick() {
			return port.tick();
		},
		residents: residentsView(parts),
		call: (service, method, input) => (queryOnly(parts, service, method), callChecked(parts, service, method, input)),
		tryCall: (service, method, input) => (queryOnly(parts, service, method), port.has(service.name) ? callChecked(parts, service, method, input) : undefined),
	};
}

/**
 * The outcome of a staged call as its `then` job gets it: the contracts type `StagedOutcome` as a schema.
 *
 * @public
 */
export const StagedOutcomeSchema = Type.Union([Type.Object({ ok: Type.Literal(true), reply: Type.String({ description: "The reply of the call" }) }, { additionalProperties: false, description: "The staged call ran" }), Type.Object({ ok: Type.Literal(false), code: Type.String({ description: "The refusal code" }), detail: Type.Optional(Type.String({ description: "The refusal text" })) }, { additionalProperties: false, description: "The staged call was refused" })], { description: "The outcome of a staged call" });

/**
 * The typed form of a job that a staged call names as its `then` (`ctx.stage(tool, params, { then })`).
 *
 * @param job - Gets the context and the outcome of the staged call.
 * @returns The job, for the body's `jobs`. It checks its data against {@link StagedOutcomeSchema}: data that is no
 * outcome (the job was scheduled with other data) throws a `RangeError`, and the kernel ends the run with `SWT-R003`.
 * @example
 * ```ts
 * jobs: { minuteRan: onStaged((ctx, outcome) => { if (!outcome.ok) ctx.emit("skipped", { code: outcome.code }); }) },
 * ```
 *
 * @public
 */
export const onStaged = <M extends MechanicShape>(job: (ctx: MechanicContext<M>, outcome: StagedOutcome) => void): ((ctx: MechanicContext<M>, data: JsonValue | undefined) => void) => (ctx, data) => { if (!Check(StagedOutcomeSchema, data)) throw new RangeError(`a \`then\` job of "${ctx.mechanic}" got ${JSON.stringify(data)}, which is no outcome of a staged call`); job(ctx, data); };
