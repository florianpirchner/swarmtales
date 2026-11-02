/**
 * The run log's event types and the old bus moved to `@swarmtales/legacy-log` (step 18, item 7c;
 * the bus by team P2); re-exported here until the engine goes.
 */
export { EventBus, FATE_TRIGGERS } from "@swarmtales/legacy-log";
export type { ArenaEvent, ArenaEventType, AuditTag, BoardPostKind, CoreMotiveDrive, CoreMotiveTrait, EventSink, FateShiftKind, FateTrigger, FragmentHolding, Goal, RecordedEvent, StandingRow, TribunalPlanner } from "@swarmtales/legacy-log";
