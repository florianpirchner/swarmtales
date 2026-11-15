// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Mechanic: the decision window. A mechanic proposes a decision through the service `decisions`; the holders may
 * amend it with the tool `amendDecision` until its deadline; at the deadline a job writes `decision_settled` with the proposal that stands, and
 * the owner commits in a listener to that event. With a window of 0, or when no holder can act, nothing is written
 * and the owner commits at once. A decision still open when the run ends settles then, with its original proposal
 * (the hook `runEnded`, the old `DecisionGate.settleAll`).
 *
 * @packageDocumentation
 */
import { Clone, Check, Errors } from "typebox/value";
import type { Refusal, ToolOutcome } from "@swarmtales/contracts";
import { defineMechanic, refuse, reply, type CtxOf, type ToolCtxOf } from "@swarmtales/sdk";
import { head, type OpenDecision } from "./head.ts";

export { AmendDecision, DECISION_REFUSALS, DecisionsEvents, DecisionsService } from "./contract.ts";

/**
 * Says why a value does not fit a JSON schema.
 *
 * @param schema - The schema of a decision; undefined or no object: every value fits.
 * @param value - The proposal.
 * @returns The first mismatch as `<path> <message>`; undefined when the value fits.
 */
function misfit(schema: unknown, value: unknown): string | undefined {
	if (typeof schema !== "object" || schema === null || Check(schema, value)) return undefined;
	const [error] = Errors(schema, value);
	return error === undefined ? "the proposal does not match the schema" : `${error.instancePath === "" ? "/" : error.instancePath} ${error.message}`;
}

/** An amendment as the tool takes it. */
interface Amendment {
	readonly decision: string;
	readonly proposal: unknown;
	readonly reason: string;
}

// The open decision of an id; undefined when it settled already or never opened.
const openOf = (ctx: CtxOf<typeof head>, id: string): OpenDecision | undefined => (Object.hasOwn(ctx.state.open, id) ? ctx.state.open[id] : undefined);

// Stage `rule` of `amendDecision`: the decision is open, the caller holds it, the human has not taken it, the proposal fits.
function barred(ctx: ToolCtxOf<typeof head>, { decision, proposal }: Amendment): Refusal | undefined {
	const open = openOf(ctx, decision);
	if (open === undefined) return refuse("DECISION_CLOSED", ctx.prompt("decisions/replies/decision-closed", {}));
	if (!ctx.options.holders.includes(ctx.actor)) return refuse("DECISION_NOT_HELD", ctx.prompt("decisions/replies/decision-not-held", {}));
	if (ctx.actor !== "human" && open.amendments.some((amendment) => amendment.by === "human")) return refuse("DECISION_HUMAN", ctx.prompt("decisions/replies/decision-human", {}));
	const invalid = misfit(open.schema, proposal);
	return invalid === undefined ? undefined : refuse("PROPOSAL_INVALID", invalid);
}

// The tool `amendDecision`: numbers the amendment within its decision, keeps it in the slice and writes `decision_amended`.
function amend(ctx: ToolCtxOf<typeof head>, { decision, proposal, reason }: Amendment): ToolOutcome {
	const open = openOf(ctx, decision);
	if (open === undefined) return refuse("DECISION_CLOSED", ctx.prompt("decisions/replies/decision-closed", {}));
	const n = open.amendments.length + 1;
	open.amendments.push({ by: ctx.actor, n, proposal: Clone(proposal), reason });
	ctx.emit("decision_amended", { decision, n, by: ctx.actor, reason, proposal: Clone(proposal) });
	// The deadline never comes: the amendment is kept in the slice, and the caller is told that nothing settles.
	if (open.deadline >= ctx.ticks) return reply(ctx.prompt("decisions/replies/decision-outlasts-run", { decision, deadline: open.deadline, last: ctx.ticks - 1 }));
	return reply(ctx.prompt("decisions/replies/decision-amended", { decision, proposal: JSON.stringify(proposal) }));
}

// Closes a decision: at its deadline (a job) with the proposal that stands, which is the last amendment's or the
// original; at the end of the run (`standing: false`) with the original, the amendments listed.
function settle(ctx: CtxOf<typeof head>, id: string, standing = true): void {
	const open: OpenDecision | undefined = ctx.state.open[id];
	if (open === undefined) throw new RangeError(`decisions: a deadline of the decision ${id}, which is not open`);
	ctx.state.open = Object.fromEntries(Object.entries(ctx.state.open).filter(([key]) => key !== id));
	const winner = standing ? open.amendments.at(-1) : undefined;
	ctx.emit("decision_settled", {
		decision: id,
		kind: open.kind,
		owner: open.owner,
		changed: winner !== undefined && JSON.stringify(winner.proposal) !== JSON.stringify(open.proposal),
		...(winner === undefined ? {} : { by: winner.by, reason: winner.reason }),
		proposal: winner === undefined ? open.proposal : winner.proposal,
		amendments: open.amendments.map((amendment) => ({ by: amendment.by, n: amendment.n })),
	});
}

// The end of the run: every decision still open settles, in the order it was opened. Its deadline job never runs.
function settleAll(ctx: CtxOf<typeof head>): void {
	const ids = Object.keys(ctx.state.open).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
	for (const id of ids) settle(ctx, id, false);
}

/**
 * The `decisions` mechanic: the decision window. Calling it gives the use for a game's `mechanics` list.
 *
 * A holder that is no actor of the run is refused with `SWT-G020` while the kernel is created, before
 * `run_started` (the head's `start` reads `Setup.actors`).
 *
 * @example
 * ```ts
 * decisions({ holders: ["human", "director:warden"] })
 * ```
 *
 * @public
 */
export const decisions = defineMechanic(head, {
	services: {
		decisions: {
			propose: (input, ctx, caller) => {
				const invalid = misfit(input.schema, input.proposal);
				if (invalid !== undefined) throw new RangeError(`${caller}: the proposal of ${input.kind} does not match its schema (${invalid})`);
				// A holder can act when no mechanic has suspended it; that it is an actor of the run was checked at the start.
				const holders = input.window === 0 ? [] : ctx.options.holders.flatMap((holder) => ctx.actors.ids.filter((actor) => actor === holder && ctx.actors.mayAct(actor)));
				if (holders.length === 0) return { committed: true as const };
				const id = `D${String(ctx.state.next)}`;
				const deadline = ctx.tick + input.window;
				const schema = input.schema === undefined ? {} : { schema: Clone(input.schema) };
				ctx.state.next += 1;
				ctx.state.open[id] = { kind: input.kind, owner: caller, proposal: Clone(input.proposal), ...schema, deadline, amendments: [] };
				ctx.emit("decision_proposed", { decision: id, kind: input.kind, owner: caller, proposal: Clone(input.proposal), ...schema, deadline, holders });
				ctx.schedule.at(deadline, "settle", id);
				return { committed: false as const, decision: id };
			},
			open: (_input, ctx) => Object.entries(ctx.state.open).map(([id, open]) => ({ decision: id, kind: open.kind, owner: open.owner, deadline: open.deadline })),
		},
	},
	tools: { amendDecision: { check: (params, ctx) => barred(ctx, params), run: (params, ctx) => amend(ctx, params) } },
	jobs: {
		settle: (ctx, data) => {
			settle(ctx, typeof data === "string" ? data : "");
		},
	},
	hooks: {
		runEnded: (_end, ctx) => {
			settleAll(ctx);
		},
	},
});
