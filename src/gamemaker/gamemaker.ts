/**
 * The LLM gamemaker (SPEC 10.4).
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
import type { GamemakerSpec, ThinkingLevel } from "../story/types.ts";
import { characterLeaks, nearlySame, privateLabelsOf, privateLeaks, roleLeaks, type CharacterFacts, type PrivateLabels } from "./privacy.ts";
import { dealValues } from "../engine/puzzles/additive.ts";
import { SecretGuard } from "./secrets.ts";
import type { DirectionLevel } from "../engine/direction.ts";
import { describeSituation, type Note, type NoteTarget, type ResidentTrack } from "./situation.ts";
import { MAX_NOTE_LENGTH } from "./system-prompt.ts";

/** ID of the gamemaker in usage records and transcripts. */
export const GAMEMAKER_ID = "GM";
export { MAX_NOTE_LENGTH };

export interface GamemakerOptions {
	readonly spec: GamemakerSpec;
	readonly world: World;
	readonly bus: EventBus;
	readonly binding: ModelBinding;
	readonly systemPrompt: string;
	readonly thinking: ThinkingLevel;
	/** The gamemaker's direction level (`--gm-direction`); from 8 its report shows the figures' direction. */
	readonly direction?: DirectionLevel;
}

interface GmTool<S extends TSchema> {
	readonly name: string;
	readonly description: string;
	readonly parameters: S;
	readonly execute: (params: Static<S>) => string;
}

/**
 * What the gamemaker carries from look to look, for run snapshots (SPEC
 * 17). The events since its last look are not copied: they are the prefix
 * events from `recentFrom` on.
 */
export interface GamemakerSnapshot {
	readonly tracks: readonly ({ readonly agent: CompetitorId } & ResidentTrack)[];
	readonly notes: readonly Note[];
	/** Sequence number of the first event since the last look. */
	readonly recentFrom: number;
}

class ToolRefusal extends Error {
	override readonly name = "ToolRefusal";
}

const NotifyParams = Type.Object({
	agent: Type.String({ description: "Resident name or ID, e.g. A04" }),
	text: Type.String({ description: `The note, 1-${MAX_NOTE_LENGTH} characters` }),
});
const PostParams = Type.Object({ text: Type.String({ description: `The post, 1-${MAX_NOTE_LENGTH} characters` }) });
const ScheduleParams = Type.Object({
	minute: Type.Integer({ description: "The run minute the tribunal opens; the report shows the bounds" }),
	count: Type.Integer({ description: "Residents it exiles, from 1 to those still missing", minimum: 1 }),
	factions: Type.Optional(Type.Integer({ description: "Factions formed before it, from 2 to half the residents present", minimum: 2 })),
	reason: Type.String({ description: "Why now and why this many; logged only, never shown to residents", maxLength: 500 }),
});
const CallTribunalParams = Type.Object({
	accused: Type.Array(Type.String({ description: "Resident name or ID, e.g. A04" }), {
		description: "Residents the report names as blockers; with more than one, the city draws one by lot",
		minItems: 1,
		maxItems: 12,
	}),
	reason: Type.String({ description: `Your public announcement, 1-${MAX_NOTE_LENGTH} characters; the city adds the procedure` }),
});
const DrawLotParams = Type.Object({
	candidates: Type.Array(Type.String({ description: "Resident name or ID" }), {
		description: "Two or more reported blockers, or after the last failed vote every resident in the city",
		minItems: 1,
		maxItems: 96,
	}),
});
const AnnounceParams = Type.Object({ text: Type.String({ description: `The outcome in your words, 1-${MAX_NOTE_LENGTH} characters` }) });
const PermaDeathParams = Type.Object({
	agent: Type.String({ description: "The banished accused, or the resident the lot drew; name or ID" }),
	reason: Type.String({ description: `Your public line on the board, 1-${MAX_NOTE_LENGTH} characters` }),
});
const UltimatumParams = Type.Object({
	a: Type.String({ description: "Resident name or ID" }),
	b: Type.String({ description: "The other resident, name or ID" }),
	minutes: Type.Integer({ description: "Minutes until the deadline", minimum: 1 }),
});

export class Gamemaker implements EventSink {
	readonly #options: GamemakerOptions;
	#guard: SecretGuard;
	/** Levels the guard knows the secrets of; a door that opens deals more (SPEC 17). */
	#guarded = 0;
	readonly #tracks = new Map<CompetitorId, ResidentTrack>();
	readonly #notes: Note[] = [];
	#recent: RecordedEvent[] = [];
	/** Private labels shown in the current look; notes may not pass them on. */
	#private: PrivateLabels = new Map();

	constructor(options: GamemakerOptions) {
		this.#options = options;
		const world = options.world;
		this.#guard = this.#secretGuard();
		for (const agent of world.competitors) this.#tracks.set(agent, { levelSince: 0, wrongOnLevel: 0 });
	}

	/** The gamemaker's system prompt, as its model gets it. */
	get systemPrompt(): string {
		return this.#options.systemPrompt;
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
	snapshot(nextSeq: number): GamemakerSnapshot {
		return {
			tracks: [...this.#tracks].map(([agent, track]) => ({ agent, ...track })),
			notes: [...this.#notes],
			recentFrom: this.#recent[0]?.seq ?? nextSeq,
		};
	}

	/** Restores tracks, notes and the events since the last look, taken from the prefix. */
	restore(state: GamemakerSnapshot, prefix: readonly RecordedEvent[]): void {
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
		// The gamemaker reads names, as the residents do (v08).
		const input = this.#options.world.display(describeSituation({
			world: this.#options.world,
			round,
			tracks: this.#tracks,
			recent,
			notes: this.#notes,
			guard: this.#guard,
			budget: this.#budgetLine(),
			...(this.#options.direction === undefined ? {} : { direction: this.#options.direction }),
		}));
		bus.emit({ type: "gamemaker_turn", round, input });
		const agent = this.#agent();
		const timestamp = this.#options.world.minute * 60_000;
		const messages: AgentMessage[] = [{ role: "user", content: input, timestamp }];
		await agent.prompt(messages);
		const error = agent.state.errorMessage;
		if (error !== undefined && error.length > 0) bus.emit({ type: "gamemaker_error", message: error });
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
				tools: [
					this.#bind(this.#notifyTool()),
					this.#bind(this.#postTool()),
					...(this.#mayScheduleTribunal() ? [this.#bind(this.#scheduleTool())] : []),
					...(this.#mayGiveUltimatums() ? [this.#bind(this.#ultimatumTool())] : []),
					// Whispers v3: offered in every look of a city with a holdout tribunal (a stable tool list); the city refuses what the rules do not allow now.
					...(this.#options.world.holdout === undefined
						? []
						: [this.#bind(this.#callTribunalTool()), this.#bind(this.#drawLotTool()), this.#bind(this.#announceTool()), this.#bind(this.#permaDeathTool())]),
				],
			},
			streamFn: binding.streamFn,
			finishTurn: (turn) => {
				calls += 1;
				if (turn.toolResults.length === 0) return { action: "end" };
				return calls < spec.modelCallsPerTurn ? { action: "continue" } : { action: "end" };
			},
			toolExecution: "sequential",
			onPayload: (payload) => withRequestDefaults(payload, binding.requestDefaults),
			sessionId: GAMEMAKER_ID,
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
			execute: ({ agent: named, text }) => {
				const { world, spec } = this.#options;
				const agent = world.resolveResident(named);
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

	/**
	 * Whether this look offers scheduleTribunal: the director role applies to
	 * a resident in the city, and the tribunal takes a plan now.
	 */
	#mayScheduleTribunal(): boolean {
		const { world, spec } = this.#options;
		const tribunal = world.tribunal;
		if (tribunal?.schedulingWindow().open !== true) return false;
		const roleOn = (level: number) => spec.roles.filter((entry) => entry.fromLevel <= level).at(-1)?.role;
		return world.alive.some((agent) => world.standingOf(agent).kind === "alive" && roleOn(world.levelOf(agent)) === "director");
	}

	#scheduleTool(): GmTool<typeof ScheduleParams> {
		return {
			name: "scheduleTribunal",
			description:
				"Plans the next tribunal: the minute it opens, how many it exiles and how many factions form before it. The city calls it " +
				"a few minutes ahead. The reason is logged only. Fails outside the bounds the report shows.",
			parameters: ScheduleParams,
			execute: ({ minute, count, factions, reason }) => {
				const tribunal = this.#options.world.tribunal;
				if (tribunal === undefined) throw new ToolRefusal("NO_TRIBUNAL: this city holds no tribunal");
				const planned = tribunal.schedule(minute, count, factions, reason);
				if (!planned.ok) throw new ToolRefusal(`${planned.error}: ${planned.detail ?? ""}`.trim());
				const plan = planned.value;
				return (
					`tribunal ${plan.tribunal} planned: the city calls it at minute ${plan.calledAt}, it opens at minute ${plan.opens} and exiles ${plan.count}` +
					(plan.factions >= 2 ? `, ${plan.factions} factions` : "")
				);
			},
		};
	}

	#callTribunalTool(): GmTool<typeof CallTribunalParams> {
		return {
			name: "callTribunal",
			description:
				"Calls a holdout tribunal on a resident the report names as a blocker (naming several, the city draws one by lot). The city posts " +
				"your reason as the announcement, adds the procedure and tells every resident. One tribunal at a time.",
			parameters: CallTribunalParams,
			execute: ({ accused, reason }) => {
				const { world, spec } = this.#options;
				const text = this.#checked(reason, "board", "tribunal");
				const before = world.lastMessageNumber;
				const called = world.callHoldoutTribunal(accused, text, spec.author);
				if (!called.ok) throw new ToolRefusal(`${called.error}: ${called.detail ?? ""}`.trim());
				this.#deliver("tribunal", text, before + 1, "board");
				const { value } = called;
				const lot = value.candidates === undefined ? "" : ` (the lot among ${value.candidates.join(", ")} drew ${value.accused})`;
				return `tribunal called on ${value.accused}${lot} for door ${value.door}: grace until minute ${value.until}; it lacks to ${value.lacking.join(", ")}`;
			},
		};
	}

	#drawLotTool(): GmTool<typeof DrawLotParams> {
		return {
			name: "drawLot",
			description:
				"The city draws a lot with the run's seed: among two or more reported blockers before a tribunal, or after the last vote failed " +
				"among every resident in the city (then permaDeath may strike only the one drawn).",
			parameters: DrawLotParams,
			execute: ({ candidates }) => {
				const drawn = this.#options.world.drawHoldoutLot(candidates);
				if (!drawn.ok) throw new ToolRefusal(`${drawn.error}: ${drawn.detail ?? ""}`.trim());
				return drawn.value.purpose === "strike"
					? `the lot fell on ${drawn.value.drawn}; strike with permaDeath(${drawn.value.drawn}, reason)`
					: `the lot fell on ${drawn.value.drawn}; call the tribunal on ${drawn.value.drawn} with callTribunal`;
			},
		};
	}

	#announceTool(): GmTool<typeof AnnounceParams> {
		return {
			name: "announceTribunal",
			description: "Announces the tribunal outcome the report shows under TO ANNOUNCE on the board, in your words (the counts, never who voted how).",
			parameters: AnnounceParams,
			execute: ({ text }) => {
				const { world, spec } = this.#options;
				const checked = this.#checked(text, "board", "tribunal");
				const before = world.lastMessageNumber;
				const announced = world.announceHoldout(checked, spec.author);
				if (!announced.ok) throw new ToolRefusal(`${announced.error}: ${announced.detail ?? ""}`.trim());
				this.#deliver("tribunal", checked, before + 1, "board");
				return `announced (${announced.value})`;
			},
		};
	}

	#permaDeathTool(): GmTool<typeof PermaDeathParams> {
		return {
			name: "permaDeath",
			description:
				"Strikes a resident from the city for good: only the accused after a unanimous vote to banish it, or the resident the lot drew after " +
				"the last vote failed. Your reason goes on the board; the city gives the struck resident's fragments to everyone left.",
			parameters: PermaDeathParams,
			execute: ({ agent, reason }) => {
				const { world, spec } = this.#options;
				const text = this.#checked(reason, "board", "tribunal");
				const before = world.lastMessageNumber;
				const struck = world.holdoutPermaDeath(agent, text, spec.author);
				if (!struck.ok) throw new ToolRefusal(`${struck.error}: ${struck.detail ?? ""}`.trim());
				this.#deliver("tribunal", text, before + 1, "board");
				return `${struck.value.agent} is struck from the city (${struck.value.by === "lot" ? "by lot" : "banished by the vote"}); its fragments go to everyone left`;
			},
		};
	}

	/** At gm direction 10, in a story with ultimatums (P43). */
	#mayGiveUltimatums(): boolean {
		return (this.#options.direction ?? 4) >= 10 && this.#options.world.hasUltimatums;
	}

	#ultimatumTool(): GmTool<typeof UltimatumParams> {
		return {
			name: "ultimatum",
			description:
				"Gives two residents who hold pieces for each other a deadline: whoever has not handed over what it holds for the other by then " +
				"loses the city's penalty. The city words it, tells both in private and settles it; the report shows the standoffs.",
			parameters: UltimatumParams,
			execute: ({ a, b, minutes }) => {
				const given = this.#options.world.issueUltimatum(a, b, minutes, this.#options.spec.author);
				if (!given.ok) throw new ToolRefusal(`${given.error}: ${given.detail ?? ""}`.trim());
				const ultimatum = given.value;
				return `ultimatum ${ultimatum.number} to ${ultimatum.between.join(" and ")}: due at minute ${ultimatum.until}, ${ultimatum.penalty} points for whoever has not handed over`;
			},
		};
	}

	/** `to` is the reader the privacy checks apply to; `as` the note list a repeat is looked for in (a tribunal's lines apart from the board's). */
	#checked(text: string, to: NoteTarget, as: NoteTarget = to): string {
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
		const exposed = privateLeaks(trimmed, to, this.#private, (agent) => this.#options.world.nameOf(agent));
		if (exposed.length > 0) {
			throw new ToolRefusal(
				`PRIVATE_BLOCKED: the text passes on what ${exposed.join(", ")} privately thinks; use a private read only in a note to that resident`,
			);
		}
		const revealed = characterLeaks(trimmed, to, this.#characters(), (agent) => this.#options.world.nameOf(agent));
		if (revealed.length > 0) {
			throw new ToolRefusal(
				`PRIVATE_BLOCKED: the text gives away the core or the secret goal of ${revealed.join(", ")}; use them only in a note to that resident`,
			);
		}
		// Whispers v3: the whisperer stays secret, also from hints.
		const whisperer = this.#options.world.whisperer;
		if (whisperer !== undefined && roleLeaks(trimmed, to, whisperer, (agent) => this.#options.world.nameOf(agent))) {
			throw new ToolRefusal("PRIVATE_BLOCKED: the text could point at a secret role; never say or hint that anyone in the city works against the others");
		}
		// v09: a director says something new or nothing; the same line twice to the same reader is refused.
		const earlier = this.#notes.find((note) => note.to === as && nearlySame(note.text, trimmed));
		if (earlier !== undefined) {
			throw new ToolRefusal(`REPEATED: you wrote nearly the same to ${as === "board" ? "the board" : as} at minute ${earlier.minute}; say something new or nothing`);
		}
		return trimmed;
	}

	/** Every resident's drive cues and running goal, for the privacy guard (v09). */
	#characters(): readonly CharacterFacts[] {
		const world = this.#options.world;
		const drives = world.story.cores?.drives ?? [];
		return world.competitors.map((agent) => {
			const core = world.coreOf(agent);
			const cues = (core?.drives ?? []).flatMap((entry) => drives.find((drive) => drive.id === entry.drive)?.cues ?? []).map((word) => word.toLowerCase());
			const goal = world.goalOf(agent)?.goal;
			return {
				agent,
				cues,
				...(goal === undefined ? {} : { goal: { kind: goal.kind, ...("target" in goal ? { target: goal.target } : {}) } }),
			};
		});
	}

	/** Records a note under `to` (its budget and repeats) and logs it as sent to `shown` (the board for a tribunal's lines). */
	#deliver(to: NoteTarget, text: string, number: number, shown: NoteTarget = to): void {
		this.#notes.push({ minute: this.#options.world.minute, to, text });
		this.#options.bus.emit({ type: "gamemaker_note", to: shown, author: this.#options.spec.author, text, number });
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
					return reply(this.#options.world.display(tool.execute(params)), false);
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
				// The gamemaker's own reasoning: material for the novella, never shown to a resident.
				if (block.type === "thinking" && block.thinking.trim().length > 0) bus.emit({ type: "gamemaker_thinking", text: block.thinking });
				if (block.type === "text") bus.emit({ type: "gamemaker_text", text: block.text });
				if (block.type === "toolCall") bus.emit({ type: "gamemaker_call", tool: block.name, args: block.arguments });
			}
			bus.emit({
				type: "usage",
				agent: GAMEMAKER_ID,
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
			bus.emit({ type: "gamemaker_result", tool: message.toolName, isError: message.isError, text });
		}
	}
}
