// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The cap on direct messages (the game's `dmLimit`): the direct messages and the transfers with a memo that one
 * resident sent in the current window of ticks, the windows counted from tick 0. `channels` owns the window; a memo
 * is refused by its own `rule` handler on `transferPoints` (12-m5-spec.md 2.3, erratum J4).
 */
import type { InputLine, Refusal } from "@swarmtales/contracts";
import { refuse } from "@swarmtales/sdk";
import type { Ctx } from "./head.ts";

/** The status part of the window, after every other part of the old status line. */
const WINDOW_ORDER = 1200;

/** A resident's window: `sent` messages and memos since `from`, at most `limit` until `until`. */
export interface DmWindow {
	/** The direct messages and memos sent in the window. */
	readonly sent: number;
	/** The most the window allows. */
	readonly limit: number;
	/** The first tick of the window. */
	readonly from: number;
	/** The first tick of the next window. */
	readonly until: number;
}

/**
 * Reads the resident's window (old `dmWindow`).
 *
 * @param ctx - The context.
 * @param agent - The resident id.
 * @returns The window, or null when the game sets no cap.
 */
export function dmWindow(ctx: Ctx, agent: string): DmWindow | null {
	const limit = ctx.options.dmLimit;
	if (limit === undefined) return null;
	const from = Math.floor(ctx.tick / limit.windowMinutes) * limit.windowMinutes;
	const dms = ctx.state.dms.filter((record) => record.from === agent && record.tick >= from).length;
	const memos = ctx.state.memos.filter((memo) => memo.from === agent && memo.tick >= from).length;
	return { sent: dms + memos, limit: limit.perWindow, from, until: from + limit.windowMinutes };
}

/**
 * The refusal of a direct message past the window, in the old words.
 *
 * @param ctx - The context.
 * @param from - The sender.
 * @returns `DM_LIMIT`, or undefined while the window has room.
 */
export function dmCap(ctx: Ctx, from: string): Refusal | undefined {
	const window = dmWindow(ctx, from);
	if (window === null || window.sent < window.limit) return undefined;
	return refuse("DM_LIMIT", `${String(window.sent)} DMs sent since minute ${String(window.from)}; you can send again from minute ${String(window.until)}`);
}

/**
 * The `rule` handler on `transferPoints` (by bare name): a transfer with a memo is a message too, so it is refused
 * when the window is full. It runs after the ledger's own rule, so the ledger's refusals come first, as the old
 * `checkTransfer` checked the cap last.
 *
 * @param tool - The bare name of the called tool.
 * @param resident - The caller, when it is a resident.
 * @param params - The checked arguments.
 * @param ctx - The context.
 * @returns `DM_LIMIT`, or undefined.
 */
export function memoCap(tool: string, resident: string | undefined, params: unknown, ctx: Ctx): Refusal | undefined {
	if (tool !== "transferPoints" || resident === undefined || !carriesMemo(params)) return undefined;
	const window = dmWindow(ctx, resident);
	if (window === null || window.sent < window.limit) return undefined;
	return refuse("DM_LIMIT", `${String(window.sent)} DMs and memos sent since minute ${String(window.from)}; send a memo again from minute ${String(window.until)}, or transfer without one`);
}

function carriesMemo(params: unknown): boolean {
	if (typeof params !== "object" || params === null || !("memo" in params)) return false;
	return typeof params.memo === "string" && params.memo.length > 0;
}

/**
 * The window as a part of the status line (`DMs 2/8 sent since minute 0 ...`), read before the mailbox is emptied.
 *
 * @param ctx - The context.
 * @param resident - The resident that is activated.
 * @returns The part, or none without a cap.
 */
export function windowLine(ctx: Ctx, resident: string): readonly InputLine[] {
	const window = dmWindow(ctx, resident);
	if (window === null) return [];
	return [{ kind: "status", order: WINDOW_ORDER, text: ctx.prompt("channels/status/dm-window", { sent: window.sent, limit: window.limit, from: window.from, until: window.until }) }];
}
