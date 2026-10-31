/**
 * `defineMechanic`, `defineApi` and `defineCoreStory`: the three calls an author writes. The
 * generics are inferred from the head (options, state, events, prompts, APIs) and from the tools
 * the body returns; the result is the erased `MechanicDefinition` the host loads.
 */
import type { Static, TSchema } from "typebox";
import { Default, Parse } from "typebox/value";
import type {
	ApiDefinition,
	ApiMethods,
	CoreStory,
	CoreStoryData,
	EventSchemas,
	MechanicBody,
	MechanicDefinition,
	MechanicHead,
	MechanicInstance,
	MechanicKit,
	MechanicTool,
	MechanicUse,
	PromptKeys,
	Refusal,
	Shape,
	ToolSuccess,
} from "@swarmtales/contracts";
import { contextFor, createKit, type InstanceParts } from "./kit.ts";

export function refuse(code: string, detail?: string): Refusal {
	return detail === undefined ? { ok: false, code } : { ok: false, code, detail };
}

export function reply(text: string): ToolSuccess {
	return { ok: true, reply: text };
}

export function defineApi<const N extends string, const M extends ApiMethods>(api: ApiDefinition<N, M>): ApiDefinition<N, M> {
	return api;
}

/** Checks the story's tool names against its mechanics at compile time; the host checks the rest at load. */
export function defineCoreStory<const Ms extends readonly MechanicUse[]>(story: CoreStory<Ms>): CoreStory<Ms> {
	return story;
}

/** The story as JSON data: mechanics by id and options. */
export function storyData(story: CoreStory): CoreStoryData {
	const { mechanics, ...rest } = story;
	return { ...rest, mechanics: mechanics.map((use) => ({ id: use.mechanic.id, options: use.options })) };
}

function bind<M extends Shape<TSchema, unknown, EventSchemas, PromptKeys, readonly ApiDefinition[], readonly ApiDefinition[]>, T extends readonly MechanicTool[]>(
	parts: InstanceParts<M>,
	body: MechanicBody<M, T>,
	provides: readonly ApiDefinition[],
): MechanicInstance {
	const ctx = contextFor(parts);
	const hooks = body.hooks ?? {};
	const pipeline = body.pipeline ?? {};
	const jobs = body.jobs ?? {};
	const services = body.services ?? [];
	const presentation = body.presentation ?? {};
	const id = parts.port.id;
	for (const api of provides) {
		if (services.filter((service) => service.api.name === api.name).length !== 1) throw new Error(`${id}: provides "${api.name}" but implements it ${String(services.filter((service) => service.api.name === api.name).length)} times`);
	}
	for (const service of services) {
		if (!provides.some((api) => api.name === service.api.name)) throw new Error(`${id}: implements "${service.api.name}" without declaring it in provides`);
	}
	const stateful = parts.state.value !== undefined;
	if (stateful && body.snapshot === undefined) throw new Error(`${id}: has state but no snapshot slice`);
	return {
		tools: body.tools ?? [],
		services,
		listeners: body.listeners ?? [],
		facts: body.facts ?? {},
		limits: body.limits ?? [],
		jobs: Object.keys(jobs),
		stateful,
		snapshot: body.snapshot,
		turns: body.turns,
		resolve: (tool, actor, params) => (presentation.resolve === undefined ? params : presentation.resolve({ tool, actor, params }, ctx)),
		display: (text) => presentation.display?.(text, ctx) ?? text,
		guardSecrets: (resident, minRun) => body.guard?.secrets(resident, minRun, ctx) ?? [],
		guardLeak: (text, secrets, minRun) => body.guard?.leaks?.(text, secrets, minRun, ctx),
		runJob(job, data) {
			const run = jobs[job];
			if (run === undefined) throw new Error(`${id}: no job "${job}"`);
			run(ctx, data);
		},
		hooks: {
			runStarted: () => hooks.runStarted?.(ctx),
			minuteStarted: () => hooks.minuteStarted?.(ctx),
			turnInputs: (resident) => hooks.turnInputs?.(resident, ctx) ?? [],
			news: (resident) => hooks.news?.(resident, ctx) ?? false,
			turnOpened: (resident) => hooks.turnOpened?.(resident, ctx),
			turnEnded: (resident) => hooks.turnEnded?.(resident, ctx),
			minuteEnded: () => hooks.minuteEnded?.(ctx),
			runEnded: (reason) => hooks.runEnded?.(reason, ctx),
			lock: (call) => pipeline.lock?.(call, ctx),
			afford: (call) => pipeline.afford?.(call, ctx),
			rule: (call) => pipeline.rule?.(call, ctx),
			settle: (call, outcome) => pipeline.settle?.(call, outcome, ctx),
			after: (call, outcome) => pipeline.after?.(call, outcome, ctx),
		},
	};
}

/**
 * A mechanic's head declared apart from `defineMechanic`, so helpers outside the body can type
 * their context with `ContextOf<typeof head>`. The defaults of the generics are filled here.
 */
export function defineHead<
	const Id extends string,
	S,
	O extends TSchema,
	E extends EventSchemas,
	// eslint-disable-next-line @typescript-eslint/no-generated-empty-object-type -- a mechanic without prompts has an empty prompt set
	const P extends PromptKeys = Record<never, readonly string[]>,
	const R extends readonly ApiDefinition[] = [],
	const Pv extends readonly ApiDefinition[] = [],
>(head: MechanicHead<Id, O, S, E, P, R, Pv>): MechanicHead<Id, O, S, E, P, R, Pv> {
	return head;
}

export function defineMechanic<
	const Id extends string,
	S,
	O extends TSchema,
	E extends EventSchemas,
	// eslint-disable-next-line @typescript-eslint/no-generated-empty-object-type -- a mechanic without prompts has an empty prompt set
	const P extends PromptKeys = Record<never, readonly string[]>,
	const R extends readonly ApiDefinition[] = [],
	const Pv extends readonly ApiDefinition[] = [],
	T extends readonly MechanicTool[] = [],
>(
	head: MechanicHead<Id, O, S, E, P, R, Pv>,
	build: (kit: MechanicKit<Shape<O, S, E, P, R, Pv>>) => MechanicBody<Shape<O, S, E, P, R, Pv>, T>,
): MechanicDefinition<Id, O, E, T[number]["name"]> {
	type M = Shape<O, S, E, P, R, Pv>;
	const prompts: PromptKeys = head.prompts ?? {};
	const provides: readonly ApiDefinition[] = head.provides ?? [];
	const parseOptions = (raw: unknown): Static<O> => {
		try {
			return Parse(head.options, Default(head.options, raw ?? {}));
		} catch {
			throw new Error(`${head.id}: the options do not match the schema`);
		}
	};
	const definition: MechanicDefinition<Id, O, E, T[number]["name"]> = {
		id: head.id,
		summary: head.summary,
		requires: head.requires ?? [],
		provides,
		options: head.options,
		events: head.events,
		prompts,
		parseOptions,
		instantiate(port, raw) {
			const options = parseOptions(raw);
			const setup = { options, residents: port.residents.ids, random: () => port.random() };
			const parts: InstanceParts<M> = { port, options, state: { value: head.state(setup) }, setup, events: head.events, prompts };
			return bind(parts, build(createKit(parts)), provides);
		},
		with(options) {
			return { mechanic: definition, options: options ?? {} };
		},
	};
	return definition;
}
