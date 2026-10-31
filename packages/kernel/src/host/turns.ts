/**
 * The turn loop of one minute, run by the turn policy (`TurnPolicy`): passes, each a seeded order
 * cut into blocks. A block's inputs are built before any member acts; the members' agents run at
 * once, but member k's calls wait until member k-1 has finished, so the calls land in the pass's
 * order whatever the agents' timing. With `activation: "onNews"` a resident steps only when a
 * mechanic says it has news or its agent awaits an answer.
 */
import type { Actor, HookPhase, InputKind, InstancePhases, MechanicInstance, PassView, ResidentId, ToolOutcome, ToolSpec, TurnLine, TurnNote, TurnPolicy, TurnTaker } from "@swarmtales/contracts";
import { createRng, deriveSeed, rngFor } from "../random.ts";
import { residentActor } from "./access.ts";
import type { EventBus } from "./log.ts";
import { orderedPhases } from "./phases.ts";
import type { ResidentRegistry } from "./residents.ts";

export interface TurnParts {
	readonly seed: number;
	readonly bus: EventBus;
	readonly residents: ResidentRegistry;
	/** In load order. */
	readonly instances: readonly (readonly [string, MechanicInstance])[];
	readonly policy: TurnPolicy;
	/** Whether the agent of a resident ended its last turn with results it has not answered yet. */
	readonly awaitsAnswer: (resident: ResidentId) => boolean;
	readonly tools: () => readonly ToolSpec[];
	readonly call: (actor: Actor, tool: string, params: unknown, cause: number) => Promise<ToolOutcome>;
	/** `Host.record`. */
	readonly record: (actor: Actor, type: string, payload: unknown) => void;
	/** Formats every text a resident reads (names for ids). */
	readonly display: (text: string) => string;
	/** Runs the calls mechanics staged meanwhile. */
	readonly settle: () => Promise<void>;
	/** True once the referee or a stop request ends the minute's turns. */
	readonly halted: () => boolean;
}

/** One policy from the mechanics' (at most one) and the story's, field by field; the story's win. */
export function mergePolicies(fromMechanics: readonly (readonly [string, TurnPolicy])[], fromStory: TurnPolicy | undefined): TurnPolicy {
	if (fromMechanics.length > 1) throw new Error(`story: ${fromMechanics.map(([id]) => id).join(" and ")} both supply a turn policy; load only one`);
	const merged: TurnPolicy = { ...fromMechanics[0]?.[1], ...fromStory };
	const passes = merged.passes ?? 1;
	const blockSize = merged.blockSize ?? 1;
	if (!Number.isInteger(passes) || passes < 1) throw new RangeError(`turn policy: invalid passes ${String(passes)}`);
	if (!Number.isInteger(blockSize) || blockSize < 1) throw new RangeError(`turn policy: invalid block size ${String(blockSize)}`);
	return merged;
}

/** A note with the sort key its line gave within its kind. */
export interface OrderedNote extends TurnNote {
	readonly order?: number;
}

function plain(note: OrderedNote): TurnNote {
	return note.kind === undefined ? { source: note.source, text: note.text } : { source: note.source, kind: note.kind, text: note.text };
}

/**
 * The notes in the policy's kind order, each listed kind sorted by `order` (0 when left out; a
 * stable sort keeps the phase order on ties); joined kinds become one note; the rest follow in
 * phase order.
 */
export function arrangeInputs(notes: readonly OrderedNote[], kinds: readonly InputKind[]): readonly TurnNote[] {
	const listed = kinds.flatMap((spec): readonly TurnNote[] => {
		const ofKind = notes
			.filter((note) => note.kind === spec.kind)
			.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
			.map(plain);
		if (ofKind.length === 0 || spec.join === undefined) return ofKind;
		const source = [...new Set(ofKind.map((note) => note.source))].join("+");
		return [{ source, kind: spec.kind, text: ofKind.map((note) => note.text).join(spec.join) }];
	});
	const rest = notes.filter((note) => note.kind === undefined || !kinds.some((spec) => spec.kind === note.kind));
	return [...listed, ...rest.map(plain)];
}

function blocksOf(order: readonly ResidentId[], size: number): readonly (readonly ResidentId[])[] {
	const blocks: ResidentId[][] = [];
	for (let start = 0; start < order.length; start += size) blocks.push(order.slice(start, start + size));
	return blocks;
}

function noteOf(source: string, line: TurnLine): OrderedNote {
	if (typeof line === "string") return { source, text: line };
	return line.order === undefined ? { source, kind: line.kind, text: line.text } : { source, kind: line.kind, text: line.text, order: line.order };
}

interface Prepared {
	readonly resident: ResidentId;
	readonly inputs: readonly TurnNote[];
	readonly cause: number;
}

export class TurnLoop {
	readonly #parts: TurnParts;

	constructor(parts: TurnParts) {
		this.#parts = parts;
	}

	/** Every pass of `minute`; stops between blocks once halted. */
	async play(agent: TurnTaker, minute: number): Promise<void> {
		const { policy, bus, residents, seed } = this.#parts;
		const passes = policy.passes ?? 1;
		for (let pass = 1; pass <= passes && !this.#parts.halted(); pass++) {
			const may = residents.ids.filter((id) => residents.mayAct(id));
			const order = this.#order({ seed, minute, pass, residents: may });
			const blocks = blocksOf(order, policy.blockSize ?? 1);
			bus.emit("core", "pass_started", { pass, order: [...order], blocks: blocks.map((block) => [...block]) });
			for (const [index, members] of blocks.entries()) {
				if (this.#parts.halted()) break;
				await this.#block(agent, minute, pass, index + 1, members);
			}
		}
	}

	#order(base: Omit<PassView, "rng">): readonly ResidentId[] {
		const policy = this.#parts.policy;
		const view: PassView = { ...base, rng: (...labels) => createRng(deriveSeed(base.seed, ...labels)) };
		const order = policy.order === undefined ? rngFor(view.seed, "turns", ...(view.pass === 1 ? [view.minute] : [view.minute, view.pass])).shuffle(view.residents) : policy.order(view);
		if (order.length !== view.residents.length || new Set(order).size !== order.length || !order.every((id) => view.residents.includes(id))) {
			throw new Error(`turn policy: the order of pass ${String(view.pass)} is not a permutation of the residents who may act`);
		}
		return order;
	}

	async #block(agent: TurnTaker, minute: number, pass: number, block: number, members: readonly ResidentId[]): Promise<void> {
		const { bus, residents, policy } = this.#parts;
		const prepared: Prepared[] = [];
		// No await in this loop: every member's inputs show the block's start.
		for (const resident of members) {
			if (!residents.mayAct(resident)) continue;
			if (policy.activation === "onNews" && !this.#news(resident) && !this.#parts.awaitsAnswer(resident)) {
				bus.emit("core", "turn_skipped", { resident, pass, block });
				continue;
			}
			const inputs = this.inputs(resident);
			const started = bus.emit("core", "turn_started", { resident, pass, block, inputs: inputs.map((note) => ({ ...note })) });
			prepared.push({ resident, inputs, cause: started.seq });
		}
		const failures: unknown[] = [];
		let previous: Promise<void> = Promise.resolve();
		const turns = prepared.map(({ resident, inputs, cause }) => {
			const ready = previous.then(() => {
				this.#phases((phases) => phases.turnOpened, (run) => {
					run(resident);
				});
			});
			const actor = residentActor(resident);
			const call = async (tool: string, params: unknown): Promise<ToolOutcome> => {
				await ready;
				return this.#parts.call(actor, tool, params, cause);
			};
			const record = async (type: string, payload: unknown): Promise<void> => {
				await ready;
				this.#parts.record(actor, type, payload);
			};
			const step = agent({ resident, minute, pass, block, inputs, tools: this.#parts.tools(), ready, call, record });
			// The next member's turn comes even when this one fails; the failure is raised after the block.
			const done = Promise.allSettled([ready, step]).then(async (results) => {
				for (const result of results) if (result.status === "rejected") failures.push(result.reason);
				this.#phases((phases) => phases.turnEnded, (run) => {
					run(resident);
				});
				await this.#parts.settle();
			});
			previous = done;
			return done;
		});
		await Promise.all(turns);
		if (failures.length > 0) throw failures[0] instanceof Error ? failures[0] : new Error(String(failures[0]));
	}

	/** The inputs of the resident's next turn: every mechanic's lines, arranged by the policy, formatted for reading. */
	inputs(resident: ResidentId): readonly TurnNote[] {
		const { bus, policy, display } = this.#parts;
		// In phase order: a phase that empties an inbox (and emits while doing so) runs after the phases that only read.
		const notes = orderedPhases(this.#parts.instances, (phases) => phases.turnInputs).flatMap((phase) => bus.run({ actor: "host" }, () => phase.run(resident)).map((line) => noteOf(phase.source, line)));
		return arrangeInputs(notes, policy.inputs ?? []).map((note) => ({ ...note, text: display(note.text) }));
	}

	#news(resident: ResidentId): boolean {
		return this.#parts.instances.some(([, instance]) => this.#parts.bus.run({ actor: "host" }, () => instance.hooks.news(resident)));
	}

	#phases<F>(pick: (phases: InstancePhases) => readonly HookPhase<F>[], call: (run: F) => void): void {
		for (const phase of orderedPhases(this.#parts.instances, pick)) {
			this.#parts.bus.run({ actor: "host" }, () => {
				call(phase.run);
			});
		}
	}
}
