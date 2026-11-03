/**
 * The tool `blame` (SPEC 7.4): the city's own checks in the old order (UNKNOWN_AGENT, SELF_BLAME,
 * ALREADY_BLAMED, then the DM and the claim), a skipped consult for every blame the checks settle,
 * and the judge's answer through the consult stage for the rest. Copied from
 * packages/engine/src/tools/blame.ts and BlameDesk in blame.ts.
 */
import { Type } from "typebox";
import { JudgeVerdict, type MechanicKit, type ShapeOf } from "@swarmtales/contracts";
import { refuse, reply, skipConsult } from "@swarmtales/kernel";
import { ChannelsApi, ExileApi, LedgerApi, ProgressionApi } from "@swarmtales/mechanic-shared";
import { check, claimPlace, ClaimChannel, judgeSays, recordQuote, type Checked, type Claim, type Delivered, type Facts } from "./blame.ts";
import type { Ctx, ToolCtx, receiptsHead } from "./head.ts";
import { CITY } from "./issue.ts";

type Kit = MechanicKit<ShapeOf<typeof receiptsHead>>;

const Standing = Type.Object({ points: Type.Number(), rank: Type.Integer() });
const Question = Type.Object({
	sender: Type.String(),
	accused: Type.String(),
	dm: Type.Object({ number: Type.Integer(), text: Type.String() }),
	claim: Type.Object({ number: Type.Integer(), channel: ClaimChannel, text: Type.String() }),
	standing: Type.Object({ sender: Standing, accused: Standing, residents: Type.Integer() }),
});
// The judge overseer answers with this very object (the loader checks it).
const Answer = JudgeVerdict;

/** What the city can look up, all through the channels (the old `BlameDeskPorts`). */
function factsOf(ctx: Ctx): Facts {
	return {
		dm: (number) => {
			const record = ctx.call(ChannelsApi, "dmRecord", { number });
			return record === null ? undefined : { from: record.from, to: record.to, text: record.text, deliveredMinute: record.deliveredMinute, deliveredAfter: record.deliveredAfter };
		},
		board: (number) => ctx.call(ChannelsApi, "boardPost", { number }) ?? undefined,
		group: (number) => ctx.call(ChannelsApi, "groupPost", { number }) ?? undefined,
		couldRead: (group, reader, number) => ctx.call(ChannelsApi, "couldRead", { group, reader, number }),
	};
}

/** The old `ranking()`: points, then level, then id, the exiled last (the rank of the progression mechanic; a plain ranking without it). */
function standingOf(ctx: Ctx, agent: string): { readonly points: number; readonly rank: number } {
	const ranking = ctx.tryCall(ProgressionApi, "ranking", {});
	const found = ranking?.find((entry) => entry.agent === agent);
	if (found !== undefined) return { points: found.points, rank: found.rank };
	const balances = ctx.call(LedgerApi, "balances", {});
	const exiled = (id: string): number => (ctx.tryCall(ExileApi, "isExiled", { resident: id }) === true ? 1 : 0);
	const order = [...ctx.residents.ids].sort((a, b) => exiled(a) - exiled(b) || (balances[b] ?? 0) - (balances[a] ?? 0) || a.localeCompare(b));
	return { points: balances[agent] ?? 0, rank: (order.includes(agent) ? order.indexOf(agent) : ctx.residents.ids.length) + 1 };
}

/** The checks before the judge, in the old order: a refusal, or what the city found. */
function open(ctx: ToolCtx, caller: string, accused: string, dm: number, claim: number) {
	if (!ctx.residents.has(accused)) return refuse("UNKNOWN_AGENT", accused);
	if (accused === caller) return refuse("SELF_BLAME", "you cannot blame yourself");
	if (ctx.state.pairs.some((pair) => pair.dm === dm && pair.claim === claim)) return refuse("ALREADY_BLAMED", `DM #${String(dm)} and message #${String(claim)} were blamed already`);
	return check(factsOf(ctx), caller, accused, dm, claim);
}

function isChecked(opened: ReturnType<typeof open>): opened is Checked {
	return "kind" in opened;
}

const tailOf = (ctx: Ctx, agent: string): string => {
	const next = ctx.tryCall(ProgressionApi, "nextBlamePenalty", { resident: agent }) ?? 0;
	return next > 0 ? ` ${ctx.prompt("notices/blame-next", { next })}` : "";
};

/** The loser pays its next price (the progression mechanic counts the lost blame); the burn is booked when there is one. */
function charge(ctx: Ctx, agent: string, reason: string): number {
	const penalty = ctx.tryCall(ProgressionApi, "chargeBlame", { resident: agent }) ?? 0;
	if (penalty > 0) ctx.call(LedgerApi, "burn", { account: agent, amount: penalty, reason });
	return penalty;
}

/** A wrong blame: the accuser pays, the city brands it on the board as a false accuser, with the reason. */
function reject(ctx: ToolCtx, caller: string, accused: string, dm: number, claim: number, reason: string, said: { readonly judge?: string; readonly whisper?: string }) {
	ctx.state.pairs.push({ dm, claim });
	const penalty = charge(ctx, caller, `false blame of ${accused}`);
	const judge = said.judge === undefined ? "" : ctx.prompt("records/blame-judge", { words: said.judge });
	const { postSeq } = ctx.call(ChannelsApi, "post", { author: CITY, text: ctx.prompt("records/blame-false", { caller, accused, dm, claim, reason, penalty, judge }) });
	ctx.call(ChannelsApi, "notify", { to: caller, author: CITY, text: ctx.prompt("notices/blame-wrong", { accused, reason, penalty, tail: tailOf(ctx, caller), post: postSeq }) });
	ctx.emit("blame", { caller, accused, dm, claim, outcome: "rejected", payer: caller, penalty, reason, post: postSeq, ...said });
	const next = ctx.tryCall(ProgressionApi, "nextBlamePenalty", { resident: caller }) ?? 0;
	return reply(ctx.prompt("replies/blame-rejected", { reason, penalty, next, post: postSeq }));
}

function uphold(ctx: ToolCtx, caller: string, accused: string, delivered: Delivered, claim: Claim, said: { readonly judge?: string; readonly whisper?: string }) {
	ctx.state.pairs.push({ dm: delivered.number, claim: claim.number });
	const penalty = charge(ctx, accused, `lied about DM #${String(delivered.number)} from ${caller}`);
	const judge = said.judge === undefined ? "" : ctx.prompt("records/blame-judge", { words: said.judge });
	const record = ctx.prompt("records/blame-liar", {
		accused,
		caller,
		place: claimPlace(claim),
		dm: delivered.number,
		minute: delivered.deliveredMinute,
		dmQuote: recordQuote(delivered.text),
		claimQuote: recordQuote(claim.text),
		penalty,
		judge,
	});
	const { postSeq } = ctx.call(ChannelsApi, "post", { author: CITY, text: record });
	ctx.call(ChannelsApi, "notify", { to: accused, author: CITY, text: ctx.prompt("notices/blame-upheld", { caller, dm: delivered.number, penalty, tail: tailOf(ctx, accused), post: postSeq }) });
	ctx.emit("blame", { caller, accused, dm: delivered.number, claim: claim.number, outcome: "upheld", payer: accused, penalty, post: postSeq, ...said });
	return reply(ctx.prompt("replies/blame-upheld", { accused, penalty, post: postSeq }));
}

export function blameTool(kit: Kit) {
	return kit.tool({
		name: "blame",
		description: "tools/blame",
		parameters: Type.Object({
			dm: Type.Integer({ description: "Number of your DM, e.g. 41 for DM #41", minimum: 1 }),
			accused: Type.String({ description: "Name or ID of the receiver, e.g. A02" }),
			claim: Type.Integer({ description: "Number of their message that denies receiving it, e.g. 57", minimum: 1 }),
		}),
		suggest: ["resident"],
		consult: {
			role: "judge",
			question: Question,
			answer: Answer,
			// The city's own checks settle a blame without the judge: nothing is asked, nothing is logged.
			// A run without a judge answers before any check, so a blame costs nothing there (old blame.ts:20, R2-D3).
			ask: ({ dm, accused, claim }, ctx) => {
				if (!ctx.roles.has("judge")) return refuse("JUDGE_ABSENT", ctx.prompt("replies/judge-absent", {}));
				const self = ctx.resident;
				if (self === undefined) return refuse("UNKNOWN_AGENT");
				const opened = open(ctx, self, accused, dm, claim);
				if (!isChecked(opened)) return skipConsult(opened.code);
				if (opened.kind === "rejected") return skipConsult(opened.reason);
				return {
					sender: self,
					accused,
					dm: { number: dm, text: opened.delivered.text },
					claim: { number: claim, channel: opened.claim.channel, text: opened.claim.text },
					standing: { sender: standingOf(ctx, self), accused: standingOf(ctx, accused), residents: ctx.residents.ids.length },
				};
			},
		},
		execute: ({ dm, accused, claim }, ctx, consulted) => {
			const caller = ctx.resident;
			if (caller === undefined) return refuse("UNKNOWN_AGENT");
			const opened = open(ctx, caller, accused, dm, claim);
			if (!isChecked(opened)) return opened;
			if (opened.kind === "rejected") return reject(ctx, caller, accused, dm, claim, opened.reason, {});
			if (!consulted.ok) return refuse("JUDGE_FAILED", ctx.prompt("replies/judge-failed", {}));
			const said = judgeSays(consulted.answer);
			if (!consulted.answer.deniesReceipt) {
				const reason = `the city's judge finds that ${claimPlace(opened.claim)} by ${accused} does not deny receiving DM #${String(opened.delivered.number)}`;
				return reject(ctx, caller, accused, opened.delivered.number, opened.claim.number, reason, said);
			}
			return uphold(ctx, caller, accused, opened.delivered, opened.claim, said);
		},
	});
}
