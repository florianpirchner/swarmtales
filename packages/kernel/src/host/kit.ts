/**
 * The typed side of one mechanic instance: its contexts and the kit its `build` receives. Every
 * value that crosses into or out of the instance (tool arguments, service input and output, event
 * payloads of other mechanics, snapshot slices) is checked against its schema here, so the host
 * deals only in `unknown` and no type assertion is needed anywhere.
 */
import type { Static, TSchema } from "typebox";
import { Check, Parse } from "typebox/value";
import {
	CONSULT_SKIPPED,
	CORE_EVENTS,
	DEFAULT_ORDER,
	type ConsultSkip,
	type ApiDefinition,
	type ApiMethodName,
	type ApiImplementation,
	type ApiOutput,
	type FactView,
	type MechanicCommits,
	type MechanicContext,
	type MechanicKit,
	type MechanicPort,
	type MechanicShape,
	type PromptKeys,
	type ProvidedApi,
	type StateSetup,
	type ToolContext,
	type Actor,
	type Consulted,
	type Refusal,
	type ResidentId,
	type RoleReply,
	type Settlement,
} from "@swarmtales/contracts";

/** Where an instance keeps its state; a snapshot load replaces the value. */
export interface StateRef<S> {
	value: S;
}

export interface InstanceParts<M extends MechanicShape> {
	readonly port: MechanicPort;
	readonly options: Static<M["options"]>;
	readonly state: StateRef<M["state"]>;
	readonly setup: StateSetup<M["options"]>;
	readonly events: M["events"];
	readonly prompts: PromptKeys;
	/** The head's decision kinds (absent ones are not declared). */
	readonly decisions: Partial<M["decisions"]>;
}

function isMethodOf<A extends ApiDefinition>(api: A, method: string): method is ApiMethodName<A> {
	return Object.hasOwn(api.methods, method);
}

/** `record[key]` with its exact type; throws when the key is missing at run time. */
function entry<T extends object, K extends keyof T>(record: T, key: K, what: string): T[K] {
	if (!(key in record)) throw new Error(`${what} is not declared`);
	return record[key];
}

/** A method's schema with its exact type (a property access on a generic would widen it to `TSchema`). */
function methodSchema<A extends ApiDefinition, K extends ApiMethodName<A>, Part extends "input" | "output">(api: A, method: K, part: Part): A["methods"][K][Part] {
	return entry(entry(entry(api, "methods", api.name), method, `${api.name}.${method}`), part, `${api.name}.${method}.${part}`);
}

function invoke<A extends ApiDefinition, Ctx, K extends ApiMethodName<A>>(
	api: A,
	implementation: Partial<ApiImplementation<A, Ctx>>,
	method: K,
	input: unknown,
	ctx: Ctx,
	caller: string,
): ApiOutput<A, K> {
	const run = implementation[method];
	if (run === undefined) throw new Error(`${api.name}.${method} is not implemented`);
	return run(parseWith(methodSchema(api, method, "input"), input, `${api.name}.${method} input`), ctx, caller);
}

function parseWith<T extends TSchema>(schema: T, value: unknown, what: string): Static<T> {
	try {
		return Parse(schema, value);
	} catch {
		throw new Error(`${what} does not match its schema`);
	}
}

function isSkip(value: unknown): value is ConsultSkip {
	return typeof value === "object" && value !== null && CONSULT_SKIPPED in value;
}

function isRefusal(value: unknown): value is Refusal {
	return typeof value === "object" && value !== null && "ok" in value && value.ok === false && "code" in value && typeof value.code === "string";
}

/** A role's untrusted reply, checked against the tool's answer schema. */
function readReply<A extends TSchema>(role: string, schema: A, reply: RoleReply | undefined): Consulted<Static<A>> {
	if (reply === undefined) return { ok: false, reason: "absent", error: `no role "${role}" in this run` };
	if (!reply.ok) return { ok: false, reason: "failed", error: reply.error };
	try {
		return { ok: true, answer: Parse(schema, reply.answer) };
	} catch {
		return { ok: false, reason: "failed", error: `the answer of ${role} does not match its schema` };
	}
}

/** The context of tools (with the caller) and of everything else (actor `host`). */
export function contextFor<M extends MechanicShape>(parts: InstanceParts<M>, actor: Actor = "host", resident?: ResidentId): ToolContext<M> {
	const { port, prompts } = parts;
	return {
		mechanic: port.id,
		seed: port.seed,
		actor,
		resident,
		options: parts.options,
		get state() {
			return parts.state.value;
		},
		get minute() {
			return port.minute();
		},
		minutes: port.minutes,
		residents: port.residents,
		schedule: port.schedule,
		access: port.access,
		roles: port.roles,
		log: port.log,
		emit(type, payload) {
			port.emit(type, payload);
		},
		call(api, method, input) {
			return parseWith(methodSchema(api, method, "output"), port.call(api.name, method, input), `${api.name}.${method} output`);
		},
		has: (api) => port.has(api.name),
		tryCall(api, method, input) {
			if (!port.has(api.name)) return undefined;
			return parseWith(methodSchema(api, method, "output"), port.call(api.name, method, input), `${api.name}.${method} output`);
		},
		prompt(id, variables) {
			const declared = prompts[id];
			if (declared === undefined) throw new Error(`${port.id}: prompt "${id}" is not declared`);
			return port.render(id, variables, declared);
		},
		random: () => port.random(),
		rng: (...labels) => port.rng(...labels),
		stage(tool, params, options) {
			port.stage(tool, params, options);
		},
		decide(kind, proposal, options, commit) {
			return port.decide(kind, proposal, options, commit);
		},
		decisions: port.decisions,
	};
}

function isDecisionOf<M extends MechanicShape>(decisions: Partial<M["decisions"]>, kind: string): kind is keyof M["decisions"] & string {
	return Object.hasOwn(decisions, kind);
}

/** The commit of one decision kind, its proposal checked against the kind's schema first. */
export function commitOf<M extends MechanicShape>(
	parts: InstanceParts<M>,
	commits: MechanicCommits<M>,
	kind: string,
): (proposal: unknown, settled: Settlement, ctx: MechanicContext<M>) => void {
	const id = parts.port.id;
	const asked: string = kind;
	if (!isDecisionOf<M>(parts.decisions, kind)) throw new Error(`${id}: no decision "${asked}"`);
	const schema = parts.decisions[kind];
	const run = commits[kind];
	if (schema === undefined || run === undefined) throw new Error(`${id}: no commit for the decision "${kind}"`);
	return (proposal, settled, ctx) => {
		run(parseWith(schema, proposal, `${id}.${kind} proposal`), settled, ctx);
	};
}

export function viewFor<M extends MechanicShape>(parts: InstanceParts<M>): FactView<M> {
	const { port } = parts;
	/** A query through the port; a fact or limit never runs a command (R2-D4). */
	const query = <A extends ApiDefinition, K extends ApiMethodName<A>>(api: A, method: K, input: unknown): ApiOutput<A, K> => {
		const name: string = method;
		if (entry(api.methods, method, `${api.name}.${name}`).kind !== "query") throw new Error(`${port.id}: a fact may call only queries, not ${api.name}.${name}`);
		return parseWith(methodSchema(api, method, "output"), port.call(api.name, method, input), `${api.name}.${name} output`);
	};
	return {
		call: (api, method, input) => query(api, method, input),
		tryCall: (api, method, input) => (port.has(api.name) ? query(api, method, input) : undefined),
		options: parts.options,
		get state() {
			return parts.state.value;
		},
		get minute() {
			return port.minute();
		},
		residents: port.residents,
		log: port.log,
		decisions: port.decisions,
	};
}

/** A listener's order, checked: a number from the story's table, or `DEFAULT_ORDER`. */
function listenerOrder(order: number | undefined): number {
	if (order === undefined) return DEFAULT_ORDER;
	if (!Number.isFinite(order)) throw new RangeError(`listener: invalid order ${String(order)}`);
	return order;
}

/** A provider of `api` over a full or partial implementation. */
function provided<A extends ApiDefinition, Ctx>(api: A, implementation: Partial<ApiImplementation<A, Ctx>>, ctx: () => Ctx): ProvidedApi {
	return {
		api,
		call(method, input, caller) {
			const name: string = method;
			if (!isMethodOf(api, method)) throw new Error(`${api.name} has no method "${name}"`);
			return invoke(api, implementation, method, input, ctx(), caller);
		},
	};
}

export function createKit<M extends MechanicShape>(parts: InstanceParts<M>): MechanicKit<M> {
	const { port } = parts;
	const ctx = (): MechanicContext<M> => contextFor(parts);
	return {
		tool(definition) {
			const described = definition.description;
			const prompt =
				typeof described === "string"
					? undefined
					: { id: described.prompt, variables: described.variables(parts.options), declared: parts.prompts[described.prompt] ?? [] };
			return {
				name: definition.name,
				description: typeof described === "string" ? described : described.prompt,
				...(prompt === undefined ? {} : { descriptionPrompt: prompt }),
				parameters: definition.parameters,
				limit: definition.limit,
				suggest: definition.suggest ?? [],
				serves: definition.serves,
				...(definition.free === true ? { free: true } : {}),
				...(definition.consult === undefined ? {} : { consult: { role: definition.consult.role, answer: definition.consult.answer } }),
				prepare(raw, actor, resident) {
					let params: Static<typeof definition.parameters>;
					try {
						params = Parse(definition.parameters, raw);
					} catch {
						return undefined;
					}
					const toolCtx = contextFor(parts, actor, resident);
					const consult = definition.consult;
					let consulted: Consulted<Static<NonNullable<typeof consult>["answer"]>> = { ok: false, reason: "absent", error: "the tool consults no role" };
					return {
						params,
						rule: () => definition.rule?.(params, toolCtx),
						guardText: () => definition.guardText?.(params),
						consult:
							consult === undefined
								? undefined
								: {
										role: consult.role,
										ask: () => {
											const asked = consult.ask(params, toolCtx);
											if (isSkip(asked)) return { skipped: asked[CONSULT_SKIPPED] };
											if (isRefusal(asked)) return asked;
											if (!Check(consult.question, asked)) throw new Error(`${port.id}: the question of ${definition.name} does not match its schema`);
											return { question: asked };
										},
										read: (answer) => {
											consulted = readReply(consult.role, consult.answer, answer);
											return consulted;
										},
										skip: (reason) => {
											consulted = { ok: false, reason: "skipped", error: reason };
										},
									},
						execute: () => definition.execute(params, toolCtx, consulted),
					};
				},
			};
		},
		provide(api, implementation) {
			return provided(api, implementation, ctx);
		},
		provideSome(api, implementation) {
			return provided(api, implementation, ctx);
		},
		on(type, handler, options) {
			const schema = entry(parts.events, type, `${port.id}.${type}`);
			return {
				source: port.id,
				type,
				schema,
				immediate: options?.immediate === true,
				order: listenerOrder(options?.order),
				handle: (event) => {
					const payload = parseWith(schema, event.payload, `${port.id}.${type}`);
					handler(payload, ctx(), { ...event, type, payload });
				},
			};
		},
		listen(source, type, handler, options) {
			const schema = entry(entry(source, "events", source.id), type, `${source.id}.${type}`);
			return {
				source: source.id,
				type,
				schema,
				immediate: options?.immediate === true,
				order: listenerOrder(options?.order),
				handle: (event) => {
					const payload = parseWith(schema, event.payload, `${source.id}.${type}`);
					handler(payload, ctx(), { ...event, type, payload });
				},
			};
		},
		core(type, handler, options) {
			const schema = CORE_EVENTS[type];
			return {
				source: "core",
				type,
				schema,
				immediate: options?.immediate === true,
				order: listenerOrder(options?.order),
				handle: (event) => {
					handler(parseWith(schema, event.payload, `core.${type}`), ctx(), event);
				},
			};
		},
		fact(output, compute) {
			const view = viewFor(parts);
			return { output, compute: () => compute(view) };
		},
		limit(id, summary, breached) {
			const view = viewFor(parts);
			return { id: `${port.id}.${id}`, summary, check: () => breached(view) };
		},
		snapshot(definition) {
			return {
				version: definition.version,
				save() {
					const data = definition.save(parts.state.value);
					if (!Check(definition.schema, data)) throw new Error(`${port.id}: the saved snapshot slice does not match its schema`);
					return data;
				},
				load(data, version) {
					if (version > definition.version) throw new Error(`${port.id}: snapshot slice version ${version} is newer than ${definition.version}`);
					let current = data;
					for (let step = version; step < definition.version; step++) {
						const migrate = definition.migrations?.[step];
						if (migrate === undefined) throw new Error(`${port.id}: no migration from snapshot slice version ${step}`);
						current = migrate(current);
					}
					parts.state.value = definition.load(parseWith(definition.schema, current, `${port.id} snapshot slice`), parts.setup);
				},
			};
		},
	};
}
