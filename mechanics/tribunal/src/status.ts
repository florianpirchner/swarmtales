// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The tribunal's part of the status line, carried from the old `status.ts` (old turn-input.ts `tribunalParts` after
 * the standing, which is the exile's): accused, or due to vote. The faction draft's part joins with M5-42.
 */
import type { InputLine } from "@swarmtales/contracts";
import { isAlive } from "./city.ts";
import type { TribunalCtx } from "./head.ts";
import { currentSession } from "./state.ts";
import { canVote } from "./vote.ts";

/** The tribunal's part of the status line: after the exile's standing (900), before the seal (1000; old `STATUS_ORDER.tribunal`). */
const STATUS_ORDER = 910;

/**
 * The tribunal's status part for a resident (old `statusPart`).
 *
 * @param ctx - The context.
 * @param agent - The resident.
 * @returns One status line, or none.
 */
export function statusLines(ctx: TribunalCtx, agent: string): InputLine[] {
	if (!isAlive(ctx, agent)) return [];
	const session = currentSession(ctx.state);
	if (session === undefined) return [];
	if (session.accused.includes(agent)) return [{ kind: "status", order: STATUS_ORDER, text: ctx.prompt("tribunal/status/accused", { until: session.until }) }];
	return canVote(ctx, agent) ? [{ kind: "status", order: STATUS_ORDER, text: ctx.prompt("tribunal/status/tribunal-vote", { until: session.until }) }] : [];
}
