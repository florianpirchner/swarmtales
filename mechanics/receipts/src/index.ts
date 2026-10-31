/**
 * The `receipts` mechanic (carve step 5, team T1, docs/design/carve-team-T1.md): city-verified
 * receipts (`ReceiptsApi`, copied from packages/engine/src/receipts.ts and the receipt code of
 * world.ts), the tool `showReceipt`, the blame desk with the tool `blame` (the judge answers through
 * the consult stage), and the "receipts" status part. It listens to `transfer` and issues the
 * receipt at once; other receipts (level-ups, delivered DMs, escrow, treasuries) are issued by their
 * mechanics through `ReceiptsApi.issue`.
 */
import { Check } from "typebox/value";
import { Parse } from "typebox/value";
import { Type } from "typebox";
import type { ContextOf, EventLogView } from "@swarmtales/contracts";
import { defineHead, defineMechanic, refuse, reply } from "@swarmtales/kernel";
import { ChannelsApi, ChannelsEvents, ExileApi, INPUT_KINDS, LedgerApi, LedgerEvents, MarksApi, PenaltyLadder, ProgressionApi, PuzzlesApi, ReceiptBody, ReceiptsApi, STATUS_ORDER } from "@swarmtales/mechanic-shared";
import { check, claimPlace, ClaimChannel, falseAccuserRecord, judgeSays, ladderAt, liarRecord, type Facts } from "./blame.ts";
import { describeReceipt, nextId, partiesOf, receiptsOf, showable, shownPrivatelyText, type Receipt } from "./book.ts";

const CITY = "CITY";

const Stored = Type.Intersect([ReceiptBody, Type.Object({ id: Type.String(), minute: Type.Integer(), parties: Type.Array(Type.String()) })]);
const Pair = Type.Object({ dm: Type.Integer(), claim: Type.Integer() });
const Slice = Type.Object({
	receipts: Type.Array(Stored),
	pairs: Type.Array(Pair),
	delivered: Type.Array(Type.Object({ dm: Type.Integer(), after: Type.Integer() })),
	counts: Type.Array(Type.Object({ agent: Type.String(), act: Type.Integer(), count: Type.Integer() })),
});
/** The version-0 slice the legacy converter cuts out of the old world: `{ receipts, blames }`. */
const LegacySlice = Type.Object({ receipts: Type.Array(Stored), blames: Type.Object({ pairs: Type.Array(Pair) }) });

interface ReceiptsState {
	receipts: Receipt[];
	/** Settled (DM, claim) pairs: one blame each. */
	pairs: { dm: number; claim: number }[];
	/** The highest message number at the moment a DM was delivered, per DM number. */
	delivered: Map<number, number>;
	/** Lost blames per resident within one act. */
	counts: Map<string, { act: number; count: number }>;
}

const Standing = Type.Object({ points: Type.Number(), rank: Type.Integer() });
const Question = Type.Object({
	sender: Type.String(),
	accused: Type.String(),
	dm: Type.Object({ number: Type.Integer(), text: Type.String() }),
	claim: Type.Object({ number: Type.Integer(), channel: ClaimChannel, text: Type.String() }),
	standing: Type.Object({ sender: Standing, accused: Standing, residents: Type.Integer() }),
});
const Answer = Type.Object({ deniesReceipt: Type.Boolean(), board: Type.Optional(Type.String()), gamemaker: Type.Optional(Type.String()) });

export const receiptsHead = defineHead({
	id: "receipts",
	summary: "City-verified receipts and blame.",
	options: Type.Object({
		quoteDms: Type.Boolean({ default: false, description: "A DM receipt quotes the DM's text, so showing it proves what was written (Whispers); otherwise it never carries the text." }),
		minRun: Type.Optional(Type.Integer({ minimum: 1, description: "A board show is refused when the receipt quotes this many characters in a row of a fragment the resident holds." })),
		blamePenalty: Type.Optional(PenaltyLadder),
	}),
	state: (): ReceiptsState => ({ receipts: [], pairs: [], delivered: new Map<number, number>(), counts: new Map<string, { act: number; count: number }>() }),
	events: {
		receipt_issued: Type.Object({ receipt: Type.String(), kind: Type.String(), parties: Type.Array(Type.String()), text: Type.String() }),
		receipt_shown: Type.Object({ receipt: Type.String(), by: Type.String(), postSeq: Type.Optional(Type.Integer()), to: Type.Optional(Type.String()) }),
		blame: Type.Object({
			caller: Type.String(),
			accused: Type.String(),
			dm: Type.Integer(),
			claim: Type.Integer(),
			outcome: Type.Union([Type.Literal("upheld"), Type.Literal("rejected")]),
			payer: Type.String(),
			penalty: Type.Number(),
			reason: Type.Optional(Type.String()),
			post: Type.Integer(),
			judge: Type.Optional(Type.String()),
			whisper: Type.Optional(Type.String()),
		}),
	},
	prompts: {
		"tools/showReceipt": [],
		"tools/blame": [],
		"replies/receipt-shown-board": ["seq", "text"],
		"replies/receipt-shown-private": ["to", "receipt"],
		"replies/receipt-fragment": [],
		"replies/marks-left": ["remaining", "budget"],
		"replies/blame-upheld": ["accused", "penalty", "post"],
		"replies/blame-rejected": ["reason", "penalty", "next", "post"],
		"replies/judge-absent": [],
		"replies/judge-failed": [],
	},
	provides: [ReceiptsApi],
	requires: [ChannelsApi, LedgerApi],
	uses: [MarksApi, ExileApi, PuzzlesApi, ProgressionApi],
});

type Ctx = ContextOf<typeof receiptsHead>;

function issue(ctx: Ctx, body: ReceiptBody): { readonly receipt: Receipt; readonly text: string } {
	const receipt: Receipt = { ...body, id: nextId(ctx.state.receipts), minute: ctx.minute, parties: partiesOf(body) };
	ctx.state.receipts.push(receipt);
	const text = describeReceipt(receipt);
	if (receipt.kind === "dm") ctx.state.delivered.set(receipt.number, lastNumber(ctx.log));
	ctx.emit("receipt_issued", { receipt: receipt.id, kind: receipt.kind, parties: [...receipt.parties], text });
	return { receipt, text };
}

/** The highest message number the city gave so far (the numbered DMs and notices in the log). */
function lastNumber(log: EventLogView): number {
	let last = 0;
	for (const event of log.ofType("channels", "dm_sent")) {
		if (Check(ChannelsEvents.events.dm_sent, event.payload) && event.payload.number !== undefined) last = Math.max(last, event.payload.number);
	}
	return last;
}

function factsOf(ctx: Ctx): Facts {
	return {
		dm: (number) => {
			for (const event of ctx.log.ofType("channels", "dm_sent")) {
				const payload = event.payload;
				if (!Check(ChannelsEvents.events.dm_sent, payload) || payload.number !== number) continue;
				const receipt = ctx.state.receipts.find((candidate) => candidate.kind === "dm" && candidate.number === number);
				const after = ctx.state.delivered.get(number);
				return { from: payload.from, to: payload.to, text: payload.text, ...(receipt === undefined ? {} : { deliveredMinute: receipt.minute }), ...(after === undefined ? {} : { deliveredAfter: after }) };
			}
			return undefined;
		},
		board: (number) => {
			for (const event of ctx.log.ofType("channels", "board_post")) {
				const payload = event.payload;
				if (Check(ChannelsEvents.events.board_post, payload) && payload.postSeq === number) return { author: payload.author, text: payload.text };
			}
			return undefined;
		},
	};
}

function actOf(ctx: Ctx): number {
	return ctx.tryCall(ProgressionApi, "currentAct", {}) ?? 0;
}

function lostBlames(ctx: Ctx, agent: string): number {
	const entry = ctx.state.counts.get(agent);
	return entry?.act === actOf(ctx) ? entry.count : 0;
}

/** What the resident pays for its next lost blame in this act, as liar or as false accuser. */
function nextPenalty(ctx: Ctx, agent: string): number {
	const ladder = ctx.options.blamePenalty;
	return ladder === undefined ? 0 : ladderAt(ladder, lostBlames(ctx, agent) + 1);
}

function charge(ctx: Ctx, agent: string): number {
	const price = nextPenalty(ctx, agent);
	ctx.state.counts.set(agent, { act: actOf(ctx), count: lostBlames(ctx, agent) + 1 });
	return price;
}

function standingOf(ctx: Ctx, agent: string): { readonly points: number; readonly rank: number } {
	const balances = ctx.call(LedgerApi, "balances", {});
	const points = balances[agent] ?? 0;
	return { points, rank: 1 + ctx.residents.ids.filter((id) => (balances[id] ?? 0) > points).length };
}

function marksSuffix(ctx: Ctx, resident: string): string {
	const left = ctx.tryCall(MarksApi, "left", { resident });
	return left === undefined || left === null ? "" : ` · ${ctx.prompt("replies/marks-left", { remaining: left.remaining, budget: left.budget })}`;
}

/** The refusals of a show in the old order (World#showReceipt after the fragment check). */
function checkShow(ctx: Ctx, self: string, receiptId: string, to: string | undefined) {
	const minRun = to === undefined ? ctx.options.minRun : undefined;
	const found = showable(ctx.state.receipts, receiptId, self);
	if (minRun !== undefined && found.ok && ctx.tryCall(PuzzlesApi, "carriesSecret", { resident: self, text: describeReceipt(found.receipt), minRun }) === true) {
		return refuse("RECEIPT_CARRIES_FRAGMENT", ctx.prompt("replies/receipt-fragment", {}));
	}
	if (!found.ok) return refuse(found.error, receiptId);
	if (to !== undefined) {
		if (!ctx.residents.has(to)) return refuse("UNKNOWN_AGENT", to);
		if (to === self) return refuse("SELF_TARGET", "show it to another resident, or on the board");
		if (ctx.tryCall(ExileApi, "isExiled", { resident: to }) === true) return refuse("EXILED", `${to} was exiled`);
	}
	if (ctx.tryCall(MarksApi, "canAfford", { resident: self, channel: "receipt" }) === false) return refuse("NO_MARKS");
	return found.receipt;
}

export const receipts = defineMechanic(receiptsHead, (kit) => ({
	services: [
		kit.provide(ReceiptsApi, {
			issue: (input, ctx) => {
				const { receipt, text } = issue(ctx, ctx.options.quoteDms || input.body.kind !== "dm" ? input.body : { kind: "dm", from: input.body.from, to: input.body.to, number: input.body.number });
				return { id: receipt.id, text };
			},
			count: (input, ctx) => receiptsOf(ctx.state.receipts, input.resident).length,
			memoTransfers: (input, ctx) => ctx.state.receipts.filter((receipt) => receipt.kind === "transfer" && receipt.from === input.resident && receipt.memo.length > 0 && receipt.minute >= input.since).length,
			// The body carries no id or minute: the line is the one the next receipt would get, now.
			describe: (input, ctx) => describeReceipt({ ...input.body, id: nextId(ctx.state.receipts), minute: ctx.minute, parties: partiesOf(input.body) }),
		}),
	],
	listeners: [
		kit.listen(
			LedgerEvents,
			"transfer",
			(payload, ctx) => {
				const { text } = issue(ctx, { kind: "transfer", from: payload.from, to: payload.to, amount: payload.amount, memo: payload.memo });
				ctx.call(ChannelsApi, "notify", { to: payload.to, author: CITY, text });
			},
			{ immediate: true },
		),
	],
	tools: [
		kit.tool({
			name: "showReceipt",
			description: "tools/showReceipt",
			parameters: Type.Object({
				receiptId: Type.String({ description: "Receipt ID, e.g. R-0042", minLength: 1, maxLength: 16 }),
				to: Type.Optional(Type.String({ description: "Show it privately to this resident only (name or ID), e.g. A03; leave out for the board", minLength: 1, maxLength: 16 })),
			}),
			suggest: ["resident"],
			rule: ({ receiptId, to }, ctx) => {
				const self = ctx.resident;
				if (self === undefined) return refuse("UNKNOWN_AGENT");
				const checked = checkShow(ctx, self, receiptId, to);
				return "ok" in checked ? checked : undefined;
			},
			execute: ({ receiptId, to }, ctx) => {
				const self = ctx.resident;
				if (self === undefined) return refuse("UNKNOWN_AGENT");
				const checked = checkShow(ctx, self, receiptId, to);
				if ("ok" in checked) return checked;
				if (to === undefined) {
					const line = `${CITY} verifies ${describeReceipt(checked)} · shown by ${self}`;
					const { postSeq } = ctx.call(ChannelsApi, "post", { author: CITY, text: line });
					ctx.emit("receipt_shown", { receipt: checked.id, by: self, postSeq });
					ctx.tryCall(MarksApi, "spend", { resident: self, channel: "receipt" });
					return reply(`${ctx.prompt("replies/receipt-shown-board", { seq: postSeq, text: line })}${marksSuffix(ctx, self)}`);
				}
				ctx.call(ChannelsApi, "notify", { to, author: CITY, text: shownPrivatelyText(self, checked) });
				ctx.emit("receipt_shown", { receipt: checked.id, by: self, to });
				ctx.tryCall(MarksApi, "spend", { resident: self, channel: "receipt" });
				return reply(`${ctx.prompt("replies/receipt-shown-private", { to, receipt: checked.id })}${marksSuffix(ctx, self)}`);
			},
		}),
		kit.tool({
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
				// Asked even when the city's checks fail (carve request R-8); then the question is empty and the answer unused.
				ask: ({ dm, accused, claim }, ctx) => {
					const self = ctx.resident;
					if (self === undefined) return refuse("UNKNOWN_AGENT");
					const checked = check(factsOf(ctx), self, accused, dm, claim);
					const ready = checked.kind === "pending";
					return {
						sender: self,
						accused,
						dm: { number: dm, text: ready ? checked.delivered.text : "" },
						claim: { number: claim, channel: ready ? checked.claim.channel : "dm", text: ready ? checked.claim.text : "" },
						standing: { sender: standingOf(ctx, self), accused: standingOf(ctx, accused), residents: ctx.residents.ids.length },
					};
				},
			},
			execute: ({ dm, accused, claim }, ctx, consulted) => {
				const caller = ctx.resident;
				if (caller === undefined) return refuse("UNKNOWN_AGENT");
				if (!consulted.ok && consulted.reason === "absent") return refuse("JUDGE_ABSENT", ctx.prompt("replies/judge-absent", {}));
				if (!ctx.residents.has(accused)) return refuse("UNKNOWN_AGENT", accused);
				if (accused === caller) return refuse("SELF_BLAME", "you cannot blame yourself");
				if (ctx.state.pairs.some((pair) => pair.dm === dm && pair.claim === claim)) return refuse("ALREADY_BLAMED", `DM #${String(dm)} and message #${String(claim)} were blamed already`);
				const checked = check(factsOf(ctx), caller, accused, dm, claim);
				if (checked.kind === "pending" && !consulted.ok) return refuse("JUDGE_FAILED", ctx.prompt("replies/judge-failed", {}));
				const said = checked.kind === "pending" && consulted.ok ? judgeSays(consulted.answer) : {};
				ctx.state.pairs.push({ dm, claim });
				if (checked.kind === "pending" && consulted.ok && consulted.answer.deniesReceipt) {
					const penalty = charge(ctx, accused);
					if (penalty > 0) ctx.call(LedgerApi, "burn", { account: accused, amount: penalty, reason: `lied about DM #${String(dm)} from ${caller}` });
					const { postSeq } = ctx.call(ChannelsApi, "post", { author: CITY, text: liarRecord(caller, accused, checked.delivered, checked.claim, penalty, said.judge) });
					const next = nextPenalty(ctx, accused);
					const tail = next > 0 ? ` (your next lost blame costs ${String(next)})` : "";
					ctx.call(ChannelsApi, "notify", { to: accused, author: CITY, text: `${caller} blamed you for denying DM #${String(dm)}, and the city upheld it: you paid ${String(penalty)} points${tail}, and its record is on the board as #${String(postSeq)}.` });
					ctx.emit("blame", { caller, accused, dm, claim, outcome: "upheld", payer: accused, penalty, post: postSeq, ...said });
					return reply(ctx.prompt("replies/blame-upheld", { accused, penalty, post: postSeq }));
				}
				const reason = checked.kind === "rejected" ? checked.reason : `the city's judge finds that ${claimPlace(checked.claim)} by ${accused} does not deny receiving DM #${String(dm)}`;
				const penalty = charge(ctx, caller);
				if (penalty > 0) ctx.call(LedgerApi, "burn", { account: caller, amount: penalty, reason: `false blame of ${accused}` });
				const { postSeq } = ctx.call(ChannelsApi, "post", { author: CITY, text: falseAccuserRecord(caller, accused, dm, claim, reason, penalty, said.judge) });
				const next = nextPenalty(ctx, caller);
				const tail = next > 0 ? ` (your next lost blame costs ${String(next)})` : "";
				ctx.call(ChannelsApi, "notify", { to: caller, author: CITY, text: `Your blame of ${accused} was wrong: ${reason}. It cost you ${String(penalty)} points${tail}, and the city's record is on the board as #${String(postSeq)}.` });
				ctx.emit("blame", { caller, accused, dm, claim, outcome: "rejected", payer: caller, penalty, reason, post: postSeq, ...said });
				return reply(ctx.prompt("replies/blame-rejected", { reason, penalty, next, post: postSeq }));
			},
		}),
	],
	hooks: {
		turnInputs: (resident, ctx) => {
			const count = receiptsOf(ctx.state.receipts, resident).length;
			return count === 0 ? [] : [{ kind: INPUT_KINDS[1].kind, order: STATUS_ORDER.receipts, text: `${String(count)} ${count === 1 ? "receipt" : "receipts"}` }];
		},
	},
	facts: {
		issued: kit.fact(Type.Integer(), (view) => view.state.receipts.length),
	},
	snapshot: kit.snapshot({
		version: 1,
		schema: Slice,
		save: (state) => ({
			receipts: state.receipts.map((receipt) => ({ ...receipt, parties: [...receipt.parties] })),
			pairs: state.pairs.map((pair) => ({ ...pair })),
			delivered: [...state.delivered].map(([dm, after]) => ({ dm, after })),
			counts: [...state.counts].map(([agent, entry]) => ({ agent, act: entry.act, count: entry.count })),
		}),
		load: (data) => ({
			receipts: data.receipts.map((receipt) => ({ ...receipt })),
			pairs: data.pairs.map((pair) => ({ ...pair })),
			delivered: new Map(data.delivered.map((entry): [number, number] => [entry.dm, entry.after])),
			counts: new Map(data.counts.map((entry): [string, { act: number; count: number }] => [entry.agent, { act: entry.act, count: entry.count }])),
		}),
		migrations: {
			// The old snapshot keeps no delivery message numbers and no per-act blame counts (carve request R-7).
			0: (old) => {
				const legacy = Parse(LegacySlice, old);
				return { receipts: legacy.receipts, pairs: legacy.blames.pairs, delivered: [], counts: [] };
			},
		},
	}),
}));

