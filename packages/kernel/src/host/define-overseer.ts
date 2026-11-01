/**
 * `defineOverseer` (docs/design/overseer-api.md §1): an overseer's head and body, typed like a
 * mechanic's. The generics come from the head (options, state, events, prompts, input, output); the
 * result is the erased `OverseerDefinition` a story uses under a name (`as`). Everything that comes
 * back from the body (call variables, fallback answers, emitted payloads, snapshot slices) is
 * checked against its schema, so the host deals only in `unknown`.
 */
import type { Static, TSchema } from "typebox";
import { Check, Clone, Default, Parse } from "typebox/value";
import type {
	EventSchemas,
	Fired,
	InputPromptId,
	OverseerBody,
	OverseerContext,
	OverseerDefinition,
	OverseerHead,
	OverseerInstance,
	OverseerKit,
	OverseerPort,
	OverseerShapeOf,
	PromptKeys,
	SnapshotSlice,
	StateSetup,
} from "@swarmtales/contracts";

/** Where an overseer keeps its state; a snapshot load replaces the value. */
interface StateRef<S> {
	value: S;
}

function parseWith<T extends TSchema>(schema: T, value: unknown, what: string): Static<T> {
	try {
		return Parse(schema, value);
	} catch {
		throw new Error(`${what} does not match its schema`);
	}
}

/** One call's variables: exactly the input prompt's, without `standingOrders`, each a string or a number. */
function checkedVariables(id: string, declared: readonly string[], variables: unknown): Readonly<Record<string, string | number>> {
	if (typeof variables !== "object" || variables === null || Array.isArray(variables)) throw new Error(`${id}: calls() gave a call that is not an object of variables`);
	const entries = Object.entries(variables);
	const out: Record<string, string | number> = {};
	for (const [name, value] of entries) {
		if (!declared.includes(name)) throw new Error(`${id}: calls() gave the variable "${name}", which the input prompt does not take`);
		if (typeof value !== "string" && typeof value !== "number") throw new Error(`${id}: calls() gave the variable "${name}" that is neither a string nor a number`);
		out[name] = value;
	}
	const missing = declared.find((name) => !Object.hasOwn(out, name));
	if (missing !== undefined) throw new Error(`${id}: calls() left out the variable "${missing}"`);
	return out;
}

export function defineOverseer<const Id extends string, O extends TSchema, S, E extends EventSchemas, const P extends PromptKeys, Out extends TSchema, const I extends InputPromptId<P>>(
	head: OverseerHead<Id, O, S, E, P, Out> & { readonly input: I },
	build: (kit: OverseerKit<OverseerShapeOf<O, S, E, P, I, Out>>) => OverseerBody<OverseerShapeOf<O, S, E, P, I, Out>>,
): OverseerDefinition<Id, O, E> {
	type H = OverseerShapeOf<O, S, E, P, I, Out>;
	const id = head.id;
	const parseOptions = (raw: unknown): Static<O> => {
		try {
			return Parse(head.options, Default(head.options, Clone(raw ?? {})));
		} catch {
			throw new Error(`${id}: the options do not match the schema`);
		}
	};
	const inputVariables = (head.prompts[head.input] ?? []).filter((name) => name !== "standingOrders");
	const instantiate = (port: OverseerPort, raw: unknown): OverseerInstance => {
		const options = parseOptions(raw);
		const setup: StateSetup<O> = {
			options,
			residents: port.residents.ids,
			seed: port.seed,
			random: () => port.rng("overseer", port.name, "state"),
			rng: (...labels) => port.rng(...labels),
		};
		const state: StateRef<S> = { value: head.state(setup) };
		const ctx: OverseerContext<H> = {
			self: port.name,
			options,
			get state() {
				return state.value;
			},
			get minute() {
				return port.minute();
			},
			residents: port.residents,
			log: port.log,
			facts: () => port.facts(),
			decisions: port.decisions,
			display: (text) => port.display(text),
			emit(type, payload) {
				port.emit(type, payload);
			},
			prompt(prompt, variables) {
				const declared = head.prompts[prompt];
				if (declared === undefined) throw new Error(`${id}: prompt "${prompt}" is not declared`);
				return port.render(prompt, variables, declared);
			},
			rng: (...labels) => port.rng(...labels),
		};
		const kit: OverseerKit<H> = {
			snapshot(definition): SnapshotSlice {
				return {
					version: definition.version,
					save() {
						const data = definition.save(state.value);
						if (!Check(definition.schema, data)) throw new Error(`${id}: the saved snapshot slice does not match its schema`);
						return data;
					},
					load(data, version) {
						if (version > definition.version) throw new Error(`${id}: snapshot slice version ${String(version)} is newer than ${String(definition.version)}`);
						let current = data;
						for (let step = version; step < definition.version; step++) {
							const migrate = definition.migrations?.[step];
							if (migrate === undefined) throw new Error(`${id}: no migration from snapshot slice version ${String(step)}`);
							current = migrate(current);
						}
						state.value = definition.load(parseWith(definition.schema, current, `${id} snapshot slice`), setup);
					},
				};
			},
		};
		const body = build(kit);
		const stateful = state.value !== undefined;
		if (stateful && body.snapshot === undefined) throw new Error(`${id}: has state but no snapshot slice`);
		return {
			stateful,
			snapshot: body.snapshot,
			calls: (fired: Fired) => body.calls(fired, ctx).map((variables) => checkedVariables(id, inputVariables, variables)),
			settle(output, call) {
				body.settle?.(parseWith(head.output, output, `${id} answer`), call, ctx);
			},
			fallback(fired) {
				const output = body.fallback(fired, ctx);
				if (output === undefined) return undefined;
				if (!Check(head.output, output)) throw new Error(`${id}: the fallback answer does not match the output schema`);
				return { output: Clone(output) };
			},
		};
	};
	const definition: OverseerDefinition<Id, O, E> = {
		id,
		summary: head.summary,
		options: head.options,
		events: head.events,
		prompts: head.prompts,
		system: head.system,
		input: head.input,
		output: head.output,
		answer: head.answer,
		model: head.model,
		lifetime: head.lifetime,
		triggers: head.triggers,
		needs: head.needs ?? [],
		limits: head.limits,
		...(head.audiences === undefined ? {} : { audiences: head.audiences }),
		parseOptions,
		instantiate,
		as(name, given) {
			const { limits, ...rest } = given ?? {};
			// Checked at once: a bad option fails where the story is written, not at load.
			const options: unknown = parseOptions(rest);
			return { name, overseer: definition, options, ...(limits === undefined ? {} : { limits }) };
		},
	};
	return definition;
}
