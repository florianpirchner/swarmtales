/**
 * Game descriptions for the Games tab: one entry per story folder (`stories/<name>/`), written at build time by
 * `scripts/export-viewer-data.ts` from the registered stories, their mechanics and the folder's README. The viewer
 * only shows them; a host without them shows an empty tab.
 */
import { Type, type Static } from "typebox";
import { Check } from "typebox/value";

const Field = Type.Object({ name: Type.String(), description: Type.Optional(Type.String()) });

export const GameInfoSchema = Type.Object({
	/** The story folder's name (`chess`), also the prefix of its variants' names. */
	id: Type.String({ minLength: 1 }),
	title: Type.String(),
	/** The README's first paragraph. */
	summary: Type.String(),
	/** The whole README (Markdown). */
	readme: Type.String(),
	/** Story names of this folder (`chess`, `chess-nobrain`, ...): the registered ones, not every name a parser accepts. */
	variants: Type.Array(Type.String()),
	/** Earlier names runs were recorded under (`nexus` for `cityofkeys`). */
	aliases: Type.Optional(Type.Array(Type.String())),
	residents: Type.Optional(Type.Number()),
	minutes: Type.Optional(Type.Number()),
	mechanics: Type.Array(Type.Object({
		id: Type.String(),
		summary: Type.String(),
		events: Type.Array(Type.Object({ type: Type.String(), fields: Type.Array(Field) })),
	})),
	/** The tools of the main story, by grant name (`resident`, an overseer). */
	tools: Type.Array(Type.Object({ name: Type.String(), grantedTo: Type.Array(Type.String()), description: Type.Optional(Type.String()) })),
});
export type GameInfo = Static<typeof GameInfoSchema>;

/** A list of games as read from a data file; a bad entry is dropped, the rest is kept. */
export function parseGames(value: unknown): readonly GameInfo[] {
	if (!Array.isArray(value)) return [];
	return value.filter((entry): entry is GameInfo => Check(GameInfoSchema, entry));
}

/** The game a story name belongs to: the longest game id (or earlier name) that is the name or a prefix of it followed by `-`. */
export function gameOfStory(games: readonly GameInfo[], story: string): GameInfo | undefined {
	let best: { readonly game: GameInfo; readonly length: number } | undefined;
	for (const game of games) {
		for (const name of [game.id, ...(game.aliases ?? [])]) {
			if ((story === name || story.startsWith(`${name}-`)) && (best === undefined || name.length > best.length)) best = { game, length: name.length };
		}
	}
	return best?.game;
}
