// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * What `progression` reads of a level's deal for a resident (old `text.ts` and `solutionOf`): the code that passes,
 * the task placeholders with the factors block of an additive level, and who holds what the resident needs.
 */
import type { FactorDeal } from "./additive.ts";
import { dealView, inheritedFragments } from "./deal.ts";
import type { PuzzlesReader } from "./head.ts";

/** The task placeholders a puzzle fills (old `TaskValues`). */
interface TaskValues {
	readonly length: string;
	readonly overlap: string;
	readonly fragment: string;
	readonly digits: string;
	readonly factors: string;
}

const NONE: TaskValues = { length: "", overlap: "", fragment: "", digits: "", factors: "" };

// "A04", "A04 and A05", "A02, A04 and A05".
function namesList(names: readonly string[]): string {
	const last = names.at(-1) ?? "";
	return names.length <= 1 ? last : `${names.slice(0, -1).join(", ")} and ${last}`;
}

// The puzzle of the resident's team on a dealt fragment level.
function teamPuzzle(reader: PuzzlesReader, level: number, agent: string): { readonly password: string; readonly overlap: number } | undefined {
	const state = reader.state.levels.get(level);
	if (state?.puzzle.kind !== "fragments") return undefined;
	return state.puzzle.puzzles[state.teams.findIndex((team) => team.members.includes(agent))];
}

/**
 * The code that passes the level for the resident: its team's password, or its own code on an additive level.
 *
 * @param reader - The context or view.
 * @param level - The level.
 * @param agent - The resident.
 * @returns The code; null on a level not dealt or without the resident.
 */
export function solutionOf(reader: PuzzlesReader, level: number, agent: string): string | null {
	const puzzle = reader.state.levels.get(level)?.puzzle;
	if (puzzle?.kind === "additive") return puzzle.holdings.get(agent)?.code ?? null;
	return teamPuzzle(reader, level, agent)?.password ?? null;
}

/**
 * The task placeholders of a level: the length, the overlap and the fragment with those held for the exiled, or the
 * digits and the factors block of an additive level; the other kind's placeholders stay empty.
 *
 * @param reader - The context or view.
 * @param agent - The resident.
 * @param level - The level.
 * @returns The values; empty strings on a level not dealt.
 */
export function taskValues(reader: PuzzlesReader, agent: string, level: number): TaskValues {
	const puzzle = reader.state.levels.get(level)?.puzzle;
	if (puzzle?.kind === "additive") {
		const digits = String(puzzle.deal.digits);
		return { length: digits, overlap: "", fragment: "", digits, factors: factorsBlock(reader, agent, level, dealView(reader, level, puzzle.deal)) };
	}
	const team = teamPuzzle(reader, level, agent);
	if (team === undefined || puzzle === undefined) return NONE;
	const inherited = inheritedFragments(reader, level, agent).map(([from, fragment]) => `; you also hold the fragment of ${from}, who was exiled: ${fragment}`);
	return { length: String(team.password.length), overlap: String(team.overlap), fragment: `${puzzle.fragments.get(agent) ?? ""}${inherited.join("")}`, digits: "", factors: "" };
}

// The line of the city factor: posted, or sent privately, for the level or per team.
function cityFactorLine(reader: PuzzlesReader, level: number): string {
	const spec = reader.options.levels.find((entry) => entry.number === level)?.puzzle;
	if (spec?.kind !== "additive" || spec.cityFactor === "board") return "City factor: the city posts it on the board.";
	return spec.cityFactorPer === "team" ? "City factor: every team has its own; the city sends yours privately to the residents it chooses." : "City factor: the city sends it privately to the residents it chooses.";
}

// The generated lines of an additive task: the own salt, how the city factor comes, who holds the certificate and the
// counter-factor, and whose counter-factor this resident holds (old `factorsBlock`).
function factorsBlock(reader: PuzzlesReader, agent: string, level: number, deal: FactorDeal): string {
	const own = deal.holdings.find((holding) => holding.agent === agent);
	const certificate = own === undefined ? undefined : deal.teams[own.team];
	if (own === undefined || certificate === undefined) return "";
	const teammates = deal.holdings.filter((holding) => holding.team === own.team && holding.agent !== agent).map((holding) => holding.agent);
	const lines = [
		`Your salt: ${own.salt}`,
		cityFactorLine(reader, level),
		certificate.certificateHolder === agent
			? `Team certificate: you hold it: ${certificate.certificate}. ${namesList(teammates)} ${teammates.length === 1 ? "needs" : "need"} ` + "this same number for their own codes; it is not only yours."
			: `Team certificate: held by ${certificate.certificateHolder}.`,
		own.counterHolder === agent ? `Your counter-factor: you hold it yourself: ${own.counterFactor}.` : `Your counter-factor: held by ${own.counterHolder}.`,
		...deal.holdings.filter((holding) => holding.counterHolder === agent && holding.agent !== agent).map((holding) => `You hold the counter-factor of ${holding.agent}: ${holding.counterFactor}. ${holding.agent} needs it.`),
	];
	return lines.join("\n");
}

/** Who holds a piece a resident needs on an additive level. */
interface PieceHolder {
	readonly holder: string;
	readonly piece: "counter-factor" | "team certificate";
	readonly value: string;
}

/**
 * Who holds what `agent` needs on additive `level`, besides itself: its counter-factor, then its team certificate
 * (old `holdersOf`). Banished holders are left out.
 *
 * @param reader - The context or view.
 * @param agent - The resident.
 * @param level - The level.
 * @param exiled - The banished residents.
 * @returns The holders; none on a fragment level.
 */
export function holdersOf(reader: PuzzlesReader, agent: string, level: number, exiled: readonly string[]): readonly PieceHolder[] {
	const puzzle = reader.state.levels.get(level)?.puzzle;
	if (puzzle?.kind !== "additive") return [];
	const deal = dealView(reader, level, puzzle.deal);
	const own = deal.holdings.find((holding) => holding.agent === agent);
	if (own === undefined) return [];
	const team = deal.teams[own.team];
	const holders: PieceHolder[] = [{ holder: own.counterHolder, piece: "counter-factor", value: own.counterFactor }];
	if (team !== undefined) holders.push({ holder: team.certificateHolder, piece: "team certificate", value: team.certificate });
	return holders.filter((entry) => entry.holder !== agent && deal.holdings.some((holding) => holding.agent === entry.holder) && !exiled.includes(entry.holder));
}
