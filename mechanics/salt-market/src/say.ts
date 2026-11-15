// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The tool `say`: a short message to everyone or to one trader, a few per round; it moves nothing. */
import type { Refusal, ToolSuccess } from "@swarmtales/contracts";
import { refuse, reply } from "@swarmtales/sdk";
import type { SaltMarketCtx } from "./head.ts";
import { ALL, others, seatOf, statsOf, tell, traderOf } from "./market.ts";

/**
 * The addressee of a message: everyone when none or `all` is named.
 *
 * @param ctx - The context of the mechanic.
 * @param toId - The addressee as the caller wrote it, or undefined.
 * @returns `all`, a trader, or undefined when the name is no trader.
 *
 * @public
 */
export const sayTo = (ctx: SaltMarketCtx, toId: string | undefined): string | undefined => (toId === undefined || toId.trim() === "" || toId.trim().toLowerCase() === ALL ? ALL : seatOf(ctx.state, toId));

/**
 * The tool `say`.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param text - The message.
 * @param toId - One trader for a private message; undefined or `all` for everyone.
 * @returns The reply, or the refusal.
 *
 * @public
 */
export function sayNow(ctx: SaltMarketCtx, resident: string | undefined, text: string, toId: string | undefined): ToolSuccess | Refusal {
	const seat = traderOf(ctx, resident);
	if (typeof seat !== "string") return seat;
	const state = ctx.state;
	const to = sayTo(ctx, toId);
	if (to === undefined || to === seat) return refuse("UNKNOWN_TRADER", `${toId ?? ""} is not another trader. Traders: ${others(state, seat).join(", ")}, or all.`);
	if ((state.says[seat] ?? 0) >= ctx.options.maxSays) return refuse("TOO_MANY_MESSAGES", `You sent ${String(ctx.options.maxSays)} messages this round; wait for the next round.`);
	const message = text.trim();
	if (message === "") return refuse("EMPTY_MESSAGE", "Say something.");
	return send(ctx, seat, to, message);
}

// The message is counted, logged and queued for its readers.
function send(ctx: SaltMarketCtx, resident: string, to: string, message: string): ToolSuccess {
	const state = ctx.state;
	state.says[resident] = (state.says[resident] ?? 0) + 1;
	statsOf(state, resident).says += 1;
	ctx.emit("market_said", { game: state.game, round: state.round, from: resident, to, text: message });
	if (to === ALL) tell(ctx, others(state, resident), `${resident} to everyone: "${message}"`);
	else tell(ctx, [to], `${resident} to you (private): "${message}"`);
	return reply(`Sent${to === ALL ? " to everyone" : ` to ${to}`}. When you are done, end your turn.`);
}
