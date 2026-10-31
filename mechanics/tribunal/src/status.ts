/**
 * The tribunal's part of the status line (old turn-input.ts `tribunalParts` after the standing,
 * which is the exile's, and `draftParts`): accused, due to vote, or the faction draft.
 */
import { isAlive } from "./city.ts";
import type { TribunalCtx } from "./head.ts";
import { canVote, draftPhase } from "./schedule.ts";
import { currentSession } from "./state.ts";

export function statusPart(ctx: TribunalCtx, agent: string): string | undefined {
	if (!isAlive(ctx, agent)) return undefined;
	const session = currentSession(ctx.state);
	if (session === undefined) return draftPart(ctx, agent);
	if (session.accused.includes(agent)) return ctx.prompt("competitor/status/accused", { until: session.until });
	return canVote(ctx, agent) ? ctx.prompt("competitor/status/tribunal-vote", { until: session.until }) : undefined;
}

function draftPart(ctx: TribunalCtx, agent: string): string | undefined {
	const phase = draftPhase(ctx, agent);
	if (phase === undefined) return undefined;
	if (phase.kind === "nominate") {
		const nominated = phase.nominee === undefined ? "" : ` ${ctx.prompt("competitor/status/draft-nominated", { nominee: phase.nominee })}`;
		return ctx.prompt("competitor/status/draft-nominate", { until: phase.until, nominated });
	}
	if (phase.leads) return ctx.prompt("competitor/status/draft-leads", { applicants: phase.applicants.length === 0 ? "none" : phase.applicants.join(", "), until: phase.until });
	if (phase.leader !== undefined) return ctx.prompt("competitor/status/draft-applied", { leader: phase.leader, until: phase.until });
	// A leader who refused this resident is not offered again.
	const leaders = (ctx.state.draft?.leaders ?? []).filter((leader) => !phase.refusedBy.includes(leader));
	return leaders.length === 0 ? ctx.prompt("competitor/status/draft-refused", {}) : ctx.prompt("competitor/status/draft-join", { leaders: leaders.join(", "), until: phase.until });
}
