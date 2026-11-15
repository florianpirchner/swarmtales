// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Mechanic: a vote that ends in a verdict (the slice's stand-in for the tribunal). One session opens and closes at
 * fixed ticks; residents vote with `vote`; at the close the resident with the most votes is the verdict, which the
 * court proposes as the decision `court.verdict`. The verdict that stands is carried out: the city's line on the
 * board, the banishing through the service `exile`, the event `verdict`.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { Check } from "typebox/value";
import type { RandomSource, Refusal } from "@swarmtales/contracts";
import { defineMechanic, refuse, reply } from "@swarmtales/sdk";
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { DecisionsEvents, DecisionsService } from "@swarmtales/mechanic-decisions/contract";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { COURT_VERDICT, courtHead, type CourtCtx, type CourtToolCtx } from "./head.ts";

export { CITY_LINE, COURT_VERDICT, courtHead } from "./head.ts";

const Verdict = Type.Object({ exiled: Type.String({ description: "The resident to banish." }) }, { description: "The proposal of the decision `court.verdict`." });

// The refusals of a vote, in order; undefined when nothing stands in the way.
function barred(ctx: CourtToolCtx, target: string): Refusal | undefined {
	if (!ctx.state.open) return refuse("SESSION_CLOSED", ctx.prompt("court/replies/session-closed", {}));
	if (!ctx.residents.has(target)) return refuse("UNKNOWN_RESIDENT", ctx.prompt("court/replies/unknown-resident", { target }));
	if (target === ctx.resident) return refuse("SELF_VOTE", ctx.prompt("court/replies/self-vote", {}));
	if (ctx.call(ExileService, "isExiled", { resident: target })) return refuse("EXILED", ctx.prompt("court/replies/exiled", { target }));
	return undefined;
}

// A vote the fake driver may cast: one per session, against another resident that may act. A resident that already
// has votes against it is in the draw once more per vote, so the votes gather and a verdict is likelier than a tie.
function sampleVote(ctx: CourtToolCtx, random: RandomSource): { target: string } | undefined {
	const voter = ctx.resident;
	if (voter === undefined || !ctx.state.open || ctx.state.votes.some((vote) => vote.voter === voter)) return undefined;
	const others = ctx.residents.ids.filter((id) => id !== voter && ctx.residents.mayAct(id));
	const named = ctx.state.votes.map((vote) => vote.target).filter((target) => others.includes(target));
	return others.length === 0 ? undefined : { target: random.pick([...others, ...named]) };
}

// Carries a verdict out: the city's line, the banishing, `verdict`. A resident banished meanwhile (or no resident at all) is left alone and nothing is written.
function commit(ctx: CourtCtx, exiled: string, decision?: string): void {
	if (!ctx.residents.has(exiled) || ctx.call(ExileService, "isExiled", { resident: exiled })) return;
	ctx.call(ChannelsService, "post", { author: "CITY", kind: "city", text: ctx.options.line.replaceAll("{resident}", exiled) });
	ctx.call(ExileService, "banish", { resident: exiled });
	ctx.emit("verdict", { exiled, ...(decision === undefined ? {} : { decision }) });
}

// Opens the session; with the option `announce` every resident that is not banished gets a notice, in roster order.
function openSession(ctx: CourtCtx): void {
	const { closesAt, announce } = ctx.options;
	ctx.state.open = true;
	ctx.emit("session_opened", { closesAt });
	if (announce !== true) return;
	const gone = ctx.call(ExileService, "exiled", {});
	const text = ctx.prompt("court/notices/session-opened", { tick: ctx.tick, closesAt });
	for (const to of ctx.residents.ids.filter((id) => !gone.includes(id))) ctx.call(ChannelsService, "notify", { to, author: "CITY", text });
}

// Closes the session: counts the votes, and proposes the resident with the most as the verdict. A tie or no vote: no verdict.
function close(ctx: CourtCtx): void {
	const gone = ctx.call(ExileService, "exiled", {});
	const standing = ctx.residents.ids.filter((id) => !gone.includes(id));
	const counted = standing.map((id) => [id, ctx.state.votes.filter((vote) => vote.target === id).length] as const).filter(([, votes]) => votes > 0);
	ctx.state.open = false;
	ctx.state.votes = [];
	ctx.emit("session_closed", { tally: Object.fromEntries(counted) });
	const [first, second] = [...counted].sort((a, b) => b[1] - a[1]);
	if (first === undefined || first[1] === second?.[1]) return;
	const schema = Type.Object({ exiled: Type.Union(standing.map((id) => Type.Literal(id))) }, { additionalProperties: false });
	const answer = ctx.call(DecisionsService, "propose", { kind: COURT_VERDICT, proposal: { exiled: first[0] }, window: ctx.options.window, schema });
	if (answer.committed) commit(ctx, first[0]);
}

/**
 * The court: one session of votes, and a verdict that the holders of decisions may amend before it is carried out.
 *
 * @example
 * ```ts
 * const game = defineGame({ id: "city", residents: 6, mechanics: [channels(), exile(), decisions({ holders: ["human"] }), court({ opensAt: 4, closesAt: 6, window: 2 })], end: { ticks: 12 } });
 * ```
 *
 * @public
 */
export const court = defineMechanic(courtHead, {
	tools: {
		vote: {
			check: ({ target }, ctx) => barred(ctx, target),
			sample: sampleVote,
			run: ({ target }, ctx) => {
				const voter = ctx.resident ?? ctx.actor;
				const cast = ctx.state.votes.find((vote) => vote.voter === voter);
				if (cast === undefined) ctx.state.votes.push({ voter, target });
				else cast.target = target;
				ctx.emit("vote_cast", { voter, target });
				return reply(ctx.prompt("court/replies/vote-cast", { target }));
			},
		},
	},
	hooks: {
		tickStarted: (ctx) => {
			if (ctx.tick === ctx.options.opensAt) openSession(ctx);
			if (ctx.state.open && ctx.tick >= ctx.options.closesAt) close(ctx);
		},
	},
	listeners: (kit) => [
		kit.listen(DecisionsEvents, "decision_settled", (settled, ctx) => {
			if (settled.kind === COURT_VERDICT && settled.owner === ctx.mechanic && Check(Verdict, settled.proposal)) commit(ctx, settled.proposal.exiled, settled.decision);
		}),
	],
});
