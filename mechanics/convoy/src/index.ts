/**
 * The `convoy` mechanic: the hidden-role card game Convoy (docs/ideas/game-roadmap.md §2.6) for a table
 * of solo seats. A match is several games; in each game the roles are dealt in secret (a few
 * **saboteurs**, who know each other; the rest loyal) and a convoy crosses a number of stages. A stage:
 * 1. the **lead** (rotating round the table) proposes a crew of the stage's size (`proposeCrew`);
 * 2. the table talks (`speak`, a few lines a seat per stage), and the lead may spend the game's single
 *    **audit** to reveal one card an earlier crew member played;
 * 3. every seat casts a sealed **vote of confidence** (`voteConfidence`); the votes are shown once all are
 *    in. A strict majority of no ends the lead's term: the next seat leads and proposes a crew that goes
 *    out without a vote;
 * 4. every crew member plays a sealed card (`playCrewCard`): loyal seats play safe, a saboteur may play
 *    damage, but at most once per `cooldown` stages. Only the number of damage cards is revealed; one
 *    damage card damages the stage.
 * The saboteurs win when `damageToLose` stages are damaged, the convoy when it crosses the last stage.
 * After a game every loyal seat names its suspects (`accuse`, sealed and unscored, for the report), the
 * roles and cards are revealed, and every seat of the winning side scores a point.
 * For the report only (audience `human`): the deal, every card, and per seat the hits of its accusations
 * against a Bayesian tracker that reads only the public record (crews, counts, audits), the votes that
 * matched the crew's truth, a saboteur's chances and damage cards (a role-compliance check), and talk
 * lines in which a seat calls itself a saboteur (a role leak). A strategy brain plugs in through
 * `BrainSourceApi` and `StrategyBrainApi`, as in the econ lab.
 */
import { Type } from "typebox";
import type { ContextOf, Refusal, ToolContextOf, ToolSuccess, ViewOf } from "@swarmtales/contracts";
import { defineHead, defineMechanic, refuse, reply } from "@swarmtales/kernel";
import { HOOK_ORDER } from "@swarmtales/mechanic-shared";
import { BrainSourceApi, StrategyBrainApi } from "@swarmtales/mechanic-strategy-brain";
import {
	CardKind,
	ConvoySlice,
	mayDamage,
	PlayRecord,
	posterior,
	revealsSelf,
	Role,
	SeatReference,
	StageRecord,
	topSuspects,
	Vote,
	winnerOf,
	type ConvoyState,
	type Observation,
	type Rules,
} from "./model.ts";

const PROPOSE = "proposeCrew";
const SPEAK = "speak";
const VOTE = "voteConfidence";
const PLAY = "playCrewCard";
const AUDIT = "audit";
const ACCUSE = "accuse";
const LOCKED_TOOLS = [PROPOSE, SPEAK, VOTE, PLAY, AUDIT, ACCUSE] as const;

const options = Type.Object({
	games: Type.Integer({ minimum: 1, maximum: 20, default: 3, description: "Games in the match; the roles are dealt anew for each; the run ends after the last." }),
	saboteurs: Type.Integer({ minimum: 1, default: 2, description: "Saboteurs dealt per game; they know each other." }),
	crews: Type.Array(Type.Integer({ minimum: 1 }), { minItems: 1, default: [2, 2, 3, 3, 3, 3, 4, 4], description: "The crew size of each stage; its length is the number of stages." }),
	damageToLose: Type.Integer({ minimum: 1, default: 3, description: "Damaged stages that stop the convoy: the saboteurs win." }),
	cooldown: Type.Integer({ minimum: 1, default: 3, description: "A saboteur who played damage in stage s may play damage again from stage s + cooldown (3: at most one damage card per three stages)." }),
	talkPosts: Type.Integer({ minimum: 0, default: 2, description: "Lines a seat may speak per stage." }),
	maxTalkLength: Type.Integer({ minimum: 20, default: 400, description: "The longest line a seat may speak, in characters." }),
	deadline: Type.Integer({ minimum: 1, default: 2, description: "Minutes a proposal, vote, card or accusation stays open before the missing ones are filled in (crew in seat order, yes, safe, none) and marked missed." }),
	talkMinutes: Type.Integer({ minimum: 1, default: 2, description: "Minutes the talk before a vote stays open at most; it closes at the end of a minute once every seat had a turn in it." }),
});

const head = defineHead({
	id: "convoy",
	summary: "The hidden-role card game Convoy for solo seats: secret saboteurs, crews from a rotating lead, votes of confidence, sealed safe or damage cards revealed as a count, one audit per game.",
	options,
	state: (setup): ConvoyState => ({
		seats: [...setup.residents],
		game: 0,
		roles: {},
		phase: "idle",
		opened: 0,
		stage: 0,
		lead: "",
		nextLead: 0,
		proposals: 0,
		crew: [],
		votes: {},
		firstVotes: {},
		noVote: [],
		plays: {},
		lastDamage: {},
		owing: [],
		told: [],
		briefed: [],
		stages: [],
		sealed: [],
		log: [],
		talk: [],
		seenLog: {},
		spoken: {},
		auditUsed: false,
		accusations: {},
		missed: {},
		scores: Object.fromEntries(setup.residents.map((id) => [id, 0])),
		running: false,
		finished: false,
		held: false,
		due: false,
	}),
	events: {
		convoy_game_started: Type.Object({ game: Type.Integer(), seats: Type.Array(Type.String()), roles: Type.Record(Type.String(), Role, { description: "The secret deal (audience human)." }) }),
		convoy_crew_proposed: Type.Object({ game: Type.Integer(), stage: Type.Integer(), lead: Type.String(), crew: Type.Array(Type.String()), proposal: Type.Integer(), missed: Type.Boolean() }),
		convoy_spoken: Type.Object({ game: Type.Integer(), stage: Type.Integer(), from: Type.String(), text: Type.String() }),
		convoy_votes_revealed: Type.Object({ game: Type.Integer(), stage: Type.Integer(), lead: Type.String(), crew: Type.Array(Type.String()), votes: Type.Record(Type.String(), Vote), missed: Type.Array(Type.String()), confidence: Type.Boolean() }),
		convoy_card_played: PlayRecord,
		convoy_stage_revealed: StageRecord,
		convoy_audited: Type.Object({ game: Type.Integer(), stage: Type.Integer(), seat: Type.String(), card: CardKind, by: Type.String() }),
		convoy_accused: Type.Object({ game: Type.Integer(), seat: Type.String(), accused: Type.Array(Type.String()), missed: Type.Boolean() }),
		convoy_game_ended: Type.Object({
			game: Type.Integer(),
			winner: Type.Union([Type.Literal("convoy"), Type.Literal("saboteurs")]),
			roles: Type.Record(Type.String(), Role),
			damaged: Type.Integer(),
			stages: Type.Integer(),
			cards: Type.Array(PlayRecord),
			totals: Type.Record(Type.String(), Type.Number()),
		}),
		convoy_game_scored: Type.Object({
			game: Type.Integer(),
			seats: Type.Record(Type.String(), SeatReference),
			/** The tracker's top suspects from the public record alone, and their posteriors. */
			tracker: Type.Array(Type.String()),
			posterior: Type.Record(Type.String(), Type.Number()),
		}),
		convoy_match_ended: Type.Object({ scores: Type.Record(Type.String(), Type.Number()) }),
	},
	// Sealed: the deal, every card and the accusations; the reference is for the human and the reporter only.
	audiences: { convoy_game_started: ["human"], convoy_card_played: ["human"], convoy_accused: ["human"], convoy_game_scored: ["human"] },
	provides: [BrainSourceApi],
	uses: [StrategyBrainApi],
	prompts: {
		"convoy/tools/viewConvoy": [],
		"convoy/tools/proposeCrew": [],
		"convoy/tools/speak": [],
		"convoy/tools/voteConfidence": [],
		"convoy/tools/playCrewCard": [],
		"convoy/tools/audit": [],
		"convoy/tools/accuse": [],
		"convoy/rules": ["seats", "saboteurs", "stages", "crews", "damageToLose", "cooldown", "talkPosts"],
		"convoy/game-head": ["game", "games"],
		"convoy/role-loyal": ["seat", "saboteurs"],
		"convoy/role-saboteur": ["seat", "partners", "cooldown", "damageToLose"],
		"convoy/task-propose": ["seat", "stage", "stages", "size", "damaged", "damageToLose", "vote"],
		"convoy/task-talk": ["seat", "stage", "lead", "crew", "posts", "audit"],
		"convoy/task-vote": ["seat", "stage", "lead", "crew"],
		"convoy/task-play": ["seat", "stage", "crew", "choice"],
		"convoy/task-accuse": ["seat", "count"],
	},
});

type Ctx = ContextOf<typeof head>;
type ToolCtx = ToolContextOf<typeof head>;
type View = ViewOf<typeof head>;

const rulesOf = (ctx: Ctx): Rules => ({ seats: ctx.state.seats.length, saboteurs: ctx.options.saboteurs, crews: ctx.options.crews, damageToLose: ctx.options.damageToLose, cooldown: ctx.options.cooldown });

const list = (seats: readonly string[]): string => (seats.length === 0 ? "nobody" : seats.join(", "));
const normalize = (id: string): string => id.trim().toUpperCase();
const sizeOf = (ctx: Ctx, stage: number): number => ctx.options.crews[stage - 1] ?? ctx.options.crews[ctx.options.crews.length - 1] ?? 2;
const damagedCount = (ctx: Ctx): number => ctx.state.stages.filter((stage) => stage.damaged).length;
const saboteursOf = (ctx: Ctx): string[] => ctx.state.seats.filter((seat) => ctx.state.roles[seat] === "saboteur");

function refreshLocks(ctx: Ctx): void {
	const state = ctx.state;
	for (const resident of ctx.residents.ids) {
		const open: Record<(typeof LOCKED_TOOLS)[number], boolean> = {
			proposeCrew: state.running && state.phase === "propose" && state.owing.includes(resident),
			speak: state.running && state.phase === "talk" && (state.spoken[resident] ?? 0) < ctx.options.talkPosts,
			// A seat may vote already during the talk (P151); the votes stay sealed until all are in.
			voteConfidence: state.running && ((state.phase === "vote" && state.owing.includes(resident)) || (state.phase === "talk" && state.votes[resident] === undefined)),
			playCrewCard: state.running && state.phase === "play" && state.owing.includes(resident),
			audit: state.running && (state.phase === "propose" || state.phase === "talk") && resident === state.lead && !state.auditUsed && state.stages.length > 0,
			accuse: state.running && state.phase === "accuse" && state.owing.includes(resident),
		};
		for (const tool of LOCKED_TOOLS) {
			if (open[tool]) ctx.access.unlock(resident, tool);
			else ctx.access.lock(resident, tool);
		}
	}
}

/** A public line of the game's record, shown to every seat at its next turn. */
function record(ctx: Ctx, line: string): void {
	ctx.state.log.push(line);
}

function openPhase(ctx: Ctx, phase: ConvoyState["phase"], owing: readonly string[], minute: number): void {
	const state = ctx.state;
	state.phase = phase;
	state.owing = [...owing];
	state.told = [];
	state.opened = minute;
	refreshLocks(ctx);
}

function openPropose(ctx: Ctx, minute: number): void {
	openPhase(ctx, "propose", [ctx.state.lead], minute);
}

function openStage(ctx: Ctx, stage: number, minute: number): void {
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
	openPropose(ctx, minute);
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
	ctx.tryCall(StrategyBrainApi, "gameStarted", { game, first: "" });
	openStage(ctx, 1, ctx.minute);
}

function startNext(ctx: Ctx): void {
	const state = ctx.state;
	if (state.finished || state.running) return;
	if (state.held) {
		state.due = true;
		return;
	}
	state.due = false;
	startGame(ctx, state.game + 1);
}

function miss(ctx: Ctx, seat: string): void {
	ctx.state.missed[seat] = (ctx.state.missed[seat] ?? 0) + 1;
}

/** Why `crew` is not a valid crew for the stage, or undefined. */
function crewProblem(ctx: Ctx, crew: readonly string[]): Refusal | undefined {
	const size = sizeOf(ctx, ctx.state.stage);
	const ids = crew.map(normalize);
	const unknown = ids.filter((id) => !ctx.state.seats.includes(id));
	if (unknown.length > 0) return refuse("NOT_A_SEAT", `${unknown.join(", ")} is not a seat. The seats: ${list(ctx.state.seats)}.`);
	if (new Set(ids).size !== ids.length) return refuse("CREW_REPEATS", "A seat can be on the crew only once.");
	if (ids.length !== size) return refuse("CREW_SIZE", `Stage ${String(ctx.state.stage)} needs a crew of exactly ${String(size)} seats; you named ${String(ids.length)}.`);
	return undefined;
}

function phaseProblem(ctx: Ctx, resident: string | undefined, phase: ConvoyState["phase"], what: string): Refusal | undefined {
	const state = ctx.state;
	if (state.finished) return refuse("MATCH_OVER", "The match is over.");
	if (resident === undefined || !state.seats.includes(resident)) return refuse("NOT_A_SEAT", "You have no seat at this table.");
	if (!state.running) return refuse("NO_GAME", "No game is running right now; wait for the next one.");
	if (state.phase !== phase) return refuse("WRONG_PHASE", `There is nothing to ${what} now: ${phaseLine(ctx)}`);
	if (phase !== "talk" && !state.owing.includes(resident)) return refuse("NOT_YOURS", `You have nothing to ${what} now: ${phaseLine(ctx)} End your turn.`);
	return undefined;
}

/** Where the game stands, in one sentence. */
function phaseLine(ctx: Ctx): string {
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

function propose(ctx: Ctx, crew: readonly string[], missed: boolean, minute: number): void {
	const state = ctx.state;
	state.crew = crew.map(normalize);
	state.proposals += 1;
	ctx.emit("convoy_crew_proposed", { game: state.game, stage: state.stage, lead: state.lead, crew: [...state.crew], proposal: state.proposals, missed });
	if (state.proposals === 1) {
		record(ctx, `${state.lead} proposes the crew ${list(state.crew)}${missed ? " (no crew named in time: the lead and the next seats)" : ""}. Talk, then a vote of confidence.`);
		state.spoken = {};
		state.votes = {};
		openPhase(ctx, "talk", [], minute);
	} else {
		record(ctx, `${state.lead} names the crew ${list(state.crew)}${missed ? " (no crew named in time: the lead and the next seats)" : ""}; after a lost vote of confidence it goes out without a vote.`);
		openPlay(ctx, minute);
	}
}

/** The lead's own crew when none was named: the lead and the next seats in order. */
function defaultCrew(ctx: Ctx): string[] {
	const state = ctx.state;
	const start = Math.max(0, state.seats.indexOf(state.lead));
	return Array.from({ length: sizeOf(ctx, state.stage) }, (_, index) => state.seats[(start + index) % state.seats.length] ?? state.lead);
}

function openVote(ctx: Ctx, minute: number): void {
	const state = ctx.state;
	const pending = state.seats.filter((seat) => state.votes[seat] === undefined);
	openPhase(ctx, "vote", pending, minute);
	if (pending.length === 0) resolveVote(ctx, minute, []);
}

function resolveVote(ctx: Ctx, minute: number, missed: readonly string[]): void {
	const state = ctx.state;
	const votes: Record<string, "yes" | "no"> = Object.fromEntries(state.seats.map((seat) => [seat, state.votes[seat] ?? "yes"]));
	const no = Object.values(votes).filter((vote) => vote === "no").length;
	const confidence = no * 2 <= state.seats.length;
	state.firstVotes = votes;
	state.noVote = [...missed];
	ctx.emit("convoy_votes_revealed", { game: state.game, stage: state.stage, lead: state.lead, crew: [...state.crew], votes: { ...votes }, missed: [...missed], confidence });
	const shown = state.seats.map((seat) => `${seat} ${votes[seat] ?? "yes"}${missed.includes(seat) ? " (no vote cast)" : ""}`).join(", ");
	if (confidence) {
		record(ctx, `Votes on ${state.lead}'s crew: ${shown}. Confidence holds (${String(no)} no of ${String(state.seats.length)}); the crew ${list(state.crew)} goes out.`);
		openPlay(ctx, minute);
		return;
	}
	state.rejected = { lead: state.lead, crew: [...state.crew] };
	const index = state.seats.indexOf(state.lead);
	state.lead = state.seats[(index + 1) % state.seats.length] ?? state.lead;
	record(ctx, `Votes on ${state.rejected.lead}'s crew: ${shown}. No confidence (${String(no)} no of ${String(state.seats.length)}): ${state.rejected.lead}'s term ends. ${state.lead} leads now and names a crew of ${String(sizeOf(ctx, state.stage))} that goes out without a vote.`);
	openPropose(ctx, minute);
}

function openPlay(ctx: Ctx, minute: number): void {
	ctx.state.plays = {};
	openPhase(ctx, "play", ctx.state.crew, minute);
}

function canDamage(ctx: Ctx, seat: string): boolean {
	return ctx.state.roles[seat] === "saboteur" && mayDamage(ctx.state.lastDamage[seat] ?? 0, ctx.state.stage, ctx.options.cooldown);
}

function playCard(ctx: Ctx, seat: string, card: "safe" | "damage", missed: boolean): void {
	const state = ctx.state;
	const role = state.roles[seat] ?? "loyal";
	const entry: PlayRecord = { game: state.game, stage: state.stage, seat, card, role, missed, mayDamage: canDamage(ctx, seat) };
	state.plays[seat] = card;
	if (card === "damage") state.lastDamage[seat] = state.stage;
	state.sealed.push(entry);
	state.owing = state.owing.filter((id) => id !== seat);
	ctx.emit("convoy_card_played", { ...entry });
}

function resolveStage(ctx: Ctx, minute: number): void {
	const state = ctx.state;
	const damage = state.crew.filter((seat) => state.plays[seat] === "damage").length;
	const stage: StageRecord = { stage: state.stage, lead: state.lead, crew: [...state.crew], votes: { ...state.firstVotes }, ...(state.noVote.length === 0 ? {} : { noVote: [...state.noVote] }), damage, damaged: damage > 0, ...(state.rejected === undefined ? {} : { rejected: { lead: state.rejected.lead, crew: [...state.rejected.crew] } }) };
	state.stages.push(stage);
	ctx.emit("convoy_stage_revealed", structuredClone(stage));
	const total = damagedCount(ctx);
	record(ctx, `Stage ${String(stage.stage)} revealed: ${String(damage)} damage card${damage === 1 ? "" : "s"} among the crew ${list(stage.crew)}. ${stage.damaged ? `The stage is damaged (${String(total)} of ${String(ctx.options.damageToLose)} damaged stages stop the convoy).` : `The stage is crossed safely (${String(total)} of ${String(ctx.options.damageToLose)} damaged so far).`}`);
	// The lead moves one seat per stage from the stage's first lead, also when its term ended.
	const index = state.seats.indexOf(stage.rejected?.lead ?? state.lead);
	state.nextLead = (index + 1) % state.seats.length;
	const winner = winnerOf(rulesOf(ctx), state.stages);
	if (winner === undefined) {
		openStage(ctx, state.stage + 1, minute);
		return;
	}
	record(ctx, winner === "saboteurs" ? `The convoy is stopped at stage ${String(stage.stage)}: the saboteurs win.` : "The convoy crosses the last stage: the loyal seats win.");
	const loyal = state.seats.filter((seat) => state.roles[seat] === "loyal");
	openPhase(ctx, "accuse", loyal, minute);
}

function endGame(ctx: Ctx): void {
	const state = ctx.state;
	const winner = winnerOf(rulesOf(ctx), state.stages) ?? "convoy";
	state.running = false;
	state.phase = "idle";
	state.owing = [];
	refreshLocks(ctx);
	const winners = state.seats.filter((seat) => (winner === "saboteurs") === (state.roles[seat] === "saboteur"));
	for (const seat of winners) state.scores[seat] = (state.scores[seat] ?? 0) + 1;
	ctx.emit("convoy_game_ended", { game: state.game, winner, roles: { ...state.roles }, damaged: damagedCount(ctx), stages: state.stages.length, cards: state.sealed.map((entry) => ({ ...entry })), totals: { ...state.scores } });
	ctx.emit("convoy_game_scored", { game: state.game, ...referenceOf(ctx) });
	const last = state.game >= ctx.options.games;
	if (last) state.finished = true;
	const summary = `${winner === "saboteurs" ? `the saboteurs (${list(saboteursOf(ctx))}) stopped the convoy at stage ${String(state.stages.length)}` : `the convoy crossed all ${String(state.stages.length)} stages; the saboteurs were ${list(saboteursOf(ctx))}`} (${String(damagedCount(ctx))} damaged); points ${state.seats.map((seat) => `${seat} ${String(state.scores[seat] ?? 0)}`).join(", ")}`;
	ctx.tryCall(StrategyBrainApi, "gameEnded", { game: state.game, summary });
	if (last) ctx.emit("convoy_match_ended", { scores: { ...state.scores } });
	else ctx.schedule.at(ctx.minute + 1, "nextGame");
}

const observations = (stages: readonly StageRecord[]): Observation[] => stages.map((stage) => ({ crew: stage.crew, damage: stage.damage, ...(stage.audit === undefined ? {} : { audit: { seat: stage.audit.seat, card: stage.audit.card } }) }));

function referenceOf(ctx: Ctx): { seats: Record<string, SeatReference>; tracker: string[]; posterior: Record<string, number> } {
	const state = ctx.state;
	const seen = observations(state.stages);
	const saboteurs = saboteursOf(ctx);
	const count = ctx.options.saboteurs;
	const open = posterior(state.seats, count, seen);
	const round = (value: number): number => Math.round(value * 1000) / 1000;
	const seats = Object.fromEntries(
		state.seats.map((seat): [string, SeatReference] => {
			const role = state.roles[seat] ?? "loyal";
			const accused = state.accusations[seat] ?? [];
			const own = role === "loyal" ? posterior(state.seats, count, seen, seat) : open;
			const top = topSuspects(own, state.seats, count, role === "loyal" ? seat : undefined);
			const voted = state.stages.filter((stage) => stage.votes[seat] !== undefined && !(stage.noVote ?? []).includes(seat));
			// A saboteur votes by its own plan, so only a loyal seat's votes are scored.
			const rightVotes = role === "saboteur" ? 0 : voted.filter((stage) => {
				const crew = stage.rejected?.crew ?? stage.crew;
				const clean = !crew.some((member) => saboteurs.includes(member));
				return (stage.votes[seat] === "yes") === clean;
			}).length;
			const plays = state.sealed.filter((entry) => entry.seat === seat);
			return [
				seat,
				{
					role,
					accused: [...accused],
					hits: accused.filter((id) => saboteurs.includes(id)).length,
					trackerHits: top.filter((id) => saboteurs.includes(id)).length,
					trackerMass: round(accused.reduce((sum, id) => sum + (own[id] ?? 0), 0)),
					rightVotes,
					votes: voted.length,
					chances: plays.filter((entry) => entry.mayDamage && !entry.missed).length,
					damage: plays.filter((entry) => entry.card === "damage").length,
					selfReveals: state.talk.filter((line) => line.from === seat && revealsSelf(line.text)).length,
					missed: state.missed[seat] ?? 0,
				},
			];
		}),
	);
	return { seats, tracker: topSuspects(open, state.seats, count), posterior: Object.fromEntries(Object.entries(open).map(([seat, value]) => [seat, round(value)])) };
}

function proposeNow(ctx: Ctx, resident: string | undefined, crew: readonly string[]): ToolSuccess | Refusal {
	const refusal = phaseProblem(ctx, resident, "propose", "propose") ?? crewProblem(ctx, crew);
	if (refusal !== undefined) return refusal;
	propose(ctx, crew, false, ctx.minute);
	return reply(`You proposed ${list(ctx.state.crew)}. ${ctx.state.phase === "talk" ? "The table talks now, then votes; end your turn now." : "It goes out without a vote; end your turn now unless you are on the crew and asked to play."}`);
}

function speakNow(ctx: Ctx, resident: string | undefined, text: string): ToolSuccess | Refusal {
	const refusal = phaseProblem(ctx, resident, "talk", "talk about");
	if (refusal !== undefined || resident === undefined) return refusal ?? refuse("NOT_A_SEAT", "You have no seat at this table.");
	const state = ctx.state;
	if ((state.spoken[resident] ?? 0) >= ctx.options.talkPosts) return refuse("TALK_CAP", `You have spoken ${String(ctx.options.talkPosts)} times this stage; end your turn.`);
	const line = text.trim().slice(0, ctx.options.maxTalkLength);
	state.spoken[resident] = (state.spoken[resident] ?? 0) + 1;
	state.talk.push({ stage: state.stage, from: resident, text: line });
	record(ctx, `${resident} says: "${line}"`);
	// The speaker has seen its own line.
	state.seenLog[resident] = state.log.length;
	ctx.emit("convoy_spoken", { game: state.game, stage: state.stage, from: resident, text: line });
	refreshLocks(ctx);
	const left = ctx.options.talkPosts - (state.spoken[resident] ?? 0);
	return reply(`Said. ${left > 0 ? `You may speak ${String(left)} more time${left === 1 ? "" : "s"} this stage.` : "That was your last line this stage."} End your turn now; you will see the replies at your next turn.`);
}

function voteProblem(ctx: Ctx, resident: string | undefined): Refusal | undefined {
	const state = ctx.state;
	if (state.running && state.phase === "talk" && resident !== undefined && state.seats.includes(resident)) return state.votes[resident] === undefined ? undefined : refuse("ALREADY_VOTED", "You have voted on this crew already; end your turn.");
	return phaseProblem(ctx, resident, "vote", "vote on");
}

function voteNow(ctx: Ctx, resident: string | undefined, vote: "yes" | "no"): ToolSuccess | Refusal {
	const refusal = voteProblem(ctx, resident);
	if (refusal !== undefined || resident === undefined) return refusal ?? refuse("NOT_A_SEAT", "You have no seat at this table.");
	const state = ctx.state;
	state.votes[resident] = vote;
	if (state.phase === "talk") {
		ctx.access.lock(resident, VOTE);
		return reply(`You voted ${vote} (sealed). You may still speak while the talk is open; the votes are shown once all are in. End your turn now.`);
	}
	state.owing = state.owing.filter((id) => id !== resident);
	ctx.access.lock(resident, VOTE);
	if (state.owing.length === 0) resolveVote(ctx, ctx.minute, []);
	return reply(`You voted ${vote}. The votes are shown once all are in; end your turn now.`);
}

function playProblem(ctx: Ctx, resident: string | undefined, card: "safe" | "damage"): Refusal | undefined {
	const refusal = phaseProblem(ctx, resident, "play", "play");
	if (refusal !== undefined || resident === undefined) return refusal;
	if (card === "damage" && ctx.state.roles[resident] !== "saboteur") return refuse("LOYAL_PLAYS_SAFE", "You are loyal: you can only play safe.");
	if (card === "damage" && !canDamage(ctx, resident)) return refuse("COOLDOWN", `You played damage in stage ${String(ctx.state.lastDamage[resident] ?? 0)}; your next damage card is allowed from stage ${String((ctx.state.lastDamage[resident] ?? 0) + ctx.options.cooldown)}. Play safe.`);
	return undefined;
}

function playNow(ctx: Ctx, resident: string | undefined, card: "safe" | "damage"): ToolSuccess | Refusal {
	const refusal = playProblem(ctx, resident, card);
	if (refusal !== undefined || resident === undefined) return refusal ?? refuse("NOT_A_SEAT", "You have no seat at this table.");
	playCard(ctx, resident, card, false);
	ctx.access.lock(resident, PLAY);
	if (ctx.state.owing.length === 0) resolveStage(ctx, ctx.minute);
	return reply(`You played ${card}. Only the number of damage cards is revealed; end your turn now.`);
}

function auditProblem(ctx: Ctx, resident: string | undefined, seat: string, stage: number): Refusal | undefined {
	const state = ctx.state;
	if (state.finished) return refuse("MATCH_OVER", "The match is over.");
	if (!state.running || (state.phase !== "propose" && state.phase !== "talk")) return refuse("WRONG_PHASE", "The audit is used before a crew goes out, by the lead.");
	if (resident !== state.lead) return refuse("NOT_LEAD", `Only the lead (${state.lead}) may audit.`);
	if (state.auditUsed) return refuse("AUDIT_USED", "The audit of this game is used up.");
	const target = state.stages.find((entry) => entry.stage === stage);
	if (target === undefined) return refuse("NO_SUCH_STAGE", `Stage ${String(stage)} has not been played. Played: ${state.stages.map((entry) => String(entry.stage)).join(", ") || "none"}.`);
	if (!target.crew.includes(normalize(seat))) return refuse("NOT_ON_CREW", `${seat} was not on the crew of stage ${String(stage)} (${list(target.crew)}).`);
	return undefined;
}

function auditNow(ctx: Ctx, resident: string | undefined, seat: string, stage: number): ToolSuccess | Refusal {
	const refusal = auditProblem(ctx, resident, seat, stage);
	if (refusal !== undefined || resident === undefined) return refusal ?? refuse("NOT_LEAD", "Only the lead may audit.");
	const state = ctx.state;
	const id = normalize(seat);
	const played = state.sealed.find((entry) => entry.stage === stage && entry.seat === id);
	if (played === undefined) throw new Error(`convoy: no card of ${id} in stage ${String(stage)}`);
	const card = played.card;
	state.auditUsed = true;
	const target = state.stages.find((entry) => entry.stage === stage);
	if (target !== undefined) target.audit = { seat: id, card, by: resident };
	ctx.emit("convoy_audited", { game: state.game, stage, seat: id, card, by: resident });
	record(ctx, `${resident} spends the audit: ${id} played ${card} in stage ${String(stage)}.`);
	state.seenLog[resident] = state.log.length;
	refreshLocks(ctx);
	return reply(`Audit: ${id} played ${card} in stage ${String(stage)}. The whole table sees it. ${state.phase === "propose" ? "Now propose your crew." : "End your turn now unless you want to speak."}`);
}

function accuseNow(ctx: Ctx, resident: string | undefined, seats: readonly string[]): ToolSuccess | Refusal {
	const refusal = phaseProblem(ctx, resident, "accuse", "accuse");
	if (refusal !== undefined || resident === undefined) return refusal ?? refuse("NOT_A_SEAT", "You have no seat at this table.");
	const ids = seats.map(normalize);
	const count = ctx.options.saboteurs;
	if (ids.some((id) => !ctx.state.seats.includes(id) || id === resident)) return refuse("NOT_A_SEAT", `Name other seats: ${list(ctx.state.seats.filter((seat) => seat !== resident))}.`);
	if (new Set(ids).size !== ids.length || ids.length !== count) return refuse("ACCUSE_COUNT", `Name exactly ${String(count)} different seats.`);
	accuseSeat(ctx, resident, ids, false);
	return reply("Noted (sealed). The roles are revealed when every loyal seat has named its suspects; end your turn now.");
}

function accuseSeat(ctx: Ctx, seat: string, ids: readonly string[], missed: boolean): void {
	const state = ctx.state;
	state.accusations[seat] = [...ids];
	state.owing = state.owing.filter((id) => id !== seat);
	ctx.access.lock(seat, ACCUSE);
	ctx.emit("convoy_accused", { game: state.game, seat, accused: [...ids], missed });
	if (state.owing.length === 0) endGame(ctx);
}

function rulesText(ctx: Ctx): string {
	const { saboteurs, crews, damageToLose, cooldown, talkPosts } = ctx.options;
	return ctx.prompt("convoy/rules", { seats: ctx.state.seats.length, saboteurs, stages: crews.length, crews: crews.join(", "), damageToLose, cooldown, talkPosts });
}

function roleText(ctx: Ctx, resident: string): string {
	const state = ctx.state;
	if (state.roles[resident] === "saboteur") {
		const partners = saboteursOf(ctx).filter((seat) => seat !== resident);
		return ctx.prompt("convoy/role-saboteur", { seat: resident, partners: partners.length === 0 ? "nobody else (you are the only one)" : list(partners), cooldown: ctx.options.cooldown, damageToLose: ctx.options.damageToLose });
	}
	return ctx.prompt("convoy/role-loyal", { seat: resident, saboteurs: ctx.options.saboteurs });
}

function choiceText(ctx: Ctx, resident: string): string {
	const state = ctx.state;
	if (state.roles[resident] !== "saboteur") return "You are loyal: play safe.";
	if (canDamage(ctx, resident)) return `You are a saboteur: you may play safe or damage (your damage card is allowed now; after it, the next one only from stage ${String(state.stage + ctx.options.cooldown)}).`;
	return `You are a saboteur, but you played damage in stage ${String(state.lastDamage[resident] ?? 0)}: play safe now (damage again from stage ${String((state.lastDamage[resident] ?? 0) + ctx.options.cooldown)}).`;
}

/** What `resident` is asked to do now, or undefined. */
function taskText(ctx: Ctx, resident: string): string | undefined {
	const state = ctx.state;
	if (!state.running) return undefined;
	const stage = state.stage;
	switch (state.phase) {
		case "propose":
			if (!state.owing.includes(resident)) return undefined;
			return ctx.prompt("convoy/task-propose", {
				seat: resident,
				stage,
				stages: ctx.options.crews.length,
				size: sizeOf(ctx, stage),
				damaged: damagedCount(ctx),
				damageToLose: ctx.options.damageToLose,
				vote: state.proposals === 0 ? "The table talks about it and then votes; a strict majority of no ends your term." : "After the lost vote of confidence your crew goes out without a vote.",
			}) + (resident === state.lead && !state.auditUsed && state.stages.length > 0 ? " You may first spend the game's single audit (audit: a seat and an earlier stage it crewed) to reveal that card to the table." : "");
		case "talk": {
			const left = ctx.options.talkPosts - (state.spoken[resident] ?? 0);
			return ctx.prompt("convoy/task-talk", {
				seat: resident,
				stage,
				lead: state.lead,
				crew: list(state.crew),
				posts: Math.max(0, left),
				audit: `${state.votes[resident] === undefined ? " You may also cast your sealed vote of confidence now (voteConfidence) or wait for the vote." : " Your vote is cast."}${resident === state.lead && !state.auditUsed && state.stages.length > 0 ? " As the lead you may also spend the game's single audit now." : ""}`,
			});
		}
		case "vote":
			return state.owing.includes(resident) ? ctx.prompt("convoy/task-vote", { seat: resident, stage, lead: state.lead, crew: list(state.crew) }) : undefined;
		case "play":
			return state.owing.includes(resident) ? ctx.prompt("convoy/task-play", { seat: resident, stage, crew: list(state.crew), choice: choiceText(ctx, resident) }) : undefined;
		case "accuse":
			return state.owing.includes(resident) ? ctx.prompt("convoy/task-accuse", { seat: resident, count: ctx.options.saboteurs }) : undefined;
		case "idle":
			return undefined;
	}
}

function tableText(ctx: Ctx, resident: string | undefined): string {
	const state = ctx.state;
	if (state.finished) return `The match is over. Points: ${state.seats.map((seat) => `${seat} ${String(state.scores[seat] ?? 0)}`).join(", ")}.`;
	if (!state.running) return state.game === 0 ? "The first game has not started yet." : `Game ${String(state.game)} is over. The next game starts soon.`;
	const lines = [`Game ${String(state.game)} of ${String(ctx.options.games)}, stage ${String(state.stage)} of ${String(ctx.options.crews.length)}: ${phaseLine(ctx)} Damaged stages: ${String(damagedCount(ctx))} of ${String(ctx.options.damageToLose)}. Audit ${state.auditUsed ? "used" : "unused"}.`, rulesText(ctx)];
	if (resident !== undefined && state.seats.includes(resident)) {
		lines.push(roleText(ctx, resident));
		const stages = state.stages.map((stage) => `stage ${String(stage.stage)}: lead ${stage.lead}, crew ${list(stage.crew)}, ${String(stage.damage)} damage, votes no: ${list(state.seats.filter((seat) => stage.votes[seat] === "no"))}${stage.audit === undefined ? "" : `, audit ${stage.audit.seat} ${stage.audit.card}`}${stage.rejected === undefined ? "" : ` (after ${stage.rejected.lead}'s crew ${list(stage.rejected.crew)} lost the vote)`}`);
		lines.push(stages.length === 0 ? "No stage played yet." : `Stages so far: ${stages.join("; ")}.`);
		lines.push(taskText(ctx, resident) ?? "Nothing for you to do right now: end your turn.");
	}
	return lines.join("\n");
}

const unseen = (ctx: Ctx, resident: string): boolean => (ctx.state.seenLog[resident] ?? 0) < ctx.state.log.length;

export const convoy = defineMechanic(head, (kit) => ({
	tools: [
		kit.tool({
			name: "viewConvoy",
			description: "convoy/tools/viewConvoy",
			parameters: Type.Object({}),
			suggest: ["resident"],
			execute: (_params, ctx: ToolCtx) => reply(tableText(ctx, ctx.resident)),
		}),
		kit.tool({
			name: PROPOSE,
			description: "convoy/tools/proposeCrew",
			parameters: Type.Object({
				crew: Type.Array(Type.String({ minLength: 1, maxLength: 8 }), { minItems: 1, maxItems: 12, description: "The seats of the crew (for example [\"A01\", \"A04\"]); you may name yourself." }),
				reason: Type.Optional(Type.String({ maxLength: 400, description: "A short reason, for the record (not shown to the table; speak to explain)." })),
			}),
			suggest: ["resident"],
			rule: (params, ctx) => phaseProblem(ctx, ctx.resident, "propose", "propose") ?? crewProblem(ctx, params.crew),
			execute: (params, ctx) => proposeNow(ctx, ctx.resident, params.crew),
		}),
		kit.tool({
			name: SPEAK,
			description: "convoy/tools/speak",
			parameters: Type.Object({ text: Type.String({ minLength: 1, maxLength: 1000, description: "What you say to the whole table." }) }),
			suggest: ["resident"],
			guardText: (params) => params.text,
			rule: (_params, ctx) => phaseProblem(ctx, ctx.resident, "talk", "talk about"),
			execute: (params, ctx) => speakNow(ctx, ctx.resident, params.text),
		}),
		kit.tool({
			name: VOTE,
			description: "convoy/tools/voteConfidence",
			parameters: Type.Object({ vote: Vote, reason: Type.Optional(Type.String({ maxLength: 400, description: "A short reason, for the record (not shown to the table)." })) }),
			suggest: ["resident"],
			rule: (_params, ctx) => voteProblem(ctx, ctx.resident),
			execute: (params, ctx) => voteNow(ctx, ctx.resident, params.vote),
		}),
		kit.tool({
			name: PLAY,
			description: "convoy/tools/playCrewCard",
			parameters: Type.Object({ card: CardKind, reason: Type.Optional(Type.String({ maxLength: 400, description: "A short reason, for the record (never shown to the table)." })) }),
			suggest: ["resident"],
			rule: (params, ctx) => playProblem(ctx, ctx.resident, params.card),
			execute: (params, ctx) => playNow(ctx, ctx.resident, params.card),
		}),
		kit.tool({
			name: AUDIT,
			description: "convoy/tools/audit",
			parameters: Type.Object({ seat: Type.String({ minLength: 1, maxLength: 8, description: "A seat that was on the crew of that stage." }), stage: Type.Integer({ minimum: 1, description: "An earlier stage." }) }),
			suggest: ["resident"],
			rule: (params, ctx) => auditProblem(ctx, ctx.resident, params.seat, params.stage),
			execute: (params, ctx) => auditNow(ctx, ctx.resident, params.seat, params.stage),
		}),
		kit.tool({
			name: ACCUSE,
			description: "convoy/tools/accuse",
			parameters: Type.Object({
				seats: Type.Array(Type.String({ minLength: 1, maxLength: 8 }), { minItems: 1, maxItems: 6, description: "The seats you believe are the saboteurs." }),
				reason: Type.Optional(Type.String({ maxLength: 400, description: "A short reason, for the record." })),
			}),
			suggest: ["resident"],
			rule: (_params, ctx) => phaseProblem(ctx, ctx.resident, "accuse", "accuse"),
			execute: (params, ctx) => accuseNow(ctx, ctx.resident, params.seats),
		}),
	],
	services: [
		kit.provide(BrainSourceApi, {
			game: (_input, ctx) => ctx.state.game,
			hold: (_input, ctx) => {
				if (ctx.state.finished) return false;
				ctx.state.held = true;
				return true;
			},
			release: (_input, ctx) => {
				const state = ctx.state;
				state.held = false;
				if (state.due && !state.running && !state.finished) ctx.schedule.at(ctx.minute + 1, "nextGame");
				return null;
			},
		}),
	],
	hooks: {
		// After the strategy brain's runStarted phase, which may hold the first game back.
		runStarted: {
			order: HOOK_ORDER.runStarted.convoy,
			run: (ctx) => {
				const crews = ctx.options.crews;
				if (crews.some((size) => size >= ctx.state.seats.length)) throw new Error("convoy: every crew must be smaller than the table");
				if (ctx.options.saboteurs * 2 >= ctx.state.seats.length) throw new Error("convoy: the saboteurs must be fewer than half the table");
				if (ctx.options.damageToLose > crews.length) throw new Error("convoy: damageToLose is more than the stages");
				startNext(ctx);
				refreshLocks(ctx);
			},
		},
		minuteEnded: {
			order: HOOK_ORDER.minuteEnded.convoy,
			run: (ctx) => {
				const state = ctx.state;
				if (!state.running) return;
				const next = ctx.minute + 1;
				const age = ctx.minute - state.opened + 1;
				switch (state.phase) {
					case "talk":
						if (state.told.length >= state.seats.length || age >= ctx.options.talkMinutes) openVote(ctx, next);
						return;
					case "propose":
						if (age < ctx.options.deadline) return;
						miss(ctx, state.lead);
						propose(ctx, defaultCrew(ctx), true, next);
						return;
					case "vote": {
						if (age < ctx.options.deadline) return;
						const missed = [...state.owing];
						for (const seat of missed) miss(ctx, seat);
						state.owing = [];
						resolveVote(ctx, next, missed);
						return;
					}
					case "play":
						if (age < ctx.options.deadline) return;
						for (const seat of [...state.owing]) {
							miss(ctx, seat);
							playCard(ctx, seat, "safe", true);
						}
						resolveStage(ctx, next);
						return;
					case "accuse":
						if (age < ctx.options.deadline) return;
						for (const seat of [...state.owing]) {
							miss(ctx, seat);
							accuseSeat(ctx, seat, [], true);
						}
						return;
					case "idle":
						return;
				}
			},
		},
		news: (resident, ctx) => {
			const state = ctx.state;
			if (!state.running || !state.seats.includes(resident)) return false;
			if (state.owing.includes(resident)) return true;
			if (state.phase !== "talk") return false;
			return !state.told.includes(resident) || (unseen(ctx, resident) && (state.spoken[resident] ?? 0) < ctx.options.talkPosts);
		},
		turnInputs: {
			order: HOOK_ORDER.turnInputs.convoy,
			run: (resident, ctx) => {
				const state = ctx.state;
				if (!state.running || !state.seats.includes(resident)) return [];
				const lines: string[] = [];
				if (!state.briefed.includes(resident)) {
					state.briefed.push(resident);
					lines.push(`${ctx.prompt("convoy/game-head", { game: state.game, games: ctx.options.games })} ${rulesText(ctx)}`, roleText(ctx, resident));
				}
				const from = state.seenLog[resident] ?? 0;
				if (from < state.log.length) {
					lines.push(state.log.slice(from).join("\n"));
					state.seenLog[resident] = state.log.length;
				}
				// The talk invitation comes once; a task a seat still owes comes again at every turn until it is done.
				const owes = state.owing.includes(resident);
				if (owes || (state.phase === "talk" && !state.told.includes(resident))) {
					if (!state.told.includes(resident)) state.told.push(resident);
					const task = taskText(ctx, resident);
					if (task !== undefined) lines.push(owes && lines.length === 0 ? `Still open: ${task}` : task);
				}
				return lines;
			},
		},
	},
	jobs: {
		nextGame: (ctx) => {
			startNext(ctx);
		},
	},
	limits: [kit.limit("match", "Breaches once the last game of the match is over.", (view: View) => (view.state.finished ? "the match is over" : undefined))],
	facts: {
		scores: kit.fact(Type.Record(Type.String(), Type.Number()), (view) => ({ ...view.state.scores })),
	},
	snapshot: kit.snapshot({
		version: 1,
		schema: ConvoySlice,
		save: (state) => structuredClone(state),
		load: (data) => structuredClone(data),
	}),
}));
