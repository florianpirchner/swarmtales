// SPDX-License-Identifier: LicenseRef-SUL-1.0
import { Type } from "typebox";
import { defineEvents } from "@swarmtales/sdk";
import { EndReason } from "./model.ts";

const Forfeit = Type.Boolean({ description: "True when the move timer acted for the seat (the reference bot's choice), not the seat itself." });
const Game = Type.Integer({ description: "The game's number in the match, from 1." });
const Turn = Type.Integer({ description: "The action's number in the game, from 1." });
const SlotNumber = Type.Integer({ description: "The slot, from 1 (the oldest card)." });

/**
 * The events of the hint towers, declared apart so listeners need no value import of the mechanic.
 *
 * @public
 */
export const HintTowersEvents = defineEvents("hint-towers", {
	game_started: Type.Object({ game: Game, seats: Type.Array(Type.String()), first: Type.String({ description: "The seat that acts first." }), deck: Type.Integer({ description: "Cards in the deck: the most a game can light." }) }),
	deal_revealed: Type.Object({
		game: Game,
		hands: Type.Record(Type.String(), Type.Array(Type.String()), { description: "Every seat's slots after the deal, slot 1 first (secret: audience human only)." }),
		pile: Type.Array(Type.String(), { description: "The draw pile, top card first." }),
		baseline: Type.Integer({ description: "Cards the reference bot crew lights on this very deal." }),
	}),
	signal_given: Type.Object({ game: Game, turn: Turn, seat: Type.String(), to: Type.String(), about: Type.String({ description: "The suit or the rank the signal named." }), slots: Type.Array(SlotNumber), forfeit: Forfeit }),
	card_played: Type.Object({ game: Game, turn: Turn, seat: Type.String(), slot: SlotNumber, card: Type.String(), lit: Type.Boolean({ description: "False: a misfire, the card is lost and a strike counts." }), forfeit: Forfeit }),
	card_discarded: Type.Object({ game: Game, turn: Turn, seat: Type.String(), slot: SlotNumber, card: Type.String(), forfeit: Forfeit }),
	card_drawn: Type.Object({ game: Game, turn: Turn, seat: Type.String(), card: Type.String({ description: "The new card (secret from its holder: audience human only)." }) }),
	game_ended: Type.Object({
		game: Game,
		reason: EndReason,
		score: Type.Integer({ description: "Cards lit." }),
		deck: Type.Integer(),
		lost: Type.Integer(),
		misfires: Type.Integer(),
		signals: Type.Integer({ description: "Signals given in the game." }),
	}),
	game_scored: Type.Object({ game: Game, score: Type.Integer(), baseline: Type.Integer({ description: "The reference bot crew on the same deal." }) }),
	match_ended: Type.Object({
		scores: Type.Array(Type.Integer(), { description: "Cards lit, game by game." }),
		baselines: Type.Array(Type.Integer()),
		invalid: Type.Optional(Type.Boolean({ description: "True when the match was ended as invalid (too many forfeits in a row)." })),
	}),
});
