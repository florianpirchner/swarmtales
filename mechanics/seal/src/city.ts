// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * What the seal reads and does in the city, carried from the old `index.ts` (`portsFor`, `sealParts`, `enabled`) over
 * the services of the new platform: the points (`ledger`), the board and the notices (`channels`), the standings,
 * the register and the strike (`exile`), and the tribunal's target as `tribunal_announced` said it.
 */
import type { InputLine } from "@swarmtales/contracts";
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { LedgerService } from "@swarmtales/mechanic-ledger/contract";
import type { SealCtx } from "./head.ts";
import { auctionOf, bidOf, holds, SealHouse, type SealPorts } from "./house.ts";

const CITY = "CITY";

/** The seal's part of the status line: after the tribunal (910), before the goal (1100; old `STATUS_ORDER.seal`). */
const STATUS_ORDER = 1000;

/**
 * Residents the tribunal still has to exile: its target less the exiled and those at the gate (old `missing` of the
 * tribunal); undefined until the tribunal has announced its target (erratum of M5-44).
 *
 * @param ctx - The context.
 * @returns The number, at least 0, or undefined.
 */
export function missing(ctx: SealCtx): number | undefined {
	const { target } = ctx.state;
	if (target === null) return undefined;
	return Math.max(0, target - ctx.call(ExileService, "exiled", {}).length - ctx.call(ExileService, "gates", {}).length);
}

/**
 * The ports of the house in this context (old `portsFor`).
 *
 * @param ctx - The context.
 * @returns The ports.
 */
export function portsFor(ctx: SealCtx): SealPorts {
	return {
		ids: ctx.residents.ids,
		points: (agent) => ctx.call(LedgerService, "balance", { account: agent }),
		standing: (agent) => ctx.call(ExileService, "standing", { resident: agent }),
		missing: () => missing(ctx),
		burn: (agent, amount, reason) => {
			ctx.call(LedgerService, "burn", { account: agent, amount, reason });
		},
		post: (text) => {
			ctx.call(ChannelsService, "post", { author: CITY, text });
		},
		notify: (to, text) => {
			ctx.call(ChannelsService, "notify", { to, author: CITY, text });
		},
		emit: (type, payload) => {
			ctx.emit(type, payload);
		},
		// Old `ExileApi.strike` is the exile's `banish` with `by: "seal"` (erratum J28).
		strike: (target) => {
			ctx.call(ExileService, "banish", { resident: target, by: "seal" });
		},
		shuffle: (seal, agents) => ctx.rng("seal", seal).shuffle(agents),
	};
}

/**
 * The house over the state of this context (old `houseFor`).
 *
 * @param ctx - The context.
 * @returns The house.
 */
export function houseFor(ctx: SealCtx): SealHouse {
	return new SealHouse(ctx.options, portsFor(ctx), ctx.state);
}

/**
 * The seal's status parts for a resident (old `sealParts`): an auction to bid in, or the seal it bears.
 *
 * @param ctx - The context.
 * @param agent - The resident.
 * @returns The status lines.
 */
export function statusLines(ctx: SealCtx, agent: string): InputLine[] {
	const standing = ctx.call(ExileService, "standing", { resident: agent }).kind;
	if (standing === "exiled") return [];
	const lines: InputLine[] = [];
	const auction = auctionOf(ctx.state);
	if (auction !== undefined && standing === "alive") {
		const bid = bidOf(ctx.state, agent);
		const own = bid === undefined ? "" : ` ${ctx.prompt("seal/status/seal-bid", { bid })}`;
		lines.push({ kind: "status", order: STATUS_ORDER, text: ctx.prompt("seal/status/seal-auction", { until: auction.until, bid: own }) });
	}
	if (holds(ctx.state, agent)) lines.push({ kind: "status", order: STATUS_ORDER, text: ctx.prompt("seal/status/seal-bearer", {}) });
	return lines;
}

/**
 * The old `enabledTools`: `bid` while an auction runs for a resident in the city, `permaDeath` for a bearer.
 *
 * @param ctx - The context.
 * @param tool - The bare tool name.
 * @param agent - The resident.
 * @returns True when the tool is open to it.
 */
export function enabled(ctx: SealCtx, tool: string, agent: string): boolean {
	if (tool === "bid") return auctionOf(ctx.state) !== undefined && ctx.call(ExileService, "standing", { resident: agent }).kind === "alive";
	return holds(ctx.state, agent);
}
