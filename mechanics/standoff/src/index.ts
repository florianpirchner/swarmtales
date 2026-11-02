/**
 * The `standoff` mechanic (carve step 11, team T4, docs/design/carve-team-T4.md): pieces residents
 * hold for others, the pieces the city keeps for the exiled, hand-overs and the gamemaker's
 * ultimatums. The logic is the old `StandoffBook` (book.ts) over the state this mechanic holds.
 */
import { Type } from "typebox";
import { defineHead, defineMechanic, refuse, reply } from "@swarmtales/kernel";
import type { ContextOf, ToolContextOf, ViewOf } from "@swarmtales/contracts";
import { ChannelsApi, ExileApi, HOOK_ORDER, LedgerApi, NamesApi, ProgressionApi, PuzzlesApi, STATUS_ORDER, StandoffApi, TribunalApi, TribunalViewApi, type HeldPiece } from "@swarmtales/mechanic-shared";
import { emptyStandoff, StandoffBook, type StandoffData, type StandoffPiece, type StandoffPorts } from "./book.ts";
import { standoffEvents } from "./events.ts";
import { standoffSnapshot } from "./slice.ts";
import { CityPieces, cityPiecesOf, Outstanding, outstandingOf, Ultimatums, Unused, unusedOf } from "./situation.ts";
import { cityPiecePrice, needsNow, type StandoffReads } from "./reads.ts";
import { computeStandoffSection, StandoffSectionFact, type SectionReads } from "./section.ts";

export { DEFAULT_DIRECTION, grantsUltimatum, ULTIMATUM_DIRECTION } from "./grants.ts";
/** The schemas of the gamemaker's facts, for a head that renders the old "Standoffs" section. */
export { CityPieces, Outstanding, Ultimatums, Unused } from "./situation.ts";
export { computeStandoffSection, renderRiskSection, renderStandoffSection, StandoffSectionFact, standoffSectionOf, type SectionReads, type StandoffSection } from "./section.ts";

const CITY = "CITY";

const options = Type.Object({
	ultimatum: Type.Optional(
		Type.Object({
			penalty: Type.Integer({ minimum: 0, description: "Points whoever has not handed over by the deadline loses (at most what it holds)." }),
			maxMinutes: Type.Integer({ minimum: 1, description: "The longest deadline the gamemaker may give, in minutes." }),
		}, { description: "The gamemaker's ultimatum (P43); without it the gamemaker has none." }),
	),
	author: Type.String({ default: "COURIER", description: "The gamemaker's name on its notices and board posts, e.g. COURIER." }),
});

export interface StandoffState {
	data: StandoffData;
}

export const standoffHead = defineHead({
	id: "standoff",
	summary: "Pieces residents hold for others, kept pieces and ultimatums.",
	options,
	state: (): StandoffState => ({ data: emptyStandoff() }),
	events: standoffEvents,
	provides: [StandoffApi],
	requires: [PuzzlesApi, ProgressionApi, LedgerApi, ChannelsApi],
	uses: [ExileApi, NamesApi, TribunalApi, TribunalViewApi],
	prompts: {
		"tools/claimPiece": [],
		"replies/piece-bought": ["pieces", "price"],
		"replies/locked": [],
		"competitor/status/held": ["pieces"],
		"competitor/status/held-piece": ["waiting", "level", "noun", "value"],
		"gamemaker/tools/ultimatum": [],
		"gamemaker/replies/ultimatum-given": ["number", "between", "until", "penalty"],
	},
});

type Ctx = ContextOf<typeof standoffHead>;
type ToolCtx = ToolContextOf<typeof standoffHead>;
type View = ViewOf<typeof standoffHead>;

const NOUN: Readonly<Record<HeldPiece["kind"], string>> = { counter: "counter-factor", certificate: "team certificate", fragment: "fragment" };

/** The standoff's reads in a tool, hook or service. */
function readsOfCtx(ctx: Ctx): StandoffReads {
	return {
		ids: ctx.residents.ids,
		heldAll: (agent) => ctx.call(PuzzlesApi, "heldPieces", { resident: agent }),
		levelOf: (agent) => ctx.call(ProgressionApi, "levelOf", { resident: agent }),
		hasPassed: (agent, level) => ctx.call(ProgressionApi, "hasPassed", { resident: agent, level }),
		isExiled: (agent) => ctx.tryCall(ExileApi, "isExiled", { resident: agent }) ?? false,
		ransomPrice: () => ctx.tryCall(TribunalApi, "ransomPrices", {})?.price,
	};
}

/** The same reads in a fact: queries only (R2-D4), computed when the fact is read. */
function readsOfView(view: View): StandoffReads {
	return {
		ids: view.residents.ids,
		heldAll: (agent) => view.call(PuzzlesApi, "heldPieces", { resident: agent }),
		levelOf: (agent) => view.call(ProgressionApi, "levelOf", { resident: agent }),
		hasPassed: (agent, level) => view.call(ProgressionApi, "hasPassed", { resident: agent, level }),
		isExiled: (agent) => view.tryCall(ExileApi, "isExiled", { resident: agent }) ?? false,
		ransomPrice: () => view.tryCall(TribunalApi, "ransomPrices", {})?.price,
	};
}

/** The running ultimatums (old `ultimatums()`). */
function ultimatumsOf(view: View): { number: number; between: [string, string]; until: number; penalty: number }[] {
	return view.state.data.ultimatums.flatMap((entry) => {
		const [a, b] = entry.between;
		if (a === undefined || b === undefined) return [];
		const between: [string, string] = [a, b];
		return [{ number: entry.number, between, until: entry.until, penalty: entry.penalty }];
	});
}

/** What the gamemaker's section reads besides the standoff's book. */
function sectionReads(view: View, reads: StandoffReads): SectionReads {
	return {
		minute: view.minute,
		alive: view.tryCall(ExileApi, "alive", {}) ?? view.residents.ids,
		standing: (agent) => view.tryCall(ExileApi, "standing", { resident: agent }) ?? { kind: "alive" },
		levelOf: reads.levelOf,
		hasPassed: reads.hasPassed,
		isExiled: reads.isExiled,
		points: (agent) => view.call(LedgerApi, "balance", { account: agent }),
		held: reads.heldAll,
		atRisk: () => view.tryCall(TribunalViewApi, "atRisk", {}) ?? null,
		cityPiecePrice: () => cityPiecePrice(reads),
	};
}

/** A fact writes nothing: the book's writing ports refuse. */
function readOnly(): never {
	throw new Error("standoff: a fact writes nothing");
}

/** The reading ports every caller of the book shares (old world.ts:682-702). */
function readingPorts(reads: StandoffReads): Pick<StandoffPorts, "ids" | "held" | "needsNow" | "inCity"> {
	return {
		ids: reads.ids,
		held: (agent) => reads.heldAll(agent).filter((piece) => piece.kind !== "fragment"),
		needsNow: (agent, level) => needsNow(reads, agent, level),
		inCity: (agent) => !reads.isExiled(agent),
	};
}

/** The book a fact reads, over the state as it is; `outstanding` and `unused` only read. */
function factBook(view: View): { readonly book: StandoffBook; readonly reads: StandoffReads } {
	const reads = readsOfView(view);
	const ports: StandoffPorts = { ...readingPorts(reads), minute: () => view.minute, points: readOnly, burn: readOnly, notify: readOnly, emit: readOnly, announce: readOnly };
	return { book: new StandoffBook(ports, view.state.data), reads };
}

function portsFor(ctx: Ctx): StandoffPorts {
	const { ultimatum } = ctx.options;
	return {
		...readingPorts(readsOfCtx(ctx)),
		...(ultimatum === undefined ? {} : { rule: ultimatum }),
		minute: () => ctx.minute,
		points: (agent) => ctx.call(LedgerApi, "balance", { account: agent }),
		burn: (agent, points, reason) => {
			ctx.call(LedgerApi, "burn", { account: agent, amount: points, reason });
		},
		notify: (agent, author, text) => {
			ctx.call(ChannelsApi, "notify", { to: agent, author, text });
		},
		emit: (type, payload) => {
			ctx.emit(type, payload);
		},
		announce: (author, text) => {
			ctx.call(ChannelsApi, "post", { author, text });
		},
	};
}

function bookFor(ctx: Ctx): StandoffBook {
	return new StandoffBook(portsFor(ctx), ctx.state.data);
}

/** A name or id as the resident it stands for (the names mechanic, when loaded). */
function resolve(ctx: Ctx, text: string): string {
	return ctx.tryCall(NamesApi, "resolve", { text }) ?? text;
}

/** `you hold for others: A01 door 9 counter-factor 791217`, while those needers wait at their door. */
function heldPart(ctx: Ctx, agent: string): string | undefined {
	const reads = readsOfCtx(ctx);
	const entries = reads.heldAll(agent).flatMap((piece) => {
		if (piece.kind === "fragment") return [];
		const waiting = piece.needers.filter((needer) => needsNow(reads, needer, piece.level));
		return waiting.length === 0 ? [] : [ctx.prompt("competitor/status/held-piece", { waiting: waiting.join(", "), level: piece.level, noun: NOUN[piece.kind], value: piece.value })];
	});
	return entries.length === 0 ? undefined : ctx.prompt("competitor/status/held", { pieces: entries.join("; ") });
}

const UltimatumParams = Type.Object({
	a: Type.String({ description: "Resident name or ID" }),
	b: Type.String({ description: "The other resident, name or ID" }),
	minutes: Type.Integer({ description: "Minutes until the deadline", minimum: 1 }),
});

export const standoff = defineMechanic(standoffHead, (kit) => ({
	tools: [
		kit.tool({
			name: "claimPiece",
			description: "tools/claimPiece",
			parameters: Type.Object({
				piece: Type.String({ description: "The piece, as the city named it, e.g. L9-counter-A03 or L8-certificate" }),
				from: Type.String({ description: "The resident who held it, name or ID" }),
			}),
			suggest: ["resident"],
			serves: ["resident"],
			execute: ({ piece, from }, ctx: ToolCtx) => {
				const agent = ctx.resident;
				if (agent === undefined) return refuse("NO_RESIDENT");
				const holder = resolve(ctx, from);
				const claimed = bookFor(ctx).claim(agent, piece, holder, cityPiecePrice(readsOfCtx(ctx)));
				if (!claimed.ok) return refuse(claimed.error, claimed.detail);
				const values = claimed.value.pieces.map((entry) => `${entry.label}: ${entry.value}`).join("; ");
				ctx.call(ChannelsApi, "notify", { to: agent, author: CITY, text: `The city hands you what ${holder} held for you: ${values}.` });
				return reply(ctx.prompt("replies/piece-bought", { pieces: claimed.value.pieces.map((entry) => entry.id).join(", "), price: claimed.value.price }));
			},
		}),
		kit.tool({
			name: "ultimatum",
			description: "gamemaker/tools/ultimatum",
			parameters: UltimatumParams,
			suggest: ["gamemaker"],
			serves: ["gamemaker"],
			execute: ({ a, b, minutes }, ctx: ToolCtx) => {
				const first = resolve(ctx, a);
				const second = resolve(ctx, b);
				if (!ctx.residents.has(first) || !ctx.residents.has(second)) return refuse("UNKNOWN_AGENT", `${a}, ${b}`);
				const given = bookFor(ctx).issue(first, second, minutes, ctx.options.author);
				if (!given.ok) return refuse(given.error, given.detail);
				const { number, between, until, penalty } = given.value;
				return reply(ctx.prompt("gamemaker/replies/ultimatum-given", { number, between: between.join(" and "), until, penalty }));
			},
		}),
	],
	services: [
		kit.provide(StandoffApi, {
			heldPieces: ({ resident }, ctx) => readsOfCtx(ctx).heldAll(resident).map((piece): HeldPiece => ({ ...piece, needers: [...piece.needers] })),
			keep: ({ from, pieces }, ctx) => {
				const kept: StandoffPiece[] = pieces.map((piece) => ({ id: piece.id, level: piece.level, label: piece.label, value: piece.value, needers: piece.needers }));
				bookFor(ctx).keep(from, kept, cityPiecePrice(readsOfCtx(ctx)), CITY);
				return null;
			},
			noteText: ({ author, readers, text }, ctx) => {
				bookFor(ctx).noteText(author, readers, text);
				return null;
			},
			/** A last will handed `piece` to `to` (old `#standoff.noteGiven` from the will): it counts as given. */
			noteGiven: ({ from, to, piece }, ctx) => {
				bookFor(ctx).noteGiven(from, to, { id: piece.id, level: piece.level, label: piece.label, value: piece.value, needers: piece.needers });
				return null;
			},
			cityPiecePrice: (_input, ctx) => cityPiecePrice(readsOfCtx(ctx)),
		}),
	],
	pipeline: {
		/** The old `enabledTools`: a resident in the city buys only while the city keeps a piece it needs. */
		lock: (call, ctx) => {
			if (call.owner !== "standoff" || call.tool !== "claimPiece" || call.resident === undefined) return undefined;
			const alive = (ctx.tryCall(ExileApi, "standing", { resident: call.resident })?.kind ?? "alive") === "alive";
			return alive && bookFor(ctx).claimable(call.resident).length > 0 ? undefined : refuse("TOOL_LOCKED", ctx.prompt("replies/locked", {}));
		},
	},
	hooks: {
		minuteStarted: {
			order: HOOK_ORDER.minuteStarted.standoff,
			run: (ctx) => {
				bookFor(ctx).tick(ctx.minute, CITY);
			},
		},
		turnInputs: {
			order: HOOK_ORDER.turnInputs.status,
			run: (resident, ctx) => {
				const text = heldPart(ctx, resident);
				return text === undefined ? [] : [{ kind: "status", text, order: STATUS_ORDER.held }];
			},
		},
	},
	facts: {
		/** D-8: the pieces holders in the city still owe residents before their door. */
		outstanding: kit.fact(Outstanding, (view) => {
			const { book, reads } = factBook(view);
			return outstandingOf(book, reads.heldAll);
		}),
		/** D-8: the pieces the city keeps or seized, who bought each, a seized piece's price. */
		cityPieces: kit.fact(CityPieces, (view) => cityPiecesOf(view.state.data.city)),
		/** D-8: hand-overs whose needer still stands before the door. */
		unused: kit.fact(Unused, (view) => unusedOf(factBook(view).book)),
		/** D-8: the running ultimatums. */
		ultimatums: kit.fact(Ultimatums, (view) => ultimatumsOf(view)),
		/** D-8: what a piece the city keeps costs now. */
		cityPiecePrice: kit.fact(Type.Number(), (view) => cityPiecePrice(readsOfView(view))),
		given: kit.fact(Type.Integer(), (view) => view.state.data.given.size),
		/** The gamemaker's "Standoffs" and "At risk" lines (old `standoffLines`, `riskLines`; step 18, item 2). */
		section: kit.fact(StandoffSectionFact, (view) => {
			const { book, reads } = factBook(view);
			return computeStandoffSection(
				{ outstanding: outstandingOf(book, reads.heldAll), cityPieces: cityPiecesOf(view.state.data.city), ultimatums: ultimatumsOf(view), unused: unusedOf(book) },
				sectionReads(view, reads),
			);
		}),
	},
	snapshot: kit.snapshot(standoffSnapshot),
}));
