/**
 * The gamemaker overseer in the shadow of the old role (step 18, team C2). An old run (the composed
 * `World` with the old `Gamemaker`) plays as before; a sink reads the old bus into an envelope log
 * and, at every `gamemaker_turn` the old role writes, asks the overseer's instance for its look at
 * that very moment (same world, same events) and renders the input the host would send
 * (`gamemaker/look` with no standing orders). Equal inputs prove the overseer's tracks, recent
 * events, notes, budget line and the report's composition against the old `describeSituation`
 * input byte for byte; the report's city part is the old one (`worldReport`).
 *
 * The envelope log: every old event as `{ type, ...fields }` under its own seq. Each
 * `gamemaker_call` adds the core `tool_called` the host writes before the tool runs, and a
 * `gamemaker_note` is caused by the first call without a result yet (the old loop runs the calls
 * of a message one after the other), as the host's note desk line is caused by its tool call.
 */
import type { EventEnvelope, EventLogView, OverseerInstance, EventSink, RecordedEvent } from "@swarmtales/contracts";
import { createRng } from "@swarmtales/kernel";
import type { World } from "@swarmtales/engine";
import { createPromptLookup } from "@swarmtales/prompts";
import { defineGamemaker, GAMEMAKER_NAME, worldReport, type GamemakerOverseerOptions } from "@swarmtales/roles";
import { createFixture, type FixtureOptions } from "../../helpers/fixture.ts";

export interface ShadowLook {
	readonly minute: number;
	readonly round: number;
	/** What the old role wrote in `gamemaker_turn`. */
	readonly old: string;
	/** What the overseer's call would carry. */
	readonly overseer: string;
}

/** A plain log: `since` and `ofType` as the host's, no audience. */
class ShadowLog implements EventLogView {
	readonly #events: EventEnvelope[] = [];

	get length(): number {
		return this.#events.length;
	}

	push(event: EventEnvelope): void {
		this.#events.push(event);
	}

	all(): readonly EventEnvelope[] {
		return this.#events;
	}

	since(seq: number): readonly EventEnvelope[] {
		return this.#events.filter((event) => event.seq > seq);
	}

	ofType(source: string, type: string): readonly EventEnvelope[] {
		return this.#events.filter((event) => event.source === source && event.type === type);
	}
}

const prompts = createPromptLookup();

/** The input the host renders for one call (overseers.ts `#prepare`, no standing orders). */
function inputOf(variables: Readonly<Record<string, string | number>>): string {
	return prompts.render(GAMEMAKER_NAME, "gamemaker/look", { ...variables, standingOrders: "" }, ["situation", "standingOrders"]);
}

class Shadow implements EventSink {
	readonly looks: ShadowLook[] = [];
	readonly log = new ShadowLog();
	#seq = 0;
	readonly #open: number[] = [];
	#instance: OverseerInstance | undefined;
	#world: World | undefined;
	readonly #options: (world: World) => Partial<GamemakerOverseerOptions>;

	constructor(options: (world: World) => Partial<GamemakerOverseerOptions>) {
		this.#options = options;
	}

	attach(world: World): OverseerInstance {
		this.#world = world;
		const instance = this.instantiate(world);
		this.#instance = instance;
		return instance;
	}

	instantiate(world: World): OverseerInstance {
		const definition = defineGamemaker(worldReport(world));
		const instance = definition.instantiate(
			{
				name: GAMEMAKER_NAME,
				seed: 7,
				minute: () => world.minute,
				residents: { ids: world.competitors, has: (id) => world.competitors.includes(id), mayAct: () => true, attribute: () => undefined },
				log: this.log,
				facts: () => ({}),
				decisions: { pending: () => [] },
				display: (text) => world.display(text),
				emit: () => {
					throw new Error("the gamemaker declares no events");
				},
				render: (prompt, variables, declared) => prompts.render(GAMEMAKER_NAME, prompt, variables, declared),
				rng: () => createRng(7),
			},
			this.#options(world),
		);
		return instance;
	}

	#push(type: string, payload: unknown, minute: number, source: string, causedBy?: number): number {
		this.#seq += 1;
		this.log.push({ seq: this.#seq, minute, type, source, actor: "host", payload, ...(causedBy === undefined ? {} : { causedBy }) });
		return this.#seq;
	}

	record(event: RecordedEvent): void {
		if (event.type === "gamemaker_turn") {
			const world = this.#world;
			const instance = this.#instance;
			if (world === undefined || instance === undefined) throw new Error("shadow: attach the world first");
			const calls = instance.calls({ kind: "schedule", minute: world.minute });
			const [variables] = calls;
			if (calls.length !== 1 || variables === undefined) throw new Error(`shadow: ${String(calls.length)} calls at round ${String(event.round)}`);
			this.looks.push({ minute: event.minute, round: event.round, old: event.input, overseer: inputOf(variables) });
		}
		const { type, minute, ...fields } = event;
		const payload = Object.fromEntries(Object.entries(fields).filter(([key]) => key !== "seq"));
		if (type === "gamemaker_call") {
			this.#open.push(this.#push("tool_called", { tool: event.tool, params: event.args }, minute, "core"));
		}
		if (type === "gamemaker_note") {
			this.#push(type, payload, minute, "channels", this.#open[0]);
			return;
		}
		if (type === "gamemaker_result") this.#open.shift();
		this.#push(type, payload, minute, "legacy");
	}
}

export interface ShadowRun {
	readonly looks: readonly ShadowLook[];
	/** The overseer's instance after the run (its snapshot slice). */
	readonly instance: OverseerInstance;
	readonly world: World;
	readonly log: EventLogView;
	readonly systemPrompt: string;
	/** A second instance on the same world and log, in its start state. */
	fork(): OverseerInstance;
}

/** Plays an old run with the overseer in its shadow; `options` are the overseer's options for the run's world. */
export async function shadowRun(fixture: FixtureOptions, options: (world: World) => Partial<GamemakerOverseerOptions>): Promise<ShadowRun> {
	const shadow = new Shadow(options);
	const composed = createFixture({ ...fixture, sinks: [...(fixture.sinks ?? []), shadow] });
	const instance = shadow.attach(composed.world);
	await composed.run();
	const systemPrompt = composed.gamemaker?.systemPrompt;
	if (systemPrompt === undefined) throw new Error("shadow: the run has no gamemaker");
	return { looks: shadow.looks, instance, world: composed.world, log: shadow.log, systemPrompt, fork: () => shadow.instantiate(composed.world) };
}
