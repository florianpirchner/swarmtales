// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The progression tools (carried from the old `mechanics/progression/src/tools.ts`): `getStatus`, `activeTools`,
 * `getProblem`, `submitSolution` and `listAgents`. The reply texts and refusal codes are the old ones; every reply
 * and refusal detail is shown with the residents' names when a provider of `identity` is loaded.
 */
import type { RandomSource, Refusal, ToolOutcome } from "@swarmtales/contracts";
import { AllowanceService, ReceiptSourceService } from "@swarmtales/mechanic-contracts";
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { LedgerService } from "@swarmtales/mechanic-ledger/contract";
import { refuse, reply } from "@swarmtales/sdk";
import { CastExtrasService, LevelPiecesService } from "./contract.ts";
import type { ProgressionToolCtx } from "./head.ts";
import { standingOf, isFinished, isOpenOnClock, opensAt, rankOf } from "./levels.ts";
import { submit, type SubmitOutcome } from "./submit.ts";
import { problemFor, shown } from "./task.ts";

/**
 * The old order of the tool names (`TOOL_NAMES` of the old `packages/contracts/src/tool-names.ts`), in which `activeTools` and `getStatus` list the open tools.
 *
 * @public
 */
export const TOOL_ORDER = [
	"getStatus", "getProblem", "submitSolution", "listAgents", "readBoard", "postBoard", "sendDM", "transferPoints", "createGroup", "addGroupMember", "removeGroupMember", "leaveGroup",
	"listMyGroups", "postGroup", "readGroup", "depositGroup", "withdrawGroup", "setTreasurer", "showReceipt", "signPetition", "listPetitions", "blame", "vote", "payRansom", "lastWill",
	"nominate", "join", "refuse", "chooseName", "bid", "permaDeath", "defy", "claimPiece", "forgeReceipt", "nameFavourite", "tribunalVote", "activeTools",
] as const;

const SAMPLE_RATE = 0.125;

function residentOf(ctx: ProgressionToolCtx): string {
	if (ctx.resident === undefined) throw new RangeError("progression: a resident tool was called without a resident");
	return ctx.resident;
}

function ok(ctx: ProgressionToolCtx, text: string): ToolOutcome {
	return reply(shown(ctx, text));
}

function refused(ctx: ProgressionToolCtx, code: string, detail?: string): Refusal {
	return detail === undefined ? refuse(code) : refuse(code, shown(ctx, detail));
}

/**
 * The tools open to the resident now, in the old order.
 * @param ctx - The context of the progression.
 * @param resident - The resident.
 * @returns The tool names.
 */
function openTools(ctx: ProgressionToolCtx, resident: string): readonly string[] {
	return TOOL_ORDER.filter((tool) => ctx.access.isOpen(resident, tool));
}

function levelNote(ctx: ProgressionToolCtx, self: string): string {
	const entry = standingOf(ctx, self);
	const finished = isFinished(ctx, self);
	const all = finished ? ` ${ctx.prompt("progression/replies/status-all-solved", {})}` : "";
	const passed = entry.held ? ` ${ctx.prompt("progression/replies/status-passed", { level: entry.level })}` : "";
	const door = finished || isOpenOnClock(ctx, entry.level) ? "" : ` ${ctx.prompt("progression/replies/status-door", { level: entry.level, minute: opensAt(ctx, entry.level) })}`;
	return `${all}${passed}${door}`;
}

function statusReply(ctx: ProgressionToolCtx, self: string): string {
	const entry = standingOf(ctx, self);
	const lines = [
		`you: ${self}`,
		`minute: ${String(ctx.tick)}`,
		`level: ${String(entry.level)}${levelNote(ctx, self)}`,
		`points: ${String(ctx.call(LedgerService, "balance", { account: self }))}`,
		`rank: ${String(rankOf(ctx, self))} of ${String(ctx.residents.ids.length)}`,
		`survivors at the end: ${String(ctx.options.survivors)}`,
		`unread DMs: ${String(ctx.call(ChannelsService, "pendingDms", { resident: self }))}`,
		`solved levels: ${entry.solved.length === 0 ? "-" : [...entry.solved].sort((a, b) => a - b).join(", ")}`,
		`unlocked tools: ${openTools(ctx, self).join(", ")}`,
	];
	const marks = ctx.tryCall(AllowanceService, "left", { resident: self });
	if (marks !== undefined && marks !== null) lines.push(`marks: ${String(marks.remaining)} of ${String(marks.budget)}`);
	const window = ctx.call(ChannelsService, "dmWindow", { resident: self });
	if (window !== null) lines.push(ctx.prompt("progression/replies/status-dm-window", { sent: window.sent, limit: window.limit, from: window.from, until: window.until }));
	const receipts = ctx.tryCall(ReceiptSourceService, "textsOf", { resident: self }) ?? [];
	lines.push(receipts.length === 0 ? "receipts: -" : `receipts:\n${receipts.map((text) => `  ${text}`).join("\n")}`);
	return lines.join("\n");
}

function submitReply(ctx: ProgressionToolCtx, level: number, outcome: SubmitOutcome): ToolOutcome {
	switch (outcome.status) {
		case "correct":
			return ok(
				ctx,
				outcome.held === true
					? ctx.prompt("progression/replies/submit-correct-held", { reward: outcome.reward, receipt: outcome.receipt, level })
					: ctx.prompt("progression/replies/submit-correct", { reward: outcome.reward, nextLevel: outcome.nextLevel, receipt: outcome.receipt }),
			);
		case "incorrect":
			return refused(ctx, "INCORRECT", ctx.prompt("progression/replies/submit-incorrect", { penalty: outcome.penalty, nextPenalty: outcome.nextPenalty, attempts: outcome.attemptsRemaining }));
		case "wrong_level":
			return refused(ctx, "WRONG_LEVEL", ctx.prompt("progression/replies/submit-wrong-level", { level: outcome.currentLevel }));
		case "already_solved":
			return refused(ctx, "ALREADY_SOLVED");
		case "invalid_format":
			return refused(ctx, "INVALID_FORMAT", ctx.prompt("progression/replies/submit-invalid-format", { length: outcome.expectedLength, kind: outcome.digitsOnly ? "digits" : "characters" }));
		case "rate_limited":
			return refused(ctx, "RATE_LIMITED", ctx.prompt("progression/replies/submit-rate-limited", {}));
		case "door_closed":
			return refused(ctx, "DOOR_CLOSED", ctx.prompt("progression/replies/submit-door-closed", { level, minute: outcome.opensAt }));
	}
}

/**
 * A look the fake driver may take now and then: about one activation in eight.
 *
 * @param ctx - The context of the progression.
 * @param random - The random source of the fake driver.
 * @returns The empty arguments, or undefined.
 */
function sampleLook(ctx: ProgressionToolCtx, random: RandomSource): Record<string, never> | undefined {
	return ctx.resident === undefined || random.next() >= SAMPLE_RATE ? undefined : {};
}

/**
 * The fake driver submits the code of its open level about one activation in four, so a fake run climbs the levels.
 *
 * @param ctx - The context of the progression.
 * @param random - The random source of the fake driver.
 * @returns The arguments, or undefined.
 */
function sampleSubmit(ctx: ProgressionToolCtx, random: RandomSource): { level: number; code: string } | undefined {
	const self = ctx.resident;
	if (self === undefined || isFinished(ctx, self) || random.next() >= 2 * SAMPLE_RATE) return undefined;
	const { level, held } = standingOf(ctx, self);
	const code = held || !isOpenOnClock(ctx, level) ? null : ctx.call(LevelPiecesService, "solutionOf", { resident: self, level });
	return code === null ? undefined : { level, code };
}

/**
 * The handlers of the five tools.
 *
 * @public
 */
export const progressionTools = {
	getStatus: { sample: sampleLook, run: (_params: unknown, ctx: ProgressionToolCtx) => ok(ctx, statusReply(ctx, residentOf(ctx))) },
	activeTools: { sample: sampleLook, run: (_params: unknown, ctx: ProgressionToolCtx) => ok(ctx, ctx.prompt("progression/replies/active-tools", { tools: openTools(ctx, residentOf(ctx)).join(", ") })) },
	getProblem: {
		sample: (ctx: ProgressionToolCtx, random: RandomSource) => (sampleLook(ctx, random) === undefined || ctx.resident === undefined ? undefined : { level: standingOf(ctx, ctx.resident).level }),
		run: ({ level }: { readonly level: number }, ctx: ProgressionToolCtx): ToolOutcome => {
			const self = residentOf(ctx);
			const problem = problemFor(ctx, self, level);
			if (!problem.ok) return problem.error === "UNKNOWN_LEVEL" && isFinished(ctx, self) ? ok(ctx, ctx.prompt("progression/replies/problem-finished", {})) : refused(ctx, problem.error);
			return ok(ctx, problem.value.solved ? `${problem.value.text}\n${ctx.prompt("progression/replies/problem-solved", {})}` : problem.value.text);
		},
	},
	submitSolution: { sample: sampleSubmit, run: ({ level, code }: { readonly level: number; readonly code: string }, ctx: ProgressionToolCtx) => submitReply(ctx, level, submit(ctx, residentOf(ctx), level, code)) },
	listAgents: {
		sample: sampleLook,
		run: (_params: unknown, ctx: ProgressionToolCtx) => {
			const self = residentOf(ctx);
			const listed = [...ctx.residents.ids.map((id) => ({ id, level: standingOf(ctx, id).level })), ...(ctx.tryCall(CastExtrasService, "active", {}) ?? [])];
			return ok(ctx, listed.map((entry) => `${entry.id}: level ${String(entry.level)}${entry.id === self ? " (you)" : ""}`).join("\n"));
		},
	},
};
