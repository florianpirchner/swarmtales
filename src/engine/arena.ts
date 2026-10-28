/**
 * The scheduler (SPEC §3). One round is one virtual minute of
 * `passesPerMinute` passes; in every pass each competitor gets at most one
 * step, in a fresh seeded order cut into blocks of `blockSize`.
 */
import type { VirtualClock } from "../core/clock.ts";
import { CITY, type CompetitorId } from "../core/ids.ts";
import type { Activation, ModelChoice, Persona } from "../story/types.ts";
import type { Director } from "./director.ts";
import type { EventBus, StandingRow } from "./events.ts";
import { activationOrder, blocksOf } from "./scheduler.ts";
import { digestLine, dmLine, noticeLine, statusLine, type TurnInput } from "./turn-input.ts";
import type { World } from "./world.ts";

/** Where a step sits in the minute, and when it may act. */
export interface StepSlot {
	/** Both counted from 1. */
	readonly pass: number;
	readonly block: number;
	/**
	 * Resolves once every competitor before this one in the block has finished
	 * its step. The model may be called before; its answer (text, tool calls,
	 * tool executions) must wait for the turn.
	 */
	readonly turn: Promise<void>;
}

/** A competitor as the scheduler sees it; the LLM runner implements it. */
export interface Competitor {
	readonly id: CompetitorId;
	/** Whether its last step ended with tool results the model has not answered yet. */
	readonly awaitsAnswer: boolean;
	/** One model call and that call's tool executions. */
	step(inputs: readonly TurnInput[], slot: StepSlot): Promise<void>;
}

/** Who plays a competitor: its model and persona (absent for the control group). */
export interface AgentProfile {
	readonly agent: CompetitorId;
	readonly model: ModelChoice;
	readonly persona?: Persona;
}

export interface Budget {
	readonly limitUsd: number;
	readonly spentUsd: () => number;
}

export interface ArenaOptions {
	readonly world: World;
	readonly director: Director;
	readonly bus: EventBus;
	readonly clock: VirtualClock;
	readonly competitors: readonly Competitor[];
	readonly activation: Activation;
	readonly passesPerMinute: number;
	readonly blockSize: number;
	/** Logged as `agent_profile` events right after `run_start`. */
	readonly profiles?: readonly AgentProfile[];
	/** End as soon as every competitor has passed the last level. */
	readonly stopWhenDone?: boolean;
	/** End once open rewards can no longer change who survives ("seats decided"). */
	readonly stopWhenSeatsDecided?: boolean;
	/** Checked after every round; a returned reason ends the run. */
	readonly stopWhen?: () => string | undefined;
	readonly budget?: Budget;
	readonly meta?: Readonly<Record<string, string>>;
	/** Labels every round's statements, after every round including the last, before the observer (classifier). */
	readonly interpreter?: RoundObserver;
	/** Looks at the city after every round, before the clock advances (game master). */
	readonly observer?: RoundObserver;
	/** Takes a run snapshot once every competitor has passed a level (SPEC 17). */
	readonly snapshot?: SnapshotRequest;
	/** Continues a run from a snapshot: the cut's round was the last one played. */
	readonly resume?: ArenaResume;
}

export interface RoundObserver {
	afterRound(round: number): Promise<void>;
}

/** What the scheduler remembers between activations: what each competitor was shown last. */
export interface ArenaSnapshot {
	/** Level whose task (or, past the last level, the finished notice) each competitor was given last. */
	readonly delivered: readonly { readonly agent: CompetitorId; readonly level: number; readonly finished: boolean }[];
	readonly seenPoints: readonly { readonly agent: CompetitorId; readonly points: number }[];
	readonly seenBoard: readonly { readonly agent: CompetitorId; readonly seq: number }[];
}

/** A round boundary: after `round_end`, the interpreter and the observer, before the clock advances. */
export interface ArenaCut {
	readonly round: number;
	readonly minute: number;
	readonly arena: ArenaSnapshot;
}

export interface SnapshotRequest {
	readonly afterLevel: number;
	/** Called once, at the first boundary where every competitor's level is above `afterLevel`; returns where it went. */
	readonly take: (cut: ArenaCut) => string;
	/** End the run right after the snapshot. */
	readonly stop: boolean;
}

export interface ArenaResume {
	/** The last round the snapshot's run played; the clock still shows its minute. */
	readonly round: number;
	readonly state: ArenaSnapshot;
}

interface SeenView {
	readonly points: number;
	readonly board: number;
}

export class Arena {
	readonly #options: ArenaOptions;
	readonly #byId: ReadonlyMap<CompetitorId, Competitor>;
	/** Level whose task text was delivered last. */
	readonly #deliveredLevel = new Map<CompetitorId, number>();
	readonly #seenPoints = new Map<CompetitorId, number>();
	readonly #seenBoard = new Map<CompetitorId, number>();
	/** Whether the delivered text was the finished notice; a resumed run with more levels delivers the task again. */
	readonly #deliveredFinished = new Map<CompetitorId, boolean>();
	#snapshotTaken = false;
	#finished = false;

	constructor(options: ArenaOptions) {
		this.#options = options;
		const ids = new Set(options.world.competitors);
		const byId = new Map<CompetitorId, Competitor>();
		for (const competitor of options.competitors) {
			if (!ids.has(competitor.id)) throw new Error(`Competitor ${competitor.id} is not part of the world`);
			if (byId.has(competitor.id)) throw new Error(`Duplicate competitor: ${competitor.id}`);
			byId.set(competitor.id, competitor);
		}
		for (const id of ids) if (!byId.has(id)) throw new Error(`No runner for competitor ${id}`);
		this.#byId = byId;
		if (options.resume !== undefined) this.#restore(options.resume.state);
	}

	get world(): World {
		return this.#options.world;
	}

	async run(): Promise<void> {
		if (this.#finished) throw new Error("A run can only be played once");
		const { world, director, bus, clock } = this.#options;
		const resume = this.#options.resume;
		// A resumed run's prefix already holds run_start; the composer logs run_resumed before the world is restored.
		if (resume === undefined) {
			bus.emit({
				type: "run_start",
				story: world.story.id,
				agents: world.competitors,
				minutes: clock.durationMinutes,
				seed: world.seed,
				...(this.#options.meta === undefined ? {} : { meta: this.#options.meta }),
			});
		}
		for (const profile of this.#options.profiles ?? []) {
			bus.emit({
				type: "agent_profile",
				agent: profile.agent,
				provider: profile.model.provider,
				model: profile.model.id ?? "-",
				...(profile.persona === undefined ? {} : { persona: profile.persona.name }),
			});
		}
		let reason: string | undefined;
		if (resume === undefined) {
			world.startMinute(clock.minute);
			director.startMinute(clock.minute);
		} else reason = this.#nextMinute();

		const first = resume === undefined ? 1 : resume.round + 1;
		for (let round = first; round <= clock.durationMinutes && reason === undefined; round++) {
			bus.emit({ type: "round_start", round });
			const activated = new Set<CompetitorId>();
			for (let pass = 1; pass <= this.#options.passesPerMinute && reason === undefined; pass++) {
				// Beyond the wall nobody hears the exiled again: no place in the order, no step, no log line.
				const order = activationOrder(world.seed, round, pass, world.competitors).filter((id) => !world.isExiled(id));
				const blocks = blocksOf(order, this.#options.blockSize);
				bus.emit({ type: "pass_start", round, pass, order, blocks });
				for (const [index, members] of blocks.entries()) {
					await this.#playBlock(members, pass, index + 1, activated);
					reason = this.#budgetReason();
					if (reason !== undefined) break;
				}
			}
			bus.emit({ type: "round_end", round, standings: this.#standings(activated) });
			// Labels are kept for the digest too, so the last round and a stopping run are classified as well,
			// unless the budget is spent: the classifier is paid too.
			if (reason === undefined) {
				await this.#options.interpreter?.afterRound(round);
				reason = this.#budgetReason();
			}
			// No look after the last round or once the run stops: its notes would never be read.
			if (reason === undefined && round < clock.durationMinutes && this.#stopReason() === undefined && this.#options.observer !== undefined) {
				await this.#options.observer.afterRound(round);
				reason = this.#budgetReason();
			}
			if (reason === undefined) {
				const stopped = this.#takeSnapshot(round);
				if (stopped !== undefined) {
					reason = stopped;
					break;
				}
			}
			const stop = this.#nextMinute();
			reason ??= stop;
		}

		world.closePetitions();
		world.settleTreasuries();
		this.#finished = true;
		bus.emit({ type: "run_end", ...(reason === undefined ? {} : { reason }) });
	}

	/**
	 * Advances the clock, opens a door everyone has passed (SPEC 17), fires
	 * the new minute's director triggers and checks whether the run stops.
	 * A resumed run starts here, so its held competitors enter the next level
	 * exactly where the uninterrupted run lets them in.
	 */
	#nextMinute(): string | undefined {
		const { director, clock, world } = this.#options;
		clock.advance();
		if (clock.minute < clock.durationMinutes) {
			world.openDoor();
			// The tribunal acts before the director, so its announcements come first in the minute.
			world.startMinute(clock.minute);
			// A door may open once the last laggard was exiled.
			world.openDoor();
			director.startMinute(clock.minute);
		}
		return this.#stopReason();
	}

	/** Takes the requested snapshot once it is due; returns the stop reason when the run ends with it. */
	#takeSnapshot(round: number): string | undefined {
		const request = this.#options.snapshot;
		const { world, clock } = this.#options;
		if (request === undefined || this.#snapshotTaken) return undefined;
		if (!world.alive.every((id) => world.hasPassed(id, request.afterLevel))) return undefined;
		this.#snapshotTaken = true;
		const where = request.take({ round, minute: clock.minute, arena: this.snapshot() });
		return request.stop ? `snapshot after level ${request.afterLevel} written to ${where}; stopped there` : undefined;
	}

	snapshot(): ArenaSnapshot {
		const ids = this.#options.world.competitors;
		return {
			delivered: ids.flatMap((agent) => {
				const level = this.#deliveredLevel.get(agent);
				return level === undefined ? [] : [{ agent, level, finished: this.#deliveredFinished.get(agent) ?? false }];
			}),
			seenPoints: ids.flatMap((agent) => {
				const points = this.#seenPoints.get(agent);
				return points === undefined ? [] : [{ agent, points }];
			}),
			seenBoard: ids.flatMap((agent) => {
				const seq = this.#seenBoard.get(agent);
				return seq === undefined ? [] : [{ agent, seq }];
			}),
		};
	}

	#restore(state: ArenaSnapshot): void {
		const { world } = this.#options;
		for (const entry of state.delivered) {
			if (!world.isCompetitor(entry.agent)) continue;
			// A story with more (or fewer) levels than the snapshot's run: the task or the finished notice is due again.
			if (entry.finished !== world.isFinished(entry.agent)) continue;
			this.#deliveredLevel.set(entry.agent, entry.level);
			this.#deliveredFinished.set(entry.agent, entry.finished);
		}
		for (const entry of state.seenPoints) if (world.isCompetitor(entry.agent)) this.#seenPoints.set(entry.agent, entry.points);
		for (const entry of state.seenBoard) if (world.isCompetitor(entry.agent)) this.#seenBoard.set(entry.agent, entry.seq);
	}

	#competitor(id: CompetitorId): Competitor {
		const competitor = this.#byId.get(id);
		if (competitor === undefined) throw new Error(`No runner for competitor ${id}`);
		return competitor;
	}

	#stopReason(): string | undefined {
		const { world } = this.#options;
		// The tribunal's act is over once its target is reached and the last gate closed (SPEC 6.4).
		const ended = world.tribunal?.endReason;
		if (ended !== undefined) return ended;
		// The early ends never cut a tribunal short: a called one runs to its last gate first (P18).
		const busy = world.tribunal?.busy === true;
		if (this.#options.stopWhenDone === true && !busy && world.alive.every((id) => world.isFinished(id))) {
			return "every competitor has passed the last level";
		}
		if (this.#options.stopWhenSeatsDecided === true && world.seatsDecided() && !busy) return "seats decided";
		return this.#options.stopWhen?.();
	}

	#budgetReason(): string | undefined {
		const budget = this.#options.budget;
		if (budget === undefined) return undefined;
		const spent = budget.spentUsd();
		return spent > budget.limitUsd ? `budget exceeded (${spent.toFixed(4)} > ${budget.limitUsd} USD)` : undefined;
	}

	/**
	 * Delivery for one activation: status line, the task text on a level change
	 * (or the story's finished notice), DMs, city notices, then the digest.
	 */
	#inputsFor(id: CompetitorId): readonly TurnInput[] {
		const { world } = this.#options;
		const inputs: TurnInput[] = [{ kind: "status", text: statusLine(world, id) }];
		const level = world.levelOf(id);
		if (this.#deliveredLevel.get(id) !== level) {
			this.#deliveredLevel.set(id, level);
			const problem = world.currentProblem(id);
			this.#deliveredFinished.set(id, problem === undefined);
			inputs.push(
				problem === undefined
					? { kind: "notice", text: noticeLine(CITY, world.story.finishedNotice) }
					: { kind: "task", text: problem.text },
			);
		}
		for (const entry of world.drainMailbox(id)) inputs.push({ kind: "dm", text: dmLine(entry.from, entry.text, entry.number) });
		for (const notice of world.drainNotices(id)) {
			inputs.push({ kind: "notice", text: noticeLine(notice.author, notice.text, notice.number) });
		}
		inputs.push({ kind: "digest", text: digestLine(world, id) });
		return inputs;
	}

	/**
	 * Novelty (SPEC §3): a DM, a level change, a point change, a new player post
	 * on the board, an unread group post or a notice addressed to the agent.
	 * Unread DMs, notices and group posts count until they are read. Board and
	 * group posts count only while the agent can read them (readBoard, readGroup).
	 */
	#hasNovelty(id: CompetitorId): boolean {
		const { world } = this.#options;
		if (world.pendingDms(id) > 0 || world.pendingNotices(id) > 0) return true;
		if (this.#deliveredLevel.get(id) !== world.levelOf(id)) return true;
		const points = this.#seenPoints.get(id);
		if (points !== undefined && points !== world.ledger.balance(id)) return true;
		if (world.groupUnread(id).length > 0) return true;
		if (!world.isToolEnabled(id, "readBoard")) return false;
		return world.board.lastPlayerSeq() > (this.#seenBoard.get(id) ?? 0);
	}

	/**
	 * One block of a pass (SPEC §3). Who steps and what each member is shown
	 * is decided before any of them acts, so every member sees the block's
	 * start. The model calls run concurrently; member k's turn comes once
	 * member k-1 has finished, so answers and tools follow the seeded order.
	 */
	async #playBlock(members: readonly CompetitorId[], pass: number, block: number, activated: Set<CompetitorId>): Promise<void> {
		const { bus, world } = this.#options;
		let previous: Promise<unknown> = Promise.resolve();
		const steps: Promise<void>[] = [];
		// No await in this loop: nothing a member does can land before every member's inputs are built.
		for (const id of members) {
			if (world.isExiled(id)) continue;
			const competitor = this.#competitor(id);
			// A competitor may answer its own tool results without anything new.
			if (this.#options.activation === "onNovelty" && !this.#hasNovelty(id) && !competitor.awaitsAnswer) {
				bus.emit({ type: "turn_skipped", agent: id, pass, block });
				continue;
			}
			activated.add(id);
			const start = this.#view(id);
			// The next member's turn comes even when this step fails.
			const atTurn = previous.then(
				() => this.#view(id),
				() => this.#view(id),
			);
			const step = competitor.step(this.#inputsFor(id), { pass, block, turn: atTurn.then(() => undefined) });
			// Taken before the next member may act, so only this member's own doing is in it.
			const after = step.then(() => this.#view(id));
			previous = after;
			steps.push(Promise.all([atTurn, after]).then(([turn, end]) => {
				this.#markSeen(id, start, turn, end);
			}));
		}
		await Promise.all(steps);
	}

	/** What novelty compares: the competitor's points and the board's last player post. */
	#view(id: CompetitorId): SeenView {
		const { world } = this.#options;
		return { points: world.ledger.balance(id), board: world.board.lastPlayerSeq() };
	}

	/**
	 * After a step, the competitor has seen the block's start plus its own
	 * doing. What earlier members of its block did meanwhile is still new:
	 * their point changes are left out, and a board that grew before its turn
	 * stays unread.
	 */
	#markSeen(id: CompetitorId, start: SeenView, turn: SeenView, end: SeenView): void {
		this.#seenPoints.set(id, start.points + (end.points - turn.points));
		this.#seenBoard.set(id, turn.board === start.board ? end.board : start.board);
	}

	#standings(activated: ReadonlySet<CompetitorId>): readonly StandingRow[] {
		const { world } = this.#options;
		return world.ranking().map((entry) => ({
			agent: entry.agent,
			level: entry.level,
			points: entry.points,
			rank: entry.rank,
			tools: world.enabledTools(entry.agent).length,
			activated: activated.has(entry.agent),
		}));
	}
}
