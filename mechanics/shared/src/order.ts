/**
 * The old engine's fixed call order, as numbers for hook phases and listeners (wave 3.5,
 * docs/design/carve-decisions.md D-1). The load order follows `requires` and cannot say "the
 * tribunal ticks before the standoff" (the tribunal loads after it); a phase with
 * `order: HOOK_ORDER.minuteStarted.tribunal` can. Every carved mechanic gives each of its phases
 * the number of this table (a plain function is order 0 and runs first), so the goldens' order
 * holds whatever the story's mechanic list says. `test/mechanics/order.test.ts` checks the table
 * against the golden logs.
 *
 * The old sources of each table: `World` constructor and `Arena.run` (runStarted), `Arena#nextMinute`
 * with `World.startMinute` and `Director.startMinute` (minuteStarted), `Arena#inputsFor`
 * (turnInputs), the end of `Arena.run` (minuteEnded, runEnded), `#noteActStarts` / `#endAct`
 * (act listeners). Gaps of 100 leave room.
 */
import type { PassView, ResidentId, TurnPolicy } from "@swarmtales/contracts";
import { INPUT_KINDS } from "./turn-input.ts";

export const HOOK_ORDER = {
	/** The old `World` constructor, then the arena's `run_start` (every earlier line is before it in the goldens). */
	runStarted: {
		/** The strategy brain holds the first game back (`GridGameApi.hold`) before the grid game starts it. */
		strategyBrain: -100,
		/** The grid game starts game 1 (tic-tac-toe teams; after the brain's hold, before `run_start`). */
		gridGame: 0,
		/** The economics games start game 1 (econ lab; after the brain's hold, like the grid game). */
		econGames: 0,
		/** Trick play starts game 1 (Ember Tricks; after the brain's hold, like the grid game). */
		trickPlay: 0,
		/** The draft (Quarry) starts game 1, after the brain's hold. */
		draftRounds: 0,
		/** The chess match starts game 1 (after the brain's hold, like the grid game). */
		chess: 0,
		/** Hold'em starts game 1 (after the brain's hold, like the grid game). */
		holdem: 0,
		/** Nine men's morris starts game 1 (morris teams; after the brain's hold, like the grid game). */
		morris: 0,
		/** `whisperer_chosen` (world.ts:708), before the start points. */
		whispers: 100,
		/** The start points of every resident. */
		ledger: 200,
		/** The escrow of every cast member, funded from the system account. */
		cast: 300,
		/** Every playable level dealt up front, the teams behind a door. */
		puzzles: 400,
		/** The core motives, with the first act. */
		motives: 500,
		/** `#noteActStarts(startLevel)`: `act_started` (goals dealt, the seal begun), then the locks. */
		progression: 600,
		/** `run_start`, after everything the world wrote. */
		arena: 1000,
	},
	/**
	 * The old `World#restore` after the slices were read, in its order (world.ts:3083-3125); the
	 * host runs these once before the first minute of a resumed run (round 2, R2-D9).
	 */
	runResumed: {
		/** `#dealCoreMotives`: a file from before the core motives gets them first. */
		motives: 100,
		/** A cast member the story added after the snapshot gets its escrow (`LedgerApi.has`, `open`, `mint`). */
		cast: 200,
		/** The door (`state.door ?? holdAfter`, clamped), act starts, `#noteActStarts` (`act_started`), the locks. */
		progression: 300,
		/** Levels not in the file are dealt; a re-deal that differs is announced (after the door: none behind it). */
		puzzles: 400,
	},
	/** `Arena#nextMinute`: openDoor, `World.startMinute`, openDoor, `Director.startMinute`. */
	minuteStarted: {
		/** The strategy brain reopens the post cap of the teams in a retro window (tic-tac-toe teams). */
		strategyBrain: 20,
		/** The consensus gate notes which team is on move for a whole minute. */
		consensus: 10,
		/** Trick play notes which action is open at the minute's start, for its move timer. */
		trickPlay: 10,
		/** An old snapshot without core motives gets them before anything else of the minute (until motives moves to `runResumed.motives`, R2-D9). */
		motives: 50,
		/** `openDoor` before the ticks (not at minute 0: the first minute had none). */
		progressionDoor: 100,
		/** `#names.settle`: names chosen in time are given. */
		names: 200,
		/** `#tribunal.tick`. */
		tribunal: 300,
		/** `#seal.tick`. */
		seal: 400,
		/** `#standoff.tick`: ultimatums due. */
		standoff: 500,
		/** `#whisperDuty`, then the popularity vote (a vote counted at a door's minute comes before the door). */
		whispers: 600,
		/** `#openOnClock`: the door clock. */
		progressionClock: 700,
		/** `#holdout.tick`: blockers and the holdout tribunal. */
		standoffTribunal: 800,
		/** The tribunal's act is over once its target is reached: `ProgressionApi.endAct`. */
		tribunalActEnd: 900,
		/** `openDoor` again: a door may open once the last laggard was exiled. */
		progressionDoorAgain: 1000,
		/** `Director.startMinute` starts with `expirePetitions`. */
		petitions: 1100,
		/** `#endCollectionsAfterSolve`, before the minute's triggers. */
		cast: 1200,
		/** The director's time triggers. */
		script: 1300,
	},
	/** `Arena#inputsFor`: the cues, the status line and the task read first; the inbox is emptied after (it issues receipts and notices). */
	turnInputs: {
		/** The figure's cues (kind `character`). */
		script: 100,
		/** Every status part and the task: they only read. */
		status: 200,
		/** `drainMailbox` (receipts, delivery notices), then `drainNotices`. */
		channelsInbox: 800,
		/** The digest of unread board and group posts. */
		channelsDigest: 900,
		/** The strategy brain's context-reset briefing and retro lines come first, then the team chat and the vote lines (tic-tac-toe teams). */
		strategyBrain: 300,
		/** The economics games' rules and decision requests, after the brain's context reset. */
		econGames: 350,
		/** Trick play's game record and table status, after the brain's context reset. */
		trickPlay: 350,
		/** The draft's rules and pick requests (Quarry), after the brain's context reset. */
		draftRounds: 350,
		/** The chess rules and the position for the seat on move, after the brain's context reset. */
		chess: 350,
		/** Hold'em's rules, hole cards, the hand's record and the turn line, after the brain's context reset. */
		holdem: 360,
		/** The team channel's new posts. */
		teamChannel: 400,
		/** The consensus gate's vote requests and go-ahead. */
		consensus: 500,
	},
	/** The end of a round. */
	minuteEnded: {
		/** The consensus move timer (it may play a forfeit move that ends a game) comes before the brain's retro windows. */
		consensus: 100,
		/** The economics games' phase deadline (it may end a game and open a retro) comes before the brain's retro windows. */
		econGames: 150,
		/** Trick play's move timer (it may end a game and open a retro) comes before the brain's retro windows. */
		trickPlay: 150,
		/** The draft's pick deadline (it may end a game and open a retro) comes before the brain's retro windows. */
		draftRounds: 150,
		/** Hold'em's action deadline (it may end a game and open a retro) comes before the brain's retro windows. */
		holdem: 160,
		/** The strategy brain closes retro windows at the minute's end. */
		strategyBrain: 200,
		/** The standoff takes the situation it reports (writes nothing; T4b R2-8). */
		standoff: 500,
		/** `round_end`, after every mechanic's own end of the minute. */
		arena: 1000,
	},
	/** The end of `Arena.run`: closeActs, closePetitions, settleTreasuries, `run_end`. */
	runEnded: {
		/** `closeActs`: `act_ended` (the seal ends, then the goals resolve). */
		progression: 100,
		/** `closePetitions` (the script's onFail actions are staged calls; they run before `run_ended`). */
		petitions: 200,
		/** `settleTreasuries`. */
		channels: 300,
		/** `run_end`. */
		arena: 1000,
	},
} as const;

/**
 * The overseers' order in the `between` slot (step 18, C1 request 1, C2 request 5, O2 request 1):
 * the classifier first (the gamemaker reads the labels of the round it looks at), then the weaver
 * (it reads the classifier's labels and the round's hard facts; its act ends at `weaver`, its hits
 * at `weaver + 1`), then the gamemaker, as the old observers ran (Arena.run: interpret, weave,
 * observe). A trigger without an order sorts at 0, before all three.
 */
export const OVERSEER_ORDER = { classifier: 100, weaver: 200, gamemaker: 300 } as const;

/** Listener orders where the old engine called several mechanics back in a fixed order. */
export const LISTENER_ORDER = {
	/** `#noteActStarts`: the goals are dealt, then the seal begins. */
	act_started: { goals: 100, seal: 200 },
	/** `#endAct`: the seal ends, then the goals are resolved (golden f10g10 #835 before #836). */
	act_ended: { seal: 100, goals: 200 },
	/** State that follows a level first, the director's `onEnter` rules last. */
	level_entered: { cast: 100, script: 900 },
	/** Whoever keeps state about the exiled first, the director last. */
	exiled: { channels: 100, whispers: 200, cast: 300, script: 900 },
} as const;

/**
 * The old activation order (`activationOrder`, packages/engine/src/scheduler.ts): the whole roster
 * shuffled with `rngFor(seed, "order", round, pass)` (round = minute + 1), then those who may not
 * act left out. The default shuffle of the host draws another order.
 */
export function legacyTurnOrder(view: PassView): readonly ResidentId[] {
	return view.rng("order", view.minute + 1, view.pass).shuffle(view.roster).filter((id) => view.residents.includes(id));
}

/** The turn policy of the old arena, field for field what a story's `run` said, plus the old order and input kinds. */
export function legacyTurns(run: { readonly passesPerMinute: number; readonly blockSize: number; readonly activation: "always" | "onNovelty" }): TurnPolicy {
	return { passes: run.passesPerMinute, blockSize: run.blockSize, activation: run.activation === "onNovelty" ? "onNews" : "always", order: legacyTurnOrder, inputs: INPUT_KINDS };
}
