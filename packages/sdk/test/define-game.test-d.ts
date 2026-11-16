// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The type test of `defineGame` (M1 specification 6.2): `ToolOf` gives the bare tool names of the listed mechanics,
 * so a grant or a lock of another tool does not compile. `tsc -b` compiles this file and nothing here runs.
 */
import type { TObject } from "typebox";
import { defineGame, gameData } from "../src/game/define-game.ts";
import type { ToolOf } from "../src/game/types.ts";
import type { MechanicDefinition, None } from "../src/mechanic/types.ts";

declare const gridGame: MechanicDefinition<"grid", TObject, None, "viewBoard" | "playMove">;
declare const consensus: MechanicDefinition<"consensus", TObject, None, "proposeMove" | "castVote">;
declare const referee: MechanicDefinition<"optimal-referee", TObject, None, never>;

export const game = defineGame({
	id: "tictactoe",
	residents: 4,
	mechanics: [gridGame(), consensus({}), referee()],
	grants: { resident: ["viewBoard", "proposeMove", "castVote", "playMove"], watcher: { drop: ["castVote"], add: ["viewBoard"] } },
	locked: ["playMove"],
	end: { ticks: 20 },
});

export const everyTool: readonly ToolOf<typeof game.mechanics>[] = ["viewBoard", "playMove", "proposeMove", "castVote"];
// @ts-expect-error -- no listed mechanic declares `resign`
export const noTool: ToolOf<typeof game.mechanics> = "resign";

/** The data form takes any builder game and names its tools as plain strings. */
export const data: readonly string[] | undefined = gameData(game).data.locked;
export const used: MechanicDefinition | undefined = gameData(game).mechanics.grid;

export const wrongGrant = defineGame({
	id: "wrong-grant",
	residents: 2,
	mechanics: [gridGame()],
	// @ts-expect-error -- `castVote` is a tool of consensus, which is not listed
	grants: { resident: ["viewBoard", "castVote"] },
	end: { ticks: 1 },
});

export const wrongTweak = defineGame({
	id: "wrong-tweak",
	residents: 2,
	mechanics: [gridGame()],
	// @ts-expect-error -- `castVote` is a tool of consensus, which is not listed
	grants: { resident: { drop: ["castVote"] } },
	end: { ticks: 1 },
});

export const wrongLock = defineGame({
	id: "wrong-lock",
	residents: 2,
	mechanics: [gridGame(), referee()],
	// @ts-expect-error -- `proposeMove` is a tool of consensus, which is not listed
	locked: ["proposeMove"],
	end: { ticks: 1 },
});
