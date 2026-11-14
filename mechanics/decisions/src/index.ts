// SPDX-License-Identifier: Apache-2.0
/**
 * Mechanic: the decision window. A mechanic proposes a decision through the service `decisions`; the holders may
 * amend it until its deadline; at the deadline a job writes `decision_settled` with the proposal that stands, and
 * the owner commits in a listener to that event. With a window of 0, or when no holder can act, nothing is written
 * and the owner commits at once. A decision whose deadline lies after the last tick of the run stays open.
 *
 * @packageDocumentation
 */
import { Clone, Check, Errors } from "typebox/value";
import type { ActorsView, PromptLookup, ResolvedPlugin } from "@swarmtales/contracts";
import { SwtError } from "@swarmtales/contracts";
import { defineMechanic, optionMismatch, type CtxOf } from "@swarmtales/sdk";
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

// The job of a deadline: closes the decision with the proposal that stands, which is the last amendment's or the original.
function settle(ctx: CtxOf<typeof head>, id: string): void {
	const open: OpenDecision | undefined = ctx.state.open[id];
	if (open === undefined) throw new RangeError(`decisions: a deadline of the decision ${id}, which is not open`);
	ctx.state.open = Object.fromEntries(Object.entries(ctx.state.open).filter(([key]) => key !== id));
	const winner = open.amendments.at(-1);
	ctx.emit("decision_settled", {
		decision: id,
		kind: open.kind,
		owner: open.owner,
		changed: winner !== undefined && JSON.stringify(winner.proposal) !== JSON.stringify(open.proposal),
		...(winner === undefined ? {} : { by: winner.by, reason: winner.reason }),
		proposal: winner === undefined ? open.proposal : winner.proposal,
		amendments: open.amendments.map((amendment) => ({ by: amendment.by, seq: amendment.seq })),
	});
}

// The mechanic over the actors of one run; without them (the definition as data) no holder can act.
const build = (actors?: ActorsView) =>
	defineMechanic(head, {
		services: {
			decisions: {
				propose: (input, ctx, caller) => {
					const invalid = misfit(input.schema, input.proposal);
					if (invalid !== undefined) throw new RangeError(`${caller}: the proposal of ${input.kind} does not match its schema (${invalid})`);
					// A holder can act when it is an actor of the run that no mechanic has suspended.
					const holders = input.window === 0 ? [] : ctx.options.holders.flatMap((holder) => (actors?.ids ?? []).filter((actor) => actor === holder && actors?.mayAct(actor) === true));
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
		jobs: {
			settle: (ctx, data) => {
				settle(ctx, typeof data === "string" ? data : "");
			},
		},
	});

const plain = build();

/**
 * The `decisions` mechanic: the decision window. Calling it gives the use for a game's `mechanics` list.
 *
 * The sdk shows a mechanic the residents only, and a holder need not be a resident, so the definition replaces
 * `resolve` and wraps the plugin's `create`: there it reads the actors of the run, and refuses a holder that is
 * none of them (`SWT-G020`) while the kernel is created, before `run_started`.
 *
 * @example
 * ```ts
 * decisions({ holders: ["human", "director:warden"] })
 * ```
 *
 * @public
 */
export const decisions = Object.assign(build(), {
	resolve(options: Parameters<typeof plain.resolve>[0], texts: PromptLookup, version: string): ResolvedPlugin {
		return {
			...plain.resolve(options, texts, version),
			create(port) {
				const unknown = options.holders.findIndex((holder) => !port.actors.has(holder));
				if (unknown >= 0) throw new SwtError(optionMismatch({ owner: head.id, package: head.package, path: `options.holders[${String(unknown)}]`, message: `names "${options.holders[unknown] ?? ""}", which is no actor of the run` }));
				return build(port.actors).resolve(options, texts, version).create(port);
			},
		};
	},
});
