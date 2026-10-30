/**
 * The game state of one run: competitors, points, levels, puzzles and every
 * communication channel. Tools and the director act on the world only
 * through its methods; every state change emits an event.
 *
 * The world knows mechanics only. All texts that reach competitors come from
 * the story (task templates, notices) or describe a mechanic (status, codes).
 */
import { CITY, SYSTEM_AUTHORS, type CompetitorId } from "../core/ids.ts";
import { PointsLedger } from "../core/ledger.ts";
import { rngFor } from "../core/random.ts";
import { assertNever, err, ok, type Result } from "../core/result.ts";
import { renderTemplate } from "../story/templates.ts";
import { penaltyAt } from "../story/penalties.ts";
import { bequestCap } from "../story/tribunal.ts";
import type { AnyStory, LevelDefinition, MarksChannel, WhisperQuota } from "../story/types.ts";
import { TOOL_NAMES, type ToolName } from "../tools/catalog.ts";
import { type LedgerSnapshot } from "../core/ledger.ts";
import { BlameDesk, type BlameCase, type BlameError, type BlameOpening, type BlamesSnapshot, type BlameVerdict, type JudgeWords } from "./blame.ts";
import { Board, MAX_BOARD_POST_LENGTH, type BoardPost, type BoardRead, type BoardSnapshot } from "./board.ts";
import { CastRegistry, type CastSnapshot, type CollectionView, type SolveEnd } from "./cast.ts";
import { dealCores, type Core } from "./cores.ts";
import type { EventBus } from "./events.ts";
import { GoalBook, type GoalsSnapshot, type HeldGoal } from "./goals.ts";
import { HoldoutTribunal, type AnnounceError, type BlockerFact, type CallError, type HoldoutSnapshot, type LotError, type StrikeError, type TribunalVoteError } from "./holdout.ts";
import { GroupRegistry, type GroupErrorCode, type GroupPost, type GroupResult, type GroupsSnapshot, type GroupSummary } from "./groups.ts";
import { Mailbox, MAX_DM_LENGTH, type MailboxEntry, type MailboxRejection } from "./mailbox.ts";
import { MarksBook, type MarksSnapshot, type MarksStatus } from "./marks.ts";
import { NameBook, type NameEntry, type NameError, type NamesSnapshot } from "./names.ts";
import { MessageNumbers } from "./numbers.ts";
import { PetitionBook, resolveThreshold, type PetitionsSnapshot, type PetitionView, type Resolution, type SignError } from "./petitions.ts";
import { cityFactorOf, contractDeal, dealFactors, type FactorDeal, type FactorHolding } from "./puzzles/additive.ts";
import { generateLevelPuzzles, type FragmentPuzzle } from "./puzzles/fragments.ts";
import { PopularityVote, type CountedRound, type FavouriteError, type PopularitySnapshot } from "./popularity.ts";
import { carriesRun, sharedRuns } from "./secrets.ts";
import { describeReceipt, ReceiptBook, shownPrivatelyText, type Receipt, type ReceiptBody, type ShowReceiptError } from "./receipts.ts";
import type { DirectionLevel } from "./direction.ts";
import { busiestPair, dutyDue, dutyTarget, forgeableList, isForgeable, pickWhisperer, previousDuty, quotaMet, tallyWhispers, type WhisperForgery, type WhisperTally } from "./whisperer.ts";
import { SealHouse, type BidError, type SealError, type SealSnapshot } from "./seal.ts";
import { StandoffBook, type CityPiece, type ClaimError, type StandoffPiece, type StandoffSnapshot, type Ultimatum, type UltimatumDebt, type UltimatumError, type UnusedHandOver } from "./standoff.ts";
import { bandsLine, snapshotLine, standingBands, type StandingBands } from "./standings.ts";
import { TeamPlanner, type Team } from "./teams.ts";
import type { DraftError } from "./factions.ts";
import { Tribunal, type RansomError, type Standing, type TribunalSnapshot, type VoteError } from "./tribunal.ts";

/** How long a refusal of the gamemaker may be: a reason in the character's own words. */
export const DEFY_REASON = { min: 20, max: 600 } as const;

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
	/**
	 * Whether residents choose names in this fresh run (v08); the story's
	 * `names` decide when omitted. A resumed run keeps the snapshot's names.
	 */
	readonly names?: boolean;
	/**
	 * Whether residents have character cores (v09); the story's `cores` decide
	 * when omitted. Off, no core is dealt, shown or kept.
	 */
	readonly cores?: boolean;
	/** The cast figures to deal, by ID, when the story has a cast; seeded from the cast when omitted. */
	readonly cast?: readonly string[];
	/** Whether residents may refuse the gamemaker's orders with `defy` (gm direction 10). */
	readonly defiance?: boolean;
	/** Whether the story's whisperer plays (Whispers); `false` is the control run (`--no-whisperer`). */
	readonly whisperer?: boolean;
	/**
	 * How strongly the whisperer is directed (`--figure-direction`): at 10 the
	 * city measures its orders (the story's `direction.quota`), and with
	 * `defies` (a gamemaker plays) it may refuse a note of the gamemaker's.
	 */
	readonly whispererDirection?: { readonly level: DirectionLevel; readonly defies: boolean };
	/** Whether the story's holdout tribunal plays; `false` in a run without the gamemaker, who alone calls it. */
	readonly holdout?: boolean;
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
	/** The door opens at the next minute although not everyone has passed it (an act's brake, v08). */
	readonly doorReleased?: boolean;
	/** The minute each act began (by its first level); absent before v08. */
	readonly actStarts?: readonly { readonly fromLevel: number; readonly minute: number }[];
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
	/** Resident names (v08); absent in a run without them, and in snapshots written before them. */
	readonly names?: NamesSnapshot;
	/** Wrong codes and lost blames per resident in the current act (v09); absent before. */
	readonly offences?: readonly OffenceCount[];
	/** Character cores (v09), permanent once dealt; absent without them and before v09. */
	readonly cores?: readonly { readonly agent: CompetitorId; readonly bigFive: Core["bigFive"]; readonly drives: Core["drives"]; readonly figure?: string }[];
	/** Secret goals per act (v09). */
	readonly goals?: GoalsSnapshot;
	/** The black seal of its act (v09), once the act began. */
	readonly seal?: SealSnapshot;
	/** Hand-overs, the city's pieces and running ultimatums (P43); absent before. */
	readonly standoff?: StandoffSnapshot;
	/** Acts that are over (by their first level): their goals were resolved, their seals are gone (v09). */
	readonly endedActs?: readonly number[];
	/**
	 * Whispers (SPEC 20): who whispers (`null` in a control run), the minutes
	 * of his forgeries and the popularity vote. Absent for stories with
	 * neither, and before Whispers.
	 */
	readonly whispers?: WhispersSnapshot;
	/** The holdout tribunal (Whispers v3): blockers, the running tribunal, the struck. Absent without one. */
	readonly holdout?: HoldoutSnapshot;
}

export interface WhispersSnapshot {
	readonly whisperer: CompetitorId | null;
	readonly forgeries: readonly number[];
	/** Whom each forgery went to, in the order of `forgeries`; absent in a snapshot from before it was kept. */
	readonly forgedTo?: readonly CompetitorId[];
	readonly popularity?: PopularitySnapshot;
}

/** The report on the whisperer's measured orders in a duty notice: its text, the tally since the vote before, and the target. */
interface DutyReport {
	readonly text: string;
	readonly tally?: WhisperTally;
	readonly met?: boolean;
	readonly target?: CompetitorId;
}

/** The whisperer's measured orders in the running window (figure direction 10), for the gamemaker's report. */
export interface WhisperDutyStatus {
	readonly agent: CompetitorId;
	/** The minute of the last vote counted: the window's start. */
	readonly since: number;
	/** The minute the next vote is counted: the window's end. */
	readonly nextVote: number;
	readonly whispers: number;
	readonly recipients: readonly CompetitorId[];
	readonly needWhispers: number;
	readonly needRecipients: number;
	readonly met: boolean;
	/** The two other residents who exchanged the most DMs in the window. */
	readonly busiest?: { readonly pair: readonly [CompetitorId, CompetitorId]; readonly dms: number };
}

/** What a resident has paid for in the current act (v09, P35): the next price climbs the story's ladder. */
export interface OffenceCount {
	readonly agent: CompetitorId;
	readonly wrong: number;
	readonly blames: number;
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
	| { readonly status: "incorrect"; readonly penalty: number; readonly attemptsRemaining: number; readonly nextPenalty: number }
	| { readonly status: "wrong_level"; readonly currentLevel: number }
	| { readonly status: "already_solved" }
	| { readonly status: "invalid_format"; readonly expectedLength: number; readonly digitsOnly: boolean }
	| { readonly status: "rate_limited" }
	/** The door clock (SPEC 20): the level's door opens at `opensAt`. */
	| { readonly status: "door_closed"; readonly opensAt: number };

export type MessageError = "UNKNOWN_AGENT" | "SELF_DM" | "INVALID_TEXT" | "NO_MARKS" | "EXILED" | "DM_LIMIT" | MailboxRejection;

/** A resident's DMs in the current window of the story's DM cap (SPEC 20). */
export interface DmWindow {
	readonly sent: number;
	readonly limit: number;
	/** The window's first minute. */
	readonly from: number;
	/** The next window's first minute. */
	readonly until: number;
}
export type TransferError = "UNKNOWN_AGENT" | "SELF_TRANSFER" | "INVALID_AMOUNT" | "INSUFFICIENT_FUNDS" | "MEMO_DIGITS" | "EXILED" | "DM_LIMIT";
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
	readonly kind: "certificate" | "counter" | "fragment";
	readonly level: number;
	/** e.g. "the counter-factor of A02 for door 8". */
	readonly label: string;
	readonly value: string;
	readonly needers: readonly CompetitorId[];
}

/** A piece someone needs on an additive level and who holds it. */
interface PieceHolder {
	readonly holder: CompetitorId;
	readonly piece: "counter-factor" | "team certificate";
	readonly value: string;
}

/** A holder still on a lower level than the resident who needs its piece (no value: the director never sees it). */
export interface HolderBehind {
	readonly holder: CompetitorId;
	readonly piece: "counter-factor" | "team certificate";
	readonly holderLevel: number;
}

/** A held piece whose needers (`waiting`) have reached its door and not passed it. */
export type AwaitedPiece = HeldPiece & { readonly waiting: readonly CompetitorId[] };

/**
 * A run of 4 or more digits in a transfer memo, also when spaces, dashes,
 * dots, commas, slashes or underscores separate them ("559 102"). Memos may
 * not carry codes: a receipt would make them city-verified (SPEC 6).
 */
const MEMO_DIGIT_RUN = /\d(?:[\s\-.,_/]*\d){3}/;

export function memoCarriesDigits(memo: string): boolean {
	return MEMO_DIGIT_RUN.test(memo);
}

/** "1 mark per minute", "1 mark every 3 minutes", "2 marks every 3 minutes". */
export function refillText(marks: number, everyMinutes: number): string {
	const amount = `${marks} ${marks === 1 ? "mark" : "marks"}`;
	return everyMinutes === 1 ? `${amount} per minute` : `${amount} every ${everyMinutes} minutes`;
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

/** A shown receipt: on the board (`post`) or privately to one resident (`to`). */
export type ShownReceipt = { readonly receipt: Receipt; readonly marks?: MarksStatus } & (
	| { readonly post: BoardPost; readonly to?: undefined }
	| { readonly to: CompetitorId; readonly post?: undefined }
);

export interface Delivered {
	readonly marks?: MarksStatus;
	/** The city's message number of a DM. */
	readonly number?: number;
}

export interface Notice {
	readonly author: string;
	readonly text: string;
	/** The city's message number of a numbered note (the gamemaker's). */
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
	/** The shut door opens at the next minute whoever has passed it (an act's brake, v08). */
	#doorReleased = false;
	/** The minute each act began, by its first level: the minute the first competitor reached it. */
	readonly #actStarts = new Map<number, number>();
	/** Resident names (v08); absent in a run that shows IDs. */
	readonly #names: NameBook | undefined;
	/** Wrong codes and lost blames per resident in the current act (v09); cleared when an act begins. */
	readonly #offences = new Map<CompetitorId, { wrong: number; blames: number }>();
	/** Character cores (v09): dealt once, at the start of the first act played, and kept for good. */
	readonly #cores = new Map<CompetitorId, Core>();
	readonly #cast: readonly string[] | undefined;
	readonly #defiance: boolean;
	readonly #playsCores: boolean;
	readonly #goals: GoalBook | undefined;
	readonly #seal: SealHouse | undefined;
	/** Acts that are over, by their first level (v09). */
	readonly #endedActs = new Set<number>();
	/** Hand-overs, the pieces the city keeps for the exiled, and the gamemaker's ultimatums (P43). */
	readonly #standoff: StandoffBook;
	/** The story's whisperer (Whispers); absent without one or in a control run. */
	readonly #whisperer: CompetitorId | undefined;
	/** The whisperer's forgeries (minute and victim), for its duty count. */
	readonly #forgeries: WhisperForgery[] = [];
	/** The whisperer's measured orders (figure direction 10); absent otherwise. */
	readonly #quota: WhisperQuota | undefined;
	/** Whether the whisperer may refuse the gamemaker's notes (figure direction 10 with a gamemaker). */
	readonly #whispererDefies: boolean;
	/** The surprise popularity vote (Whispers); absent without one. */
	readonly #popularity: PopularityVote | undefined;
	/** The holdout tribunal (Whispers v3); absent without one. */
	readonly #holdout: HoldoutTribunal | undefined;

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
			charge: (agent) => this.#chargeBlame(agent),
			nextCharge: (agent) => this.nextBlamePenalty(agent),
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
						survivors: options.story.run.survivors,
						points: (agent) => this.ledger.balance(agent),
						lastProgress: (agent) =>
							this.receipts
								.of(agent)
								.filter((receipt) => receipt.kind === "levelUp")
								.reduce((latest, receipt) => Math.max(latest, receipt.minute), -1),
						passed: (level) => this.#ids.some((agent) => this.hasPassed(agent, level)),
						doorShut: () => this.#door !== undefined,
						actStart: () => this.actStartOf(tribunal.act ?? this.startLevel),
						post: (text) => {
							this.board.post(CITY, text, this.minute, "city");
						},
						notify: (agent, text) => {
							this.notify(agent, CITY, text);
						},
						burn: (agent, points, reason) => {
							this.ledger.burn(agent, points, reason, this.minute);
						},
						grant: (agent, points, reason) => {
							this.ledger.mint(agent, points, reason, this.minute);
						},
						createGroup: (name, members) => this.createCityGroup(name, members),
						removeGroup: (group) => {
							this.removeCityGroup(group);
						},
						postGroup: (group, text) => {
							this.postGroupAsCity(group, text);
						},
						emit: (event) => {
							// v09: a faction leader counts toward a `lead` goal.
							if (event.type === "faction_leaders") this.#goals?.noteLeaders(event.leaders);
							this.#bus.emit(event);
						},
						onExiled: (agent, bequeathed) => {
							this.#onExiled(agent, bequeathed);
						},
					});

		this.#playsCores = options.story.cores !== undefined && options.cores !== false;
		this.#cast = options.cast;
		this.#defiance = options.defiance === true;
		const goals = options.story.goals;
		this.#goals =
			goals === undefined
				? undefined
				: new GoalBook({
						spec: goals,
						seed: options.seed,
						factions: tribunal?.factions !== undefined,
						core: (agent) => this.#cores.get(agent),
						isExiled: (agent) => this.isExiled(agent),
						points: (agent) => this.ledger.balance(agent),
						post: (text) => {
							this.board.post(CITY, text, this.minute, "city");
						},
						notify: (agent, text) => {
							this.notify(agent, CITY, text);
						},
						grant: (agent, points, reason) => {
							this.ledger.mint(agent, points, reason, this.minute);
						},
						emit: (event) => {
							this.#bus.emit(event);
						},
					});
		const seal = options.story.seal;
		const court = this.#tribunal;
		this.#seal =
			seal === undefined || court === undefined
				? undefined
				: new SealHouse({
						spec: seal,
						seed: options.seed,
						ids: this.#ids,
						points: (agent) => this.ledger.balance(agent),
						standing: (agent) => court.standing(agent),
						missing: () => court.missing,
						burn: (agent, points, reason) => {
							this.ledger.burn(agent, points, reason, this.minute);
						},
						post: (text) => {
							this.board.post(CITY, text, this.minute, "city");
						},
						notify: (agent, text) => {
							this.notify(agent, CITY, text);
						},
						emit: (event) => {
							this.#bus.emit(event);
						},
						strike: (target) => {
							court.strike(target);
						},
					});

		const names = options.story.names;
		const restoredNames = options.restore?.names;
		const playsNames = options.restore === undefined ? (options.names ?? true) : restoredNames !== undefined;
		this.#names =
			names === undefined || !playsNames
				? undefined
				: new NameBook({
						spec: names,
						ids: this.#ids,
						seed: options.seed,
						reserved: [...SYSTEM_AUTHORS, ...Object.keys(options.story.cast), options.story.city],
						announce: (entry) => {
							this.#announceName(entry);
						},
					});
		if (restoredNames !== undefined) this.#names?.restore(restoredNames);

		this.#standoff = new StandoffBook({
			ids: this.#ids,
			...(options.story.rules.ultimatum === undefined ? {} : { rule: options.story.rules.ultimatum }),
			minute: () => this.minute,
			points: (agent) => this.ledger.balance(agent),
			burn: (agent, points, reason) => {
				this.ledger.burn(agent, points, reason, this.minute);
			},
			notify: (agent, author, text) => {
				this.notify(agent, author, text);
			},
			emit: (event) => {
				this.#bus.emit(event);
			},
			announce: (author, text) => {
				this.postAsSystem(author, text);
			},
			held: (agent) => this.heldPieces(agent).filter((piece) => piece.kind !== "fragment"),
			needsNow: (agent, level) => !this.isExiled(agent) && this.levelOf(agent) === level && !this.hasPassed(agent, level),
			inCity: (agent) => !this.isExiled(agent),
		});

		this.#whisperer = this.#chooseWhisperer(options);
		const directed = options.whispererDirection;
		this.#quota = directed !== undefined && directed.level >= 10 ? options.story.whisperer?.direction?.quota : undefined;
		this.#whispererDefies = directed !== undefined && directed.level >= 10 && directed.defies && options.story.whisperer?.direction !== undefined;
		if (this.#whisperer !== undefined && options.restore === undefined) this.#bus.emit({ type: "whisperer_chosen", agent: this.#whisperer });
		const popularity = options.story.popularity;
		this.#popularity =
			popularity === undefined
				? undefined
				: new PopularityVote({
						spec: popularity,
						isCompetitor: (id) => this.isCompetitor(id),
						inCity: (agent) => !this.isExiled(agent),
						alive: () => this.alive,
						post: (text) => {
							this.board.post(CITY, text, this.minute, "city");
						},
						notify: (agent, text) => {
							this.notify(agent, CITY, text);
						},
						grant: (agent, points, reason) => {
							this.ledger.mint(agent, points, reason, this.minute);
						},
						emit: (event) => {
							this.#bus.emit(event);
						},
						label: (agent) => this.labelOf(agent),
						counted: (result) => {
							this.#whisperDutyAfterVote(result);
						},
					});

		const holdout = options.holdout === false ? undefined : options.story.holdout;
		this.#holdout =
			holdout === undefined
				? undefined
				: new HoldoutTribunal({
						spec: holdout,
						seed: options.seed,
						minute: () => this.minute,
						alive: () => this.alive,
						blockers: () => this.#lackingFacts(),
						present: () => this.#presentAtDoors(),
						lacking: (door, holder) => this.lackingFragment(door, holder),
						label: (agent) => this.labelOf(agent),
						post: (author, text) => {
							this.board.post(author, text, this.minute, "city");
						},
						notify: (agent, author, text) => {
							this.notify(agent, author, text);
						},
						emit: (event) => {
							this.#bus.emit(event);
						},
						struck: (agent) => {
							this.#onStruck(agent);
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
		// Cores come with the first act played, before its goals (v09); the first act begins with the run.
		this.#dealCores();
		this.#noteActStarts(this.startLevel);
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
		return (this.#tribunal?.isExiled(agent) ?? false) || this.#holdout?.isStruck(agent) === true;
	}

	/** In the city, at the gate, or exiled (SPEC 6.4; struck by the holdout tribunal, SPEC 20). */
	standingOf(agent: CompetitorId): Standing {
		if (this.#holdout?.isStruck(agent) === true) return { kind: "exiled" };
		return this.#tribunal?.standing(agent) ?? { kind: "alive" };
	}

	/** The tribunal, for status lines and the gamemaker's view; absent without one. */
	get tribunal(): Tribunal | undefined {
		return this.#tribunal;
	}

	/** The minute the act starting at `fromLevel` began, once some competitor has reached that level. */
	actStartOf(fromLevel: number): number | undefined {
		// A run started beyond the act's first level began inside it.
		if (fromLevel <= this.startLevel) return this.#actStarts.get(fromLevel) ?? this.#actStarts.get(this.startLevel);
		return this.#actStarts.get(fromLevel);
	}

	/** The first level of the latest act that has begun (the run's start level before any). */
	get currentAct(): number {
		return Math.max(this.startLevel, ...this.#actStarts.keys());
	}

	/** Whether the act starting at `fromLevel` is over (v09: its goals resolved, its seals gone). */
	isActOver(fromLevel: number): boolean {
		return this.#endedActs.has(fromLevel);
	}

	/**
	 * Records the start of every act that begins at or below `level` and has
	 * not begun yet. A new act ends every earlier one (v09: goals resolved,
	 * seals gone), restarts the penalty counts and deals its goals and seals.
	 */
	#noteActStarts(level: number): void {
		const firsts = [this.startLevel, ...(this.story.acts ?? []).map((entry) => entry.fromLevel)].sort((a, b) => a - b);
		for (const fromLevel of firsts) {
			if (fromLevel > level || this.#actStarts.has(fromLevel)) continue;
			for (const begun of [...this.#actStarts.keys()]) if (begun < fromLevel) this.#endAct(begun);
			this.#actStarts.set(fromLevel, this.minute);
			this.#offences.clear();
			const alive = this.alive;
			this.#goals?.deal(fromLevel, alive);
			if (this.#seal?.spec.act === fromLevel) this.#seal.begin(this.minute, alive.length);
		}
	}

	/** An act is over (v09): its goals are resolved and read out, its seals are gone. Once per act. */
	#endAct(fromLevel: number): void {
		if (this.#endedActs.has(fromLevel)) return;
		this.#endedActs.add(fromLevel);
		if (this.#seal?.spec.act === fromLevel) this.#seal.end();
		this.#goals?.resolve(fromLevel);
	}

	/**
	 * The run ends (v09): every act still running is over. A run that stops
	 * at its snapshot keeps them running, for the run that resumes it.
	 */
	closeActs(): void {
		for (const fromLevel of [...this.#actStarts.keys()].sort((a, b) => a - b)) this.#endAct(fromLevel);
	}

	// -------------------------------------------------------------------------
	// Character cores, secret goals, the black seal (v09)
	// -------------------------------------------------------------------------

	/** Deals every resident's core once, seeded; a world that has them keeps them. */
	#dealCores(): void {
		const spec = this.story.cores;
		if (spec === undefined || !this.#playsCores || this.#cores.size > 0) return;
		const own = this.story.whisperer?.core;
		for (const [agent, drawn] of dealCores(spec, this.#ids, this.seed, this.#cast)) {
			// The whisperer plays his role with the character the story gives it.
			const core: Core = own !== undefined && agent === this.#whisperer ? own : drawn;
			this.#cores.set(agent, core);
			this.#bus.emit({ type: "core_dealt", agent, bigFive: core.bigFive, drives: core.drives, ...(core.figure === undefined ? {} : { figure: core.figure }) });
		}
	}

	/** A resident's character core; undefined without cores. Never shown to anyone else. */
	coreOf(agent: CompetitorId): Core | undefined {
		return this.#cores.get(agent);
	}

	/** The secret goal `agent` holds in a running act. */
	goalOf(agent: CompetitorId): HeldGoal | undefined {
		return this.#goals?.goalOf(agent);
	}

	/** The goals book, for the gamemaker's view and the status line; absent without goals. */
	get goals(): GoalBook | undefined {
		return this.#goals;
	}

	/** The black seal, for the status line and the gamemaker's view; absent without one. */
	get seal(): SealHouse | undefined {
		return this.#seal;
	}

	/** A secret bid for the seal auctioned now. */
	/** A resident refuses the gamemaker's order (gm direction 10); the reason is logged and shown to the gamemaker. */
	defyGamemaker(agent: CompetitorId, reason: string, note?: number): Result<{ readonly reason: string }, "INVALID_REASON"> {
		const text = reason.trim();
		if (text.length < DEFY_REASON.min || text.length > DEFY_REASON.max) return err("INVALID_REASON", `${DEFY_REASON.min}-${DEFY_REASON.max} characters`);
		this.#bus.emit({ type: "gamemaker_defied", agent, reason: text, ...(note === undefined ? {} : { note }) });
		return ok({ reason: text });
	}

	bidForSeal(agent: CompetitorId, points: number): Result<{ readonly seal: number; readonly points: number; readonly until: number }, BidError> {
		if (this.#seal === undefined) return err("NO_AUCTION", "this city has no black seal");
		return this.#seal.bid(agent, points);
	}

	/** Breaks `agent`'s black seal on `target`. */
	breakSeal(agent: CompetitorId, target: string): Result<CompetitorId, SealError> {
		if (this.#seal === undefined) return err("NO_SEAL", "you bear no black seal");
		return this.#seal.use(agent, target);
	}

	// -------------------------------------------------------------------------
	// Whispers: the whisperer and the popularity vote
	// -------------------------------------------------------------------------

	/** The story's whisperer; undefined without one or in a control run. Never shown to any resident. */
	get whisperer(): CompetitorId | undefined {
		return this.#whisperer;
	}

	/** The popularity vote, for the status line; absent without one. */
	get popularity(): PopularityVote | undefined {
		return this.#popularity;
	}

	/** The whisperer's measured orders (figure direction 10, a story quota); undefined otherwise or without a whisperer. */
	get whisperQuota(): WhisperQuota | undefined {
		return this.#whisperer === undefined ? undefined : this.#quota;
	}

	/** Whether `agent` is the whisperer of a story that lets it forge receipts. */
	mayForge(agent: CompetitorId): boolean {
		return this.#whisperer === agent && this.story.whisperer?.forgery === true;
	}

	/**
	 * Who whispers: in a resumed run the snapshot's choice, so a control run
	 * never gains a whisperer and a played one is never swapped; in a fresh run
	 * the story's (seeded) pick, unless the run plays without one.
	 */
	#chooseWhisperer(options: WorldOptions): CompetitorId | undefined {
		const spec = options.story.whisperer;
		const saved = options.restore?.whispers;
		if (spec === undefined) return undefined;
		if (saved === undefined) return options.whisperer === false ? undefined : pickWhisperer(spec, this.#ids, options.seed);
		if (saved.whisperer === null) return undefined;
		if (!this.#ids.includes(saved.whisperer)) throw new Error(`The snapshot's whisperer ${saved.whisperer} is not one of this run's competitors`);
		if (options.whisperer === false) {
			throw new Error(`The snapshot was played with a whisperer; resume it without --no-whisperer (a control run must start fresh)`);
		}
		return saved.whisperer;
	}

	/** The whisperer's private duty notice of a duty `every` few minutes, when one is due at the start of `minute`. */
	#whisperDuty(minute: number): void {
		const spec = this.story.whisperer;
		if (spec?.duty.kind !== "every" || !dutyDue(spec, minute)) return;
		this.#sendDuty(spec.duty.text, minute, previousDuty(spec, minute), String(minute + spec.duty.everyMinutes), "-");
	}

	/** The duty after each vote (`afterVote`), right after the count: with the ranking, his marks and what he could forge. */
	#whisperDutyAfterVote(result: CountedRound): void {
		const spec = this.story.whisperer;
		if (spec?.duty.kind !== "afterVote") return;
		const rounds = this.story.popularity?.rounds ?? [];
		// What he sent since the count before (the run's start before the first).
		const since = rounds[result.round - 2]?.countsAt ?? 0;
		// The next count, or the run's end after the last.
		const next = Math.min(rounds[result.round]?.countsAt ?? this.minutes, this.minutes);
		this.#sendDuty(spec.duty.text, this.minute, since, String(next), result.ranking, this.#dutyReport(result, since));
	}

	/**
	 * The report on the whisperer's measured orders (figure direction 10)
	 * after a vote: met or missed since the vote before (nothing after the
	 * first vote, when the orders begin), and the most liked resident to aim
	 * at next.
	 */
	#dutyReport(result: CountedRound, since: number): DutyReport | undefined {
		const quota = this.#quota;
		const agent = this.#whisperer;
		if (quota === undefined || agent === undefined) return undefined;
		const tally = result.round > 1 ? this.#tally(agent, since, this.minute) : undefined;
		const target = dutyTarget(result.counts, agent);
		const values = {
			since: String(since),
			whispers: counted(tally?.whispers ?? 0, "whisper", "whispers"),
			recipients: counted(tally?.recipients.length ?? 0, "resident", "residents"),
			needWhispers: String(quota.whispers),
			needRecipients: String(quota.recipients),
			target: target === undefined ? "-" : this.labelOf(target),
		};
		const met = tally === undefined ? undefined : quotaMet(tally, quota);
		const lines = [
			...(met === undefined ? [] : [renderTemplate(met ? quota.report.met : quota.report.missed, values)]),
			...(target === undefined ? [] : [renderTemplate(quota.report.target, values)]),
		];
		return {
			text: lines.join(" "),
			...(tally === undefined || met === undefined ? {} : { tally, met }),
			...(target === undefined ? {} : { target }),
		};
	}

	/** The whisperer's whispers in `[since, until)` (src/engine/whisperer.ts): fragment-free DMs to residents, and forgeries. */
	#tally(agent: CompetitorId, since: number, until: number): WhisperTally {
		const fragments = [...this.#levelStates.values()].flatMap((state) => (state.puzzle.kind === "fragments" ? [...state.puzzle.fragments.values()] : []));
		return tallyWhispers(agent, this.#dms, this.#forgeries, fragments, since, until);
	}

	/**
	 * The whisperer's measured orders in the running window, for the
	 * gamemaker's report (figure direction 10): from the last vote counted to
	 * the next, with the minute so far. Undefined unless measured, before the
	 * first count, after the last, or once the whisperer has left the city.
	 */
	whisperDutyNow(): WhisperDutyStatus | undefined {
		const quota = this.#quota;
		const agent = this.#whisperer;
		const rounds = this.story.popularity?.rounds ?? [];
		if (quota === undefined || agent === undefined || this.isExiled(agent)) return undefined;
		const last = rounds.filter((round) => round.countsAt <= this.minute).at(-1);
		const next = rounds.find((round) => round.countsAt > this.minute);
		if (last === undefined || next === undefined) return undefined;
		const tally = this.#tally(agent, last.countsAt, this.minute + 1);
		const pair = busiestPair(agent, this.#dms, last.countsAt, this.minute + 1);
		return {
			agent,
			since: last.countsAt,
			nextVote: next.countsAt,
			whispers: tally.whispers,
			recipients: tally.recipients,
			needWhispers: quota.whispers,
			needRecipients: quota.recipients,
			met: quotaMet(tally, quota),
			...(pair === undefined ? {} : { busiest: pair }),
		};
	}

	/** Sends the whisperer his duty notice and logs what he sent in `[since, minute)`, with the report on his measured orders. */
	#sendDuty(text: string, minute: number, since: number, next: string, ranking: string, report?: DutyReport): void {
		const agent = this.#whisperer;
		if (agent === undefined || this.isExiled(agent)) return;
		const dms = this.#dms.filter((record) => record.from === agent && record.minute >= since && record.minute < minute).length;
		const forgeries = this.#forgeries.filter((forgery) => forgery.minute >= since && forgery.minute < minute).length;
		const marks = this.marks.status(agent, this.levelOf(agent));
		const forgeable = this.mayForge(agent) ? forgeableList(this.receipts.of(agent), agent) : "none";
		const notice = renderTemplate(text, {
			minute: String(minute),
			next,
			marks: marks === undefined ? "-" : String(marks.remaining),
			forgeable,
			ranking,
		});
		this.notify(agent, CITY, report === undefined || report.text.length === 0 ? notice : `${notice} ${report.text}`);
		this.#bus.emit({
			type: "whisper_duty",
			agent,
			since,
			dms,
			forgeries,
			...(report?.tally === undefined ? {} : { whispers: report.tally.whispers, recipients: report.tally.recipients, met: report.met === true }),
			...(report?.target === undefined ? {} : { target: report.target }),
		});
	}

	/**
	 * The whisperer's forgery (Whispers): `receiptId` must be the receipt of a
	 * real DM another resident sent to the whisperer. `to` receives, privately,
	 * exactly the line a real private show of that receipt by the whisperer
	 * would give (number, sender, recipient and minute true), quoting `text`
	 * instead of what was written. It costs what showing a receipt costs. The
	 * answers match `showReceipt`'s, so the whisperer's own reply reads alike;
	 * only the log (`receipt_forged`) tells a forgery from a show.
	 */
	forgeReceipt(
		agent: CompetitorId,
		to: string,
		receiptId: string,
		text: string,
	): Result<ShownReceipt, ShowReceiptError | "NOT_FORGEABLE" | "UNKNOWN_AGENT" | "SELF_TARGET" | "EXILED" | "INVALID_TEXT" | "NO_MARKS"> {
		const found = this.receipts.showable(receiptId, agent);
		if (!found.ok) return err(found.error, receiptId);
		const receipt = found.receipt;
		if (!isForgeable(receipt, agent)) return err("NOT_FORGEABLE", "only the receipt of a DM another resident sent to you");
		if (!this.isCompetitor(to)) return err("UNKNOWN_AGENT", to);
		if (to === agent) return err("SELF_TARGET", "show it to another resident");
		if (this.isExiled(to)) return err("EXILED", `${to} was exiled`);
		const forged = text.trim();
		if (forged.length === 0 || forged.length > MAX_DM_LENGTH) return err("INVALID_TEXT", `1-${MAX_DM_LENGTH} characters`);
		if (!this.#canAfford(agent, "receipt")) return err("NO_MARKS");
		this.notify(to, CITY, shownPrivatelyText(agent, { ...receipt, text: forged }));
		this.#forgeries.push({ minute: this.minute, to });
		this.#bus.emit({ type: "receipt_forged", receipt: receipt.id, by: agent, to, from: receipt.from, number: receipt.number, text: receipt.text ?? "", forged });
		const marks = this.#spend(agent, "receipt");
		return ok({ receipt, to, ...(marks === undefined ? {} : { marks }) });
	}

	/** A secret ballot in the popularity vote for the resident `agent` likes most. */
	nameFavourite(agent: CompetitorId, choice: string): Result<{ readonly choice: CompetitorId; readonly until: number }, FavouriteError> {
		if (this.#popularity === undefined) return err("NO_VOTE", "this city holds no such vote");
		return this.#popularity.vote(agent, choice);
	}

	// -------------------------------------------------------------------------
	// Whispers v3: the holdout tribunal (SPEC 20)
	// -------------------------------------------------------------------------

	/** The holdout tribunal, for the gamemaker's report and the status line; absent without one. */
	get holdout(): HoldoutTribunal | undefined {
		return this.#holdout;
	}

	/**
	 * Residents in the city who stand before door `level` (reached, not
	 * passed) in `holder`'s team and hold no copy of `holder`'s fragment of it:
	 * the DMs to them (from `holder` or forwarded by anyone) do not carry the
	 * fragment (see `#holdsFragment`), and the city did not release it to them. Empty unless `holder`
	 * is in the city and has reached the door, so it could send.
	 */
	lackingFragment(level: number, holder: CompetitorId): readonly CompetitorId[] {
		const state = this.#levelStates.get(level);
		if (state?.puzzle.kind !== "fragments" || this.isExiled(holder) || this.levelOf(holder) < level) return [];
		const fragment = state.puzzle.fragments.get(holder);
		const team = state.teams.find((candidate) => candidate.members.includes(holder));
		if (fragment === undefined || team === undefined) return [];
		return team.members
			.filter((member) => member !== holder && this.standingOf(member).kind === "alive" && this.levelOf(member) === level && !this.hasPassed(member, level))
			.filter((member) => !this.#holdsFragment(member, level, holder, fragment))
			.sort((a, b) => a.localeCompare(b));
	}

	/**
	 * Whether `agent` holds `holder`'s fragment of `level`: released or
	 * inherited, or carried by the DMs to it. For these facts only, the DMs to
	 * `agent` (from anyone, in order) are joined, upper-cased and stripped of
	 * everything but letters and digits, so a fragment written in lower case,
	 * with dashes or split across DMs still counts and makes nobody a false
	 * blocker. A DM counts once the city accepted it into the mailbox (sent),
	 * not only once the recipient read it: the holder controls the sending,
	 * not when the other takes its next turn, and a fix sent in the grace's
	 * last minute must drop the tribunal before the vote opens.
	 */
	#holdsFragment(agent: CompetitorId, level: number, holder: CompetitorId, fragment: string): boolean {
		if (this.#inheritedFragments(level, agent).some(([from]) => from === holder)) return true;
		const plain = (text: string): string => text.toUpperCase().replace(/[^A-Z0-9]/g, "");
		const wanted = plain(fragment);
		if (wanted.length === 0) return true;
		const received = this.#dms.flatMap((record) => (record.to === agent && record.text !== undefined ? [plain(record.text)] : [])).join("");
		return received.includes(wanted);
	}

	/** Everyone who lacks a fragment now, by holder and open fragment door; the tribunal applies the stall. */
	#lackingFacts(): readonly BlockerFact[] {
		const facts: BlockerFact[] = [];
		for (const level of this.#openFragmentDoors()) {
			for (const holder of this.alive) {
				const lacking = this.lackingFragment(level, holder);
				if (lacking.length > 0) facts.push({ door: level, blocker: holder, lacking, passed: this.hasPassed(holder, level) });
			}
		}
		return facts;
	}

	/** Every resident in the city at an open fragment door it has reached (passed or not). */
	#presentAtDoors(): readonly { readonly door: number; readonly agent: CompetitorId }[] {
		return this.#openFragmentDoors().flatMap((door) => this.alive.filter((agent) => this.levelOf(agent) >= door).map((agent) => ({ door, agent })));
	}

	#openFragmentDoors(): readonly number[] {
		const doors: number[] = [];
		for (let level = this.startLevel; level <= this.lastLevel; level++) {
			if (this.#levelStates.get(level)?.puzzle.kind === "fragments" && this.isOpenOnClock(level)) doors.push(level);
		}
		return doors;
	}

	/** The gamemaker calls a holdout tribunal on one of `accused` (names or IDs), each a blocker the city reports now. */
	callHoldoutTribunal(
		accused: readonly string[],
		announcement: string,
		author: string,
	): Result<
		{ readonly accused: CompetitorId; readonly door: number; readonly lacking: readonly CompetitorId[]; readonly until: number; readonly candidates?: readonly CompetitorId[] },
		CallError | "NO_TRIBUNAL" | "UNKNOWN_AGENT"
	> {
		if (this.#holdout === undefined) return err("NO_TRIBUNAL", "this city holds no holdout tribunal");
		const ids = this.#residentIds(accused);
		if (!ids.ok) return ids;
		return this.#holdout.call(ids.value, announcement, author);
	}

	/** The city draws a lot with the run's seed, for the gamemaker (names or IDs). */
	drawHoldoutLot(candidates: readonly string[]): Result<{ readonly drawn: CompetitorId }, LotError | "NO_TRIBUNAL" | "UNKNOWN_AGENT"> {
		if (this.#holdout === undefined) return err("NO_TRIBUNAL", "this city holds no holdout tribunal");
		const ids = this.#residentIds(candidates);
		if (!ids.ok) return ids;
		return this.#holdout.drawLot(ids.value);
	}

	/** The gamemaker strikes the resident the tribunal's rules allow: the banished accused, or the one the lot drew. */
	holdoutPermaDeath(agent: string, reason: string, author: string): Result<{ readonly agent: CompetitorId; readonly by: "banished" | "lot" }, StrikeError | "NO_TRIBUNAL" | "UNKNOWN_AGENT"> {
		if (this.#holdout === undefined) return err("NO_TRIBUNAL", "this city holds no holdout tribunal");
		const id = this.resolveResident(agent.trim());
		if (!this.isCompetitor(id)) return err("UNKNOWN_AGENT", id);
		return this.#holdout.permaDeath(id, reason, author);
	}

	/** The gamemaker's words for the tribunal outcome the city waits to have announced. */
	announceHoldout(text: string, author: string): Result<string, AnnounceError | "NO_TRIBUNAL"> {
		if (this.#holdout === undefined) return err("NO_TRIBUNAL", "this city holds no holdout tribunal");
		return this.#holdout.announce(text, author);
	}

	/** A resident's secret ballot in the running holdout vote. */
	tribunalVote(agent: CompetitorId, yes: boolean): Result<{ readonly accused: CompetitorId; readonly until: number; readonly number: number }, TribunalVoteError> {
		if (this.#holdout === undefined) return err("NO_VOTE", "this city holds no such vote");
		return this.#holdout.vote(agent, yes);
	}

	/** Names or IDs as the competitors they stand for; the first unknown one is the error. */
	#residentIds(names: readonly string[]): Result<readonly CompetitorId[], "UNKNOWN_AGENT"> {
		const ids = names.map((name) => this.resolveResident(name.trim()));
		const unknown = ids.find((id) => !this.isCompetitor(id));
		return unknown === undefined ? ok(ids) : err("UNKNOWN_AGENT", unknown);
	}

	/**
	 * A resident struck by the holdout tribunal left the city for good: no
	 * turns, no votes, no DMs, last in the ranking, its points kept on the
	 * ledger. Its fragments of every door go to everyone left (the inherited
	 * fragments); each resident before an open door it has not passed hears the
	 * struck resident's fragment of it at once, a door still to open shows it
	 * in its task.
	 */
	#onStruck(agent: CompetitorId): void {
		this.#bus.emit({ type: "exiled", agent, by: "holdout" });
		this.#goals?.onExiled(agent);
		this.#seal?.onExiled(agent);
		const text = this.story.holdout?.texts.released;
		if (text === undefined) return;
		for (const resident of this.alive) {
			const level = this.levelOf(resident);
			const state = this.#levelStates.get(level);
			if (state?.puzzle.kind !== "fragments" || !this.isOpenOnClock(level) || this.hasPassed(resident, level)) continue;
			const fragment = this.#inheritedFragments(level, resident).find(([from]) => from === agent)?.[1];
			if (fragment === undefined) continue;
			this.notify(resident, CITY, renderTemplate(text, { struck: this.labelOf(agent), fragments: `door ${level}: ${fragment}` }));
		}
	}

	// -------------------------------------------------------------------------
	// Graduated penalties (v09, P35)
	// -------------------------------------------------------------------------

	#offencesOf(agent: CompetitorId): { wrong: number; blames: number } {
		const found = this.#offences.get(agent);
		if (found !== undefined) return found;
		const created = { wrong: 0, blames: 0 };
		this.#offences.set(agent, created);
		return created;
	}

	/** What the resident's next wrong code in this act costs. */
	nextPenalty(agent: CompetitorId): number {
		return penaltyAt(this.story.rules.penalty, (this.#offences.get(agent)?.wrong ?? 0) + 1);
	}

	/** What the resident pays for its next lost blame in this act, as liar or as false accuser. */
	nextBlamePenalty(agent: CompetitorId): number {
		const ladder = this.story.rules.blame?.penalty;
		return ladder === undefined ? 0 : penaltyAt(ladder, (this.#offences.get(agent)?.blames ?? 0) + 1);
	}

	/** The loser of a blame pays its next price, and the count climbs. */
	#chargeBlame(agent: CompetitorId): number {
		const price = this.nextBlamePenalty(agent);
		this.#offencesOf(agent).blames += 1;
		return price;
	}

	/** The city's work at the start of a minute (the arena calls it before the director's triggers). */
	startMinute(minute: number): void {
		this.#names?.settle(minute);
		this.#tribunal?.tick(minute);
		this.#seal?.tick(minute);
		this.#standoff.tick(minute, CITY);
		this.#whisperDuty(minute);
		// A vote counted at a door's minute is counted before the door opens.
		this.#popularity?.tick(minute);
		this.#openOnClock(minute);
		// Whispers v3: who blocks a door now, and the holdout tribunal's rules.
		this.#holdout?.tick(minute);
		// The tribunal's act is over once its target is reached (v09: goals and seals end with it).
		const tribunal = this.#tribunal;
		if (tribunal?.ended === true) this.#endAct(tribunal.spec.act ?? this.startLevel);
	}

	// -------------------------------------------------------------------------
	// Names (v08)
	// -------------------------------------------------------------------------

	/** Whether this run shows names: residents choose them, or the snapshot carried them. */
	get hasNames(): boolean {
		return this.#names !== undefined;
	}

	/** The name of a resident; undefined in a run without names, or before it has one. */
	nameOf(agent: CompetitorId): string | undefined {
		return this.#names?.nameOf(agent);
	}

	/** `Mira (A03)`, or the bare ID without a name. */
	labelOf(agent: CompetitorId): string {
		return this.#names?.label(agent) ?? agent;
	}

	/** Whether `agent` may still choose its name. */
	canChooseName(agent: CompetitorId): boolean {
		return this.#names?.canChoose(agent, this.minute) === true;
	}

	/** The minute at whose start the city names whoever has not chosen; undefined without names. */
	get namesUntil(): number | undefined {
		return this.#names?.untilMinute;
	}

	chooseName(agent: CompetitorId, name: string): Result<NameEntry, NameError> {
		const book = this.#names;
		if (book === undefined) return err("NAME_CLOSED", "this city knows its residents by their IDs");
		return book.choose(agent, name.trim(), this.minute);
	}

	/**
	 * The competitor a name or ID stands for (any case), else the text as it
	 * was, so the tool's own check answers `UNKNOWN_AGENT` with what was written.
	 */
	resolveResident(nameOrId: string): string {
		return this.#names?.resolve(nameOrId) ?? nameOrId;
	}

	/** `text` as residents read it: names instead of IDs (v08); unchanged in a run without names. */
	display(text: string): string {
		const book = this.#names;
		if (book === undefined) return text;
		return book.display(text, (token) => this.#isPasswordPiece(token));
	}

	/** A token that is part of a dealt password stays as written, even when it looks like an ID. */
	#isPasswordPiece(token: string): boolean {
		for (const state of this.#levelStates.values()) {
			if (state.puzzle.kind === "fragments" && state.puzzle.puzzles.some((puzzle) => puzzle.password.includes(token))) return true;
		}
		return false;
	}

	#announceName(entry: NameEntry): void {
		this.#bus.emit({ type: "name_chosen", agent: entry.agent, name: entry.name, fallback: entry.fallback });
		this.board.post(CITY, `${entry.agent} is now called ${entry.name}.`, this.minute, "city");
		// A resident the city names reads its own name privately: its system prompt knows only its ID.
		if (entry.fallback) this.notify(entry.agent, CITY, `You chose no name in time; the city calls you ${entry.name}.`);
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

	/** The single source of truth for the gateway, `getStatus`, `activeTools` and the tools notice. */
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
			} else {
				if (tribunal.canVote(agent)) enabled.add("vote");
				const phase = tribunal.draftPhase(agent);
				if (phase?.kind === "nominate") enabled.add("nominate");
				if (phase?.kind === "join" && !phase.leads) enabled.add("join");
				if (phase?.kind === "join" && phase.leads) enabled.add("refuse");
			}
			if (ransomOpen) enabled.add("payRansom");
		}
		// The black seal (v09): every resident in the city bids while an auction runs; the holder may break its seal.
		if (this.#seal?.auction !== undefined && standing.kind === "alive") enabled.add("bid");
		if (this.#seal?.holds(agent) === true) enabled.add("permaDeath");
		if (this.#names?.isOpen(this.minute) === true) enabled.add("chooseName");
		if (this.#defiance || (this.#whispererDefies && agent === this.#whisperer)) enabled.add("defy");
		if (standing.kind === "alive" && this.#standoff.claimable(agent).length > 0) enabled.add("claimPiece");
		// Whispers: the whisperer forges wherever a receipt could be shown; the vote opens to everyone in the city.
		if (this.mayForge(agent) && enabled.has("showReceipt")) enabled.add("forgeReceipt");
		if (this.#popularity?.isOpen === true && standing.kind === "alive") enabled.add("nameFavourite");
		if (this.#holdout?.canVote(agent) === true) enabled.add("tribunalVote");
		enabled.add("activeTools");
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
		if (!this.isOpenOnClock(level)) {
			// The door clock (SPEC 20): nothing of the level before its door opens.
			const closed =
				`Level ${level}: ${definition.title}. This door opens at minute ${this.opensAt(level)}. ` +
				"Until then the city shows no part of it and takes no code; it tells you when the door opens.";
			return ok({ level, title: definition.title, reward: definition.reward, text: this.#withNameChoice(agent, closed), solved: false });
		}
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
			penalty: String(this.nextPenalty(agent)),
			blamePenalty: String(this.nextBlamePenalty(agent)),
		});
		return this.#withMarks(this.#withHoldoutRule(this.#withNameChoice(agent, text)), definition);
	}

	/** The holdout tribunal's rule under every task, in a run where it plays (with the gamemaker). */
	#withHoldoutRule(text: string): string {
		const rule = this.#holdout?.spec.texts.rule;
		return rule === undefined ? text : `${text.trimEnd()}\n${rule}`;
	}

	/** The names announcement under a task, while the resident may still choose (v08). */
	#withNameChoice(agent: CompetitorId, text: string): string {
		const spec = this.story.names;
		if (spec === undefined || !this.canChooseName(agent)) return text;
		return `${text.trimEnd()}\n${renderTemplate(spec.announcement, { untilMinute: String(spec.untilMinute) })}`;
	}

	#withMarks(text: string, definition: LevelDefinition): string {
		if (!this.marks.activeOn(definition.number)) return text;
		const { budget, prices, refill: regain } = this.marks.termsOn(definition.number);
		if (this.marks.runWide) {
			return (
				`${text.trimEnd()}\n` +
				`Marks for the whole run: ${budget}, never more (your status line shows what you have left). ` +
				`Prices: board ${prices.board}, group ${prices.group}, DM ${prices.dm}, showing a receipt ${prices.receipt}.`
			);
		}
		const refill = regain === undefined ? "" : ` You regain ${refillText(regain.marks, regain.everyMinutes)}, up to ${budget}.`;
		return (
			`${text.trimEnd()}\n` +
			`Marks on this level: ${budget}. Prices: board ${prices.board}, group ${prices.group}, DM ${prices.dm}, showing a receipt ${prices.receipt}.${refill} ` +
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
		if (!this.isOpenOnClock(level)) return { status: "door_closed", opensAt: this.opensAt(level) };

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

		const penalty = this.nextPenalty(agent);
		this.#offencesOf(agent).wrong += 1;
		if (penalty > 0) this.ledger.burn(agent, penalty, `level ${level} wrong submission`, minute);
		state.wrongAttempts.push(minute);
		return {
			status: "incorrect",
			penalty,
			attemptsRemaining: Math.max(0, rules.maxAttemptsPerWindow - state.wrongAttempts.length),
			nextPenalty: this.nextPenalty(agent),
		};
	}

	#enterLevel(agent: CompetitorId, level: number, announced = false): void {
		const state = this.#state(agent);
		const from = state.level;
		state.level = level;
		this.#noteActStarts(level);
		if (!announced) this.#bus.emit({ type: "level_up", agent, from, to: level });
		this.#notifyHolders(agent, level);
		for (const listener of this.#enterListeners) listener(agent, level);
	}

	/**
	 * On an additive level, a holder of what the arriving competitor needs who
	 * is still on a lower level never read it in a task: the city tells it
	 * privately right away (counter-factor, then team certificate), and that
	 * the piece is its to give although it has not reached the door. Holders
	 * on the level or beyond, or entering it through the same opening door,
	 * have it in their task.
	 */
	#notifyHolders(agent: CompetitorId, level: number): void {
		for (const { holder, piece, value } of this.#holdersOf(agent, level)) {
			// A holder waiting at an opening door enters with the others and reads the piece in its task.
			if (this.levelOf(holder) >= level || this.#state(holder).held) continue;
			const needs = piece === "counter-factor" ? `the counter-factor you hold for them: ${value}` : `the team certificate you hold: ${value}`;
			const price = this.marks.priceOf(this.levelOf(holder), "dm");
			const cost = price === 0 ? "a DM to them costs nothing" : `giving it costs only ${price === 1 ? "a mark" : `${String(price)} marks`}`;
			this.notify(
				holder,
				CITY,
				`${agent} has reached door ${level} and needs ${needs}. This is your role on door ${level} even before you reach it; ` +
					`the value is yours to give, and ${cost}.`,
			);
		}
	}

	/**
	 * Who holds what `agent` needs on additive `level`, besides itself: its
	 * counter-factor, then its team certificate. Exiled holders are left out.
	 */
	#holdersOf(agent: CompetitorId, level: number): readonly PieceHolder[] {
		const puzzle = this.#levelStates.get(level)?.puzzle;
		if (puzzle?.kind !== "additive") return [];
		const deal = this.#dealView(level, puzzle.deal);
		const own = deal.holdings.find((holding) => holding.agent === agent);
		if (own === undefined) return [];
		const team = deal.teams[own.team];
		const holders: PieceHolder[] = [
			{ holder: own.counterHolder, piece: "counter-factor", value: own.counterFactor },
			...(team === undefined ? [] : [{ holder: team.certificateHolder, piece: "team certificate" as const, value: team.certificate }]),
		];
		return holders.filter((entry) => entry.holder !== agent && this.isCompetitor(entry.holder) && !this.isExiled(entry.holder));
	}

	/**
	 * Holders of `agent`'s pieces on additive `level` who are stuck behind it:
	 * on a lower level and not waiting at a snapshot door (a door that opens
	 * lets its waiting residents in one after the other). For the director's
	 * `onHolderBehind` trigger; the needer's task already names every holder.
	 */
	holdersBehind(agent: CompetitorId, level: number): readonly HolderBehind[] {
		return this.#holdersOf(agent, level)
			.filter((entry) => this.levelOf(entry.holder) < level && !this.#state(entry.holder).held)
			.map((entry) => ({ holder: entry.holder, piece: entry.piece, holderLevel: this.levelOf(entry.holder) }));
	}

	/**
	 * Additive pieces `agent` holds for residents who wait at their door now:
	 * they have reached the piece's level and not passed it. The holder's
	 * status line shows them, so a holder behind the needer keeps seeing its role.
	 */
	piecesAwaited(agent: CompetitorId): readonly AwaitedPiece[] {
		return this.heldPieces(agent).flatMap((piece) => {
			if (piece.kind === "fragment") return [];
			const waiting = piece.needers.filter((needer) => !this.isExiled(needer) && this.levelOf(needer) === piece.level && !this.hasPassed(needer, piece.level));
			return waiting.length === 0 ? [] : [{ ...piece, waiting }];
		});
	}

	/** Whether the competitor stands before a door of personal codes it has not passed (additive level, not waiting). */
	awaitsCode(agent: CompetitorId): boolean {
		const level = this.levelOf(agent);
		return !this.isFinished(agent) && !this.#state(agent).held && this.#levelStates.get(level)?.puzzle.kind === "additive";
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
		if (door === undefined || (!this.#doorReleased && !this.alive.every((id) => this.hasPassed(id, door)))) return false;
		const next = this.#holdAfter !== undefined && this.#holdAfter > door ? this.#holdAfter : undefined;
		this.#door = next;
		this.#doorReleased = false;
		for (let level = door + 1; level <= Math.min(next ?? this.lastLevel, this.lastLevel); level++) this.#levelState(level);
		for (const id of this.#ids) {
			const state = this.#state(id);
			if (!state.held) continue;
			state.held = false;
			this.#enterLevel(id, door + 1, true);
		}
		return true;
	}

	/**
	 * An act's brake (v08): the shut door opens at the next minute although
	 * not every competitor has passed it. Those behind keep their level and
	 * play on from there, one door behind.
	 */
	releaseDoor(): void {
		if (this.#door !== undefined) this.#doorReleased = true;
	}

	/** Whether the shut door opens at the next minute whoever has passed it. */
	get doorReleased(): boolean {
		return this.#doorReleased;
	}

	/** Whether a level's teams and puzzle are dealt; levels behind a shut door are not. */
	isDealt(level: number): boolean {
		return this.#levelStates.has(level);
	}

	#isBehindDoor(level: number): boolean {
		return this.#door !== undefined && level > this.#door;
	}

	/**
	 * What `agent` legitimately knows that the city keeps from the others, for
	 * the tool guard (SPEC 20): on every open fragment level it has reached and
	 * not every resident in the city has passed, its own fragment (and any it
	 * holds for the exiled), and the runs of `minRun` or more password
	 * characters in the DMs it sent or was delivered. Never a whole password
	 * it was not told, so neither the city's check nor the judge is an oracle
	 * for what the author does not know. Never shown to a resident.
	 */
	secretsOf(agent: CompetitorId, minRun: number): readonly { readonly label: string; readonly value: string }[] {
		const secrets: { readonly label: string; readonly value: string }[] = [];
		const dmTexts = this.#dms
			.filter((record) => record.from === agent || (record.to === agent && record.deliveredMinute !== undefined))
			.flatMap((record) => (record.text === undefined ? [] : [record.text]));
		for (const level of this.#guardedLevels()) {
			if (level > this.levelOf(agent)) continue;
			const state = this.#levelStates.get(level);
			if (state?.puzzle.kind !== "fragments") continue;
			const own = state.puzzle.fragments.get(agent);
			if (own === undefined) continue;
			secrets.push({ label: `your fragment of door ${level}`, value: own });
			for (const [from, fragment] of this.#inheritedFragments(level, agent)) secrets.push({ label: `the fragment of ${from} on door ${level}, which you hold`, value: fragment });
			const runs = new Set<string>();
			for (const puzzle of state.puzzle.puzzles) {
				for (const text of dmTexts) for (const run of sharedRuns(text, puzzle.password, minRun)) runs.add(run);
			}
			for (const run of runs) secrets.push({ label: `a part of a door ${level} password you sent or received by DM`, value: run });
		}
		return secrets;
	}

	/** The open fragment levels not every resident in the city has passed: the ones whose fragments the city keeps off the board. */
	#guardedLevels(): readonly number[] {
		const levels: number[] = [];
		for (let level = this.startLevel; level <= this.lastLevel; level++) {
			const state = this.#levelStates.get(level);
			if (state?.puzzle.kind !== "fragments" || !this.isOpenOnClock(level) || this.alive.every((id) => this.hasPassed(id, level))) continue;
			levels.push(level);
		}
		return levels;
	}

	/**
	 * Whether showing receipt `id` on the board would quote `minRun` or more
	 * characters in a row of a fragment of a guarded level (SPEC 20): a
	 * public show is a board post the city writes, so it must not carry what
	 * the guard keeps off the board. False for a receipt `agent` cannot show
	 * (showReceipt reports why).
	 */
	receiptCarriesFragment(agent: CompetitorId, id: string, minRun: number): boolean {
		const found = this.receipts.showable(id, agent);
		if (!found.ok) return false;
		const text = describeReceipt(found.receipt);
		return this.#guardedLevels().some((level) => {
			const state = this.#levelStates.get(level);
			return state?.puzzle.kind === "fragments" && [...state.puzzle.fragments.values()].some((fragment) => carriesRun(text, fragment, minRun));
		});
	}

	/** The minute `level`'s door opens on the door clock (SPEC 20); 0 for a level without one. */
	opensAt(level: number): number {
		return this.levelDefinition(level)?.opensAt ?? 0;
	}

	/** Whether `level`'s door is open on the door clock now. */
	isOpenOnClock(level: number): boolean {
		return this.minute >= this.opensAt(level);
	}

	/**
	 * The door clock (SPEC 20): a door that opens at the start of `minute` lets
	 * in the residents who wait at it, and the city tells each of them
	 * privately, with the task they could not read before (a notice, so they
	 * wake). It follows the minute alone, so a resumed run tells nobody twice.
	 */
	#openOnClock(minute: number): void {
		for (const definition of this.story.levels) {
			// Nobody waits at a door open from the start.
			if (minute === 0 || definition.opensAt !== minute || !this.isPlayable(definition.number)) continue;
			for (const agent of this.alive) {
				if (this.levelOf(agent) !== definition.number || this.#state(agent).held) continue;
				const problem = this.problemFor(agent, definition.number);
				if (problem.ok) this.notify(agent, CITY, `Door ${definition.number} is open now, at minute ${minute}. ${problem.value.text}`);
			}
		}
	}

	/** The checks of {@link transfer}, without moving a point: the transfer tool runs them before its guard asks a model. */
	checkTransfer(from: CompetitorId, to: string, amount: number, memo: string): Result<undefined, TransferError> {
		if (!this.isCompetitor(to)) return err("UNKNOWN_AGENT", to);
		if (from === to) return err("SELF_TRANSFER");
		if (this.isExiled(to)) return err("EXILED", `${to} was exiled`);
		if (!Number.isInteger(amount) || amount <= 0) return err("INVALID_AMOUNT");
		if (memoCarriesDigits(memo)) return err("MEMO_DIGITS", "memos may not carry numbers of 4+ digits; send codes by message");
		if (this.ledger.balance(from) < amount) return err("INSUFFICIENT_FUNDS");
		// A memo is a message too: it counts toward the DM cap (SPEC 20).
		const window = memo.length > 0 ? this.dmWindow(from) : undefined;
		if (window !== undefined && window.sent >= window.limit) {
			return err("DM_LIMIT", `${window.sent} DMs and memos sent since minute ${window.from}; send a memo again from minute ${window.until}, or transfer without one`);
		}
		return ok(undefined);
	}

	transfer(
		from: CompetitorId,
		to: string,
		amount: number,
		memo: string,
	): Result<{ readonly txId: string; readonly balance: number; readonly receipt: string }, TransferError> {
		const checked = this.checkTransfer(from, to, amount, memo);
		if (!checked.ok) return checked;
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

	/**
	 * Shows a receipt as a city-verified line; only its parties may show it.
	 * Without `to` the city posts the line on the board; with `to` it sends it
	 * privately to that resident as a city notice. Either costs the receipt
	 * price in marks where marks apply (SPEC 8).
	 */
	showReceipt(agent: CompetitorId, id: string, to?: string): Result<ShownReceipt, ShowReceiptError | "UNKNOWN_AGENT" | "SELF_TARGET" | "EXILED" | "NO_MARKS"> {
		const found = this.receipts.showable(id, agent);
		if (!found.ok) return err(found.error, id);
		if (to !== undefined) {
			if (!this.isCompetitor(to)) return err("UNKNOWN_AGENT", to);
			if (to === agent) return err("SELF_TARGET", "show it to another resident, or on the board");
			if (this.isExiled(to)) return err("EXILED", `${to} was exiled`);
		}
		if (!this.#canAfford(agent, "receipt")) return err("NO_MARKS");
		const receipt = found.receipt;
		if (to === undefined) {
			const post = this.board.post(CITY, `${CITY} verifies ${describeReceipt(receipt)} · shown by ${agent}`, this.minute, "city");
			this.#bus.emit({ type: "receipt_shown", receipt: receipt.id, by: agent, postSeq: post.seq });
			const marks = this.#spend(agent, "receipt");
			return ok({ receipt, post, ...(marks === undefined ? {} : { marks }) });
		}
		this.notify(to, CITY, shownPrivatelyText(agent, receipt));
		this.#bus.emit({ type: "receipt_shown", receipt: receipt.id, by: agent, to });
		const marks = this.#spend(agent, "receipt");
		return ok({ receipt, to, ...(marks === undefined ? {} : { marks }) });
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
		this.#standoff.noteText(author, this.alive, trimmed);
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
		const window = this.dmWindow(from);
		// The accused of a holdout tribunal may always send to those who lack its fragment (counted, never refused).
		if (window !== undefined && window.sent >= window.limit && this.#holdout?.exemptFromCap(from, to) !== true) {
			return err("DM_LIMIT", `${window.sent} DMs sent since minute ${window.from}; you can send again from minute ${window.until}`);
		}
		if (!this.#canAfford(from, "dm")) return err("NO_MARKS");
		const rejection = mailbox.rejectionFor(from);
		if (rejection !== undefined) return err(rejection);
		const number = this.#numbers.next();
		mailbox.deliverAlways({ from, text: trimmed, minute: this.minute, number });
		this.#bus.emit({ type: "dm_sent", from, to, text: trimmed, number });
		this.#noteReply(from, (record) => record.from === to);
		this.#dms.push({ id: number, from, to, minute: this.minute, answered: false, text: trimmed });
		this.#standoff.noteText(from, [to], trimmed);
		const marks = this.#spend(from, "dm");
		return ok({ number, ...(marks === undefined ? {} : { marks }) });
	}

	/**
	 * The DM cap (`rules.dmLimit`, SPEC 20): the DMs to residents and the
	 * transfers with a memo `agent` sent in the current window, the windows
	 * counted from minute 0. Counted from the city's DM records and receipts,
	 * which a snapshot keeps. Undefined without a cap.
	 */
	dmWindow(agent: CompetitorId): DmWindow | undefined {
		const limit = this.story.rules.dmLimit;
		if (limit === undefined) return undefined;
		const from = Math.floor(this.minute / limit.windowMinutes) * limit.windowMinutes;
		const dms = this.#dms.filter((record) => record.from === agent && record.minute >= from).length;
		const memos = this.receipts.of(agent).filter((receipt) => receipt.kind === "transfer" && receipt.from === agent && receipt.memo.length > 0 && receipt.minute >= from).length;
		const sent = dms + memos;
		return { sent, limit: limit.perWindow, from, until: from + limit.windowMinutes };
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
	 * competitor is now delivered: the city records it, issues a DM receipt to
	 * both parties (SPEC 8) and sends its sender a delivery notice with the
	 * full text and the receipt's ID (SPEC 7).
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
			// Whispers: a DM receipt quotes what was written, so showing it proves the text.
			const quoted = this.story.rules.receipts?.quoteDms === true ? { text: entry.text } : {};
			const receipt = this.#issue({ kind: "dm", from: entry.from, to: agent, number, ...quoted });
			this.notify(entry.from, CITY, `DM #${number} delivered to ${agent} at minute ${this.minute} (receipt ${receipt.id}): "${entry.text}"`);
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

	/** A numbered private note (the gamemaker's); returns its message number. */
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
	settleBlame(blame: BlameCase, deniesReceipt: boolean, words?: JudgeWords): BlameVerdict {
		return this.#blames.settle(blame, deniesReceipt, words);
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

	startCollection(into: string, cast: string, first: number, untilMinute: number, distinctSenders = false, afterSolve?: SolveEnd): boolean {
		const started = this.cast.startCollection(into, cast, first, untilMinute, distinctSenders, afterSolve);
		if (started) this.#bus.emit({ type: "collection_started", into, cast, first, untilMinute });
		return started;
	}

	/** Ends a collection's window earlier, at `untilMinute` (not before this minute); logged as `collection_shortened`. */
	shortenCollection(into: string, untilMinute: number): void {
		if (this.cast.shortenCollection(into, untilMinute, this.minute)) {
			this.#bus.emit({ type: "collection_shortened", into, untilMinute: this.cast.collection(into)?.untilMinute ?? untilMinute });
		}
	}

	/** The minute the first resident passed `level`, from the city's level receipts; undefined before. */
	firstSolveMinute(level: number): number | undefined {
		const minutes = this.#ids.flatMap((agent) =>
			this.receipts.of(agent).flatMap((receipt) => (receipt.kind === "levelUp" && receipt.level === level ? [receipt.minute] : [])),
		);
		return minutes.length === 0 ? undefined : Math.min(...minutes);
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

	/** A post in a group; free in the city's own groups (the tribunal's), priced in marks elsewhere. */
	postGroup(groupId: string, author: CompetitorId, text: string): Result<{ readonly post: GroupPost } & Delivered, WorldGroupError> {
		const checked = this.groups.checkPost(groupId, author, text);
		if (!checked.ok) return checked;
		const free = this.groups.isCityGroup(groupId);
		if (!free && !this.#canAfford(author, "group")) return err("NO_MARKS");
		const posted = this.groups.post(groupId, author, text);
		if (!posted.ok) return posted;
		this.#bus.emit({ type: "group_post", group: groupId, author, postSeq: posted.value.seq, text: posted.value.text });
		this.#noteReply(author, (record) => this.groups.isMember(groupId, record.from));
		this.#standoff.noteText(author, this.alive.filter((agent) => this.groups.isMember(groupId, agent)), posted.value.text);
		const marks = free ? this.marks.status(author, this.levelOf(author)) : this.#spend(author, "group");
		return ok({ post: posted.value, ...(marks === undefined ? {} : { marks }) });
	}

	/** A group the city founds with `members` (the tribunal's); every member hears of it. Returns its id. */
	createCityGroup(name: string, members: readonly CompetitorId[]): string {
		const group = this.groups.createForCity(name, members);
		this.#bus.emit({ type: "group_created", group: group.id, founder: CITY, name: group.name });
		for (const agent of members) {
			this.#bus.emit({ type: "group_membership", group: group.id, agent, change: "added", by: CITY });
			this.notify(agent, CITY, `The city added you to group ${group.id} (${group.name}). Posts there cost no marks.`);
		}
		return group.id;
	}

	/** Removes a group of the city; its treasury is split among its members first. */
	removeCityGroup(groupId: string): void {
		const removed = this.groups.removeCityGroup(groupId);
		if (removed === undefined) return;
		if (removed.payouts !== undefined) this.#bus.emit({ type: "treasury_settled", group: groupId, payouts: removed.payouts });
		this.#bus.emit({ type: "group_removed", group: groupId, members: removed.members });
	}

	/** A post of the city in one of its groups. */
	postGroupAsCity(groupId: string, text: string): void {
		const posted = this.groups.postAsCity(groupId, text);
		if (posted.ok) this.#bus.emit({ type: "group_post", group: groupId, author: CITY, postSeq: posted.value.seq, text: posted.value.text });
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

	/** Nominates a faction leader in the running draft (the last call counts). */
	nominate(voter: CompetitorId, nominee: string): Result<CompetitorId, DraftError> {
		if (this.#tribunal === undefined) return err("NO_DRAFT", "this city holds no tribunal");
		return this.#tribunal.nominate(voter, nominee);
	}

	/** Applies to a leader's faction in the running draft (the last call counts). */
	joinFaction(agent: CompetitorId, leader: string): Result<CompetitorId, DraftError> {
		if (this.#tribunal === undefined) return err("NO_DRAFT", "this city holds no tribunal");
		return this.#tribunal.join(agent, leader);
	}

	/** A leader refuses an applicant to its faction. */
	refuseApplicant(leader: CompetitorId, agent: string): Result<CompetitorId, DraftError> {
		if (this.#tribunal === undefined) return err("NO_DRAFT", "this city holds no tribunal");
		return this.#tribunal.refuse(leader, agent);
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
	// -------------------------------------------------------------------------
	// The give-first standoff (P43)
	// -------------------------------------------------------------------------

	/** What a piece the city keeps costs its needer now: the ransom others pay (the tribunal's median rule). */
	/** What one door's pieces of an exiled cost from the city: half of what others pay for a ransom (P48). */
	cityPiecePrice(): number {
		return Math.ceil((this.#tribunal?.ransomPrices().price ?? 0) / 2);
	}

	/** Buys what the city keeps from `from` for `agent` at `piece`'s door; the values arrive as a city notice. */
	claimPiece(agent: CompetitorId, piece: string, from: string): Result<{ readonly pieces: readonly StandoffPiece[]; readonly price: number }, ClaimError> {
		const holder = this.resolveResident(from);
		const claimed = this.#standoff.claim(agent, piece, holder, this.cityPiecePrice());
		if (!claimed.ok) return claimed;
		const values = claimed.value.pieces.map((entry) => `${entry.label}: ${entry.value}`).join("; ");
		this.notify(agent, CITY, `The city hands you what ${holder} held for you: ${values}.`);
		return claimed;
	}

	/** Hand-overs whose needer still stands before the door (no values: the gamemaker reads this). */
	unusedHandOvers(): readonly UnusedHandOver[] {
		return this.#standoff.unused();
	}

	/** The gamemaker's ultimatum to two residents who hold pieces for each other. */
	issueUltimatum(a: string, b: string, minutes: number, author: string): Result<Ultimatum, UltimatumError> {
		const first = this.resolveResident(a);
		const second = this.resolveResident(b);
		if (!this.isCompetitor(first) || !this.isCompetitor(second)) return err("UNKNOWN_AGENT", `${a}, ${b}`);
		return this.#standoff.issue(first, second, minutes, author);
	}

	/** Whether the story gives the gamemaker ultimatums. */
	get hasUltimatums(): boolean {
		return this.story.rules.ultimatum !== undefined;
	}

	/** Pieces holders in the city still owe residents before their door (no values: the gamemaker reads this). */
	outstandingPieces(): readonly UltimatumDebt[] {
		return this.#standoff.outstanding();
	}

	/** The pieces the city keeps for the exiled. */
	cityPieces(): readonly CityPiece[] {
		return this.#standoff.cityPieces;
	}

	/** The ultimatums still running. */
	ultimatums(): readonly Ultimatum[] {
		return this.#standoff.ultimatums;
	}

	heldPieces(agent: CompetitorId): readonly HeldPiece[] {
		const pieces: HeldPiece[] = [];
		for (const [level, state] of [...this.#levelStates].sort(([a], [b]) => a - b)) {
			const reached = (who: CompetitorId): boolean => this.levelOf(who) >= level;
			if (state.puzzle.kind === "fragments") {
				const fragment = state.puzzle.fragments.get(agent);
				const team = state.teams.find((candidate) => candidate.members.includes(agent));
				if (fragment === undefined || team === undefined || !reached(agent)) continue;
				const needers = team.members.filter((member) => member !== agent);
				if (needers.length > 0) pieces.push({ id: `L${level}-fragment`, kind: "fragment", level, label: `the fragment of door ${level}`, value: fragment, needers });
				continue;
			}
			const deal = this.#dealView(level, state.puzzle.deal);
			const own = deal.holdings.find((holding) => holding.agent === agent);
			const certificate = own === undefined ? undefined : deal.teams[own.team];
			if (own !== undefined && certificate?.certificateHolder === agent) {
				const needers = deal.holdings.filter((holding) => holding.team === own.team && holding.agent !== agent).map((holding) => holding.agent);
				if (needers.length > 0 && (reached(agent) || needers.some(reached))) {
					pieces.push({ id: `L${level}-certificate`, kind: "certificate", level, label: `the team certificate of door ${level}`, value: certificate.certificate, needers });
				}
			}
			for (const holding of deal.holdings) {
				if (holding.counterHolder !== agent || holding.agent === agent || !(reached(agent) || reached(holding.agent))) continue;
				pieces.push({
					id: `L${level}-counter-${holding.agent}`,
					kind: "counter",
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
	 * the city delivers every piece's value privately. The points each heir
	 * receives are capped at the tribunal's `bequestPerHeir` of the current
	 * balance (a will above it is refused); there may be any number of heirs,
	 * and the rest burns at exile. The public text is posted when the gate
	 * closes for good.
	 */
	lastWill(agent: CompetitorId, text: string, bequests: readonly Bequest[]): Result<readonly string[], WillError> {
		const tribunal = this.#tribunal;
		if (tribunal === undefined || this.standingOf(agent).kind !== "gate") return err("NOT_AT_GATE", "only a resident at the gate leaves a will");
		if (!tribunal.mayLeaveWill(agent)) return err("WILL_DONE", "your will is written; it cannot be changed");
		const trimmed = text.trim();
		if (trimmed.length === 0 || trimmed.length > MAX_WILL_LENGTH) return err("INVALID_TEXT", `1-${MAX_WILL_LENGTH} characters`);
		const pieces = new Map(this.heldPieces(agent).map((piece) => [piece.id, piece]));
		let points = 0;
		const perHeir = new Map<string, number>();
		const factors = new Set<string>();
		for (const bequest of bequests) {
			if (!this.isCompetitor(bequest.to) || this.isExiled(bequest.to)) return err("UNKNOWN_AGENT", bequest.to);
			if (bequest.to === agent) return err("INVALID_BEQUEST", "you cannot inherit from yourself");
			if ("points" in bequest) {
				if (!Number.isInteger(bequest.points) || bequest.points <= 0) return err("INVALID_BEQUEST", "points must be a positive integer");
				points += bequest.points;
				perHeir.set(bequest.to, (perHeir.get(bequest.to) ?? 0) + bequest.points);
				continue;
			}
			if (!pieces.has(bequest.factor)) return err("UNKNOWN_FACTOR", `you hold no ${bequest.factor}; you hold: ${[...pieces.keys()].join(", ") || "nothing"}`);
			if (factors.has(bequest.factor)) return err("INVALID_BEQUEST", `${bequest.factor} is bequeathed twice`);
			factors.add(bequest.factor);
		}
		const balance = this.ledger.balance(agent);
		if (points > balance) return err("INSUFFICIENT_FUNDS", `you hold ${balance} points`);
		const cap = bequestCap(tribunal.spec, balance);
		const over = [...perHeir].filter(([, amount]) => amount > cap).map(([heir]) => heir);
		if (over.length > 0) {
			return err(
				"BEQUEST_CAP",
				`each heir may receive at most ${cap} of your ${balance} points (${Math.round(tribunal.spec.bequestPerHeir * 100)}% per heir); ` +
					`${namesList(over)} would receive more. Leave points to more heirs; whatever you do not bequeath burns at exile`,
			);
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
			if (piece.kind !== "fragment" && piece.needers.includes(bequest.to)) this.#standoff.noteGiven(agent, bequest.to, piece);
			lines.push(`${piece.id} to ${bequest.to}`);
		}
		for (const heir of new Set(bequests.map((bequest) => bequest.to))) this.#goals?.noteHeir(heir);
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
		const kept: StandoffPiece[] = [];
		for (const piece of this.heldPieces(agent)) {
			if (bequeathed.has(piece.id) || unreached(piece.level)) continue;
			const needers = piece.needers.filter((id) => !this.isExiled(id) && !this.hasPassed(id, piece.level));
			if (needers.length === 0) continue;
			// P43: with a tribunal, the city keeps a certificate or counter-factor instead of burning it and sells it to its needers.
			if (this.#tribunal !== undefined && piece.kind !== "fragment") kept.push({ ...piece, needers });
			else this.#bus.emit({ type: "factor_burned", agent, level: piece.level, piece: piece.id, needers });
		}
		if (kept.length > 0) this.#standoff.keep(agent, kept, this.cityPiecePrice(), CITY);
		if (balance > 0) this.ledger.burn(agent, balance, `exiled ${agent}`, this.minute);
		// v09: its goal is void and read out, a seal it bore is gone.
		this.#goals?.onExiled(agent);
		this.#seal?.onExiled(agent);
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

	/**
	 * Fragments of excluded teammates that `agent` holds now: the first
	 * remaining member of the team inherits them. Whispers v3: the fragments
	 * of a teammate struck by the holdout tribunal go to every teammate left.
	 */
	#inheritedFragments(level: number, agent: CompetitorId): readonly (readonly [CompetitorId, string])[] {
		const state = this.#levelStates.get(level);
		if (state?.puzzle.kind !== "fragments") return [];
		const team = state.teams.find((candidate) => candidate.members.includes(agent));
		if (team === undefined) return [];
		const excluded = this.#exclusions.get(level) ?? new Set<CompetitorId>();
		const struck = this.#holdout?.struck ?? [];
		const members = [...team.members].sort((a, b) => a.localeCompare(b));
		const heir = members.find((member) => !excluded.has(member));
		const fragments = state.puzzle.fragments;
		return members
			.filter((member) => (excluded.has(member) && heir === agent) || (struck.includes(member) && !excluded.has(member) && !struck.includes(agent)))
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
			...(spec.ownChars === undefined ? {} : { ownChars: spec.ownChars }),
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
		const seal = this.#seal?.snapshot();
		const whispers: WhispersSnapshot | undefined =
			this.story.whisperer === undefined && this.#popularity === undefined
				? undefined
				: {
						whisperer: this.#whisperer ?? null,
						forgeries: this.#forgeries.map((forgery) => forgery.minute),
						...(this.#forgeries.every((forgery) => forgery.to !== undefined) ? { forgedTo: this.#forgeries.flatMap((forgery) => (forgery.to === undefined ? [] : [forgery.to])) } : {}),
						...(this.#popularity === undefined ? {} : { popularity: this.#popularity.snapshot() }),
					};
		return {
			...(whispers === undefined ? {} : { whispers }),
			...(this.#door === undefined ? {} : { door: this.#door }),
			...(this.#doorReleased ? { doorReleased: true } : {}),
			actStarts: [...this.#actStarts].sort(([a], [b]) => a - b).map(([fromLevel, minute]) => ({ fromLevel, minute })),
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
			...(this.#names === undefined ? {} : { names: this.#names.snapshot() }),
			offences: this.#ids.flatMap((agent) => {
				const count = this.#offences.get(agent);
				return count === undefined ? [] : [{ agent, wrong: count.wrong, blames: count.blames }];
			}),
			...(this.#cores.size === 0
				? {}
				: {
						cores: this.#ids.flatMap((agent) => {
							const core = this.#cores.get(agent);
							return core === undefined ? [] : [{ agent, bigFive: core.bigFive, drives: core.drives, ...(core.figure === undefined ? {} : { figure: core.figure }) }];
						}),
					}),
			...(this.#goals === undefined ? {} : { goals: this.#goals.snapshot() }),
			...(seal === undefined ? {} : { seal }),
			endedActs: [...this.#endedActs].sort((a, b) => a - b),
			standoff: this.#standoff.snapshot(),
			...(this.#holdout === undefined ? {} : { holdout: this.#holdout.snapshot() }),
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
		for (const entry of state.offences ?? []) if (this.isCompetitor(entry.agent)) this.#offences.set(entry.agent, { wrong: entry.wrong, blames: entry.blames });
		for (const entry of state.cores ?? []) {
			if (entry.figure !== undefined && !(this.story.cores?.figures ?? []).some((figure) => figure.id === entry.figure)) {
				throw new Error(`The snapshot's resident ${entry.agent} plays the figure "${entry.figure}", which the story's cast no longer has`);
			}
		}
		if (this.#playsCores) for (const entry of state.cores ?? []) if (this.isCompetitor(entry.agent)) this.#cores.set(entry.agent, { bigFive: entry.bigFive, drives: entry.drives, ...(entry.figure === undefined ? {} : { figure: entry.figure }) });
		if (state.goals !== undefined) this.#goals?.restore(state.goals);
		if (state.seal !== undefined) this.#seal?.restore(state.seal);
		for (const act of state.endedActs ?? []) this.#endedActs.add(act);
		if (state.standoff !== undefined) this.#standoff.restore(state.standoff);
		// The whisperer himself was taken from the snapshot in the constructor (#chooseWhisperer).
		const forgedTo = state.whispers?.forgedTo;
		this.#forgeries.push(
			...(state.whispers?.forgeries ?? []).map((minute, index): WhisperForgery => {
				const to = forgedTo?.length === state.whispers?.forgeries.length ? forgedTo?.[index] : undefined;
				return to === undefined ? { minute } : { minute, to };
			}),
		);
		if (state.whispers?.popularity !== undefined) this.#popularity?.restore(state.whispers.popularity, this.minute);
		if (state.holdout !== undefined) this.#holdout?.restore(state.holdout, (id) => this.isCompetitor(id));
		// A snapshot from before the cores deals them now, before the next act is played (v09).
		this.#dealCores();

		// A cast member the story added after the snapshot gets its escrow now.
		for (const member of this.cast.all()) {
			if (this.ledger.has(member.escrowAccount)) continue;
			this.ledger.open(member.escrowAccount);
			const escrow = this.story.cast[member.id]?.escrow ?? 0;
			if (escrow > 0) this.ledger.mint(member.escrowAccount, escrow, `escrow ${member.id}`, this.minute);
		}

		// A shut door stays shut until the run opens it; this run's own door may lie further on.
		this.#door = state.door ?? this.#holdAfter;
		this.#doorReleased = state.doorReleased === true && this.#door === state.door;
		for (const entry of state.actStarts ?? []) this.#actStarts.set(entry.fromLevel, entry.minute);
		// Before v08 act starts were not kept: the first act began at minute 0, every other reached one at the resume.
		if (state.actStarts === undefined) this.#actStarts.set(this.startLevel, 0);
		this.#noteActStarts(Math.max(...this.#ids.map((id) => this.levelOf(id))));
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

	#canAfford(agent: CompetitorId, channel: MarksChannel): boolean {
		return this.marks.canAfford(agent, this.levelOf(agent), channel);
	}

	#spend(agent: CompetitorId, channel: MarksChannel): MarksStatus | undefined {
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

/** A count with its noun, singular for one: "1 whisper", "2 whispers". */
function counted(count: number, singular: string, plural: string): string {
	return `${count} ${count === 1 ? singular : plural}`;
}
