/**
 * The holdout tribunal on the old engine as it really ran (carve-round3-T4b.md must-fixes 4 and 5):
 * the Whispers story composed by the old CLI (`composeRun`, through `createFixture`) with its
 * `World`, arena and `Gamemaker`, scripted residents and a scripted gamemaker. Nothing is wired by
 * hand: the ports of world.ts:735-760, `#onStruck`, `enabledTools`, `holdoutParts` and the
 * gamemaker's `#checked` and `#deliver` are the old engine's own.
 *
 * The city: door 1 opens at minute 0; everyone but A01 sends its fragment to all at once; A01
 * passes the door at minute 1 and keeps its own, so from minute 3 A01 blocks the door for the five.
 */
import type { AssistantMessage, FauxResponseStep } from "@earendil-works/pi-ai";
import type { RecordedEvent } from "@swarmtales/legacy-log";
import type { World } from "@swarmtales/engine";
import type { Script } from "@swarmtales/models";
import whispers from "../../../stories/whispers/story.ts";
import { act, createFixture, say } from "../../helpers/fixture.ts";
import { RecordedEventSchema } from "@swarmtales/chronicle";
import { Type } from "typebox";
import { currentScenario, fingerprintOf, recordedOld, replayAt } from "../../helpers/old-engine.ts";
import { RECORDING, recordOld } from "../../helpers/old-engine-recorder.ts";

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

const others = (world: World, id: string): readonly string[] => world.competitors.filter((other) => other !== id);

function residents(world: World, voteAt: number | undefined): Script {
	const script: Record<string, FauxResponseStep[]> = {};
	for (const id of world.competitors) {
		script[id] = Array.from({ length: WORLD_MINUTES + 2 }, (): FauxResponseStep => () => {
			const minute = world.minute;
			if (minute === 0 && id !== "A01") return act(...others(world, id).map((target) => ({ name: "sendDM", args: { target, message: `Door 1, mine: ${world.inspect.fragmentOf(id, 1)}` } })));
			if (minute === 1 && id === "A01") return act({ name: "submitSolution", args: { level: 1, code: world.inspect.passwordOf(id, 1) } });
			if (minute === voteAt && id !== "A01") return act({ name: "tribunalVote", args: { yes: true } });
			return say();
		});
	}
	return script;
}

/** The gamemaker's looks: the planned calls of a minute in one step, then a plain answer to close the tool loop. */
function gamemaker(world: World, calls: Readonly<Record<number, readonly GamemakerCall[]>>): readonly FauxResponseStep[] {
	let answered = true;
	return Array.from({ length: 3 * WORLD_MINUTES }, (): FauxResponseStep => () => {
		if (!answered) {
			answered = true;
			return say("Done.");
		}
		const planned = calls[world.minute];
		answered = planned === undefined;
		const message: AssistantMessage = planned === undefined ? say("Nothing to add.") : act(...planned.map((call) => ({ name: call.name, args: { ...call.args } })));
		return message;
	});
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
export async function runWorld(plan: WorldPlan): Promise<WorldRun> {
	const { name, scenario } = currentScenario();
	const input = (fragments: Readonly<Record<string, string>>) => ({ story: whispers, voteAt: plan.voteAt ?? null, calls: plan.calls(fragments) });
	if (RECORDING) {
		const live = await runWorldLive(plan);
		recordOld(name, scenario, { fingerprint: fingerprintOf(input(live.fragments)), value: live });
	}
	const fragments = recordedOld(name, scenario, Type.Object({ value: Type.Object({ fragments: Texts }) })).value.fragments;
	return replayAt(name, scenario, input(fragments), Recorded);
}

/** The live old run (recording only; deleted with the engine). */
async function runWorldLive(plan: WorldPlan): Promise<WorldRun> {
	const fixture = createFixture({
		story: whispers,
		agents: WORLD_IDS.length,
		minutes: WORLD_MINUTES,
		script: (world) => residents(world, plan.voteAt),
		gamemakerScript: (world) => gamemaker(world, plan.calls(Object.fromEntries(WORLD_IDS.map((id) => [id, world.inspect.fragmentOf(id, 1)])))),
	});
	const world = fixture.world;
	const fragments = Object.fromEntries(WORLD_IDS.map((id) => [id, world.inspect.fragmentOf(id, 1)]));
	const passwords = Object.fromEntries(WORLD_IDS.map((id) => [id, world.inspect.passwordOf(id, 1)]));
	await fixture.run();
	return { events: fixture.log.events, fragments, passwords };
}
