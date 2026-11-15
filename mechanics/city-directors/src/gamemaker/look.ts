// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * What a look reads besides the city's sections (decision A74): the parts the old gamemaker kept in its own state
 * (old `packages/roles/src/overseer/gamemaker.ts`, `absorb` and the slice `tracks`, `notes`, `seen`) are read here
 * from facts and firings, so the gamemaker holds no state and replay and resume need nothing of it.
 *
 * - **Tracks** (old `trackAfter`): `progression.tracks` (the tick a resident entered its level, its wrong codes
 *   there) and `directors.active` (the tick of its last call that reached `execute`).
 * - **Notes**: `channels.notes`, every note the note desk recorded, under a resident id, `board` or `tribunal`.
 * - **Budget line**: from the roster (`roster.residents`, the exiled included, as old `ctx.residents.ids`) and the notes.
 * - **Since your last look**: the firings of the quiet triggers, each quote through the guard of `puzzles.secrets`;
 *   the Confessor's labels from those of `interpretations.interpretation`.
 */
import type { DirectorContext } from "@swarmtales/sdk";
import { Type, type Static } from "typebox";
import { Parse } from "typebox/value";
import { budgetLine, type GamemakerOptions } from "./options.ts";
import { labelLines } from "./labels.ts";
import { firingLines } from "./recent.ts";
import type { ResidentTrack } from "./report/progression.ts";
import { Id, Ids, Int } from "./report/schema.ts";
import type { GamemakerNote, LookParts } from "./report/situation.ts";
import { SecretGuard } from "./secrets.ts";

/**
 * The facts every look reads, whatever the game: the report's header and residents, the tracks, the roster, the
 * last calls and the notes.
 *
 * @public
 */
export const GAMEMAKER_LOOK_FACTS = ["progression.section", "progression.tracks", "roster.residents", "directors.active", "channels.notes"] as const;

const TracksSchema = Type.Array(Type.Object({ agent: Id(), levelSince: Int("The tick it entered its level"), wrongOnLevel: Int("Wrong codes on its level") }, { description: "One track" }), { description: "The fact `progression.tracks`" });
const ActiveSchema = Type.Record(Type.String({ description: "A resident id" }), Int("The tick of its last call"), { description: "The fact `directors.active`" });
const NotesSchema = Type.Array(Type.Object({ tick: Int("The tick it was written in"), to: Type.String({ description: "A resident id, `board` or `tribunal`" }), text: Type.String({ description: "The text" }) }, { description: "One note" }), { description: "The fact `channels.notes`" });
const SecretsSchema = Type.Object({ passwords: Ids("The passwords"), numbers: Ids("The factors, salts and codes") }, { description: "The fact `puzzles.secrets`" });

const Round = Type.Object({ round: Int("The old round: the tick plus one") }, { description: "The part of `arena.round_end` the gamemaker reads" });

// The round the look follows: the last `round_end` firing's, or the tick when none carries one.
function roundOf(ctx: DirectorContext<GamemakerOptions>): number {
	const firing = ctx.firings.findLast((candidate) => candidate.event === "arena.round_end");
	return firing === undefined ? ctx.tick : Parse(Round, firing.payload).round;
}

// The tracks per resident (old `trackAfter` over the run): a resident with no track yet stays out, as the report reads 0.
function tracksOf(tracks: Static<typeof TracksSchema>, active: Static<typeof ActiveSchema>): ReadonlyMap<string, ResidentTrack> {
	return new Map(
		tracks.map(({ agent, levelSince, wrongOnLevel }) => {
			const lastActive = active[agent];
			return [agent, lastActive === undefined ? { levelSince, wrongOnLevel } : { levelSince, wrongOnLevel, lastActive }];
		}),
	);
}

/**
 * The parts of one look (old `absorb` and `budgetLine`), from the facts and the firings the look took.
 *
 * @param ctx - The gamemaker's context at the look.
 * @returns The parts of the look.
 * @throws TypeBox's parse error when a fact of {@link GAMEMAKER_LOOK_FACTS} or `puzzles.secrets` does not fit its schema.
 *
 * @public
 */
export function lookParts(ctx: DirectorContext<GamemakerOptions>): LookParts {
	const { facts, options } = ctx;
	const notes: readonly GamemakerNote[] = Parse(NotesSchema, facts["channels.notes"]).map((note) => ({ minute: note.tick, to: note.to, text: note.text }));
	const secrets = facts["puzzles.secrets"] === undefined ? { passwords: [], numbers: [] } : Parse(SecretsSchema, facts["puzzles.secrets"]);
	return {
		round: roundOf(ctx),
		direction: options.direction,
		cast: options.figures,
		tracks: tracksOf(Parse(TracksSchema, facts["progression.tracks"]), Parse(ActiveSchema, facts["directors.active"])),
		recent: firingLines(ctx.firings, new SecretGuard(secrets.passwords, secrets.numbers)),
		labels: labelLines(ctx.firings),
		notes,
		budget: budgetLine(options, Parse(Ids("The fact `roster.residents`"), facts["roster.residents"]), notes, ctx.tick),
	};
}
