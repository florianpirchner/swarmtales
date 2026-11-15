// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The assembly of the model driver: one resident session per actor, with the tools notice, the late tools and the
 * `prompt_fixed` record. A port of the assembly in the old `core-run.ts`: only the tools open at the start are
 * declared, and a tool that opens later is declared before the next request.
 */
import type { ActorDriver, ActorId, ActorSpec, DriverTable, Kernel, PromptLookup, Redact, ToolSpec } from "@swarmtales/contracts";
import { savedSessionInvalid, thrown } from "../errors.ts";
import type { CostMeter } from "../meter.ts";
import { RESIDENT_RECORDS, residentRecord } from "../records.ts";
import { REQUEST_TIMEOUT_MS } from "../request.ts";
import type { ModelSettings } from "../settings.ts";
import type { ModelSource } from "../source.ts";
import { createToolsNotice, type ToolsNotice } from "./notice.ts";
import type { SavedSession, SavedSessions } from "./saved.ts";
import { asksReset, createResidentSession, type ResidentSession } from "./session.ts";

/**
 * The driver id of a model actor, as the run manifest names it (`actors[].driver`).
 *
 * @public
 */
export const RESIDENT_DRIVER = "@swarmtales/models/resident";

/**
 * What the model drivers of a run are made of.
 *
 * @public
 */
export interface ModelDriversInput {
	/** The started kernel; read for `toolSpecs` and `openTools`, written through `record`. */
	readonly kernel: Kernel;
	/** The actors this driver plays. */
	readonly actors: readonly ActorSpec[];
	/** The model source of every actor, or a function that gives the source of one. */
	readonly source: ModelSource | ((actor: ActorId) => ModelSource);
	/** The model settings: the thinking level and the output cap. */
	readonly settings: ModelSettings;
	/** Actor id to its system prompt, built by `systemPrompt` before the genesis. An actor without one gets no driver, so the kernel ends the run when it is activated (`SWT-R011`). */
	readonly systemPrompts: Readonly<Record<string, string>>;
	/** The cost meter of the run. */
	readonly meter: CostMeter;
	/** Takes secrets out of the error text of a failed request. */
	readonly redact: Redact;
	/** The lookup that renders the tools notice. */
	readonly texts: PromptLookup;
	/** The hash of a text as the run manifest holds it (`jsonHash` of `@swarmtales/chain`); `prompt_fixed` carries it. */
	readonly hash: (text: string) => string;
	/** The saved sessions of a snapshot (`parseSavedSessions`), by actor id; an actor without one starts a new conversation. Left out: none. */
	readonly saved?: SavedSessions;
}

/**
 * The model drivers of a run.
 *
 * @public
 */
export interface ModelDrivers {
	/** The drivers, by actor id. */
	readonly drivers: DriverTable;
	/**
	 * Writes `prompt_fixed` for every actor, in the order of the actors; call it once, after `kernel.start()` and
	 * before the first tick. A second call writes nothing.
	 *
	 * @throws SwtError `SWT-R017` when the record source is not declared or the kernel is not between start and
	 * first tick, `SWT-X040` when a record does not match its schema.
	 */
	fix(): void;
	/**
	 * Saves every session between two ticks, for the section `sessions` of a snapshot file.
	 *
	 * @returns Actor id to its saved session with its last tools notice, redacted, in the order of the actors.
	 */
	save(): SavedSessions;
}

// One actor of the run: its session and what `prompt_fixed` says about it.
interface Seat {
	readonly actor: ActorSpec;
	readonly system: string;
	readonly specs: readonly ToolSpec[];
	readonly session: ResidentSession;
	readonly notice: ToolsNotice;
}

// The specs of the tools a saved session names, in its order; `SWT-X042` for a name the actor is not granted.
function specsOf(actor: ActorId, names: readonly string[], specs: readonly ToolSpec[], input: ModelDriversInput): readonly ToolSpec[] {
	return names.map((name) => {
		const spec = specs.find((item) => item.name === name);
		if (spec === undefined) throw thrown(savedSessionInvalid(actor, `it declares the tool "${name}", which the actor is not granted`), input.redact);
		return spec;
	});
}

function seatOf(actor: ActorSpec, system: string, input: ModelDriversInput): Seat {
	const { kernel, settings } = input;
	const specs = kernel.toolSpecs(actor.grant);
	const open = kernel.openTools(actor.id);
	const saved: SavedSession | undefined = input.saved !== undefined && Object.hasOwn(input.saved, actor.id) ? input.saved[actor.id] : undefined;
	const source = typeof input.source === "function" ? input.source(actor.id) : input.source;
	const session = createResidentSession({
		actor: actor.id,
		systemPrompt: system,
		// A tool that never opens for this actor is never declared (P138); a saved session starts with the tools it started with.
		tools: saved === undefined ? specs.filter((spec) => open.includes(spec.name)) : specsOf(actor.id, saved.initial, specs, input),
		binding: source.bind(actor.id, { maxOutputTokens: settings.maxOutputTokens, timeoutMs: REQUEST_TIMEOUT_MS }),
		thinking: settings.thinking,
		meter: input.meter,
		redact: input.redact,
		...(saved === undefined ? {} : { saved }),
	});
	if (saved !== undefined) session.declare(specsOf(actor.id, saved.declared, specs, input));
	return { actor, system, specs, session, notice: createToolsNotice(input.texts, saved?.notice) };
}

// The driver of one seat: the late tools, then the reset of the notice, then the step with the notice.
function driverOf(seat: Seat, input: ModelDriversInput): ActorDriver {
	const { notice } = seat;
	return (activation) => {
		const open = input.kernel.openTools(seat.actor.id);
		seat.session.declare(open.flatMap((name) => seat.specs.filter((spec) => spec.name === name)));
		if (asksReset(activation)) notice.forget();
		return seat.session.step(activation, { open, notice: notice.next(open) });
	};
}

/**
 * Creates one driver per actor: a persistent session of its model for the whole run. Every step sends the
 * activation's input texts, then the tools notice when the set of open tools changed since the last notice.
 *
 * @param input - The started kernel, the actors, the model source and settings, the system prompts, the meter,
 * the redaction, the texts and the hash of the manifest.
 * @returns The driver table and `fix`, which writes the `prompt_fixed` records.
 * @throws SwtError `SWT-X007` when a model has no price (a live source); `SWT-X042` when a saved session does not
 * fit its actor; what the source's `bind` throws.
 * @example
 * ```ts
 * kernel.start();
 * const models = createModelDrivers({ kernel, actors, source, settings, systemPrompts, meter, redact, texts, hash: jsonHash });
 * models.fix();
 * const end = await kernel.run(models.drivers);
 * ```
 *
 * @public
 */
export function createModelDrivers(input: ModelDriversInput): ModelDrivers {
	const seats = input.actors.flatMap((actor) => {
		const system = Object.hasOwn(input.systemPrompts, actor.id) ? input.systemPrompts[actor.id] : undefined;
		return system === undefined ? [] : [seatOf(actor, system, input)];
	});
	let fixed = false;
	const fix = (): void => {
		if (fixed) return;
		fixed = true;
		for (const { actor, system, specs, session } of seats) {
			const tools = specs.map((spec) => ({ name: spec.name, description: spec.description, parameters: { ...spec.parameters } }));
			input.kernel.record(RESIDENT_RECORDS.id, actor.id, "prompt_fixed", residentRecord("prompt_fixed", { system, systemHash: input.hash(system), tools, declared: [...session.declared] }));
		}
	};
	const save = (): SavedSessions => Object.fromEntries(seats.map(({ actor, session, notice }) => [actor.id, { ...session.save(), ...(notice.last === undefined ? {} : { notice: [...notice.last] }) }]));
	return Object.freeze({ drivers: Object.freeze(Object.fromEntries(seats.map((seat) => [seat.actor.id, driverOf(seat, input)]))), fix, save });
}
