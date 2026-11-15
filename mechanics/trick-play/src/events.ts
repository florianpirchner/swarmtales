// SPDX-License-Identifier: Apache-2.0
import { Type } from "typebox";
import { defineEvents } from "@swarmtales/sdk";
import { PlaySchema } from "./model.ts";

const Scores = Type.Record(Type.String(), Type.Integer());
const Forfeit = Type.Boolean({ description: "True when the move timer acted for the seat (a random legal choice), not the seat itself." });

/**
 * The events of trick play, declared apart so listeners (the strategy brain, a reference listener) need no value import of the mechanic.
 *
 * @public
 */
export const TrickPlayEvents = defineEvents("trick-play", {
	game_started: Type.Object({
		game: Type.Integer({ description: "The game's number in the match, from 1." }),
		seats: Type.Array(Type.String()),
		startingSide: Type.String({ description: "The seat that bids and leads first in the game's first round." }),
	}),
	round_started: Type.Object({
		game: Type.Integer(),
		round: Type.Integer({ description: "The round of the game, from 1." }),
		cards: Type.Integer({ description: "Cards dealt to each seat." }),
		dealer: Type.String(),
		order: Type.Array(Type.String(), { description: "Bidding order; the first seat also leads the first trick." }),
	}),
	bid_placed: Type.Object({ game: Type.Integer(), round: Type.Integer(), seat: Type.String(), bid: Type.Integer(), forfeit: Forfeit }),
	trump_named: Type.Object({ game: Type.Integer(), round: Type.Integer(), seat: Type.String(), suit: Type.String(), forfeit: Forfeit }),
	lead_vetoed: Type.Object({ game: Type.Integer(), round: Type.Integer(), trick: Type.Integer(), seat: Type.String({ description: "Who spent the veto token." }), leader: Type.String(), suit: Type.String() }),
	card_played: Type.Object({ game: Type.Integer(), round: Type.Integer(), trick: Type.Integer(), seat: Type.String(), card: Type.String(), forfeit: Forfeit }),
	trick_won: Type.Object({ game: Type.Integer(), round: Type.Integer(), trick: Type.Integer(), seat: Type.String(), plays: Type.Array(PlaySchema) }),
	round_scored: Type.Object({
		game: Type.Integer(),
		round: Type.Integer(),
		trump: Type.Union([Type.String(), Type.Null()]),
		bids: Scores,
		tricks: Scores,
		points: Scores,
		totals: Scores,
	}),
	game_ended: Type.Object({ game: Type.Integer(), result: Type.String({ description: "The seat with the most points; several joined by '+' on a tie." }), totals: Scores }),
	match_ended: Type.Object({
		wins: Scores,
		points: Type.Record(Type.String(), Type.Integer(), { description: "Every seat's points summed over the match's games." }),
		invalid: Type.Optional(Type.Boolean({ description: "True when the match was ended as invalid (too many forfeits in a row); no result." })),
	}),
});
