/**
 * The differential harness of the T2 mechanics: the same planned calls are played through the old
 * engine (a composed `World` with scripted competitors and a scripted gamemaker, the real
 * `tools/*.ts`) and through the real channels, cast, petitions, receipts, ledger and marks on the new
 * host (progression, names and exile are stand-ins). Replies, the lines each side wrote, the notices
 * and the snapshot state are then compared by the tests.
 */
import type { AnyStory, Host, TurnTaker } from "@swarmtales/contracts";
import { createHost, defineCoreStory } from "@swarmtales/kernel";
import { cast, castOptionsFromStory } from "@swarmtales/mechanic-cast";
import { channels } from "@swarmtales/mechanic-channels";
import { ledger } from "@swarmtales/mechanic-ledger";
import { marks } from "@swarmtales/mechanic-marks";
import { petitions } from "@swarmtales/mechanic-petitions";
import { receipts } from "@swarmtales/mechanic-receipts";
import { legacyTurns } from "@swarmtales/mechanic-shared";
import { createPromptLookup } from "@swarmtales/prompts";
import type { PlannedCall } from "@swarmtales/testkit";
import { Type } from "typebox";
import { currentScenario, expectFingerprint, fingerprintOf, planTable, recordedOld } from "../../helpers/old-engine.ts";
import { OldWorldRecord, RecordedWorld } from "../../helpers/old-world.ts";
import { ids } from "../t1/support.ts";
import { exileStandIn, progressionStandIn } from "../t1/stand-ins.ts";
import { replyText } from "../t1/differential.ts";
import type { MechanicUse } from "@swarmtales/contracts";
import { channelsOptionsOf, marksOptions } from "../t2/golden-world.ts";
import { marksStandIn, namesStandIn } from "./stand-ins.ts";

export type Plan = (agent: string, minute: number) => readonly PlannedCall[];

export interface Spec {
	readonly story: AnyStory;
	readonly agents: number;
	readonly minutes: number;
	readonly plan: Plan;
	/** The gamemaker's calls of a minute, made after the last resident's turn. */
	readonly gamemaker?: (minute: number) => readonly PlannedCall[];
	/** Mechanics beside the ones every run has (the petitions' driver, a stand-in script). */
	readonly extra?: readonly MechanicUse[];
	/** Resident tools beside the channels tools (`signPetition`, `listPetitions`). */
	readonly tools?: readonly string[];
}

export interface Played {
	/** `minute:agent` to the replies in call order (`isError|text`). */
	readonly replies: ReadonlyMap<string, readonly string[]>;
	/** The gamemaker's replies in call order (`isError|text`). */
	readonly gamemaker: readonly string[];
}

export interface OldPlayed extends Played {
	/** What the tests read from the old World after its run. */
	readonly world: RecordedWorld;
	readonly events: readonly { readonly type: string; readonly [field: string]: unknown }[];
}

const OldRecord = Type.Object({
	fingerprint: Type.String(),
	replies: Type.Array(Type.Tuple([Type.String(), Type.Array(Type.String())])),
	gamemaker: Type.Array(Type.String()),
	world: OldWorldRecord,
	events: Type.Array(Type.Intersect([Type.Object({ type: Type.String() }), Type.Record(Type.String(), Type.Unknown())])),
});

export interface NewPlayed extends Played {
	readonly host: Host;
}

/** The resident tools of channels (and `defy`, which it owns by carve decision D-7). */
export const TOOLS = ["readBoard", "postBoard", "sendDM", "createGroup", "addGroupMember", "removeGroupMember", "leaveGroup", "listMyGroups", "postGroup", "readGroup", "depositGroup", "withdrawGroup", "setTreasurer", "defy"] as const;

const key = (minute: number, agent: string): string => `${String(minute)}:${agent}`;

/** The old side's inputs: the story, the roster, every resident call and every gamemaker call. */
function fingerprint(spec: Spec): string {
	const gm = spec.gamemaker;
	return fingerprintOf({ story: spec.story, agents: spec.agents, minutes: spec.minutes, calls: planTable(spec.agents, spec.minutes, spec.plan), gamemaker: gm === undefined ? null : Array.from({ length: spec.minutes }, (_unused, minute) => gm(minute)) });
}

/**
 * The plan played through the old engine, as it was recorded once before the engine went (step 18,
 * item 7b; `test/fixtures/old-engine/`).
 */
export function playOld(spec: Spec): Promise<OldPlayed> {
	const { name, scenario } = currentScenario();
	const now = fingerprint(spec);
	const recorded = recordedOld(name, scenario, OldRecord);
	expectFingerprint(name, scenario, recorded.fingerprint, now);
	return Promise.resolve({ replies: new Map(recorded.replies), gamemaker: recorded.gamemaker, world: new RecordedWorld(recorded.world), events: recorded.events });
}

/** The mechanics of a plain city on the new host: channels, cast and petitions are the real ones. */
export function cityMechanics(story: AnyStory): readonly MechanicUse[] {
	const rules = marksOptions(story);
	return [
		// The old compose gives every resident `defy` when the story has a gamemaker (direction 10).
		channels.with({ ...channelsOptionsOf(story), defiance: story.gamemaker !== undefined }),
		cast.with(castOptionsFromStory(story)),
		petitions.with({}),
		receipts.with({ quoteDms: story.rules.receipts?.quoteDms === true }),
		ledger.with({ startPoints: story.run.startPoints }),
		rules === undefined ? marksStandIn().with() : marks.with(rules),
		namesStandIn(new Map<string, string>()).with(),
		exileStandIn([]),
		progressionStandIn({}).use,
	];
}

export async function playNew(spec: Spec): Promise<NewPlayed> {
	const residents = ids(spec.agents);
	const definition = defineCoreStory({
		id: "t2-differential",
		seed: spec.story.run.seed,
		minutes: spec.minutes,
		residents,
		mechanics: [...cityMechanics(spec.story), ...(spec.extra ?? [])],
		grants: { resident: [...TOOLS, ...(spec.tools ?? [])], gamemaker: ["notify", "postBoard"], script: ["resolvePetition"] },
		turns: legacyTurns({ passesPerMinute: 1, blockSize: 1, activation: "always" }),
	});
	const host = createHost({ story: definition, prompts: createPromptLookup() });
	host.start();
	const replies = new Map<string, string[]>();
	const gamemaker: string[] = [];
	const last = residents.at(-1);
	const gm = spec.gamemaker;
	const agent: TurnTaker = async (turn) => {
		for (const call of spec.plan(turn.resident, turn.minute)) {
			const outcome = await turn.call(call.tool, call.params);
			replies.set(key(turn.minute, turn.resident), [...(replies.get(key(turn.minute, turn.resident)) ?? []), replyText(outcome)]);
		}
		if (turn.resident !== last || gm === undefined) return;
		for (const call of gm(turn.minute)) gamemaker.push(replyText(await host.call("gamemaker", call.tool, call.params)));
	};
	await host.run(agent);
	return { replies, gamemaker, host };
}
