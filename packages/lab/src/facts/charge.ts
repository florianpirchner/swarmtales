// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Who pays for a model request. A review's records are written inside the call under review, so their actor is the
 * caller (the kernel's `ReviewRequest.record`); the request was asked by the Director that answers the review. The
 * engine's record `asked` of the review names that answerer, and every record of the review is caused by the same
 * `tool_called`, so the records of the Directors' asker that follow it are charged to the answering Director (P482).
 */
import type { ActorId, Envelope, RunManifest } from "@swarmtales/contracts";
import { Type } from "typebox";
import { Check } from "typebox/value";

/** The record source of the engine's answerer port (`REVIEW_RECORDS.id` of `engine`, which the lab may not import). */
const REVIEW = "@swarmtales/engine/review";
/** The record source of a Director's asker (`DIRECTOR_MODEL_RECORDS.id` of `models`). */
const ASKER = "@swarmtales/models/director";

const Asked = Type.Object({ answerer: Type.String({ description: "Who answers the review" }) }, { description: "What the lab reads of the `asked` record of a review" });

/**
 * Makes the rule that charges a record to an actor; feed it the envelopes of a log in log order.
 *
 * @remarks
 * A record of the Directors' asker caused by the same `tool_called` as the last review `asked` before it is charged
 * to the actor `director:<answerer>` of that review, when the manifest has that actor; every other envelope is
 * charged to its own actor. A Director's actor is `director:<name>`, and the Directors of the games answer under
 * their own name, so a renamed Director (`as`) whose answerer is no actor of the run stays with the caller.
 *
 * @param manifest - The manifest of the run: its actors.
 * @returns The rule: the actor id an envelope is charged to.
 * @example
 * ```ts
 * const charge = chargeOf(manifest);
 * const payers = events.map(charge); // "director:guard" for the guard's request inside a resident's call
 * ```
 *
 * @public
 */
export function chargeOf(manifest: RunManifest): (event: Envelope) => ActorId {
	const actors = new Set(manifest.actors.map((actor) => actor.id));
	const answerers = new Map<number, ActorId>();
	return (event) => {
		if (event.causedBy === undefined) return event.actor;
		if (event.source === REVIEW && event.type === "asked" && Check(Asked, event.payload)) {
			const director: ActorId = `director:${event.payload.answerer}`;
			if (actors.has(director)) answerers.set(event.causedBy, director);
			else answerers.delete(event.causedBy);
		}
		return event.source === ASKER ? (answerers.get(event.causedBy) ?? event.actor) : event.actor;
	};
}
