// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * What the standoff reads of other mechanics (the old `reads.ts` and the ports of the old `index.ts`): the pieces
 * held, the levels, who is banished and the price, the same way for its handlers (`ctx`) and its facts (`view`,
 * queries only), and the book over the state with the ports of the call at hand.
 */
import { IdentityService } from "@swarmtales/mechanic-contracts";
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { LedgerService } from "@swarmtales/mechanic-ledger/contract";
import { ProgressionService } from "@swarmtales/mechanic-progression/contract";
import { StandoffBook, type StandoffPorts } from "./book.ts";
import { HeldPiecesService, RansomPriceService, type HeldPiece } from "./contract.ts";
import type { StandoffCtx, StandoffView } from "./head.ts";
import type { StandoffState } from "./model.ts";
import { UltimatumBook } from "./ultimatum.ts";

/** The author of the city's notices. */
export const CITY = "CITY";

/**
 * Every piece `agent` holds for others, fragments included; none without a provider of `held-pieces`.
 *
 * @param reader - The context or view.
 * @param agent - The resident.
 * @returns The pieces.
 */
export function heldAll(reader: StandoffView, agent: string): readonly HeldPiece[] {
	return reader.tryCall(HeldPiecesService, "held", { resident: agent }) ?? [];
}

/**
 * Whether the resident is banished, by any strike (old `isExiled`).
 *
 * @param reader - The context or view.
 * @param agent - The resident.
 * @returns True when it is gone.
 */
export function isExiled(reader: StandoffView, agent: string): boolean {
	return reader.tryCall(ExileService, "isExiled", { resident: agent }) ?? false;
}

/**
 * Whether `agent` stands before `level`'s door and has not passed it (old `needsNow`).
 *
 * @param reader - The context or view.
 * @param agent - The resident.
 * @param level - The level.
 * @returns True while it waits on the door.
 */
export function needsNow(reader: StandoffView, agent: string, level: number): boolean {
	return !isExiled(reader, agent) && reader.call(ProgressionService, "levelOf", { resident: agent }) === level && !reader.call(ProgressionService, "hasPassed", { resident: agent, level });
}

/**
 * What a piece the city keeps costs its needer: half of what others pay for a ransom, rounded up (P48); 0 without a provider of `ransom-price`.
 *
 * @param reader - The context or view.
 * @returns The points.
 */
export function cityPiecePrice(reader: StandoffView): number {
	const price = reader.tryCall(RansomPriceService, "price", {});
	return price === undefined ? 0 : Math.ceil(price / 2);
}

/**
 * A text as the resident reads it: every id replaced by its name when a provider of `identity` is loaded.
 *
 * @param reader - The context or view.
 * @param text - The text.
 * @returns The text shown.
 */
export function shown(reader: StandoffView, text: string): string {
	return reader.tryCall(IdentityService, "display", { text }) ?? text;
}

// The reading ports every caller of the book shares (old world.ts:682-702).
function readingPorts(reader: StandoffView): Pick<StandoffPorts, "ids" | "minute" | "held" | "needsNow" | "inCity"> {
	return {
		ids: reader.residents.ids,
		minute: () => reader.tick,
		held: (agent) => heldAll(reader, agent).filter((piece) => piece.kind !== "fragment"),
		needsNow: (agent, level) => needsNow(reader, agent, level),
		inCity: (agent) => !isExiled(reader, agent),
	};
}

/**
 * The book of a handler, with the ports of the call at hand.
 *
 * @param ctx - The context.
 * @returns The book.
 */
export function bookFor(ctx: StandoffCtx): UltimatumBook {
	const { ultimatum } = ctx.options;
	return new UltimatumBook(
		{
			...readingPorts(ctx),
			...(ultimatum === undefined ? {} : { rule: ultimatum }),
			points: (agent) => ctx.call(LedgerService, "balance", { account: agent }),
			burn: (agent, amount, reason) => {
				ctx.call(LedgerService, "burn", { account: agent, amount, reason });
			},
			notify: (agent, author, text) => {
				ctx.call(ChannelsService, "notify", { to: agent, author, text: shown(ctx, text) });
			},
			emit: (type, payload) => {
				ctx.emit(type, payload);
			},
			announce: (author, text) => {
				ctx.call(ChannelsService, "post", { author, text: shown(ctx, text) });
			},
		},
		ctx.state,
	);
}

// A fact writes nothing: it reads only `outstanding` and `unused`, which call none of these.
function unwritten(): void {
	return undefined;
}

/**
 * The book a fact reads, over the state as it is: its writing ports do nothing.
 *
 * @param view - The view.
 * @returns The book.
 */
export function factBook(view: StandoffView): StandoffBook {
	// The view's state is read-only; `outstanding` and `unused` never change it.
	const data: StandoffState = { given: [...view.state.given], city: [...view.state.city], ultimatums: [...view.state.ultimatums], last: view.state.last };
	return new StandoffBook({ ...readingPorts(view), points: () => 0, burn: unwritten, notify: unwritten, emit: unwritten, announce: unwritten }, data);
}
