// SPDX-License-Identifier: Apache-2.0
/** The shapes of the projection of an envelope log (`projectRun` in `projection.ts` builds them). */
import type { RunEvent } from "./events.ts";

/**
 * One tool call: the line `tool_called` with its answer.
 *
 * @public
 */
export interface Call {
	/** The seq of `tool_called`. */
	readonly seq: number;
	/** The tick of the call. */
	readonly tick: number;
	/** The id of the calling actor (`resident:A01`, `director:warden`, `human`). */
	readonly actor: string;
	/** The name the caller used. */
	readonly as: string;
	/** The canonical name of the tool; the name the caller used when the line has none. */
	readonly tool: string;
	/** The arguments as the caller gave them. */
	readonly params: unknown;
	/** True for a call of the actor `human`: an intervention of the Human Hand. */
	readonly human: boolean;
	/** True for a Director's `take`, the call that fetches its firings; every other call of a Director is an act. */
	readonly take: boolean;
	/** The seq of the activation the call was made in; a call of the human between two ticks has none. */
	readonly activation?: number;
	/** The answer: `tool_result` (`ok`, the reply as `text`) or `tool_refused` (the refusal `code`, its detail as `text`). Absent while the log has none. */
	readonly answer?: { readonly seq: number; readonly ok: boolean; readonly text: string; readonly code?: string };
}

/**
 * One event a Director was woken for, as its `take` answered it.
 *
 * @public
 */
export interface Firing {
	/** The seq of the event that fired. */
	readonly seq: number;
	/** The tick of that event. */
	readonly tick: number;
	/** The trigger, `<plugin id>.<event type>`. */
	readonly event: string;
	/** The payload of that event. */
	readonly payload: unknown;
}

/**
 * One activation with everything that belongs to it.
 *
 * @public
 */
export interface Activation {
	/** The seq of `activation_opened`. */
	readonly seq: number;
	/** The tick of the activation. */
	readonly tick: number;
	/** The id of the activated actor. */
	readonly actor: string;
	/** The kind of the actor: `resident`, `director`, or another kind of the game. A Director's activation is its own row kind. */
	readonly kind: string;
	/** The name of the actor, as `RunEvent.actor` has it. */
	readonly name: string;
	/** The seq of `activation_closed`; absent when the log ends inside the activation. */
	readonly closedSeq?: number;
	/** How the activation went: `acted`, `no-call` or `error`. */
	readonly outcome?: string;
	/** The calls of the activation, in order; a Director's first call is its `take`. */
	readonly calls: readonly Call[];
	/** The records of the actor's driver (a model's request and answer, a Director's `asked` and `answered`), in order. */
	readonly records: readonly RunEvent[];
	/** What a Director was woken for; empty for every other actor. */
	readonly firings: readonly Firing[];
}

/**
 * One decision of the mechanic `decisions`: proposed, amended, settled.
 *
 * @public
 */
export interface Decision {
	/** The id of the decision (`D1`). */
	readonly id: string;
	/** The seq of `decision_proposed`. */
	readonly seq: number;
	/** The tick it was proposed at. */
	readonly tick: number;
	/** The kind the owner gave it (`court.verdict`). */
	readonly kind: string;
	/** The id of the plugin that owns it. */
	readonly owner: string;
	/** The proposal as it was first made. */
	readonly proposal: unknown;
	/** The tick the decision settles at. */
	readonly deadline: number;
	/** The ids of the actors that may amend it. */
	readonly holders: readonly string[];
	/** Every amendment, in order: who, why, and the proposal it set. */
	readonly amendments: readonly { readonly seq: number; readonly tick: number; readonly by: string; readonly reason?: string; readonly proposal: unknown }[];
	/** The settlement: whether an amendment changed the proposal, and the proposal that stands. Absent while the decision is open. */
	readonly settled?: { readonly seq: number; readonly tick: number; readonly changed: boolean; readonly proposal: unknown };
}

/**
 * A pause of the Human Hand: from `paused` to the next `resumed`.
 *
 * @public
 */
export interface Pause {
	/** The seq of `paused`. */
	readonly seq: number;
	/** The tick boundary the run halted at: the pause lies before this tick. */
	readonly tick: number;
	/** The id of the actor that paused. */
	readonly by: string;
	/** Why, in the words of the human. */
	readonly reason?: string;
	/** The seq of `resumed`; absent when the log ends paused. */
	readonly endSeq?: number;
	/** The tick of `resumed`. */
	readonly endTick?: number;
}

/**
 * A resume marker (`run_resumed`): from here on the log was written by a run that started from a snapshot.
 *
 * @public
 */
export interface ResumeMarker {
	/** The seq of the marker. */
	readonly seq: number;
	/** The number of finished ticks the run went on from. */
	readonly tick: number;
	/** The id of the run the snapshot was taken from. */
	readonly from: string;
	/** The sha256 of the snapshot file. */
	readonly snapshotHash: string;
}

/**
 * A suspension of an actor by a plugin (`actor_suspended`); a banished resident is suspended by `exile`.
 *
 * @public
 */
export interface Suspension {
	/** The seq of `actor_suspended`: the actor is greyed from here on. */
	readonly seq: number;
	/** The tick of the suspension. */
	readonly tick: number;
	/** The id of the suspended actor. */
	readonly actor: string;
	/** The name of the actor, as `RunEvent.actor` has it. */
	readonly name: string;
	/** The id of the plugin that suspended it. */
	readonly by: string;
	/** Why (`exiled`). */
	readonly reason: string;
	/** The seq of `actor_resumed`, when the plugin lifted the suspension. */
	readonly endSeq?: number;
}

/**
 * What the views draw beside the list of events.
 *
 * @public
 */
export interface RunProjection {
	/** Every activation, in the order of the log. */
	readonly activations: readonly Activation[];
	/** Every decision, in the order proposed. */
	readonly decisions: readonly Decision[];
	/** The calls of the actor `human`, in order. */
	readonly humanCalls: readonly Call[];
	/** True when the human called a tool: the run is human-influenced. */
	readonly humanInfluenced: boolean;
	/** The pauses, in order. */
	readonly pauses: readonly Pause[];
	/** The resume markers, in order. */
	readonly resumes: readonly ResumeMarker[];
	/** The suspensions, in order. */
	readonly suspensions: readonly Suspension[];
	/** By the seq of a line that belongs to an activation (a call, its answer, a driver record, the closing): the seq of that activation. A view lists such a line in the activation, not as an event of its own. */
	readonly attached: ReadonlyMap<number, number>;
}
