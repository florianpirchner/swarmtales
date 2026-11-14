// SPDX-License-Identifier: Apache-2.0
/** Shared by the ledger tests: the game, a stand-in for the exile, and readers of the log and of the saved slice. */
import type { Envelope, Kernel } from "@swarmtales/contracts";
import { defineGame, defineHead, defineMechanic, type Game, type MechanicUse } from "@swarmtales/sdk";
import { ledger } from "../src/index.ts";

/** Suspends the residents when the run starts, as the exile does after a verdict. */
export function exileStandIn(residents: readonly string[]): MechanicUse {
	return defineMechanic(defineHead({ id: "exile-stand-in", package: "@test/exile-stand-in", summary: "Test: suspends residents." }), {
		hooks: {
			runStarted: (ctx) => {
				for (const resident of residents) ctx.residents.suspend(resident, "exiled");
			},
		},
	})();
}

/** Four residents with 10 start points each; `A04` is exiled. */
export function ledgerGame(extra: readonly MechanicUse[] = [exileStandIn(["A04"])], options: Parameters<typeof ledger>[0] = {}): Game {
	return defineGame({
		id: "ledger-test",
		seed: 7,
		residents: ["A01", "A02", "A03", "A04"],
		mechanics: [ledger({ startPoints: 10, ...options }), ...extra],
		scheduler: { id: "turns", options: { passes: 1, activation: "always", order: "roster" } },
		end: { ticks: 3 },
	});
}

/** The events the ledger wrote, as `[type, payload]`, without the start points. */
export function written(events: readonly Envelope[]): readonly (readonly [string, unknown])[] {
	return events.filter((event) => event.source.endsWith("/ledger") && !JSON.stringify(event.payload).includes("start points")).map((event) => [event.type, event.payload]);
}

/** The sum of every balance in the saved slice, the system account included: 0 while the limit `zero-sum` holds. */
export function total(kernel: Kernel): number {
	const data: unknown = JSON.parse(JSON.stringify(kernel.snapshot().plugins.ledger ?? null));
	const balances: unknown = typeof data === "object" && data !== null ? Reflect.get(Reflect.get(data, "data") ?? data, "balances") : undefined;
	if (!Array.isArray(balances) || balances.length === 0) return Number.NaN;
	return balances.reduce((sum: number, entry: unknown) => sum + Number(typeof entry === "object" && entry !== null ? Reflect.get(entry, "balance") : Number.NaN), 0);
}
