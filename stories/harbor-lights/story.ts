/**
 * HARBOR LIGHTS: an original cooperative game of hidden hands for a crew of four. The harbour wall
 * has five signal towers (Amber, Cobalt, Moss, Rose, Violet), each lit lamp by lamp from 1 to 7.
 * Every crew member holds four lamp cards facing away: they see everyone's cards but their own. On a
 * turn a member gives a signal (one suit or one rank, to one teammate; six signal tokens), plays one
 * of their own slots (lit if it is its tower's next rank, else a misfire), or discards a slot to get a
 * signal back. Every card exists once; a lost card is bridged, so it costs exactly its own point.
 * After the last draw the game goes on until a whole round lights nothing. The score is the cards
 * lit (35 at most), less 3 points for every misfire from the second on (soft strikes, the default since
 * P178; `-hard-strikes` keeps the old rule: the third strike ends the game). No table talk: the only messages are the signals. The rules are the
 * `hint-towers` mechanic on the `card-table`.
 *
 * Three arms, the same deals (seed): `crew` (default) keeps one shared crew brain, discussed in a team
 * chat that is open only between games and written by a rotating captain, so the crew can agree on
 * conventions; `solo` gives every member private notes and no chat, so conventions can only emerge
 * by chance; `nobrain` keeps nothing. Every deal is also played by a crew of reference bots for the
 * report. A TypeScript `CoreStory`, played by the generic runner (`swt run --story harbor-lights`).
 */
import type { Host, ResidentId } from "@swarmtales/contracts";
import { defineCoreStory } from "@swarmtales/kernel";
import { cardTable } from "@swarmtales/mechanic-card-table";
import { hintTowers } from "@swarmtales/mechanic-hint-towers";
import { strategyBrain } from "@swarmtales/mechanic-strategy-brain";
import { teamChannel } from "@swarmtales/mechanic-team-channel";
import type { CoreStoryEntry } from "../index.ts";

export type HarborBrain = "crew" | "solo" | "nobrain";
export type HarborStrikes = "soft" | "hard";

export interface HarborLightsOptions {
	/** Games in the match (default 3). */
	readonly games?: number;
	/** crew: one shared brain and a chat between games; solo: private notes, no chat; nobrain: nothing kept. */
	readonly brain?: HarborBrain;
	readonly seed?: number;
	/** Words a brain may have. */
	readonly maxWords?: number;
	/** Run length in virtual minutes; default is an upper bound (the match ends the run earlier). */
	readonly minutes?: number;
	/** soft (default): strikes never end the game; from the second misfire on every misfire costs SOFT_PENALTY points. hard: the third strike ends the game. */
	readonly strikes?: HarborStrikes;
}

const SEATS: readonly ResidentId[] = ["A01", "A02", "A03", "A04"];
const CREW = "crew";
const SUITS = ["Amber", "Cobalt", "Moss", "Rose", "Violet"].map((name) => ({ name, ranks: 7 }));
const RETRO_MINUTES = 3;
const SOFT_PENALTY = 3;
/** Soft strikes: the first misfire is free, every later one costs SOFT_PENALTY points (P178: from strike 2, not 3). */
const SOFT_FROM = 2;
/** The question for the crew retro after each game (P175): agree what a signal asks for. */
const SIGNAL_QUESTION = "Retro question: agree in the chat what a signal means, and the captain writes it into the brain as a convention. Which signal says \"play this card now\", and which only gives information to keep? Name the slot it points to (for example the newest touched card), and what a player does when a signalled card cannot be played yet.";

/** The registered name: `harbor-lights[-solo|-nobrain][-hard-strikes][-g<games>]`, the defaults left out. */
function storyName(brain: HarborBrain, strikes: HarborStrikes, games: number): string {
	return `harbor-lights${brain === "crew" ? "" : `-${brain}`}${strikes === "hard" ? "-hard-strikes" : ""}${games === 3 ? "" : `-g${String(games)}`}`;
}

/** The story with its variants as options. */
export function harborLightsStory(options: HarborLightsOptions = {}) {
	const { games = 3, brain = "crew", seed = 31, maxWords = 150, strikes = "soft" } = options;
	const soft = strikes === "soft";
	const crew = brain === "crew";
	const keeps = brain !== "nobrain";
	const teams = crew ? { [CREW]: [...SEATS] } : Object.fromEntries(SEATS.map((seat) => [seat, [seat]]));
	const chat = crew ? (["postTeam", "readTeam"] as const) : [];
	return defineCoreStory({
		id: storyName(brain, strikes, games),
		seed,
		// About 55 actions a game at eight passes a minute, a move timer of two minutes, and a retro per game.
		minutes: options.minutes ?? games * (30 + RETRO_MINUTES) + RETRO_MINUTES + 4,
		residents: [...SEATS],
		mechanics: [
			cardTable.with({ suits: SUITS, seats: [...SEATS] }),
			hintTowers.with({ games, handSize: 4, signals: 6, strikes: soft ? SOFT_FROM : 3, strikePenalty: soft ? SOFT_PENALTY : 0, maxIdleMinutes: 2, maxConsecutiveForfeits: 24, quietTools: [...chat], ...(crew ? { side: CREW, debriefNote: SIGNAL_QUESTION } : {}) }),
			...(crew ? [teamChannel.with({ teams, maxPostsPerMove: 2 })] : []),
			strategyBrain.with({ enabled: keeps, solo: !crew, maxWords, teams, retroMaxPosts: 8, retroMaxMinutes: RETRO_MINUTES, shared: false, brainAtStart: true }),
		],
		grants: { resident: ["viewTowers", "giveSignal", "playSlot", "discardSlot", ...chat, ...(keeps ? (["readBrain", "writeBrain"] as const) : [])] },
		locked: keeps ? ["writeBrain"] : [],
		// The seat on turn has news; several seats act in one pass when the turn moves along the roster.
		turns: { passes: 8, activation: "onNews", inputs: [{ kind: "context-reset" }] },
		// Up to two turns a minute for a seat (viewTowers and an action each), and room for a retro post and the brain in the same minute.
		limits: { maxStepsPerMinute: 12 },
	});
}

const RULES = [
	"The harbour wall has five signal towers: Amber, Cobalt, Moss, Rose and Violet. Each tower is lit lamp by lamp, rank 1 to 7, in order. The deck holds each card exactly once (35 cards). The crew lights as many cards as it can together; the score of a game is the number of cards lit.",
	"You hold four cards but cannot see them; you see every other crew member's cards, and they see yours. Your slots are numbered from 1 (your oldest card); a new card always goes last. The status shows what each seat knows about its own cards and which cards each of your slots can still be.",
	"On your turn you do exactly one thing: 1) giveSignal: spend one of the crew's signals (6 at most) to tell one teammate every card of one suit, or every card of one rank, in their hand; it must touch at least one card, and their other cards learn they are not that. 2) playSlot: play one of your slots to its tower; if it is the tower's next rank it is lit, otherwise it is a misfire: the card is lost and a strike counts (STRIKE_RULE). 3) discardSlot: drop a slot (the card is lost) and win one signal back; not while the crew holds all six.",
	"After a play or a discard you draw a new card while the pile lasts. A lost card never comes back, but its tower skips the gap: if Moss 3 is lost, Moss 4 becomes playable once Moss 2 is lit. So no card in a hand is ever dead: every card you hold is still needed, and every loss costs the crew one point. A tower that is done gives a signal back. When the pile is empty there are no more draws, and the game ends once a whole round of turns neither lights a card nor gives a signal.",
	"There is no table talk during a game: the only way to tell a teammate anything is a signal. When it is your turn the status shows everything; act with one tool call and end your turn. viewTowers shows the status again.",
];

const HARD_STRIKES = "three strikes end the game";
const SOFT_STRIKES = `soft strikes: strikes never end the game, but the second misfire and every one after it also cost ${String(SOFT_PENALTY)} points each`;

function briefing(brain: HarborBrain, soft: boolean) {
	const rules = RULES.map((line) => line.replace("STRIKE_RULE", soft ? SOFT_STRIKES : HARD_STRIKES));
	return (resident: ResidentId, host: Host): string => {
		const others = SEATS.filter((seat) => seat !== resident).join(", ");
		const lines = [`You are ${resident}, one of a crew of four (${others} are the others; ${String(host.residents.length)} residents in all) playing Harbor Lights, a cooperative card game. The turn order is A01, A02, A03, A04, then back to A01. A match has several games; each game starts from a fresh mind.`, ...rules];
		if (brain === "crew") lines.push("Between games (and once before the first) the crew meets in a private chat (postTeam, readTeam; closed during a game) and the retro captain writes the crew's shared strategy brain with writeBrain: the conventions you all play by, for example what a signal means. Agree first of all which signal asks a teammate to play a card now and which one only gives information to keep, and write that down. Every member reads it at the start of each game.");
		if (brain === "solo") lines.push("You keep short private notes across games (readBrain). Before the first game and after each game you rewrite them with writeBrain: rules that help you play better next time. No one else reads them, and there is no chat.");
		return lines.join("\n\n");
	};
}

/** The registered entry: Haiku via Anthropic, three games, the crew brain. */
export function harborLightsEntry(options: HarborLightsOptions = {}): CoreStoryEntry {
	const brain = options.brain ?? "crew";
	const soft = (options.strikes ?? "soft") === "soft";
	return {
		title: "Harbor Lights",
		story: harborLightsStory(options),
		model: { provider: "anthropic", id: "claude-haiku-5-5" },
		briefing: briefing(brain, soft),
		fixedRoster: "the four residents are the crew's four seats (A01-A04)",
	};
}

/** Harbor Lights combinations by name: `harbor-lights[-solo|-nobrain][-hard-strikes][-g<games>]`, for example `harbor-lights-solo-g2`. */
const HARBOR_NAME = /^harbor-lights(-solo|-nobrain)?(-hard-strikes)?(?:-g(\d+))?$/;

export function harborLightsEntryByName(id: string): CoreStoryEntry | undefined {
	const match = HARBOR_NAME.exec(id);
	if (match === null) return undefined;
	const games = match[3] === undefined ? undefined : Number(match[3]);
	if (games !== undefined && (games < 1 || games > 20)) return undefined;
	const brain: HarborBrain = match[1] === "-solo" ? "solo" : match[1] === "-nobrain" ? "nobrain" : "crew";
	return harborLightsEntry({ brain, strikes: match[2] === undefined ? "soft" : "hard", ...(games === undefined ? {} : { games }) });
}

export default harborLightsEntry();
