/** The oracle files to export: per game the variants and seeds, each with its source of calls. */
import type { Oracle } from "./format.ts";
import { liveOracle } from "./live.ts";
import * as players from "./players.ts";
import type { OracleCut } from "./record.ts";
import { scriptedOracle } from "./scripted.ts";
import type { AnyStory, Host, TurnTaker } from "@swarmtales/contracts";
import cityOfKeys from "../../stories/cityofkeys/story.ts";
import whispers, { whispersStory } from "../../stories/whispers/story.ts";
import { MemorySink } from "@swarmtales/chronicle";
import { gamemakerSteps } from "../../test/golden/host-scripts.ts";
import { burnResidents, fragmentCity } from "./city-burn.ts";
import { cityActOne, cityGamemaker, whispersGamemaker, whispersResidents } from "./city-scripts.ts";
import { halfCity } from "./city-act2.ts";
import { actTwoOracle, composedOracle, definitionText } from "./composed.ts";
import { actTwoSealResidents, cityClassifier, holdoutGamemaker, whispersHoldout } from "./m5-players.ts";

export interface CatalogItem {
	readonly game: string;
	/** `<variant>-s<seed>.json` under `oracles/<game>/`. */
	readonly file: string;
	make(): Promise<Oracle>;
}

export function oraclePath(item: CatalogItem): string {
	return `oracles/${item.game}/${item.file}`;
}

/** A recorded live run, replayed; `cut` stops a long game at a boundary; `as` names the registry story when the recording's name leaves an option out. */
function live(game: string, variant: string, seed: number, events: string, more: { readonly cut?: OracleCut; readonly as?: string; readonly tag?: string } = {}): CatalogItem {
	return {
		game,
		file: `${variant}-s${String(seed)}${more.tag === undefined ? "" : `-${more.tag}`}.json`,
		async make() {
			const { oracle } = await liveOracle({ game, events, ...(more.cut === undefined ? {} : { cut: more.cut }), ...(more.as === undefined ? {} : { variant, note: more.as }) });
			if (oracle.variant !== variant || oracle.seed !== seed) throw new Error(`${events}: is ${oracle.variant} seed ${String(oracle.seed)}, the catalog says ${variant} seed ${String(seed)}`);
			return oracle;
		},
	};
}

type PlayerName = keyof typeof players;

/** A registry story played by a player of `players.ts`. */
function scripted(game: string, variant: string, seed: number, script: PlayerName, note: string, cut?: OracleCut, tag?: string): CatalogItem {
	const player: (host: Host) => TurnTaker = players[script];
	return { game, file: `${variant}-s${String(seed)}${tag === undefined ? "" : `-${tag}`}.json`, make: () => scriptedOracle({ game, variant, seed, script, note, player, ...(cut === undefined ? {} : { cut }) }) };
}

const SILENT_NOTE = "nobody acts: the timers of the game play for every seat until the match ends";

/** A registry story in which no resident ever calls a tool: forfeits, missed moves and the match's end by the clock. */
function silent(game: string, variant: string, seed: number, what: string): CatalogItem {
	return scripted(game, variant, seed, "silent", `${SILENT_NOTE} (${what})`, undefined, "silent");
}

const TTT = "stories/tictactoe-teams/runs";
const TTT_NOTE = "game 1 X wins the top row, game 2 is a draw, game 3 O wins the middle row";

const TICTACTOE: readonly CatalogItem[] = [
	scripted("tictactoe", "tictactoe-teams", 7, "tictactoe", `teams of three with a brain: ${TTT_NOTE}; one brain text is refused as a replay of moves`),
	scripted("tictactoe", "tictactoe-teams", 11, "tictactoe", `teams of three with a brain: ${TTT_NOTE}; one brain text is refused as a replay of moves`),
	scripted("tictactoe", "tictactoe-teams-nobrain", 7, "tictactoe", `teams of three, no brain: ${TTT_NOTE}`),
	scripted("tictactoe", "tictactoe-teams-solo", 7, "tictactoe", `one resident per side with a brain: ${TTT_NOTE}`),
	scripted("tictactoe", "tictactoe-teams-4x4", 7, "tictactoe4x4", "teams of three, 4x4 board, four in a row: X wins, O wins, a full board"),
	live("tictactoe", "tictactoe-teams-5x5-nobrain-solo", 1, `${TTT}/tictactoe-teams-02a-015-strong-vs-haiku/haikuX-haikuO-s1/events.jsonl.gz`, { as: "recorded as tictactoe-teams-5x5-solo" }),
	live("tictactoe", "tictactoe-teams-5x5-nobrain-solo", 3, `${TTT}/tictactoe-teams-02a-015-strong-vs-haiku/haikuX-haikuO-s3/events.jsonl.gz`, { as: "recorded as tictactoe-teams-5x5-solo" }),
	scripted("tictactoe", "tictactoe-teams", 13, "tictactoeProbed", `teams of three with a brain: ${TTT_NOTE}; 24 calls are added that the rules refuse or that the plain script never makes`, undefined, "probes"),
	silent("tictactoe", "tictactoe-teams", 13, "four forfeited moves in a row, then the match is invalid"),
];

const ECON = "stories/econ-lab/runs/econ-lab-04a-003-brain-vs-nobrain";
const ECON_LAB: readonly CatalogItem[] = [
	live("econ-lab", "econ-lab", 41, `${ECON}/econ-lab-41/run/events.jsonl`),
	live("econ-lab", "econ-lab", 43, `${ECON}/econ-lab-43/run/events.jsonl`),
	live("econ-lab", "econ-lab-nobrain", 41, `${ECON}/econ-lab-nobrain-41/run/events.jsonl`),
	scripted("econ-lab", "econ-lab", 13, "econLabProbed", "A01 and A02 cooperate (put in 8, choose A), A03 and A04 do not (put in 2, choose B), everyone offers 4 and accepts 3 or more; 16 calls are added that the rules refuse or that the plain script never makes", undefined, "probes"),
	silent("econ-lab", "econ-lab", 13, "every decision is the default of the clock"),
];

const QUARRY = "stories/quarry/runs/quarry-04a-007-paired-seeds";
const QUARRY_ITEMS: readonly CatalogItem[] = [
	live("quarry", "quarry", 41, `${QUARRY}/quarry-41/run/events.jsonl`),
	live("quarry", "quarry", 61, `${QUARRY}/quarry-61/run/events.jsonl`),
	live("quarry", "quarry-nobrain", 41, `${QUARRY}/quarry-nobrain-41/run/events.jsonl`),
	live("quarry", "quarry-open", 59, `${QUARRY}/quarry-open-59/run/events.jsonl`, { cut: { type: "draft_game_ended", count: 2, reason: "two of three games, to keep the file small" } }),
	scripted("quarry", "quarry-burn", 13, "quarryProbed", "free burns, two a game: each seat drafts its own lane (A01 amber, A02 basalt, A03 cobalt, A04 jade), then lodestones, then the first card, A01 burns a lodestone; 12 calls are added that the rules refuse or that the plain script never makes", undefined, "probes"),
	silent("quarry", "quarry", 13, "every pick is made by the clock"),
];

const LIARS_NOTE = "A01 calls liar on every bid it faces, A02 bids one more die on its most common face with a remark, A03 makes the smallest raise, A04 calls once a bid names more than half the table";
const LIARS_CUT = { type: "dice_game_ended", count: 1, reason: "one of three games, to keep the file small" };
const LIARS_DICE: readonly CatalogItem[] = [
	scripted("liars-dice", "liars-dice", 7, "liarsDiceProbed", `${LIARS_NOTE}; four calls the rules refuse are added`, LIARS_CUT),
	scripted("liars-dice", "liars-dice", 11, "liarsDiceProbed", `${LIARS_NOTE}; four calls the rules refuse are added`, LIARS_CUT),
	scripted("liars-dice", "liars-dice-nobrain", 7, "liarsDice", LIARS_NOTE, LIARS_CUT),
	scripted("liars-dice", "liars-dice-hu-quiet-g2-d5", 7, "liarsDice", `heads-up, no table talk, two games, five dice, played to the end: ${LIARS_NOTE}`),
	scripted("liars-dice", "liars-dice-g1", 13, "liarsDiceProbedMore", `four seats, one game, played to the end of the match: ${LIARS_NOTE}; 11 calls are added that the rules refuse or that the plain script never makes`, undefined, "probes"),
	silent("liars-dice", "liars-dice-g1", 13, "one game: every seat opens with the lowest bid or calls liar when its two minutes are over"),
];

const BLIND_NOTE = "A01 bids its value or estimate, A02 half of it, A03 its value plus 5, A04 always passes";
const BLIND_BID: readonly CatalogItem[] = [
	scripted("blind-bid", "blind-bid", 7, "blindBidProbed", `${BLIND_NOTE}; three calls the rules refuse are added`),
	scripted("blind-bid", "blind-bid", 11, "blindBidProbed", `${BLIND_NOTE}; three calls the rules refuse are added`),
	scripted("blind-bid", "blind-bid-nobrain", 7, "blindBid", BLIND_NOTE),
	silent("blind-bid", "blind-bid", 13, "every bid is missed"),
	live("blind-bid", "blind-bid", 31, "stories/blind-bid/runs/blind-bid-04a-001-smoke/run/events.jsonl", { as: "recorded under the story's first name, lantern-auction; 12 of 104 turns show inputs worded differently today, every call gets the recorded answer", tag: "live" }),
];

const CHESS = "stories/chess/runs";
const CHESS_CUT = { type: "game_ended", count: 1, reason: "one of four games, to keep the file small" };
const CHESS_ITEMS: readonly CatalogItem[] = [
	live("chess", "chess-g4-p80", 41, `${CHESS}/chess-02a-045-default-g4-s41-r2/run/events.jsonl`, { cut: CHESS_CUT }),
	live("chess", "chess-compact-g4-p80", 41, `${CHESS}/chess-02a-047-compact-g4-s41-r2/run/events.jsonl`, { cut: CHESS_CUT }),
	live("chess", "chess-fresh-compact-g4-p80", 47, `${CHESS}/chess-02a-054-fresh-compact-low-g4-s47-r2/run/events.jsonl`, { cut: CHESS_CUT }),
	scripted("chess", "chess", 13, "chessMates", "the registry default, played to the end of the match: in every game White plays f3 and g4, Black e5 and Qh4 mate; six calls are added that the rules refuse or that the plain script never makes"),
	silent("chess", "chess", 13, "moves forfeited to a seeded legal move until the match is called off"),
];

const CONVOY = "stories/convoy/runs/convoy-06a-004-d3-brain-vs-nobrain";
const CONVOY_CUT = { type: "convoy_game_ended", count: 1, reason: "one of three games, to keep the file small" };
const CONVOY_ITEMS: readonly CatalogItem[] = [
	live("convoy", "convoy", 101, `${CONVOY}/convoy-s101/events.jsonl`, { cut: CONVOY_CUT }),
	live("convoy", "convoy", 104, `${CONVOY}/convoy-s104/events.jsonl`, { cut: CONVOY_CUT }),
	live("convoy", "convoy-nobrain", 104, `${CONVOY}/convoy-nobrain-s104/events.jsonl`, { cut: CONVOY_CUT }),
	silent("convoy", "convoy-g1", 13, "one game to its end and the scores"),
];

const EMBER = "stories/ember-tricks/runs";
const EMBER_CUT = { type: "game_ended", count: 1, reason: "one of four games, to keep the file small" };
const EMBER_TRICKS: readonly CatalogItem[] = [
	live("ember-tricks", "ember-tricks-g1", 31, `${EMBER}/ember-tricks-04a-004-quiet-look/run/events.jsonl.gz`),
	live("ember-tricks", "ember-tricks-calib-g4", 32, `${EMBER}/ember-tricks-04a-005-reference/calib-s32/events.jsonl.gz`, { cut: EMBER_CUT }),
	live("ember-tricks", "ember-tricks-mcbid-g4", 32, `${EMBER}/ember-tricks-04a-005-reference/mcbid-s32/events.jsonl.gz`, { cut: EMBER_CUT }),
	silent("ember-tricks", "ember-tricks", 13, "the registry default: bids and cards forfeited until the match is called off"),
];

const HARBOR = "stories/harbor-lights/runs";
const HARBOR_LIGHTS: readonly CatalogItem[] = [
	live("harbor-lights", "harbor-lights-g1", 103, `${HARBOR}/harbor-lights-04a-006-game1-plan/harbor-lights-g1-103/run/events.jsonl`),
	live("harbor-lights", "harbor-lights-g1", 110, `${HARBOR}/harbor-lights-04a-006-game1-plan/harbor-lights-g1-110/run/events.jsonl`),
	live("harbor-lights", "harbor-lights-nobrain-g1", 103, `${HARBOR}/harbor-lights-04a-006-game1-plan/harbor-lights-nobrain-g1-103/run/events.jsonl`),
	live("harbor-lights", "harbor-lights-solo-g1", 111, `${HARBOR}/harbor-lights-04a-006-game1-plan/harbor-lights-solo-g1-111/run/events.jsonl`),
	live("harbor-lights", "harbor-lights-nobrain", 37, `${HARBOR}/harbor-lights-04a-005-crew-nobrain-soft/harbor-lights-nobrain-37/run/events.jsonl`, { cut: { type: "game_ended", count: 2, reason: "two of three games, to keep the file small" } }),
	silent("harbor-lights", "harbor-lights", 13, "the registry default: every turn forfeited until the match is called off as invalid"),
];

const HOLDEM_NOTE = "A01 bets and raises whenever it may, A02 calls everything, A03 never puts a chip in voluntarily, A04 plays a pair or an ace and folds the rest";
const HOLDEM_CUT = { type: "hand_ended", count: 6, reason: "six hands of the first game (a game has eight), to keep the file small" };
const HOLDEM: readonly CatalogItem[] = [
	scripted("holdem", "holdem", 7, "holdemProbed", `${HOLDEM_NOTE}; three calls the rules refuse are added`, HOLDEM_CUT),
	scripted("holdem", "holdem", 11, "holdemProbed", `${HOLDEM_NOTE}; three calls the rules refuse are added`, HOLDEM_CUT),
	scripted("holdem", "holdem-nobrain", 7, "holdem", HOLDEM_NOTE, HOLDEM_CUT),
	scripted("holdem", "holdem-hu", 7, "holdem", `heads-up: ${HOLDEM_NOTE}`, HOLDEM_CUT),
	silent("holdem", "holdem-hu", 13, "heads-up: every action is the default of the clock, to the end of the match and its scores"),
];

const LANTERNS = "stories/lanterns/runs";
const LANTERNS_ITEMS: readonly CatalogItem[] = [
	live("lanterns", "lanterns", 73, `${LANTERNS}/lanterns-06a-006-more-seeds/brain-s73/run/events.jsonl`, { cut: { type: "clue_game_ended", count: 2, reason: "two of four games, to keep the file small" } }),
	live("lanterns", "lanterns", 107, `${LANTERNS}/lanterns-06a-006-more-seeds/brain-s107/run/events.jsonl`, { cut: { type: "clue_game_ended", count: 2, reason: "two of four games, to keep the file small" } }),
	live("lanterns", "lanterns-nobrain", 67, `${LANTERNS}/lanterns-06a-005-pace-and-handicap/nobrain-s67/events.jsonl`, { cut: { type: "clue_game_ended", count: 3, reason: "three of four games, to keep the file small" } }),
	silent("lanterns", "lanterns-g1", 13, "one game: every clue is missed, to the end of the match and its scores"),
];

const MORRIS = "stories/morris-teams/runs";
const MORRIS_ITEMS: readonly CatalogItem[] = [
	live("morris-teams", "morris-teams-nobrain-solo-vs-engine3", 33, `${MORRIS}/morris-teams-01a-006-solo-vs-engine3/nobrain-s33/events.jsonl`),
	live("morris-teams", "morris-teams-nobrain-solo-vs-engine3", 31, `${MORRIS}/morris-teams-01a-006-solo-vs-engine3/nobrain-s31/events.jsonl`),
	live("morris-teams", "morris-teams-solo-vs-engine3", 33, `${MORRIS}/morris-teams-01a-007-sonnet-opus-vs-engine3/sonnet-brain-s33/events.jsonl`),
	live("morris-teams", "morris-teams-nobrain-solo", 13, `${MORRIS}/morris-teams-02a-003-solo-brain-vs-nobrain/nobrain-s2/events.jsonl`, { cut: { type: "game_ended", count: 1, reason: "one of three games, to keep the file small" } }),
	silent("morris-teams", "morris-teams", 13, "the registry default, teams of three: forfeited moves, then the match is invalid"),
];

const SALT = "stories/salt-market/runs/salt-market-04a-006-v2-brain-vs-nobrain";
const SALT_CUT = { type: "market_game_ended", count: 2, reason: "two of four games, to keep the file small" };
const SALT_MARKET: readonly CatalogItem[] = [
	live("salt-market", "salt-market", 45, `${SALT}/salt-market-45/run/events.jsonl`, { cut: SALT_CUT }),
	live("salt-market", "salt-market", 46, `${SALT}/salt-market-46/run/events.jsonl`, { cut: SALT_CUT }),
	live("salt-market", "salt-market-nobrain", 45, `${SALT}/salt-market-nobrain-45/run/events.jsonl`, { cut: SALT_CUT }),
	silent("salt-market", "salt-market", 13, "four games with no trade, to the end of the match and its scores"),
];

/** A story definition written next to its oracles (`setup.definition.file`). */
export interface DefinitionFile {
	readonly path: string;
	text(): string;
}

const definition = (game: string, story: AnyStory, name: string): DefinitionFile => ({ path: `oracles/${game}/setup/${name}.story.json`, text: () => definitionText(story) });
const RUMOURS = whispersStory(false);

export const DEFINITIONS: readonly DefinitionFile[] = [
	definition("whispers", whispers, "whispers"),
	definition("whispers", RUMOURS, "whispers-rumours"),
	definition("cityofkeys", cityOfKeys, "cityofkeys"),
	definition("cityofkeys", halfCity(), "cityofkeys-act2"),
	definition("cityofkeys", fragmentCity(), "cityofkeys-burn"),
];

const WHISPERS_NOTE = "everyone names the favourite in every vote, the sender greets the whisperer, the whisperer hands the victim a fragment, spreads a rumour three times and forges the sender's receipt; the others open doors; the gamemaker sends the whisperer one notice at minute 13";

function whispersItem(variant: string, story: AnyStory, seed: number): CatalogItem {
	return {
		game: "whispers",
		file: `${variant}-s${String(seed)}.json`,
		make: () =>
			composedOracle({
				game: "whispers",
				variant,
				story,
				definition: `setup/${variant}.story.json`,
				script: "whispersResidents",
				note: `20 minutes, one turn per resident and minute: ${WHISPERS_NOTE}`,
				fixture: { seed, minutes: 20, script: whispersResidents, gamemakerScript: (host) => whispersGamemaker(host, 20) },
			}),
	};
}

const WHISPERS: readonly CatalogItem[] = [whispersItem("whispers", whispers, 7), whispersItem("whispers", whispers, 11), whispersItem("whispers-rumours", RUMOURS, 7)];

const ACT_ONE_NOTE = "six residents, 12 minutes, one turn per resident and minute: board posts, DMs, transfers of a point, status and board reads, wrong codes with their penalty, doors opened with the right code; the gamemaker posts once at minute 6";

function cityActOneItem(seed: number, resumeAfter?: number): CatalogItem {
	return {
		game: "cityofkeys",
		file: `cityofkeys-act1-s${String(seed)}${resumeAfter === undefined ? "" : "-resumed"}.json`,
		make: () =>
			composedOracle({
				game: "cityofkeys",
				variant: "cityofkeys-act1",
				story: cityOfKeys,
				definition: "setup/cityofkeys.story.json",
				script: "cityActOne",
				note: resumeAfter === undefined ? ACT_ONE_NOTE : `${ACT_ONE_NOTE}; the run is saved after minute ${String(resumeAfter)} and continued on a fresh instance`,
				fixture: { agents: 6, minutes: 12, seed, names: true, script: cityActOne, gamemakerScript: (host) => cityGamemaker(host, 12) },
				...(resumeAfter === undefined ? {} : { resumeAfter }),
			}),
	};
}

const ACT_TWO_NOTE = "six residents continue from a saved first act: two DMs with delivery receipts and two blames judged by a model role, a faction draft, three tribunals with votes, a ransom, a last will, three exiles with kept and passed pieces and contracted levels, and a gamemaker that plans the second tribunal (one plan refused)";
const cityActTwo: CatalogItem = {
	game: "cityofkeys",
	file: "cityofkeys-act2-s7.json",
	make: () => actTwoOracle({ game: "cityofkeys", variant: "cityofkeys-act2", definition: "setup/cityofkeys-act2.story.json", note: ACT_TWO_NOTE }),
};

const BURN_NOTE = "six residents, a tribunal in the first act that exiles a third of the city: everyone opens doors 1 to 3 and stops at door 4 without sharing its fragment; in each of the two tribunals everybody votes against the accused with the highest id; nobody pays a ransom, so each exile burns a fragment its team still needs";
const cityBurn: CatalogItem = {
	game: "cityofkeys",
	file: "cityofkeys-burn-s7.json",
	make: () => {
		const lines = new MemorySink();
		return composedOracle({
			game: "cityofkeys",
			variant: "cityofkeys-burn",
			story: fragmentCity(),
			definition: "setup/cityofkeys-burn.story.json",
			script: "burnResidents",
			from: "scripts/oracles/city-burn.ts",
			note: BURN_NOTE,
			fixture: { agents: 6, minutes: 40, seed: 7, names: true, activation: "always", passesPerMinute: 1, stopWhenDone: false, stopWhenSeatsDecided: false, script: (host) => burnResidents({ host, lines }), gamemakerScript: (host) => gamemakerSteps(host, 40, () => undefined), sinks: [lines] },
		});
	},
};

const CITY: readonly CatalogItem[] = [cityActOneItem(7), cityActOneItem(7, 6), cityActOneItem(11), cityActTwo, cityBurn];

// Added for milestone M5 of the rewrite (decision A59): scenes that no file reached; the players are in `m5-players.ts`.
const M5 = "scripts/oracles/m5-players.ts";
const HOLDOUT_NOTE =
	"26 minutes, one turn per resident and minute: everyone opens its doors with its own code, the whisperer too; the victim stops before door 3 and everyone but the favourite sends it its door-3 fragment; the gamemaker puts the favourite on trial at minute 15, the grace passes, the whisperer votes no in each of the three votes, the gamemaker announces the first failure, draws the lot after the last and strikes the one drawn";
const M5_ITEMS: readonly CatalogItem[] = [
	{
		game: "whispers",
		file: "whispers-holdout-s7.json",
		make: () =>
			composedOracle({
				game: "whispers",
				variant: "whispers",
				story: whispers,
				definition: "setup/whispers.story.json",
				script: "whispersHoldout",
				from: M5,
				note: HOLDOUT_NOTE,
				fixture: { seed: 7, minutes: 26, script: whispersHoldout, gamemakerScript: (host) => holdoutGamemaker(host, 26) },
			}),
	},
	{
		game: "cityofkeys",
		file: "cityofkeys-act2-seal-s7.json",
		make: () =>
			actTwoOracle({
				game: "cityofkeys",
				variant: "cityofkeys-act2",
				definition: "setup/cityofkeys-act2.story.json",
				note: `${ACT_TWO_NOTE}; and the black seal: A06 and A02 bid once while the auction runs, A06 wins and breaks the seal on A04`,
				residents: { script: actTwoSealResidents, from: `${M5}#actTwoSealResidents` },
			}),
	},
	{
		game: "cityofkeys",
		file: "cityofkeys-act1-classifier-s7.json",
		make: () =>
			composedOracle({
				game: "cityofkeys",
				variant: "cityofkeys-act1",
				story: cityOfKeys,
				definition: "setup/cityofkeys.story.json",
				script: "cityActOne",
				note: `${ACT_ONE_NOTE}; with the statement classifier (the Confessor, ${M5}#cityClassifier): in each round with statements it labels the board's questions helpRequest and each DM's proposal offer and promise to its recipient; its third answer also names a statement that is not in the round, its fourth comes without its tool`,
				fixture: { agents: 6, minutes: 12, seed: 7, names: true, script: cityActOne, gamemakerScript: (host) => cityGamemaker(host, 12), classifierScript: cityClassifier(12) },
			}),
	},
];

export const CATALOG: readonly CatalogItem[] = [
	...TICTACTOE,
	...QUARRY_ITEMS,
	...ECON_LAB,
	...LIARS_DICE,
	...BLIND_BID,
	...CHESS_ITEMS,
	...CONVOY_ITEMS,
	...EMBER_TRICKS,
	...HARBOR_LIGHTS,
	...HOLDEM,
	...LANTERNS_ITEMS,
	...MORRIS_ITEMS,
	...SALT_MARKET,
	...WHISPERS,
	...CITY,
	...M5_ITEMS,
];
