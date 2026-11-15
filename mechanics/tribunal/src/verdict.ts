// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The close of a tribunal's vote and its verdict, carried from the old `court.ts` (`#close`, `commitVerdict`,
 * `#prices`, `busy`, `#end`): the non-voters' penalty, the verdict at the decision gate (committed at once without
 * `decisions` or with the window 0), the result, and the gates opened through `exile` with the prices and texts of the
 * tribunal (12-m5-spec.md 2.3: the caller passes them), and the settling of the faction draft.
 */
import { Type, type Static } from "typebox";
import { DecisionsService } from "@swarmtales/mechanic-decisions/contract";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { burn, exiledList, gateCount, lowestFirst, missing, notify, points, post, register, render, text } from "./city.ts";
import { settleDraft } from "./factions.ts";
import type { TribunalCtx } from "./head.ts";
import { ransomPrices, type RansomPrices } from "./pacing.ts";
import { currentSession, type Session } from "./state.ts";
import { namesOf } from "./template.ts";

/**
 * The kind of the tribunal's verdict at the decision gate.
 *
 * @public
 */
export const VERDICT = "tribunal.verdict";

/**
 * The proposal of a verdict: the residents a closing session exiles.
 *
 * @public
 */
export const Verdict = Type.Object(
	{ tribunal: Type.Integer({ description: "The tribunal's number" }), exiled: Type.Array(Type.String({ description: "A resident id" }), { description: "Who goes to the gate" }) },
	{ description: "The proposal of the decision `tribunal.verdict`" },
);

/**
 * The ransom for a gate opening now: from the median points of every resident still in the register (old `#prices`).
 *
 * @param ctx - The context.
 * @returns The prices.
 */
export function prices(ctx: TribunalCtx): RansomPrices {
	return ransomPrices(
		ctx.options.ransom,
		register(ctx).map((agent) => points(ctx, agent)),
	);
}

/**
 * Whether a verdict of the tribunal is still open at the decision gate.
 *
 * @param ctx - The context.
 * @returns True while one waits; false without `decisions`.
 */
export function verdictOpen(ctx: TribunalCtx): boolean {
	return (ctx.tryCall(DecisionsService, "open", {}) ?? []).some((open) => open.kind === VERDICT && open.owner === ctx.mechanic);
}

/**
 * Whether a tribunal is under way: called and not open yet, voting, someone at the gate, or a verdict open (old `busy`).
 *
 * @param ctx - The context.
 * @returns True while one is.
 */
export function busy(ctx: TribunalCtx): boolean {
	return ctx.state.plan?.called === true || currentSession(ctx.state) !== undefined || gateCount(ctx) > 0 || verdictOpen(ctx);
}

/**
 * The target is reached and the last gate closed: the city says so (old `#end`).
 *
 * @param ctx - The context.
 * @throws SwtError `SWT-G020` when the text names an unknown placeholder.
 */
export function end(ctx: TribunalCtx): void {
	ctx.state.ended = true;
	post(ctx, text(ctx, "targetReached", { exiledList: namesOf(exiledList(ctx)) }));
}

// The voters of a closing session who did not vote and are still in the city.
function nonVotersOf(session: Session, gone: readonly string[]): readonly string[] {
	const voted = (agent: string): boolean => session.votes.some((vote) => vote.voter === agent);
	return session.voters.filter((agent) => !voted(agent) && !gone.includes(agent));
}

// The accused still standing (a seal may have struck one during the vote), ranked by votes; ties: the lowest first, as at the opening.
function ranking(ctx: TribunalCtx, session: Session, gone: readonly string[]): { readonly standing: readonly string[]; readonly ranked: readonly string[]; readonly votesFor: (agent: string) => number } {
	const votesFor = (agent: string): number => session.votes.filter((vote) => vote.target === agent).length;
	const standing = session.accused.filter((agent) => !gone.includes(agent));
	const order = lowestFirst(ctx, session.minute, standing);
	const ranked = [...standing].sort((a, b) => votesFor(b) - votesFor(a) || order.indexOf(a) - order.indexOf(b));
	return { standing, ranked, votesFor };
}

/**
 * Old `#close`, first half: the penalty for non-voters, then the verdict goes to the decision gate. Without a provider
 * of `decisions`, or with the window 0, the verdict is committed at once, in this frame: the old close step for step.
 *
 * @param ctx - The context.
 * @param session - The session whose vote closes.
 * @param minute - The tick.
 * @throws SwtError `SWT-G020` when a text names an unknown placeholder.
 */
export function closeSession(ctx: TribunalCtx, session: Session, minute: number): void {
	const { state, options: spec } = ctx;
	session.closed = true;
	state.lastResult = minute;
	const gone = exiledList(ctx);
	for (const agent of nonVotersOf(session, gone)) {
		if (spec.nonVoterPenalty > 0) burn(ctx, agent, spec.nonVoterPenalty, "did not vote in the tribunal");
		notify(ctx, agent, text(ctx, "nonVoter", {}));
	}
	// After the penalties, as the old close ranked.
	const { standing, ranked } = ranking(ctx, session, gone);
	const count = Math.max(0, Math.min(session.count, missing(ctx)));
	const proposal = { tribunal: session.tribunal, exiled: ranked.slice(0, count) };
	// A holder may change whom the verdict exiles, but only among the accused still standing, and never more.
	const schema = Type.Object({ tribunal: Type.Literal(session.tribunal), exiled: Type.Array(Type.Union(standing.map((agent) => Type.Literal(agent))), { maxItems: count, uniqueItems: true }) });
	const answer = ctx.tryCall(DecisionsService, "propose", { kind: VERDICT, proposal, window: spec.decisionWindow ?? 0, schema });
	if (answer === undefined || answer.committed) commitVerdict(ctx, proposal);
}

/**
 * The commit of `tribunal.verdict`: the old close's second half with the verdict that stood. It runs against the city
 * as it is now, so it drops whoever left meanwhile (a seal) and exiles no more than are still missing; then the result
 * post, `tribunal_result`, the gates through `exile`, and the draft's bloc bonus.
 *
 * @param ctx - The context.
 * @param proposal - The verdict that stands.
 * @throws SwtError `SWT-G020` when a text names an unknown placeholder.
 */
export function commitVerdict(ctx: TribunalCtx, proposal: Static<typeof Verdict>): void {
	const session = ctx.state.sessions.find((entry) => entry.tribunal === proposal.tribunal);
	if (session === undefined) return;
	const gone = exiledList(ctx);
	const nonVoters = nonVotersOf(session, gone);
	const { ranked, votesFor } = ranking(ctx, session, gone);
	const exiled = proposal.exiled.filter((agent) => !gone.includes(agent)).slice(0, Math.max(0, missing(ctx)));
	const counts = ranked.map((agent) => ({ agent, votes: votesFor(agent) }));
	const until = ctx.tick + ctx.options.gateMinutes;
	const price = prices(ctx);
	const countsText = counts.map((entry) => `${entry.agent}: ${String(entry.votes)} ${entry.votes === 1 ? "vote" : "votes"}`).join(" · ");
	post(ctx, text(ctx, "result", { counts: countsText, exiled: namesOf([...exiled].sort()), until: String(until), price: String(price.price), selfPrice: String(price.selfPrice) }));
	ctx.emit("tribunal_result", { counts, exiled: [...exiled], nonVoters: [...nonVoters] });
	for (const agent of exiled) toGate(ctx, agent, session, until, price);
	const draft = ctx.state.draft;
	if (draft?.tribunal === session.tribunal) {
		const left = exiledList(ctx);
		settleDraft(ctx, draft, session.voters, session.votes, (agent) => !left.includes(agent));
		delete ctx.state.draft;
	}
}

// The gate through `exile`: the notice and the board's texts are the tribunal's, rendered now; `{exiled}`, `{payers}` and `{will}` are the exile's to fill.
function toGate(ctx: TribunalCtx, agent: string, session: Session, until: number, price: RansomPrices): void {
	const voters = session.votes
		.filter((vote) => vote.target === agent)
		.map((vote) => vote.voter)
		.sort();
	const ransomable = !ctx.call(ExileService, "ransomed", { resident: agent });
	const values = { voters: namesOf(voters), until: String(until), price: String(price.price), selfPrice: String(price.selfPrice) };
	const notice = text(ctx, ransomable ? "gateNotice" : "gateNoticeFinal", values);
	const kept = { exiled: "{exiled}", payers: "{payers}", will: "{will}" };
	const texts = { exiled: render(ctx, ctx.options.texts.exiled, kept), will: render(ctx, ctx.options.texts.will, kept), ransomed: render(ctx, ctx.options.texts.ransomed, kept) };
	ctx.call(ExileService, "toGate", { resident: agent, until, ransomable, voters, price: price.price, selfPrice: price.selfPrice, bequestPerHeir: ctx.options.bequestPerHeir, notice, texts });
}
