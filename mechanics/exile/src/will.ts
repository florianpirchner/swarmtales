// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The last will at the gate, carried from the old `exile` (`will.ts`): once, points and held pieces to heirs at once.
 * The points each heir receives are capped at the gate's `bequestPerHeir` share of the balance; any number of heirs,
 * and what is not bequeathed burns at the exile. The public text is posted when the gate closes. The pieces are not
 * the exile's: the owner of the pieces refuses a piece the resident does not hold in its own `rule` handler, and
 * delivers each piece it holds when it hears `last_will` (12-m5-spec.md 2.2, patterns 2 and 3). The fake driver
 * (`--fake`) writes a short will now and then at its own gate (`sampleLastWill`), and draws nothing elsewhere.
 */
import type { RandomSource, ToolOutcome } from "@swarmtales/contracts";
import { refuse, reply } from "@swarmtales/sdk";
import { ExilePurseService } from "./contract.ts";
import { balanceOf, gateOf, isGone, namesOf, notify, refused, resolved, shown } from "./gate.ts";
import type { ExileToolCtx } from "./head.ts";

const MAX_WILL_LENGTH = 600;
/** The share of the times the sample of `lastWill` is asked in which it gives a call: a gate is open for a few ticks only. */
const SAMPLE_RATE = 0.25;
const WILLS = ["I leave the city what I could not spend.", "Remember who sent me to the gate."];

// One bequest of a last will: points, or one piece (old `Bequest`).
type Bequest = { readonly to: string; readonly points: number } | { readonly to: string; readonly factor: string };

/**
 * One entry of the tool's `bequests`: points, a piece, or both.
 *
 * @public
 */
export interface BequestEntry {
	/** The heir, resolved to its id. */
	readonly to: string;
	/** The points; 0 or left out: none. */
	readonly points?: number;
	/** The id of a piece. */
	readonly factor?: string;
}

// The tool's own split: an entry may carry points, a piece, or both; undefined for an entry with neither.
function bequestsOf(entries: readonly BequestEntry[]): readonly Bequest[] | undefined {
	const parsed: Bequest[] = [];
	for (const entry of entries) {
		const points = entry.points ?? 0;
		if (points === 0 && entry.factor === undefined) return undefined;
		if (points > 0) parsed.push({ to: entry.to, points });
		if (entry.factor !== undefined) parsed.push({ to: entry.to, factor: entry.factor });
	}
	return parsed;
}

// The checks of one bequest in the old order; the piece the resident holds is checked by the pieces' owner.
function bequestRefusal(ctx: ExileToolCtx, agent: string, bequest: Bequest, factors: Set<string>): ToolOutcome | undefined {
	if (!ctx.residents.has(bequest.to) || isGone(ctx.state, bequest.to)) return refused(ctx, "UNKNOWN_AGENT", bequest.to);
	if (bequest.to === agent) return refused(ctx, "INVALID_BEQUEST", "you cannot inherit from yourself");
	if ("points" in bequest) return Number.isInteger(bequest.points) && bequest.points > 0 ? undefined : refused(ctx, "INVALID_BEQUEST", "points must be a positive integer");
	if (factors.has(bequest.factor)) return refused(ctx, "INVALID_BEQUEST", `${bequest.factor} is bequeathed twice`);
	factors.add(bequest.factor);
	return undefined;
}

// The points to each heir against the balance and the cap (old `BEQUEST_CAP`); undefined when the will may stand.
function pointsRefusal(ctx: ExileToolCtx, agent: string, bequests: readonly Bequest[], share: number): ToolOutcome | undefined {
	const perHeir = new Map<string, number>();
	for (const bequest of bequests) if ("points" in bequest) perHeir.set(bequest.to, (perHeir.get(bequest.to) ?? 0) + bequest.points);
	const points = [...perHeir.values()].reduce((sum, amount) => sum + amount, 0);
	const balance = balanceOf(ctx, agent);
	if (points > balance) return refused(ctx, "INSUFFICIENT_FUNDS", `you hold ${String(balance)} points`);
	const cap = Math.max(0, Math.floor(balance * share));
	const over = [...perHeir].filter(([, amount]) => amount > cap).map(([heir]) => heir);
	if (over.length === 0) return undefined;
	return refused(
		ctx,
		"BEQUEST_CAP",
		`each heir may receive at most ${String(cap)} of your ${String(balance)} points (${String(Math.round(share * 100))}% per heir); ` +
			`${namesOf(over)} would receive more. Leave points to more heirs; whatever you do not bequeath burns at exile`,
	);
}

/**
 * The tool `lastWill` (old `World.lastWill`): the checks in the old order, then the bequests, `last_will` and the will
 * kept at the gate.
 *
 * @param ctx - The context of the tool.
 * @param agent - The resident at the gate.
 * @param text - The public text.
 * @param entries - The bequests as the resident wrote them.
 * @returns The reply, or the refusal.
 */
export function lastWill(ctx: ExileToolCtx, agent: string, text: string, entries: readonly BequestEntry[]): ToolOutcome {
	const parsed = bequestsOf(entries.map((entry) => ({ ...entry, to: resolved(ctx, entry.to) })));
	if (parsed === undefined) return refuse("INVALID_BEQUEST", ctx.prompt("exile/replies/will-invalid", {}));
	const gate = gateOf(ctx.state, agent);
	if (gate === undefined) return refused(ctx, "NOT_AT_GATE", "only a resident at the gate leaves a will");
	if (gate.will !== undefined) return refused(ctx, "WILL_DONE", "your will is written; it cannot be changed");
	const trimmed = text.trim();
	if (trimmed.length === 0 || trimmed.length > MAX_WILL_LENGTH) return refused(ctx, "INVALID_TEXT", `1-${String(MAX_WILL_LENGTH)} characters`);
	const factors = new Set<string>();
	for (const bequest of parsed) {
		const refusal = bequestRefusal(ctx, agent, bequest, factors);
		if (refusal !== undefined) return refusal;
	}
	const over = pointsRefusal(ctx, agent, parsed, gate.bequestPerHeir);
	if (over !== undefined) return over;
	const lines = parsed.map((bequest) => {
		if (!("points" in bequest)) return `${bequest.factor} to ${bequest.to}`;
		ctx.tryCall(ExilePurseService, "move", { from: agent, to: bequest.to, amount: bequest.points, reason: `last will of ${agent}` });
		notify(ctx, bequest.to, ctx.prompt("exile/will-points", { agent, points: bequest.points }));
		return `${String(bequest.points)} points to ${bequest.to}`;
	});
	ctx.emit("last_will", { agent, text: trimmed, bequests: parsed.map((bequest) => ("points" in bequest ? { to: bequest.to, points: bequest.points } : { to: bequest.to, factor: bequest.factor })) });
	gate.will = { text: trimmed, factors: [...factors] };
	return reply(shown(ctx, `${ctx.prompt("exile/replies/will-written", {})}${lines.length === 0 ? "" : ` · ${lines.join(" · ")}`}`));
}

/**
 * The last will of a resident at the gate that has written none: a short public text and, when the gate's share per
 * heir gives a point, that share to one heir drawn from the residents that may act.
 *
 * @param ctx - The context of the tool call.
 * @param random - The fake driver's random stream.
 * @returns The params, or undefined most of the time and for a caller that is not at the gate or wrote its will.
 */
export function sampleLastWill(ctx: ExileToolCtx, random: RandomSource): { text: string; bequests: { to: string; points: number }[] } | undefined {
	const self = ctx.resident;
	const gate = self === undefined ? undefined : gateOf(ctx.state, self);
	if (self === undefined || gate === undefined || gate.will !== undefined || random.next() >= SAMPLE_RATE) return undefined;
	const text = random.pick(WILLS);
	const heirs = ctx.residents.ids.filter((id) => id !== self && ctx.residents.mayAct(id) && !isGone(ctx.state, id));
	const points = Math.floor(balanceOf(ctx, self) * gate.bequestPerHeir);
	return heirs.length === 0 || points < 1 ? { text, bequests: [] } : { text, bequests: [{ to: random.pick(heirs), points }] };
}
