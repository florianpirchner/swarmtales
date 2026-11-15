// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The actions of a rule that fired (old `Director#run`): every action writes `director_action` first, with the rule,
 * its kind, the actor of the firing, the path of a nested list and the audit mark. What an action does (a call of a
 * tool of another mechanic as the actor `script`, and `director_skipped` when it is skipped) is issue M5-32: here an
 * action is announced and nothing else happens.
 */
import type { ScriptCtx } from "./head.ts";
import type { Action } from "./rules.ts";
import type { Origin } from "./state.ts";

/**
 * Who and what a firing is about (old `Firing`).
 *
 * @public
 */
export interface Occasion {
	/** The resident the firing is about. */
	readonly actor?: string;
	/** The other party of a pair trigger, for example the silent receiver of a direct message. */
	readonly other?: string;
	/** The level of the trigger. */
	readonly level?: number;
	/** `onHolderBehind`: the holder's level. */
	readonly otherLevel?: number;
	/** `onHolderBehind`: what the holder holds. */
	readonly piece?: string;
	/** `{seats}`: the size of the collection the rule starts or names. */
	readonly seats?: number;
}

function auditOf(action: Action): "NPC_LEVEL_SET" | "DIRECTOR_PRIVACY_BREACH" | undefined {
	if (action.kind === "setCastLevel") return "NPC_LEVEL_SET";
	if (action.kind === "revealCollection") return "DIRECTOR_PRIVACY_BREACH";
	return undefined;
}

/**
 * Runs the actions of a firing in order (old `#run`).
 *
 * @param ctx - The script's context.
 * @param origin - The rule and the path of the list.
 * @param actions - The actions.
 * @param occasion - Who and what the firing is about.
 */
export function runActions(ctx: ScriptCtx, origin: Origin, actions: readonly Action[], occasion: Occasion): void {
	for (const action of actions) {
		const audit = auditOf(action);
		ctx.emit("director_action", {
			rule: origin.rule,
			action: action.kind,
			...(occasion.actor === undefined ? {} : { actor: occasion.actor }),
			...(origin.via === undefined ? {} : { via: origin.via }),
			...(audit === undefined ? {} : { audit }),
		});
	}
}

/**
 * A count fixed in the game, or a share of the residents in the city, rounded up, at least the minimum (old
 * `resolveCount`).
 *
 * @param count - The count or the share.
 * @param residents - The residents in the city.
 * @returns The count.
 *
 * @public
 */
export function resolveCount(count: number | { readonly share: number; readonly minimum: number }, residents: number): number {
	return typeof count === "number" ? count : Math.max(count.minimum, Math.ceil(residents * count.share));
}
