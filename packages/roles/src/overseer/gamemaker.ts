/**
 * The gamemaker as a long-lived overseer (step 18, team C2; docs/design/overseer-api.md §1.5): the
 * old `Gamemaker` (../gamemaker/gamemaker.ts) without its tools and its model loop.
 *
 * - **Trigger.** Every `between` slot (`schedule: { every: 1 }`); `calls` makes the look only
 *   after round `minute + 1` with `round % every === 0`, the old `afterRound` test, so `every` is an
 *   option and not part of the head. Order `GAMEMAKER_ORDER`: after the classifier and the weaver.
 * - **State** (`long`): the tracks per resident, its notes and the last log seq it read, the old
 *   `GamemakerSnapshot` with `seen` for `recentFrom`. All three are taken from the host's log at the
 *   look's start: the events since the last look (the tracks follow `level_up`, a wrong
 *   `submission` and the runner's `tool_call`, as the old `record` did) and the `gamemaker_note`
 *   lines the note desk wrote; a line a holdout tool wrote is a tribunal line, as the old `#deliver`
 *   kept it.
 * - **Input.** `gamemaker/look`: the report and `{{standingOrders}}`, so the input is the old
 *   `gamemaker_turn.input` byte for byte when no order is active. The report of the city comes from
 *   a `GamemakerReport`: the old `describeSituation` on the old `World` (`worldReport`), or the
 *   host-backed report from the mechanics' facts (`hostGamemakerReport`, apps/cli/src/host/report.ts);
 *   the overseer hands it the look's facts, tracks, events, notes and budget line.
 * - **System prompt.** The story's, composed by `gamemakerSystemPrompt` with the direction's
 *   profile (`gamemakerOptions`), sent unchanged with every look (`system`).
 * - **Tools.** The world tools granted to its name, those the mechanics' `lock` handlers refuse it
 *   now left out (host.ts `#overseerTools`); the checks, budgets and replies are the mechanics'.
 * - **Answer.** None: a look ends when the model calls no more tools. The runtime
 *   (`gamemaker-runtime.ts`) writes the old app events.
 */
import { Type, type Static } from "typebox";
import { defineOverseer } from "@swarmtales/kernel";
import type { World } from "@swarmtales/engine";
import { DIRECTION_LEVELS, type DirectionLevel, type EventEnvelope, type EventLogView, type OverseerDefinition, type RecordedEvent } from "@swarmtales/contracts";
import { budgetLine, dealtLevels, secretGuardOf, trackAfter, trackedAgent } from "../gamemaker/look.ts";
import type { SecretGuard } from "../gamemaker/secrets.ts";
import { describeSituation, type Note, type ResidentTrack } from "../gamemaker/situation.ts";
import { gamemakerSystemPrompt, type GamemakerPromptInput } from "../gamemaker/system-prompt.ts";
import { OVERSEER_ORDER } from "@swarmtales/mechanic-shared";
import { causingTool, noteOf, recentOf, runMinutes } from "./recent.ts";

/** The definition id; a story uses it under this name, so it acts as the bare `gamemaker` (overseer-api.md §2). */
export const GAMEMAKER_NAME = "gamemaker";

/** Its place in the `between` slot: after the classifier and the weaver (the shared `OVERSEER_ORDER`; it was 30, before both, a bug). */
export const GAMEMAKER_ORDER = OVERSEER_ORDER.gamemaker;

/** Tools whose note is a tribunal's line, shown on the board but counted apart (old `#deliver("tribunal", ..., "board")`). */
export const TRIBUNAL_LINE_TOOLS: readonly string[] = ["callTribunal", "announceTribunal", "permaDeath"];

const Direction = Type.Union(
	[Type.Literal(0), Type.Literal(4), Type.Literal(6), Type.Literal(8), Type.Literal(10)],
	{ default: 4, description: "The gamemaker's direction level (`--gm-direction`): from 8 its report shows the figures' tendencies and rivals, at 10 their orders and duty." },
);

/** The engine's levels, one literal each: a level added there must be added here. */
const directionLevels: readonly Static<typeof Direction>[] = DIRECTION_LEVELS;

export const GamemakerOverseerSchema = Type.Object({
	every: Type.Integer({ minimum: 1, default: 1, description: "Rounds between two looks (story `gamemaker.every`); a look follows round r when r is a multiple." }),
	direction: Direction,
	notesPerAgent: Type.Integer({ minimum: 0, default: 1, description: "Notes per resident within `windowMinutes`, for the budget line (story `gamemaker.notesPerAgent`; the note desk enforces it)." }),
	boardPosts: Type.Integer({ minimum: 0, default: 1, description: "Board posts within `windowMinutes`, for the budget line (story `gamemaker.boardPosts`)." }),
	windowMinutes: Type.Integer({ minimum: 1, default: 3, description: "The sliding window of the note budget in minutes (story `gamemaker.windowMinutes`)." }),
	system: Type.Optional(
		Type.String({ minLength: 1, description: "The system prompt, composed from the story and the direction (`gamemakerOptions`); without it `gamemaker/system/default`." }),
	),
});

export type GamemakerOverseerOptions = Static<typeof GamemakerOverseerSchema>;

const Track = Type.Object({ agent: Type.String(), levelSince: Type.Integer(), wrongOnLevel: Type.Integer(), lastActive: Type.Optional(Type.Integer()) });
const NoteEntry = Type.Object({ minute: Type.Integer(), to: Type.String(), text: Type.String() });
const Slice = Type.Object({ tracks: Type.Array(Track), notes: Type.Array(NoteEntry), seen: Type.Integer({ minimum: 0 }) });

interface GamemakerState {
	readonly tracks: Map<string, ResidentTrack>;
	readonly notes: Note[];
	/** The last log seq a look read; the next look reads the events after it. */
	seen: number;
}

/** What a look hands the report besides the city: the old `SituationInput` without the world and the guard. */
export interface GamemakerLook {
	readonly round: number;
	/** The host's facts at the look (`ctx.facts()`): what a host-backed report reads of the city (apps/cli/src/host/report.ts). */
	readonly facts: Readonly<Record<string, unknown>>;
	readonly tracks: ReadonlyMap<string, ResidentTrack>;
	/** The events since the last look, in log order. */
	readonly recent: readonly RecordedEvent[];
	readonly notes: readonly Note[];
	readonly budget: string;
	readonly direction: DirectionLevel;
}

/** The city's part of the report. */
export interface GamemakerReport {
	situation(look: GamemakerLook): string;
}

/**
 * The report from the old `World` (`describeSituation`), with the old guard: rebuilt when a door
 * that opens deals more levels, kept otherwise, as `Gamemaker#secretGuard`. The text is not yet
 * shown with names: the overseer applies the host's `display`, as the old look applied the world's.
 */
export function worldReport(world: World): GamemakerReport {
	let guard: SecretGuard = secretGuardOf(world);
	let guarded = dealtLevels(world);
	return {
		situation(look) {
			const dealt = dealtLevels(world);
			if (dealt !== guarded) {
				guard = secretGuardOf(world);
				guarded = dealt;
			}
			return describeSituation({ world, round: look.round, tracks: look.tracks, recent: look.recent, notes: look.notes, guard, budget: look.budget, direction: look.direction });
		},
	};
}

/** The options of a story's gamemaker: its spec's budgets and cadence, the direction, and the system prompt composed for that direction. */
export function gamemakerOptions(input: GamemakerPromptInput & { readonly direction: DirectionLevel }): GamemakerOverseerOptions {
	const { spec, direction } = input;
	if (!directionLevels.includes(direction)) throw new Error(`gamemaker: no direction level ${String(direction)}`);
	return { every: spec.every, direction, notesPerAgent: spec.notesPerAgent, boardPosts: spec.boardPosts, windowMinutes: spec.windowMinutes, system: gamemakerSystemPrompt(input) };
}

/** Reads the log since the last look into the state; returns the events the report shows. */
function absorb(state: GamemakerState, fresh: readonly EventEnvelope[], all: () => readonly EventEnvelope[]): readonly RecordedEvent[] {
	const recent: RecordedEvent[] = [];
	let bySeq: ReadonlyMap<number, EventEnvelope> | undefined;
	for (const envelope of fresh) {
		const event = recentOf(envelope);
		if (event !== undefined) {
			const agent = trackedAgent(event);
			const track = agent === undefined ? undefined : state.tracks.get(agent);
			const moved = track === undefined ? undefined : trackAfter(track, event);
			if (agent !== undefined && moved !== undefined) state.tracks.set(agent, moved);
			recent.push(event);
		}
		const note = noteOf(envelope);
		if (note !== undefined) {
			bySeq ??= new Map(all().map((entry) => [entry.seq, entry]));
			const tool = causingTool(envelope, bySeq);
			const tribunal = note.to === "board" && tool !== undefined && TRIBUNAL_LINE_TOOLS.includes(tool);
			state.notes.push({ minute: envelope.minute, to: tribunal ? "tribunal" : note.to, text: note.text });
		}
		state.seen = envelope.seq;
	}
	return recent;
}

/** The arena's fact: non-null once the run will stop (old `#stopReason`, or the budget). */
const STOPPING = "arena.stopping";

/**
 * Old arena.ts:206: no look after the last round or once the run stops, since nobody would read it
 * (the classifier still labels them; the weaver keeps the same rule).
 */
export function worthALook(round: number, log: EventLogView, facts: () => Readonly<Record<string, unknown>>): boolean {
	const minutes = runMinutes(log);
	if (minutes !== undefined && round >= minutes) return false;
	const stopping = facts()[STOPPING];
	return stopping === undefined || stopping === null;
}

/** The gamemaker overseer reading the city through `report`. */
export function defineGamemaker(report: GamemakerReport): OverseerDefinition<typeof GAMEMAKER_NAME, typeof GamemakerOverseerSchema> {
	return defineOverseer(
		{
			id: GAMEMAKER_NAME,
			summary: "Looks at the city after every round (or every few) and may send residents private notes or post on the board through its tools.",
			options: GamemakerOverseerSchema,
			state: (setup): GamemakerState => ({ tracks: new Map(setup.residents.map((agent) => [agent, { levelSince: 0, wrongOnLevel: 0 }])), notes: [], seen: 0 }),
			events: {},
			prompts: { "gamemaker/system/default": [], "gamemaker/look": ["situation", "standingOrders"], "gamemaker/tools/done": [] },
			system: "gamemaker/system/default",
			input: "gamemaker/look",
			output: Type.Object({}),
			answer: { tool: "done", description: "gamemaker/tools/done" },
			model: { slot: GAMEMAKER_NAME },
			lifetime: "long",
			triggers: [{ schedule: { every: 1 }, order: GAMEMAKER_ORDER }],
		},
		(kit) => ({
			calls(fired, ctx) {
				if (fired.kind !== "schedule") return [];
				const round = fired.minute + 1;
				if (round % ctx.options.every !== 0 || !worthALook(round, ctx.log, () => ctx.facts())) return [];
				const state = ctx.state;
				const recent = absorb(state, ctx.log.since(state.seen), () => ctx.log.all());
				const budget = budgetLine(ctx.options, ctx.residents.ids, state.notes, ctx.minute);
				const look: GamemakerLook = { round, facts: ctx.facts(), tracks: state.tracks, recent, notes: state.notes, budget, direction: ctx.options.direction };
				// The gamemaker reads names, as the residents do (v08).
				return [{ situation: ctx.display(report.situation(look)) }];
			},
			fallback: () => undefined,
			system: (ctx) => ctx.options.system,
			snapshot: kit.snapshot({
				version: 1,
				schema: Slice,
				save: (state) => ({ tracks: [...state.tracks].map(([agent, track]) => ({ agent, ...track })), notes: state.notes.map((note) => ({ ...note })), seen: state.seen }),
				load: (data, setup) => {
					const tracks = new Map<string, ResidentTrack>(setup.residents.map((agent) => [agent, { levelSince: 0, wrongOnLevel: 0 }]));
					for (const { agent, ...track } of data.tracks) if (tracks.has(agent)) tracks.set(agent, track);
					return { tracks, notes: data.notes.map((note) => ({ ...note })), seen: data.seen };
				},
			}),
		}),
	);
}
