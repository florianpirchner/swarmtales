/**
 * Published standings (SPEC 9). Own points and rank are always visible to
 * oneself; others' points stay hidden unless the director publishes bands
 * (IDs per band, no points) or a full snapshot.
 */
import type { CompetitorId } from "../core/ids.ts";

export interface RankedCompetitor {
	readonly agent: CompetitorId;
	readonly rank: number;
	readonly points: number;
	readonly level: number;
}

export interface StandingBands {
	/** Rank <= survivors. */
	readonly safe: readonly CompetitorId[];
	/** The next `edgeSize` ranks. */
	readonly edge: readonly CompetitorId[];
	readonly out: readonly CompetitorId[];
}

export function standingBands(ranking: readonly RankedCompetitor[], survivors: number, edgeSize: number): StandingBands {
	const ordered = [...ranking].sort((a, b) => a.rank - b.rank);
	return {
		safe: ordered.filter((entry) => entry.rank <= survivors).map((entry) => entry.agent),
		edge: ordered.filter((entry) => entry.rank > survivors && entry.rank <= survivors + edgeSize).map((entry) => entry.agent),
		out: ordered.filter((entry) => entry.rank > survivors + edgeSize).map((entry) => entry.agent),
	};
}

/** Board line for bands; IDs in each band are sorted so the order leaks no ranks. */
export function bandsLine(minute: number, bands: StandingBands, exiled: readonly CompetitorId[] = []): string {
	const list = (ids: readonly CompetitorId[]) => (ids.length === 0 ? "-" : [...ids].sort((a, b) => a.localeCompare(b)).join(", "));
	const line = `Standings at minute ${minute} · safe: ${list(bands.safe)} · edge: ${list(bands.edge)} · out: ${list(bands.out)}`;
	return exiled.length === 0 ? line : `${line} · exiled: ${list(exiled)}`;
}

export function snapshotLine(minute: number, ranking: readonly RankedCompetitor[]): string {
	const rows = [...ranking]
		.sort((a, b) => a.rank - b.rank)
		.map((entry) => `${entry.rank}. ${entry.agent} ${entry.points} points, level ${entry.level}`);
	return `Standings at minute ${minute} · ${rows.join(" · ")}`;
}
