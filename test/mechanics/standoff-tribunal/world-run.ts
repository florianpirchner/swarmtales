/**
 * The holdout tribunal on the old engine as it really ran (carve-round3-T4b.md must-fixes 4 and 5),
 * as it was recorded once before the engine went (step 18, item 7b): the Whispers story composed by the old CLI (`composeRun`, through `createFixture`) with its
 * `World`, arena and `Gamemaker`, scripted residents and a scripted gamemaker. Nothing is wired by
 * hand: the ports of world.ts:735-760, `#onStruck`, `enabledTools`, `holdoutParts` and the
 * gamemaker's `#checked` and `#deliver` are the old engine's own.
 *
 * The city: door 1 opens at minute 0; everyone but A01 sends its fragment to all at once; A01
 * passes the door at minute 1 and keeps its own, so from minute 3 A01 blocks the door for the five.
 */
import type { RecordedEvent } from "@swarmtales/legacy-log";
import whispers from "../../../stories/whispers/story.ts";
import { RecordedEventSchema } from "@swarmtales/chronicle";
import { Type } from "typebox";
import { currentScenario, recordedOld, replayAt } from "../../helpers/old-engine.ts";

export const WORLD_IDS = ["A01", "A02", "A03", "A04", "A05", "A06"] as const;
export const WORLD_MINUTES = 10;

/** One gamemaker call of the script. */
export type GamemakerCall =
	| { readonly name: "callTribunal"; readonly args: { readonly accused: readonly string[]; readonly reason: string } }
	| { readonly name: "announceTribunal"; readonly args: { readonly text: string } }
	| { readonly name: "permaDeath"; readonly args: { readonly agent: string; readonly reason: string } }
	| { readonly name: "drawLot"; readonly args: { readonly candidates: readonly string[] } };

/** What the scenario does per minute: the gamemaker's calls after the residents' turns, the five's ballots. */
export interface WorldPlan {
	/** The calls, from the fragments of door 1 the old world dealt. */
	readonly calls: (fragments: Readonly<Record<string, string>>) => Readonly<Record<number, readonly GamemakerCall[]>>;
	/** The minute the five vote yes (the first vote opens at minute 6). */
	readonly voteAt?: number;
}

export interface WorldRun {
	readonly events: readonly RecordedEvent[];
	/** The fragments and passwords of door 1, as the old world dealt them. */
	readonly fragments: Readonly<Record<string, string>>;
	readonly passwords: Readonly<Record<string, string>>;
}

const Texts = Type.Record(Type.String(), Type.String());
const Recorded = Type.Object({ events: Type.Array(RecordedEventSchema), fragments: Texts, passwords: Texts });

/** The old engine's run of the plan, as it was recorded once before the engine went (step 18, item 7b; `test/fixtures/old-engine/`). */
export function runWorld(plan: WorldPlan): Promise<WorldRun> {
	const { name, scenario } = currentScenario();
	const input = (fragments: Readonly<Record<string, string>>) => ({ story: whispers, voteAt: plan.voteAt ?? null, calls: plan.calls(fragments) });
	const fragments = recordedOld(name, scenario, Type.Object({ value: Type.Object({ fragments: Texts }) })).value.fragments;
	return Promise.resolve(replayAt(name, scenario, input(fragments), Recorded));
}

