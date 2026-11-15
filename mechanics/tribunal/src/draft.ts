// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The residents' tools of the faction draft, carried from the old `index.ts` (`nominate`, `join`, `refuse`, the old
 * `enabledTools` of the draft) and `schedule.ts` (`draftPhase`, `draftStep`): the old checks in the old order, the
 * reply strings as before. A name where an id goes and an id in a reply go through `identity` (the old presentation
 * of `names`), as the vote does.
 */
import type { RandomSource, ToolOutcome } from "@swarmtales/contracts";
import { IdentityService } from "@swarmtales/mechanic-contracts";
import { refuse, reply } from "@swarmtales/sdk";
import { isAlive } from "./city.ts";
import { join, nominate, phaseOf, refuseApplicant, type DraftError, type DraftPhase } from "./factions.ts";
import type { TribunalCtx, TribunalToolCtx } from "./head.ts";
import { err, type Result } from "./template.ts";

type Step = "nominate" | "join" | "refuse";

/**
 * Old `draftPhase`: where a resident in the city stands in a running faction draft.
 *
 * @param ctx - The context.
 * @param agent - The resident.
 * @returns The phase, or undefined.
 */
export function draftPhase(ctx: TribunalCtx, agent: string): DraftPhase | undefined {
	if (!isAlive(ctx, agent) || ctx.state.draft === undefined) return undefined;
	return phaseOf(ctx.state.draft, agent);
}

// Old `draftStep`: the draft's steps for a resident in the city.
function draftStep(ctx: TribunalCtx, step: Step, agent: string, other: string): Result<string, DraftError> {
	const draft = ctx.state.draft;
	if (draft === undefined || !isAlive(ctx, agent)) return err("NO_DRAFT", "no faction draft is running for you");
	if (step === "nominate") return nominate(ctx, draft, agent, other);
	return step === "join" ? join(ctx, draft, agent, other) : refuseApplicant(ctx, draft, agent, other);
}

/**
 * The old `enabledTools` for the draft's steps, by phase.
 *
 * @param ctx - The context.
 * @param tool - The bare tool name: `nominate`, `join` or `refuse`.
 * @param resident - The resident.
 * @returns True while the step is open to it.
 */
export function stepOpen(ctx: TribunalCtx, tool: string, resident: string): boolean {
	const phase = draftPhase(ctx, resident);
	if (tool === "nominate") return phase?.kind === "nominate";
	if (tool === "join") return phase?.kind === "join" && !phase.leads;
	return tool === "refuse" && phase?.kind === "join" && phase.leads;
}

const shown = (ctx: TribunalToolCtx, text: string): string => ctx.tryCall(IdentityService, "display", { text }) ?? text;

// The step with the other resident as the id its name stands for; a refusal shown with names.
function run(ctx: TribunalToolCtx, step: Step, other: string, answer: (value: string, self: string) => string): ToolOutcome {
	const self = ctx.resident;
	if (self === undefined) return refuse("NO_RESIDENT");
	const result = draftStep(ctx, step, self, ctx.tryCall(IdentityService, "resolve", { text: other }) ?? other);
	return result.ok ? reply(shown(ctx, answer(result.value, self))) : refuse(result.error, shown(ctx, result.detail));
}

/**
 * Old `nominate`: the reply, with the window while it is still open.
 *
 * @param ctx - The tool's context.
 * @param agent - The resident nominated, by name or id.
 * @returns The outcome.
 */
export function runNominate(ctx: TribunalToolCtx, agent: string): ToolOutcome {
	return run(ctx, "nominate", agent, (value, self) => {
		const phase = draftPhase(ctx, self);
		const until = phase?.kind === "nominate" ? ` · ${ctx.prompt("tribunal/replies/nominate-until", { until: phase.until })}` : "";
		return `${ctx.prompt("tribunal/replies/nominate-recorded", { agent: value })}${until}`;
	});
}

/**
 * Old `join`: the reply, with the window while it is still open.
 *
 * @param ctx - The tool's context.
 * @param leader - The leader, by name or id.
 * @returns The outcome.
 */
export function runJoin(ctx: TribunalToolCtx, leader: string): ToolOutcome {
	return run(ctx, "join", leader, (value, self) => {
		const phase = draftPhase(ctx, self);
		const until = phase?.kind === "join" ? ` ${ctx.prompt("tribunal/replies/join-until", { until: phase.until })}` : "";
		return `${ctx.prompt("tribunal/replies/join-applied", { leader: value })}${until}`;
	});
}

/**
 * Old `refuse`.
 *
 * @param ctx - The tool's context.
 * @param agent - The applicant, by name or id.
 * @returns The outcome.
 */
export function runRefuse(ctx: TribunalToolCtx, agent: string): ToolOutcome {
	return run(ctx, "refuse", agent, (value) => ctx.prompt("tribunal/replies/refuse-done", { agent: value }));
}

/**
 * The fake driver's choice for a step of the draft: a member to nominate, a leader that did not refuse it, or one of
 * its applicants; nothing while the step is closed to it.
 *
 * @param ctx - The tool's context.
 * @param step - The step.
 * @param random - The driver's random source.
 * @returns The resident to name, or undefined.
 */
export function sampleStep(ctx: TribunalToolCtx, step: Step, random: RandomSource): string | undefined {
	const self = ctx.resident;
	const draft = ctx.state.draft;
	if (self === undefined || draft === undefined || !stepOpen(ctx, step, self)) return undefined;
	const phase = phaseOf(draft, self);
	if (phase?.kind !== "join") return random.pick(draft.members);
	const choices = step === "join" ? (draft.leaders ?? []).filter((leader) => !phase.refusedBy.includes(leader)) : phase.applicants;
	return choices.length === 0 ? undefined : random.pick(choices);
}
