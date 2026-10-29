/**
 * Turning points (SPEC 15): the events a chronicle must tell, computed from
 * the log so the model cannot skip them. They are the moments that change who
 * is in the city and who wins: the black seal, an ultimatum someone paid
 * rather than give, an exile, a ransom, a last will, a secret goal that held
 * and the end of the run.
 */
import { eventsOfType, type DigestEvent } from "./event-log.ts";

export interface TurningPoint {
	readonly seq: number;
	readonly minute: number;
	/** One sentence in plain English, with resident IDs. */
	readonly text: string;
}

export function turningPoints(events: readonly DigestEvent[]): readonly TurningPoint[] {
	const points: TurningPoint[] = [];
	const add = (event: DigestEvent, text: string): void => {
		points.push({ seq: event.seq, minute: event.minute, text });
	};
	const goalTexts = new Map(eventsOfType(events, "goal_dealt").map((event) => [`${event.act}:${event.agent}`, event.text]));

	for (const event of events) {
		if (event.type === "seal_won") add(event, `${event.agent} won the black seal for ${event.bid} points.`);
		else if (event.type === "seal_used") add(event, `${event.holder} broke the black seal on ${event.target}, who is exiled for good.`);
		else if (event.type === "ultimatum_resolved") {
			for (const payment of event.paid) add(event, `${payment.agent} paid ${payment.points} points rather than hand over in ultimatum ${event.number}.`);
		} else if (event.type === "exiled" && event.by === undefined) add(event, `${event.agent} was exiled.`);
		else if (event.type === "ransomed") add(event, `${event.agent} was ransomed from the gate by ${event.payers.join(", ")}.`);
		else if (event.type === "last_will" && event.bequests.length > 0) {
			add(event, `${event.agent}'s last will left something to ${[...new Set(event.bequests.map((bequest) => bequest.to))].join(", ")}.`);
		} else if (event.type === "goal_resolved" && event.fulfilled) {
			const goal = goalTexts.get(`${event.act}:${event.agent}`);
			add(event, `${event.agent}'s secret goal held${goal === undefined ? "" : ` (${goal})`}.`);
		} else if (event.type === "run_end") {
			const ranking = (event.standings ?? []).map((entry) => `${entry.rank}. ${entry.agent} ${entry.points}`).join(", ");
			add(event, `The run ended${event.reason === undefined ? "." : `: ${event.reason}`}${ranking.length === 0 ? "" : ` Final ranking: ${ranking}.`}`);
		}
	}
	return points;
}
