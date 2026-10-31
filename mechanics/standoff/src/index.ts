/**
 * The `standoff` mechanic (carve step 11, team T4, docs/design/carve-team-T4.md): pieces residents
 * hold for others, the pieces the city keeps for the exiled, hand-overs and the gamemaker's
 * ultimatums. The logic is the old `StandoffBook` (book.ts) over the state this mechanic holds.
 */
import { Type } from "typebox";
import { defineHead, defineMechanic, refuse, reply } from "@swarmtales/kernel";
import type { ContextOf, ToolContextOf } from "@swarmtales/contracts";
import { ChannelsApi, ExileApi, LedgerApi, NamesApi, ProgressionApi, PuzzlesApi, STATUS_ORDER, StandoffApi, type HeldPiece } from "@swarmtales/mechanic-shared";
import { emptyStandoff, StandoffBook, type StandoffData, type StandoffPiece, type StandoffPorts } from "./book.ts";
import { standoffEvents } from "./events.ts";

import { ransomPrice } from "./price.ts";
import { standoffSnapshot } from "./slice.ts";


const CITY = "CITY";

const options = Type.Object({
	ultimatum: Type.Optional(
		Type.Object({
			penalty: Type.Integer({ minimum: 0, description: "Points whoever has not handed over by the deadline loses (at most what it holds)." }),
			maxMinutes: Type.Integer({ minimum: 1, description: "The longest deadline the gamemaker may give, in minutes." }),
		}, { description: "The gamemaker's ultimatum (P43); without it the gamemaker has none." }),
	),
	ransom: Type.Optional(
		Type.Object({
			share: Type.Number({ description: "Share of the city's median points that others pay for a ransom, in (0, 1]." }),
			selfShare: Type.Number({ description: "Share of the city's median points the resident at the gate pays for itself." }),
			minimum: Type.Number({ description: "Lower bound of the price others pay, in points." }),
		}, { description: "The tribunal's ransom rule: a piece the city keeps costs half of what others pay for a ransom (P48); absent without a tribunal." }),
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
	uses: [ExileApi, NamesApi],
	prompts: {
		"tools/claimPiece": [],
		"replies/piece-bought": ["pieces", "price"],
		"replies/locked": [],
		"gamemaker/tools/ultimatum": [],
		"gamemaker/replies/ultimatum-given": ["number", "between", "until", "penalty"],
	},
});

type Ctx = ContextOf<typeof standoffHead>;
type ToolCtx = ToolContextOf<typeof standoffHead>;

const NOUN: Readonly<Record<HeldPiece["kind"], string>> = { counter: "counter-factor", certificate: "team certificate", fragment: "fragment" };

/** Every piece `agent` holds on the levels dealt (old `heldPieces`), needers in team-member order. */
function heldAll(ctx: Ctx, agent: string): readonly HeldPiece[] {
	return ctx.call(PuzzlesApi, "heldPieces", { resident: agent });
}

function isExiled(ctx: Ctx, agent: string): boolean {
	return ctx.tryCall(ExileApi, "isExiled", { resident: agent }) ?? false;
}

/** What a piece the city keeps costs its needer: half of what others pay for a ransom (P48). */
function cityPiecePrice(ctx: Ctx): number {
	const ransom = ctx.options.ransom;
	if (ransom === undefined) return 0;
	const register = ctx.residents.ids.filter((id) => ctx.tryCall(ExileApi, "standing", { resident: id })?.kind !== "exiled");
	const points = register.map((id) => ctx.call(LedgerApi, "balance", { account: id }));
	return Math.ceil(ransomPrice(ransom, points) / 2);
}

function portsFor(ctx: Ctx): StandoffPorts {
	const { ultimatum } = ctx.options;
	return {
		ids: ctx.residents.ids,
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
		held: (agent) => heldAll(ctx, agent).filter((piece) => piece.kind !== "fragment"),
		needsNow: (agent, level) => !isExiled(ctx, agent) && ctx.call(ProgressionApi, "levelOf", { resident: agent }) === level && !ctx.call(ProgressionApi, "hasPassed", { resident: agent, level }),
		inCity: (agent) => !isExiled(ctx, agent),
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
	const entries = heldAll(ctx, agent).flatMap((piece) => {
		if (piece.kind === "fragment") return [];
		const waiting = piece.needers.filter((needer) => !isExiled(ctx, needer) && ctx.call(ProgressionApi, "levelOf", { resident: needer }) === piece.level && !ctx.call(ProgressionApi, "hasPassed", { resident: needer, level: piece.level }));
		return waiting.length === 0 ? [] : [`${waiting.join(", ")} door ${piece.level} ${NOUN[piece.kind]} ${piece.value}`];
	});
	return entries.length === 0 ? undefined : `you hold for others: ${entries.join("; ")}`;
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
				const claimed = bookFor(ctx).claim(agent, piece, holder, cityPiecePrice(ctx));
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
		kit.provideSome(StandoffApi, {
			heldPieces: ({ resident }, ctx) => heldAll(ctx, resident).map((piece): HeldPiece => ({ ...piece, needers: [...piece.needers] })),
			keep: ({ from, pieces }, ctx) => {
				const kept: StandoffPiece[] = pieces.map((piece) => ({ id: piece.id, level: piece.level, label: piece.label, value: piece.value, needers: piece.needers }));
				bookFor(ctx).keep(from, kept, cityPiecePrice(ctx), CITY);
				return null;
			},
			noteText: ({ author, readers, text }, ctx) => {
				bookFor(ctx).noteText(author, readers, text);
				return null;
			},
			cityPiecePrice: (_input, ctx) => cityPiecePrice(ctx),
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
		minuteStarted: (ctx) => {
			bookFor(ctx).tick(ctx.minute, CITY);
		},
		turnInputs: (resident, ctx) => {
			const text = heldPart(ctx, resident);
			return text === undefined ? [] : [{ kind: "status", text, order: STATUS_ORDER.held }];
		},
	},
	facts: {
		cityPieces: kit.fact(Type.Integer(), (view) => view.state.data.city.length),
		ultimatums: kit.fact(Type.Integer(), (view) => view.state.data.ultimatums.length),
		given: kit.fact(Type.Integer(), (view) => view.state.data.given.size),
	},
	snapshot: kit.snapshot(standoffSnapshot),
}));
