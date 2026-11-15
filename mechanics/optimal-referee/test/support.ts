// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** A grid-game match with the referee and a stateless scripted player (as the support file of the grid-game tests). */
import type { ActorDriver, Envelope } from "@swarmtales/contracts";
import { gridGame } from "@swarmtales/mechanic-grid-game";
import { defineGame, type Game } from "@swarmtales/sdk";
import { optimalReferee } from "../src/index.ts";

/** Reads the board with `viewBoard` and plays the next cell of the script; stateless, so a resumed run plays on. */
export function scriptedPlayer(script: Readonly<Record<number, readonly number[]>>): ActorDriver {
	return async (turn) => {
		const view = await turn.call("viewBoard", {});
		if (!view.ok) return;
		const game = /Game (\d+)\./.exec(view.reply)?.[1];
		if (game === undefined) return;
		const marks = (view.reply.split("\n").slice(0, 3).join("").match(/[XO]/g) ?? []).length;
		const cell = script[Number(game)]?.[marks];
		if (cell !== undefined) await turn.call("playMove", { cell });
	};
}

/** One game of the grid game between two teams of two, scored by the referee. */
export function matchGame(): Game {
	return defineGame({
		id: "grid-game-test",
		seed: 7,
		residents: ["A01", "A02", "A03", "A04"],
		mechanics: [gridGame({ games: 1, teams: { X: ["A01", "A02"], O: ["A03", "A04"] } }), optimalReferee()],
		scheduler: { id: "turns", options: { passes: 2, activation: "onNews", order: "roster" } },
		end: { ticks: 40 },
	});
}

/** One field of an event's payload, untyped. */
export function field(event: Envelope, key: string): unknown {
	const payload = event.payload;
	return typeof payload === "object" && payload !== null ? Reflect.get(payload, key) : undefined;
}
