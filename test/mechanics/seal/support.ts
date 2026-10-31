/**
 * Support of the seal tests (team T4b): stand-ins of exile and tribunal (team T4a), a progression
 * stand-in that writes the act signals at the minutes a test names, and the stand-ins of goals and
 * cast that write their golden lines in their slots of the order table, so `goldenOrder` sees the
 * seal among its neighbours. Ledger and channels come from the T4 support (`TestWorld`).
 */
import { Type } from "typebox";
import { defineMechanic } from "@swarmtales/kernel";
import type { LegacyLine } from "@swarmtales/testkit";
import { ExileApi, ExileEvents, HOOK_ORDER, LISTENER_ORDER, ProgressionApi, ProgressionEvents, SealApi, TribunalApi, type Standing } from "@swarmtales/mechanic-shared";
import { TestWorld } from "../standoff/support/world.ts";
import { provider } from "../standoff/support/provider.ts";

/** The T4 world plus what exile and the tribunal stand in for. */
export class ConflictWorld extends TestWorld {
	readonly standings = new Map<string, Standing>();
	readonly strikes: { readonly resident: string; readonly by: string }[] = [];
	missing = 3;
	/** `act_started` per minute (fromLevel), written at the start of that minute. */
	readonly actStartAt = new Map<number, number>();
	/** Minutes at whose start `act_ended` is written (fromLevel); every act still running ends at the run's end. */
	readonly actEndAt = new Map<number, number>();
	/** Acts begun and not ended (the stand-in's state, kept here so a resumed host continues it). */
	readonly running = new Set<number>();

	standingOf(id: string): Standing {
		return this.standings.get(id) ?? { kind: "alive" };
	}
}

/** Stand-in exile: standings from the world; `strike` exiles at once and tells the seal (old `#onExiled`). */
export function exileStandIn(world: ConflictWorld) {
	return defineMechanic(
		{ id: "exile", summary: "Stand-in exile.", options: Type.Object({}), state: (): undefined => undefined, events: ExileEvents.events, provides: [ExileApi], uses: [SealApi] },
		(kit) => ({
			services: [
				kit.provideSome(ExileApi, {
					isExiled: ({ resident }) => world.standingOf(resident).kind === "exiled",
					standing: ({ resident }) => world.standingOf(resident),
					alive: (_input, ctx) => ctx.residents.ids.filter((id) => world.standingOf(id).kind !== "exiled"),
					exiledBy: ({ resident }) => (world.standingOf(resident).kind === "exiled" ? "seal" : null),
					strike: ({ resident, by }, ctx) => {
						world.strikes.push({ resident, by });
						world.standings.set(resident, { kind: "exiled" });
						ctx.emit("exiled", { agent: resident, by });
						ctx.tryCall(SealApi, "onExiled", { resident });
						return { ok: true as const };
					},
				}),
			],
		}),
	);
}

/** Stand-in tribunal: how many exiles are missing comes from the world. */
export function tribunalStandIn(world: ConflictWorld) {
	return provider("tribunal", TribunalApi, {
		missing: () => world.missing,
		inSession: () => false,
		ransomPrices: () => ({ price: 0, selfPrice: 0 }),
	});
}

/** Stand-in progression: levels from the world; the act signals at the minutes the world names, and at the run's end. */
export function actProgressionStandIn(world: ConflictWorld) {
	const begun = world.running;
	return defineMechanic(
		{ id: "progression", summary: "Stand-in progression with act signals.", options: Type.Object({}), state: (): undefined => undefined, events: ProgressionEvents.events, provides: [ProgressionApi], uses: [ExileApi] },
		(kit) => ({
			services: [
				kit.provideSome(ProgressionApi, {
					levelOf: ({ resident }) => world.levelOf(resident),
					hasPassed: ({ resident, level }) => world.hasPassed(resident, level),
					currentAct: () => world.currentAct,
				}),
			],
			hooks: {
				minuteStarted: {
					order: HOOK_ORDER.minuteStarted.progressionDoor,
					run: (ctx) => {
						const ended = world.actEndAt.get(ctx.minute);
						if (ended !== undefined && begun.delete(ended)) ctx.emit("act_ended", { fromLevel: ended });
						const started = world.actStartAt.get(ctx.minute);
						if (started === undefined) return;
						begun.add(started);
						const residents = ctx.tryCall(ExileApi, "alive", {}) ?? [...ctx.residents.ids];
						ctx.emit("act_started", { fromLevel: started, residents });
					},
				},
				runEnded: {
					order: HOOK_ORDER.runEnded.progression,
					run: (_reason, ctx) => {
						for (const fromLevel of [...begun].sort((a, b) => a - b)) ctx.emit("act_ended", { fromLevel });
						begun.clear();
					},
				},
			},
		}),
	);
}

function fieldsOf(line: LegacyLine): Record<string, unknown> {
	return Object.fromEntries(Object.entries(line).filter(([key]) => !["type", "seq", "minute", "at"].includes(key)));
}

const loose = (types: readonly string[]) => Object.fromEntries(types.map((type) => [type, Type.Object({})]));

/**
 * Stand-in goals: writes its golden `goal_dealt` lines when the act begins (`LISTENER_ORDER.act_started.goals`)
 * and its `goal_resolved` lines when it ends (`LISTENER_ORDER.act_ended.goals`).
 */
export function goalsLinesStandIn(golden: readonly LegacyLine[], act: number) {
	const dealt = golden.filter((line) => line.type === "goal_dealt");
	const resolved = golden.filter((line) => line.type === "goal_resolved");
	return defineMechanic(
		{ id: "goals", summary: "Stand-in goals writing golden lines.", options: Type.Object({}), state: (): undefined => undefined, events: loose(["goal_dealt", "goal_resolved"]) },
		(kit) => ({
			listeners: [
				kit.listen(
					ProgressionEvents,
					"act_started",
					({ fromLevel }, ctx) => {
						if (fromLevel === act) for (const line of dealt) ctx.emit("goal_dealt", fieldsOf(line));
					},
					{ order: LISTENER_ORDER.act_started.goals },
				),
				kit.listen(
					ProgressionEvents,
					"act_ended",
					({ fromLevel }, ctx) => {
						if (fromLevel === act) for (const line of resolved) ctx.emit("goal_resolved", fieldsOf(line));
					},
					{ order: LISTENER_ORDER.act_ended.goals },
				),
			],
		}),
	);
}

/** Stand-in cast: writes each golden cast line at the start of its minute (`HOOK_ORDER.minuteStarted.cast`). */
export function castLinesStandIn(golden: readonly LegacyLine[]) {
	const types = ["cast_revealed", "collection_started", "collection_shortened"];
	const lines = golden.filter((line) => types.includes(String(line.type)));
	return defineMechanic(
		{ id: "cast", summary: "Stand-in cast writing golden lines.", options: Type.Object({}), state: (): undefined => undefined, events: loose(types) },
		() => ({
			hooks: {
				minuteStarted: {
					order: HOOK_ORDER.minuteStarted.cast,
					run: (ctx) => {
						for (const line of lines) if (line.minute === ctx.minute) ctx.emit(String(line.type), fieldsOf(line));
					},
				},
			},
		}),
	);
}
