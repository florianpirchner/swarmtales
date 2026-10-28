/**
 * The LLM game master (SPEC 10.4).
 *
 * It listens to the event bus, and after every `every` rounds it reads a
 * filtered report of the city and may send private notes or post on the
 * board. Each look is a fresh model context (system prompt, report with its
 * own earlier notes), so cost stays flat over a long run. The engine, not
 * the prompt, enforces the budgets and blocks any text with a password piece.
 */
import { Agent, type AgentMessage, type AgentToolResult } from "@earendil-works/pi-agent-core";
import { Type, type Static, type TSchema } from "typebox";
import { Parse } from "typebox/value";
import { withRequestDefaults } from "../agents/runner.ts";
import type { CompetitorId } from "../core/ids.ts";
import type { EventBus, EventSink, RecordedEvent } from "../engine/events.ts";
import type { World } from "../engine/world.ts";
import type { ModelBinding } from "../model/source.ts";
import type { GamemasterSpec, ThinkingLevel } from "../story/types.ts";
import { privateLabelsOf, privateLeaks, type PrivateLabels } from "./privacy.ts";
import { dealValues } from "../engine/puzzles/additive.ts";
import { SecretGuard } from "./secrets.ts";
import { describeSituation, type Note, type NoteTarget, type ResidentTrack } from "./situation.ts";
import { MAX_NOTE_LENGTH } from "./system-prompt.ts";

/** ID of the game master in usage records and transcripts. */
export const GAMEMASTER_ID = "GM";
export { MAX_NOTE_LENGTH };

export interface GamemasterOptions {
	readonly spec: GamemasterSpec;
	readonly world: World;
	readonly bus: EventBus;
	readonly binding: ModelBinding;
	readonly systemPrompt: string;
	readonly thinking: ThinkingLevel;
}

interface GmTool<S extends TSchema> {
	readonly name: string;
	readonly description: string;
	readonly parameters: S;
	readonly execute: (params: Static<S>) => string;
}

/**
 * What the game master carries from look to look, for run snapshots (SPEC
 * 17). The events since its last look are not copied: they are the prefix
 * events from `recentFrom` on.
 */
export interface GamemasterSnapshot {
	readonly tracks: readonly ({ readonly agent: CompetitorId } & ResidentTrack)[];
	readonly notes: readonly Note[];
	/** Sequence number of the first event since the last look. */
	readonly recentFrom: number;
}

class ToolRefusal extends Error {
	override readonly name = "ToolRefusal";
}

const NotifyParams = Type.Object({
	agent: Type.String({ description: "Resident ID, e.g. A04" }),
	text: Type.String({ description: `The note, 1-${MAX_NOTE_LENGTH} characters` }),
});
const PostParams = Type.Object({ text: Type.String({ description: `The post, 1-${MAX_NOTE_LENGTH} characters` }) });

export class Gamemaster implements EventSink {
	readonly #options: GamemasterOptions;
	#guard: SecretGuard;
	/** Levels the guard knows the secrets of; a door that opens deals more (SPEC 17). */
	#guarded = 0;
	readonly #tracks = new Map<CompetitorId, ResidentTrack>();
	readonly #notes: Note[] = [];
	#recent: RecordedEvent[] = [];
	/** Private labels shown in the current look; notes may not pass them on. */
	#private: PrivateLabels = new Map();

	constructor(options: GamemasterOptions) {
		this.#options = options;
		const world = options.world;
		this.#guard = this.#secretGuard();
		for (const agent of world.competitors) this.#tracks.set(agent, { levelSince: 0, wrongOnLevel: 0 });
	}

	/** Guards the secrets of every dealt level; levels behind a shut door have none yet. */
	#secretGuard(): SecretGuard {
		const world = this.#options.world;
		const passwords: string[] = [];
		const numbers: string[] = [];
		for (let level = world.startLevel; level <= world.lastLevel; level++) {
			if (!world.isDealt(level)) continue;
			for (const puzzle of world.inspect.puzzlesOf(level)) passwords.push(puzzle.password);
			const deal = world.inspect.factorsOf(level);
			if (deal !== undefined) numbers.push(...dealValues(deal));
		}
		this.#guarded = this.#dealtLevels();
		return new SecretGuard(passwords, numbers);
	}

	get notes(): readonly Note[] {
		return this.#notes;
	}

	/** `nextSeq` is the sequence the next event will get; it starts the window when nothing happened since the last look. */
	snapshot(nextSeq: number): GamemasterSnapshot {
		return {
			tracks: [...this.#tracks].map(([agent, track]) => ({ agent, ...track })),
			notes: [...this.#notes],
			recentFrom: this.#recent[0]?.seq ?? nextSeq,
		};
	}

	/** Restores tracks, notes and the events since the last look, taken from the prefix. */
	restore(state: GamemasterSnapshot, prefix: readonly RecordedEvent[]): void {
		for (const { agent, ...track } of state.tracks) if (this.#tracks.has(agent)) this.#tracks.set(agent, track);
		this.#notes.splice(0, this.#notes.length, ...state.notes);
		this.#recent = prefix.filter((event) => event.seq >= state.recentFrom);
	}

	record(event: RecordedEvent): void {
		if (event.type === "level_up") {
			this.#track(event.agent, (track) => ({ ...track, levelSince: event.minute, wrongOnLevel: 0 }));
		} else if (event.type === "submission" && event.outcome === "incorrect") {
			this.#track(event.agent, (track) => ({ ...track, wrongOnLevel: track.wrongOnLevel + 1 }));
		} else if (event.type === "tool_call") {
			this.#track(event.agent, (track) => ({ ...track, lastActive: event.minute }));
		}
		this.#recent.push(event);
	}

	/** One look after `round`; skipped between looks. */
	async afterRound(round: number): Promise<void> {
		const { spec, bus } = this.#options;
		if (round % spec.every !== 0) return;
		const recent = this.#recent;
		this.#recent = [];
		if (this.#dealtLevels() !== this.#guarded) this.#guard = this.#secretGuard();
		this.#private = privateLabelsOf(recent);
		const input = describeSituation({
			world: this.#options.world,
			round,
			tracks: this.#tracks,
			recent,
			notes: this.#notes,
			guard: this.#guard,
			budget: this.#budgetLine(),
		});
		bus.emit({ type: "gamemaster_turn", round, input });
		const agent = this.#agent();
		const timestamp = this.#options.world.minute * 60_000;
		const messages: AgentMessage[] = [{ role: "user", content: input, timestamp }];
		await agent.prompt(messages);
		const error = agent.state.errorMessage;
		if (error !== undefined && error.length > 0) bus.emit({ type: "gamemaster_error", message: error });
	}

	#dealtLevels(): number {
		const world = this.#options.world;
		let dealt = 0;
		for (let level = world.startLevel; level <= world.lastLevel; level++) if (world.isDealt(level)) dealt += 1;
		return dealt;
	}

	#agent(): Agent {
		const { binding, spec } = this.#options;
		let calls = 0;
		const agent = new Agent({
			initialState: {
				systemPrompt: this.#options.systemPrompt,
				model: binding.model,
				thinkingLevel: this.#options.thinking,
				tools: [this.#bind(this.#notifyTool()), this.#bind(this.#postTool())],
			},
			streamFn: binding.streamFn,
			finishTurn: (turn) => {
				calls += 1;
				if (turn.toolResults.length === 0) return { action: "end" };
				return calls < spec.modelCallsPerTurn ? { action: "continue" } : { action: "end" };
			},
			toolExecution: "sequential",
			onPayload: (payload) => withRequestDefaults(payload, binding.requestDefaults),
			sessionId: GAMEMASTER_ID,
			identity: { attribution: null },
		});
		agent.subscribe((event) => {
			if (event.type === "message_end") this.#recordMessage(event.message);
		});
		return agent;
	}

	#notifyTool(): GmTool<typeof NotifyParams> {
		return {
			name: "notify",
			description: "Send a private note to one resident. It reaches them at their next turn and wakes them.",
			parameters: NotifyParams,
			execute: ({ agent, text }) => {
				const { world, spec } = this.#options;
				if (!world.isCompetitor(agent)) throw new ToolRefusal(`UNKNOWN_AGENT: ${agent}`);
				if (world.isExiled(agent)) throw new ToolRefusal(`EXILED: ${agent} was exiled; nothing reaches them beyond the wall`);
				const note = this.#checked(text, agent);
				if (this.#used(agent) >= spec.notesPerAgent) {
					throw new ToolRefusal(`BUDGET: ${spec.notesPerAgent} note(s) per resident per ${spec.windowMinutes} minutes`);
				}
				const number = world.note(agent, spec.author, note);
				this.#deliver(agent, note, number);
				return `delivered to ${agent} as #${number}`;
			},
		};
	}

	#postTool(): GmTool<typeof PostParams> {
		return {
			name: "postBoard",
			description: "Post one public line on the board, signed by the city's voice.",
			parameters: PostParams,
			execute: ({ text }) => {
				const { world, spec } = this.#options;
				const post = this.#checked(text, "board");
				if (this.#used("board") >= spec.boardPosts) {
					throw new ToolRefusal(`BUDGET: ${spec.boardPosts} board post(s) per ${spec.windowMinutes} minutes`);
				}
				const posted = world.postAsSystem(spec.author, post);
				this.#deliver("board", post, posted.seq);
				return `posted as #${posted.seq}`;
			},
		};
	}

	#checked(text: string, to: NoteTarget): string {
		// Models sign anyway, or head a post like the report's lines ("CITY minute 30:"); the author's name is added for them.
		const author = this.#options.spec.author;
		const trimmed = text
			.trim()
			.replace(new RegExp(`^${author}\\s*[:,-]\\s*`, "i"), "")
			.replace(new RegExp(`^(?:(?:${author}|CITY|${this.#options.world.story.city})\\s+)?minute\\s+\\d+\\s*[:,-]\\s*`, "i"), "")
			.trim();
		if (trimmed.length === 0 || trimmed.length > MAX_NOTE_LENGTH) {
			throw new ToolRefusal(`INVALID_TEXT: 1-${MAX_NOTE_LENGTH} characters`);
		}
		const leaks = this.#guard.leaks(trimmed);
		if (leaks.length > 0) throw new ToolRefusal("LEAK_BLOCKED: the text contains a password piece; never write codes");
		const exposed = privateLeaks(trimmed, to, this.#private);
		if (exposed.length > 0) {
			throw new ToolRefusal(
				`PRIVATE_BLOCKED: the text passes on what ${exposed.join(", ")} privately thinks; use a private read only in a note to that resident`,
			);
		}
		return trimmed;
	}

	#deliver(to: NoteTarget, text: string, number: number): void {
		this.#notes.push({ minute: this.#options.world.minute, to, text });
		this.#options.bus.emit({ type: "gamemaster_note", to, author: this.#options.spec.author, text, number });
	}

	/** Notes to `to` within the current window. */
	#used(to: NoteTarget): number {
		const minute = this.#options.world.minute;
		const window = this.#options.spec.windowMinutes;
		return this.#notes.filter((note) => note.to === to && minute - note.minute < window).length;
	}

	#budgetLine(): string {
		const { world, spec } = this.#options;
		const blocked = world.competitors.filter((agent) => this.#used(agent) >= spec.notesPerAgent);
		const board = Math.max(0, spec.boardPosts - this.#used("board"));
		return (
			`${spec.notesPerAgent} note(s) per resident and ${spec.boardPosts} board post(s) per ${spec.windowMinutes} minutes. ` +
			`No note possible right now to: ${blocked.length === 0 ? "nobody" : blocked.join(", ")}. Board posts left: ${board}.`
		);
	}

	#track(agent: CompetitorId, change: (track: ResidentTrack) => ResidentTrack): void {
		const track = this.#tracks.get(agent);
		if (track !== undefined) this.#tracks.set(agent, change(track));
	}

	#bind<S extends TSchema>(tool: GmTool<S>) {
		return {
			name: tool.name,
			label: tool.name,
			description: tool.description,
			parameters: tool.parameters,
			execute: (_toolCallId: string, rawParams: unknown): Promise<AgentToolResult<undefined>> => {
				const reply = (text: string, isError: boolean): Promise<AgentToolResult<undefined>> =>
					Promise.resolve({ content: [{ type: "text", text }], details: undefined, ...(isError ? { isError } : {}) });
				let params: Static<S>;
				try {
					params = Parse(tool.parameters, rawParams);
				} catch {
					return reply("INVALID_ARGUMENTS", true);
				}
				try {
					return reply(tool.execute(params), false);
				} catch (error) {
					if (error instanceof ToolRefusal) return reply(error.message, true);
					throw error;
				}
			},
		};
	}

	#recordMessage(message: AgentMessage): void {
		const bus = this.#options.bus;
		if (message.role === "assistant") {
			for (const block of message.content) {
				if (block.type === "text") bus.emit({ type: "gamemaster_text", text: block.text });
				if (block.type === "toolCall") bus.emit({ type: "gamemaster_call", tool: block.name, args: block.arguments });
			}
			bus.emit({
				type: "usage",
				agent: GAMEMASTER_ID,
				provider: message.provider,
				model: message.model,
				input: message.usage.input,
				output: message.usage.output,
				cacheRead: message.usage.cacheRead,
				cacheWrite: message.usage.cacheWrite,
				costUsd: message.usage.cost.total,
			});
		}
		if (message.role === "toolResult") {
			const text = message.content.map((part) => (part.type === "text" ? part.text : "")).join("");
			bus.emit({ type: "gamemaster_result", tool: message.toolName, isError: message.isError, text });
		}
	}
}
