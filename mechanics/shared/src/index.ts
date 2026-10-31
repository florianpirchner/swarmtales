/**
 * What more than one mechanic shares: the APIs (`defineApi`), the events other mechanics listen to
 * (`defineEvents`), small schemas used in APIs, options and slices, and the turn input's kinds and
 * status order. FROZEN in wave 3.0 (test/mechanics/shared-frozen.test.ts): the four wave 3 teams
 * build against it in parallel and do not edit it; a change goes through the integration owner
 * (docs/design/carve-plan.md, "Shared files").
 */
export { ChannelsEvents, CastEvents, ExileEvents, LEGACY_SILENT_EVENTS, LedgerEvents, PetitionsEvents, ProgressionEvents, SHARED_EVENTS, WhispersEvents } from "./events.ts";
export { BoardPost, DmRecord, Done, GroupPost, HeldPiece, MarksChannel, MarksLeft, NoticeTarget, OfResident, PenaltyLadder, RankEntry, Receipt, ReceiptBody, ResidentId, Standing } from "./schemas.ts";
export { LedgerApi, MarksApi, NamesApi, ReceiptsApi } from "./economy.ts";
export { CastApi, ChannelsApi, MotivesApi, DmWindow, NoteTarget, NotesApi, PetitionsApi } from "./messages.ts";
export { GoalsApi, ProgressionApi, PuzzlesApi, Team } from "./progress.ts";
export { ExileApi, SealApi, StandoffApi, StandoffTribunalApi, TribunalApi } from "./conflict.ts";
export { INPUT_KINDS, STATUS_ORDER } from "./turn-input.ts";
export { HOOK_ORDER, LISTENER_ORDER, legacyTurnOrder, legacyTurns } from "./order.ts";

import { LedgerApi, MarksApi, NamesApi, ReceiptsApi } from "./economy.ts";
import { CastApi, ChannelsApi, MotivesApi, NotesApi, PetitionsApi } from "./messages.ts";
import { GoalsApi, ProgressionApi, PuzzlesApi } from "./progress.ts";
import { ExileApi, SealApi, StandoffApi, StandoffTribunalApi, TribunalApi } from "./conflict.ts";

/** Every shared API, in carve order. */
export const SHARED_APIS = [
	NamesApi,
	LedgerApi,
	MarksApi,
	ChannelsApi,
	NotesApi,
	ReceiptsApi,
	PuzzlesApi,
	ProgressionApi,
	CastApi,
	MotivesApi,
	GoalsApi,
	PetitionsApi,
	StandoffApi,
	ExileApi,
	TribunalApi,
	SealApi,
	StandoffTribunalApi,
] as const;
