// SPDX-License-Identifier: Apache-2.0
/**
 * The city slice: the smallest part of the City of Keys that needs talk, a ledger, an exile that knows nothing of
 * points or pieces, a decision with a window, a Director and the Human Hand. Six residents talk and pay each
 * other, the court votes one of them out, the verdict waits two ticks for its holders (the person and the
 * Director `warden`), and when it is carried out the ledger and the puzzles each clear away what the banished
 * resident owned, because they listen to the exile's one event.
 */
import { channels } from "@swarmtales/mechanic-channels";
import { court } from "@swarmtales/mechanic-court";
import { decisions } from "@swarmtales/mechanic-decisions";
import { exile } from "@swarmtales/mechanic-exile";
import { humanHand } from "@swarmtales/mechanic-human-hand";
import { ledger } from "@swarmtales/mechanic-ledger";
import { puzzles } from "@swarmtales/mechanic-puzzles";
import { defineGame } from "@swarmtales/sdk";
import { warden } from "./src/warden.ts";

const RESIDENTS = ["A01", "A02", "A03", "A04", "A05", "A06"];
const fragments = (shortest: number, longest: number, overlap: number): { kind: "fragments"; length: [number, number]; overlap: number } => ({ kind: "fragments", length: [shortest, longest], overlap });

export default defineGame({
	id: "city-slice",
	title: "The city slice",
	seed: 7,
	residents: RESIDENTS,
	mechanics: [
		ledger({ startPoints: 30 }),
		channels(),
		exile(),
		decisions({ holders: ["human", "director:warden"] }),
		humanHand(),
		// Door 1 is passed alone; doors 2 and 3 need the fragment of a teammate. Everyone stands before door 2.
		puzzles({
			levels: [
				{ number: 1, team: { kind: "solo" }, puzzle: fragments(6, 10, 2) },
				{ number: 2, team: { kind: "random", size: 2 }, puzzle: fragments(6, 10, 2) },
				{ number: 3, team: { kind: "sameAs", level: 2 }, puzzle: fragments(12, 14, 3) },
			],
			standings: Object.fromEntries(RESIDENTS.map((id) => [id, { level: 2, passed: [1] }])),
		}),
		// The session is open during ticks 4 and 5; the verdict of tick 6 is carried out at tick 8 unless a holder amends it.
		court({ opensAt: 4, closesAt: 6, window: 2 }),
	],
	directors: [{ use: warden }],
	grants: {
		resident: ["transferPoints", "readBoard", "postBoard", "sendDM", "vote"],
		warden: ["postBoard", "amendDecision"],
		human: ["pause", "resume", "amendDecision"],
	},
	scheduler: { id: "turns", options: { passes: 1, blockSize: 1, activation: "always", order: "seeded", afterBlocks: ["director"] } },
	end: { ticks: 12 },
	model: "anthropic/haiku",
});
