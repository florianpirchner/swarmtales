// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The tribunal's part of the status line, carried from the old `status.ts` (old turn-input.ts `tribunalParts` after
 * the standing, which is the exile's, and `draftParts`): accused, due to vote, or the faction draft.
 */
import type { InputLine } from "@swarmtales/contracts";
import { isAlive } from "./city.ts";
import { draftPhase } from "./draft.ts";
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
	const text = statusPart(ctx, agent);
	return text === undefined ? [] : [{ kind: "status", order: STATUS_ORDER, text }];
}

function statusPart(ctx: TribunalCtx, agent: string): string | undefined {
	if (!isAlive(ctx, agent)) return undefined;
	const session = currentSession(ctx.state);
	if (session === undefined) return draftPart(ctx, agent);
	if (session.accused.includes(agent)) return ctx.prompt("tribunal/status/accused", { until: session.until });
	return canVote(ctx, agent) ? ctx.prompt("tribunal/status/tribunal-vote", { until: session.until }) : undefined;
}

function draftPart(ctx: TribunalCtx, agent: string): string | undefined {
	const phase = draftPhase(ctx, agent);
	if (phase === undefined) return undefined;
	if (phase.kind === "nominate") {
		const nominated = phase.nominee === undefined ? "" : ` ${ctx.prompt("tribunal/status/draft-nominated", { nominee: phase.nominee })}`;
		return ctx.prompt("tribunal/status/draft-nominate", { until: phase.until, nominated });
	}
	if (phase.leads) return ctx.prompt("tribunal/status/draft-leads", { applicants: phase.applicants.length === 0 ? "none" : phase.applicants.join(", "), until: phase.until });
	if (phase.leader !== undefined) return ctx.prompt("tribunal/status/draft-applied", { leader: phase.leader, until: phase.until });
	// A leader who refused this resident is not offered again.
	const leaders = (ctx.state.draft?.leaders ?? []).filter((leader) => !phase.refusedBy.includes(leader));
	return leaders.length === 0 ? ctx.prompt("tribunal/status/draft-refused", {}) : ctx.prompt("tribunal/status/draft-join", { leaders: leaders.join(", "), until: phase.until });
}
