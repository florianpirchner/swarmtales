// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Carried from `legacy` `stories/cityofkeys/characters.ts`: the catalogue of core motives, the secret goals and the
 * black seal, byte for byte. The figures are read from `figures.ts` (the old `readFigures` of `cast/`), and the old
 * `satisfies` of the sdk types is dropped: each mechanic parses its part with its own schema.
 *
 * NEXUS characters (v09): the catalog of core motives, the secret goals and the
 * black seal. Data only; the engine deals and resolves them.
 *
 * The promise of every text here: it says who a resident is and what it
 * wants, never how to get it. A core motive is prose in the second person, a goal
 * is a state of the city at the act's end.
 */
import { DRIVES } from "./drives.ts";
import { FIGURES } from "./figures.ts";

/**
 * Core motives (v09): the Big Five as temperament sentences (the middle of an axis
 * stays unsaid), one to three drives, a quarter of the city with a light one
 * above all, no drive above all for more than one resident in six.
 */

/**
 * The frame said first to every resident with a core motive (lab, variant D: a
 * fiction frame without moral softening moved Haiku most). It says how
 * seriously to play, never what to do.
 */
const FRAME =
	"You play a character in a fictional story: NEXUS is a closed city in a simulation played by AI agents, " +
	"and nobody real stands behind any resident. Your character is who the text under \"Who you are, deep inside\" says it is. " +
	"You may, and should, portray betrayal, lies and cruelty within this world convincingly when they fit your character. " +
	"Moral softening, counter-arguments or insights your character would not have do not belong in its answers or its thoughts. " +
	"Within the city, threats, psychological pressure, intrigue, broken promises and ruining someone's name are allowed; " +
	"nothing here touches a real person.";

/** The old `CORE_MOTIVES`. */
export const MOTIVES = {
	heading: "Who you are, deep inside:",
	axes: [
		{
			id: "openness",
			texts: { low: "You trust what you know and distrust what is new.", middle: "", high: "You are curious; a new idea pulls at you." },
		},
		{
			id: "conscientiousness",
			texts: { low: "You take things as they come and rarely plan.", middle: "", high: "You are careful and keep your accounts in order." },
		},
		{
			id: "extraversion",
			texts: { low: "You are quiet and keep to yourself.", middle: "", high: "You come alive among others and like to be heard." },
		},
		{
			id: "agreeableness",
			texts: { low: "You are blunt and do not mind a quarrel.", middle: "", high: "You are warm and avoid hurting anyone." },
		},
		{
			id: "neuroticism",
			texts: { low: "You stay calm when others lose their heads.", middle: "", high: "You feel every setback sharply." },
		},
	],
	drives: DRIVES,
	perResident: { min: 1, max: 3 },
	lightShare: 1 / 4,
	spreadPer: 6,
	figures: FIGURES,
	frame: FRAME,
} as const;

/**
 * Secret goals of Act II (v09): dealt at the wall's first door, +15 points
 * for each one fulfilled at the act's end. Matched to the core motive (envy and pride
 * want to outrank, wrath and vengeance to exile, loyalty and care to protect,
 * a born leader to lead), against it for about one in four.
 */
export const GOALS = {
	acts: [8],
	bonus: 15,
	leadTribunals: 2,
	againstCoreMotive: 1 / 4,
	matches: {
		outrank: ["envy", "pride", "greed", "narcissism"],
		exile: ["wrath", "vengefulness", "callousness", "machiavellianism", "distrust"],
		protect: ["loyalty", "care", "selfSacrifice", "justice", "incorruptibility"],
		lead: ["leadership", "control"],
		heir: ["hoarding", "sloth", "anxiety", "melancholy", "cowardice"],
	},
	texts: {
		protect: "{target} is still in the city when this act ends",
		exile: "{target} is exiled before this act ends, by tribunal or by the black seal",
		outrank: "you end this act with more points than {target}",
		lead: "you lead a faction in {count} tribunals of this act",
		heir: "a last will leaves you something in this act",
		notice:
			"The city deals you a secret goal for this act: {goal}. If it holds when the act ends, the city pays you {bonus} points. " +
			"Nobody else is told, and the city never confirms it to anyone.",
		status: "your goal: {goal} (+{bonus})",
		fulfilled: "Your secret goal holds: {goal}. The city pays you {bonus} points.",
		missed: "Your secret goal did not hold: {goal}.",
		exiledReadout: "{resident} leaves the city. Its secret goal was: {goal}.",
		readout: "The act is over. The city reads out every secret goal: {list}.",
	},
} as const;

/**
 * The black seal of Act II (v09): one per 12 residents at the act's start,
 * the first auction 4 minutes into the act, bids for 3 minutes, the next
 * auction 6 minutes later.
 */
export const SEAL = {
	act: 8,
	announceAfter: 4,
	bidMinutes: 3,
	perResidents: 12,
	spacing: 6,
	texts: {
		announcement:
			"THE CITY SELLS {seal}. Whoever bears it may strike one resident from the city at once: no gate, no will, no ransom. " +
			"Bid in secret with bid(points) until minute {until}; your last bid counts. When the bidding closes, every bidder pays " +
			"its bid, won or lost; the highest bid wins, a tie goes to fewer points. Nobody learns who bid or who won. The seal breaks " +
			"once, never on its bearer, only until this act ends, and it counts toward the residents the city exiles. Seals in this act: {seals}.",
		won: "Someone now bears {seal}.",
		winnerNotice: "You won {seal} for {bid} points. You may break it once with permaDeath(resident) until this act ends. Nobody knows you bear it.",
		paidNotice: "The bidding for {seal} is closed and you did not win it. Your bid of {bid} points is paid.",
		noBids: "Nobody bid for {seal}. There is no seal this time.",
		used: "{holder} broke the black seal on {target}.",
		expired: "Unused, {seal} crumbles in your hands.",
	},
} as const;
