/**
 * The whisperer's duty notice and the popularity vote's rounds (old `World#sendDuty`,
 * `#dutyReport`, `whisperDutyNow` and `PopularityVote#tick`), over the other mechanics' APIs.
 */
import { ChannelsApi, ExileApi, LedgerApi, MarksApi } from "@swarmtales/mechanic-shared";
import { busiestPair, dutyDue, isForgeable, previousDuty, quotaMet, quotaOf, tallyWhispers, type Quota } from "./duty.ts";
import type { Ctx, DutyNowValue } from "./head.ts";
import { countBallots, dutyTarget, namesList, type Counted } from "./vote.ts";
import { dmReceiptsOf, dmsOf, handoverTest, inCity, labelOf, roundsOf } from "./view.ts";

const CITY = "CITY";

/** Fills the `{placeholders}` of a story text (kernel `renderTemplate`, copied: a mechanic takes only the authoring calls from the kernel). */
export function renderTemplate(template: string, values: Readonly<Partial<Record<string, string>>>): string {
	return template.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/g, (_match: string, name: string) => {
		const value = values[name];
		if (value === undefined) throw new Error(`Unknown placeholder {${name}}`);
		return value;
	});
}

const quotaIn = (ctx: Ctx): Quota | undefined => quotaOf(ctx.options.whisperer, ctx.options.direction);

function counted(ctx: Ctx, count: number, noun: "whispers" | "residents"): string {
	if (noun === "whispers") return count === 1 ? ctx.prompt("duty/whispers-one", {}) : ctx.prompt("duty/whispers-many", { count });
	return count === 1 ? ctx.prompt("duty/residents-one", {}) : ctx.prompt("duty/residents-many", { count });
}

/** `R-0007: DM #12 from A04, minute 5` for each receipt the whisperer may forge, or `none yet`. */
function forgeableList(ctx: Ctx, whisperer: string): string {
	const lines = dmReceiptsOf(ctx, whisperer)
		.filter((receipt) => isForgeable(receipt, whisperer))
		.map((receipt) => ctx.prompt("duty/forgeable-line", { id: receipt.id, number: receipt.number, from: receipt.from, minute: receipt.minute }));
	return lines.length === 0 ? ctx.prompt("duty/forgeable-none-yet", {}) : lines.join("; ");
}

/** Sends the whisperer its duty notice and logs what it sent in `[since, minute)`, with the report on its measured orders after a vote. */
export function sendDuty(ctx: Ctx, text: string, since: number, next: string, ranking: string, result?: Counted & { readonly round: number }): void {
	const agent = ctx.state.whisperer;
	const spec = ctx.options.whisperer;
	if (typeof agent !== "string" || spec === undefined || !inCity(ctx, agent)) return;
	const minute = ctx.minute;
	const dms = dmsOf(ctx);
	const sent = dms.filter((dm) => dm.from === agent && dm.minute >= since && dm.minute < minute).length;
	const forged = ctx.state.forgeries.filter((forgery) => forgery.minute >= since && forgery.minute < minute).length;
	const marks = ctx.call(MarksApi, "left", { resident: agent });
	const forgeable = spec.forgery ? forgeableList(ctx, agent) : ctx.prompt("duty/forgeable-none", {});
	const notice = renderTemplate(text, { minute: String(minute), next, marks: marks === null ? "-" : String(marks.remaining), forgeable, ranking });
	const quota = quotaIn(ctx);
	const tally = quota !== undefined && result !== undefined && result.round > 1 ? tallyWhispers(agent, dms, ctx.state.forgeries, handoverTest(ctx), since, minute) : undefined;
	const target = quota !== undefined && result !== undefined ? dutyTarget(result.counts, agent) : undefined;
	const met = tally === undefined || quota === undefined ? undefined : quotaMet(tally, quota);
	const values = {
		since: String(since),
		whispers: counted(ctx, tally?.whispers ?? 0, "whispers"),
		recipients: counted(ctx, tally?.recipients.length ?? 0, "residents"),
		needWhispers: String(quota?.whispers ?? 0),
		needRecipients: String(quota?.recipients ?? 0),
		target: target === undefined ? "-" : labelOf(ctx, target),
	};
	const lines = quota === undefined ? [] : [...(met === undefined ? [] : [renderTemplate(met ? quota.report.met : quota.report.missed, values)]), ...(target === undefined ? [] : [renderTemplate(quota.report.target, values)])];
	ctx.call(ChannelsApi, "notify", { to: agent, author: CITY, text: lines.length === 0 ? notice : `${notice} ${lines.join(" ")}` });
	ctx.emit("whisper_duty", {
		agent,
		since,
		dms: sent,
		forgeries: forged,
		...(tally === undefined || met === undefined ? {} : { whispers: tally.whispers, recipients: [...tally.recipients], met }),
		...(target === undefined ? {} : { target }),
	});
}

/** The whisperer's measured orders in the running window, from the last vote counted to the next, with the minute so far (old `whisperDutyNow`). */
export function dutyNow(ctx: Ctx): DutyNowValue | null {
	const quota = quotaIn(ctx);
	const agent = ctx.state.whisperer;
	const rounds = roundsOf(ctx);
	if (quota === undefined || typeof agent !== "string" || !inCity(ctx, agent)) return null;
	const last = rounds.filter((round) => round.countsAt <= ctx.minute).at(-1);
	const next = rounds.find((round) => round.countsAt > ctx.minute);
	if (last === undefined || next === undefined) return null;
	const dms = dmsOf(ctx);
	const tally = tallyWhispers(agent, dms, ctx.state.forgeries, handoverTest(ctx), last.countsAt, ctx.minute + 1);
	const pair = busiestPair(agent, dms, last.countsAt, ctx.minute + 1);
	return { agent, since: last.countsAt, nextVote: next.countsAt, whispers: tally.whispers, recipients: [...tally.recipients], needWhispers: quota.whispers, needRecipients: quota.recipients, met: quotaMet(tally, quota), ...(pair === undefined ? {} : { busiest: [pair[0], pair[1]] satisfies [string, string] }) };
}

/** Recomputes the fact `dutyNow` (a fact reads state only; the orders need the DMs of channels). */
export function refreshNow(ctx: Ctx): void {
	ctx.state.now = dutyNow(ctx);
}

/** The minutes the run plays (old `World#minutes`). */
const playedMinutes = (ctx: Ctx): number => ctx.minutes;

function openRound(ctx: Ctx, index: number): void {
	const spec = ctx.options.popularity;
	const round = roundsOf(ctx)[index];
	if (spec === undefined || round === undefined) return;
	ctx.state.phase = "open";
	ctx.state.ballots.clear();
	const text = renderTemplate(spec.texts.announcement, { label: round.label, until: String(round.countsAt), points: String(round.points) });
	ctx.call(ChannelsApi, "post", { author: CITY, text });
	for (const agent of ctx.tryCall(ExileApi, "alive", {}) ?? ctx.residents.ids) ctx.call(ChannelsApi, "notify", { to: agent, author: CITY, text });
	ctx.emit("popularity_opened", { round: index + 1, until: round.countsAt, points: round.points });
}

function closeRound(ctx: Ctx, index: number): void {
	const spec = ctx.options.popularity;
	const round = roundsOf(ctx)[index];
	if (spec === undefined || round === undefined) return;
	const number = index + 1;
	const alive = ctx.tryCall(ExileApi, "alive", {}) ?? ctx.residents.ids;
	const result = countBallots(ctx.state.ballots, alive, (agent) => inCity(ctx, agent));
	const ranking = result.counts.map((entry) => `${labelOf(ctx, entry.agent)} ${String(entry.votes)}`).join(", ");
	ctx.state.ballots.clear();
	ctx.state.round += 1;
	ctx.state.phase = ctx.state.round >= roundsOf(ctx).length ? "closed" : "pending";
	ctx.emit("popularity_result", { round: number, counts: result.counts.map((entry) => ({ ...entry })), winners: [...result.winners], points: result.winners.length === 0 ? 0 : round.points, voters: [...result.voters] });
	if (result.winners.length === 0) {
		ctx.call(ChannelsApi, "post", { author: CITY, text: renderTemplate(spec.texts.noVotes, { label: round.label, counts: ranking }) });
	} else {
		for (const winner of result.winners) if (round.points > 0) ctx.call(LedgerApi, "mint", { account: winner, amount: round.points, reason: "popularity vote" });
		ctx.call(ChannelsApi, "post", { author: CITY, text: renderTemplate(spec.texts.result, { label: round.label, counts: ranking, winners: namesList(result.winners.map((winner) => labelOf(ctx, winner))), points: String(round.points) }) });
	}
	const duty = ctx.options.whisperer?.duty;
	if (duty?.kind !== "afterVote") return;
	const rounds = roundsOf(ctx);
	// What it sent since the count before (the run's start before the first), until the next count (the run's end after the last).
	sendDuty(ctx, duty.text, rounds[number - 2]?.countsAt ?? 0, String(Math.min(rounds[number]?.countsAt ?? playedMinutes(ctx), playedMinutes(ctx))), ranking, { ...result, round: number });
}

/** The vote's work at the start of a minute: count the open round when its minute has come, then open the next (old `PopularityVote#tick`). */
export function tickVote(ctx: Ctx): void {
	for (;;) {
		const round = roundsOf(ctx)[ctx.state.round];
		if (round === undefined) return;
		if (ctx.state.phase === "pending" && ctx.minute >= round.opensAt) openRound(ctx, ctx.state.round);
		else if (ctx.state.phase === "open" && ctx.minute >= round.countsAt) closeRound(ctx, ctx.state.round);
		else return;
	}
}

/** The duty due `every` few minutes at the start of this minute (before the vote is counted, as in the old startMinute). */
export function tickDuty(ctx: Ctx): void {
	const spec = ctx.options.whisperer;
	if (spec?.duty.kind === "every" && dutyDue(spec, ctx.minute)) sendDuty(ctx, spec.duty.text, previousDuty(spec, ctx.minute), String(ctx.minute + spec.duty.everyMinutes), "-");
}
