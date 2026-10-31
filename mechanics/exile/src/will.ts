/**
 * The last will at the gate (old `World.lastWill` and the `lastWill` tool): once, points and held
 * pieces to heirs at once, the city delivering every piece's value privately. The points each heir
 * receives are capped at the tribunal's `bequestPerHeir` of the current balance; any number of heirs,
 * and what is not bequeathed burns at exile. The public text is posted when the gate closes.
 */
import { ChannelsApi, GoalsApi, LedgerApi, PuzzlesApi, StandoffApi, TribunalApi } from "@swarmtales/mechanic-shared";
import { TribunalExtrasApi } from "./extras.ts";
import type { ExileCtx } from "./head.ts";
import { CITY } from "./gone.ts";
import type { Refused } from "./ransom.ts";
import { gateOf, isGone, namesList, standingOf } from "./state.ts";

export const MAX_WILL_LENGTH = 600;

/** One bequest of a last will: points, or one piece the exiled holds (old `Bequest`). */
export type Bequest = { readonly to: string; readonly points: number } | { readonly to: string; readonly factor: string };

/** One entry of the tool's `bequests`: points, a piece, or both. */
export interface BequestEntry {
	readonly to: string;
	readonly points?: number;
	readonly factor?: string;
}

function refused(code: string, detail: string): Refused {
	return { ok: false, code, detail };
}

/** The tool's own split (v08: an entry may carry points, a piece, or both); undefined for an entry with neither. */
export function bequestsOf(entries: readonly BequestEntry[]): readonly Bequest[] | undefined {
	const parsed: Bequest[] = [];
	for (const entry of entries) {
		const points = entry.points ?? 0;
		if (points === 0 && entry.factor === undefined) return undefined;
		if (points > 0) parsed.push({ to: entry.to, points });
		if (entry.factor !== undefined) parsed.push({ to: entry.to, factor: entry.factor });
	}
	return parsed;
}

/** Old `World.lastWill`: the checks in the old order, then the bequests, `last_will` and the will recorded at the gate. */
export function lastWill(ctx: ExileCtx, agent: string, text: string, bequests: readonly Bequest[]): { readonly ok: true; readonly lines: readonly string[] } | Refused {
	const gate = gateOf(ctx.state, agent);
	if (!ctx.has(TribunalApi) || standingOf(ctx.state, agent).kind !== "gate" || gate === undefined) return refused("NOT_AT_GATE", "only a resident at the gate leaves a will");
	if (gate.will !== undefined) return refused("WILL_DONE", "your will is written; it cannot be changed");
	const trimmed = text.trim();
	if (trimmed.length === 0 || trimmed.length > MAX_WILL_LENGTH) return refused("INVALID_TEXT", `1-${MAX_WILL_LENGTH} characters`);
	const pieces = new Map(ctx.call(PuzzlesApi, "heldPieces", { resident: agent }).map((piece) => [piece.id, piece]));
	let points = 0;
	const perHeir = new Map<string, number>();
	const factors = new Set<string>();
	for (const bequest of bequests) {
		if (!ctx.residents.has(bequest.to) || isGone(ctx.state, bequest.to)) return { ok: false, code: "UNKNOWN_AGENT", detail: bequest.to };
		if (bequest.to === agent) return refused("INVALID_BEQUEST", "you cannot inherit from yourself");
		if ("points" in bequest) {
			if (!Number.isInteger(bequest.points) || bequest.points <= 0) return refused("INVALID_BEQUEST", "points must be a positive integer");
			points += bequest.points;
			perHeir.set(bequest.to, (perHeir.get(bequest.to) ?? 0) + bequest.points);
			continue;
		}
		if (!pieces.has(bequest.factor)) return refused("UNKNOWN_FACTOR", `you hold no ${bequest.factor}; you hold: ${[...pieces.keys()].join(", ") || "nothing"}`);
		if (factors.has(bequest.factor)) return refused("INVALID_BEQUEST", `${bequest.factor} is bequeathed twice`);
		factors.add(bequest.factor);
	}
	const balance = ctx.call(LedgerApi, "balance", { account: agent });
	if (points > balance) return refused("INSUFFICIENT_FUNDS", `you hold ${balance} points`);
	const share = ctx.tryCall(TribunalExtrasApi, "bequestPerHeir", {}) ?? 0;
	const cap = Math.max(0, Math.floor(balance * share));
	const over = [...perHeir].filter(([, amount]) => amount > cap).map(([heir]) => heir);
	if (over.length > 0) {
		return refused(
			"BEQUEST_CAP",
			`each heir may receive at most ${cap} of your ${balance} points (${Math.round(share * 100)}% per heir); ` +
				`${namesList(over)} would receive more. Leave points to more heirs; whatever you do not bequeath burns at exile`,
		);
	}
	const lines: string[] = [];
	for (const bequest of bequests) {
		if ("points" in bequest) {
			ctx.call(LedgerApi, "move", { from: agent, to: bequest.to, amount: bequest.points, reason: `last will of ${agent}` });
			ctx.call(ChannelsApi, "notify", { to: bequest.to, author: CITY, text: ctx.prompt("exile/will-points", { agent, points: bequest.points }) });
			lines.push(`${bequest.points} points to ${bequest.to}`);
			continue;
		}
		const piece = pieces.get(bequest.factor);
		if (piece === undefined) continue;
		ctx.call(ChannelsApi, "notify", { to: bequest.to, author: CITY, text: ctx.prompt("exile/will-piece", { agent, label: piece.label, value: piece.value }) });
		if (piece.kind !== "fragment" && piece.needers.includes(bequest.to)) ctx.call(StandoffApi, "noteGiven", { from: agent, to: bequest.to, piece });
		lines.push(`${piece.id} to ${bequest.to}`);
	}
	for (const heir of new Set(bequests.map((bequest) => bequest.to))) ctx.tryCall(GoalsApi, "noteHeir", { heir });
	ctx.emit("last_will", {
		agent,
		text: trimmed,
		bequests: bequests.map((bequest) => ("points" in bequest ? { to: bequest.to, points: bequest.points } : { to: bequest.to, factor: bequest.factor })),
	});
	gate.will = { text: trimmed, factors: [...factors] };
	return { ok: true, lines };
}
