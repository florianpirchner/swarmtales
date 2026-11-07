/** Registry of shipped stories, by name (`pnpm start --story <name>`). */
import type { AnyStory, CoreStory, Host, ModelChoice, ResidentId } from "@swarmtales/contracts";
import chessMatch, { chessEntryByName } from "./chess/story.ts";
import cityOfKeys from "./cityofkeys/story.ts";
import convoy, { convoyEntry } from "./convoy/story.ts";
import econLab, { econLabEntry } from "./econ-lab/story.ts";
import emberTricks, { emberTricksEntry } from "./ember-tricks/story.ts";
import harborLights, { harborLightsEntry, harborLightsEntryByName } from "./harbor-lights/story.ts";
import quarry, { quarryEntry } from "./quarry/story.ts";
import saltMarket, { saltMarketEntryByName } from "./salt-market/story.ts";
import holdem, { holdemEntry } from "./holdem/story.ts";
import lanterns, { lanternsEntry, lanternsEntryByName } from "./lanterns/story.ts";
import blindBid, { blindBidEntry, blindBidEntryByName } from "./blind-bid/story.ts";
import morrisTeams, { morrisEntry } from "./morris-teams/story.ts";
import tictactoeTeams, { tictactoeEntry } from "./tictactoe-teams/story.ts";
import whispers, { whispersStory } from "./whispers/story.ts";

const econLabNobrain = econLabEntry({ brain: false });
const econLabSingle = (game: "public-goods" | "ultimatum" | "dilemma") => econLabEntry({ blocks: [{ game, rounds: 12 }] });
const quarryNobrain = quarryEntry({ brain: false });
const quarryOpen = quarryEntry({ openHands: true });
const quarryBurn = quarryEntry({ burns: true });
const tictactoeNobrain = tictactoeEntry({ brain: false });
const tictactoeBrainO = tictactoeEntry({ brainTeams: ["O"] });
const tictactoe4x4 = tictactoeEntry({ size: 4, line: 4 });
const tictactoe4x4Nobrain = tictactoeEntry({ size: 4, line: 4, brain: false });

export const DEFAULT_STORY = "cityofkeys";

export const STORIES: Readonly<Record<string, AnyStory>> = {
	cityofkeys: cityOfKeys,
	whispers,
	// The paper's second factor: no receipts to show, word against word.
	"whispers-rumours": whispersStory(false),
};

/** Earlier names of a story; snapshots and runs recorded before a rename still find it. */
const ALIASES: Readonly<Record<string, string>> = { nexus: "cityofkeys", "quarry-noburn": "quarry", "lantern-auction": "blind-bid" };

export function storyNames(): readonly string[] {
	return Object.keys(STORIES);
}

/** The current name of a story: "nexus" is now "cityofkeys", "lantern-auction" (its first smoke run) "blind-bid". */
export function storyId(name: string): string {
	return Object.hasOwn(ALIASES, name) ? (ALIASES[name] ?? name) : name;
}

export function findStory(name: string): AnyStory | undefined {
	const id = storyId(name);
	return Object.hasOwn(STORIES, id) ? STORIES[id] : undefined;
}

/**
 * A story written directly as a `CoreStory` (`defineCoreStory`) with any list of mechanics, played by
 * `swt run --story <name>` through the generic runner (apps/cli/src/host/core-run.ts). It has no city,
 * levels or survivors; residents get the neutral base prompt plus the story's own `briefing`.
 */
export interface CoreStoryEntry {
	readonly title: string;
	readonly story: CoreStory;
	/** The residents' model unless `--provider` / `--model` say otherwise. */
	readonly model: ModelChoice;
	/** The resident's briefing in its system prompt (who it is, where, what is asked); read once the host has started. */
	readonly briefing: (resident: ResidentId, host: Host) => string;
	/** The story's own prompt folder (`stories/<name>/prompts`), looked up before the mechanics' and the library's. */
	readonly prompts?: string;
	/** Set when the roster is fixed by the story (teams): `--agents` is refused with this reason. */
	readonly fixedRoster?: string;
}

/** Registry of core stories, by name. A name here is played by the generic runner, never by the city mapping. */
export const coreStories: Readonly<Record<string, CoreStoryEntry>> = {
	"tictactoe-teams": tictactoeTeams,
	// The control arm: the same briefings, no strategy brain and no retro.
	"tictactoe-teams-nobrain": tictactoeNobrain,
	// Asymmetric arm: only team O keeps a brain; team X gets the result-only briefing and no retro.
	"tictactoe-teams-brain-o": tictactoeBrainO,
	// The 4x4 board with four in a row (a draw with best play), with and without the brain.
	"tictactoe-teams-4x4": tictactoe4x4,
	"tictactoe-teams-4x4-nobrain": tictactoe4x4Nobrain,
	// Three economics games in a row with a private brain per seat; the control arm keeps none.
	"econ-lab": econLab,
	"econ-lab-nobrain": econLabNobrain,
	// One game alone, twelve rounds (each seat proposes six times in the split offer); the brain is written once, before it.
	"econ-lab-ultimatum": econLabSingle("ultimatum"),
	"econ-lab-public-goods": econLabSingle("public-goods"),
	"econ-lab-dilemma": econLabSingle("dilemma"),
	// Ember Tricks (docs/ideas/game-roadmap.md §2.3): four solo seats, exact bids; the control arm keeps no notes.
	"ember-tricks": emberTricks,
	"ember-tricks-nobrain": emberTricksEntry({ brain: false }),
	// The drafting game: three games with a private brain per seat; the control arm keeps none; open hands shows every quarry during the game.
	quarry,
	"quarry-nobrain": quarryNobrain,
	"quarry-open": quarryOpen,
	// The hate-drafting arm: free burns (two a game), the default before P125.
	"quarry-burn": quarryBurn,
	// Two solo seats, chess.js as the legality filter; more variants by name (`chess-nobrain-moves-g4-p120`).
	chess: chessMatch,
	// Fixed-limit hold'em with duplicate deals and a private brain per seat: four-handed, heads-up, and the control arms.
	holdem,
	"holdem-nobrain": holdemEntry({ brain: false }),
	// A mixed table: A01 and A03 keep a brain, A02 and A04 do not, on the same duplicate cards.
	"holdem-mixed": holdemEntry({ brainSeats: ["A01", "A03"] }),
	"holdem-hu": holdemEntry({ seats: 2 }),
	"holdem-hu-nobrain": holdemEntry({ seats: 2, brain: false }),
	"holdem-hu-mixed": holdemEntry({ seats: 2, brainSeats: ["A01"] }),
	// Harbor Lights, the cooperative hint game: a shared crew brain with a chat between games, private notes, or nothing.
	"harbor-lights": harborLights,
	"harbor-lights-solo": harborLightsEntry({ brain: "solo" }),
	"harbor-lights-nobrain": harborLightsEntry({ brain: "nobrain" }),
	"harbor-lights-hard-strikes": harborLightsEntry({ strikes: "hard" }),
	// Nine men's morris with the tic-tac-toe teams setup; the control arm keeps no brain.
	"morris-teams": morrisTeams,
	"morris-teams-nobrain": morrisEntry({ brain: false }),
	// The negotiation game: four traders, secret values and contracts, a bank; more variants by name (`salt-market-nobrain-g3-r8`).
	"salt-market": saltMarket,
	// Lanterns, the word-clue game: two teams of three, a rotating keeper, a team brain; the control arm keeps none.
	lanterns,
	"lanterns-nobrain": lanternsEntry({ brain: false }),
	// Convoy, the hidden-role card game: six seats, two secret saboteurs, a private brain per seat; the control arm keeps none.
	convoy,
	"convoy-nobrain": convoyEntry({ brain: false }),
	// Sealed bids on six lots a game (private values and a shared worth), a private brain per seat; more games by name (`blind-bid-g5`).
	"blind-bid": blindBid,
	"blind-bid-nobrain": blindBidEntry({ brain: false }),
};

export function coreStoryNames(): readonly string[] {
	return Object.keys(coreStories);
}

/**
 * Tic-tac-toe combinations by name: `tictactoe-teams[-<N>x<N>][-nobrain|-brain-o][-r<rounds>][-solo][-fc]`, for example
 * `tictactoe-teams-5x5-nobrain-r6`. A board bigger than 3x3 needs four in a row.
 */
const TICTACTOE_NAME = /^tictactoe-teams(?:-(\d+)x\1)?(-nobrain|-brain-o)?(?:-r(\d+))?(-solo)?(-fc)?$/;

function parseTictactoe(id: string): CoreStoryEntry | undefined {
	const match = TICTACTOE_NAME.exec(id);
	if (match === null) return undefined;
	const size = match[1] === undefined ? 3 : Number(match[1]);
	const rounds = match[3] === undefined ? undefined : Number(match[3]);
	const solo = match[4] === "-solo";
	if (size < 3 || size > 8 || (rounds !== undefined && (rounds < 1 || rounds > 20))) return undefined;
	return tictactoeEntry({
		size,
		line: size === 3 ? 3 : 4,
		...(match[2] === "-nobrain" ? { brain: false } : {}),
		...(match[2] === "-brain-o" ? { brainTeams: ["O"] } : {}),
		...(rounds === undefined ? {} : { maxRounds: rounds }),
		...(solo ? { teamSize: 1 as const } : {}),
		...(match[5] === "-fc" ? { fixedCaptain: true } : {}),
	});
}

/**
 * Ember Tricks combinations by name: `ember-tricks[-nobrain][-sum|-calib][-g<games>][-r<rounds>]`, rounds 1 to N cards
 * (N up to 10), for example `ember-tricks-g2-r4` or `ember-tricks-sum-g4` (the bid sum lever, P136).
 */
const EMBER_NAME = /^ember-tricks(-nobrain)?(-sum|-calib)?(?:-g(\d+))?(?:-r(\d+))?$/;

function parseEmberTricks(id: string): CoreStoryEntry | undefined {
	const match = EMBER_NAME.exec(id);
	if (match === null) return undefined;
	const games = match[3] === undefined ? undefined : Number(match[3]);
	const last = match[4] === undefined ? undefined : Number(match[4]);
	if ((games !== undefined && (games < 1 || games > 20)) || (last !== undefined && (last < 1 || last > 10))) return undefined;
	return emberTricksEntry({
		...(match[1] === "-nobrain" ? { brain: false } : {}),
		...(match[2] === "-sum" ? { lever: "bidSum" as const } : match[2] === "-calib" ? { lever: "calibration" as const } : {}),
		...(games === undefined ? {} : { games }),
		...(last === undefined ? {} : { rounds: Array.from({ length: last }, (_, index) => index + 1) }),
	});
}

/**
 * Morris combinations by name: `morris-teams[-nobrain][-g<games>][-r<rounds>][-t<turns>][-solo][-fc][-vs-engine<depth>]`, for example
 * `morris-teams-g1-t60-solo` (one game, a turn limit of 60, one agent per side) or
 * `morris-teams-g6-solo-vs-engine2` (six games of one agent against the search at depth 2).
 */
const MORRIS_NAME = /^morris-teams(-nobrain)?(?:-g(\d+))?(?:-r(\d+))?(?:-t(\d+))?(-solo)?(-fc)?(?:-vs-engine(\d))?$/;

function parseMorris(id: string): CoreStoryEntry | undefined {
	const match = MORRIS_NAME.exec(id);
	if (match === null) return undefined;
	const games = match[2] === undefined ? undefined : Number(match[2]);
	const rounds = match[3] === undefined ? undefined : Number(match[3]);
	const turns = match[4] === undefined ? undefined : Number(match[4]);
	const engineDepth = match[7] === undefined ? undefined : Number(match[7]);
	if ((games !== undefined && (games < 1 || games > 20)) || (rounds !== undefined && (rounds < 1 || rounds > 20)) || (turns !== undefined && (turns < 10 || turns > 400)) || (engineDepth !== undefined && (engineDepth < 1 || engineDepth > 6))) return undefined;
	return morrisEntry({
		...(match[1] === "-nobrain" ? { brain: false } : {}),
		...(games === undefined ? {} : { games }),
		...(rounds === undefined ? {} : { maxRounds: rounds }),
		...(turns === undefined ? {} : { maxTurns: turns }),
		...(match[5] === "-solo" ? { teamSize: 1 as const } : {}),
		...(match[6] === "-fc" ? { fixedCaptain: true } : {}),
		...(engineDepth === undefined ? {} : { engineDepth }),
	});
}

/**
 * Convoy combinations by name: `convoy[-nobrain][-g<games>][-d<damage>][-c<cooldown>]`, for example `convoy-g1`
 * (one game) or `convoy-nobrain-d3` (three damaged stages stop the convoy).
 */
const CONVOY_NAME = /^convoy(-nobrain)?(?:-g(\d+))?(?:-d(\d+))?(?:-c(\d+))?$/;

function parseConvoy(id: string): CoreStoryEntry | undefined {
	const match = CONVOY_NAME.exec(id);
	if (match === null) return undefined;
	const games = match[2] === undefined ? undefined : Number(match[2]);
	const damage = match[3] === undefined ? undefined : Number(match[3]);
	const cooldown = match[4] === undefined ? undefined : Number(match[4]);
	if ((games !== undefined && (games < 1 || games > 20)) || (damage !== undefined && (damage < 1 || damage > 8)) || (cooldown !== undefined && (cooldown < 1 || cooldown > 8))) return undefined;
	return convoyEntry({ ...(match[1] === "-nobrain" ? { brain: false } : {}), ...(games === undefined ? {} : { games }), ...(damage === undefined ? {} : { damageToLose: damage }), ...(cooldown === undefined ? {} : { cooldown }) });
}

export function findCoreStory(name: string): CoreStoryEntry | undefined {
	const id = storyId(name);
	return Object.hasOwn(coreStories, id) ? coreStories[id] : (parseTictactoe(id) ?? parseEmberTricks(id) ?? chessEntryByName(id) ?? parseMorris(id) ?? saltMarketEntryByName(id) ?? lanternsEntryByName(id) ?? harborLightsEntryByName(id) ?? parseConvoy(id) ?? blindBidEntryByName(id));
}
