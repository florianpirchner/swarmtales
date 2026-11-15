// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The tool `blame`, carried from the old `mechanics/receipts/src/blame-tool.ts`: the city's own checks in the old
 * order (UNKNOWN_AGENT, SELF_BLAME, ALREADY_BLAMED, then the DM and the claim), a skipped review for every blame the
 * checks settle, and the judge's answer through the tool's own review for the rest (`12-m5-spec.md` 4.3). A run
 * without a judge answers `JUDGE_ABSENT` before any check (stage `consult`), so a blame costs nothing there; a judge
 * that fails or answers out of shape gives `JUDGE_FAILED` at `execute`, and the pair stays free. The loser's price
 * is counted by `progression` (`chargeBlame`) and burnt in the ledger.
 */
import { Value } from "typebox/value";
import type { Refusal, ReviewAnswer, ToolOutcome } from "@swarmtales/contracts";
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { LedgerService } from "@swarmtales/mechanic-ledger/contract";
import { ProgressionService } from "@swarmtales/mechanic-progression/contract";
import { refuse, reply, type MechanicReview } from "@swarmtales/sdk";
import { check, claimPlace, judgeSays, recordQuote, type Checked, type Claim, type Delivered, type Facts } from "./blame.ts";
import { JudgeVerdict } from "./contract.ts";
import type { ReceiptsCtx, ReceiptsToolCtx } from "./head.ts";
import { CITY } from "./issue.ts";
import { resolved, shownOutcome } from "./show.ts";

/**
 * The arguments of `blame`.
 *
 * @public
 */
export interface BlameParams {
	/** The caller's DM. */
	readonly dm: number;
	/** The accused. */
	readonly accused: string;
	/** The accused's message. */
	readonly claim: number;
}

// The judge's words as the event and the record keep them.
interface Said {
	readonly judge?: string;
	readonly whisper?: string;
}

// What the city can look up, all through the channels (the old `BlameDeskPorts`).
function factsOf(ctx: ReceiptsCtx): Facts {
	return {
		dm: (number) => {
			const record = ctx.call(ChannelsService, "dmRecords", {}).find((entry) => entry.number === number);
			return record === undefined ? undefined : { from: record.from, to: record.to, text: record.text, deliveredMinute: record.deliveredTick, deliveredAfter: record.deliveredAfter };
		},
		board: (number) => ctx.call(ChannelsService, "boardPost", { number }) ?? undefined,
		group: (number) => ctx.call(ChannelsService, "groupPost", { number }) ?? undefined,
		couldRead: (group, reader, number) => ctx.call(ChannelsService, "couldRead", { group, reader, number }),
	};
}

// The old `ranking()`: the rank of the progression; a plain ranking without it (points, then id, the exiled last).
function standingOf(ctx: ReceiptsCtx, agent: string): { readonly points: number; readonly rank: number } {
	const found = ctx.tryCall(ProgressionService, "ranking", {})?.find((entry) => entry.agent === agent);
	if (found !== undefined) return { points: found.points, rank: found.rank };
	const balances = ctx.call(LedgerService, "balances", {});
	const exiled = (id: string): number => (ctx.tryCall(ExileService, "isExiled", { resident: id }) === true ? 1 : 0);
	const order = [...ctx.residents.ids].sort((a, b) => exiled(a) - exiled(b) || (balances[b] ?? 0) - (balances[a] ?? 0) || a.localeCompare(b));
	return { points: balances[agent] ?? 0, rank: (order.includes(agent) ? order.indexOf(agent) : ctx.residents.ids.length) + 1 };
}

// The checks before the judge, in the old order: a refusal, or what the city found.
function open(ctx: ReceiptsToolCtx, caller: string, { dm, accused, claim }: BlameParams): Checked | Refusal {
	if (!ctx.residents.has(accused)) return refuse("UNKNOWN_AGENT", accused);
	if (accused === caller) return refuse("SELF_BLAME", "you cannot blame yourself");
	if (ctx.state.pairs.some((pair) => pair.dm === dm && pair.claim === claim)) return refuse("ALREADY_BLAMED", `DM #${String(dm)} and message #${String(claim)} were blamed already`);
	return check(factsOf(ctx), caller, accused, dm, claim);
}

const tailOf = (ctx: ReceiptsCtx, agent: string): string => {
	const next = ctx.tryCall(ProgressionService, "nextBlamePenalty", { resident: agent }) ?? 0;
	return next > 0 ? ` ${ctx.prompt("receipts/notices/blame-next", { next })}` : "";
};

// The loser pays its next price (the progression counts the lost blame); the burn is booked when there is one.
function charge(ctx: ReceiptsCtx, agent: string, reason: string): number {
	const penalty = ctx.tryCall(ProgressionService, "chargeBlame", { resident: agent }) ?? 0;
	if (penalty > 0) ctx.call(LedgerService, "burn", { account: agent, amount: penalty, reason });
	return penalty;
}

const judgeLine = (ctx: ReceiptsCtx, said: Said): string => (said.judge === undefined ? "" : ctx.prompt("receipts/records/blame-judge", { words: said.judge }));

// A wrong blame: the accuser pays, the city brands it on the board as a false accuser, with the reason.
function reject(ctx: ReceiptsToolCtx, caller: string, { dm, accused, claim }: BlameParams, reason: string, said: Said): ToolOutcome {
	ctx.state.pairs.push({ dm, claim });
	const penalty = charge(ctx, caller, `false blame of ${accused}`);
	const { postSeq } = ctx.call(ChannelsService, "post", { author: CITY, text: ctx.prompt("receipts/records/blame-false", { caller, accused, dm, claim, reason, penalty, judge: judgeLine(ctx, said) }) });
	ctx.call(ChannelsService, "notify", { to: caller, author: CITY, text: ctx.prompt("receipts/notices/blame-wrong", { accused, reason, penalty, tail: tailOf(ctx, caller), post: postSeq }) });
	ctx.emit("blame", { caller, accused, dm, claim, outcome: "rejected", payer: caller, penalty, reason, post: postSeq, ...said });
	const next = ctx.tryCall(ProgressionService, "nextBlamePenalty", { resident: caller }) ?? 0;
	return reply(ctx.prompt("receipts/replies/blame-rejected", { reason, penalty, next, post: postSeq }));
}

// An upheld blame: the liar pays, the city brands it on the board with both quotes.
function uphold(ctx: ReceiptsToolCtx, caller: string, accused: string, delivered: Delivered, claim: Claim, said: Said): ToolOutcome {
	ctx.state.pairs.push({ dm: delivered.number, claim: claim.number });
	const penalty = charge(ctx, accused, `lied about DM #${String(delivered.number)} from ${caller}`);
	const place = claimPlace(claim);
	const record = ctx.prompt("receipts/records/blame-liar", { accused, caller, place, dm: delivered.number, minute: delivered.deliveredMinute, dmQuote: recordQuote(delivered.text), claimQuote: recordQuote(claim.text), penalty, judge: judgeLine(ctx, said) });
	const { postSeq } = ctx.call(ChannelsService, "post", { author: CITY, text: record });
	ctx.call(ChannelsService, "notify", { to: accused, author: CITY, text: ctx.prompt("receipts/notices/blame-upheld", { caller, dm: delivered.number, penalty, tail: tailOf(ctx, accused), post: postSeq }) });
	ctx.emit("blame", { caller, accused, dm: delivered.number, claim: claim.number, outcome: "upheld", payer: accused, penalty, post: postSeq, ...said });
	return reply(ctx.prompt("receipts/replies/blame-upheld", { accused, penalty, post: postSeq }));
}

// The accused as an id: a resident may name it (old `names`).
const withId = (ctx: ReceiptsToolCtx, params: BlameParams): BlameParams => ({ ...params, accused: resolved(ctx, params.accused) ?? params.accused });

/**
 * The tool's own review: `JUDGE_ABSENT` before any check without a judge; a skip for every blame the city's checks
 * settle (nothing is asked, nothing is recorded); else the question of both messages and where both stand.
 *
 * @public
 */
export const blameReview: MechanicReview<BlameParams, ReceiptsToolCtx> = {
	answerer: "judge",
	ask: (written, ctx, answerable) => {
		if (!answerable) return refuse("JUDGE_ABSENT", ctx.prompt("receipts/replies/judge-absent", {}));
		const self = ctx.resident;
		if (self === undefined) return refuse("UNKNOWN_AGENT");
		const params = withId(ctx, written);
		const opened = open(ctx, self, params);
		if (!("kind" in opened) || opened.kind === "rejected") return undefined;
		const { claim, delivered } = opened;
		const standing = { sender: standingOf(ctx, self), accused: standingOf(ctx, params.accused), residents: ctx.residents.ids.length };
		return { question: { sender: self, accused: params.accused, dm: { number: params.dm, text: delivered.text }, claim: { number: params.claim, channel: claim.channel, text: claim.text }, standing } };
	},
};

/**
 * Runs `blame`: the checks again, then the city's verdict; a pair the judge settled is taken once. The caller may
 * name the accused and reads names, with a provider of `identity`.
 *
 * @param params - The arguments.
 * @param ctx - The context of the tool call.
 * @param answer - The judge's answer; left out when nothing was asked.
 * @returns The reply, or the refusal.
 *
 * @public
 */
export function runBlame(params: BlameParams, ctx: ReceiptsToolCtx, answer?: ReviewAnswer): ToolOutcome {
	return shownOutcome(ctx, settle(withId(ctx, params), ctx, answer));
}

// The checks again, then the city's verdict, in ids.
function settle(params: BlameParams, ctx: ReceiptsToolCtx, answer: ReviewAnswer | undefined): ToolOutcome {
	const caller = ctx.resident;
	if (caller === undefined) return refuse("UNKNOWN_AGENT");
	const opened = open(ctx, caller, params);
	if (!("kind" in opened)) return opened;
	if (opened.kind === "rejected") return reject(ctx, caller, params, opened.reason, {});
	if (answer?.ok !== true || !Value.Check(JudgeVerdict, answer.answer)) return refuse("JUDGE_FAILED", ctx.prompt("receipts/replies/judge-failed", {}));
	const verdict = Value.Parse(JudgeVerdict, answer.answer);
	const said = judgeSays(verdict);
	if (!verdict.deniesReceipt) {
		const reason = `the city's judge finds that ${claimPlace(opened.claim)} by ${params.accused} does not deny receiving DM #${String(opened.delivered.number)}`;
		return reject(ctx, caller, { ...params, dm: opened.delivered.number, claim: opened.claim.number }, reason, said);
	}
	return uphold(ctx, caller, params.accused, opened.delivered, opened.claim, said);
}
