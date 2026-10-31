/**
 * A city of real mechanics for the differential tests of team T1 (round 3): the channels, the
 * ledger, the marks, the receipts, the puzzles and the progression are the real ones. Nobody is
 * named (`noNames`) and the exile is not loaded unless a test adds it. The options come from the
 * story as the step-17 mapping will give them.
 */
import { Type } from "typebox";
import type { AnyStory, MechanicUse } from "@swarmtales/contracts";
import { defineMechanic } from "@swarmtales/kernel";
import { channels } from "@swarmtales/mechanic-channels";
import { ledger } from "@swarmtales/mechanic-ledger";
import { marks } from "@swarmtales/mechanic-marks";
import { progression } from "@swarmtales/mechanic-progression";
import { puzzles } from "@swarmtales/mechanic-puzzles";
import { receipts } from "@swarmtales/mechanic-receipts";
import { NamesApi } from "@swarmtales/mechanic-shared";
import { puzzleOptions } from "../puzzles/harness.ts";
import { progressionOptions } from "../progression/harness.ts";
import { marksStandIn } from "../channels/stand-ins.ts";
import { channelsOptionsOf, marksOptions } from "../t2/golden-world.ts";

/** The book of a run nobody named: no names, ids stay ids, no choose-name line under a task. */
export function noNames(): MechanicUse {
	return defineMechanic(
		{ id: "names", summary: "A book without names.", options: Type.Object({}), state: () => undefined, events: {}, provides: [NamesApi] },
		(kit) => ({
			services: [
				kit.provide(NamesApi, {
					hasNames: () => false,
					nameOf: () => null,
					labelOf: (input) => input.resident,
					resolve: (input) => input.text,
					taskLine: () => null,
				}),
			],
		}),
	).with();
}

/** The mechanics of a plain city of the story, all real except the names. */
export function realCity(story: AnyStory): readonly MechanicUse[] {
	const rules = marksOptions(story);
	const quoteDms = story.rules.receipts?.quoteDms === true;
	// The step-17 mapping: the minimal run of the first postBoard guard rule with secrets, only in a story with a guard.
	const minRun = story.guards?.rules.find((rule) => rule.tools.includes("postBoard") && rule.secrets !== undefined)?.secrets?.minRun;
	return [
		ledger.with({ startPoints: story.run.startPoints }),
		channels.with({ ...channelsOptionsOf(story), quoteDms }),
		receipts.with({ quoteDms, ...(minRun === undefined ? {} : { minRun }) }),
		rules === undefined ? marksStandIn().with() : marks.with(rules),
		noNames(),
		puzzles.with(puzzleOptions(story)),
		progression.with(progressionOptions(story)),
	];
}
