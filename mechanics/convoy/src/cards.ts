// SPDX-License-Identifier: Apache-2.0
/** The tools of the cards, the audit and the accusations: a sealed card of a crew member, the lead's single audit of a game, a loyal seat's suspects, with their replies, and what a fake run samples. */
import type { RandomSource, Refusal, ToolSuccess } from "@swarmtales/contracts";
import { refuse, reply } from "@swarmtales/sdk";
import { holdsAudit, list, normalize, record, refreshLocks } from "./flow.ts";
import type { ConvoyCtx } from "./head.ts";
import type { CardKind } from "./model.ts";
import { phaseProblem } from "./moves.ts";
import { accuseSeat, canDamage, playCard, resolveStage } from "./stage.ts";

type Ctx = ConvoyCtx;

const NO_SEAT = (): Refusal => refuse("NOT_A_SEAT", "You have no seat at this table.");

/**
 * Why `resident` may not play `card` now.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param card - The card.
 * @returns The refusal, or undefined when the card may be played.
 *
 * @public
 */
export function playProblem(ctx: Ctx, resident: string | undefined, card: CardKind): Refusal | undefined {
	const refusal = phaseProblem(ctx, resident, "play", "play");
	if (refusal !== undefined || resident === undefined) return refusal;
	if (card === "damage" && ctx.state.roles[resident] !== "saboteur") return refuse("LOYAL_PLAYS_SAFE", "You are loyal: you can only play safe.");
	if (card === "damage" && !canDamage(ctx, resident)) return refuse("COOLDOWN", `You played damage in stage ${String(ctx.state.lastDamage[resident] ?? 0)}; your next damage card is allowed from stage ${String((ctx.state.lastDamage[resident] ?? 0) + ctx.options.cooldown)}. Play safe.`);
	return undefined;
}

/**
 * The tool `playCrewCard`: a crew member's sealed card; the last one reveals the stage.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param card - The card.
 * @returns The reply, or the refusal.
 *
 * @public
 */
export function playNow(ctx: Ctx, resident: string | undefined, card: CardKind): ToolSuccess | Refusal {
	const refusal = playProblem(ctx, resident, card);
	if (refusal !== undefined || resident === undefined) return refusal ?? NO_SEAT();
	playCard(ctx, resident, card, false);
	ctx.access.lock(resident, "playCrewCard");
	if (ctx.state.owing.length === 0) resolveStage(ctx, ctx.tick);
	return reply(`You played ${card}. Only the number of damage cards is revealed; end your turn now.`);
}

/**
 * Why `resident` may not audit `seat` in `stage` now.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param seat - The seat whose card is asked for.
 * @param stage - The earlier stage.
 * @returns The refusal, or undefined when the audit may be spent.
 *
 * @public
 */
export function auditProblem(ctx: Ctx, resident: string | undefined, seat: string, stage: number): Refusal | undefined {
	const state = ctx.state;
	if (state.finished) return refuse("MATCH_OVER", "The match is over.");
	if (!state.running || (state.phase !== "propose" && state.phase !== "talk")) return refuse("WRONG_PHASE", "The audit is used before a crew goes out, by the lead.");
	if (resident !== state.lead) return refuse("NOT_LEAD", `Only the lead (${state.lead}) may audit.`);
	if (state.auditUsed) return refuse("AUDIT_USED", "The audit of this game is used up.");
	const target = state.stages.find((entry) => entry.stage === stage);
	if (target === undefined) return refuse("NO_SUCH_STAGE", `Stage ${String(stage)} has not been played. Played: ${state.stages.map((entry) => String(entry.stage)).join(", ") || "none"}.`);
	if (!target.crew.includes(normalize(seat))) return refuse("NOT_ON_CREW", `${seat} was not on the crew of stage ${String(stage)} (${list(target.crew)}).`);
	return undefined;
}

/**
 * The tool `audit`: the lead spends the game's single audit; the card is shown to the whole table.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param seat - The seat whose card is revealed.
 * @param stage - The earlier stage.
 * @returns The reply, or the refusal.
 *
 * @public
 */
export function auditNow(ctx: Ctx, resident: string | undefined, seat: string, stage: number): ToolSuccess | Refusal {
	const refusal = auditProblem(ctx, resident, seat, stage);
	if (refusal !== undefined || resident === undefined) return refusal ?? refuse("NOT_LEAD", "Only the lead may audit.");
	const state = ctx.state;
	const id = normalize(seat);
	const target = state.stages.find((entry) => entry.stage === stage);
	const card = state.sealed.find((entry) => entry.stage === stage && entry.seat === id)?.card;
	// Every member of a played crew has a sealed card; the old platform threw here.
	if (target === undefined || card === undefined) return refuse("NOT_ON_CREW", `convoy: no card of ${id} in stage ${String(stage)}`);
	state.auditUsed = true;
	target.audit = { seat: id, card, by: resident };
	ctx.emit("convoy_audited", { game: state.game, stage, seat: id, card, by: resident });
	record(ctx, `${resident} spends the audit: ${id} played ${card} in stage ${String(stage)}.`);
	state.seenLog[resident] = state.log.length;
	refreshLocks(ctx);
	return reply(`Audit: ${id} played ${card} in stage ${String(stage)}. The whole table sees it. ${state.phase === "propose" ? "Now propose your crew." : "End your turn now unless you want to speak."}`);
}

/**
 * The tool `accuse`: a loyal seat names the seats it believes are the saboteurs, sealed.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param seats - The seats it names.
 * @returns The reply, or the refusal.
 *
 * @public
 */
export function accuseNow(ctx: Ctx, resident: string | undefined, seats: readonly string[]): ToolSuccess | Refusal {
	const refusal = phaseProblem(ctx, resident, "accuse", "accuse");
	if (refusal !== undefined || resident === undefined) return refusal ?? NO_SEAT();
	const ids = seats.map(normalize);
	const count = ctx.options.saboteurs;
	if (ids.some((id) => !ctx.state.seats.includes(id) || id === resident)) return refuse("NOT_A_SEAT", `Name other seats: ${list(ctx.state.seats.filter((seat) => seat !== resident))}.`);
	if (new Set(ids).size !== ids.length || ids.length !== count) return refuse("ACCUSE_COUNT", `Name exactly ${String(count)} different seats.`);
	accuseSeat(ctx, resident, ids, false);
	return reply("Noted (sealed). The roles are revealed when every loyal seat has named its suspects; end your turn now.");
}

/**
 * The `sample` of `viewConvoy` for the fake driver (`--fake`): a look at the table before one in four owed moves.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param random - The fake driver's random stream.
 * @returns The empty params, or undefined when the resident owes no move or does not look.
 *
 * @public
 */
export function sampleView(ctx: Ctx, resident: string | undefined, random: RandomSource): Record<string, never> | undefined {
	return resident !== undefined && ctx.state.running && ctx.state.owing.includes(resident) && random.int(1, 4) === 1 ? {} : undefined;
}

/**
 * The `sample` of `playCrewCard` for the fake driver: safe, or damage half of the times a saboteur may play it.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param random - The fake driver's random stream.
 * @returns The card, or undefined when the resident owes no card.
 *
 * @public
 */
export function sampleCard(ctx: Ctx, resident: string | undefined, random: RandomSource): { card: CardKind } | undefined {
	if (resident === undefined || playProblem(ctx, resident, "safe") !== undefined) return undefined;
	return { card: canDamage(ctx, resident) && random.int(1, 2) === 1 ? "damage" : "safe" };
}

/**
 * The `sample` of `audit` for the fake driver: half of the times the lead may audit, a crew member of an earlier stage.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param random - The fake driver's random stream.
 * @returns The seat and the stage, or undefined when the resident may not audit or keeps the audit.
 *
 * @public
 */
export function sampleAudit(ctx: Ctx, resident: string | undefined, random: RandomSource): { seat: string; stage: number } | undefined {
	const state = ctx.state;
	const open = state.running && (state.phase === "propose" || state.phase === "talk");
	if (resident === undefined || !open || !holdsAudit(ctx, resident) || random.int(1, 2) === 1) return undefined;
	const target = random.pick(state.stages);
	return { seat: random.pick(target.crew), stage: target.stage };
}

/**
 * The `sample` of `accuse` for the fake driver: as many other seats as there are saboteurs, at random.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param random - The fake driver's random stream.
 * @returns The seats, or undefined when the resident owes no accusation.
 *
 * @public
 */
export function sampleSuspects(ctx: Ctx, resident: string | undefined, random: RandomSource): { seats: string[] } | undefined {
	if (phaseProblem(ctx, resident, "accuse", "accuse") !== undefined) return undefined;
	return { seats: random.shuffle(ctx.state.seats.filter((seat) => seat !== resident)).slice(0, ctx.options.saboteurs) };
}
