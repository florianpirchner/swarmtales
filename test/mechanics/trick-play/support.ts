/** Shared by the trick-play and ember-tricks tests: a stateless scripted player that follows the table status. */
import type { CoreStory, EventEnvelope, Turn, TurnTaker } from "@swarmtales/contracts";
import { cardTable } from "@swarmtales/mechanic-card-table";
import { trickPlay } from "@swarmtales/mechanic-trick-play";

export const SEATS = ["A01", "A02", "A03", "A04"] as const;

const texts = (turn: Turn): string => turn.inputs.map((note) => note.text).join("\n");

export interface ScriptOptions {
	/** The bid for a hand of `cards` cards (default: one in four, rounded down). */
	readonly bid?: (cards: number, resident: string) => number;
	/** Seats that veto whenever they may. */
	readonly vetoers?: readonly string[];
	/** Notes written in a retro window (none: no notes). */
	readonly notes?: (resident: string, game: number) => string;
}

/** Reads its turn's table status (or `viewTable`), bids, names the first suit of its hand and plays the first legal card. */
export function trickPlayer(script: ScriptOptions = {}): TurnTaker {
	return async (turn) => {
		const told = texts(turn);
		if (script.notes !== undefined && (told.includes("Retro after game") || told.includes("Before game 1"))) {
			const game = Number(/Retro after game (\d+)/.exec(told)?.[1] ?? 0);
			await turn.call("writeBrain", { text: script.notes(turn.resident, game) });
			return;
		}
		const status = told.includes("Your turn") || told.includes("lowest bid") ? told : await viewTable(turn);
		const bid = /placeBid with 0 to (\d+)/.exec(status)?.[1];
		if (bid !== undefined) {
			await turn.call("placeBid", { tricks: script.bid?.(Number(bid), turn.resident) ?? Math.floor(Number(bid) / 4) });
			return;
		}
		if (status.includes("name the trump")) {
			const suit = /Your hand: (\w+):/.exec(status)?.[1] ?? "Ash";
			await turn.call("nameTrump", { suit });
			return;
		}
		if (status.includes("vetoLead") && script.vetoers?.includes(turn.resident) === true) {
			await turn.call("vetoLead", {});
			return;
		}
		const legal = /Legal now: ([^.]+)\./.exec(status)?.[1]?.split(", ")[0];
		if (legal !== undefined) await turn.call("playCard", { card: legal });
	};
}

async function viewTable(turn: Turn): Promise<string> {
	const view = await turn.call("viewTable", {});
	return view.ok ? view.reply : "";
}

export function trickStory(options: Partial<Parameters<typeof trickPlay.with>[0]> = {}): CoreStory {
	return {
		id: "trick-play-test",
		seed: 5,
		minutes: 120,
		residents: [...SEATS],
		mechanics: [cardTable.with({ seats: [...SEATS] }), trickPlay.with({ games: 2, rounds: [1, 2, 3], ...options })],
		grants: "auto",
		turns: { passes: 6, activation: "onNews", order: (view) => view.residents },
	};
}

export const ofType = (events: readonly EventEnvelope[], type: string): readonly EventEnvelope[] => events.filter((event) => event.type === type);

export function field(event: EventEnvelope, key: string): unknown {
	const payload = event.payload;
	return typeof payload === "object" && payload !== null ? Reflect.get(payload, key) : undefined;
}
