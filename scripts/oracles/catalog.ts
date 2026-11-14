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

export const CATALOG: readonly CatalogItem[] = [...TICTACTOE, ...QUARRY_ITEMS, ...ECON_LAB, ...LIARS_DICE];
