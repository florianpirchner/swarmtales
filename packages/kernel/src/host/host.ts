/**
 * `createHost`: the slim core assembled. It owns the clock, the log, the residents, the scheduler,
 * the referee and the gateway, loads the story's mechanics and plays the turn loop: per minute the
 * due jobs, `minuteStarted`, then every resident who may act in a seeded order (inputs from the
 * mechanics, one agent turn), then `minuteEnded` and the referee's checks. Overseers run in their
 * slots and on their events (`overseers.ts`), the human's calls at safe stops (`human.ts`).
 */
import { Check, Parse } from "typebox/value";
import {
	CORE_EVENTS,
	EventEnvelopeSchema,
	HostSnapshotSchema,
	type Actor,
	type CoreStory,
	type EventEnvelope,
	type EventSchemas,
	type GrantRole,
	type GuardModel,
	type HookPhase,
	type Host,
	type HostSnapshot,
	type HumanChannel,
	type HumanHand,
	type InstancePhases,
	type MechanicInstance,
	type MechanicTool,
	type OverseerRuntime,
	type PromptLookup,
	type ResidentId,
	type RoleCaller,
	type RunEnd,
	type ToolOutcome,
	type ToolSpec,
	type TurnTaker,
} from "@swarmtales/contracts";
import { AccessControl } from "./access.ts";
import { CORE_OWNER, DecisionGate } from "./decisions.ts";
import { Gateway } from "./gateway.ts";
import { toolFor } from "./catalog.ts";
import { loadMechanics, type Loaded } from "./loader.ts";
import { Names } from "./names.ts";
import { orderedPhases } from "./phases.ts";
import { checkHumanGrants, HumanDesk } from "./human.ts";
import { OrderBook, residentNote } from "./orders.ts";
import { OverseerRunner, type OverseerSlot } from "./overseers.ts";
import { lockProbe } from "./probe.ts";
import { StagingQueue } from "./staging.ts";
import { EventBus } from "./log.ts";
import { coreReply } from "./replies.ts";
import { Referee, type Breach } from "./referee.ts";
import { ResidentRegistry, residentIds } from "./residents.ts";
import { Scheduler } from "./scheduler.ts";
import { restoreHost, saveHost, type SnapshotParts } from "./snapshots.ts";
import { mergePolicies, TurnLoop } from "./turns.ts";

export interface HostOptions {
	readonly story: CoreStory;
	readonly prompts?: PromptLookup;
	readonly guard?: GuardModel;
	/** A snapshot (untrusted, parsed here) and the log up to it. */
	readonly resume?: { readonly snapshot: unknown; readonly events: readonly unknown[] };
	/** Whether a resident's agent ended its last turn with results it has not answered (`activation: "onNews"`). */
	readonly awaitsAnswer?: (resident: ResidentId) => boolean;
	/** The model-backed roles tools consult (stage `consult`), by name. */
	readonly roles?: Readonly<Record<string, RoleCaller>>;
	/**
	 * Runs after the minute's turns and `minuteEnded` hooks, before `minute_ended`, unless the
	 * referee or a stop ended the turns: where the gamemaker, the classifier and the weaver look at
	 * the run's state. Their calls go through `host.call`.
	 */
	readonly between?: (minute: number) => Promise<void>;
	/** The events the app may write with `host.record` (source `app`). */
	readonly app?: { readonly events: EventSchemas };
	/**
	 * A human is attached (docs/design/overseer-api.md §5): only then does `human` hold decisions and
	 * `host.hand()` give the hand, whose calls run at safe stops. `true` attaches a live hand; a
	 * channel with `next` also feeds recorded calls back (a replay, `scriptedHuman`).
	 */
	readonly human?: boolean | HumanChannel;
	/** Asks the overseers' models; without one every overseer answers through its body's `fallback` (`by: "none"`). */
	readonly overseers?: OverseerRuntime;
}

/** The story's audiences, then the heads' defaults, by `<source>.<type>`; undefined when nothing sets one. */
function audienceResolver(story: CoreStory, names: Names): ((source: string, type: string) => readonly string[] | undefined) | undefined {
	const own = story.audiences ?? {};
	for (const [event, readers] of Object.entries(own)) {
		const unknown = readers.find((name) => !names.has(name));
		if (unknown !== undefined) throw new Error(`story: the audience of ${event} names "${unknown}", which is neither built in nor an overseer of the story`);
	}
	const defaults = new Map<string, Partial<Readonly<Record<string, readonly string[]>>>>();
	for (const use of story.mechanics) if (use.mechanic.audiences !== undefined) defaults.set(use.mechanic.id, use.mechanic.audiences);
	for (const use of story.overseers ?? []) if (use.overseer.audiences !== undefined) defaults.set(use.overseer.id, use.overseer.audiences);
	if (Object.keys(own).length === 0 && defaults.size === 0) return undefined;
	return (source, type) => own[`${source}.${type}`] ?? defaults.get(source)?.[type];
}

function channelOf(human: HostOptions["human"]): HumanChannel | undefined {
	if (human === undefined || human === false) return undefined;
	return human === true ? {} : human;
}

class CoreHost implements Host {
	readonly #story: CoreStory;
	readonly #prompts: PromptLookup | undefined;
	readonly #bus: EventBus;
	readonly #registry: ResidentRegistry;
	readonly #scheduler = new Scheduler();
	readonly #access: AccessControl;
	readonly #referee: Referee;
	readonly #loaded: Loaded;
	readonly #gateway: Gateway;
	readonly #turns: TurnLoop;
	readonly #names: Names;
	readonly #gate: DecisionGate;
	readonly #orders = new OrderBook();
	readonly #desk: HumanDesk;
	readonly #runner: OverseerRunner;
	readonly #staging = new StagingQueue();
	readonly #between: ((minute: number) => Promise<void>) | undefined;
	readonly #app: EventSchemas;
	/** The instances in load order, with their ids. */
	readonly #placed: readonly (readonly [string, MechanicInstance])[];
	#minute = 0;
	#breach: Breach | undefined;
	#started = false;
	#playing = false;
	#stopRequest: string | undefined;
	/** A resumed run whose `runResumed` phases have not run yet. */
	#resumePending = false;
	#ended: RunEnd | undefined;
	/** What threw; once set, the run is over (reason `error`) and the host refuses every further use. */
	#failure: unknown;
	#failed = false;

	constructor(options: HostOptions) {
		const story = options.story;
		this.#story = story;
		this.#prompts = options.prompts;
		const events = (options.resume?.events ?? []).map((event) => Parse(EventEnvelopeSchema, event));
		const names = new Names(story);
		this.#names = names;
		this.#bus = new EventBus(() => this.#minute, events, audienceResolver(story, names));
		const emitCore = (type: string, payload: unknown): void => {
			this.#bus.emit("core", type, payload);
		};
		const ids = typeof story.residents === "number" ? residentIds(story.residents) : story.residents;
		this.#registry = new ResidentRegistry(ids, emitCore);
		this.#access = new AccessControl(story.grants === "auto" ? {} : story.grants, emitCore);
		this.#referee = new Referee(story.limits, (actor) => names.callerOf(actor));
		this.#bus.subscribe((event) => {
			this.#referee.observe(event.type);
		});
		this.#between = options.between;
		this.#app = options.app?.events ?? {};
		const reserved = Object.keys(this.#app).find((type) => Object.hasOwn(CORE_EVENTS, type));
		if (reserved !== undefined) throw new Error(`app: event "${reserved}" is reserved by the core`);
		const roles = new Set(Object.keys(options.roles ?? {}));
		this.#gate = this.#decisionGate(options, names);
		checkHumanGrants(story.grants === "auto" ? {} : story.grants);
		const channel = channelOf(options.human);
		this.#desk = new HumanDesk(
			{
				story,
				bus: this.#bus,
				minute: () => this.#minute,
				orders: this.#orders,
				prompts: this.#prompts,
				residents: ids,
				gamemakerDriven: options.between !== undefined,
				call: (tool, params) => this.#gateway.call("human", tool, params),
				reply: (code) => coreReply(this.#prompts, code),
			},
			channel,
		);
		const consults = new Set((story.overseers ?? []).filter((use) => use.overseer.triggers.some((trigger) => "consult" in trigger)).map((use) => use.name));
		this.#loaded = loadMechanics({
			story,
			bus: this.#bus,
			residents: this.#registry,
			scheduler: this.#scheduler,
			access: this.#access,
			prompts: this.#prompts,
			minute: () => this.#minute,
			staging: this.#staging,
			roles,
			overseerRoles: consults,
			coreTools: this.#desk.tools(),
			names,
			gate: this.#gate,
		});
		if (story.grants === "auto") checkHumanGrants(this.#loaded.grants);
		this.#runner = this.#overseerRunner(options);
		this.#access.setProbe(lockProbe(this.#bus, this.#loaded.tools, () => this.#instances()));
		for (const [name, variants] of this.#loaded.tools) {
			for (const { tool } of variants) if (tool.limit !== undefined) this.#referee.addToolLimit(name, tool.limit, tool.serves);
			// Built-ins first in the old order, then `human`, then the overseers: today's counter keys stay (§2).
			for (const role of names.all) {
				const policy = story.tools?.[role]?.[name]?.limit;
				if (policy !== undefined) this.#referee.addToolLimit(name, policy, [role]);
			}
		}
		this.#interventions(story);
		this.#referee.addRunLimits(this.#instances().flatMap((instance) => instance.limits));
		this.#access.lockAtStart(ids, story.locked ?? []);
		this.#gateway = new Gateway({
			bus: this.#bus,
			tools: this.#loaded.tools,
			instances: this.#instances(),
			instanceOf: (id) => this.#loaded.instances.get(id),
			policies: story.tools ?? {},
			access: this.#access,
			residents: this.#registry,
			names,
			referee: this.#referee,
			guard: options.guard,
			roles: options.roles ?? {},
			consultant: (role) => this.#runner.consultant(role),
			staging: this.#staging,
			reply: (code) => coreReply(this.#prompts, code),
			failed: (error) => {
				this.#fail(error);
			},
			...(this.#runner.hasEvents() ? { after: () => this.#runner.flush() } : {}),
		});
		const instances = this.#loaded.order.flatMap((id): readonly (readonly [string, MechanicInstance])[] => {
			const instance = this.#loaded.instances.get(id);
			return instance === undefined ? [] : [[id, instance]];
		});
		this.#placed = instances;
		this.#turns = new TurnLoop({
			seed: story.seed,
			bus: this.#bus,
			residents: this.#registry,
			instances,
			policy: mergePolicies(
				instances.flatMap(([id, instance]) => (instance.turns === undefined ? [] : [[id, instance.turns] as const])),
				story.turns,
			),
			awaitsAnswer: options.awaitsAnswer ?? (() => false),
			tools: () => this.toolSpecs("resident"),
			call: (actor, tool, params, cause) => this.#gateway.call(actor, tool, params, cause),
			record: (actor, type, payload) => {
				this.record(actor, type, payload);
			},
			display: (text) => this.#gateway.display(text),
			settle: () => this.#gateway.settle(),
			halted: () => {
				if (this.#failed) return true;
				this.#breach ??= this.#referee.breach();
				return this.#breach !== undefined || this.#stopRequest !== undefined;
			},
			...(channel === undefined
				? {}
				: {
						safeStop: (at: "beforeBlock" | "afterBlock", pass: number, block: number) => this.#desk.safeStop(at, pass, block),
						coreInputs: {
							has: (resident: ResidentId) => this.#orders.pending(resident, this.#minute),
							take: (resident: ResidentId) => this.#orders.carry(resident, this.#minute).map((order) => ({ source: "core", kind: "human", text: residentNote(this.#prompts, order.text) })),
						},
					}),
		});
		if (options.resume !== undefined) this.#restore(Parse(HostSnapshotSchema, options.resume.snapshot));
	}

	get residents(): readonly string[] {
		return this.#registry.ids;
	}

	get minute(): number {
		return this.#minute;
	}

	get ended(): RunEnd | undefined {
		return this.#ended;
	}

	get log(): EventBus {
		return this.#bus;
	}

	get mechanics(): readonly string[] {
		return this.#loaded.order;
	}

	start(): void {
		this.#usable();
		if (this.#started) throw new Error("host: already started");
		this.#started = true;
		const story = this.#story;
		try {
			this.#bus.emit("core", "run_started", { story: story.id, seed: story.seed, minutes: story.minutes, residents: [...this.residents], mechanics: [...this.mechanics] });
			this.#phases((phases) => phases.runStarted, (run) => {
				run();
			});
		} catch (error) {
			this.#fail(error);
			throw error;
		}
	}

	async run(agent: TurnTaker): Promise<RunEnd> {
		if (!this.#started) this.start();
		for (;;) {
			const end = await this.playMinute(agent);
			if (end !== undefined) return end;
		}
	}

	async playMinute(agent: TurnTaker): Promise<RunEnd | undefined> {
		this.#usable();
		if (!this.#started) throw new Error("host: start() first");
		if (this.#ended !== undefined) return this.#ended;
		if (this.#playing) throw new Error("host: a minute is already being played");
		this.#playing = true;
		try {
			await this.#play(agent);
			// A call that threw inside a turn broke the run even when the agent caught the error.
			if (this.#failed) throw this.#failureError();
		} catch (error) {
			this.#fail(error);
			throw this.#failureError();
		} finally {
			this.#playing = false;
		}
		return this.#ended;
	}

	async #play(agent: TurnTaker): Promise<void> {
		const minute = this.#minute;
		const bus = this.#bus;
		this.#referee.minuteStarted(minute);
		if (this.#resumePending) {
			// The old engine's restore work, once, before the first minute of a resumed run (R2-D9).
			this.#resumePending = false;
			this.#phases((phases) => phases.runResumed, (run) => {
				run();
			});
			await this.#gateway.settle();
		}
		bus.emit("core", "minute_started", {});
		// Calls staged before the first minute (by runStarted hooks) run now.
		await this.#gateway.settle();
		const due = this.#scheduler.take(minute);
		// Open decisions whose deadline came settle first, in the order they were opened (§3.2 rule 6).
		for (const job of due.filter((entry) => entry.owner === CORE_OWNER)) {
			this.#gate.settle(job.data);
			await this.#gateway.settle();
		}
		for (const job of due.filter((entry) => entry.owner !== CORE_OWNER)) {
			const instance = this.#loaded.instances.get(job.owner);
			if (instance === undefined) throw new Error(`scheduler: job of unknown mechanic "${job.owner}"`);
			bus.run({ actor: "host" }, () => {
				const ran = bus.emit("core", "job_ran", { owner: job.owner, job: job.job });
				bus.run({ actor: "host", cause: ran.seq }, () => {
					instance.runJob(job.job, job.data);
				});
			});
			await this.#gateway.settle();
		}
		this.#phases((phases) => phases.minuteStarted, (run) => {
			run();
		});
		await this.#gateway.settle();
		await this.#slot("minuteStarted", minute);
		this.#breach = undefined;
		await this.#turns.play(agent, minute);
		this.#phases((phases) => phases.minuteEnded, (run) => {
			run();
		});
		await this.#gateway.settle();
		if (this.#turnsBreach() === undefined && this.#stopRequest === undefined) {
			// The between slot: the human's safe stop, the overseers (classifier, weaver, gamemaker once they are overseers), then the app's roles.
			if (this.#desk.attached) await this.#desk.safeStop("between");
			await this.#slot("between", minute);
			if (this.#between !== undefined) {
				await this.#between(minute);
				await this.#gateway.settle();
			}
		}
		bus.emit("core", "minute_ended", {});
		// Calls staged by listeners of minute_ended run inside the minute, so no snapshot cut loses them.
		await this.#gateway.settle();
		this.#minute = minute + 1;
		const breach = this.#turnsBreach() ?? this.#referee.breach();
		if (breach !== undefined) {
			bus.emit("core", "referee_intervened", { limit: breach.limit, reason: breach.reason });
			await this.#finish({ reason: "referee", minute: this.#minute, limit: breach.limit });
		} else if (this.#stopRequest !== undefined) await this.#finish({ reason: "stopped", minute: this.#minute });
		else if (this.#minute >= this.#story.minutes) await this.#finish({ reason: "minutes", minute: this.#minute });
	}

	call(actor: Actor, tool: string, params: unknown): Promise<ToolOutcome> {
		if (this.#failed) return Promise.reject(this.#refusal());
		return this.#gateway.call(actor, tool, params);
	}

	toolSpecs(role: GrantRole): readonly ToolSpec[] {
		const caller = this.#names.caller(role);
		return this.#access.grantsOf(role).flatMap((name) => {
			const loaded = toolFor(this.#loaded.tools, name, caller);
			if (loaded === undefined) return [];
			return [{ name, description: this.#description(loaded.owner, loaded.tool), parameters: loaded.tool.parameters }];
		});
	}

	/** A tool's description, its variables rendered (a nested prompt first); the prompt id without a lookup. */
	#description(owner: string, tool: MechanicTool): string {
		const prompts = this.#prompts;
		if (prompts === undefined) return tool.description;
		const described = tool.descriptionPrompt;
		if (described === undefined) return prompts.render(owner, tool.description, {}, []);
		const variables = Object.fromEntries(
			Object.entries(described.variables).map(([name, value]) => [name, typeof value === "object" ? prompts.render(owner, value.prompt, {}, []) : value]),
		);
		return prompts.render(owner, described.id, variables, described.declared);
	}

	display(text: string): string {
		return this.#gateway.display(text);
	}

	facts(): Readonly<Record<string, unknown>> {
		const facts: Record<string, unknown> = {};
		for (const id of this.#loaded.order) {
			for (const [name, fact] of Object.entries(this.#loaded.instances.get(id)?.facts ?? {})) {
				const value = fact.compute();
				if (!Check(fact.output, value)) throw new Error(`${id}.${name}: the fact does not match its schema`);
				facts[`${id}.${name}`] = value;
			}
		}
		return facts;
	}

	snapshot(): HostSnapshot {
		this.#usable();
		if (this.#playing) throw new Error("host: a snapshot is taken between minutes");
		if (this.#staging.size > 0) throw new Error(`host: ${String(this.#staging.size)} staged calls have not run; a snapshot would lose them`);
		return saveHost(this.#parts(), this.#minute, this.#ended);
	}

	subscribe(sink: (event: EventEnvelope) => void): void {
		this.#bus.subscribe(sink);
	}

	record(actor: Actor, type: string, payload: unknown): void {
		this.#usable();
		const schema = this.#app[type];
		if (schema === undefined) throw new Error(`app: event "${type}" is not declared`);
		if (!Check(schema, payload)) throw new Error(`app: the payload of "${type}" does not match its schema`);
		this.#bus.run({ actor }, () => this.#bus.emit("app", type, payload));
	}

	hand(): HumanHand | undefined {
		return this.#desk.attached ? this.#desk.hand() : undefined;
	}

	recordCost(usd: number): void {
		this.#referee.recordCost(usd);
	}

	stop(reason: string): void {
		this.#stopRequest = reason;
		if (!this.#playing && this.#ended === undefined) this.#end({ reason: "stopped", minute: this.#minute });
	}

	/**
	 * The gate's view of this host: who is reachable (a declared overseer, the gamemaker when the app
	 * drives one through `between` or an overseer of that name, the human when a channel is attached),
	 * the heads' schemas and the instances' commits.
	 */
	#decisionGate(options: HostOptions, names: Names): DecisionGate {
		const story = options.story;
		const declared = new Set((story.overseers ?? []).map((use) => use.name));
		const prompts = this.#prompts;
		return new DecisionGate({
			bus: this.#bus,
			scheduler: this.#scheduler,
			minute: () => this.#minute,
			names,
			access: this.#access,
			policies: story.decisions ?? {},
			reachable: (name) => declared.has(name) || (name === "gamemaker" && options.between !== undefined) || (name === "human" && channelOf(options.human) !== undefined),
			schemaOf: (owner, kind) => story.mechanics.find((use) => use.mechanic.id === owner)?.mechanic.decisions[kind],
			commit: (owner, commit, proposal, settled) => {
				const instance = this.#loaded.instances.get(owner);
				if (instance === undefined) throw new Error(`decisions: commit of unknown mechanic "${owner}"`);
				instance.commit(commit, proposal, settled);
			},
			reply: (code) => coreReply(prompts, code),
			amended: (decision, proposal) => prompts?.render(CORE_OWNER, "core/replies/decision-amended", { decision, proposal }, ["decision", "proposal"]),
		});
	}

	/**
	 * An overseer's `maxInterventions` (its head's, and the story's on top: tighten, never lift) counts
	 * its successful calls of every tool granted to its name under the key `overseer:<name>`.
	 */
	#interventions(story: CoreStory): void {
		for (const use of story.overseers ?? []) {
			const limits = [
				[use.overseer.limits?.maxInterventions, `overseer:${use.name}`],
				[use.limits?.maxInterventions, `overseer:${use.name}/story`],
			] as const;
			for (const [limit, key] of limits) {
				if (limit === undefined) continue;
				for (const tool of this.#access.grantsOf(use.name)) this.#referee.addToolLimit(tool, { ...limit, key }, [use.name]);
			}
		}
	}

	#overseerRunner(options: HostOptions): OverseerRunner {
		const loaded = this.#loaded;
		const overseerEvents = new Map((options.story.overseers ?? []).map((use) => [use.overseer.id, use.overseer.events]));
		return new OverseerRunner({
			story: options.story,
			bus: this.#bus,
			runtime: options.overseers,
			prompts: this.#prompts,
			referee: this.#referee,
			orders: this.#orders,
			minute: () => this.#minute,
			residents: this.#registry,
			decisions: this.#gate,
			facts: () => this.facts(),
			hasFact: (key) => {
				const dot = key.indexOf(".");
				return dot > 0 && Object.hasOwn(loaded.instances.get(key.slice(0, dot))?.facts ?? {}, key.slice(dot + 1));
			},
			declares: (source, type) => {
				const events = loaded.order.includes(source) ? options.story.mechanics.find((use) => use.mechanic.id === source)?.mechanic.events : overseerEvents.get(source);
				return events !== undefined && Object.hasOwn(events, type);
			},
			display: (text) => this.#gateway.display(text),
			tools: (name) => this.toolSpecs(name),
			call: (actor, tool, params, cause) => this.#gateway.call(actor, tool, params, cause),
			admit: (actors, code) => this.#gateway.admit(actors, code),
			drain: () => this.#gateway.drain(),
			failed: () => this.#failed,
		});
	}

	/** An overseer slot: skipped without a trigger in it, so stories without overseers never wait for the line. */
	async #slot(slot: OverseerSlot, minute: number): Promise<void> {
		if (!this.#runner.has(slot) || this.#failed) return;
		await this.#gateway.exclusive(() => this.#runner.slot(slot, minute));
		await this.#gateway.settle();
	}

	/** The breach that ended the turns of the minute, if one did. */
	#turnsBreach(): Breach | undefined {
		return this.#breach;
	}

	#instances(): readonly MechanicInstance[] {
		return this.#loaded.order.flatMap((id) => {
			const instance = this.#loaded.instances.get(id);
			return instance === undefined ? [] : [instance];
		});
	}

	/** Runs every mechanic's phases of one hook in their order (`orderedPhases`), each in its own host frame. */
	#phases<F>(pick: (phases: InstancePhases) => readonly HookPhase<F>[], call: (run: F) => void): void {
		for (const phase of orderedPhases(this.#placed, pick)) {
			this.#bus.run({ actor: "host" }, () => {
				call(phase.run);
			});
		}
	}

	/**
	 * The run ends after a minute: the `runEnded` phases, then the calls they staged (a director's
	 * last actions), then `run_ended`. What listeners of `run_ended` stage never runs.
	 */
	async #finish(end: RunEnd): Promise<void> {
		if (this.#gate.pending().length > 0) {
			this.#gate.settleAll();
			await this.#gateway.settle();
		}
		this.#phases((phases) => phases.runEnded, (run) => {
			run(end.reason);
		});
		await this.#gateway.settle();
		await this.#slot("runEnded", end.minute);
		this.#close(end);
	}

	/** A stop between minutes: open decisions settle and the `runEnded` phases run, but nothing they stage does (no call may wait in a stopped host). */
	#end(end: RunEnd): void {
		this.#gate.settleAll();
		this.#phases((phases) => phases.runEnded, (run) => {
			run(end.reason);
		});
		this.#staging.clear();
		this.#close(end);
	}

	#close(end: RunEnd): void {
		this.#bus.emit("core", "run_ended", { reason: end.reason });
		this.#staging.clear();
		this.#ended = end;
		this.#desk.close();
	}

	/**
	 * Code threw: the run ends with reason `error` at once. Nothing staged runs, no listener reacts
	 * any more, no hook is called; `run_ended` is the log's last event and the host refuses every
	 * further use (no minute is played twice, no call lands after the failure).
	 */
	#fail(error: unknown): void {
		if (this.#failed) return;
		this.#failed = true;
		this.#failure = error;
		this.#staging.clear();
		this.#desk.close();
		if (this.#ended !== undefined) return;
		const detail = error instanceof Error ? error.message : String(error);
		this.#bus.fail(() => this.#bus.emit("core", "run_ended", { reason: "error", detail }));
		this.#ended = { reason: "error", minute: this.#minute };
	}

	/** What threw, as an error. */
	#failureError(): Error {
		return this.#failure instanceof Error ? this.#failure : new Error(String(this.#failure));
	}

	/** The error every use after a failure gets. */
	#refusal(): Error {
		return new Error(`host: the run failed (${this.#failureError().message}); create a new host`);
	}

	/** Throws once the run failed. */
	#usable(): void {
		if (this.#failed) throw this.#refusal();
	}

	#parts(): SnapshotParts {
		return {
			story: this.#story,
			bus: this.#bus,
			registry: this.#registry,
			access: this.#access,
			scheduler: this.#scheduler,
			referee: this.#referee,
			loaded: this.#loaded,
			gate: this.#gate,
			orders: this.#orders,
			overseers: this.#runner,
		};
	}

	#restore(snapshot: HostSnapshot): void {
		restoreHost(this.#parts(), snapshot);
		this.#minute = snapshot.minute;
		this.#started = true;
		this.#ended = snapshot.ended;
		this.#resumePending = snapshot.ended === undefined;
	}
}

export function createHost(options: HostOptions): Host {
	return new CoreHost(options);
}
