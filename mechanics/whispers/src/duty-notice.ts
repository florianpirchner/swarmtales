// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The whisperer's duty notice and the popularity vote's rounds, carried from the old
 * `mechanics/whispers/src/duty-notice.ts` (old `World#sendDuty`, `#dutyReport`, `whisperDutyNow` and
 * `PopularityVote#tick`), over the services of the other mechanics.
 */
import { Type, type Static } from "typebox";
import { SwtError } from "@swarmtales/contracts";
import { AllowanceService } from "@swarmtales/mechanic-contracts";
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { LedgerService } from "@swarmtales/mechanic-ledger/contract";
import { optionMismatch } from "@swarmtales/sdk";
import { busiestPair, dutyDue, isForgeable, previousDuty, quotaMet, quotaOf, tallyWhispers, type Quota, type Tally } from "./duty.ts";
import type { WhispersCtx, WhispersView } from "./head.ts";
import { countBallots, dutyTarget, namesList, type Counted } from "./vote.ts";
import { dmReceiptsOf, dmsOf, handoverTest, inCity, labelOf, roundsOf } from "./view.ts";

const CITY = "CITY";
const Id = Type.String({ description: "A resident id" });

/**
 * The whisperer's measured orders in the running window (old `WhisperDutyStatus`; the fact `dutyNow`).
 *
 * @public
 */
export const DutyNow = Type.Object(
	{
		agent: Id,
		since: Type.Integer({ description: "The tick of the last vote counted" }),
		nextVote: Type.Integer({ description: "The tick of the next count" }),
		whispers: Type.Integer({ description: "The whispers since the last vote" }),
		recipients: Type.Array(Id, { description: "The residents they reached, sorted" }),
		needWhispers: Type.Integer({ description: "The whispers its orders ask for" }),
		needRecipients: Type.Integer({ description: "The different residents its orders ask for" }),
		met: Type.Boolean({ description: "Whether the orders are met" }),
		busiest: Type.Optional(
			Type.Object({ pair: Type.Tuple([Id, Id], { description: "The two residents" }), dms: Type.Integer({ description: "Their direct messages" }) }, { description: "The two residents (not the whisperer) who exchanged the most direct messages" }),
		),
	},
	{ description: "The whisperer's measured orders in the running window" },
);

/**
 * The value of the fact `dutyNow`.
 *
 * @public
 */
export type DutyNowValue = Static<typeof DutyNow>;

/**
 * Fills the `{placeholders}` of a text of the game (old kernel `renderTemplate`).
 *
 * @param template - The text.
 * @param values - The values by name.
 * @returns The text filled in.
 * @throws SwtError `SWT-G020` when the text names a placeholder that has no value.
 *
 * @public
 */
export function renderTemplate(template: string, values: Readonly<Partial<Record<string, string>>>): string {
	return template.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/g, (_match: string, name: string) => {
		const value = values[name];
		if (value === undefined) throw new SwtError(optionMismatch({ owner: "whispers", package: "@swarmtales/mechanic-whispers", path: "options", message: `has a text with the unknown placeholder {${name}}` }));
		return value;
	});
}

const quotaIn = (ctx: WhispersView): Quota | undefined => quotaOf(ctx.options.whisperer, ctx.options.direction);

function counted(ctx: WhispersCtx, count: number, noun: "whispers" | "residents"): string {
	if (noun === "whispers") return count === 1 ? ctx.prompt("whispers/duty/whispers-one", {}) : ctx.prompt("whispers/duty/whispers-many", { count });
	return count === 1 ? ctx.prompt("whispers/duty/residents-one", {}) : ctx.prompt("whispers/duty/residents-many", { count });
}

// `R-0007: DM #12 from A04, minute 5` for each receipt the whisperer may forge, or `none yet`.
function forgeableList(ctx: WhispersCtx, whisperer: string): string {
	const lines = dmReceiptsOf(ctx, whisperer)
		.filter((receipt) => isForgeable(receipt, whisperer))
		.map((receipt) => ctx.prompt("whispers/duty/forgeable-line", { id: receipt.id, number: receipt.number, from: receipt.from, minute: receipt.minute }));
	return lines.length === 0 ? ctx.prompt("whispers/duty/forgeable-none-yet", {}) : lines.join("; ");
}

// The texts of the report: the tally's words, the orders and the target's label.
function reportValues(ctx: WhispersCtx, since: number, quota: Quota, tally: Tally | undefined, target: string | undefined): Readonly<Record<string, string>> {
	return {
		since: String(since),
		whispers: counted(ctx, tally?.whispers ?? 0, "whispers"),
		recipients: counted(ctx, tally?.recipients.length ?? 0, "residents"),
		needWhispers: String(quota.whispers),
		needRecipients: String(quota.recipients),
		target: target === undefined ? "-" : labelOf(ctx, target),
	};
}

// The event's fields of a measured window.
const measured = (tally: Tally | undefined, met: boolean | undefined) => (tally === undefined || met === undefined ? {} : { whispers: tally.whispers, recipients: [...tally.recipients], met });

// The report on the measured orders after a vote, and the event's fields of it.
function report(ctx: WhispersCtx, agent: string, since: number, result: (Counted & { readonly round: number }) | undefined) {
	const quota = quotaIn(ctx);
	if (quota === undefined || result === undefined) return { lines: [], fields: {} };
	const tally = result.round > 1 ? tallyWhispers(agent, dmsOf(ctx), ctx.state.forgeries, handoverTest(ctx), since, ctx.tick) : undefined;
	const target = dutyTarget(result.counts, agent);
	const met = tally === undefined ? undefined : quotaMet(tally, quota);
	const values = reportValues(ctx, since, quota, tally, target);
	const lines = [...(met === undefined ? [] : [renderTemplate(met ? quota.report.met : quota.report.missed, values)]), ...(target === undefined ? [] : [renderTemplate(quota.report.target, values)])];
	return { lines, fields: { ...measured(tally, met), ...(target === undefined ? {} : { target }) } };
}

/**
 * Sends the whisperer its duty notice and logs what it sent in `[since, tick)`, with the report on its measured
 * orders after a vote.
 *
 * @param ctx - The context.
 * @param text - The notice of the game.
 * @param since - The first tick of the window.
 * @param next - The tick named as the next.
 * @param ranking - The count of the vote in words, `-` without one.
 * @param result - The count of the vote and its round, after a vote.
 *
 * @public
 */
export function sendDuty(ctx: WhispersCtx, text: string, since: number, next: string, ranking: string, result?: Counted & { readonly round: number }): void {
	const agent = ctx.state.whisperer;
	const spec = ctx.options.whisperer;
	if (agent === null || spec === undefined || !inCity(ctx, agent)) return;
	const dms = dmsOf(ctx).filter((dm) => dm.from === agent && dm.minute >= since && dm.minute < ctx.tick).length;
	const forgeries = ctx.state.forgeries.filter((forgery) => forgery.minute >= since && forgery.minute < ctx.tick).length;
	const marks = ctx.tryCall(AllowanceService, "left", { resident: agent }) ?? null;
	const forgeable = spec.forgery ? forgeableList(ctx, agent) : ctx.prompt("whispers/duty/forgeable-none", {});
	const notice = renderTemplate(text, { minute: String(ctx.tick), next, marks: marks === null ? "-" : String(marks.remaining), forgeable, ranking });
	const { lines, fields } = report(ctx, agent, since, result);
	ctx.call(ChannelsService, "notify", { to: agent, author: CITY, text: lines.length === 0 ? notice : `${notice} ${lines.join(" ")}` });
	ctx.emit("whisper_duty", { agent, since, dms, forgeries, ...fields });
}

/**
 * The whisperer's measured orders in the running window, from the last vote counted to the next, with the tick so
 * far (old `whisperDutyNow`).
 *
 * @param ctx - The view.
 * @returns The orders, or null without a quota, a whisperer in the city or a window.
 *
 * @public
 */
export function dutyNow(ctx: WhispersView): DutyNowValue | null {
	const quota = quotaIn(ctx);
	const agent = ctx.state.whisperer;
	const rounds = roundsOf(ctx);
	if (quota === undefined || agent === null || !inCity(ctx, agent)) return null;
	const last = rounds.filter((round) => round.countsAt <= ctx.tick).at(-1);
	const next = rounds.find((round) => round.countsAt > ctx.tick);
	if (last === undefined || next === undefined) return null;
	const dms = dmsOf(ctx);
	const tally = tallyWhispers(agent, dms, ctx.state.forgeries, handoverTest(ctx), last.countsAt, ctx.tick + 1);
	const pair = busiestPair(agent, dms, last.countsAt, ctx.tick + 1);
	const now = { agent, since: last.countsAt, nextVote: next.countsAt, whispers: tally.whispers, recipients: [...tally.recipients], needWhispers: quota.whispers, needRecipients: quota.recipients, met: quotaMet(tally, quota) };
	return pair === undefined ? now : { ...now, busiest: { pair: [pair.pair[0], pair.pair[1]], dms: pair.dms } };
}

const aliveOf = (ctx: WhispersCtx): readonly string[] => ctx.tryCall(ExileService, "alive", {}) ?? ctx.residents.ids;

function openRound(ctx: WhispersCtx, index: number): void {
	const spec = ctx.options.popularity;
	const round = roundsOf(ctx)[index];
	if (spec === undefined || round === undefined) return;
	ctx.state.phase = "open";
	ctx.state.ballots.clear();
	const text = renderTemplate(spec.texts.announcement, { label: round.label, until: String(round.countsAt), points: String(round.points) });
	ctx.call(ChannelsService, "post", { author: CITY, text });
	for (const agent of aliveOf(ctx)) ctx.call(ChannelsService, "notify", { to: agent, author: CITY, text });
	ctx.emit("popularity_opened", { round: index + 1, until: round.countsAt, points: round.points });
}

// The board post of a count: the ranking, and the winners with their points.
function postResult(ctx: WhispersCtx, label: string, points: number, result: Counted, ranking: string): void {
	const texts = ctx.options.popularity?.texts;
	if (texts === undefined) return;
	if (result.winners.length === 0) {
		ctx.call(ChannelsService, "post", { author: CITY, text: renderTemplate(texts.noVotes, { label, counts: ranking }) });
		return;
	}
	for (const winner of result.winners) if (points > 0) ctx.call(LedgerService, "mint", { account: winner, amount: points, reason: "popularity vote" });
	ctx.call(ChannelsService, "post", { author: CITY, text: renderTemplate(texts.result, { label, counts: ranking, winners: namesList(result.winners.map((winner) => labelOf(ctx, winner))), points: String(points) }) });
}

// The duty notice after the count of round `number`: what it sent since the count before (the run's start before the
// first), until the next count (the run's end after the last).
function dutyAfterVote(ctx: WhispersCtx, number: number, ranking: string, result: Counted): void {
	const duty = ctx.options.whisperer?.duty;
	if (duty?.kind !== "afterVote") return;
	const rounds = roundsOf(ctx);
	sendDuty(ctx, duty.text, rounds[number - 2]?.countsAt ?? 0, String(Math.min(rounds[number]?.countsAt ?? ctx.ticks, ctx.ticks)), ranking, { ...result, round: number });
}

function closeRound(ctx: WhispersCtx, index: number): void {
	const rounds = roundsOf(ctx);
	const round = rounds[index];
	if (round === undefined) return;
	const number = index + 1;
	const result = countBallots(ctx.state.ballots, aliveOf(ctx), (agent) => inCity(ctx, agent));
	const ranking = result.counts.map((entry) => `${labelOf(ctx, entry.agent)} ${String(entry.votes)}`).join(", ");
	ctx.state.ballots.clear();
	ctx.state.round += 1;
	ctx.state.phase = ctx.state.round >= rounds.length ? "closed" : "pending";
	ctx.emit("popularity_result", { round: number, counts: result.counts.map((entry) => ({ ...entry })), winners: [...result.winners], points: result.winners.length === 0 ? 0 : round.points, voters: [...result.voters] });
	postResult(ctx, round.label, round.points, result, ranking);
	dutyAfterVote(ctx, number, ranking, result);
}

/**
 * The vote's work at the start of a tick: count the open round when its tick has come, then open the next (old
 * `PopularityVote#tick`).
 *
 * @param ctx - The context.
 *
 * @public
 */
export function tickVote(ctx: WhispersCtx): void {
	for (;;) {
		const round = roundsOf(ctx)[ctx.state.round];
		if (round === undefined) return;
		if (ctx.state.phase === "pending" && ctx.tick >= round.opensAt) openRound(ctx, ctx.state.round);
		else if (ctx.state.phase === "open" && ctx.tick >= round.countsAt) closeRound(ctx, ctx.state.round);
		else return;
	}
}

/**
 * The duty due `every` few ticks at the start of this tick, before the vote is counted (as the old `startMinute`).
 *
 * @param ctx - The context.
 *
 * @public
 */
export function tickDuty(ctx: WhispersCtx): void {
	const spec = ctx.options.whisperer;
	if (spec?.duty.kind === "every" && dutyDue(spec, ctx.tick)) sendDuty(ctx, spec.duty.text, previousDuty(spec, ctx.tick), String(ctx.tick + spec.duty.everyMinutes), "-");
}
