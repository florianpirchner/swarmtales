/**
 * Who writes each event of today's log once `World` is carved into mechanics
 * (docs/design/carve-plan.md): a mechanic id, `app` (the agent runner and the model-backed roles,
 * written with `host.record`) or `core` (a core event the legacy adapter translates). The table is
 * typed by the engine's event union, so a new event type without an owner does not compile.
 */
import type { ArenaEventType } from "@swarmtales/contracts";

/** The overseers that write old events under their own source (step 18, C1 request 5); they are not mechanics. */
export const LEGACY_OVERSEERS = ["classifier", "weaver"] as const;

/** The mechanics of the carve plan, the overseers that write old events, plus the app and the core. */
export type LegacyOwner =
	| "app"
	| "core"
	| (typeof LEGACY_OVERSEERS)[number]
	| "arena"
	| "ledger"
	| "puzzles"
	| "progression"
	| "channels"
	| "marks"
	| "receipts"
	| "names"
	| "cast"
	| "motives"
	| "goals"
	| "petitions"
	| "seal"
	| "standoff"
	| "exile"
	| "tribunal"
	| "standoff-tribunal"
	| "whispers"
	| "script";

export const LEGACY_EVENT_OWNERS: Readonly<Record<ArenaEventType, LegacyOwner>> = {
	// The turn loop: round_start, pass_start and turn_skipped come from core events (LEGACY_CORE_TRANSLATORS).
	run_start: "arena",
	run_resumed: "app",
	round_start: "arena",
	pass_start: "arena",
	round_end: "arena",
	turn_skipped: "arena",
	act_brake: "arena",
	run_end: "arena",
	// The agent runner and the roles.
	turn_input: "app",
	request: "app",
	thinking: "app",
	text: "app",
	tool_call: "app",
	tool_result: "app",
	turn_error: "app",
	souffleur_rewrite: "app",
	usage: "app",
	agent_profile: "app",
	gamemaker_turn: "app",
	gamemaker_thinking: "app",
	gamemaker_text: "app",
	gamemaker_call: "app",
	gamemaker_result: "app",
	gamemaker_error: "app",
	// The classifier and the weaver are overseers (step 18, C1): they write these under their own source.
	interpretation: "classifier",
	interpretation_round: "classifier",
	interpretation_error: "classifier",
	fate_shift: "weaver",
	guard_verdict: "core",
	ledger_entry: "ledger",
	transfer: "ledger",
	submission: "progression",
	level_up: "progression",
	tools_unlocked: "progression",
	// The exclusions are the puzzles' state; exile calls `PuzzlesApi.contract` (review 2c, carve plan corrections).
	level_contracted: "puzzles",
	fragments_dealt: "puzzles",
	factors_dealt: "puzzles",
	factor_revealed: "puzzles",
	factor_burned: "puzzles",
	board_post: "channels",
	dm_sent: "channels",
	dm_delivered: "channels",
	notice: "channels",
	group_created: "channels",
	group_removed: "channels",
	group_membership: "channels",
	group_post: "channels",
	treasury_deposit: "channels",
	treasury_withdrawal: "channels",
	treasurer_set: "channels",
	treasury_settled: "channels",
	marks_spent: "marks",
	receipt_issued: "receipts",
	receipt_shown: "receipts",
	blame: "receipts",
	name_chosen: "names",
	cast_level_set: "cast",
	cast_revealed: "cast",
	cast_retired: "cast",
	cast_dm: "cast",
	collection_started: "cast",
	collection_shortened: "cast",
	collection_revealed: "cast",
	lottery_drawn: "cast",
	core_dealt: "motives",
	goal_dealt: "goals",
	goal_resolved: "goals",
	petition_opened: "petitions",
	petition_signed: "petitions",
	petition_resolved: "petitions",
	seal_auction_opened: "seal",
	seal_bid: "seal",
	seal_won: "seal",
	seal_used: "seal",
	seal_expired: "seal",
	piece_kept: "standoff",
	piece_claimed: "standoff",
	piece_given: "standoff",
	ultimatum_set: "standoff",
	ultimatum_resolved: "standoff",
	exile_gate: "exile",
	ransom_paid: "exile",
	ransomed: "exile",
	exiled: "exile",
	last_will: "exile",
	tribunal_announced: "tribunal",
	tribunal_scheduled: "tribunal",
	tribunal_cancelled: "tribunal",
	tribunal_called: "tribunal",
	tribunal_opened: "tribunal",
	faction_nominated: "tribunal",
	faction_leaders: "tribunal",
	faction_applied: "tribunal",
	faction_refused: "tribunal",
	factions_formed: "tribunal",
	bloc_result: "tribunal",
	tribunal_vote: "tribunal",
	tribunal_result: "tribunal",
	blocker_found: "standoff-tribunal",
	blocker_cleared: "standoff-tribunal",
	holdout_called: "standoff-tribunal",
	lot_drawn: "standoff-tribunal",
	holdout_vote_opened: "standoff-tribunal",
	holdout_ballot: "standoff-tribunal",
	holdout_vote_result: "standoff-tribunal",
	holdout_announced: "standoff-tribunal",
	holdout_ended: "standoff-tribunal",
	whisperer_chosen: "whispers",
	whisper_duty: "whispers",
	popularity_opened: "whispers",
	popularity_ballot: "whispers",
	popularity_result: "whispers",
	receipt_forged: "whispers",
	director_action: "script",
	director_skipped: "script",
	standings_published: "script",
	// The gamemaker's tools write their texts through channels (`NotesApi`, wave 3.5 T2 request 1).
	gamemaker_note: "channels",
	gamemaker_defied: "channels",
};

function isLegacyType(type: string): type is ArenaEventType {
	return Object.hasOwn(LEGACY_EVENT_OWNERS, type);
}

/** The owner of a legacy event type; unknown types belong to `app` (a log may hold newer ones). */
export function legacyOwner(type: string): LegacyOwner {
	return isLegacyType(type) ? LEGACY_EVENT_OWNERS[type] : "app";
}
