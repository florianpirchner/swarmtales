// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The `petitions` mechanic: the generic collective lever. The story's script opens petitions through the service
 * `petitions`, residents sign them with `signPetition` and read them with `listPetitions`. A petition passes as soon
 * as its threshold is reached and fails at its deadline (the start of a tick) or when the run ends, so that
 * `petition_resolved` is always written. The expiry is a staged call of the actor `script` (`resolvePetition`), one
 * petition after the other, so the script's reactions to one result run before the next result is written.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import type { RandomSource } from "@swarmtales/contracts";
import { defineMechanic, refuse, reply } from "@swarmtales/sdk";
import { expire, openPetition, petitionOf, resolveThreshold, signPetition, type PetitionRecord } from "./book.ts";
import { petitionsHead, ResolvePetition, type PetitionsCtx, type PetitionsToolCtx } from "./head.ts";

export { PetitionsEvents, PetitionsService, Threshold } from "./contract.ts";
export { PetitionRecord, PetitionsSlice, type PetitionsState } from "./book.ts";
export { petitionsHead, ResolvePetition, type PetitionsCtx, type PetitionsToolCtx } from "./head.ts";

/** The name the city signs its board posts with. */
const CITY = "CITY";

// One petition as `listPetitions` and `signPetition` show it to the resident `self`.
function describe(ctx: PetitionsToolCtx, petition: PetitionRecord, self: string): string {
	const lines = [
		`${petition.id} (${petition.status}): ${petition.text}`,
		`  ${ctx.prompt("petitions/replies/petition-signatures", { signatures: petition.signers.length, threshold: petition.threshold, deadline: petition.deadlineMinute })}`,
	];
	if (petition.visibility === "public") {
		lines.push(`  ${ctx.prompt("petitions/replies/petition-signers", { signers: petition.signers.length === 0 ? "-" : petition.signers.join(", ") })}`);
	} else {
		lines.push(`  ${ctx.prompt("petitions/replies/petition-secret", {})}`);
	}
	lines.push(`  ${ctx.prompt(petition.signers.includes(self) ? "petitions/replies/petition-you-signed" : "petitions/replies/petition-you-not-signed", {})}`);
	return lines.join("\n");
}

// Writes `petition_resolved` and the city's post of the result.
function resolve(ctx: PetitionsCtx, petition: PetitionRecord, outcome: "passed" | "failed"): void {
	ctx.emit("petition_resolved", { petition: petition.id, outcome, signatures: petition.signers.length, signers: [...petition.signers] });
	// The line ends with the signers when the signatures are public (the leading space joins the sentences).
	const signers = petition.visibility === "public" && petition.signers.length > 0 ? ` ${ctx.prompt("petitions/signed-by", { signers: petition.signers.join(", ") })}` : "";
	const text = ctx.prompt("petitions/resolved", { id: petition.id, outcome, signatures: petition.signers.length, threshold: petition.threshold, signers });
	ctx.call(ChannelsService, "post", { author: CITY, text });
}

// Every expired petition is failed at once (as the old `expire` did); each one is resolved in its own staged call.
function stageResolutions(ctx: PetitionsCtx, failed: readonly PetitionRecord[]): void {
	for (const petition of failed) ctx.stage(ResolvePetition, { petition: petition.id, outcome: "failed" });
}

// The fake driver looks at the petitions now and then, and signs an open one it has not signed.
function sampleSign(ctx: PetitionsToolCtx, random: RandomSource): { readonly petitionId: string } | undefined {
	const self = ctx.resident;
	const open = ctx.state.petitions.filter((petition) => petition.status === "open" && self !== undefined && !petition.signers.includes(self));
	const petition = open[Math.floor(random.next() * open.length)];
	return petition === undefined ? undefined : { petitionId: petition.id };
}

// The old mechanics ran their tick start before the expiry (old `HOOK_ORDER.minuteStarted`: petitions at 1100, after these).
const BEFORE_EXPIRY = ["motives", "progression", "names", "tribunal", "seal", "standoff", "whispers", "standoff-tribunal", "exile"];

/**
 * Petitions with a threshold and a deadline: the service `petitions` opens one, residents sign and list them, and an
 * expired one is resolved by a staged call of `resolvePetition`, which a game grants to `script`.
 *
 * @example
 * ```ts
 * const game = defineGame({ id: "city", residents: 4, mechanics: [ledger(), channels(), petitions(), script()], end: { ticks: 12 } });
 * ```
 *
 * @public
 */
export const petitions = defineMechanic(petitionsHead, {
	services: {
		petitions: {
			open: (input, ctx) => {
				const threshold = resolveThreshold(input.threshold, ctx.residents.ids.length);
				const petition = openPetition(ctx.state, { id: input.id, text: input.text, threshold, deadlineMinute: input.deadlineMinute, visibility: input.visibility, openedAt: ctx.tick });
				if (petition === undefined) return { ok: false, code: "DUPLICATE_PETITION", detail: input.id };
				const { id, text, deadlineMinute, visibility } = petition;
				ctx.emit("petition_opened", { petition: id, text, threshold, deadlineMinute, visibility, against: [...(input.against ?? [])] });
				const shown = ctx.prompt(visibility === "public" ? "petitions/visibility-public" : "petitions/visibility-secret", {});
				const noun = ctx.prompt(threshold === 1 ? "petitions/noun-one" : "petitions/noun-many", {});
				ctx.call(ChannelsService, "post", { author: CITY, text: ctx.prompt("petitions/opened", { id, text, threshold, noun, deadline: deadlineMinute, visibility: shown }) });
				return { ok: true };
			},
		},
	},
	tools: {
		resolvePetition: {
			run: ({ petition, outcome }, ctx) => {
				const found = petitionOf(ctx.state, petition);
				if (found?.status !== outcome) return refuse("UNKNOWN_PETITION", petition);
				resolve(ctx, found, outcome);
				return reply(outcome);
			},
		},
		signPetition: {
			sample: sampleSign,
			run: ({ petitionId }, ctx) => {
				const self = ctx.resident ?? ctx.actor;
				const signed = signPetition(ctx.state, petitionId, self, ctx.tick);
				if (!signed.ok) return refuse(signed.code, petitionId);
				ctx.emit("petition_signed", { petition: petitionId, agent: self, signatures: signed.petition.signers.length });
				if (signed.passed) resolve(ctx, signed.petition, "passed");
				return reply(ctx.prompt("petitions/replies/petition-signed", { petition: describe(ctx, signed.petition, self) }));
			},
		},
		listPetitions: {
			sample: (ctx, random) => (ctx.resident === undefined || random.next() >= 0.2 ? undefined : {}),
			run: (_params, ctx) => {
				const self = ctx.resident ?? ctx.actor;
				const all = ctx.state.petitions;
				return reply(all.length === 0 ? ctx.prompt("petitions/replies/petitions-none", {}) : all.map((petition) => describe(ctx, petition, self)).join("\n"));
			},
		},
	},
	hooks: {
		// The old `Director.startMinute` began with `expirePetitions`, after the tick start of the mechanics above.
		tickStarted: {
			after: BEFORE_EXPIRY,
			run: (ctx) => {
				stageResolutions(ctx, expire(ctx.state, ctx.tick));
			},
		},
		// The old `closePetitions` ran after the acts closed (`progression`) and before the treasuries were settled (`channels`, erratum J18).
		runEnded: {
			after: ["progression"],
			run: (_end, ctx) => {
				stageResolutions(ctx, expire(ctx.state, ctx.tick, true));
			},
		},
	},
	facts: {
		open: {
			output: Type.Array(Type.String({ description: "A petition id" }), { description: "The ids of the open petitions" }),
			compute: (view) => view.state.petitions.filter((petition) => petition.status === "open").map((petition) => petition.id),
		},
		signatures: {
			output: Type.Record(Type.String(), Type.Integer({ description: "The signatures" }), { description: "The signatures of every petition, by id" }),
			compute: (view) => Object.fromEntries(view.state.petitions.map((petition) => [petition.id, petition.signers.length])),
		},
	},
});
