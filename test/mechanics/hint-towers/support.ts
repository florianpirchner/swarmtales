/** Shared by the hint-towers and harbor-lights tests: a stateless scripted crew member that follows the status. */
import type { Turn, TurnTaker } from "@swarmtales/contracts";

const SEATS = ["A01", "A02", "A03", "A04"];

export interface TowerScript {
	/** Notes written in a retro window (none: no notes). */
	readonly notes?: (resident: string, game: number) => string;
	/** A team post made in a retro window before the notes. */
	readonly post?: (resident: string) => string;
}

const texts = (turn: Turn): string => turn.inputs.map((note) => note.text).join("\n");

/** A scripted player: in a retro window it posts and writes the notes when told to; plays a surely playable slot, else signals the next seat about its first card's rank, else discards slot 1. */
export function towerPlayer(script: TowerScript = {}): TurnTaker {
	return async (turn) => {
		const told = texts(turn);
		if (told.includes("Retro after game") || told.includes("Before game 1")) {
			if (script.post !== undefined) await turn.call("postTeam", { text: script.post(turn.resident) });
			if (script.notes !== undefined) {
				const game = Number(/Retro after game (\d+)/.exec(told)?.[1] ?? 0);
				await turn.call("writeBrain", { text: script.notes(turn.resident, game) });
			}
			return;
		}
		if (!told.includes("Your turn: one action")) return;
		const sure = /slot (\d+)[^\n]*SURELY PLAYABLE/.exec(told)?.[1];
		if (sure !== undefined) {
			await turn.call("playSlot", { slot: Number(sure) });
			return;
		}
		const index = SEATS.indexOf(turn.resident);
		const next = SEATS[(index + 1) % SEATS.length] ?? "A01";
		const rank = new RegExp(`  ${next}: 1 \\w+ (\\d+)`).exec(told)?.[1];
		if (told.includes("giveSignal") && rank !== undefined && /Signals [1-9]/.test(told) && !told.includes(`[knows ${rank}`)) {
			const outcome = await turn.call("giveSignal", { to: next, about: rank });
			if (outcome.ok) return;
		}
		const discarded = await turn.call("discardSlot", { slot: 1 });
		if (!discarded.ok) await turn.call("playSlot", { slot: 1 });
	};
}

