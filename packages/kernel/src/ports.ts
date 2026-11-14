// SPDX-License-Identifier: Apache-2.0
/**
 * Part 7: the port the kernel gives the scheduler. It holds what is no policy of a scheduler: the lines of the
 * `inputs` hooks, the basis of an activation and of its calls, the count of its calls, and the two brackets
 * `activation_opened` and `activation_closed`.
 */
import { SwtError } from "@swarmtales/contracts";
import type { ActorId, Envelope, InputLine, InputNote, JsonValue, OpenActivation, OrderedNote, PluginInstance, ToolOutcome } from "@swarmtales/contracts";
import { guarded, misfit, twoToAct } from "./errors.ts";
import type { Frame, Lifecycle, PartFactories, SchedulerPortParts } from "./parts.ts";
import { rngFor } from "./random.ts";

const KERNEL: Frame = { actor: "kernel" };

/** Runs code of the port; what it throws ends the run before it is thrown on. */
type Step = <T>(code: () => T) => T;

function stepOf(life: Lifecycle): Step {
	return (code) => {
		try {
			return code();
		} catch (error) {
			life.fail(error);
			throw error;
		}
	};
}

function noteOf(source: string, line: InputLine): OrderedNote {
	if (typeof line === "string") return { source, text: line };
	return line.order === undefined ? { source, kind: line.kind, text: line.text } : { source, kind: line.kind, text: line.text, order: line.order };
}

// A note as the event holds it: without the sort key of a line that came straight from `inputsFor`.
function plain({ source, kind, text }: InputNote): InputNote {
	return kind === undefined ? { source, text } : { source, kind, text };
}

// What one activation is opened with: the actor, the basis of its inputs, the lines as shown and the scheduler's data.
interface Opening {
	readonly actor: ActorId;
	readonly basis: number;
	readonly inputs: readonly InputNote[];
	readonly detail: Readonly<Record<string, JsonValue>>;
}

// Writes `activation_opened` and returns the activation. Its calls are caused by that event; the first has the
// basis of the inputs, a later one the seq of the answer to the call before it.
function openActivation(parts: SchedulerPortParts, opening: Opening, step: Step): OpenActivation {
	const { log, dispatch } = parts;
	const { actor, basis, inputs, detail } = opening;
	const opened = log.run({ actor }, () => log.emit("kernel", "activation_opened", { actor, inputs: inputs.map(plain), detail: { ...detail } }, { basis }));
	const grant = parts.actors.spec(actor)?.grant;
	let calls = 0;
	let answered = false;
	let closed = false;
	return {
		actor,
		tick: opened.tick,
		basis,
		detail,
		inputs,
		tools: grant === undefined ? [] : parts.toolSpecs(grant),
		async call(as: string, params: unknown): Promise<ToolOutcome> {
			const seen = answered ? (dispatch.answerSeq(actor) ?? basis) : basis;
			calls += 1;
			const outcome = await dispatch.submit({ actor, as, params, basis: seen, causedBy: opened.seq });
			answered = true;
			return outcome;
		},
		close(failed: boolean): void {
			if (closed) return;
			closed = true;
			const outcome = failed ? "error" : calls > 0 ? "acted" : "no-call";
			step(() => log.run({ actor, causedBy: opened.seq }, () => log.emit("kernel", "activation_closed", { actor, calls, outcome })));
		},
		get quietEnd(): boolean {
			return dispatch.quietEnd(actor);
		},
	};
}

// The plugin whose `toAct` hook says who is to act now; `SWT-R013` when two have one.
function toActOwner(parts: SchedulerPortParts): { readonly id: string; readonly instance: PluginInstance } | undefined {
	const owners = parts.loaded.order.flatMap((id) => {
		const instance = parts.loaded.instances.get(id);
		return instance?.hooks.toAct === undefined ? [] : [{ id, instance }];
	});
	if (owners.length > 1) throw new SwtError(twoToAct(owners.map((owner) => owner.id)));
	return owners[0];
}

/**
 * Creates the scheduler's port. Plugin code it calls (`news`, `toAct`, the `inputs` hooks) runs each in its own
 * frame of the kernel; a throw of it is `SWT-R003`. Whatever throws in the port (plugin code, a sink) ends the
 * run through `life.fail` before it reaches the scheduler.
 *
 * @param parts - The log, the actors, the clock, the loaded plugins, dispatch and the tool lists.
 * @param life - The lifecycle: the two halves of a tick and the halt.
 * @returns The port.
 * @throws SwtError `SWT-R013` when two loaded plugins have a `toAct` hook; from `emit`, `SWT-R002` for an event
 * type the scheduler does not declare.
 */
export const createSchedulerPort = ((parts, life) => {
	const { definition, log, loaded } = parts;
	const scheduler = definition.scheduler.definition;
	const owner = toActOwner(parts);
	const remembered = new Map<ActorId, number>();
	const step = stepOf(life);
	// One piece of plugin code in its own frame of the kernel.
	const ask = <T>(plugin: string, code: () => T): T => step(() => log.run(KERNEL, () => guarded(plugin, code)));
	return {
		seed: definition.seed,
		get tick(): number {
			return parts.clock.tick;
		},
		actors: parts.actors,
		get halted(): boolean {
			return life.halted;
		},
		rng: (...labels) => rngFor(definition.seed, ...labels),
		emit(type: string, payload: unknown): Envelope {
			if (!Object.hasOwn(scheduler.events, type)) {
				throw new SwtError(misfit(`${scheduler.id} writes the event "${type}", which it does not declare`, `Add "${type}" to the events of the scheduler, or write a declared one.`));
			}
			return step(() => log.emit(scheduler.id, type, payload));
		},
		beginTick: () => life.beginTick(),
		endTick: (idle) => life.endTick(idle),
		hasNews: (actor) =>
			loaded.order.some((id) => {
				const instance = loaded.instances.get(id);
				return instance !== undefined && ask(id, () => instance.hooks.news?.(actor) === true);
			}),
		toAct: () => (owner === undefined ? undefined : ask(owner.id, () => owner.instance.hooks.toAct?.())),
		inputsFor(actor: ActorId): readonly OrderedNote[] {
			const notes = loaded.hooks("inputs").flatMap((hook) => ask(hook.plugin, () => hook.run(actor)).map((line) => noteOf(hook.plugin, line)));
			remembered.set(actor, log.length);
			return notes;
		},
		open(actor, inputs, detail): OpenActivation {
			const basis = remembered.get(actor) ?? log.length;
			remembered.delete(actor);
			return step(() => openActivation(parts, { actor, basis, inputs, detail }, step));
		},
	};
}) satisfies PartFactories["createSchedulerPort"];
