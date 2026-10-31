/**
 * The `petitions` mechanic (carve step 10, team T2, docs/design/carve-team-T2.md): the generic
 * collective lever (SPEC 11). The script opens petitions through `PetitionsApi`, residents sign
 * them with `signPetition` and read them with `listPetitions`. A petition passes as soon as its
 * threshold is reached and fails at its deadline (start of a minute) or when the run ends, so that
 * `petition_resolved` is always written; the script's `onPass`/`onFail` run on that event.
 */
import { Type } from "typebox";
import { Parse } from "typebox/value";
import type { ContextOf, ToolContextOf } from "@swarmtales/contracts";
import { defineMechanic, defineTool, refuse, reply } from "@swarmtales/kernel";
import { ChannelsApi, HOOK_ORDER, PetitionsApi } from "@swarmtales/mechanic-shared";
import { PetitionBook, PetitionRecord, resolveThreshold, type PetitionView, type Resolution } from "./book.ts";
import { petitionsHead } from "./head.ts";

export { petitionsHead };

type Ctx = ContextOf<typeof petitionsHead>;
type ToolCtx = ToolContextOf<typeof petitionsHead>;

/** The name the city signs its board posts with. */
const CITY = "CITY";

function describe(ctx: ToolCtx, petition: PetitionView, self: string): string {
	const lines = [
		`${petition.id} (${petition.status}): ${petition.text}`,
		`  ${ctx.prompt("replies/petition-signatures", { signatures: petition.signatures, threshold: petition.threshold, deadline: petition.deadlineMinute })}`,
	];
	if (petition.visibility === "public") {
		lines.push(`  ${ctx.prompt("replies/petition-signers", { signers: petition.signers.length === 0 ? "-" : petition.signers.join(", ") })}`);
	} else {
		lines.push(`  ${ctx.prompt("replies/petition-secret", {})}`);
	}
	lines.push(`  ${ctx.prompt(petition.signers.includes(self) ? "replies/petition-you-signed" : "replies/petition-you-not-signed", {})}`);
	return lines.join("\n");
}

function resolve(ctx: Ctx, resolution: Resolution): void {
	const { petition, outcome } = resolution;
	ctx.emit("petition_resolved", { petition: petition.id, outcome, signatures: petition.signatures, signers: [...petition.signers] });
	// The line ends with the signers when the signatures are public (the leading space joins the sentences).
	const signers = petition.visibility === "public" && petition.signers.length > 0 ? ` ${ctx.prompt("petitions/signed-by", { signers: petition.signers.join(", ") })}` : "";
	const text = ctx.prompt("petitions/resolved", { id: petition.id, outcome, signatures: petition.signatures, threshold: petition.threshold, signers });
	ctx.call(ChannelsApi, "post", { author: CITY, text });
}

/**
 * The resolution of an expired petition, as a call of the script: a staged call runs together with
 * what its listeners stage, one petition after the other, as the old director did (resolved, post,
 * actions, then the next petition). Stories grant it to `script`.
 */
const ResolvePetition = defineTool("resolvePetition", Type.Object({ petition: Type.String(), outcome: Type.Union([Type.Literal("passed"), Type.Literal("failed")]) }));

/** All petitions are failed at once (as `expire` did); each one is resolved in its own chain. */
function stageResolutions(ctx: Ctx, resolutions: readonly Resolution[]): void {
	for (const { petition, outcome } of resolutions) ctx.stage(ResolvePetition, { petition: petition.id, outcome });
}

const PetitionSlice = Type.Array(PetitionRecord);
const LegacySlice = Type.Object({ petitions: PetitionSlice });

export const petitions = defineMechanic(petitionsHead, (kit) => ({
	services: [
		kit.provide(PetitionsApi, {
			open: (input, ctx) => {
				const threshold = resolveThreshold(input.threshold, ctx.residents.ids.length);
				const petition = ctx.state.open({ id: input.id, text: input.text, threshold, deadlineMinute: input.deadlineMinute, visibility: input.visibility, openedAt: ctx.minute });
				if (petition === undefined) return { ok: false, code: "DUPLICATE_PETITION", detail: input.id };
				ctx.emit("petition_opened", {
					petition: petition.id,
					text: petition.text,
					threshold: petition.threshold,
					deadlineMinute: petition.deadlineMinute,
					visibility: petition.visibility,
					against: [...(input.against ?? [])],
				});
				const visibility = ctx.prompt(petition.visibility === "public" ? "petitions/visibility-public" : "petitions/visibility-secret", {});
				const text = ctx.prompt("petitions/opened", {
					id: petition.id,
					text: petition.text,
					threshold: petition.threshold,
					noun: ctx.prompt(petition.threshold === 1 ? "petitions/noun-one" : "petitions/noun-many", {}),
					deadline: petition.deadlineMinute,
					visibility,
				});
				ctx.call(ChannelsApi, "post", { author: CITY, text });
				return { ok: true };
			},
		}),
	],
	tools: [
		kit.tool({
			...ResolvePetition,
			description: "tools/resolvePetition",
			suggest: ["script"],
			serves: ["script"],
			execute: ({ petition, outcome }, ctx) => {
				const found = ctx.state.get(petition);
				if (found?.status !== outcome) return refuse("UNKNOWN_PETITION", petition);
				resolve(ctx, { petition: found, outcome });
				return reply(outcome);
			},
		}),
		kit.tool({
			name: "signPetition",
			description: "tools/signPetition",
			parameters: Type.Object({ petitionId: Type.String({ description: "Petition ID from listPetitions", minLength: 1, maxLength: 40 }) }),
			suggest: ["resident"],
			execute: ({ petitionId }, ctx) => {
				const self = ctx.resident ?? ctx.actor;
				const signed = ctx.state.sign(petitionId, self, ctx.minute);
				if (!signed.ok) return refuse(signed.code, petitionId);
				const petition = signed.petition;
				ctx.emit("petition_signed", { petition: petitionId, agent: self, signatures: petition.signatures });
				if (signed.passed) resolve(ctx, { petition, outcome: "passed" });
				const current = ctx.state.get(petitionId) ?? petition;
				return reply(ctx.prompt("replies/petition-signed", { petition: describe(ctx, current, self) }));
			},
		}),
		kit.tool({
			name: "listPetitions",
			description: "tools/listPetitions",
			parameters: Type.Object({}),
			suggest: ["resident"],
			execute: (_params, ctx) => {
				const self = ctx.resident ?? ctx.actor;
				const all = ctx.state.all();
				return reply(all.length === 0 ? ctx.prompt("replies/petitions-none", {}) : all.map((petition) => describe(ctx, petition, self)).join("\n"));
			},
		}),
	],
	hooks: {
		// `Director.startMinute` starts with `expirePetitions`, after every mechanic's tick of the minute.
		minuteStarted: {
			order: HOOK_ORDER.minuteStarted.petitions,
			run: (ctx) => {
				stageResolutions(ctx, ctx.state.expire(ctx.minute));
			},
		},
		// `closePetitions` after the acts closed, before the treasuries are settled; the script's `onFail` actions run before `run_ended`.
		runEnded: {
			order: HOOK_ORDER.runEnded.petitions,
			run: (_reason, ctx) => {
				stageResolutions(ctx, ctx.state.expire(ctx.minute, true));
			},
		},
	},
	facts: {
		open: kit.fact(Type.Array(Type.String()), (view) => view.state.all().filter((petition) => petition.status === "open").map((petition) => petition.id)),
		signatures: kit.fact(Type.Record(Type.String(), Type.Integer()), (view) => Object.fromEntries(view.state.all().map((petition) => [petition.id, petition.signatures]))),
	},
	snapshot: kit.snapshot({
		version: 1,
		schema: PetitionSlice,
		save: (state) => state.records(),
		load: (data) => {
			const book = new PetitionBook();
			book.restore(data);
			return book;
		},
		// Version 0 is the old world field `petitions`: the list of petitions, unchanged.
		migrations: { 0: (old) => Parse(LegacySlice, old).petitions },
	}),
}));
