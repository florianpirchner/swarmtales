/**
 * More stand-ins of team T1's tests: providers of other teams' APIs with fixed answers, and drivers
 * that replay what other mechanics did in a golden run (their API calls), so a mechanic's gate
 * can compare the lines it writes with the golden ones.
 */
import { Type } from "typebox";
import type { MechanicUse } from "@swarmtales/contracts";
import { defineMechanic } from "@swarmtales/kernel";
import { ExileApi, ExileEvents, LedgerApi, ProgressionApi, ProgressionEvents, PuzzlesApi, ReceiptsApi, type ReceiptBody } from "@swarmtales/mechanic-shared";
import type { LegacyLine } from "@swarmtales/testkit";

/** A stand-in provider of `ExileApi` for the residents in `gone` and at the gate in `gate` (fixed answers; team T4 carves the real one). */
export function exileStandIn(gone: readonly string[], gate: readonly string[] = []): MechanicUse {
	return defineMechanic(
		{ id: "exile", summary: "Stand-in for the exile mechanic of team T4.", options: Type.Object({}), state: () => undefined, events: { ...ExileEvents.events }, provides: [ExileApi] },
		(kit) => ({
			services: [
				kit.provideSome(ExileApi, {
					isExiled: (input) => gone.includes(input.resident),
					standing: (input) => (gone.includes(input.resident) ? { kind: "exiled" } : gate.includes(input.resident) ? { kind: "gate", until: 99 } : { kind: "alive" }),
					alive: (_input, ctx) => ctx.residents.ids.filter((id) => !gone.includes(id)),
					toGate: () => null,
					strike: () => ({ ok: true }),
				}),
			],
		}),
	).with();
}

/** What the progression stand-in answers: levels per resident, a blame ladder and its counts. */
export interface ProgressionSetup {
	readonly levels?: Readonly<Record<string, number>>;
	readonly ladder?: number | readonly number[];
	readonly act?: number;
}

/** A stand-in provider of the parts of `ProgressionApi` T1 reads (levelOf, currentAct, the blame ladder). */
export function progressionStandIn(setup: ProgressionSetup = {}): { readonly use: MechanicUse; readonly charged: string[]; readonly levels: Record<string, number> } {
	const charged: string[] = [];
	const levels: Record<string, number> = { ...setup.levels };
	const steps = typeof setup.ladder === "number" ? [setup.ladder] : (setup.ladder ?? []);
	const priceAt = (count: number): number => steps[Math.min(count, steps.length) - 1] ?? 0;
	const count = (resident: string): number => charged.filter((who) => who === resident).length;
	const use = defineMechanic(
		{ id: "progression", summary: "Stand-in for the progression mechanic of team T3.", options: Type.Object({}), state: () => undefined, events: { ...ProgressionEvents.events }, provides: [ProgressionApi], uses: [LedgerApi, ExileApi] },
		(kit) => ({
			services: [
				kit.provideSome(ProgressionApi, {
					levelOf: (input) => levels[input.resident] ?? 1,
					currentAct: () => setup.act ?? 1,
					// The old `ranking()`: the exiled last, then points, level and id.
					ranking: (_input, ctx) => {
						const balances = ctx.tryCall(LedgerApi, "balances", {}) ?? {};
						const exiled = (resident: string): number => (ctx.tryCall(ExileApi, "isExiled", { resident }) === true ? 1 : 0);
						const level = (resident: string): number => levels[resident] ?? 1;
						return [...ctx.residents.ids]
							.sort((a, b) => exiled(a) - exiled(b) || (balances[b] ?? 0) - (balances[a] ?? 0) || level(b) - level(a) || a.localeCompare(b))
							.map((agent, index) => ({ agent, rank: index + 1, points: balances[agent] ?? 0, level: level(agent) }));
					},
					nextBlamePenalty: (input) => (steps.length === 0 ? 0 : priceAt(count(input.resident) + 1)),
					chargeBlame: (input) => {
						const price = steps.length === 0 ? 0 : priceAt(count(input.resident) + 1);
						charged.push(input.resident);
						return price;
					},
				}),
			],
		}),
	).with();
	return { use, charged, levels };
}

/** The old `carriesRun` (packages/engine/src/secrets.ts:10-28), the code-like forms of a text and a run of one fragment. */
function codeForms(text: string): readonly string[] {
	const tokens = (text.match(/[A-Za-z0-9]+/g) ?? []).filter((token) => /\d/.test(token)).map((token) => token.toUpperCase());
	const spelled = (text.match(/(?<![A-Za-z0-9])[A-Za-z0-9](?:[ .-]+[A-Za-z0-9](?![A-Za-z0-9]))+/g) ?? []).map((run) => run.replace(/[ .-]+/g, "").toUpperCase());
	return [text, ...tokens, ...spelled];
}

function carriesRun(text: string, secret: string, minRun: number): boolean {
	const forms = codeForms(text);
	for (let start = 0; start + minRun <= secret.length; start++) {
		const run = secret.slice(start, start + minRun);
		if (forms.some((form) => form.includes(run))) return true;
	}
	return false;
}

/** A stand-in provider of `PuzzlesApi.isHandover` (and `carriesSecret` over the same fragments) that reproduces secrets.ts exactly. */
export function puzzlesStandIn(fragments: readonly string[]): MechanicUse {
	return defineMechanic(
		{ id: "puzzles", summary: "Stand-in for the puzzles mechanic of team T3.", options: Type.Object({}), state: () => undefined, events: {}, provides: [PuzzlesApi] },
		(kit) => ({
			services: [
				kit.provideSome(PuzzlesApi, {
					isHandover: (input) => fragments.some((fragment) => fragment.length > 0 && carriesRun(input.text, fragment, Math.min(3, fragment.length))),
					carriesSecret: (input) => fragments.some((fragment) => carriesRun(input.text, fragment, input.minRun)),
					passwordPiece: () => false,
				}),
			],
		}),
	).with();
}

/**
 * A driver that books what the golden run's other mechanics booked: at the start of each minute it
 * calls `mint`, `burn` or `move` for every golden `ledger_entry` of that minute (the start points
 * excluded, the ledger mints those itself). The golden logs hold no `transfer`: the transfer tool is
 * proved against the old engine in `ledger-differential.test.ts`.
 */
export function ledgerReplay(golden: readonly LegacyLine[]): MechanicUse {
	const lines = golden.filter((line) => line.type === "ledger_entry" && line.reason !== "start points");
	return defineMechanic(
		{ id: "replay", summary: "Replays the golden run's ledger bookings.", options: Type.Object({}), state: () => undefined, events: {}, requires: [LedgerApi] },
		() => ({
			hooks: {
				minuteStarted: (ctx) => {
					for (const line of lines) {
						if (line.minute !== ctx.minute) continue;
						const { debit, credit, amount, reason } = line;
						if (typeof debit !== "string" || typeof credit !== "string" || typeof amount !== "number" || typeof reason !== "string") throw new Error("a golden ledger_entry without its fields");
						if (debit === "SYSTEM_MINT_BURN") ctx.call(LedgerApi, "mint", { account: credit, amount, reason });
						else if (credit === "SYSTEM_MINT_BURN") ctx.call(LedgerApi, "burn", { account: debit, amount, reason });
						else ctx.call(LedgerApi, "move", { from: debit, to: credit, amount, reason });
					}
				},
			},
		}),
	).with();
}

/**
 * Issues, at the start of each minute, the receipts the golden run's issuers issued then, as they
 * call `ReceiptsApi.issue`: progression for a solved level (agent and reward from the `ledger_entry`
 * "level N solved" the golden run booked, never from the receipt's text) and channels for a
 * delivered DM (`dm_delivered`, quoting the golden `dm_sent` text when `quote`). Golden order.
 */
export function receiptIssuers(golden: readonly LegacyLine[], quote: boolean): MechanicUse {
	const texts = new Map(golden.filter((line) => line.type === "dm_sent").map((line) => [line.number, line.text]));
	const calls = golden.flatMap((line): { readonly minute: number; readonly body: ReceiptBody }[] => {
		if (line.type === "ledger_entry" && typeof line.reason === "string" && /^level \d+ solved$/.test(line.reason)) {
			const level = Number(line.reason.split(" ")[1]);
			return typeof line.credit === "string" && typeof line.amount === "number" ? [{ minute: Number(line.minute), body: { kind: "levelUp" as const, agent: line.credit, level, reward: line.amount } }] : [];
		}
		if (line.type === "dm_delivered" && typeof line.from === "string" && typeof line.to === "string" && typeof line.number === "number") {
			const text = texts.get(line.number);
			return [{ minute: Number(line.minute), body: { kind: "dm" as const, from: line.from, to: line.to, number: line.number, ...(quote && typeof text === "string" ? { text } : {}) } }];
		}
		return [];
	});
	return defineMechanic(
		{ id: "issuer", summary: "Stand-in for the issuers of team T3 (progression) and T2 (channels).", options: Type.Object({}), state: () => undefined, events: {}, requires: [ReceiptsApi] },
		() => ({
			hooks: {
				minuteStarted: (ctx) => {
					for (const call of calls) if (call.minute === ctx.minute) ctx.call(ReceiptsApi, "issue", { body: call.body });
				},
			},
		}),
	).with();
}
