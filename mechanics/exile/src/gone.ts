/**
 * Leaving the city: the gate the tribunal opens (old `Tribunal#close`, the gate part), the gate
 * closing behind an unpaid resident (`#closeGate`), the strikes of the seal (`Tribunal.strike`) and
 * of the holdout tribunal (world.ts `#onStruck`), and what an exile through the gate or the seal
 * does to the city (world.ts `#onExiled`), each in the old order.
 */
import { ChannelsApi, GoalsApi, LedgerApi, ProgressionApi, PuzzlesApi, SealApi, StandoffApi, TribunalApi, type Done, type HeldPiece } from "@swarmtales/mechanic-shared";
import type { ApiInput } from "@swarmtales/contracts";
import type { ExileCtx } from "./head.ts";
import { gateOf, isGone, namesOf, type Gate, type GoneBy } from "./state.ts";

export const CITY = "CITY";

/** Why the exile suspends a resident (`resident_suspended`). */
const SUSPENSION = "exiled";

type TextKey = ApiInput<typeof TribunalApi, "text">["key"];

/** One of the tribunal's texts; the exile writes these only while a tribunal is loaded (gates come from it). */
export function tribunalText(ctx: ExileCtx, key: TextKey, values: Readonly<Record<string, string>>): string {
	const text = ctx.tryCall(TribunalApi, "text", { key, values });
	if (text === undefined) throw new Error(`exile: the text "${key}" needs a loaded tribunal`);
	return text;
}

function post(ctx: ExileCtx, text: string): void {
	ctx.call(ChannelsApi, "post", { author: CITY, text });
}

/** `ExileApi.toGate`: the gate opens (old `Tribunal#close`): set, the resident notified, then `exile_gate`. */
export function toGate(ctx: ExileCtx, input: { resident: string; until: number; ransomable: boolean; voters: readonly string[]; price: number; selfPrice: number }): void {
	const { resident, until, ransomable, voters, price, selfPrice } = input;
	const gate: Gate = { resident, since: ctx.minute, until, ransomable, voters: [...voters], price, selfPrice, payments: [], will: undefined };
	const at = ctx.state.gates.findIndex((entry) => entry.resident === resident);
	if (at < 0) ctx.state.gates.push(gate);
	else ctx.state.gates.splice(at, 1, gate);
	const values = { voters: namesOf(voters), until: String(until), price: String(price), selfPrice: String(selfPrice) };
	ctx.call(ChannelsApi, "notify", { to: resident, author: CITY, text: tribunalText(ctx, ransomable ? "gateNotice" : "gateNoticeFinal", values) });
	ctx.emit("exile_gate", { agent: resident, until, ransomable, voters: [...voters], price, selfPrice });
}

function leave(ctx: ExileCtx, resident: string, by: GoneBy): void {
	ctx.state.gone.push({ resident, by, minute: ctx.minute });
}

/** The gates whose time is up close, in the order they opened (the tribunal's tick, before its sessions close). */
export function closeGates(ctx: ExileCtx): void {
	for (const gate of [...ctx.state.gates]) if (ctx.minute >= gate.until) closeGate(ctx, gate);
}

/** Old `#closeGate`: struck from the register, the board told (with the will's text), then the exile's effects. */
function closeGate(ctx: ExileCtx, gate: Gate): void {
	ctx.state.gates.splice(ctx.state.gates.indexOf(gate), 1);
	leave(ctx, gate.resident, "tribunal");
	post(ctx, tribunalText(ctx, "exiled", { exiled: gate.resident }));
	const will = gate.will;
	if (will !== undefined) post(ctx, tribunalText(ctx, "will", { exiled: gate.resident, will: will.text }));
	ctx.emit("exiled", { agent: gate.resident, ...(will === undefined ? {} : { will: will.text }) });
	ctx.residents.suspend(gate.resident, SUSPENSION);
	onExiled(ctx, gate.resident, new Set(will?.factors ?? []));
}

/**
 * `ExileApi.strike`. The seal (old `Tribunal.strike`): the resident leaves at once, at the gate it
 * simply leaves earlier and what its will bequeathed stays with the heirs; the exile's effects follow.
 * The holdout tribunal (old `#onStruck`): no gate, no will, no ransom; the points stay on the
 * ledger, the goal is void and a seal it bore is gone. The holdout's notices to the residents before
 * an open door are the holdout tribunal's own, after this call.
 */
export function strike(ctx: ExileCtx, resident: string, by: "seal" | "holdout"): Done {
	if (by === "seal") {
		if (ctx.state.gone.some((entry) => entry.resident === resident && entry.by !== "holdout")) return { ok: false, code: "ALREADY_EXILED", detail: `${resident} has left the city already` };
		const gate = gateOf(ctx.state, resident);
		const bequeathed = new Set(gate?.will?.factors ?? []);
		if (gate !== undefined) ctx.state.gates.splice(ctx.state.gates.indexOf(gate), 1);
		leave(ctx, resident, "seal");
		ctx.emit("exiled", { agent: resident, by: "seal" });
		ctx.residents.suspend(resident, SUSPENSION);
		onExiled(ctx, resident, bequeathed);
		return { ok: true };
	}
	if (ctx.state.gone.some((entry) => entry.resident === resident && entry.by === "holdout")) return { ok: false, code: "ALREADY_EXILED", detail: `${resident} has left the city already` };
	leave(ctx, resident, "holdout");
	ctx.emit("exiled", { agent: resident, by: "holdout" });
	ctx.residents.suspend(resident, SUSPENSION);
	ctx.tryCall(GoalsApi, "onExiled", { resident });
	ctx.tryCall(SealApi, "onExiled", { resident });
	return { ok: true };
}

/**
 * Old `#onExiled`: the points left are gone, every piece the exiled held and did not bequeath goes
 * to the city (a certificate or counter-factor, sold to its needers) or burns (a fragment, logged
 * for whoever still needs it), its goal is void, a seal it bore is gone, and on every level no
 * remaining resident has reached the exiled's roles pass on.
 */
function onExiled(ctx: ExileCtx, agent: string, bequeathed: ReadonlySet<string>): void {
	const balance = ctx.call(LedgerApi, "balance", { account: agent });
	const alive = ctx.residents.ids.filter((id) => !isGone(ctx.state, id));
	const levels = new Map(alive.map((id) => [id, ctx.call(ProgressionApi, "levelOf", { resident: id })]));
	const unreached = (level: number): boolean => !alive.some((id) => (levels.get(id) ?? 0) >= level);
	const kept: HeldPiece[] = [];
	for (const piece of ctx.call(PuzzlesApi, "heldPieces", { resident: agent })) {
		if (bequeathed.has(piece.id) || unreached(piece.level)) continue;
		const needers = piece.needers.filter((id) => !isGone(ctx.state, id) && !ctx.call(ProgressionApi, "hasPassed", { resident: id, level: piece.level }));
		if (needers.length === 0) continue;
		// P43: with a tribunal the city keeps a certificate or counter-factor and sells it to its needers; the old world
		// burned them only without one, and only a tribunal's gate or the seal (which needs one) gets here.
		if (piece.kind !== "fragment") kept.push({ ...piece, needers });
		else ctx.call(PuzzlesApi, "burn", { agent, level: piece.level, piece: piece.id, needers });
	}
	if (kept.length > 0) ctx.call(StandoffApi, "keep", { from: agent, pieces: kept });
	if (balance > 0) ctx.call(LedgerApi, "burn", { account: agent, amount: balance, reason: `exiled ${agent}` });
	ctx.tryCall(GoalsApi, "onExiled", { resident: agent });
	ctx.tryCall(SealApi, "onExiled", { resident: agent });
	const exiled = ctx.residents.ids.filter((id) => isGone(ctx.state, id));
	const { startLevel, lastLevel } = ctx.call(ProgressionApi, "bounds", {});
	for (let level = startLevel; level <= lastLevel; level++) {
		if (unreached(level)) ctx.call(PuzzlesApi, "contract", { level, excluded: exiled });
	}
}

/** A gate of an old snapshot without prices gets the city's prices now (old `restore` set them from the balances). */
export function fillLegacyPrices(ctx: ExileCtx): void {
	for (const gate of ctx.state.gates) {
		if (gate.price !== undefined && gate.selfPrice !== undefined) continue;
		const prices = ctx.tryCall(TribunalApi, "ransomPrices", {});
		if (prices === undefined) throw new Error(`exile: the gate of ${gate.resident} has no prices and no tribunal sets them`);
		gate.price = prices.price;
		gate.selfPrice = prices.selfPrice;
	}
}
