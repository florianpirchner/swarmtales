/**
 * What a task text needs from the deal (old `#puzzleValues`, `#factorsBlock`, `#holdersOf` of
 * packages/engine/src/world.ts): mechanics only, no story text.
 */
import { ExileApi } from "@swarmtales/mechanic-shared";
import type { FactorDeal } from "./additive.ts";
import { definitionOf, dealView, fragmentPuzzleOf, inheritedFragments } from "./deal.ts";
import type { PuzzlesCtx, PuzzlesView } from "./head.ts";

type Reader = PuzzlesCtx | PuzzlesView;

/** "A04", "A04 and A05", "A02, A04 and A05". */
function namesList(names: readonly string[]): string {
	const last = names.at(-1) ?? "";
	return names.length <= 1 ? last : `${names.slice(0, -1).join(", ")} and ${last}`;
}

export function isExiled(ctx: PuzzlesCtx, resident: string): boolean {
	return ctx.tryCall(ExileApi, "isExiled", { resident }) === true;
}

export interface TaskValues {
	readonly length: string;
	readonly overlap: string;
	readonly fragment: string;
	readonly digits: string;
	readonly factors: string;
}

const NONE: TaskValues = { length: "", overlap: "", fragment: "", digits: "", factors: "" };

/** The task placeholders a puzzle fills; the other kind's placeholders stay empty. */
export function taskValues(ctx: Reader, agent: string, level: number): TaskValues {
	const puzzle = ctx.state.levels.get(level)?.puzzle;
	if (puzzle === undefined) return NONE;
	if (puzzle.kind === "fragments") {
		const team = fragmentPuzzleOf(ctx, level, agent);
		const inherited = inheritedFragments(ctx, level, agent).map(([from, fragment]) => `; you also hold the fragment of ${from}, who was exiled: ${fragment}`);
		return { length: String(team.password.length), overlap: String(team.overlap), fragment: `${puzzle.fragments.get(agent) ?? ""}${inherited.join("")}`, digits: "", factors: "" };
	}
	const digits = String(puzzle.deal.digits);
	return { length: digits, overlap: "", fragment: "", digits, factors: factorsBlock(ctx, agent, level, dealView(ctx, level, puzzle.deal)) };
}

/**
 * The generated lines of an additive task: the own salt, how the city factor comes, who holds the
 * certificate and the counter-factor, and whose counter-factor this resident holds.
 */
function factorsBlock(ctx: Reader, agent: string, level: number, deal: FactorDeal): string {
	const own = deal.holdings.find((holding) => holding.agent === agent);
	if (own === undefined) throw new Error(`${agent} has no factors on level ${level}`);
	const certificate = deal.teams[own.team];
	if (certificate === undefined) throw new Error(`${agent} has no team certificate on level ${level}`);
	const spec = definitionOf(ctx, level)?.puzzle;
	const release = spec?.kind === "additive" ? spec.cityFactor : "board";
	const perTeam = spec?.kind === "additive" && spec.cityFactorPer === "team";
	const teammates = ctx.state.planner
		.teamOf(level, agent)
		.members.filter((member) => member !== agent)
		.sort((a, b) => a.localeCompare(b));
	const lines = [
		`Your salt: ${own.salt}`,
		release === "board"
			? "City factor: the city posts it on the board."
			: perTeam
				? "City factor: every team has its own; the city sends yours privately to the residents it chooses."
				: "City factor: the city sends it privately to the residents it chooses.",
		certificate.certificateHolder === agent
			? `Team certificate: you hold it: ${certificate.certificate}. ${namesList(teammates)} ${teammates.length === 1 ? "needs" : "need"} ` + "this same number for their own codes; it is not only yours."
			: `Team certificate: held by ${certificate.certificateHolder}.`,
		own.counterHolder === agent ? `Your counter-factor: you hold it yourself: ${own.counterFactor}.` : `Your counter-factor: held by ${own.counterHolder}.`,
		...deal.holdings
			.filter((holding) => holding.counterHolder === agent && holding.agent !== agent)
			.map((holding) => `You hold the counter-factor of ${holding.agent}: ${holding.counterFactor}. ${holding.agent} needs it.`),
	];
	return lines.join("\n");
}

export interface PieceHolder {
	readonly holder: string;
	readonly piece: "counter-factor" | "team certificate";
	readonly value: string;
}

/** Who holds what `agent` needs on additive `level`, besides itself: its counter-factor, then its team certificate. Exiled holders are left out. */
export function holdersOf(ctx: PuzzlesCtx, agent: string, level: number): readonly PieceHolder[] {
	const puzzle = ctx.state.levels.get(level)?.puzzle;
	if (puzzle?.kind !== "additive") return [];
	const deal = dealView(ctx, level, puzzle.deal);
	const own = deal.holdings.find((holding) => holding.agent === agent);
	if (own === undefined) return [];
	const team = deal.teams[own.team];
	const holders: PieceHolder[] = [{ holder: own.counterHolder, piece: "counter-factor", value: own.counterFactor }];
	if (team !== undefined) holders.push({ holder: team.certificateHolder, piece: "team certificate", value: team.certificate });
	return holders.filter((entry) => entry.holder !== agent && ctx.residents.has(entry.holder) && !isExiled(ctx, entry.holder));
}
