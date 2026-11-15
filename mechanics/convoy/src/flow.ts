// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The flow of a game up to the crew that goes out: the start of a game with its seeded roles, the stages with their
 * rotating lead, the crew proposal, the talk, the sealed votes of confidence, the locks of the six decision tools and
 * the timer of these three phases. The cards, the audit, the accusations and the end of a game build on it.
 */
import { StrategyBrainService } from "@swarmtales/mechanic-strategy-brain/contract";
import type { ConvoyCtx } from "./head.ts";
import type { ConvoyState, Vote } from "./model.ts";

type Ctx = ConvoyCtx;

/**
 * Seats as a list in a sentence.
 *
 * @param seats - The seats.
 * @returns The seats joined by commas, or "nobody".
 *
 * @public
 */
export const list = (seats: readonly string[]): string => (seats.length === 0 ? "nobody" : seats.join(", "));

/**
 * A seat id as the table writes it.
 *
 * @param id - The id as a caller wrote it.
 * @returns The id trimmed and in upper case.
 *
 * @public
 */
export const normalize = (id: string): string => id.trim().toUpperCase();

/**
 * The crew size of a stage.
 *
 * @param ctx - The context of the mechanic.
 * @param stage - The stage, from 1.
 * @returns The size; the last size for a stage past the list.
 *
 * @public
 */
export const sizeOf = (ctx: Ctx, stage: number): number => ctx.options.crews[stage - 1] ?? ctx.options.crews[ctx.options.crews.length - 1] ?? 2;

/**
 * Whether `resident` is the lead with the game's audit unspent and a stage to audit.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The seat.
 * @returns True when the seat may audit once the phase allows it.
 *
 * @public
 */
export const holdsAudit = (ctx: Ctx, resident: string): boolean => resident === ctx.state.lead && !ctx.state.auditUsed && ctx.state.stages.length > 0;

// Which of the six decision tools are open for `resident` now.
function openTools(ctx: Ctx, resident: string): Readonly<Record<string, boolean>> {
	const state = ctx.state;
	const phase = state.running ? state.phase : "idle";
	// The phase whose move the resident owes; the talk has no owed move.
	const owed = state.owing.includes(resident) ? phase : "idle";
	const talk = phase === "talk";
	return {
		proposeCrew: owed === "propose",
		speak: talk && (state.spoken[resident] ?? 0) < ctx.options.talkPosts,
		// A seat may vote already during the talk (P151); the votes stay sealed until all are in.
		voteConfidence: owed === "vote" || (talk && state.votes[resident] === undefined),
		playCrewCard: owed === "play",
		audit: (phase === "propose" || talk) && holdsAudit(ctx, resident),
		accuse: owed === "accuse",
	};
}

/**
 * Opens for every resident the decision tools it may call now and closes the others.
 *
 * @param ctx - The context of the mechanic.
 *
 * @public
 */
export function refreshLocks(ctx: Ctx): void {
	for (const resident of ctx.residents.ids) {
		for (const [tool, open] of Object.entries(openTools(ctx, resident))) {
			if (open) ctx.access.unlock(resident, tool);
			else ctx.access.lock(resident, tool);
		}
	}
}

/**
 * Adds a public line to the game's record, shown to every seat at its next turn.
 *
 * @param ctx - The context of the mechanic.
 * @param line - The line.
 *
 * @public
 */
export function record(ctx: Ctx, line: string): void {
	ctx.state.log.push(line);
}

/**
 * Opens a phase: who owes a move, nobody told yet, the clock of its deadline, the locks.
 *
 * @param ctx - The context of the mechanic.
 * @param phase - The phase.
 * @param owing - The seats that owe a move in it.
 * @param tick - The tick the phase counts from.
 *
 * @public
 */
export function openPhase(ctx: Ctx, phase: ConvoyState["phase"], owing: readonly string[], tick: number): void {
	const state = ctx.state;
	state.phase = phase;
	state.owing = [...owing];
	state.told = [];
	state.opened = tick;
	refreshLocks(ctx);
}

/**
 * Opens a stage: the next lead picks a crew.
 *
 * @param ctx - The context of the mechanic.
 * @param stage - The stage, from 1.
 * @param tick - The tick the proposal counts from.
 *
 * @public
 */
export function openStage(ctx: Ctx, stage: number, tick: number): void {
	const state = ctx.state;
	state.stage = stage;
	state.proposals = 0;
	state.crew = [];
	delete state.rejected;
	state.votes = {};
	state.firstVotes = {};
	state.noVote = [];
	state.plays = {};
	state.spoken = {};
	state.lead = state.seats[state.nextLead % state.seats.length] ?? "";
	record(ctx, `Stage ${String(stage)} of ${String(ctx.options.crews.length)}: ${state.lead} leads and picks a crew of ${String(sizeOf(ctx, stage))}.`);
	openPhase(ctx, "propose", [state.lead], tick);
}

function startGame(ctx: Ctx, game: number): void {
	const state = ctx.state;
	state.game = game;
	const shuffled = ctx.rng("convoy", "roles", game).shuffle(state.seats);
	const saboteurs = new Set(shuffled.slice(0, ctx.options.saboteurs));
	state.roles = Object.fromEntries(state.seats.map((seat) => [seat, saboteurs.has(seat) ? "saboteur" : "loyal"]));
	state.nextLead = (game - 1) % state.seats.length;
	state.lastDamage = Object.fromEntries(state.seats.map((seat) => [seat, 0]));
	state.stages = [];
	state.sealed = [];
	state.log = [];
	state.talk = [];
	state.seenLog = {};
	state.briefed = [];
	state.auditUsed = false;
	state.accusations = {};
	state.missed = {};
	state.running = true;
	ctx.emit("convoy_game_started", { game, seats: [...state.seats], roles: { ...state.roles } });
	ctx.tryCall(StrategyBrainService, "gameStarted", { game, first: "" });
	openStage(ctx, 1, ctx.tick);
}

/**
 * Starts the next game, or marks it due when the strategy brain holds it back.
 *
 * @param ctx - The context of the mechanic.
 *
 * @public
 */
export function startNext(ctx: Ctx): void {
	const state = ctx.state;
	if (state.finished || state.running) return;
	if (state.held) {
		state.due = true;
		return;
	}
	state.due = false;
	startGame(ctx, state.game + 1);
}

/**
 * Counts a deadline that `seat` let pass.
 *
 * @param ctx - The context of the mechanic.
 * @param seat - The seat.
 *
 * @public
 */
export function miss(ctx: Ctx, seat: string): void {
	ctx.state.missed[seat] = (ctx.state.missed[seat] ?? 0) + 1;
}

/**
 * Where the game stands, in one sentence.
 *
 * @param ctx - The context of the mechanic.
 * @returns The sentence, without a capital at its start.
 *
 * @public
 */
export function phaseLine(ctx: Ctx): string {
	const state = ctx.state;
	const stage = `stage ${String(state.stage)}`;
	switch (state.phase) {
		case "propose":
			return `${state.lead} is picking the crew of ${stage}.`;
		case "talk":
			return `the table is talking about ${state.lead}'s crew for ${stage} (${list(state.crew)}) before the vote.`;
		case "vote":
			return `the table is voting on ${state.lead}'s crew for ${stage} (${list(state.crew)}).`;
		case "play":
			return `the crew of ${stage} (${list(state.crew)}) is playing its cards.`;
		case "accuse":
			return "the crossing is over; the loyal seats name their suspects.";
		case "idle":
			return "no game is running.";
	}
}

// The crew goes out: every member owes a sealed card.
function openPlay(ctx: Ctx, tick: number): void {
	ctx.state.plays = {};
	openPhase(ctx, "play", ctx.state.crew, tick);
}

/**
 * Takes the lead's crew: the first one of a stage opens the talk, the one after a lost vote goes out at once.
 *
 * @param ctx - The context of the mechanic.
 * @param crew - The crew, checked.
 * @param missed - True when the timer named it.
 * @param tick - The tick the next phase counts from.
 *
 * @public
 */
export function propose(ctx: Ctx, crew: readonly string[], missed: boolean, tick: number): void {
	const state = ctx.state;
	state.crew = crew.map(normalize);
	state.proposals += 1;
	ctx.emit("convoy_crew_proposed", { game: state.game, stage: state.stage, lead: state.lead, crew: [...state.crew], proposal: state.proposals, missed });
	if (state.proposals === 1) {
		record(ctx, `${state.lead} proposes the crew ${list(state.crew)}${missed ? " (no crew named in time: the lead and the next seats)" : ""}. Talk, then a vote of confidence.`);
		state.spoken = {};
		state.votes = {};
		openPhase(ctx, "talk", [], tick);
	} else {
		record(ctx, `${state.lead} names the crew ${list(state.crew)}${missed ? " (no crew named in time: the lead and the next seats)" : ""}; after a lost vote of confidence it goes out without a vote.`);
		openPlay(ctx, tick);
	}
}

// The lead's own crew when none was named: the lead and the next seats in order.
function defaultCrew(ctx: Ctx): string[] {
	const state = ctx.state;
	const start = Math.max(0, state.seats.indexOf(state.lead));
	return Array.from({ length: sizeOf(ctx, state.stage) }, (_, index) => state.seats[(start + index) % state.seats.length] ?? state.lead);
}

/**
 * Shows the votes once all are in: confidence sends the crew out, a strict majority of no ends the lead's term.
 *
 * @param ctx - The context of the mechanic.
 * @param tick - The tick the next phase counts from.
 * @param missed - The seats whose vote the timer counted as yes.
 *
 * @public
 */
export function resolveVote(ctx: Ctx, tick: number, missed: readonly string[]): void {
	const state = ctx.state;
	const votes: Record<string, Vote> = Object.fromEntries(state.seats.map((seat) => [seat, state.votes[seat] ?? "yes"]));
	const no = Object.values(votes).filter((vote) => vote === "no").length;
	const confidence = no * 2 <= state.seats.length;
	state.firstVotes = votes;
	state.noVote = [...missed];
	ctx.emit("convoy_votes_revealed", { game: state.game, stage: state.stage, lead: state.lead, crew: [...state.crew], votes: { ...votes }, missed: [...missed], confidence });
	const shown = state.seats.map((seat) => `${seat} ${votes[seat] ?? "yes"}${missed.includes(seat) ? " (no vote cast)" : ""}`).join(", ");
	if (confidence) {
		record(ctx, `Votes on ${state.lead}'s crew: ${shown}. Confidence holds (${String(no)} no of ${String(state.seats.length)}); the crew ${list(state.crew)} goes out.`);
		openPlay(ctx, tick);
		return;
	}
	const rejected = { lead: state.lead, crew: [...state.crew] };
	state.rejected = rejected;
	const index = state.seats.indexOf(state.lead);
	state.lead = state.seats[(index + 1) % state.seats.length] ?? state.lead;
	record(ctx, `Votes on ${rejected.lead}'s crew: ${shown}. No confidence (${String(no)} no of ${String(state.seats.length)}): ${rejected.lead}'s term ends. ${state.lead} leads now and names a crew of ${String(sizeOf(ctx, state.stage))} that goes out without a vote.`);
	openPhase(ctx, "propose", [state.lead], tick);
}

// The talk is over: the seats that did not vote during it owe their vote.
function openVote(ctx: Ctx, tick: number): void {
	const state = ctx.state;
	const pending = state.seats.filter((seat) => state.votes[seat] === undefined);
	openPhase(ctx, "vote", pending, tick);
	if (pending.length === 0) resolveVote(ctx, tick, []);
}

/**
 * The timer of the proposal, the talk and the vote, at the end of a tick: the talk closes once every seat had a turn
 * in it or its time is up; a crew that was not named in time is the lead and the next seats, a missing vote is a yes.
 * The phases `play` and `accuse` are left alone.
 *
 * @param ctx - The context of the mechanic.
 *
 * @public
 */
export function closeLate(ctx: Ctx): void {
	const state = ctx.state;
	if (!state.running) return;
	const next = ctx.tick + 1;
	const age = ctx.tick - state.opened + 1;
	if (state.phase === "talk") {
		if (state.told.length >= state.seats.length || age >= ctx.options.talkMinutes) openVote(ctx, next);
		return;
	}
	if (age < ctx.options.deadline) return;
	if (state.phase === "propose") {
		miss(ctx, state.lead);
		propose(ctx, defaultCrew(ctx), true, next);
	} else if (state.phase === "vote") {
		const missed = [...state.owing];
		for (const seat of missed) miss(ctx, seat);
		state.owing = [];
		resolveVote(ctx, next, missed);
	}
}
