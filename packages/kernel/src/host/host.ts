/**
 * `createHost`: the slim core assembled. It owns the clock, the log, the residents, the scheduler,
 * the referee and the gateway, loads the story's mechanics and plays the turn loop: per minute the
 * due jobs, `minuteStarted`, then every resident who may act in a seeded order (inputs from the
 * mechanics, one agent turn), then `minuteEnded` and the referee's checks.
 */
import { Check, Clone, Parse } from "typebox/value";
import {
	CORE_EVENTS,
	EventEnvelopeSchema,
	GRANT_ROLES,
	HostSnapshotSchema,
	type Actor,
	type CoreStory,
	type EventEnvelope,
	type EventSchemas,
	type GrantRole,
	type GuardModel,
	type Host,
	type HostSnapshot,
	type JsonValue,
	type MechanicInstance,
	type PromptLookup,
	type ResidentId,
	type RoleCaller,
	type RunEnd,
	type ToolOutcome,
	type ToolSpec,
	type TurnTaker,
} from "@swarmtales/contracts";
import { AccessControl } from "./access.ts";
import { Gateway } from "./gateway.ts";
import { toolFor } from "./catalog.ts";
import { loadMechanics, type Loaded } from "./loader.ts";
import { StagingQueue } from "./staging.ts";
import { EventBus } from "./log.ts";
import { coreReply } from "./replies.ts";
import { Referee, type Breach } from "./referee.ts";
import { ResidentRegistry, residentIds, type ResidentsState } from "./residents.ts";
import { Scheduler } from "./scheduler.ts";
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
}

function isJsonValue(value: unknown): value is JsonValue {
	if (value === null || typeof value === "string" || typeof value === "boolean") return true;
	if (typeof value === "number") return Number.isFinite(value);
	if (Array.isArray(value)) return value.every((item: unknown) => isJsonValue(item));
	if (typeof value === "object") return Object.values(value).every((item: unknown) => isJsonValue(item));
	return false;
}

function copyLists(lists: Readonly<Record<string, readonly string[]>>): Record<string, string[]> {
	return Object.fromEntries(Object.entries(lists).map(([key, list]) => [key, [...list]]));
}

function residentsState(saved: HostSnapshot["residents"]): ResidentsState {
	const attributes: Record<string, Record<string, Record<string, JsonValue>>> = {};
	for (const [id, byOwner] of Object.entries(saved.attributes)) {
		for (const [owner, bag] of Object.entries(byOwner)) {
			for (const [key, value] of Object.entries(bag)) {
				if (!isJsonValue(value)) throw new Error(`snapshot: attribute ${owner}.${key} of ${id} is not JSON`);
				const forId = (attributes[id] ??= {});
				(forId[owner] ??= {})[key] = value;
			}
		}
	}
	return { ids: saved.ids, attributes, suspensions: saved.suspensions };
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
	readonly #staging = new StagingQueue();
	readonly #between: ((minute: number) => Promise<void>) | undefined;
	readonly #app: EventSchemas;
	#minute = 0;
	#breach: Breach | undefined;
	#started = false;
	#playing = false;
	#stopRequest: string | undefined;
	#ended: RunEnd | undefined;
	/** What threw; once set, the run is over (reason `error`) and the host refuses every further use. */
	#failure: unknown;
	#failed = false;

	constructor(options: HostOptions) {
		const story = options.story;
		this.#story = story;
		this.#prompts = options.prompts;
		const events = (options.resume?.events ?? []).map((event) => Parse(EventEnvelopeSchema, event));
		this.#bus = new EventBus(() => this.#minute, events);
		const emitCore = (type: string, payload: unknown): void => {
			this.#bus.emit("core", type, payload);
		};
		const ids = typeof story.residents === "number" ? residentIds(story.residents) : story.residents;
		this.#registry = new ResidentRegistry(ids, emitCore);
		this.#access = new AccessControl(story.grants, emitCore);
		this.#referee = new Referee(story.limits);
		this.#bus.subscribe((event) => {
			this.#referee.observe(event.type);
		});
		this.#between = options.between;
		this.#app = options.app?.events ?? {};
		const reserved = Object.keys(this.#app).find((type) => Object.hasOwn(CORE_EVENTS, type));
		if (reserved !== undefined) throw new Error(`app: event "${reserved}" is reserved by the core`);
		this.#loaded = loadMechanics({ story, bus: this.#bus, residents: this.#registry, scheduler: this.#scheduler, access: this.#access, prompts: this.#prompts, minute: () => this.#minute, staging: this.#staging });
		for (const [name, variants] of this.#loaded.tools) {
			for (const { tool } of variants) if (tool.limit !== undefined) this.#referee.addToolLimit(name, tool.limit, tool.serves);
			for (const role of GRANT_ROLES) {
				const policy = story.tools?.[role]?.[name]?.limit;
				if (policy !== undefined) this.#referee.addToolLimit(name, policy, [role]);
			}
		}
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
			referee: this.#referee,
			guard: options.guard,
			roles: options.roles ?? {},
			staging: this.#staging,
			reply: (code) => coreReply(this.#prompts, code),
			failed: (error) => {
				this.#fail(error);
			},
		});
		const instances = this.#loaded.order.flatMap((id): readonly (readonly [string, MechanicInstance])[] => {
			const instance = this.#loaded.instances.get(id);
			return instance === undefined ? [] : [[id, instance]];
		});
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
			this.#each((instance) => {
				instance.hooks.runStarted();
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
		bus.emit("core", "minute_started", {});
		// Calls staged before the first minute (by runStarted hooks) run now.
		await this.#gateway.settle();
		for (const job of this.#scheduler.take(minute)) {
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
		this.#each((instance) => {
			instance.hooks.minuteStarted();
		});
		await this.#gateway.settle();
		this.#breach = undefined;
		await this.#turns.play(agent, minute);
		this.#each((instance) => {
			instance.hooks.minuteEnded();
		});
		await this.#gateway.settle();
		if (this.#between !== undefined && this.#turnsBreach() === undefined && this.#stopRequest === undefined) {
			await this.#between(minute);
			await this.#gateway.settle();
		}
		bus.emit("core", "minute_ended", {});
		// Calls staged by listeners of minute_ended run inside the minute, so no snapshot cut loses them.
		await this.#gateway.settle();
		this.#minute = minute + 1;
		const breach = this.#turnsBreach() ?? this.#referee.breach();
		if (breach !== undefined) {
			bus.emit("core", "referee_intervened", { limit: breach.limit, reason: breach.reason });
			this.#end({ reason: "referee", minute: this.#minute, limit: breach.limit });
		} else if (this.#stopRequest !== undefined) this.#end({ reason: "stopped", minute: this.#minute });
		else if (this.#minute >= this.#story.minutes) this.#end({ reason: "minutes", minute: this.#minute });
	}

	call(actor: Actor, tool: string, params: unknown): Promise<ToolOutcome> {
		if (this.#failed) return Promise.reject(this.#refusal());
		return this.#gateway.call(actor, tool, params);
	}

	toolSpecs(role: GrantRole): readonly ToolSpec[] {
		return this.#access.grantsOf(role).flatMap((name) => {
			const loaded = toolFor(this.#loaded.tools, name, role);
			if (loaded === undefined) return [];
			const description = this.#prompts?.render(loaded.owner, loaded.tool.description, {}, []) ?? loaded.tool.description;
			return [{ name, description, parameters: loaded.tool.parameters }];
		});
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
		const mechanics: Record<string, { version: number; data: unknown }> = {};
		for (const id of this.#loaded.order) {
			const slice = this.#loaded.instances.get(id)?.snapshot;
			if (slice !== undefined) mechanics[id] = { version: slice.version, data: Clone(slice.save()) };
		}
		const residents = this.#registry.save();
		const base = {
			format: "swarmtales.host" as const,
			version: 1 as const,
			story: this.#story.id,
			seed: this.#story.seed,
			minute: this.#minute,
			seq: this.#bus.lastSeq,
			residents: { ids: [...residents.ids], attributes: residents.attributes, suspensions: copyLists(residents.suspensions) },
			locks: copyLists(this.#access.save()),
			jobs: [...this.#scheduler.save()],
			referee: this.#referee.save(),
			mechanics,
		};
		return this.#ended === undefined ? base : { ...base, ended: this.#ended };
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

	recordCost(usd: number): void {
		this.#referee.recordCost(usd);
	}

	stop(reason: string): void {
		this.#stopRequest = reason;
		if (!this.#playing && this.#ended === undefined) this.#end({ reason: "stopped", minute: this.#minute });
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

	#each(code: (instance: MechanicInstance) => void): void {
		for (const instance of this.#instances()) this.#bus.run({ actor: "host" }, () => {
			code(instance);
		});
	}

	#end(end: RunEnd): void {
		this.#each((instance) => {
			instance.hooks.runEnded(end.reason);
		});
		// The run is over: what was staged now (by runEnded hooks, by listeners of the last events) never runs.
		this.#staging.clear();
		this.#bus.emit("core", "run_ended", { reason: end.reason });
		this.#staging.clear();
		this.#ended = end;
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

	#restore(snapshot: HostSnapshot): void {
		if (snapshot.story !== this.#story.id || snapshot.seed !== this.#story.seed) throw new Error("snapshot: taken from another story or seed");
		if (snapshot.seq !== this.#bus.lastSeq) throw new Error(`snapshot: taken at seq ${String(snapshot.seq)}, but the log has ${String(this.#bus.lastSeq)} events`);
		this.#registry.load(residentsState(snapshot.residents));
		this.#access.load(snapshot.locks);
		this.#scheduler.load(snapshot.jobs.map((job) => {
			if (job.data !== undefined && !isJsonValue(job.data)) throw new Error(`snapshot: data of job ${job.job} is not JSON`);
			const { data, ...rest } = job;
			return data === undefined || !isJsonValue(data) ? rest : { ...rest, data };
		}));
		this.#referee.load(snapshot.referee);
		for (const id of this.#loaded.order) {
			const slice = this.#loaded.instances.get(id)?.snapshot;
			const saved = snapshot.mechanics[id];
			if (slice === undefined) continue;
			if (saved === undefined) throw new Error(`snapshot: no slice for mechanic "${id}"`);
			slice.load(saved.data, saved.version);
		}
		const unknown = Object.keys(snapshot.mechanics).find((id) => !this.#loaded.order.includes(id));
		if (unknown !== undefined) throw new Error(`snapshot: slice of mechanic "${unknown}", which the story does not load`);
		this.#minute = snapshot.minute;
		this.#started = true;
		this.#ended = snapshot.ended;
	}
}

export function createHost(options: HostOptions): Host {
	return new CoreHost(options);
}
