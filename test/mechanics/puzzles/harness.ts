/**
 * Shared test support of team T3 (docs/design/carve-team-T3.md, "Gate"): the golden logs, the
 * options a story gives the puzzles mechanic, a collector for the lines a host writes in the old
 * shape, and the stand-in script that releases city factors as the old director did.
 */
import { join, resolve } from "node:path";
import { Type } from "typebox";
import { legacySink } from "@swarmtales/chronicle";
import type { AnyStory } from "@swarmtales/contracts";
import { defineMechanic, refuse, reply } from "@swarmtales/kernel";
import { ownedBy, readLegacyLog, type GoldenLine, type LegacyLine } from "@swarmtales/testkit";
import type { LegacyOwner } from "@swarmtales/chronicle";
import type { Host } from "@swarmtales/contracts";
import { ProgressionEvents, PuzzlesApi } from "@swarmtales/mechanic-shared";
import type { puzzles } from "@swarmtales/mechanic-puzzles";
import cityOfKeys from "../../../stories/cityofkeys/story.ts";
import whispers from "../../../stories/whispers/story.ts";

const GOLDEN_DIR = resolve(import.meta.dirname, "../../golden");

export const GOLDEN_NAMES = ["cityofkeys-f4g4", "cityofkeys-f10g10", "whispers-f10-grudge"] as const;
export type GoldenName = (typeof GOLDEN_NAMES)[number];

export const SEED = 7;

export function goldenLog(name: GoldenName): readonly LegacyLine[] {
	return readLegacyLog(join(GOLDEN_DIR, `${name}.events.jsonl`));
}

export function storyOf(name: GoldenName): AnyStory {
	return name.startsWith("whispers") ? whispers : cityOfKeys;
}

export function minutesOf(name: GoldenName): number {
	return name.startsWith("whispers") ? 20 : 12;
}

export const RESIDENTS = ["A01", "A02", "A03", "A04", "A05", "A06"] as const;

type PuzzlesInput = NonNullable<Parameters<typeof puzzles.with>[0]>;

/** The options a story gives the puzzles mechanic. */
export function puzzleOptions(story: AnyStory): Required<Pick<PuzzlesInput, "levels">> {
	return {
		levels: story.levels.map((level) => ({
			number: level.number,
			team: level.team,
			puzzle: level.puzzle.kind === "fragments" ? { ...level.puzzle, length: [level.puzzle.length[0], level.puzzle.length[1]] } : level.puzzle,
			...(level.opensAt === undefined ? {} : { opensAt: level.opensAt }),
		})),
	};
}

/** The lines a host wrote in the old shape, with the filter of the per-mechanic gate. */
export interface Collected {
	readonly records: LegacyLine[];
	/** The golden-style lines of the event types `owners` own, in log order. */
	owned(...owners: LegacyOwner[]): readonly GoldenLine[];
}

/** Collects the events a host writes, through the legacy adapter (which checks every event against the old schema). */
export function collect(host: Host): Collected {
	const records: LegacyLine[] = [];
	host.subscribe(legacySink((event) => records.push(Object.fromEntries(Object.entries(event)))));
	return { records, owned: (...owners) => ownedBy(records, owners) };
}

/**
 * A stand-in for the script (carve step 16): when a resident first reaches a level the golden run's
 * director released the city factor of, it posts the factor on the board, as the old rule did.
 */
export function factorScript(levels: readonly number[]) {
	const done = new Set<number>();
	return defineMechanic(
		{
			id: "script",
			summary: "Stand-in for the script: releases city factors on first arrival.",
			options: Type.Object({}),
			state: () => undefined,
			events: {},
			requires: [PuzzlesApi],
			uses: [PuzzlesApi],
			prompts: { "standin/tool": [] },
		},
		(kit) => ({
			tools: [
				kit.tool({
					name: "revealFactor",
					description: "standin/tool",
					parameters: Type.Object({ level: Type.Integer(), target: Type.Union([Type.Literal("board"), Type.Array(Type.String())]) }),
					suggest: ["script"],
					execute: (params, ctx) => {
						const result = ctx.tryCall(PuzzlesApi, "revealFactor", params);
						return result?.ok === true ? reply("revealed") : result?.ok === false ? refuse(result.code, result.detail) : refuse("ABSENT");
					},
				}),
			],
			listeners: [
				kit.listen(
					ProgressionEvents,
					"level_up",
					(payload, ctx) => {
						if (!levels.includes(payload.to) || done.has(payload.to)) return;
						done.add(payload.to);
						ctx.tryCall(PuzzlesApi, "revealFactor", { level: payload.to, target: "board" });
					},
					{ immediate: true },
				),
			],
		}),
	);
}
