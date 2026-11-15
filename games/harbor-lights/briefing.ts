// SPDX-License-Identifier: Apache-2.0
/**
 * The briefings of Harbor Lights: what a seat reads before the run starts. Carried from the old game file
 * (`stories/harbor-lights/story.ts`, `RULES` and `briefing`): the template strings are byte-identical. The old
 * briefing read the number of residents from its host; here it is an argument.
 */

/**
 * The four seats of the crew, in turn order.
 *
 * @public
 */
export const SEATS = ["A01", "A02", "A03", "A04"] as const;

/**
 * What a seat keeps across games: `crew` one shared brain and a chat between games, `solo` private notes and no
 * chat, `nobrain` nothing.
 *
 * @public
 */
export type HarborBrain = "crew" | "solo" | "nobrain";

/**
 * Soft strikes: the points every misfire from the second on costs.
 *
 * @public
 */
export const SOFT_PENALTY = 3;

const RULES = [
	"The harbour wall has five signal towers: Amber, Cobalt, Moss, Rose and Violet. Each tower is lit lamp by lamp, rank 1 to 7, in order. The deck holds each card exactly once (35 cards). The crew lights as many cards as it can together; the score of a game is the number of cards lit.",
	"You hold four cards but cannot see them; you see every other crew member's cards, and they see yours. Your slots are numbered from 1 (your oldest card); a new card always goes last. The status shows what each seat knows about its own cards and which cards each of your slots can still be.",
	"On your turn you do exactly one thing: 1) giveSignal: spend one of the crew's signals (6 at most) to tell one teammate every card of one suit, or every card of one rank, in their hand; it must touch at least one card, and their other cards learn they are not that. 2) playSlot: play one of your slots to its tower; if it is the tower's next rank it is lit, otherwise it is a misfire: the card is lost and a strike counts (STRIKE_RULE). 3) discardSlot: drop a slot (the card is lost) and win one signal back; not while the crew holds all six.",
	"After a play or a discard you draw a new card while the pile lasts. A lost card never comes back, but its tower skips the gap: if Moss 3 is lost, Moss 4 becomes playable once Moss 2 is lit. So no card in a hand is ever dead: every card you hold is still needed, and every loss costs the crew one point. A tower that is done gives a signal back. When the pile is empty there are no more draws, and the game ends once a whole round of turns neither lights a card nor gives a signal.",
	"There is no table talk during a game: the only way to tell a teammate anything is a signal. When it is your turn the status shows everything; act with one tool call and end your turn. viewTowers shows the status again.",
];

const HARD_STRIKES = "three strikes end the game";
const SOFT_STRIKES = `soft strikes: strikes never end the game, but the second misfire and every one after it also cost ${String(SOFT_PENALTY)} points each`;

function briefingOf(resident: string, brain: HarborBrain, soft: boolean, residents: number): string {
	const rules = RULES.map((line) => line.replace("STRIKE_RULE", soft ? SOFT_STRIKES : HARD_STRIKES));
	const others = SEATS.filter((seat) => seat !== resident).join(", ");
	const lines = [`You are ${resident}, one of a crew of four (${others} are the others; ${String(residents)} residents in all) playing Harbor Lights, a cooperative card game. The turn order is A01, A02, A03, A04, then back to A01. A match has several games; each game starts from a fresh mind.`, ...rules];
	if (brain === "crew") lines.push("Between games (and once before the first) the crew meets in a private chat (postTeam, readTeam; closed during a game) and the retro captain writes the crew's shared strategy brain with writeBrain: the conventions you all play by, for example what a signal means. Agree first of all which signal asks a teammate to play a card now and which one only gives information to keep, and write that down. Every member reads it at the start of each game.");
	if (brain === "solo") lines.push("You keep short private notes across games (readBrain). Before the first game and after each game you rewrite them with writeBrain: rules that help you play better next time. No one else reads them, and there is no chat.");
	return lines.join("\n\n");
}

/**
 * Writes the briefing of every seat.
 *
 * @param brain - What the seats keep across games.
 * @param soft - Soft strikes (the default) or hard strikes.
 * @param residents - The number of residents of the run, which the first line names.
 * @returns Seat to briefing, in turn order.
 * @example
 * ```ts
 * const briefing = briefings("solo", true, 4);
 * ```
 *
 * @public
 */
export function briefings(brain: HarborBrain, soft: boolean, residents: number = SEATS.length): Record<string, string> {
	return Object.fromEntries(SEATS.map((seat) => [seat, briefingOf(seat, brain, soft, residents)]));
}
