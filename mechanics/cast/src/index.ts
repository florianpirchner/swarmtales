// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The `cast` mechanic, carried from the old `mechanics/cast`: named figures the script plays (STEWARD, the host of the
 * City's feast). It provides the service `cast`: the script reveals and retires members, pays from their escrow,
 * starts and shortens collections of direct messages, publishes them and draws lotteries among their senders; a
 * message to a member is handed in with `receive`, which `channels` calls through the service `figures` of
 * `mechanics/contracts` (with `isActive` and `collected`). It provides `cast-extras` for the `listAgents` of `progression`
 * and reads the first solve of a level from `progression.submission`, never by asking `progression` (J73). A
 * collection whose window also ends some ticks after the first solve of a level is shortened at the tick start,
 * after the tick starts that came before it on `legacy` and before the script's. An escrow payment writes
 * `escrow_paid`, which `receipts` turns into a receipt (the old cast issued it itself, J70).
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { LedgerService } from "@swarmtales/mechanic-ledger/contract";
import { ProgressionEvents } from "@swarmtales/mechanic-progression/contract";
import { defineMechanic } from "@swarmtales/sdk";
import { castHead, type CastCtx } from "./head.ts";
import { activeMembers, collect, collectionOf, escrowAccountId, memberOf, shortenCollection, startCollection } from "./registry.ts";

export { CastEvents, CastService } from "./contract.ts";
export { castHead, CastOptions, type CastCtx } from "./head.ts";
export { CastSlice, escrowAccountId, type CastState } from "./registry.ts";

type Done = { readonly ok: true } | { readonly ok: false; readonly code: string; readonly detail?: string };

// The mechanics whose tick start ran before the cast's on `legacy` (old `HOOK_ORDER.minuteStarted`); an id that is not loaded is ignored.
const BEFORE_CAST = ["consensus", "motives", "progression", "names", "tribunal", "seal", "standoff", "whispers", "standoff-tribunal", "exile", "petitions"];

// Opens the escrow account of every member and funds it from the system account (old constructor; the account opens even without escrow).
function fund(ctx: CastCtx): void {
	for (const member of ctx.state.members) {
		const escrow = ctx.options.members[member.id]?.escrow ?? 0;
		ctx.call(LedgerService, "open", { account: escrowAccountId(member.id) });
		if (escrow > 0) ctx.call(LedgerService, "mint", { account: escrowAccountId(member.id), amount: escrow, reason: `escrow ${member.id}` });
	}
}

function shorten(ctx: CastCtx, into: string, untilMinute: number): void {
	const until = shortenCollection(ctx.state, into, untilMinute, ctx.tick);
	if (until !== undefined) ctx.emit("collection_shortened", { into, untilMinute: until });
}

// A window that also ends some ticks after the first solve of a level, in the game's rule order, then any other in start order (old `#endCollectionsAfterSolve`).
function shortenAfterSolve(ctx: CastCtx): void {
	const started = ctx.state.collections.map((collection) => collection.into);
	for (const into of new Set([...ctx.options.collections.filter((name) => started.includes(name)), ...started])) {
		const collection = collectionOf(ctx.state, into);
		const rule = collection?.afterSolve;
		if (collection === undefined || rule === undefined || ctx.tick > collection.untilMinute) continue;
		const solved = ctx.state.solves.find((solve) => solve.level === rule.level);
		if (solved !== undefined) shorten(ctx, into, solved.tick + rule.minutes);
	}
}

function escrow(input: { readonly cast: string; readonly to: string; readonly amount: number }, ctx: CastCtx): Done {
	if (memberOf(ctx.state, input.cast) === undefined) return { ok: false, code: "UNKNOWN_CAST", detail: input.cast };
	if (!ctx.residents.ids.includes(input.to)) return { ok: false, code: "UNKNOWN_AGENT", detail: input.to };
	const account = escrowAccountId(input.cast);
	const balance = ctx.call(LedgerService, "balance", { account });
	if (!Number.isInteger(input.amount) || input.amount <= 0 || balance < input.amount) return { ok: false, code: "INSUFFICIENT_ESCROW", detail: `${String(balance)} left` };
	const moved = ctx.call(LedgerService, "move", { from: account, to: input.to, amount: input.amount, reason: `escrow ${input.cast}` });
	if (moved.ok) ctx.emit("escrow_paid", { cast: input.cast, to: input.to, amount: input.amount, txId: moved.txId });
	return { ok: true };
}

function revealCollection(input: { readonly into: string; readonly header?: string | undefined }, ctx: CastCtx): Done {
	const collection = collectionOf(ctx.state, input.into);
	if (collection === undefined) return { ok: false, code: "UNKNOWN_COLLECTION", detail: input.into };
	const lines =
		collection.entries.length === 0
			? [ctx.prompt("cast/collection-empty", {})]
			: collection.entries.map((entry, index) => ctx.prompt("cast/collection-entry", { index: index + 1, from: entry.from, minute: entry.minute, text: entry.text }));
	const post = ctx.call(ChannelsService, "post", { author: collection.cast, text: [...(input.header === undefined ? [] : [input.header]), ...lines].join("\n") });
	ctx.emit("collection_revealed", { into: input.into, cast: collection.cast, entries: collection.entries.length, postSeq: post.postSeq, audit: "DIRECTOR_PRIVACY_BREACH" });
	return { ok: true };
}

function drawLottery(input: { readonly into: string; readonly salt: string }, ctx: CastCtx): string | null {
	const collection = collectionOf(ctx.state, input.into);
	if (collection === undefined) return null;
	const candidates = [...new Set(collection.entries.map((entry) => entry.from))].sort((a, b) => a.localeCompare(b));
	if (candidates.length === 0) return null;
	const winner = ctx.rng("lottery", input.into, input.salt, ctx.tick).pick(candidates);
	ctx.emit("lottery_drawn", { into: input.into, candidates, winner });
	return winner;
}

// Changes a member's flag and writes the event when it changed: a hidden member is revealed, a member not retired is retired.
function flip(ctx: CastCtx, cast: string, what: "reveal" | "retire"): boolean {
	const member = memberOf(ctx.state, cast);
	if (member === undefined || member.retired || (what === "reveal" && !member.hidden)) return false;
	if (what === "reveal") member.hidden = false;
	else member.retired = true;
	ctx.emit(what === "reveal" ? "cast_revealed" : "cast_retired", { cast });
	return true;
}

const isActive = ({ cast: id }: { readonly cast: string }, ctx: CastCtx): boolean => activeMembers(ctx.state).some((member) => member.id === id);

// A resident's message to a member after the router's checks (old `receive`): collected while a collection runs.
function receive(input: { readonly from: string; readonly cast: string; readonly text: string; readonly number: number }, ctx: CastCtx): { collections: string[]; newSender: string[] } {
	const collected = collect(ctx.state, input.cast, { from: input.from, text: input.text, minute: ctx.tick });
	ctx.emit("cast_dm", { from: input.from, cast: input.cast, text: input.text, collections: collected.collections, number: input.number });
	return collected;
}

function collected(input: { readonly from: string; readonly cast: string; readonly into: readonly string[] }, ctx: CastCtx): null {
	ctx.emit("cast_collected", { from: input.from, cast: input.cast, into: [...input.into] });
	return null;
}

/**
 * The cast of a game: its figures, their escrow, collections and lotteries.
 *
 * @example
 * ```ts
 * const game = defineGame({ id: "city", residents: 6, mechanics: [ledger(), channels(), progression(), cast({ members: { STEWARD: { level: 10, hidden: true } } })], end: { ticks: 12 } });
 * ```
 *
 * @public
 */
export const cast = defineMechanic(castHead, {
	services: {
		cast: {
			isActive,
			collection: ({ into }, ctx) => {
				const collection = collectionOf(ctx.state, into);
				return collection === undefined ? null : { first: collection.first, untilMinute: collection.untilMinute, entries: collection.entries.length };
			},
			receive,
			collected,
			setLevel: ({ cast: id, level }, ctx) => {
				const member = memberOf(ctx.state, id);
				if (member === undefined) return null;
				member.level = level;
				ctx.emit("cast_level_set", { cast: id, level, audit: "NPC_LEVEL_SET" });
				return null;
			},
			reveal: ({ cast: id }, ctx) => flip(ctx, id, "reveal"),
			retire: ({ cast: id }, ctx) => flip(ctx, id, "retire"),
			escrow,
			startCollection: (input, ctx) => {
				const started = startCollection(ctx.state, input);
				if (started) ctx.emit("collection_started", { into: input.into, cast: input.cast, first: input.first, untilMinute: input.untilMinute });
				return started;
			},
			shortenCollection: ({ into, untilMinute }, ctx) => {
				shorten(ctx, into, untilMinute);
				return null;
			},
			revealCollection,
			drawLottery,
		},
		"cast-extras": { active: (_input, ctx) => [...activeMembers(ctx.state)] },
		// The same three methods for the router of `channels`, which cannot import the contract of the cast (decision A72).
		figures: { isActive, receive, collected },
	},
	listeners: (kit) => [
		// The first solve of each level, which the old cast asked of the progression (`firstSolveMinute`).
		kit.listen(ProgressionEvents, "submission", ({ level, outcome }, ctx) => {
			if (outcome === "correct" && !ctx.state.solves.some((solve) => solve.level === level)) ctx.state.solves.push({ level, tick: ctx.tick });
		}),
	],
	hooks: {
		// The escrow of every member, from the system account, after the start points (old constructor).
		runStarted: fund,
		tickStarted: { after: BEFORE_CAST, run: shortenAfterSolve },
	},
	facts: {
		active: { output: Type.Array(Type.Object({ id: Type.String({ description: "The member" }), level: Type.Integer({ description: "Its public level" }) }, { description: "A member" }), { description: "The active members" }), compute: (view) => [...activeMembers(view.state)] },
		collections: {
			output: Type.Record(Type.String({ description: "A collection" }), Type.Array(Type.String({ description: "A sender" }), { description: "The senders of its entries" }), { description: "The senders of each collection" }),
			compute: (view) => Object.fromEntries(view.state.collections.map((collection) => [collection.into, collection.entries.map((entry) => entry.from)])),
		},
	},
});
