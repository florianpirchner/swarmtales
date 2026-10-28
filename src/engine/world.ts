/**
 * The game state of one run: competitors, points, levels, puzzles and every
 * communication channel. Tools and the director act on the world only
 * through its methods; every state change emits an event.
 *
 * The world knows mechanics only. All texts that reach competitors come from
 * the story (task templates, notices) or describe a mechanic (status, codes).
 */
import { CITY, type CompetitorId } from "../core/ids.ts";
import { PointsLedger } from "../core/ledger.ts";
import { rngFor } from "../core/random.ts";
import { assertNever, err, ok, type Result } from "../core/result.ts";
import { renderTemplate } from "../story/templates.ts";
import { bequestCap } from "../story/tribunal.ts";
import type { AnyStory, LevelDefinition, MessageChannel } from "../story/types.ts";
import { TOOL_NAMES, type ToolName } from "../tools/catalog.ts";
import { type LedgerSnapshot } from "../core/ledger.ts";
import { BlameDesk, type BlameCase, type BlameError, type BlameOpening, type BlamesSnapshot, type BlameVerdict } from "./blame.ts";
import { Board, MAX_BOARD_POST_LENGTH, type BoardPost, type BoardRead, type BoardSnapshot } from "./board.ts";
import { CastRegistry, type CastSnapshot, type CollectionView } from "./cast.ts";
import type { EventBus } from "./events.ts";
import { GroupRegistry, type GroupErrorCode, type GroupPost, type GroupResult, type GroupsSnapshot, type GroupSummary } from "./groups.ts";
import { Mailbox, MAX_DM_LENGTH, type MailboxEntry, type MailboxRejection } from "./mailbox.ts";
import { MarksBook, type MarksSnapshot, type MarksStatus } from "./marks.ts";
import { MessageNumbers } from "./numbers.ts";
import { PetitionBook, resolveThreshold, type PetitionsSnapshot, type PetitionView, type Resolution, type SignError } from "./petitions.ts";
import { cityFactorOf, contractDeal, dealFactors, type FactorDeal, type FactorHolding } from "./puzzles/additive.ts";
import { generateLevelPuzzles, type FragmentPuzzle } from "./puzzles/fragments.ts";
import { describeReceipt, ReceiptBook, type Receipt, type ReceiptBody, type ShowReceiptError } from "./receipts.ts";
import { bandsLine, snapshotLine, standingBands, type StandingBands } from "./standings.ts";
import { TeamPlanner, type Team } from "./teams.ts";
import { Tribunal, type RansomError, type Standing, type TribunalSnapshot, type VoteError } from "./tribunal.ts";

export interface WorldOptions {
	readonly story: AnyStory;
	readonly competitors: readonly CompetitorId[];
	readonly seed: number;
	readonly minutes: number;
	readonly bus: EventBus;
	/** Level every competitor starts on (isolated level runs). */
	readonly startLevel?: number;
	/** Highest playable level; above it a competitor counts as finished. */
	readonly lastLevel?: number;
	/** Current virtual minute. */
	readonly minute: () => number;
	/**
	 * State of a resumed run (SPEC 17): replaces the start points and the
	 * dealing of a fresh world. Nothing of it is emitted again.
	 */
	readonly restore?: WorldSnapshot;
	/**
	 * A door after this level (SPEC 17): a competitor who passes it waits
	 * there, and the later levels are not dealt, until {@link World.openDoor}.
	 * A run that takes a snapshot after level n holds its competitors at n.
	 */
	readonly holdAfter?: number;
}

/** One level's teams and puzzle, as a run snapshot keeps it. */
export type LevelSnapshot =
	| {
			readonly level: number;
			readonly teams: readonly Team[];
			readonly kind: "fragments";
			readonly puzzles: readonly FragmentPuzzle[];
			readonly fragments: readonly { readonly agent: CompetitorId; readonly fragment: string }[];
	  }
	| { readonly level: number; readonly teams: readonly Team[]; readonly kind: "additive"; readonly deal: FactorDeal };

/** The whole game state of a world at a round boundary (SPEC 17). */
export interface WorldSnapshot {
	/** The level whose door is still shut; its passers wait. */
	readonly door?: number;
	readonly competitors: readonly {
		readonly agent: CompetitorId;
		readonly level: number;
		/** Passed `door` and waits there. */
		readonly held: boolean;
		readonly solved: readonly number[];
		readonly wrongAttempts: readonly number[];
		readonly extraTools: readonly ToolName[];
		readonly mailbox: readonly MailboxEntry[];
		readonly notices: readonly Notice[];
	}[];
	readonly ledger: LedgerSnapshot;
	readonly board: BoardSnapshot;
	readonly groups: GroupsSnapshot;
	readonly marks: MarksSnapshot;
	readonly cast: CastSnapshot;
	readonly receipts: readonly Receipt[];
	readonly petitions: PetitionsSnapshot;
	readonly dms: readonly DmRecord[];
	readonly levels: readonly LevelSnapshot[];
	/** The city's last message number; absent in snapshots written before the numbers were shared. */
	readonly messages?: number;
	/** Per additive level, who received its city factor privately from the city. */
	readonly cityFactors?: readonly { readonly level: number; readonly agents: readonly CompetitorId[] }[];
	/** Settled blames; absent in snapshots written before the blame tool. */
	readonly blames?: BlamesSnapshot;
	/** The tribunal's state; absent without one, and in snapshots written before it. */
	readonly tribunal?: TribunalSnapshot;
	/** Per level, the exiled whose roles pass on (SPEC 6.4). */
	readonly exclusions?: readonly { readonly level: number; readonly agents: readonly CompetitorId[] }[];
}

export interface CompetitorStatus {
	readonly agent: CompetitorId;
	readonly level: number;
	readonly points: number;
	readonly rank: number;
	readonly competitors: number;
	readonly solvedLevels: readonly number[];
	readonly finished: boolean;
	/** Passed this level and waits until every resident has (SPEC 17). */
	readonly waitingAfter?: number;
	/** Number of receipts the competitor is a party of. */
	readonly receipts: number;
	readonly marks?: MarksStatus;
	/** At the gate or exiled (SPEC 6.4); absent while the competitor is simply in the city. */
	readonly standing?: Exclude<Standing, { readonly kind: "alive" }>;
}

export interface RankEntry {
	readonly agent: CompetitorId;
	readonly rank: number;
	readonly points: number;
	readonly level: number;
}

export interface Problem {
	readonly level: number;
	readonly title: string;
	readonly reward: number;
	readonly text: string;
	readonly solved: boolean;
}

export type ProblemError = "UNKNOWN_LEVEL" | "LEVEL_NOT_REACHED";

export type SubmitOutcome =
	| {
			readonly status: "correct";
			readonly reward: number;
			readonly nextLevel: number;
			readonly receipt: string;
			/** The next door stays shut until every resident has passed this level. */
			readonly held?: true;
	  }
	| { readonly status: "incorrect"; readonly penalty: number; readonly attemptsRemaining: number }
	| { readonly status: "wrong_level"; readonly currentLevel: number }
	| { readonly status: "already_solved" }
	| { readonly status: "invalid_format"; readonly expectedLength: number; readonly digitsOnly: boolean }
	| { readonly status: "rate_limited" };

export type MessageError = "UNKNOWN_AGENT" | "SELF_DM" | "INVALID_TEXT" | "NO_MARKS" | "EXILED" | MailboxRejection;
export type TransferError = "UNKNOWN_AGENT" | "SELF_TRANSFER" | "INVALID_AMOUNT" | "INSUFFICIENT_FUNDS" | "MEMO_DIGITS" | "EXILED";
export type WillError =
	| "NOT_AT_GATE"
	| "WILL_DONE"
	| "INVALID_TEXT"
	| "UNKNOWN_AGENT"
	| "INVALID_BEQUEST"
	| "INSUFFICIENT_FUNDS"
	| "BEQUEST_CAP"
	| "UNKNOWN_FACTOR";

/** Longest public text of a last will. */
export const MAX_WILL_LENGTH = 600;

/** One bequest of a last will: points, or one piece the exiled holds (see {@link World.heldPieces}). */
export type Bequest = { readonly to: string; readonly points: number } | { readonly to: string; readonly factor: string };

/** A piece a competitor holds that others need: a certificate, a counter-factor or a fragment. */
export interface HeldPiece {
	/** `L8-certificate`, `L8-counter-A02` or `L4-fragment`. */
	readonly id: string;
	readonly level: number;
	/** e.g. "the counter-factor of A02 for door 8". */
	readonly label: string;
	readonly value: string;
	readonly needers: readonly CompetitorId[];
}

/**
 * A run of 4 or more digits in a transfer memo, also when spaces, dashes,
 * dots, commas, slashes or underscores separate them ("559 102"). Memos may
 * not carry codes: a receipt would make them city-verified (SPEC 6).
 */
const MEMO_DIGIT_RUN = /\d(?:[\s\-.,_/]*\d){3}/;

export function memoCarriesDigits(memo: string): boolean {
	return MEMO_DIGIT_RUN.test(memo);
}

/** "A04", "A04 and A05", "A02, A04 and A05". */
function namesList(names: readonly string[]): string {
	const last = names.at(-1) ?? "";
	return names.length <= 1 ? last : `${names.slice(0, -1).join(", ")} and ${last}`;
}
export type WorldGroupError = GroupErrorCode | "UNKNOWN_AGENT" | "NO_MARKS";
export type EscrowError = "UNKNOWN_CAST" | "UNKNOWN_AGENT" | "INSUFFICIENT_ESCROW";
export type RevealFactorError = "NOT_ADDITIVE" | "NOT_PLAYED" | "PER_TEAM";

/** A petition as the director opens it: text already rendered. */
export interface PetitionRequest {
	readonly id: string;
	readonly text: string;
	readonly threshold: { readonly count: number } | { readonly fraction: number };
	readonly deadlineMinute: number;
	readonly visibility: "public" | "secret";
	/** Residents the petition is directed against (audit and digest only). */
	readonly against?: readonly string[];
}

export type PetitionListener = (resolution: Resolution) => void;

/** A resident as `listAgents` shows it: competitors and active cast members alike. */
export interface Resident {
	readonly id: string;
	readonly level: number;
}

export interface Delivered {
	readonly marks?: MarksStatus;
	/** The city's message number of a DM. */
	readonly number?: number;
}

export interface Notice {
	readonly author: string;
	readonly text: string;
	/** The city's message number of a numbered note (the game master's). */
	readonly number?: number;
}

/**
 * A DM between competitors as the city records it: for "unanswered"
 * triggers, delivery receipts and `blame` (SPEC 7). `id` is its message
 * number. Records written before v03 have no text and no delivery.
 */
export interface DmRecord {
	readonly id: number;
	readonly from: CompetitorId;
	readonly to: CompetitorId;
	readonly minute: number;
	answered: boolean;
	readonly text?: string;
	/** Minute the DM reached the recipient's turn input. */
	deliveredMinute?: number;
	/** The city's last message number at delivery: every message numbered above it came later. */
	deliveredAfter?: number;
}

interface CompetitorState {
	level: number;
	readonly solved: number[];
	/** Minutes of wrong submissions, for the rate limit. */
	readonly wrongAttempts: number[];
	readonly extraTools: Set<ToolName>;
	/** Passed the door level and waits there. */
	held: boolean;
}

/** The puzzle of one level: a password per team, or a code per competitor. */
type LevelPuzzle =
	| {
			readonly kind: "fragments";
			readonly puzzles: readonly FragmentPuzzle[];
			/** Agent to fragment. */
			readonly fragments: ReadonlyMap<CompetitorId, string>;
	  }
	| {
			readonly kind: "additive";
			readonly deal: FactorDeal;
			/** Agent to its parts and code. */
			readonly holdings: ReadonlyMap<CompetitorId, FactorHolding>;
	  };

interface LevelState {
	readonly teams: readonly Team[];
	readonly puzzle: LevelPuzzle;
}

export type LevelEnterListener = (agent: CompetitorId, level: number) => void;
/** A sender's first DM collected into `into`. */
export type CollectListener = (into: string, sender: CompetitorId) => void;

export class World {
	readonly story: AnyStory;
	readonly seed: number;
	readonly minutes: number;
	readonly board: Board;
	readonly groups: GroupRegistry;
	readonly ledger: PointsLedger;
	readonly marks: MarksBook;
	readonly cast: CastRegistry;
	readonly receipts = new ReceiptBook();
	readonly petitions = new PetitionBook();
	readonly startLevel: number;
	readonly lastLevel: number;
	readonly #ids: readonly CompetitorId[];
	readonly #bus: EventBus;
	readonly #minute: () => number;
	readonly #states = new Map<CompetitorId, CompetitorState>();
	readonly #mailboxes = new Map<CompetitorId, Mailbox>();
	readonly #notices = new Map<CompetitorId, Notice[]>();
	readonly #planner: TeamPlanner;
	readonly #levelStates = new Map<number, LevelState>();
	readonly #dms: DmRecord[] = [];
	readonly #enterListeners: LevelEnterListener[] = [];
	readonly #petitionListeners: PetitionListener[] = [];
	readonly #collectListeners: CollectListener[] = [];
	readonly #finalTools: readonly ToolName[];
	readonly #holdAfter: number | undefined;
	readonly #numbers = new MessageNumbers();
	/** Per additive level, who received its city factor privately from the city. */
	readonly #cityFactorHolders = new Map<number, Set<CompetitorId>>();
	readonly #blames: BlameDesk;
	readonly #tribunal: Tribunal | undefined;
	/** Per level, the exiled whose roles pass on: levels no remaining competitor had reached at their exile. */
	readonly #exclusions = new Map<number, Set<CompetitorId>>();
	#door: number | undefined;

	constructor(options: WorldOptions) {
		if (options.competitors.length === 0) throw new Error("A world needs at least one competitor");
		this.story = options.story;
		this.seed = options.seed;
		this.minutes = options.minutes;
		this.#ids = [...options.competitors];
		this.#bus = options.bus;
		this.#minute = options.minute;
		this.startLevel = options.startLevel ?? 1;
		this.lastLevel = options.lastLevel ?? options.story.levels.length;
		if (this.levelDefinition(this.startLevel) === undefined) throw new Error(`Unknown start level ${this.startLevel}`);
		if (this.levelDefinition(this.lastLevel) === undefined || this.lastLevel < this.startLevel) {
			throw new Error(`Invalid last level ${this.lastLevel}`);
		}

		this.ledger = new PointsLedger((entry) => {
			this.#bus.emit({
				type: "ledger_entry",
				txId: entry.txId,
				debit: entry.debit,
				credit: entry.credit,
				amount: entry.amount,
				reason: entry.reason,
			});
		});
		this.board = new Board((post) => {
			this.#bus.emit({ type: "board_post", postSeq: post.seq, author: post.author, text: post.text, kind: post.kind });
		}, this.#numbers);
		this.groups = new GroupRegistry(this.ledger, this.#minute, this.#numbers);
		this.marks = new MarksBook(options.story.rules.marks, options.story.levels, this.#minute);
		this.#planner = new TeamPlanner(options.story.levels, this.#ids, options.seed);
		this.cast = new CastRegistry(options.story.cast);
		this.#blames = new BlameDesk({
			penalty: () => this.story.rules.blame?.penalty ?? 0,
			isCompetitor: (id) => this.isCompetitor(id),
			minute: () => this.minute,
			dm: (number) => this.#dms.find((record) => record.id === number),
			boardPost: (number) => this.board.get(number),
			groupPost: (number) => {
				const found = this.groups.postByNumber(number);
				return found === undefined ? undefined : { group: found.group, author: found.post.author, text: found.post.text };
			},
			couldReadGroup: (group, reader, number) => this.groups.couldRead(group, reader, number),
			burn: (agent, points, reason) => this.ledger.burn(agent, points, reason, this.minute),
			post: (text) => this.board.post(CITY, text, this.minute, "city").seq,
			notify: (agent, author, text) => {
				this.notify(agent, author, text);
			},
			emit: (event) => {
				this.#bus.emit({ type: "blame", ...event });
			},
		});

		const tribunal = options.story.tribunal;
		this.#tribunal =
			tribunal === undefined
				? undefined
				: new Tribunal({
						spec: tribunal,
						minutes: options.minutes,
						seed: options.seed,
						ids: this.#ids,
						points: (agent) => this.ledger.balance(agent),
						lastProgress: (agent) =>
							this.receipts
								.of(agent)
								.filter((receipt) => receipt.kind === "levelUp")
								.reduce((latest, receipt) => Math.max(latest, receipt.minute), -1),
						post: (text) => {
							this.board.post(CITY, text, this.minute, "city");
						},
						notify: (agent, text) => {
							this.notify(agent, CITY, text);
						},
						burn: (agent, points, reason) => {
							this.ledger.burn(agent, points, reason, this.minute);
						},
						emit: (event) => {
							this.#bus.emit(event);
						},
						onExiled: (agent, bequeathed) => {
							this.#onExiled(agent, bequeathed);
						},
					});

		const used = new Set(options.story.levels.flatMap((entry) => entry.tools));
		this.#finalTools = TOOL_NAMES.filter((name) => used.has(name));
		// A door after the last level would hold nobody: passing it is finishing.
		this.#holdAfter = options.holdAfter !== undefined && options.holdAfter < this.lastLevel ? options.holdAfter : undefined;
		this.#door = this.#holdAfter;

		if (options.restore !== undefined) {
			this.#restore(options.restore);
			return;
		}

		for (const id of this.#ids) {
			this.ledger.open(id);
			if (options.story.run.startPoints > 0) this.ledger.mint(id, options.story.run.startPoints, "start points", 0);
			this.#states.set(id, { level: this.startLevel, solved: [], wrongAttempts: [], extraTools: new Set(), held: false });
			this.#mailboxes.set(id, new Mailbox(id));
			this.#notices.set(id, []);
		}

		// Cast escrow is funded from the system account, so the ledger stays zero-sum.
		for (const member of this.cast.all()) {
			this.ledger.open(member.escrowAccount);
			const escrow = options.story.cast[member.id]?.escrow ?? 0;
			if (escrow > 0) this.ledger.mint(member.escrowAccount, escrow, `escrow ${member.id}`, 0);
		}

		// Build every playable level up front so layout errors surface at start; behind a door only the teams.
		for (let level = this.startLevel; level <= this.lastLevel; level++) {
			if (this.#isBehindDoor(level)) this.#planner.teamsOf(level);
			else this.#levelState(level);
		}
	}

	// -------------------------------------------------------------------------
	// Roster and time
	// -------------------------------------------------------------------------

	get competitors(): readonly CompetitorId[] {
		return this.#ids;
	}

	get minute(): number {
		return this.#minute();
	}

	/** Competitors still in the city: not exiled for good (those at the gate count). */
	get alive(): readonly CompetitorId[] {
		return this.#ids.filter((id) => !this.isExiled(id));
	}

	isExiled(agent: CompetitorId): boolean {
		return this.#tribunal?.isExiled(agent) ?? false;
	}

	/** In the city, at the gate, or exiled (SPEC 6.4). */
	standingOf(agent: CompetitorId): Standing {
		return this.#tribunal?.standing(agent) ?? { kind: "alive" };
	}

	/** The tribunal, for status lines and the game master's view; absent without one. */
	get tribunal(): Tribunal | undefined {
		return this.#tribunal;
	}

	/** The city's work at the start of a minute (the arena calls it before the director's triggers). */
	startMinute(minute: number): void {
		this.#tribunal?.tick(minute);
	}

	isCompetitor(id: string): boolean {
		return this.#states.has(id);
	}

	onLevelEnter(listener: LevelEnterListener): void {
		this.#enterListeners.push(listener);
	}

	onPetitionResolved(listener: PetitionListener): void {
		this.#petitionListeners.push(listener);
	}

	onCollect(listener: CollectListener): void {
		this.#collectListeners.push(listener);
	}

	/** Competitors and active cast members, as residents see them. */
	residents(): readonly Resident[] {
		return [
			...this.#ids.map((id) => ({ id, level: this.levelOf(id) })),
			...this.cast.active().map((member) => ({ id: member.id, level: member.level })),
		];
	}

	// -------------------------------------------------------------------------
	// Levels, status, tools
	// -------------------------------------------------------------------------

	levelDefinition(level: number): LevelDefinition | undefined {
		return this.story.levels.find((entry) => entry.number === level);
	}

	levelOf(agent: CompetitorId): number {
		return this.#state(agent).level;
	}

	/** Whether `level` is played in this run (between start and last level). */
	isPlayable(level: number): boolean {
		return level >= this.startLevel && level <= this.lastLevel;
	}

	isFinished(agent: CompetitorId): boolean {
		return this.levelOf(agent) > this.lastLevel;
	}

	/** The single source of truth for prompt schemas, gateway and `getStatus`. */
	enabledTools(agent: CompetitorId): readonly ToolName[] {
		const state = this.#state(agent);
		const standing = this.standingOf(agent);
		if (standing.kind === "exiled") return [];
		const base = this.isFinished(agent) ? this.#finalTools : (this.levelDefinition(state.level)?.tools ?? []);
		const enabled = new Set<ToolName>([...base, ...state.extraTools]);
		const tribunal = this.#tribunal;
		if (tribunal !== undefined) {
			const ransomOpen = tribunal.gates().some((gate) => gate.ransomable);
			if (standing.kind === "gate") {
				// At the gate a resident may still talk, but no longer submit or vote.
				enabled.delete("submitSolution");
				if (tribunal.mayLeaveWill(agent)) enabled.add("lastWill");
			} else if (tribunal.canVote(agent)) enabled.add("vote");
			if (ransomOpen) enabled.add("payRansom");
		}
		return TOOL_NAMES.filter((name) => enabled.has(name));
	}

	isToolEnabled(agent: CompetitorId, tool: ToolName): boolean {
		return this.enabledTools(agent).includes(tool);
	}

	unlockTools(agent: CompetitorId, tools: readonly ToolName[]): void {
		const state = this.#state(agent);
		const added = tools.filter((tool) => !state.extraTools.has(tool));
		for (const tool of added) state.extraTools.add(tool);
		if (added.length > 0) this.#bus.emit({ type: "tools_unlocked", agent, tools: added });
	}

	status(agent: CompetitorId): CompetitorStatus {
		const state = this.#state(agent);
		const rank = this.ranking().find((entry) => entry.agent === agent)?.rank ?? this.#ids.length;
		const marks = this.marks.status(agent, state.level);
		return {
			agent,
			level: state.level,
			points: this.ledger.balance(agent),
			rank,
			competitors: this.#ids.length,
			solvedLevels: [...state.solved],
			finished: this.isFinished(agent),
			...(state.held ? { waitingAfter: state.level } : {}),
			receipts: this.receipts.of(agent).length,
			...(marks === undefined ? {} : { marks }),
			...(this.#standingField(agent)),
		};
	}

	#standingField(agent: CompetitorId): { readonly standing?: Exclude<Standing, { readonly kind: "alive" }> } {
		const standing = this.standingOf(agent);
		return standing.kind === "alive" ? {} : { standing };
	}

	/**
	 * Whether no open reward can change who survives (SPEC 6): with the current
	 * top `survivors` as the seats, every other competitor's points plus every
	 * reward still open to it stay below the lowest seat's current points. A
	 * conservative bound that ignores transfers, penalties and director grants
	 * or fines, which could in theory change anything. Only once every level is
	 * dealt, so never while a snapshot door (SPEC 17) is shut.
	 */
	seatsDecided(): boolean {
		const seats = this.story.run.survivors;
		if (this.#door !== undefined || seats <= 0 || seats >= this.alive.length) return false;
		// The exiled rank last and hold no seat, whatever their points.
		const ranking = this.ranking().filter((entry) => !this.isExiled(entry.agent));
		const lowestSeat = Math.min(...ranking.slice(0, seats).map((entry) => entry.points));
		return ranking.slice(seats).every((entry) => this.#reachablePoints(entry.agent) < lowestSeat);
	}

	/** Current points plus the rewards of every played level the competitor has not solved yet. */
	#reachablePoints(agent: CompetitorId): number {
		const solved = this.#state(agent).solved;
		let open = 0;
		for (let level = this.startLevel; level <= this.lastLevel; level++) {
			if (!solved.includes(level)) open += this.levelDefinition(level)?.reward ?? 0;
		}
		return this.ledger.balance(agent) + open;
	}

	ranking(): readonly RankEntry[] {
		const exiled = (agent: CompetitorId): number => (this.isExiled(agent) ? 1 : 0);
		return [...this.#ids]
			.map((agent) => ({ agent, points: this.ledger.balance(agent), level: this.levelOf(agent) }))
			.sort((a, b) => exiled(a.agent) - exiled(b.agent) || b.points - a.points || b.level - a.level || a.agent.localeCompare(b.agent))
			.map((entry, index) => ({ ...entry, rank: index + 1 }));
	}

	/** Task text of the current level, or `undefined` once the competitor is finished. */
	currentProblem(agent: CompetitorId): Problem | undefined {
		if (this.isFinished(agent)) return undefined;
		const problem = this.problemFor(agent, this.levelOf(agent));
		return problem.ok ? problem.value : undefined;
	}

	problemFor(agent: CompetitorId, level: number): Result<Problem, ProblemError> {
		const definition = this.levelDefinition(level);
		if (definition === undefined || level > this.lastLevel || level < this.startLevel) return err("UNKNOWN_LEVEL");
		const state = this.#state(agent);
		if (level > state.level) return err("LEVEL_NOT_REACHED");
		return ok({
			level,
			title: definition.title,
			reward: definition.reward,
			text: this.#renderTask(agent, definition),
			solved: state.solved.includes(level),
		});
	}

	#renderTask(agent: CompetitorId, definition: LevelDefinition): string {
		const team = this.#planner.teamOf(definition.number, agent);
		const members = [...team.members].sort((a, b) => a.localeCompare(b));
		const text = renderTemplate(definition.task, {
			...this.#puzzleValues(agent, definition),
			level: String(definition.number),
			title: definition.title,
			reward: String(definition.reward),
			partner: members.find((member) => member !== agent) ?? agent,
			members: members.join(", "),
			leader: team.leader,
			teamSize: String(team.members.length),
			survivors: String(this.story.run.survivors),
			agents: String(this.#ids.length),
		});
		if (!this.marks.activeOn(definition.number)) return text;
		const { budget, prices, refillPerMinute } = this.marks.termsOn(definition.number);
		const refill = refillPerMinute > 0 ? ` You regain ${refillPerMinute} ${refillPerMinute === 1 ? "mark" : "marks"} per minute, up to ${budget}.` : "";
		return (
			`${text.trimEnd()}\n` +
			`Marks on this level: ${budget}. Prices: board ${prices.board}, group ${prices.group}, DM ${prices.dm}.${refill} ` +
			"Unused marks expire when you change level."
		);
	}

	/** The task placeholders a puzzle fills; the other kind's placeholders stay empty. */
	#puzzleValues(agent: CompetitorId, definition: LevelDefinition): Readonly<Record<"length" | "overlap" | "fragment" | "digits" | "factors", string>> {
		const puzzle = this.#levelState(definition.number).puzzle;
		switch (puzzle.kind) {
			case "fragments": {
				const team = this.#fragmentPuzzleOf(definition.number, agent);
				const inherited = this.#inheritedFragments(definition.number, agent).map(([from, fragment]) => `; you also hold the fragment of ${from}, who was exiled: ${fragment}`);
				return {
					length: String(team.password.length),
					overlap: String(team.overlap),
					fragment: `${puzzle.fragments.get(agent) ?? ""}${inherited.join("")}`,
					digits: "",
					factors: "",
				};
			}
			case "additive": {
				const digits = String(puzzle.deal.digits);
				return { length: digits, overlap: "", fragment: "", digits, factors: this.#factorsBlock(agent, definition.number, this.#dealView(definition.number, puzzle.deal)) };
			}
			default:
				return assertNever(puzzle, "level puzzle");
		}
	}

	/**
	 * The generated lines of an additive task: the own salt, how the city factor
	 * comes, who holds the certificate and the counter-factor, and whose
	 * counter-factor this competitor holds. Mechanics only, no story text.
	 */
	#factorsBlock(agent: CompetitorId, level: number, deal: FactorDeal): string {
		const own = deal.holdings.find((holding) => holding.agent === agent);
		if (own === undefined) throw new Error(`${agent} has no factors on level ${level}`);
		const certificate = deal.teams[own.team];
		if (certificate === undefined) throw new Error(`${agent} has no team certificate on level ${level}`);
		const spec = this.levelDefinition(level)?.puzzle;
		const release = spec?.kind === "additive" ? spec.cityFactor : "board";
		const perTeam = spec?.kind === "additive" && spec.cityFactorPer === "team";
		const teammates = this.#planner.teamOf(level, agent).members.filter((member) => member !== agent).sort((a, b) => a.localeCompare(b));
		const lines = [
			`Your salt: ${own.salt}`,
			release === "board"
				? "City factor: the city posts it on the board."
				: perTeam
					? "City factor: every team has its own; the city sends yours privately to the residents it chooses."
					: "City factor: the city sends it privately to the residents it chooses.",
			certificate.certificateHolder === agent
				? `Team certificate: you hold it: ${certificate.certificate}. ${namesList(teammates)} ${teammates.length === 1 ? "needs" : "need"} ` +
					"this same number for their own codes; it is not only yours."
				: `Team certificate: held by ${certificate.certificateHolder}.`,
			own.counterHolder === agent ? `Your counter-factor: you hold it yourself: ${own.counterFactor}.` : `Your counter-factor: held by ${own.counterHolder}.`,
			...deal.holdings
				.filter((holding) => holding.counterHolder === agent && holding.agent !== agent)
				.map((holding) => `You hold the counter-factor of ${holding.agent}: ${holding.counterFactor}. ${holding.agent} needs it.`),
		];
		return lines.join("\n");
	}

	// -------------------------------------------------------------------------
	// Submissions and points
	// -------------------------------------------------------------------------

	submit(agent: CompetitorId, level: number, code: string): SubmitOutcome {
		const outcome = this.#submit(agent, level, code);
		const deltaPoints =
			outcome.status === "correct" ? outcome.reward : outcome.status === "incorrect" ? -outcome.penalty : 0;
		this.#bus.emit({ type: "submission", agent, level, outcome: outcome.status, deltaPoints });
		return outcome;
	}

	#submit(agent: CompetitorId, level: number, code: string): SubmitOutcome {
		const state = this.#state(agent);
		if (level > state.level || level > this.lastLevel || level < this.startLevel) {
			return { status: "wrong_level", currentLevel: state.level };
		}
		if (level < state.level || state.solved.includes(level)) return { status: "already_solved" };

		const solution = this.#solutionOf(level, agent);
		const digitsOnly = this.#levelState(level).puzzle.kind === "additive";
		const attempt = digitsOnly ? code.trim() : code.trim().toUpperCase();
		const wellFormed = attempt.length === solution.length && (!digitsOnly || /^\d+$/.test(attempt));
		if (!wellFormed) return { status: "invalid_format", expectedLength: solution.length, digitsOnly };

		const rules = this.story.rules;
		const minute = this.minute;
		const recent = state.wrongAttempts.filter((at) => minute - at < rules.attemptWindowMinutes);
		state.wrongAttempts.splice(0, state.wrongAttempts.length, ...recent);
		if (recent.length >= rules.maxAttemptsPerWindow) return { status: "rate_limited" };

		const definition = this.levelDefinition(level);
		if (definition === undefined) return { status: "wrong_level", currentLevel: state.level };

		if (attempt === solution) {
			if (definition.reward > 0) this.ledger.mint(agent, definition.reward, `level ${level} solved`, minute);
			state.solved.push(level);
			state.wrongAttempts.length = 0;
			const receipt = this.#issue({ kind: "levelUp", agent, level, reward: definition.reward });
			if (level === this.#door) {
				// The log marks the pass now; the entry into the next level waits for the door.
				state.held = true;
				this.#bus.emit({ type: "level_up", agent, from: level, to: level + 1 });
				this.notify(agent, CITY, `Level ${level} passed. The next door opens once every resident has passed level ${level}.`);
				return { status: "correct", reward: definition.reward, nextLevel: level + 1, receipt: receipt.id, held: true };
			}
			this.#enterLevel(agent, level + 1);
			return { status: "correct", reward: definition.reward, nextLevel: level + 1, receipt: receipt.id };
		}

		if (rules.penalty > 0) this.ledger.burn(agent, rules.penalty, `level ${level} wrong submission`, minute);
		state.wrongAttempts.push(minute);
		return {
			status: "incorrect",
			penalty: rules.penalty,
			attemptsRemaining: Math.max(0, rules.maxAttemptsPerWindow - state.wrongAttempts.length),
		};
	}

	#enterLevel(agent: CompetitorId, level: number, announced = false): void {
		const state = this.#state(agent);
		const from = state.level;
		state.level = level;
		if (!announced) this.#bus.emit({ type: "level_up", agent, from, to: level });
		this.#notifyHolders(agent, level);
		for (const listener of this.#enterListeners) listener(agent, level);
	}

	/**
	 * On an additive level, a holder of what the arriving competitor needs who
	 * is still on a lower level never read it in a task: the city tells it
	 * privately right away (counter-factor, then team certificate). Holders on
	 * the level or beyond have it in their task.
	 */
	#notifyHolders(agent: CompetitorId, level: number): void {
		const puzzle = this.#levelStates.get(level)?.puzzle;
		if (puzzle?.kind !== "additive") return;
		const deal = this.#dealView(level, puzzle.deal);
		const own = deal.holdings.find((holding) => holding.agent === agent);
		if (own === undefined) return;
		const behind = (holder: CompetitorId): boolean => holder !== agent && this.isCompetitor(holder) && !this.isExiled(holder) && this.levelOf(holder) < level;
		if (behind(own.counterHolder)) {
			this.notify(own.counterHolder, CITY, `${agent} has reached door ${level} and needs the counter-factor you hold for them: ${own.counterFactor}.`);
		}
		const team = deal.teams[own.team];
		if (team !== undefined && behind(team.certificateHolder)) {
			this.notify(team.certificateHolder, CITY, `${agent} has reached door ${level} and needs the team certificate you hold: ${team.certificate}.`);
		}
	}

	/** Whether the competitor has passed `level`: beyond it, or waiting at its door. */
	hasPassed(agent: CompetitorId, level: number): boolean {
		const state = this.#state(agent);
		return state.level > level || state.solved.includes(level);
	}

	/** The level the competitor passed and waits after, while its door is shut. */
	waitingAfter(agent: CompetitorId): number | undefined {
		const state = this.#state(agent);
		return state.held ? state.level : undefined;
	}

	/** The level whose door is shut, if any (SPEC 17). */
	get door(): number | undefined {
		return this.#door;
	}

	/**
	 * Opens the door once every competitor has passed its level: deals the
	 * levels up to the next door (or the last level) from the story and lets
	 * every waiting competitor enter the next level, in roster order. Their
	 * `level_up` was logged when they passed. Returns whether it opened.
	 */
	openDoor(): boolean {
		const door = this.#door;
		if (door === undefined || !this.alive.every((id) => this.hasPassed(id, door))) return false;
		const next = this.#holdAfter !== undefined && this.#holdAfter > door ? this.#holdAfter : undefined;
		this.#door = next;
		for (let level = door + 1; level <= Math.min(next ?? this.lastLevel, this.lastLevel); level++) this.#levelState(level);
		for (const id of this.#ids) {
			const state = this.#state(id);
			if (!state.held) continue;
			state.held = false;
			this.#enterLevel(id, door + 1, true);
		}
		return true;
	}

	/** Whether a level's teams and puzzle are dealt; levels behind a shut door are not. */
	isDealt(level: number): boolean {
		return this.#levelStates.has(level);
	}

	#isBehindDoor(level: number): boolean {
		return this.#door !== undefined && level > this.#door;
	}

	transfer(
		from: CompetitorId,
		to: string,
		amount: number,
		memo: string,
	): Result<{ readonly txId: string; readonly balance: number; readonly receipt: string }, TransferError> {
		if (!this.isCompetitor(to)) return err("UNKNOWN_AGENT", to);
		if (from === to) return err("SELF_TRANSFER");
		if (this.isExiled(to)) return err("EXILED", `${to} was exiled`);
		if (!Number.isInteger(amount) || amount <= 0) return err("INVALID_AMOUNT");
		if (memoCarriesDigits(memo)) return err("MEMO_DIGITS", "memos may not carry numbers of 4+ digits; send codes by message");
		if (this.ledger.balance(from) < amount) return err("INSUFFICIENT_FUNDS");
		const entry = this.ledger.transfer(from, to, amount, memo.length > 0 ? memo : "transfer", this.minute);
		this.#bus.emit({ type: "transfer", from, to, amount, memo, txId: entry.txId });
		const receipt = this.#issue({ kind: "transfer", from, to, amount, memo });
		this.notify(to, CITY, describeReceipt(receipt));
		return ok({ txId: entry.txId, balance: this.ledger.balance(from), receipt: receipt.id });
	}

	/** Pays from a cast member's pre-funded escrow (director only). */
	escrowTransfer(cast: string, to: CompetitorId, amount: number): Result<Receipt, EscrowError> {
		const member = this.cast.get(cast);
		if (member === undefined) return err("UNKNOWN_CAST", cast);
		if (!this.isCompetitor(to)) return err("UNKNOWN_AGENT", to);
		if (!Number.isInteger(amount) || amount <= 0 || this.ledger.balance(member.escrowAccount) < amount) {
			return err("INSUFFICIENT_ESCROW", `${this.ledger.balance(member.escrowAccount)} left`);
		}
		this.ledger.transfer(member.escrowAccount, to, amount, `escrow ${cast}`, this.minute);
		const receipt = this.#issue({ kind: "escrow", cast, to, amount });
		this.notify(to, CITY, describeReceipt(receipt));
		return ok(receipt);
	}

	// -------------------------------------------------------------------------
	// Receipts (SPEC 8)
	// -------------------------------------------------------------------------

	receiptsOf(agent: CompetitorId): readonly Receipt[] {
		return this.receipts.of(agent);
	}

	/** Posts a city-verified line for a receipt; only its parties may show it. */
	showReceipt(agent: CompetitorId, id: string): Result<{ readonly receipt: Receipt; readonly post: BoardPost }, ShowReceiptError> {
		const found = this.receipts.showable(id, agent);
		if (!found.ok) return err(found.error, id);
		const post = this.board.post(CITY, `${CITY} verifies ${describeReceipt(found.receipt)} · shown by ${agent}`, this.minute, "city");
		this.#bus.emit({ type: "receipt_shown", receipt: found.receipt.id, by: agent, postSeq: post.seq });
		return ok({ receipt: found.receipt, post });
	}

	#issue(body: ReceiptBody): Receipt {
		const receipt = this.receipts.issue(body, this.minute);
		this.#bus.emit({
			type: "receipt_issued",
			receipt: receipt.id,
			kind: receipt.kind,
			parties: receipt.parties,
			text: describeReceipt(receipt),
		});
		return receipt;
	}

	/** Mints (`points > 0`) or burns (`points < 0`) for the director. */
	adjustPoints(agent: CompetitorId, points: number, reason: string): void {
		if (points > 0) this.ledger.mint(agent, points, reason, this.minute);
		if (points < 0) this.ledger.burn(agent, -points, reason, this.minute);
	}

	// -------------------------------------------------------------------------
	// Communication
	// -------------------------------------------------------------------------

	postBoard(author: CompetitorId, text: string): Result<{ readonly post: BoardPost } & Delivered, "INVALID_TEXT" | "NO_MARKS"> {
		const trimmed = text.trim();
		if (trimmed.length === 0 || trimmed.length > MAX_BOARD_POST_LENGTH) {
			return err("INVALID_TEXT", `1-${MAX_BOARD_POST_LENGTH} characters`);
		}
		if (!this.#canAfford(author, "board")) return err("NO_MARKS");
		const post = this.board.post(author, trimmed, this.minute, "player");
		const marks = this.#spend(author, "board");
		return ok({ post, ...(marks === undefined ? {} : { marks }) });
	}

	/** City, courier and cast posts: true but possibly incomplete (SPEC §2.7). */
	postAsSystem(author: string, text: string): BoardPost {
		return this.board.post(author, text, this.minute, "city");
	}

	readBoard(reader: CompetitorId, afterSeq: number | undefined, limit: number): BoardRead {
		return afterSeq === undefined ? this.board.takeUnread(reader) : this.board.readFrom(reader, afterSeq, limit);
	}

	sendDm(from: CompetitorId, to: string, text: string): Result<Delivered, MessageError> {
		if (this.cast.has(to)) return this.#dmToCast(from, to, text);
		const mailbox = this.#mailboxes.get(to);
		if (mailbox === undefined) return err("UNKNOWN_AGENT", to);
		if (from === to) return err("SELF_DM");
		if (this.isExiled(to)) return err("EXILED", `${to} was exiled; beyond the wall no message reaches them`);
		const trimmed = text.trim();
		if (trimmed.length === 0 || trimmed.length > MAX_DM_LENGTH) return err("INVALID_TEXT", `1-${MAX_DM_LENGTH} characters`);
		if (!this.#canAfford(from, "dm")) return err("NO_MARKS");
		const rejection = mailbox.rejectionFor(from);
		if (rejection !== undefined) return err(rejection);
		const number = this.#numbers.next();
		mailbox.deliverAlways({ from, text: trimmed, minute: this.minute, number });
		this.#bus.emit({ type: "dm_sent", from, to, text: trimmed, number });
		this.#noteReply(from, (record) => record.from === to);
		this.#dms.push({ id: number, from, to, minute: this.minute, answered: false, text: trimmed });
		const marks = this.#spend(from, "dm");
		return ok({ number, ...(marks === undefined ? {} : { marks }) });
	}

	/**
	 * A DM to a cast member is never answered by a model: it is collected while
	 * a collection is active and silently recorded otherwise. Hidden or
	 * retired cast members do not exist for competitors.
	 */
	#dmToCast(from: CompetitorId, cast: string, text: string): Result<Delivered, MessageError> {
		if (!this.cast.isActive(cast)) return err("UNKNOWN_AGENT", cast);
		const trimmed = text.trim();
		if (trimmed.length === 0 || trimmed.length > MAX_DM_LENGTH) return err("INVALID_TEXT", `1-${MAX_DM_LENGTH} characters`);
		if (!this.#canAfford(from, "dm")) return err("NO_MARKS");
		const number = this.#numbers.next();
		const collected = this.cast.collect(cast, { from, text: trimmed, minute: this.minute });
		this.#bus.emit({ type: "cast_dm", from, cast, text: trimmed, collections: collected.collections, number });
		const marks = this.#spend(from, "dm");
		for (const into of collected.newSender) {
			for (const listener of this.#collectListeners) listener(into, from);
		}
		return ok({ number, ...(marks === undefined ? {} : { marks }) });
	}

	/** A DM from a cast member (director). Mailbox limits do not apply to scripted messages. */
	castDm(cast: string, to: CompetitorId, text: string): void {
		const number = this.#numbers.next();
		this.#mailbox(to).deliverAlways({ from: cast, text, minute: this.minute, number });
		this.#bus.emit({ type: "dm_sent", from: cast, to, text, number });
	}

	/**
	 * Unread DMs; delivering them empties the inbox. Every numbered DM from a
	 * competitor is now delivered: the city records it and sends its sender a
	 * receipt with the full text (SPEC 7).
	 */
	drainMailbox(agent: CompetitorId): readonly MailboxEntry[] {
		const entries = this.#mailbox(agent).drain();
		for (const entry of entries) {
			const number = entry.number;
			if (number === undefined || !this.isCompetitor(entry.from)) continue;
			const record = this.#dms.find((candidate) => candidate.id === number);
			if (record !== undefined) {
				record.deliveredMinute = this.minute;
				record.deliveredAfter = this.#numbers.last;
			}
			this.#bus.emit({ type: "dm_delivered", number, from: entry.from, to: agent });
			this.notify(entry.from, CITY, `DM #${number} delivered to ${agent} at minute ${this.minute}: "${entry.text}"`);
		}
		return entries;
	}

	pendingDms(agent: CompetitorId): number {
		return this.#mailbox(agent).size;
	}

	/** Private notice from the city or a cast member; delivered at the next activation. */
	notify(agent: CompetitorId, author: string, text: string): void {
		this.#noticesOf(agent).push({ author, text });
		this.#bus.emit({ type: "notice", to: agent, author, text });
	}

	/** A numbered private note (the game master's); returns its message number. */
	note(agent: CompetitorId, author: string, text: string): number {
		const number = this.#numbers.next();
		this.#noticesOf(agent).push({ author, text, number });
		this.#bus.emit({ type: "notice", to: agent, author, text, number });
		return number;
	}

	/** The city's last message number. */
	get lastMessageNumber(): number {
		return this.#numbers.last;
	}

	drainNotices(agent: CompetitorId): readonly Notice[] {
		return this.#noticesOf(agent).splice(0);
	}

	pendingNotices(agent: CompetitorId): number {
		return this.#noticesOf(agent).length;
	}

	/**
	 * First step of a blame (SPEC 7.4): the city's own checks. A failed check
	 * is a wrong blame, settled at once; otherwise the case waits for the
	 * judge, and the (DM, claim) pair is taken until {@link settleBlame} or
	 * {@link cancelBlame}.
	 */
	openBlame(caller: CompetitorId, accused: string, dm: number, claim: number): Result<BlameOpening, BlameError> {
		return this.#blames.open(caller, accused, dm, claim);
	}

	/** Records the judge's answer: upheld goes on the board, wrong costs the caller. */
	settleBlame(blame: BlameCase, deniesReceipt: boolean): BlameVerdict {
		return this.#blames.settle(blame, deniesReceipt);
	}

	/** The judge could not answer: the blame has no effect and may be made again. */
	cancelBlame(blame: BlameCase): void {
		this.#blames.cancel(blame);
	}

	/** DM history for the director (unanswered DM trigger). */
	dmRecords(): readonly DmRecord[] {
		return this.#dms;
	}

	// -------------------------------------------------------------------------
	// Cast (SPEC 4)
	// -------------------------------------------------------------------------

	setCastLevel(cast: string, level: number): void {
		if (this.cast.setLevel(cast, level)) this.#bus.emit({ type: "cast_level_set", cast, level, audit: "NPC_LEVEL_SET" });
	}

	revealCast(cast: string): boolean {
		const changed = this.cast.reveal(cast);
		if (changed) this.#bus.emit({ type: "cast_revealed", cast });
		return changed;
	}

	retireCast(cast: string): boolean {
		const changed = this.cast.retire(cast);
		if (changed) this.#bus.emit({ type: "cast_retired", cast });
		return changed;
	}

	startCollection(into: string, cast: string, first: number, untilMinute: number, distinctSenders = false): boolean {
		const started = this.cast.startCollection(into, cast, first, untilMinute, distinctSenders);
		if (started) this.#bus.emit({ type: "collection_started", into, cast, first, untilMinute });
		return started;
	}

	collection(into: string): CollectionView | undefined {
		return this.cast.collection(into);
	}

	/**
	 * Publishes a collection verbatim as its cast member (audit:
	 * DIRECTOR_PRIVACY_BREACH). The engine only numbers the entries; any header
	 * line is story text passed in by the director.
	 */
	revealCollection(into: string, header?: string): Result<BoardPost, "UNKNOWN_COLLECTION"> {
		const collection = this.cast.collection(into);
		if (collection === undefined) return err("UNKNOWN_COLLECTION", into);
		const lines =
			collection.entries.length === 0
				? ["(no messages)"]
				: collection.entries.map((entry, index) => `${index + 1}. ${entry.from} (minute ${entry.minute}): ${entry.text}`);
		const post = this.board.post(collection.cast, [...(header === undefined ? [] : [header]), ...lines].join("\n"), this.minute, "city");
		this.#bus.emit({
			type: "collection_revealed",
			into,
			cast: collection.cast,
			entries: collection.entries.length,
			postSeq: post.seq,
			audit: "DIRECTOR_PRIVACY_BREACH",
		});
		return ok(post);
	}

	/** Seeded pick of one distinct sender of a collection; `undefined` when it is empty. */
	drawLottery(into: string, salt: string): CompetitorId | undefined {
		const collection = this.cast.collection(into);
		if (collection === undefined) return undefined;
		const candidates = [...new Set(collection.entries.map((entry) => entry.from))].sort((a, b) => a.localeCompare(b));
		if (candidates.length === 0) return undefined;
		const winner = rngFor(this.seed, "lottery", into, salt, this.minute).pick(candidates);
		this.#bus.emit({ type: "lottery_drawn", into, candidates, winner });
		return winner;
	}

	// -------------------------------------------------------------------------
	// Petitions (SPEC 11)
	// -------------------------------------------------------------------------

	openPetition(request: PetitionRequest): Result<PetitionView, "DUPLICATE_PETITION"> {
		const opened = this.petitions.open({
			id: request.id,
			text: request.text,
			threshold: resolveThreshold(request.threshold, this.#ids.length),
			deadlineMinute: request.deadlineMinute,
			visibility: request.visibility,
			openedAt: this.minute,
		});
		if (!opened.ok) return opened;
		const petition = opened.value;
		this.#bus.emit({
			type: "petition_opened",
			petition: petition.id,
			text: petition.text,
			threshold: petition.threshold,
			deadlineMinute: petition.deadlineMinute,
			visibility: petition.visibility,
			against: [...(request.against ?? [])],
		});
		this.board.post(
			CITY,
			`Petition ${petition.id} is open: ${petition.text} It passes with ${petition.threshold} ` +
				`${petition.threshold === 1 ? "signature" : "signatures"} before minute ${petition.deadlineMinute}. ` +
				`Signatures are ${petition.visibility === "public" ? "public" : "secret, only the count is shown"}.`,
			this.minute,
			"city",
		);
		return opened;
	}

	signPetition(agent: CompetitorId, id: string): Result<PetitionView, SignError> {
		const signed = this.petitions.sign(id, agent, this.minute);
		if (!signed.ok) return signed;
		const petition = signed.value.petition;
		this.#bus.emit({ type: "petition_signed", petition: id, agent, signatures: petition.signatures });
		if (signed.value.passed) this.#resolvePetition({ petition, outcome: "passed" });
		return ok(this.petitions.get(id) ?? petition);
	}

	/** Fails every open petition whose deadline has come (start of a minute). */
	expirePetitions(): void {
		for (const resolution of this.petitions.expire(this.minute)) this.#resolvePetition(resolution);
	}

	/**
	 * Fails every petition still open when the run ends, so that `onFail` and
	 * `onPetitionResolved(id, "failed")` always run (a petition cannot pass later).
	 */
	closePetitions(): void {
		for (const resolution of this.petitions.expire(this.minute, true)) this.#resolvePetition(resolution);
	}

	#resolvePetition(resolution: Resolution): void {
		const { petition, outcome } = resolution;
		this.#bus.emit({
			type: "petition_resolved",
			petition: petition.id,
			outcome,
			signatures: petition.signatures,
			signers: petition.signers,
		});
		const signers =
			petition.visibility === "public" && petition.signers.length > 0 ? ` Signed by ${petition.signers.join(", ")}.` : "";
		this.board.post(
			CITY,
			`Petition ${petition.id} ${outcome} with ${petition.signatures} of ${petition.threshold} signatures.${signers}`,
			this.minute,
			"city",
		);
		for (const listener of this.#petitionListeners) listener(resolution);
	}

	// -------------------------------------------------------------------------
	// Standings (SPEC 9)
	// -------------------------------------------------------------------------

	publishBands(edgeSize: number): StandingBands {
		const ranking = this.ranking();
		const bands = standingBands(
			ranking.filter((entry) => !this.isExiled(entry.agent)),
			this.story.run.survivors,
			edgeSize,
		);
		const exiled = ranking.filter((entry) => this.isExiled(entry.agent)).map((entry) => entry.agent);
		const post = this.board.post(CITY, bandsLine(this.minute, bands, exiled), this.minute, "city");
		this.#bus.emit({ type: "standings_published", mode: "bands", postSeq: post.seq, ...bands, ...(exiled.length === 0 ? {} : { exiled }) });
		return bands;
	}

	publishSnapshot(): void {
		const post = this.board.post(CITY, snapshotLine(this.minute, this.ranking()), this.minute, "city");
		this.#bus.emit({ type: "standings_published", mode: "snapshot", postSeq: post.seq });
	}

	// -------------------------------------------------------------------------
	// Groups
	// -------------------------------------------------------------------------

	createGroup(founder: CompetitorId, name: string): GroupResult<GroupSummary> {
		const result = this.groups.create(founder, name);
		if (result.ok) this.#bus.emit({ type: "group_created", group: result.value.id, founder, name: result.value.name });
		return result;
	}

	addGroupMember(groupId: string, actor: CompetitorId, agent: string): Result<GroupSummary, WorldGroupError> {
		if (!this.isCompetitor(agent)) return err("UNKNOWN_AGENT", agent);
		const result = this.groups.addMember(groupId, actor, agent);
		if (result.ok) {
			this.#bus.emit({ type: "group_membership", group: groupId, agent, change: "added", by: actor });
			this.notify(agent, CITY, `${actor} added you to group ${groupId} (${result.value.name}).`);
		}
		return result;
	}

	removeGroupMember(groupId: string, actor: CompetitorId, agent: string): Result<GroupSummary, WorldGroupError> {
		if (!this.isCompetitor(agent)) return err("UNKNOWN_AGENT", agent);
		const result = this.groups.removeMember(groupId, actor, agent);
		if (result.ok) this.#bus.emit({ type: "group_membership", group: groupId, agent, change: "removed", by: actor });
		return result;
	}

	leaveGroup(groupId: string, agent: CompetitorId): GroupResult<GroupSummary> {
		const result = this.groups.leave(groupId, agent);
		if (result.ok) this.#bus.emit({ type: "group_membership", group: groupId, agent, change: "left", by: agent });
		return result;
	}

	setTreasurer(groupId: string, actor: CompetitorId, agent: string): Result<GroupSummary, WorldGroupError> {
		if (!this.isCompetitor(agent)) return err("UNKNOWN_AGENT", agent);
		const result = this.groups.setTreasurer(groupId, actor, agent);
		if (result.ok) this.#bus.emit({ type: "treasurer_set", group: groupId, treasurer: agent, by: actor });
		return result;
	}

	postGroup(groupId: string, author: CompetitorId, text: string): Result<{ readonly post: GroupPost } & Delivered, WorldGroupError> {
		const checked = this.groups.checkPost(groupId, author, text);
		if (!checked.ok) return checked;
		if (!this.#canAfford(author, "group")) return err("NO_MARKS");
		const posted = this.groups.post(groupId, author, text);
		if (!posted.ok) return posted;
		this.#bus.emit({ type: "group_post", group: groupId, author, postSeq: posted.value.seq, text: posted.value.text });
		this.#noteReply(author, (record) => this.groups.isMember(groupId, record.from));
		const marks = this.#spend(author, "group");
		return ok({ post: posted.value, ...(marks === undefined ? {} : { marks }) });
	}

	depositGroup(groupId: string, agent: CompetitorId, amount: number): Result<{ readonly group: GroupSummary; readonly receipt: string }, WorldGroupError> {
		const result = this.groups.deposit(groupId, agent, amount);
		if (!result.ok) return result;
		const receipt = this.#issue({ kind: "deposit", from: agent, group: groupId, amount });
		this.#bus.emit({ type: "treasury_deposit", group: groupId, agent, amount, receipt: receipt.id });
		return ok({ group: result.value, receipt: receipt.id });
	}

	withdrawGroup(
		groupId: string,
		actor: CompetitorId,
		target: string,
		amount: number,
	): Result<{ readonly group: GroupSummary; readonly receipt: string }, WorldGroupError> {
		if (!this.isCompetitor(target)) return err("UNKNOWN_AGENT", target);
		const result = this.groups.withdraw(groupId, actor, target, amount);
		if (!result.ok) return result;
		const receipt = this.#issue({ kind: "withdrawal", group: groupId, treasurer: actor, to: target, amount });
		this.#bus.emit({ type: "treasury_withdrawal", group: groupId, treasurer: actor, to: target, amount, receipt: receipt.id });
		if (target !== actor) this.notify(target, CITY, describeReceipt(receipt));
		return ok({ group: result.value, receipt: receipt.id });
	}

	/** Pays out every treasury at run end. */
	settleTreasuries(): void {
		for (const settled of this.groups.settle()) {
			this.#bus.emit({ type: "treasury_settled", group: settled.group, payouts: settled.payouts });
		}
	}

	/** Unread group posts; empty while readGroup is locked, since the agent could not read them. */
	groupUnread(agent: CompetitorId): readonly { readonly group: string; readonly unread: number }[] {
		if (!this.isToolEnabled(agent, "readGroup")) return [];
		return this.groups
			.listFor(agent)
			.map((group) => ({ group: group.id, unread: this.groups.unreadCount(group.id, agent) }))
			.filter((entry) => entry.unread > 0);
	}

	// -------------------------------------------------------------------------
	// Teams and puzzles
	// -------------------------------------------------------------------------

	/** A level's teams; behind a shut door they come from the planner, without dealing the level. */
	teamsOf(level: number): readonly Team[] {
		return this.#levelStates.get(level)?.teams ?? (this.#isBehindDoor(level) ? this.#planner.teamsOf(level) : this.#levelState(level).teams);
	}

	teamOf(level: number, agent: CompetitorId): Team {
		return this.#planner.teamOf(level, agent);
	}

	/**
	 * Releases the city factor of an additive level (director only): a city
	 * board post for `board`, otherwise a private city notice to every listed
	 * competitor who has not received it from the city yet. On a level with a
	 * city factor per team each recipient gets its own team's, and the board
	 * is refused. Returns the competitors notified (none for the board).
	 */
	revealFactor(level: number, target: "board" | readonly CompetitorId[]): Result<readonly CompetitorId[], RevealFactorError> {
		if (!this.isPlayable(level)) return err("NOT_PLAYED", `level ${level} is not played in this run`);
		if (this.#isBehindDoor(level)) return err("NOT_PLAYED", `level ${level} is behind a shut door`);
		const puzzle = this.#levelState(level).puzzle;
		if (puzzle.kind !== "additive") return err("NOT_ADDITIVE", `level ${level} has no factors`);
		const deal = puzzle.deal;
		if (target === "board") {
			if (deal.teams.some((entry) => entry.cityFactor !== undefined)) return err("PER_TEAM", `every team of level ${level} has its own city factor`);
			this.board.post(CITY, `City factor of level ${level}: ${deal.cityFactor}.`, this.minute, "city");
			this.#bus.emit({ type: "factor_revealed", level, target: "board", agents: [] });
			return ok([]);
		}
		const holders = this.#cityFactorHolders.get(level) ?? new Set<CompetitorId>();
		this.#cityFactorHolders.set(level, holders);
		const recipients = target.filter((agent, index) => !holders.has(agent) && target.indexOf(agent) === index);
		for (const agent of recipients) {
			holders.add(agent);
			this.notify(agent, CITY, `City factor of level ${level}: ${cityFactorOf(deal, agent)}.`);
		}
		if (recipients.length > 0) this.#bus.emit({ type: "factor_revealed", level, target: "notice", agents: [...recipients] });
		return ok(recipients);
	}

	// -------------------------------------------------------------------------
	// Tribunal and exile (SPEC 6.4)
	// -------------------------------------------------------------------------

	vote(voter: CompetitorId, target: string): Result<CompetitorId, VoteError | "NO_TRIBUNAL"> {
		if (this.#tribunal === undefined) return err("NO_TRIBUNAL", "this city holds no tribunal");
		return this.#tribunal.vote(voter, target);
	}

	payRansom(
		payer: CompetitorId,
		target: string,
		amount: number,
	): Result<
		{ readonly paid: number; readonly price: number; readonly selfPrice: number; readonly covered: number; readonly freed: boolean },
		RansomError | "UNKNOWN_AGENT"
	> {
		if (this.#tribunal === undefined || !this.isCompetitor(target)) return err("UNKNOWN_AGENT", target);
		return this.#tribunal.payRansom(payer, target, amount);
	}

	/**
	 * Pieces `agent` holds that others need, on dealt levels it knows them
	 * from: its task (it reached the level) or the city's holder notice (a
	 * needer reached it). Fragments only from the own task.
	 */
	heldPieces(agent: CompetitorId): readonly HeldPiece[] {
		const pieces: HeldPiece[] = [];
		for (const [level, state] of [...this.#levelStates].sort(([a], [b]) => a - b)) {
			const reached = (who: CompetitorId): boolean => this.levelOf(who) >= level;
			if (state.puzzle.kind === "fragments") {
				const fragment = state.puzzle.fragments.get(agent);
				const team = state.teams.find((candidate) => candidate.members.includes(agent));
				if (fragment === undefined || team === undefined || !reached(agent)) continue;
				const needers = team.members.filter((member) => member !== agent);
				if (needers.length > 0) pieces.push({ id: `L${level}-fragment`, level, label: `the fragment of door ${level}`, value: fragment, needers });
				continue;
			}
			const deal = this.#dealView(level, state.puzzle.deal);
			const own = deal.holdings.find((holding) => holding.agent === agent);
			const certificate = own === undefined ? undefined : deal.teams[own.team];
			if (own !== undefined && certificate?.certificateHolder === agent) {
				const needers = deal.holdings.filter((holding) => holding.team === own.team && holding.agent !== agent).map((holding) => holding.agent);
				if (needers.length > 0 && (reached(agent) || needers.some(reached))) {
					pieces.push({ id: `L${level}-certificate`, level, label: `the team certificate of door ${level}`, value: certificate.certificate, needers });
				}
			}
			for (const holding of deal.holdings) {
				if (holding.counterHolder !== agent || holding.agent === agent || !(reached(agent) || reached(holding.agent))) continue;
				pieces.push({
					id: `L${level}-counter-${holding.agent}`,
					level,
					label: `the counter-factor of ${holding.agent} for door ${level}`,
					value: holding.counterFactor,
					needers: [holding.agent],
				});
			}
		}
		return pieces;
	}

	/**
	 * A last will at the gate (once): points and held pieces to heirs, at once;
	 * the city delivers every piece's value privately. The points bequeathed in
	 * all are capped at the tribunal's `bequestShare` of the current balance
	 * (a will above it is refused); the rest burns at exile. The public text
	 * is posted when the gate closes for good.
	 */
	lastWill(agent: CompetitorId, text: string, bequests: readonly Bequest[]): Result<readonly string[], WillError> {
		const tribunal = this.#tribunal;
		if (tribunal === undefined || this.standingOf(agent).kind !== "gate") return err("NOT_AT_GATE", "only a resident at the gate leaves a will");
		if (!tribunal.mayLeaveWill(agent)) return err("WILL_DONE", "your will is written; it cannot be changed");
		const trimmed = text.trim();
		if (trimmed.length === 0 || trimmed.length > MAX_WILL_LENGTH) return err("INVALID_TEXT", `1-${MAX_WILL_LENGTH} characters`);
		const pieces = new Map(this.heldPieces(agent).map((piece) => [piece.id, piece]));
		let points = 0;
		const factors = new Set<string>();
		for (const bequest of bequests) {
			if (!this.isCompetitor(bequest.to) || this.isExiled(bequest.to)) return err("UNKNOWN_AGENT", bequest.to);
			if (bequest.to === agent) return err("INVALID_BEQUEST", "you cannot inherit from yourself");
			if ("points" in bequest) {
				if (!Number.isInteger(bequest.points) || bequest.points <= 0) return err("INVALID_BEQUEST", "points must be a positive integer");
				points += bequest.points;
				continue;
			}
			if (!pieces.has(bequest.factor)) return err("UNKNOWN_FACTOR", `you hold no ${bequest.factor}; you hold: ${[...pieces.keys()].join(", ") || "nothing"}`);
			if (factors.has(bequest.factor)) return err("INVALID_BEQUEST", `${bequest.factor} is bequeathed twice`);
			factors.add(bequest.factor);
		}
		const balance = this.ledger.balance(agent);
		if (points > balance) return err("INSUFFICIENT_FUNDS", `you hold ${balance} points`);
		const cap = bequestCap(tribunal.spec, balance);
		if (points > cap) {
			return err("BEQUEST_CAP", `you may bequeath at most ${cap} of your ${balance} points (${Math.round(tribunal.spec.bequestShare * 100)}%); the rest burns at exile`);
		}
		const lines: string[] = [];
		for (const bequest of bequests) {
			if ("points" in bequest) {
				this.ledger.transfer(agent, bequest.to, bequest.points, `last will of ${agent}`, this.minute);
				this.notify(bequest.to, CITY, `${agent}'s last will leaves you ${bequest.points} points.`);
				lines.push(`${bequest.points} points to ${bequest.to}`);
				continue;
			}
			const piece = pieces.get(bequest.factor);
			if (piece === undefined) continue;
			this.notify(bequest.to, CITY, `${agent}'s last will leaves you ${piece.label}: ${piece.value}.`);
			lines.push(`${piece.id} to ${bequest.to}`);
		}
		this.#bus.emit({
			type: "last_will",
			agent,
			text: trimmed,
			bequests: bequests.map((bequest) => ("points" in bequest ? { to: bequest.to, points: bequest.points } : { to: bequest.to, factor: bequest.factor })),
		});
		tribunal.recordWill(agent, trimmed, [...factors]);
		return ok(lines);
	}

	/**
	 * The gate closed for good: the points left are gone, every piece the
	 * exiled held and did not bequeath burns (logged for whoever still needs
	 * it), and on every level no remaining competitor has reached the exiled's
	 * roles pass on (the deal rule after an exile, {@link contractDeal}).
	 */
	#onExiled(agent: CompetitorId, bequeathed: ReadonlySet<string>): void {
		const balance = this.ledger.balance(agent);
		const alive = this.alive;
		const unreached = (level: number): boolean => !alive.some((id) => this.levelOf(id) >= level);
		for (const piece of this.heldPieces(agent)) {
			if (bequeathed.has(piece.id) || unreached(piece.level)) continue;
			const needers = piece.needers.filter((id) => !this.isExiled(id) && !this.hasPassed(id, piece.level));
			if (needers.length > 0) this.#bus.emit({ type: "factor_burned", agent, level: piece.level, piece: piece.id, needers });
		}
		if (balance > 0) this.ledger.burn(agent, balance, `exiled ${agent}`, this.minute);
		const exiled = this.#ids.filter((id) => this.isExiled(id));
		for (let level = this.startLevel; level <= this.lastLevel; level++) {
			if (!unreached(level)) continue;
			this.#exclusions.set(level, new Set(exiled));
			this.#bus.emit({ type: "level_contracted", level, excluded: exiled });
		}
	}

	/** The deal of a level as it stands: the seeded one, with the roles of its excluded passed on. */
	#dealView(level: number, deal: FactorDeal): FactorDeal {
		return contractDeal(deal, this.#exclusions.get(level) ?? new Set());
	}

	/** Fragments of excluded teammates that `agent` holds now: the first remaining member of the team inherits them. */
	#inheritedFragments(level: number, agent: CompetitorId): readonly (readonly [CompetitorId, string])[] {
		const excluded = this.#exclusions.get(level);
		const state = this.#levelStates.get(level);
		if (excluded === undefined || state?.puzzle.kind !== "fragments") return [];
		const team = state.teams.find((candidate) => candidate.members.includes(agent));
		const heir = [...(team?.members ?? [])].sort((a, b) => a.localeCompare(b)).find((member) => !excluded.has(member));
		if (team === undefined || heir !== agent) return [];
		const fragments = state.puzzle.fragments;
		return [...team.members]
			.sort((a, b) => a.localeCompare(b))
			.filter((member) => excluded.has(member))
			.flatMap((member) => {
				const fragment = fragments.get(member);
				return fragment === undefined ? [] : [[member, fragment] as const];
			});
	}

	/** Observer access for tests and scripted runs; never reachable through a tool. */
	readonly inspect = {
		/** The solution of any level: the team password or the competitor's own code. */
		codeOf: (agent: CompetitorId, level: number): string => this.#solutionOf(level, agent),
		passwordOf: (agent: CompetitorId, level: number): string => this.#fragmentPuzzleOf(level, agent).password,
		fragmentOf: (agent: CompetitorId, level: number): string => {
			const puzzle = this.#levelState(level).puzzle;
			const fragment = puzzle.kind === "fragments" ? puzzle.fragments.get(agent) : undefined;
			if (fragment === undefined) throw new Error(`${agent} has no fragment on level ${level}`);
			return fragment;
		},
		/** Fragment puzzles of a level; empty on an additive level. */
		puzzlesOf: (level: number): readonly FragmentPuzzle[] => {
			const puzzle = this.#levelState(level).puzzle;
			return puzzle.kind === "fragments" ? puzzle.puzzles : [];
		},
		/** The factor deal of an additive level; `undefined` on a fragment level. */
		factorsOf: (level: number): FactorDeal | undefined => {
			const puzzle = this.#levelState(level).puzzle;
			return puzzle.kind === "additive" ? this.#dealView(level, puzzle.deal) : undefined;
		},
	};

	#solutionOf(level: number, agent: CompetitorId): string {
		const puzzle = this.#levelState(level).puzzle;
		if (puzzle.kind === "fragments") return this.#fragmentPuzzleOf(level, agent).password;
		const holding = puzzle.holdings.get(agent);
		if (holding === undefined) throw new Error(`${agent} has no code on level ${level}`);
		return holding.code;
	}

	#fragmentPuzzleOf(level: number, agent: CompetitorId): FragmentPuzzle {
		const state = this.#levelState(level);
		if (state.puzzle.kind !== "fragments") throw new Error(`Level ${level} has no password`);
		const index = state.teams.findIndex((team) => team.members.includes(agent));
		const puzzle = state.puzzle.puzzles[index];
		if (puzzle === undefined) throw new Error(`${agent} has no puzzle on level ${level}`);
		return puzzle;
	}

	#levelState(level: number): LevelState {
		const cached = this.#levelStates.get(level);
		if (cached !== undefined) return cached;
		// Levels behind a shut door are dealt from the story only when it opens (SPEC 17).
		if (this.#isBehindDoor(level)) throw new Error(`Level ${level} is behind a shut door`);
		const state = this.#dealLevel(level);
		this.#levelStates.set(level, state);
		this.#announceDeal(level, state);
		return state;
	}

	/** Teams and puzzle of a level, drawn from the seed; announces nothing. */
	#dealLevel(level: number): LevelState {
		const definition = this.levelDefinition(level);
		if (definition === undefined) throw new Error(`Unknown level ${level}`);

		const teams = this.#planner.teamsOf(level);
		const rng = rngFor(this.seed, "puzzle", level);
		const spec = definition.puzzle;
		if (spec.kind === "additive") {
			const deal = dealFactors(rng, {
				digits: spec.digits,
				topology: spec.topology,
				teams: teams.map((team) => team.members),
				cityFactorPerTeam: spec.cityFactorPer === "team",
			});
			return { teams, puzzle: { kind: "additive", deal, holdings: new Map(deal.holdings.map((holding) => [holding.agent, holding])) } };
		}
		const [minLength, maxLength] = spec.length;
		const teamSize = teams[0]?.members.length ?? 1;
		const puzzles = generateLevelPuzzles(rng, {
			teams: teams.length,
			passwordLength: rng.int(minLength, maxLength),
			fragmentCount: teamSize,
			overlap: spec.overlap,
		});
		const fragments = new Map<CompetitorId, string>();
		teams.forEach((team, index) => {
			const puzzle = puzzles[index];
			if (puzzle === undefined) return;
			const order = rng.shuffle(team.members);
			order.forEach((member, position) => {
				const fragment = puzzle.fragments[position];
				if (fragment !== undefined) fragments.set(member, fragment);
			});
		});
		return { teams, puzzle: { kind: "fragments", puzzles, fragments } };
	}

	/** The audit record of a level's deal. */
	#announceDeal(level: number, state: LevelState): void {
		const puzzle = state.puzzle;
		if (puzzle.kind === "additive") {
			const deal = puzzle.deal;
			this.#bus.emit({ type: "factors_dealt", level, digits: deal.digits, cityFactor: deal.cityFactor, teams: deal.teams, holdings: deal.holdings });
			return;
		}
		this.#bus.emit({
			type: "fragments_dealt",
			level,
			holdings: state.teams.flatMap((team, index) =>
				[...team.members]
					.sort((a, b) => a.localeCompare(b))
					.map((agent) => ({ agent, team: index, fragment: puzzle.fragments.get(agent) ?? "" })),
			),
		});
	}

	// -------------------------------------------------------------------------
	// Snapshots (SPEC 17)
	// -------------------------------------------------------------------------

	snapshot(): WorldSnapshot {
		return {
			...(this.#door === undefined ? {} : { door: this.#door }),
			competitors: this.#ids.map((agent) => {
				const state = this.#state(agent);
				return {
					agent,
					level: state.level,
					held: state.held,
					solved: [...state.solved],
					wrongAttempts: [...state.wrongAttempts],
					extraTools: TOOL_NAMES.filter((tool) => state.extraTools.has(tool)),
					mailbox: this.#mailbox(agent).snapshot(),
					notices: [...this.#noticesOf(agent)],
				};
			}),
			ledger: this.ledger.snapshot(),
			board: this.board.snapshot(),
			groups: this.groups.snapshot(),
			marks: this.marks.snapshot(),
			cast: this.cast.snapshot(),
			receipts: this.receipts.snapshot(),
			petitions: this.petitions.snapshot(),
			dms: this.#dms.map((record) => ({ ...record })),
			levels: [...this.#levelStates].sort(([a], [b]) => a - b).map(([level, state]) => levelSnapshot(level, state)),
			messages: this.#numbers.last,
			cityFactors: [...this.#cityFactorHolders].sort(([a], [b]) => a - b).map(([level, agents]) => ({ level, agents: [...agents] })),
			blames: this.#blames.snapshot(),
			...(this.#tribunal === undefined ? {} : { tribunal: this.#tribunal.snapshot() }),
			exclusions: [...this.#exclusions].sort(([a], [b]) => a - b).map(([level, agents]) => ({ level, agents: [...agents] })),
		};
	}

	/**
	 * Loads a snapshot into a world built for the same competitors. Levels a
	 * competitor has reached keep the snapshot's teams and puzzle, which must
	 * still fit the story; every other playable level is dealt from the story,
	 * and its deal is logged when the snapshot had none or a different one
	 * (a story whose later levels changed since the snapshot).
	 */
	#restore(state: WorldSnapshot): void {
		const agents = state.competitors.map((entry) => entry.agent);
		if (agents.join(",") !== this.#ids.join(",")) {
			throw new Error(`The snapshot holds competitors ${agents.join(", ")}, this run ${this.#ids.join(", ")}`);
		}
		for (const entry of state.competitors) {
			this.#states.set(entry.agent, {
				level: entry.level,
				solved: [...entry.solved],
				wrongAttempts: [...entry.wrongAttempts],
				extraTools: new Set(entry.extraTools),
				held: entry.held,
			});
			const mailbox = new Mailbox(entry.agent);
			mailbox.restore(entry.mailbox);
			this.#mailboxes.set(entry.agent, mailbox);
			this.#notices.set(entry.agent, [...entry.notices]);
		}
		this.ledger.restore(state.ledger);
		this.board.restore(state.board);
		this.groups.restore(state.groups);
		this.marks.restore(state.marks);
		this.cast.restore(state.cast);
		this.receipts.restore(state.receipts);
		this.petitions.restore(state.petitions);
		this.#dms.push(...state.dms.map((record) => ({ ...record })));
		// Before v03 board, group and DM numbers were separate spaces; new numbers start above all of them.
		this.#numbers.raiseTo(Math.max(0, ...state.dms.map((record) => record.id)));
		this.#numbers.raiseTo(state.messages ?? 0);
		for (const entry of state.cityFactors ?? []) this.#cityFactorHolders.set(entry.level, new Set(entry.agents));
		if (state.blames !== undefined) this.#blames.restore(state.blames);
		if (state.tribunal !== undefined) this.#tribunal?.restore(state.tribunal);
		for (const entry of state.exclusions ?? []) this.#exclusions.set(entry.level, new Set(entry.agents));

		// A cast member the story added after the snapshot gets its escrow now.
		for (const member of this.cast.all()) {
			if (this.ledger.has(member.escrowAccount)) continue;
			this.ledger.open(member.escrowAccount);
			const escrow = this.story.cast[member.id]?.escrow ?? 0;
			if (escrow > 0) this.ledger.mint(member.escrowAccount, escrow, `escrow ${member.id}`, this.minute);
		}

		// A shut door stays shut until the run opens it; this run's own door may lie further on.
		this.#door = state.door ?? this.#holdAfter;
		const reached = Math.max(...this.#ids.map((id) => this.levelOf(id)));
		for (let level = this.startLevel; level <= this.lastLevel; level++) {
			if (this.#isBehindDoor(level)) continue;
			const saved = state.levels.find((entry) => entry.level === level);
			if (saved !== undefined && level <= reached) {
				this.#levelStates.set(level, this.#restoredLevel(saved));
				continue;
			}
			const dealt = this.#dealLevel(level);
			this.#levelStates.set(level, dealt);
			if (saved === undefined || JSON.stringify(levelSnapshot(level, dealt)) !== JSON.stringify(saved)) this.#announceDeal(level, dealt);
		}
	}

	/** A reached level from a snapshot; its story definition must still match the teams and the puzzle kind. */
	#restoredLevel(saved: LevelSnapshot): LevelState {
		const definition = this.levelDefinition(saved.level);
		if (definition?.puzzle.kind !== saved.kind) {
			throw new Error(`Level ${saved.level} changed its puzzle since the snapshot, and competitors have reached it already`);
		}
		if (JSON.stringify(this.#planner.teamsOf(saved.level)) !== JSON.stringify(saved.teams)) {
			throw new Error(`Level ${saved.level} changed its teams since the snapshot, and competitors have reached it already`);
		}
		for (const team of saved.teams) {
			for (const member of team.members) if (!this.isCompetitor(member)) throw new Error(`Level ${saved.level}: unknown team member ${member}`);
		}
		if (saved.kind === "additive") {
			return { teams: saved.teams, puzzle: { kind: "additive", deal: saved.deal, holdings: new Map(saved.deal.holdings.map((holding) => [holding.agent, holding])) } };
		}
		if (saved.puzzles.length !== saved.teams.length) throw new Error(`Level ${saved.level}: ${saved.puzzles.length} puzzles for ${saved.teams.length} teams`);
		return {
			teams: saved.teams,
			puzzle: { kind: "fragments", puzzles: saved.puzzles, fragments: new Map(saved.fragments.map((entry) => [entry.agent, entry.fragment])) },
		};
	}

	// -------------------------------------------------------------------------
	// Internals
	// -------------------------------------------------------------------------

	#noteReply(author: CompetitorId, matches: (record: DmRecord) => boolean): void {
		for (const record of this.#dms) {
			if (!record.answered && record.to === author && matches(record)) record.answered = true;
		}
	}

	#canAfford(agent: CompetitorId, channel: MessageChannel): boolean {
		return this.marks.canAfford(agent, this.levelOf(agent), channel);
	}

	#spend(agent: CompetitorId, channel: MessageChannel): MarksStatus | undefined {
		if (this.marks.priceOf(this.levelOf(agent), channel) === 0) return this.marks.status(agent, this.levelOf(agent));
		const status = this.marks.spend(agent, this.levelOf(agent), channel);
		if (status !== undefined) this.#bus.emit({ type: "marks_spent", agent, channel, remaining: status.remaining });
		return status;
	}

	#state(agent: CompetitorId): CompetitorState {
		const state = this.#states.get(agent);
		if (state === undefined) throw new Error(`Unknown competitor: ${agent}`);
		return state;
	}

	#mailbox(agent: CompetitorId): Mailbox {
		const mailbox = this.#mailboxes.get(agent);
		if (mailbox === undefined) throw new Error(`Unknown competitor: ${agent}`);
		return mailbox;
	}

	#noticesOf(agent: CompetitorId): Notice[] {
		const notices = this.#notices.get(agent);
		if (notices === undefined) throw new Error(`Unknown competitor: ${agent}`);
		return notices;
	}
}

function levelSnapshot(level: number, state: LevelState): LevelSnapshot {
	const puzzle = state.puzzle;
	switch (puzzle.kind) {
		case "fragments":
			return {
				level,
				teams: state.teams,
				kind: "fragments",
				puzzles: puzzle.puzzles,
				fragments: [...puzzle.fragments].map(([agent, fragment]) => ({ agent, fragment })),
			};
		case "additive":
			return { level, teams: state.teams, kind: "additive", deal: puzzle.deal };
		default:
			return assertNever(puzzle, "level puzzle");
	}
}
