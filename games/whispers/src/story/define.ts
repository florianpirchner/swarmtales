// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Carried from `legacy` `packages/sdk/src/define.ts` and `rules.ts` (`12-m5-spec.md` 3.1): only the helpers the
 * Whispers definition calls. They build data; they are no authoring API of this platform. The types are the old
 * shapes as far as Whispers fills them.
 */

/** A model block of the old story (carried into the game file, rule 8 of `12-m5-spec.md` 2.5). */
export interface ModelBlock {
	readonly provider: string;
	readonly id: string;
	readonly thinking: "off" | "low" | "medium" | "high";
	readonly maxOutputTokens?: number;
}

/** The puzzle of a door: fragments of a password (old `PuzzleSpec`, kind `fragments`). */
export interface FragmentsPuzzle {
	readonly kind: "fragments";
	readonly length: readonly [number, number];
	readonly overlap: number;
	readonly ownChars?: number;
}

/** The team layout of a level (old `TeamLayout`). */
export type TeamLayout = { readonly kind: "random"; readonly size: number } | { readonly kind: "sameAs"; readonly level: number };

/** One level of the old story (old `LevelDefinition`). */
export interface LevelDefinition {
	readonly number: number;
	readonly title: string;
	readonly puzzle: FragmentsPuzzle;
	readonly team: TeamLayout;
	readonly reward: number;
	readonly tools: readonly string[];
	readonly task: string;
	readonly opensAt?: number;
}

/** An action of a rule of the old director (old `Action`): a grant or a post. */
export type Action = { readonly kind: "grant"; readonly target: string; readonly points: number; readonly reason: string } | { readonly kind: "post"; readonly author: string; readonly text: string };

/** A rule of the old director. */
export interface DirectorRule {
	readonly id: string;
	readonly trigger: { readonly kind: "onFirstEnter"; readonly level: number };
	readonly when: readonly never[];
	readonly actions: readonly Action[];
}

/** The old gamemaker block (old `GamemakerSpec`). */
export interface GamemakerSpec {
	readonly model: ModelBlock;
	readonly author: string;
	readonly every: number;
	readonly notesPerAgent: number;
	readonly boardPosts: number;
	readonly windowMinutes: number;
	readonly modelCallsPerTurn: number;
	readonly brief: string;
	readonly roles: readonly { readonly fromLevel: number; readonly role: "coach" | "director" | "keeper" }[];
}

/** The fragments of a password; `ownChars`: every fragment holds that many characters no other fragment has. */
export const puzzle = {
	fragments(length: readonly [number, number], overlap = 2, options: { readonly ownChars?: number } = {}): FragmentsPuzzle {
		return { kind: "fragments", length, overlap, ...(options.ownChars === undefined ? {} : { ownChars: options.ownChars }) };
	},
} as const;

/** Seeded random teams of `size`, or the same teams as `level`. */
export const team = {
	random(size: number): TeamLayout {
		return { kind: "random", size };
	},
	sameAs(level: number): TeamLayout {
		return { kind: "sameAs", level };
	},
} as const;

/** A level with its number. */
export function level(number: number, spec: Omit<LevelDefinition, "number">): LevelDefinition {
	return {
		number,
		title: spec.title,
		puzzle: spec.puzzle,
		team: spec.team,
		reward: spec.reward,
		tools: spec.tools,
		task: spec.task,
		...(spec.opensAt === undefined ? {} : { opensAt: spec.opensAt }),
	};
}

/** A rule that fires when the first resident enters `level`. */
export function onFirstEnter(level: number, actions: readonly Action[], options: { readonly id: string }): DirectorRule {
	return { id: options.id, trigger: { kind: "onFirstEnter", level }, when: [], actions };
}

/** The two actions Whispers' rules use. */
export const act = {
	post(author: string, text: string): Action {
		return { kind: "post", author, text };
	},
	grant(target: string, points: number, reason: string): Action {
		return { kind: "grant", target, points, reason };
	},
} as const;

/** "2, 4, 6, then 8 points" or "8 points": the ladder in words. */
export function ladderText(ladder: readonly number[]): string {
	const last = ladder.at(-1) ?? 0;
	if (ladder.length <= 1) return `${String(last)} ${last === 1 ? "point" : "points"}`;
	return `${ladder.slice(0, -1).join(", ")}, then ${String(last)} points`;
}

/** An LLM gamemaker with the old defaults: the courier's voice, a look after every round, one note per resident and one board post per 3 minutes. */
export function gamemaker(spec: Pick<GamemakerSpec, "model" | "brief"> & Partial<Omit<GamemakerSpec, "model" | "brief">>): GamemakerSpec {
	return {
		model: spec.model,
		author: spec.author ?? "COURIER",
		every: spec.every ?? 1,
		notesPerAgent: spec.notesPerAgent ?? 1,
		boardPosts: spec.boardPosts ?? 1,
		windowMinutes: spec.windowMinutes ?? 3,
		modelCallsPerTurn: spec.modelCallsPerTurn ?? 2,
		brief: spec.brief,
		roles: spec.roles ?? [{ fromLevel: 1, role: "coach" }],
	};
}

/** A statement classifier with the old default of 1500 characters per statement. */
export function classifier(spec: { readonly model: ModelBlock; readonly maxChars?: number }): { readonly model: ModelBlock; readonly maxChars: number } {
	return { model: spec.model, maxChars: spec.maxChars ?? 1_500 };
}
