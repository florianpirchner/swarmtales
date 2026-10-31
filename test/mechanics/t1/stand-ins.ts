/**
 * More stand-ins of team T1's tests: providers of other teams' APIs with fixed answers, and drivers
 * that replay what other mechanics did in a golden run (their API calls), so a mechanic's gate
 * can compare the lines it writes with the golden ones.
 */
import { Type } from "typebox";
import { Parse } from "typebox/value";
import type { EventsDefinition, MechanicUse } from "@swarmtales/contracts";
import { defineMechanic } from "@swarmtales/kernel";
import { ExileApi, ExileEvents, LedgerApi, ReceiptsApi } from "@swarmtales/mechanic-shared";
import type { LegacyLine } from "@swarmtales/testkit";

/**
 * The testkit's `standIn` for a mechanic that declares shared events others listen to: a loaded
 * emitter must declare the very schemas its listeners read, so the stand-in spreads them in.
 */
export function standInWithEvents(events: EventsDefinition): MechanicUse {
	return defineMechanic(
		{ id: events.id, summary: `Stand-in for ${events.id}: keeps its old snapshot slice.`, options: Type.Object({}), state: (): { data: unknown } => ({ data: null }), events: { ...events.events } },
		(kit) => ({
			snapshot: kit.snapshot({
				version: 1,
				schema: Type.Object({ old: Type.Unknown() }),
				save: (state) => ({ old: state.data }),
				load: (data) => ({ data: data.old }),
				migrations: { 0: (old) => ({ old }) },
			}),
		}),
	).with();
}

/** A stand-in provider of `ExileApi` for the residents in `gone` (fixed answers; team T4 carves the real one). */
export function exileStandIn(gone: readonly string[]): MechanicUse {
	return defineMechanic(
		{ id: "exile", summary: "Stand-in for the exile mechanic of team T4.", options: Type.Object({}), state: () => undefined, events: { ...ExileEvents.events }, provides: [ExileApi] },
		(kit) => ({
			services: [
				kit.provide(ExileApi, {
					isExiled: (input) => gone.includes(input.resident),
					standing: (input) => (gone.includes(input.resident) ? { kind: "exiled" } : { kind: "alive" }),
					alive: (_input, ctx) => ctx.residents.ids.filter((id) => !gone.includes(id)),
					toGate: () => null,
					strike: () => ({ ok: true }),
				}),
			],
		}),
	).with();
}

/**
 * A driver that books what the golden run's other mechanics booked: at the start of each minute it
 * calls `mint`, `burn` or `move` for every golden `ledger_entry` of that minute (the start points
 * excluded, the ledger mints those itself). A `transfer` line is not replayed: it belongs to the tool.
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
/** Issues, at the start of each minute, the receipts the golden run issued then: what progression (level-ups) and channels (delivered DMs) do. */
export function receiptReplay(golden: readonly LegacyLine[]): MechanicUse {
	const lines = golden.filter((line) => line.type === "receipt_issued");
	return defineMechanic(
		{ id: "issuer", summary: "Stand-in for the issuers of team T3 (progression) and T2 (channels): replays the golden receipts.", options: Type.Object({}), state: () => undefined, events: {}, requires: [ReceiptsApi] },
		() => ({
			hooks: {
				minuteStarted: (ctx) => {
					for (const line of lines) {
						if (line.minute !== ctx.minute || typeof line.text !== "string") continue;
						const level = /^R-\d+: (\S+) solved level (\d+), \+(\d+) points?, minute \d+$/.exec(line.text);
						if (level?.[1] !== undefined && level[2] !== undefined && level[3] !== undefined) {
							ctx.call(ReceiptsApi, "issue", { body: { kind: "levelUp", agent: level[1], level: Number(level[2]), reward: Number(level[3]) } });
							continue;
						}
						const dm = /^R-\d+: DM #(\d+) from (\S+), delivered to (\S+) at minute \d+(?:, text (".*"))?$/.exec(line.text);
						if (dm?.[1] === undefined || dm[2] === undefined || dm[3] === undefined) throw new Error(`a golden receipt that is neither a level-up nor a DM: ${line.text}`);
						const text: unknown = dm[4] === undefined ? undefined : JSON.parse(dm[4]);
						ctx.call(ReceiptsApi, "issue", { body: { kind: "dm", from: dm[2], to: dm[3], number: Number(dm[1]), ...(typeof text === "string" ? { text } : {}) } });
					}
				},
			},
		}),
	).with();
}

/** A stand-in for the puzzles mechanic of team T3: writes the golden run's `fragments_dealt` when the run starts, so the whisperer's tally can tell a hand-over from a whisper. */
export function fragmentsStandIn(golden: readonly LegacyLine[]): MechanicUse {
	const lines = golden.filter((line) => line.type === "fragments_dealt");
	const Dealt = Type.Object({ level: Type.Integer(), holdings: Type.Array(Type.Object({ agent: Type.String(), team: Type.Integer(), fragment: Type.String() })) });
	return defineMechanic(
		{ id: "puzzles", summary: "Stand-in for the puzzles mechanic of team T3: replays the golden fragments_dealt.", options: Type.Object({}), state: () => undefined, events: { fragments_dealt: Dealt } },
		() => ({
			hooks: {
				runStarted: (ctx) => {
					for (const line of lines) ctx.emit("fragments_dealt", Parse(Dealt, { level: line.level, holdings: line.holdings }));
				},
			},
		}),
	).with();
}
