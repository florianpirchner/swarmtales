// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The city around the tribunal in the tests: a world of levels, fragments and direct messages by tick, and the
 * stand-ins of `progression` (the levels and the door clock) and `puzzles` (the service `holdout-pieces`) that read
 * it. The world is a pure function of the tick, so a resumed run reads what the straight run read.
 */
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { ProgressionService } from "@swarmtales/mechanic-progression/contract";
import { defineHead, defineMechanic, type MechanicUse } from "@swarmtales/sdk";
import { HoldoutPiecesService } from "../src/contract.ts";

/** A direct message: from whom to whom, its text, and the tick it was sent in. */
export interface Dm {
	readonly tick: number;
	readonly from: string;
	readonly to: string;
	readonly text: string;
}

/** The world: every resident's level-ups, the fragments of each door, the messages, and the tick each door opens. */
export interface World {
	readonly residents: readonly string[];
	/** Per resident, the levels it entered with the tick, in order. */
	readonly ups: ReadonlyMap<string, readonly (readonly [tick: number, level: number])[]>;
	/** Per door, each resident's fragment. */
	readonly fragments: ReadonlyMap<number, ReadonlyMap<string, string>>;
	readonly dms: readonly Dm[];
	readonly opensAt: (level: number) => number;
	readonly lastLevel: number;
	/** Whether the resident has had its turn in the tick: its level-ups and messages of the tick count from then on. */
	readonly turnTaken?: (resident: string, tick: number) => boolean;
}

// Whether what the resident did at `at` is done as the city looks at `tick`.
const done = (world: World, resident: string, at: number, tick: number): boolean => at < tick || (at === tick && world.turnTaken?.(resident, tick) === true);

const plain = (text: string): string => text.toUpperCase().replace(/[^A-Z0-9]/g, "");

/**
 * The level of a resident as a tick starts: the level-ups of the ticks before.
 *
 * @param world - The world.
 * @param resident - The resident.
 * @param tick - The tick.
 * @returns The level.
 */
export function levelAt(world: World, resident: string, tick: number): number {
	return (world.ups.get(resident) ?? []).filter(([at]) => done(world, resident, at, tick)).reduce((_, [, level]) => level, 1);
}

/**
 * Who stands before the door without the holder's fragment, sent to it before the tick (old `lackingFragment`).
 *
 * @param world - The world.
 * @param level - The door.
 * @param holder - The holder.
 * @param tick - The tick.
 * @param gone - Whether a resident is struck; a struck holder lacks nobody, a struck member is not counted.
 * @returns The residents, sorted.
 */
export function lackingAt(world: World, level: number, holder: string, tick: number, gone: (resident: string) => boolean = () => false): readonly string[] {
	const fragment = world.fragments.get(level)?.get(holder);
	if (fragment === undefined || gone(holder) || levelAt(world, holder, tick) < level) return [];
	const holds = (member: string): boolean => world.dms.some((dm) => done(world, dm.from, dm.tick, tick) && dm.from === holder && dm.to === member && plain(dm.text).includes(plain(fragment)));
	return world.residents.filter((member) => member !== holder && !gone(member) && levelAt(world, member, tick) === level && !holds(member)).sort((a, b) => a.localeCompare(b));
}

/**
 * The stand-ins of `puzzles` and `progression` over the world.
 *
 * @param world - The world.
 * @returns The two mechanics.
 */
export function cityOf(world: World): readonly MechanicUse[] {
	const pieces = defineMechanic(defineHead({ id: "puzzles", package: "@test/puzzles", summary: "Test: the pieces of the world.", provides: [HoldoutPiecesService], uses: [ExileService] }), {
		services: {
			"holdout-pieces": {
				openFragmentDoors: (_input, ctx) => [...world.fragments.keys()].filter((level) => ctx.tick >= world.opensAt(level)).sort((a, b) => a - b),
				lacking: ({ level, holder }, ctx) => [...lackingAt(world, level, holder, ctx.tick, (resident) => ctx.tryCall(ExileService, "isExiled", { resident }) === true)],
				// The fragments of the struck (old `inheritedFragments`, one team).
				inherited: ({ resident, level }, ctx) =>
					[...(world.fragments.get(level) ?? new Map<string, string>())].flatMap(([from, fragment]) => (from !== resident && ctx.tryCall(ExileService, "isExiled", { resident: from }) === true ? [{ from, fragment }] : [])),
			},
		},
	});
	const level = (resident: string, tick: number): number => levelAt(world, resident, tick);
	const progression = defineMechanic(defineHead({ id: "progression", package: "@test/progression", summary: "Test: the levels of the world.", provides: [ProgressionService] }), {
		services: {
			progression: {
				levelOf: ({ resident }, ctx) => level(resident, ctx.tick),
				isFinished: ({ resident }, ctx) => level(resident, ctx.tick) > world.lastLevel,
				hasPassed: ({ resident, level: door }, ctx) => level(resident, ctx.tick) > door,
				hasSolved: () => false,
				passed: () => [],
				lastProgress: () => -1,
				currentAct: () => 1,
				actStart: () => null,
				door: () => null,
				doorShut: () => false,
				openDoor: () => false,
				releaseDoor: () => null,
				unlock: () => null,
				ranking: () => [],
				holdersBehind: () => [],
				nextPenalty: () => 0,
				nextBlamePenalty: () => 0,
				chargeBlame: () => 0,
				endAct: () => false,
				isOpenOnClock: ({ level: door }, ctx) => ctx.tick >= world.opensAt(door),
				opensAt: ({ level: door }) => world.opensAt(door),
				bounds: () => ({ startLevel: 1, lastLevel: world.lastLevel, survivors: 1 }),
			},
		},
	});
	return [progression(), pieces()];
}
