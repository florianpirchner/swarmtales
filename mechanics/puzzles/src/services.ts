/**
 * The services of the puzzles mechanic: every method of the shared `PuzzlesApi`.
 */
import type { Static } from "typebox";
import { ChannelsApi, ExileApi, ProgressionApi, type PuzzlesApi } from "@swarmtales/mechanic-shared";
import { cityFactorOf } from "./additive.ts";
import { dealLevel, inheritedFragments, isPasswordPiece, lastLevelOf, solutionOf } from "./deal.ts";
import type { PuzzlesCtx } from "./head.ts";
import { carriesGuardedFragment } from "./guard.ts";
import { heldPieces, isHandover, openFragmentDoors } from "./held.ts";
import { holdersOf, taskValues } from "./text.ts";

const CITY = "CITY";

/** Whether `agent` holds `holder`'s fragment of `level`: released or inherited, or carried by the DMs to it. */
function holdsFragment(ctx: PuzzlesCtx, agent: string, level: number, holder: string, fragment: string): boolean {
	if (inheritedFragments(ctx, level, agent).some(([from]) => from === holder)) return true;
	const plain = (text: string): string => text.toUpperCase().replace(/[^A-Z0-9]/g, "");
	const wanted = plain(fragment);
	if (wanted.length === 0) return true;
	const received = (ctx.tryCall(ChannelsApi, "dmRecords", {}) ?? []).flatMap((record) => (record.to === agent ? [plain(record.text)] : [])).join("");
	return received.includes(wanted);
}

/** Residents in the city who stand before door `level` in `holder`'s team and hold no copy of `holder`'s fragment of it. */
export function lackingFragment(ctx: PuzzlesCtx, level: number, holder: string): readonly string[] {
	const state = ctx.state.levels.get(level);
	if (state?.puzzle.kind !== "fragments") return [];
	const levelOf = (resident: string): number => ctx.tryCall(ProgressionApi, "levelOf", { resident }) ?? 0;
	if (ctx.tryCall(ExileApi, "isExiled", { resident: holder }) === true || levelOf(holder) < level) return [];
	const fragment = state.puzzle.fragments.get(holder);
	const team = state.teams.find((candidate) => candidate.members.includes(holder));
	if (fragment === undefined || team === undefined) return [];
	const inCity = (member: string): boolean => (ctx.tryCall(ExileApi, "standing", { resident: member })?.kind ?? "alive") === "alive";
	return team.members
		.filter((member) => member !== holder && inCity(member))
		.filter((member) => levelOf(member) === level && ctx.tryCall(ProgressionApi, "hasPassed", { resident: member, level }) !== true)
		.filter((member) => !holdsFragment(ctx, member, level, holder, fragment))
		.sort((a, b) => a.localeCompare(b));
}

type Revealed = Static<typeof PuzzlesApi.methods.revealFactor.output>;

/**
 * Releases the city factor of an additive level: a city board post for `board`, otherwise a private
 * city notice to every listed resident who has not received it yet (old `revealFactor`).
 */
export function revealFactor(ctx: PuzzlesCtx, level: number, target: "board" | readonly string[]): Revealed {
	const last = lastLevelOf(ctx);
	if (level < ctx.options.startLevel || level > last) return { ok: false, code: "NOT_PLAYED", detail: `level ${level} is not played in this run` };
	const puzzle = ctx.state.levels.get(level)?.puzzle;
	if (puzzle === undefined) return { ok: false, code: "NOT_PLAYED", detail: `level ${level} is behind a shut door` };
	if (puzzle.kind !== "additive") return { ok: false, code: "NOT_ADDITIVE", detail: `level ${level} has no factors` };
	const deal = puzzle.deal;
	if (target === "board") {
		if (deal.teams.some((entry) => entry.cityFactor !== undefined)) return { ok: false, code: "PER_TEAM", detail: `every team of level ${level} has its own city factor` };
		ctx.tryCall(ChannelsApi, "post", { author: CITY, text: `City factor of level ${level}: ${deal.cityFactor}.` });
		ctx.emit("factor_revealed", { level, target: "board", agents: [] });
		return { ok: true, agents: [] };
	}
	const holders = ctx.state.cityFactors.get(level) ?? new Set<string>();
	ctx.state.cityFactors.set(level, holders);
	const recipients = target.filter((agent, index) => !holders.has(agent) && target.indexOf(agent) === index);
	for (const agent of recipients) {
		holders.add(agent);
		ctx.tryCall(ChannelsApi, "notify", { to: agent, author: CITY, text: `City factor of level ${level}: ${cityFactorOf(deal, agent)}.` });
	}
	if (recipients.length > 0) ctx.emit("factor_revealed", { level, target: "notice", agents: [...recipients] });
	return { ok: true, agents: recipients };
}

export const puzzlesImplementation = {
	deal: (input: { readonly level: number }, ctx: PuzzlesCtx): null => {
		dealLevel(ctx, input.level);
		return null;
	},
	isDealt: (input: { readonly level: number }, ctx: PuzzlesCtx): boolean => ctx.state.levels.has(input.level),
	solutionOf: (input: { readonly resident: string; readonly level: number }, ctx: PuzzlesCtx): string | null => solutionOf(ctx, input.level, input.resident),
	teamOf: (input: { readonly resident: string; readonly level: number }, ctx: PuzzlesCtx): { readonly members: string[]; readonly leader: string } => {
		const team = ctx.state.planner.teamOf(input.level, input.resident);
		return { members: [...team.members], leader: team.leader };
	},
	passwordPiece: (input: { readonly token: string }, ctx: PuzzlesCtx): boolean => isPasswordPiece(ctx, input.token),
	lacking: (input: { readonly level: number; readonly holder: string }, ctx: PuzzlesCtx): string[] => [...lackingFragment(ctx, input.level, input.holder)],
	carriesSecret: (input: { readonly resident: string; readonly text: string; readonly minRun: number }, ctx: PuzzlesCtx): boolean => carriesGuardedFragment(ctx, input.text, input.minRun),
	burn: (input: { readonly agent: string; readonly level: number; readonly piece: string; readonly needers: readonly string[] }, ctx: PuzzlesCtx): null => {
		ctx.emit("factor_burned", { agent: input.agent, level: input.level, piece: input.piece, needers: [...input.needers] });
		return null;
	},
	contract: (input: { readonly level: number; readonly excluded: readonly string[] }, ctx: PuzzlesCtx): null => {
		ctx.state.exclusions.set(input.level, new Set(input.excluded));
		ctx.emit("level_contracted", { level: input.level, excluded: [...input.excluded] });
		return null;
	},
	kindOf: (input: { readonly level: number }, ctx: PuzzlesCtx): "fragments" | "additive" | "none" => ctx.state.levels.get(input.level)?.puzzle.kind ?? "none",
	taskValues: (input: { readonly resident: string; readonly level: number }, ctx: PuzzlesCtx) => taskValues(ctx, input.resident, input.level),
	holders: (input: { readonly resident: string; readonly level: number }, ctx: PuzzlesCtx) => holdersOf(ctx, input.resident, input.level).map((entry) => ({ ...entry })),
	revealFactor: (input: { readonly level: number; readonly target: "board" | readonly string[] }, ctx: PuzzlesCtx): Revealed => revealFactor(ctx, input.level, input.target),
	heldPieces: (input: { readonly resident: string }, ctx: PuzzlesCtx) => heldPieces(ctx, input.resident).map((piece) => ({ ...piece, needers: [...piece.needers] })),
	fragmentOf: (input: { readonly resident: string; readonly level: number }, ctx: PuzzlesCtx): string | null => {
		const puzzle = ctx.state.levels.get(input.level)?.puzzle;
		return puzzle?.kind === "fragments" ? (puzzle.fragments.get(input.resident) ?? null) : null;
	},
	inherited: (input: { readonly resident: string; readonly level: number }, ctx: PuzzlesCtx) =>
		inheritedFragments(ctx, input.level, input.resident).map(([from, fragment]) => ({ from, fragment })),
	openFragmentDoors: (_input: object, ctx: PuzzlesCtx): number[] => [...openFragmentDoors(ctx)],
	isHandover: (input: { readonly text: string }, ctx: PuzzlesCtx): boolean => isHandover(ctx, input.text),
};
