// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Published standings (old `standings.ts`, `World.publishBands` and `publishSnapshot`), carried from `legacy`
 * `mechanics/script/src/standings.ts`: bands of ids without points (the banished apart), or the whole ranking. The
 * board post of `channels` goes first, then `standings_published` with its number.
 */
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { ProgressionService } from "@swarmtales/mechanic-progression/contract";
import { need, type ScriptCtx } from "./head.ts";
import { isExiled } from "./reads.ts";

const CITY = "CITY";

interface Ranked {
	readonly agent: string;
	readonly rank: number;
}

/**
 * The three bands of a ranking.
 *
 * @public
 */
export interface StandingBands {
	/** Rank at most the survivors. */
	readonly safe: string[];
	/** The next `edgeSize` ranks. */
	readonly edge: string[];
	/** The rest. */
	readonly out: string[];
}

/**
 * Splits a ranking into its bands (old `standingBands`).
 *
 * @param ranking - The ranking, any order.
 * @param survivors - The seats at the end.
 * @param edgeSize - How many ranks stand on the edge.
 * @returns The bands, each in rank order.
 *
 * @public
 */
export function standingBands(ranking: readonly Ranked[], survivors: number, edgeSize: number): StandingBands {
	const ordered = [...ranking].sort((a, b) => a.rank - b.rank);
	return {
		safe: ordered.filter((entry) => entry.rank <= survivors).map((entry) => entry.agent),
		edge: ordered.filter((entry) => entry.rank > survivors && entry.rank <= survivors + edgeSize).map((entry) => entry.agent),
		out: ordered.filter((entry) => entry.rank > survivors + edgeSize).map((entry) => entry.agent),
	};
}

// The ids of a band, sorted so the order leaks no ranks.
function list(ids: readonly string[]): string {
	return ids.length === 0 ? "-" : [...ids].sort((a, b) => a.localeCompare(b)).join(", ");
}

/**
 * Posts the bands and writes `standings_published` (old `publishBands`).
 *
 * @param ctx - The script's context.
 * @param edgeSize - How many ranks stand on the edge.
 */
export function publishBands(ctx: ScriptCtx, edgeSize: number): void {
	const ranking = need(ctx, ProgressionService, "ranking", {});
	const survivors = need(ctx, ProgressionService, "bounds", {}).survivors;
	const bands = standingBands(
		ranking.filter((entry) => !isExiled(ctx, entry.agent)),
		survivors,
		edgeSize,
	);
	const exiled = ranking.filter((entry) => isExiled(ctx, entry.agent)).map((entry) => entry.agent);
	const variables = { minute: ctx.tick, safe: list(bands.safe), edge: list(bands.edge), out: list(bands.out) };
	const text = exiled.length === 0 ? ctx.prompt("script/standings-bands", variables) : ctx.prompt("script/standings-bands-exiled", { ...variables, exiled: list(exiled) });
	const post = need(ctx, ChannelsService, "post", { author: CITY, text });
	ctx.emit("standings_published", { mode: "bands", postSeq: post.postSeq, ...bands, ...(exiled.length === 0 ? {} : { exiled }) });
}

/**
 * Posts the whole ranking and writes `standings_published` (old `publishSnapshot`).
 *
 * @param ctx - The script's context.
 */
export function publishSnapshot(ctx: ScriptCtx): void {
	const rows = [...need(ctx, ProgressionService, "ranking", {})]
		.sort((a, b) => a.rank - b.rank)
		.map((entry) => ctx.prompt("script/standings-row", { rank: entry.rank, agent: entry.agent, points: entry.points, level: entry.level }));
	const post = need(ctx, ChannelsService, "post", { author: CITY, text: ctx.prompt("script/standings-snapshot", { minute: ctx.tick, rows: rows.join(" · ") }) });
	ctx.emit("standings_published", { mode: "snapshot", postSeq: post.postSeq });
}
