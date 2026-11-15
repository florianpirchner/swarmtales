// SPDX-License-Identifier: Apache-2.0
/**
 * Harbor Lights: a cooperative game of hidden hands for a crew of four. The harbour wall has five signal towers
 * (Amber, Cobalt, Moss, Rose, Violet), each lit lamp by lamp from 1 to 7. Every crew member holds four cards facing
 * away: they see everyone's cards but their own. On a turn a member gives a signal (one suit or one rank, to one
 * teammate; six signal tokens), plays one of their own slots (lit if it is its tower's next rank, else a misfire), or
 * discards a slot to get a signal back. Every card exists once; a lost card is bridged, so it costs exactly its own
 * point. The score is the cards lit, less 3 points for every misfire from the second on (soft strikes; hard strikes:
 * the third strike ends the game). The rules are the `hint-towers` mechanic on the `card-table`.
 *
 * Three arms on the same deals: `crew` (default) keeps one shared crew brain, discussed in a team chat that is open
 * only between games and written by a rotating captain; `solo` gives every member private notes and no chat;
 * `nobrain` keeps nothing. Every deal is also played by a crew of reference bots for the report. A port of the old
 * `stories/harbor-lights/story.ts`: the variants are params of the game family, the id is always `harbor-lights`.
 */
import { cardTable } from "@swarmtales/mechanic-card-table";
import { hintTowers } from "@swarmtales/mechanic-hint-towers";
import { strategyBrain } from "@swarmtales/mechanic-strategy-brain";
import { teamChannel } from "@swarmtales/mechanic-team-channel";
import { defineGame, defineGameFamily } from "@swarmtales/sdk";
import { Type } from "typebox";
import { briefings, SEATS, SOFT_PENALTY, type HarborBrain } from "./briefing.ts";

/**
 * The variants of Harbor Lights.
 *
 * @public
 */
export interface HarborLightsOptions {
	/** Games in the match (default 3). */
	readonly games?: number;
	/** crew: one shared brain and a chat between games; solo: private notes, no chat; nobrain: nothing kept. */
	readonly brain?: HarborBrain;
	/** soft (default): strikes never end the game, every misfire from the second on costs 3 points; hard: the third strike ends the game. */
	readonly strikes?: "soft" | "hard";
	/** Decision-time aid (P430): every own slot shows the chance that a play lights it now. */
	readonly aid?: boolean;
	/** Words a brain may have. */
	readonly maxWords?: number;
	/** The seed of the run; 31 when absent. */
	readonly seed?: number;
	/** Run length in ticks; default is an upper bound (the match ends the run earlier). */
	readonly ticks?: number;
}

const CREW = "crew";
const SUITS = ["Amber", "Cobalt", "Moss", "Rose", "Violet"].map((name) => ({ name, ranks: 7 }));
const RETRO_TICKS = 3;
/** Soft strikes: the first misfire is free, every later one costs SOFT_PENALTY points (P178: from strike 2, not 3). */
const SOFT_FROM = 2;
/**
 * The question for the crew retro after each game (P175): agree what a signal asks for.
 *
 * @public
 */
export const SIGNAL_QUESTION = "Retro question: agree in the chat what a signal means, and the captain writes it into the brain as a convention. Which signal says \"play this card now\", and which only gives information to keep? Name the slot it points to (for example the newest touched card), and what a player does when a signalled card cannot be played yet.";
/** The defaults of the old game. */
const DEFAULTS = { games: 3, brain: "crew", strikes: "soft", aid: false, maxWords: 150, seed: 31 } as const satisfies HarborLightsOptions;
type Filled = HarborLightsOptions & Required<Omit<HarborLightsOptions, "ticks">>;

// The four mechanics with the options of the old game, in its order; the team chat only for the crew.
function mechanicsOf({ games, brain, strikes, aid, maxWords }: Filled) {
	const soft = strikes === "soft";
	const crew = brain === CREW;
	const teams = crew ? { [CREW]: [...SEATS] } : Object.fromEntries(SEATS.map((seat) => [seat, [seat]]));
	return [
		cardTable({ suits: SUITS, seats: [...SEATS] }),
		hintTowers({ games, handSize: 4, signals: 6, strikes: soft ? SOFT_FROM : 3, strikePenalty: soft ? SOFT_PENALTY : 0, maxIdleMinutes: 2, maxConsecutiveForfeits: 24, quietTools: crew ? ["postTeam", "readTeam"] : [], ...(aid ? { playableOdds: true } : {}), ...(crew ? { side: CREW, debriefNote: SIGNAL_QUESTION } : {}) }),
		...(crew ? [teamChannel({ teams, maxPostsPerMove: 2 })] : []),
		strategyBrain({ enabled: brain !== "nobrain", solo: !crew, maxWords, teams, retroMaxPosts: 8, retroMaxMinutes: RETRO_TICKS, shared: false, brainAtStart: true }),
	];
}

/**
 * The game with its variants as options.
 *
 * @param options - The variant; every option has the default of the old game.
 * @returns The game in its builder form.
 * @example
 * ```ts
 * const played = await play(harborLightsGame({ brain: "solo", games: 1 }), { seed: 111 });
 * ```
 *
 * @public
 */
export function harborLightsGame(options: HarborLightsOptions = {}) {
	const filled: Filled = { ...DEFAULTS, ...options };
	const keeps = filled.brain !== "nobrain";
	const chat = filled.brain === CREW ? (["postTeam", "readTeam"] as const) : [];
	return defineGame({
		id: "harbor-lights",
		title: "Harbor Lights",
		seed: filled.seed,
		residents: [...SEATS],
		mechanics: mechanicsOf(filled),
		grants: { resident: ["viewTowers", "giveSignal", "playSlot", "discardSlot", ...chat, ...(keeps ? (["readBrain", "writeBrain"] as const) : [])] },
		locked: keeps ? ["writeBrain"] : [],
		// The seat on turn has news; several seats act in one pass when the turn moves along the roster. The reset line comes first, then the brain's lines before those of the chat, as the old hook numbers ordered them.
		scheduler: { id: "turns", options: { passes: 8, activation: "onNews", inputs: [{ kind: "context-reset" }, { source: "strategy-brain" }, { source: "hint-towers" }] } },
		// Up to two turns a tick for a seat (viewTowers and an action each), and room for a retro post and the brain in the same tick.
		limits: { maxCallsPerTick: 12 },
		// About 55 actions a game at eight passes a tick, a move timer of two ticks, and a retro per game.
		end: { ticks: filled.ticks ?? filled.games * (30 + RETRO_TICKS) + RETRO_TICKS + 4 },
		win: { fact: "hint-towers.scores" },
		briefing: briefings(filled.brain, filled.strikes === "soft", SEATS.length),
		model: "anthropic/haiku",
	});
}

/**
 * The params of the family: the variants an arm of an experiment or `--set` may choose. The seed and the tick count
 * are no params: the seed is the run's, and the tick count follows from the games.
 */
const Params = Type.Object(
	{
		games: Type.Integer({ minimum: 1, maximum: 20, default: DEFAULTS.games, description: "Games in the match." }),
		brain: Type.Union([Type.Literal("crew"), Type.Literal("solo"), Type.Literal("nobrain")], { default: DEFAULTS.brain, description: "crew: one shared brain and a chat between games; solo: private notes, no chat; nobrain: nothing kept (the control arm)." }),
		strikes: Type.Union([Type.Literal("soft"), Type.Literal("hard")], { default: DEFAULTS.strikes, description: "soft: strikes never end the game, every misfire from the second on costs 3 points; hard: the third strike ends the game." }),
		aid: Type.Boolean({ default: DEFAULTS.aid, description: "Decision-time aid: every own slot shows the chance that a play lights it now." }),
		maxWords: Type.Integer({ minimum: 1, default: DEFAULTS.maxWords, description: "Words a brain may have." }),
	},
	{ description: "The variants of Harbor Lights." },
);

/**
 * Harbor Lights as a game family: the default params give the registry default of the old platform (three games, the
 * crew brain, soft strikes); `{ brain: "solo" }` and `{ brain: "nobrain" }` are the other two arms of its series.
 *
 * @example
 * ```ts
 * const resolved = resolveGame({ game: harborLightsFamily, params: { brain: "solo", games: 1 }, schedulers: { turns }, prompts });
 * ```
 *
 * @public
 */
export const harborLightsFamily = defineGameFamily(Params, (params) => harborLightsGame(params));

export default harborLightsFamily;
