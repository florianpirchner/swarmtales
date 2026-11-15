// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The contexts of one mechanic instance over the kernel's untyped `PluginPort`. Author words become kernel words
 * here, once: a resident id (`A01`) is the actor `resident:A01`, and a mechanic's own tool (`playMove`) is the
 * canonical `<package>/<id>/playMove`. What crosses the port is checked against its schema, so no value needs a
 * type assertion.
 */
import type { TSchema } from "typebox";
import { Check, Errors } from "typebox/value";
import { actorId, kindOf, nameOf, SwtError, type ActorId, type ActorsView, type CanonicalTool, type ServiceDefinition } from "@swarmtales/contracts";
import { commandInView, payloadMismatch, serviceMismatch } from "../errors.ts";
import type { FactView, MechanicShape, ResidentAccess, ResidentsPort, ResidentsView, ServiceMethodName, ServiceOutput, ToolContext, ToolName } from "./context-types.ts";
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

function accessOf<M extends MechanicShape>({ port, head, tools }: InstanceParts<M>): ResidentAccess {
	// A `ToolRef` holds no package, so it names a tool of this mechanic; so does a bare name the mechanic declares.
	// Any other bare name is the tool of another mechanic of the game, as on the old platform.
	const canonical = (tool: ToolName): CanonicalTool => {
		const name = typeof tool === "string" ? tool : tool.name;
		const other = typeof tool === "string" && !head.tools.some((declared) => declared.name === name) ? tools?.get(name) : undefined;
		return other ?? `${port.source}/${name}`;
	};
	return {
		lock(resident, tool) {
			port.access.lock(actorOf(resident), canonical(tool));
		},
		unlock(resident, tool) {
			port.access.unlock(actorOf(resident), canonical(tool));
		},
		isLocked: (resident, tool) => port.access.isLocked(actorOf(resident), canonical(tool)),
		isOpen: (resident, tool) => port.access.isOpen(actorOf(resident), canonical(tool)),
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
