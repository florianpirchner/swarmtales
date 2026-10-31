/**
 * The `cast` mechanic (carve step 9, team T2, docs/design/carve-team-T2.md): named NPCs the
 * script plays (SPEC 4). It provides `CastApi`: channels routes a resident's DM to a cast member
 * here (`receive`), the script reveals and retires members, pays from their escrow, starts and
 * shortens collections of DMs, publishes them and draws lotteries among their senders. A
 * collection whose window also ends some minutes after the first solve of a level (v09) is
 * shortened at the start of the minute, before the script's triggers (load cast before script).
 * The input kind `character` (cues) is the script's, not written here.
 */
import { Type } from "typebox";
import { Parse } from "typebox/value";
import type { ApiOutput, ContextOf } from "@swarmtales/contracts";
import { defineMechanic } from "@swarmtales/kernel";
import { CastApi, CastExtrasApi, ChannelsApi, HOOK_ORDER, LedgerApi, ProgressionApi, ReceiptsApi } from "@swarmtales/mechanic-shared";
import { castHead, castWorkHead } from "./head.ts";
import { CollectionRecord, escrowAccountId, MemberRecord } from "./registry.ts";

export { castHead };
export { castOptionsFromStory, type CastStoryOptions } from "./from-story.ts";

type Ctx = ContextOf<typeof castWorkHead>;

/** The name the city signs its notices with. */
const CITY = "CITY";

const Slice = Type.Object({ members: Type.Array(MemberRecord), collections: Type.Array(CollectionRecord), funded: Type.Array(Type.String()) });
const LegacySlice = Type.Object({ cast: Type.Object({ members: Type.Array(MemberRecord), collections: Type.Array(CollectionRecord) }) });

/** Opens the escrow account of every member that has none yet and funds it from the system account. */
function fundMissing(ctx: Ctx): void {
	for (const member of ctx.state.registry.members.values()) {
		if (ctx.state.funded.has(member.id)) continue;
		ctx.state.funded.add(member.id);
		const escrow = ctx.options.members[member.id]?.escrow ?? 0;
		// Old world.ts:784: the escrow account opens even without escrow (the ledger refuses unopened accounts, R2-D1).
		ctx.call(LedgerApi, "open", { account: escrowAccountId(member.id) });
		if (escrow > 0) ctx.call(LedgerApi, "mint", { account: escrowAccountId(member.id), amount: escrow, reason: `escrow ${member.id}` });
	}
}

/** Ends a collection's window earlier, at `untilMinute` (not before this minute). */
function shorten(ctx: Ctx, into: string, untilMinute: number): void {
	if (!ctx.state.registry.shortenCollection(into, untilMinute, ctx.minute)) return;
	ctx.emit("collection_shortened", { into, untilMinute: ctx.state.registry.collections.get(into)?.untilMinute ?? untilMinute });
}

/**
 * A member the story added after the snapshot gets its escrow when the run resumes (old
 * world.ts:3089, R2-D1): an account the ledger does not know is opened and funded once, the
 * idempotency key keeping a second resume from funding it again.
 */
function fundResumed(ctx: Ctx): void {
	for (const member of ctx.state.registry.members.values()) {
		const account = escrowAccountId(member.id);
		if (ctx.call(LedgerApi, "has", { account })) continue;
		ctx.call(LedgerApi, "open", { account });
		ctx.state.funded.add(member.id);
		const escrow = ctx.options.members[member.id]?.escrow ?? 0;
		if (escrow > 0) ctx.call(LedgerApi, "mint", { account, amount: escrow, reason: `escrow ${member.id}`, idempotencyKey: `escrow-${member.id}` });
	}
}

/** The names of the collections the story can start, in the story's rule order, then any other in start order. */
function collectionOrder(ctx: Ctx): readonly string[] {
	const known = ctx.state.registry.collections;
	const named = ctx.options.collections.filter((into) => known.has(into));
	return [...new Set([...named, ...known.keys()])];
}

/** A collection whose window also ends some minutes after the first solve of a level (v09) is shortened (old `#endCollectionsAfterSolve`). */
function shortenAfterSolve(ctx: Ctx): void {
	for (const into of collectionOrder(ctx)) {
		const collection = ctx.state.registry.collections.get(into);
		const rule = collection?.afterSolve;
		if (collection === undefined || rule === undefined || ctx.minute > collection.untilMinute) continue;
		const solved = ctx.call(ProgressionApi, "firstSolveMinute", { level: rule.level });
		if (solved !== null) shorten(ctx, into, solved + rule.minutes);
	}
}

export const cast = defineMechanic(castWorkHead, (kit) => ({
	services: [
		kit.provide(CastApi, {
			isActive: (input, ctx) => ctx.state.registry.isActive(input.cast),
			receive: (input, ctx) => {
				const collected = ctx.state.registry.collect(input.cast, { from: input.from, text: input.text, minute: ctx.minute });
				ctx.emit("cast_dm", { from: input.from, cast: input.cast, text: input.text, collections: collected.collections, number: input.number });
				return { collections: collected.collections, newSender: collected.newSender };
			},
			collected: (input, ctx) => {
				ctx.emit("cast_collected", { from: input.from, cast: input.cast, into: [...input.into] });
				return null;
			},
			setLevel: (input, ctx) => {
				if (ctx.state.registry.setLevel(input.cast, input.level)) ctx.emit("cast_level_set", { cast: input.cast, level: input.level, audit: "NPC_LEVEL_SET" });
				return null;
			},
			reveal: (input, ctx) => {
				const changed = ctx.state.registry.reveal(input.cast);
				if (changed) ctx.emit("cast_revealed", { cast: input.cast });
				return changed;
			},
			retire: (input, ctx) => {
				const changed = ctx.state.registry.retire(input.cast);
				if (changed) ctx.emit("cast_retired", { cast: input.cast });
				return changed;
			},
			escrow: (input, ctx): ApiOutput<typeof CastApi, "escrow"> => {
				if (!ctx.state.registry.has(input.cast)) return { ok: false, code: "UNKNOWN_CAST", detail: input.cast };
				if (!ctx.residents.ids.includes(input.to)) return { ok: false, code: "UNKNOWN_AGENT", detail: input.to };
				const account = escrowAccountId(input.cast);
				const balance = ctx.call(LedgerApi, "balance", { account });
				if (!Number.isInteger(input.amount) || input.amount <= 0 || balance < input.amount) return { ok: false, code: "INSUFFICIENT_ESCROW", detail: `${String(balance)} left` };
				ctx.call(LedgerApi, "move", { from: account, to: input.to, amount: input.amount, reason: `escrow ${input.cast}` });
				const receipt = ctx.tryCall(ReceiptsApi, "issue", { body: { kind: "escrow", cast: input.cast, to: input.to, amount: input.amount } });
				if (receipt !== undefined) ctx.call(ChannelsApi, "notify", { to: input.to, author: CITY, text: receipt.text });
				return { ok: true };
			},
			startCollection: (input, ctx) => {
				const started = ctx.state.registry.startCollection(input.into, input.cast, input.first, input.untilMinute, input.distinctSenders, input.afterSolve);
				if (started) ctx.emit("collection_started", { into: input.into, cast: input.cast, first: input.first, untilMinute: input.untilMinute });
				return started;
			},
			shortenCollection: (input, ctx) => {
				shorten(ctx, input.into, input.untilMinute);
				return null;
			},
			revealCollection: (input, ctx): ApiOutput<typeof CastApi, "revealCollection"> => {
				const collection = ctx.state.registry.collections.get(input.into);
				if (collection === undefined) return { ok: false, code: "UNKNOWN_COLLECTION", detail: input.into };
				const lines =
					collection.entries.length === 0
						? [ctx.prompt("cast/collection-empty", {})]
						: collection.entries.map((entry, index) => ctx.prompt("cast/collection-entry", { index: index + 1, from: entry.from, minute: entry.minute, text: entry.text }));
				const post = ctx.call(ChannelsApi, "post", { author: collection.cast, text: [...(input.header === undefined ? [] : [input.header]), ...lines].join("\n") });
				ctx.emit("collection_revealed", { into: input.into, cast: collection.cast, entries: collection.entries.length, postSeq: post.postSeq, audit: "DIRECTOR_PRIVACY_BREACH" });
				return { ok: true };
			},
			drawLottery: (input, ctx) => {
				const collection = ctx.state.registry.collections.get(input.into);
				if (collection === undefined) return null;
				const candidates = [...new Set(collection.entries.map((entry) => entry.from))].sort((a, b) => a.localeCompare(b));
				if (candidates.length === 0) return null;
				const winner = ctx.rng("lottery", input.into, input.salt, ctx.minute).pick(candidates);
				ctx.emit("lottery_drawn", { into: input.into, candidates, winner });
				return winner;
			},
		}),
		kit.provide(CastExtrasApi, { active: (_input, ctx) => ctx.state.registry.active().map((member) => ({ id: member.id, level: member.level })) }),
	],
	hooks: {
		// The escrow of every member, from the system account, after the start points (old constructor).
		runStarted: { order: HOOK_ORDER.runStarted.cast, run: fundMissing },
		// A member the story added after a snapshot gets its escrow once, when the run resumes (old restore).
		runResumed: { order: HOOK_ORDER.runResumed.cast, run: fundResumed },
		// Director.startMinute: after the petitions expired and every mechanic ticked, before the script's triggers.
		minuteStarted: { order: HOOK_ORDER.minuteStarted.cast, run: shortenAfterSolve },
	},
	facts: {
		active: kit.fact(Type.Array(Type.Object({ id: Type.String(), level: Type.Integer() })), (view) => view.state.registry.active().map((member) => ({ id: member.id, level: member.level }))),
		collections: kit.fact(Type.Record(Type.String(), Type.Array(Type.String())), (view) => Object.fromEntries([...view.state.registry.collections].map(([into, collection]) => [into, collection.entries.map((entry) => entry.from)]))),
	},
	snapshot: kit.snapshot({
		version: 1,
		schema: Slice,
		save: (state) => ({
			members: [...state.registry.members.values()].map((member) => ({ ...member })),
			collections: [...state.registry.collections.values()].map((collection) => ({ ...collection, entries: collection.entries.map((entry) => ({ ...entry })) })),
			funded: [...state.funded],
		}),
		load: (data, setup) => {
			const state = castWorkHead.state(setup);
			state.registry.restore(data.members, data.collections);
			for (const id of data.funded) state.funded.add(id);
			return state;
		},
		// Version 0 is the old world field `cast`; every member it knew had its escrow opened.
		migrations: {
			0: (old) => {
				const { cast: legacy } = Parse(LegacySlice, old);
				return { members: legacy.members, collections: legacy.collections, funded: legacy.members.map((member) => member.id) };
			},
		},
	}),
}));
