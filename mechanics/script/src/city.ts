/**
 * What the director reads of the city, through the APIs of the mechanics that own it (old `World`
 * getters). Two old reads have no query yet and come from those mechanics' own events in the log:
 * a level's teams (old `teamsOf`, the `team` index of `fragments_dealt` / `factors_dealt`) and a
 * collection (old `cast.collection`: `collection_started`, `collection_shortened`, `cast_dm`); and the
 * status of a petition (old `petitions.status`: `petition_opened`, `petition_resolved`). See
 * docs/design/step18-requests-S1.md.
 */
import { Type } from "typebox";
import { Check } from "typebox/value";
import { ExileApi, ProgressionApi } from "@swarmtales/mechanic-shared";
import { need, type ScriptCtx } from "./head.ts";

/** Every resident still in the city, in the story's order (old `alive`). */
export function alive(ctx: ScriptCtx): readonly string[] {
	return ctx.tryCall(ExileApi, "alive", {}) ?? ctx.residents.ids;
}

export function isExiled(ctx: ScriptCtx, resident: string): boolean {
	return ctx.tryCall(ExileApi, "isExiled", { resident }) ?? false;
}

export function levelOf(ctx: ScriptCtx, resident: string): number {
	return need(ctx, ProgressionApi, "levelOf", { resident });
}

/** Whether `level` is played in this run (old `isPlayable`). */
export function isPlayable(ctx: ScriptCtx, level: number): boolean {
	const bounds = need(ctx, ProgressionApi, "bounds", {});
	return level >= bounds.startLevel && level <= bounds.lastLevel;
}

const Deal = Type.Object({ level: Type.Number(), holdings: Type.Array(Type.Object({ agent: Type.String(), team: Type.Number() })) });

/** A level's teams in the deal's order, each with its members (old `teamsOf`); empty while the level is not dealt. */
export function teamsOf(ctx: ScriptCtx, level: number): readonly (readonly string[])[] {
	const deals = [...ctx.log.ofType("puzzles", "fragments_dealt"), ...ctx.log.ofType("puzzles", "factors_dealt")]
		.sort((a, b) => a.seq - b.seq)
		.map((event) => event.payload)
		.filter((payload) => Check(Deal, payload) && payload.level === level);
	const deal = deals.at(-1);
	if (!Check(Deal, deal)) return [];
	const teams: string[][] = [];
	for (const holding of deal.holdings) {
		const members = teams[holding.team] ?? [];
		members.push(holding.agent);
		teams[holding.team] = members;
	}
	return teams.filter((members) => members.length > 0);
}

/** A collection as the old `cast.collection` showed it to the director: its end, its size and how many DMs it holds. */
export interface CollectionView {
	readonly first: number;
	readonly untilMinute: number;
	readonly entries: number;
}

const Started = Type.Object({ into: Type.String(), first: Type.Number(), untilMinute: Type.Number() });
const Shortened = Type.Object({ into: Type.String(), untilMinute: Type.Number() });
const CastDm = Type.Object({ collections: Type.Array(Type.String()) });

export function collectionOf(ctx: ScriptCtx, into: string): CollectionView | undefined {
	const started = ctx.log.ofType("cast", "collection_started").map((event) => event.payload).find((payload) => Check(Started, payload) && payload.into === into);
	if (!Check(Started, started)) return undefined;
	const shortened = ctx.log
		.ofType("cast", "collection_shortened")
		.map((event) => event.payload)
		.filter((payload) => Check(Shortened, payload) && payload.into === into)
		.at(-1);
	const entries = ctx.log.ofType("cast", "cast_dm").filter((event) => Check(CastDm, event.payload) && event.payload.collections.includes(into)).length;
	return { first: started.first, untilMinute: Check(Shortened, shortened) ? shortened.untilMinute : started.untilMinute, entries };
}

const PetitionId = Type.Object({ petition: Type.String() });
const Resolved = Type.Object({ petition: Type.String(), outcome: Type.Union([Type.Literal("passed"), Type.Literal("failed")]) });

/** Old `petitions.status`: open once opened, then its outcome; undefined for a petition never opened. */
export function petitionStatus(ctx: ScriptCtx, petition: string): "open" | "passed" | "failed" | undefined {
	const resolved = ctx.log.ofType("petitions", "petition_resolved").map((event) => event.payload).find((payload) => Check(Resolved, payload) && payload.petition === petition);
	if (Check(Resolved, resolved)) return resolved.outcome;
	return ctx.log.ofType("petitions", "petition_opened").some((event) => Check(PetitionId, event.payload) && event.payload.petition === petition) ? "open" : undefined;
}
