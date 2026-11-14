/** The oracle files to export: per game the variants and seeds, each with its source of calls. */
import type { Oracle } from "./format.ts";
import { liveOracle } from "./live.ts";
import * as players from "./players.ts";
import type { OracleCut } from "./record.ts";
import { scriptedOracle } from "./scripted.ts";
import type { Host, TurnTaker } from "@swarmtales/contracts";

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
function scripted(game: string, variant: string, seed: number, script: PlayerName, note: string, cut?: OracleCut): CatalogItem {
	const player: (host: Host) => TurnTaker = players[script];
	return { game, file: `${variant}-s${String(seed)}.json`, make: () => scriptedOracle({ game, variant, seed, script, note, player, ...(cut === undefined ? {} : { cut }) }) };
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
];

const ECON = "stories/econ-lab/runs/econ-lab-04a-003-brain-vs-nobrain";
const ECON_LAB: readonly CatalogItem[] = [
	live("econ-lab", "econ-lab", 41, `${ECON}/econ-lab-41/run/events.jsonl`),
	live("econ-lab", "econ-lab", 43, `${ECON}/econ-lab-43/run/events.jsonl`),
	live("econ-lab", "econ-lab-nobrain", 41, `${ECON}/econ-lab-nobrain-41/run/events.jsonl`),
];

const QUARRY = "stories/quarry/runs/quarry-04a-007-paired-seeds";
const QUARRY_ITEMS: readonly CatalogItem[] = [
	live("quarry", "quarry", 41, `${QUARRY}/quarry-41/run/events.jsonl`),
	live("quarry", "quarry", 61, `${QUARRY}/quarry-61/run/events.jsonl`),
	live("quarry", "quarry-nobrain", 41, `${QUARRY}/quarry-nobrain-41/run/events.jsonl`),
	live("quarry", "quarry-open", 59, `${QUARRY}/quarry-open-59/run/events.jsonl`, { cut: { type: "draft_game_ended", count: 2, reason: "two of three games, to keep the file small" } }),
];

const LIARS_NOTE = "A01 calls liar on every bid it faces, A02 bids one more die on its most common face with a remark, A03 makes the smallest raise, A04 calls once a bid names more than half the table";
const LIARS_CUT = { type: "dice_game_ended", count: 1, reason: "one of three games, to keep the file small" };
const LIARS_DICE: readonly CatalogItem[] = [
	scripted("liars-dice", "liars-dice", 7, "liarsDiceProbed", `${LIARS_NOTE}; four calls the rules refuse are added`, LIARS_CUT),
	scripted("liars-dice", "liars-dice", 11, "liarsDiceProbed", `${LIARS_NOTE}; four calls the rules refuse are added`, LIARS_CUT),
	scripted("liars-dice", "liars-dice-nobrain", 7, "liarsDice", LIARS_NOTE, LIARS_CUT),
	scripted("liars-dice", "liars-dice-hu-quiet-g2-d5", 7, "liarsDice", `heads-up, no table talk, two games, five dice, played to the end: ${LIARS_NOTE}`),
];

const BLIND_NOTE = "A01 bids its value or estimate, A02 half of it, A03 its value plus 5, A04 always passes";
const BLIND_BID: readonly CatalogItem[] = [
	scripted("blind-bid", "blind-bid", 7, "blindBidProbed", `${BLIND_NOTE}; three calls the rules refuse are added`),
	scripted("blind-bid", "blind-bid", 11, "blindBidProbed", `${BLIND_NOTE}; three calls the rules refuse are added`),
	scripted("blind-bid", "blind-bid-nobrain", 7, "blindBid", BLIND_NOTE),
	live("blind-bid", "blind-bid", 31, "stories/blind-bid/runs/blind-bid-04a-001-smoke/run/events.jsonl", { as: "recorded under the story's first name, lantern-auction; 12 of 104 turns show inputs worded differently today, every call gets the recorded answer", tag: "live" }),
];

const CHESS = "stories/chess/runs";
const CHESS_CUT = { type: "game_ended", count: 1, reason: "one of four games, to keep the file small" };
const CHESS_ITEMS: readonly CatalogItem[] = [
	live("chess", "chess-g4-p80", 41, `${CHESS}/chess-02a-045-default-g4-s41-r2/run/events.jsonl`, { cut: CHESS_CUT }),
	live("chess", "chess-compact-g4-p80", 41, `${CHESS}/chess-02a-047-compact-g4-s41-r2/run/events.jsonl`, { cut: CHESS_CUT }),
	live("chess", "chess-fresh-compact-g4-p80", 47, `${CHESS}/chess-02a-054-fresh-compact-low-g4-s47-r2/run/events.jsonl`, { cut: CHESS_CUT }),
];

const CONVOY = "stories/convoy/runs/convoy-06a-004-d3-brain-vs-nobrain";
const CONVOY_CUT = { type: "convoy_game_ended", count: 1, reason: "one of three games, to keep the file small" };
const CONVOY_ITEMS: readonly CatalogItem[] = [
	live("convoy", "convoy", 101, `${CONVOY}/convoy-s101/events.jsonl`, { cut: CONVOY_CUT }),
	live("convoy", "convoy", 104, `${CONVOY}/convoy-s104/events.jsonl`, { cut: CONVOY_CUT }),
	live("convoy", "convoy-nobrain", 104, `${CONVOY}/convoy-nobrain-s104/events.jsonl`, { cut: CONVOY_CUT }),
];

const EMBER = "stories/ember-tricks/runs";
const EMBER_CUT = { type: "game_ended", count: 1, reason: "one of four games, to keep the file small" };
const EMBER_TRICKS: readonly CatalogItem[] = [
	live("ember-tricks", "ember-tricks-g1", 31, `${EMBER}/ember-tricks-04a-004-quiet-look/run/events.jsonl.gz`),
	live("ember-tricks", "ember-tricks-calib-g4", 32, `${EMBER}/ember-tricks-04a-005-reference/calib-s32/events.jsonl.gz`, { cut: EMBER_CUT }),
	live("ember-tricks", "ember-tricks-mcbid-g4", 32, `${EMBER}/ember-tricks-04a-005-reference/mcbid-s32/events.jsonl.gz`, { cut: EMBER_CUT }),
];

const HARBOR = "stories/harbor-lights/runs";
const HARBOR_LIGHTS: readonly CatalogItem[] = [
	live("harbor-lights", "harbor-lights-g1", 103, `${HARBOR}/harbor-lights-04a-006-game1-plan/harbor-lights-g1-103/run/events.jsonl`),
	live("harbor-lights", "harbor-lights-g1", 110, `${HARBOR}/harbor-lights-04a-006-game1-plan/harbor-lights-g1-110/run/events.jsonl`),
	live("harbor-lights", "harbor-lights-nobrain-g1", 103, `${HARBOR}/harbor-lights-04a-006-game1-plan/harbor-lights-nobrain-g1-103/run/events.jsonl`),
	live("harbor-lights", "harbor-lights-solo-g1", 111, `${HARBOR}/harbor-lights-04a-006-game1-plan/harbor-lights-solo-g1-111/run/events.jsonl`),
	live("harbor-lights", "harbor-lights-nobrain", 37, `${HARBOR}/harbor-lights-04a-005-crew-nobrain-soft/harbor-lights-nobrain-37/run/events.jsonl`, { cut: { type: "game_ended", count: 2, reason: "two of three games, to keep the file small" } }),
];

const HOLDEM_NOTE = "A01 bets and raises whenever it may, A02 calls everything, A03 never puts a chip in voluntarily, A04 plays a pair or an ace and folds the rest";
const HOLDEM_CUT = { type: "hand_ended", count: 6, reason: "six hands of the first game (a game has eight), to keep the file small" };
const HOLDEM: readonly CatalogItem[] = [
	scripted("holdem", "holdem", 7, "holdemProbed", `${HOLDEM_NOTE}; three calls the rules refuse are added`, HOLDEM_CUT),
	scripted("holdem", "holdem", 11, "holdemProbed", `${HOLDEM_NOTE}; three calls the rules refuse are added`, HOLDEM_CUT),
	scripted("holdem", "holdem-nobrain", 7, "holdem", HOLDEM_NOTE, HOLDEM_CUT),
	scripted("holdem", "holdem-hu", 7, "holdem", `heads-up: ${HOLDEM_NOTE}`, HOLDEM_CUT),
];

const LANTERNS = "stories/lanterns/runs";
const LANTERNS_ITEMS: readonly CatalogItem[] = [
	live("lanterns", "lanterns", 73, `${LANTERNS}/lanterns-06a-006-more-seeds/brain-s73/run/events.jsonl`, { cut: { type: "clue_game_ended", count: 2, reason: "two of four games, to keep the file small" } }),
	live("lanterns", "lanterns", 107, `${LANTERNS}/lanterns-06a-006-more-seeds/brain-s107/run/events.jsonl`, { cut: { type: "clue_game_ended", count: 2, reason: "two of four games, to keep the file small" } }),
	live("lanterns", "lanterns-nobrain", 67, `${LANTERNS}/lanterns-06a-005-pace-and-handicap/nobrain-s67/events.jsonl`, { cut: { type: "clue_game_ended", count: 3, reason: "three of four games, to keep the file small" } }),
];

const MORRIS = "stories/morris-teams/runs";
const MORRIS_ITEMS: readonly CatalogItem[] = [
	live("morris-teams", "morris-teams-nobrain-solo-vs-engine3", 33, `${MORRIS}/morris-teams-01a-006-solo-vs-engine3/nobrain-s33/events.jsonl`),
	live("morris-teams", "morris-teams-nobrain-solo-vs-engine3", 31, `${MORRIS}/morris-teams-01a-006-solo-vs-engine3/nobrain-s31/events.jsonl`),
	live("morris-teams", "morris-teams-solo-vs-engine3", 33, `${MORRIS}/morris-teams-01a-007-sonnet-opus-vs-engine3/sonnet-brain-s33/events.jsonl`),
	live("morris-teams", "morris-teams-nobrain-solo", 13, `${MORRIS}/morris-teams-02a-003-solo-brain-vs-nobrain/nobrain-s2/events.jsonl`, { cut: { type: "game_ended", count: 1, reason: "one of three games, to keep the file small" } }),
];

const SALT = "stories/salt-market/runs/salt-market-04a-006-v2-brain-vs-nobrain";
const SALT_CUT = { type: "market_game_ended", count: 2, reason: "two of four games, to keep the file small" };
const SALT_MARKET: readonly CatalogItem[] = [
	live("salt-market", "salt-market", 45, `${SALT}/salt-market-45/run/events.jsonl`, { cut: SALT_CUT }),
	live("salt-market", "salt-market", 46, `${SALT}/salt-market-46/run/events.jsonl`, { cut: SALT_CUT }),
	live("salt-market", "salt-market-nobrain", 45, `${SALT}/salt-market-nobrain-45/run/events.jsonl`, { cut: SALT_CUT }),
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
];
