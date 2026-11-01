/**
 * Published standings (SPEC 9; old packages/engine/src/standings.ts and `World.publishBands`,
 * `publishSnapshot`): bands of ids without points (exiled residents apart), or the whole ranking.
 * The board post goes first, then `standings_published` with its number.
 */
import { ChannelsApi, ProgressionApi } from "@swarmtales/mechanic-shared";
import { isExiled } from "./city.ts";
import { need, type ScriptCtx } from "./head.ts";

const CITY = "CITY";

interface Ranked {
	readonly agent: string;
	readonly rank: number;
	readonly points: number;
	readonly level: number;
}

export interface StandingBands {
	/** Rank <= survivors. */
	readonly safe: string[];
	/** The next `edgeSize` ranks. */
	readonly edge: string[];
	readonly out: string[];
}

export function standingBands(ranking: readonly Ranked[], survivors: number, edgeSize: number): StandingBands {
	const ordered = [...ranking].sort((a, b) => a.rank - b.rank);
	return {
		safe: ordered.filter((entry) => entry.rank <= survivors).map((entry) => entry.agent),
		edge: ordered.filter((entry) => entry.rank > survivors && entry.rank <= survivors + edgeSize).map((entry) => entry.agent),
		out: ordered.filter((entry) => entry.rank > survivors + edgeSize).map((entry) => entry.agent),
	};
}

/** Ids of a band, sorted so the order leaks no ranks. */
function list(ids: readonly string[]): string {
	return ids.length === 0 ? "-" : [...ids].sort((a, b) => a.localeCompare(b)).join(", ");
}

export function publishBands(ctx: ScriptCtx, edgeSize: number): void {
	const ranking = need(ctx, ProgressionApi, "ranking", {});
	const survivors = need(ctx, ProgressionApi, "bounds", {}).survivors;
	const bands = standingBands(
		ranking.filter((entry) => !isExiled(ctx, entry.agent)),
		survivors,
		edgeSize,
	);
	const exiled = ranking.filter((entry) => isExiled(ctx, entry.agent)).map((entry) => entry.agent);
	const variables = { minute: ctx.minute, safe: list(bands.safe), edge: list(bands.edge), out: list(bands.out) };
	const text = exiled.length === 0 ? ctx.prompt("script/standings-bands", variables) : ctx.prompt("script/standings-bands-exiled", { ...variables, exiled: list(exiled) });
	const post = need(ctx, ChannelsApi, "post", { author: CITY, text });
	ctx.emit("standings_published", { mode: "bands", postSeq: post.postSeq, ...bands, ...(exiled.length === 0 ? {} : { exiled }) });
}

export function publishSnapshot(ctx: ScriptCtx): void {
	const rows = [...need(ctx, ProgressionApi, "ranking", {})]
		.sort((a, b) => a.rank - b.rank)
		.map((entry) => ctx.prompt("script/standings-row", { rank: entry.rank, agent: entry.agent, points: entry.points, level: entry.level }));
	const post = need(ctx, ChannelsApi, "post", { author: CITY, text: ctx.prompt("script/standings-snapshot", { minute: ctx.minute, rows: rows.join(" · ") }) });
	ctx.emit("standings_published", { mode: "snapshot", postSeq: post.postSeq });
}
