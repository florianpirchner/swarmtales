/**
 * The differential harness of the T2 mechanics: the same planned calls are played through the old
 * engine (a composed `World` with scripted competitors and a scripted gamemaker, the real
 * `tools/*.ts`) and through the real channels, cast, petitions, receipts, ledger and marks on the new
 * host (progression, names and exile are stand-ins). Replies, the lines each side wrote, the notices
 * and the snapshot state are then compared by the tests.
 */
import type { FauxResponseStep } from "@earendil-works/pi-ai";
import type { JsonObject } from "@earendil-works/pi-ai";
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
import type { World } from "@swarmtales/engine";
import { act, createFixture, say } from "../../helpers/fixture.ts";
import { ids } from "../t1/support.ts";
import { exileStandIn, progressionStandIn } from "../t1/stand-ins.ts";
import { replyText } from "../t1/differential.ts";
import type { MechanicUse } from "@swarmtales/contracts";
import { channelsOptionsOf } from "../t2/golden-world.ts";
import { marksStandIn, namesStandIn } from "./stand-ins.ts";

export type Plan = (agent: string, minute: number) => readonly PlannedCall[];

function argsOf(params: unknown): JsonObject {
	if (typeof params !== "object" || params === null) return {};
	return Object.fromEntries(
		Object.entries(params).map(([key, value]): [string, string | number | boolean] => {
			if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") throw new Error(`unsupported plan parameter ${key}: ${JSON.stringify(value)}`);
			return [key, value];
		}),
	);
}

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
	readonly world: World;
	readonly events: readonly { readonly type: string; readonly [field: string]: unknown }[];
}

export interface NewPlayed extends Played {
	readonly host: Host;
}

/** The resident tools of channels (and `defy`, which it owns by carve decision D-7). */
export const TOOLS = ["readBoard", "postBoard", "sendDM", "createGroup", "addGroupMember", "removeGroupMember", "leaveGroup", "listMyGroups", "postGroup", "readGroup", "depositGroup", "withdrawGroup", "setTreasurer", "defy"] as const;

const key = (minute: number, agent: string): string => `${String(minute)}:${agent}`;

export async function playOld(spec: Spec): Promise<OldPlayed> {
	const residents = ids(spec.agents);
	const gm = spec.gamemaker;
	const fixture = createFixture({
		story: spec.story,
		agents: spec.agents,
		minutes: spec.minutes,
		script: () =>
			Object.fromEntries(
				residents.map((agent) => [
					agent,
					Array.from({ length: spec.minutes }, (_unused, minute) => {
						const calls = spec.plan(agent, minute);
						return calls.length === 0 ? say() : act(...calls.map((call) => ({ name: call.tool, args: argsOf(call.params) })));
					}),
				]),
			),
		...(gm === undefined
			? {}
			: {
					gamemakerScript: (world: World): readonly FauxResponseStep[] => {
						let answered = true;
						return Array.from({ length: 3 * spec.minutes }, (): FauxResponseStep => () => {
							if (!answered) {
								answered = true;
								return say("Done.");
							}
							const calls = gm(world.minute);
							answered = calls.length === 0;
							return calls.length === 0 ? say("Nothing to add.") : act(...calls.map((call) => ({ name: call.tool, args: argsOf(call.params) })));
						});
					},
				}),
	});
	await fixture.run();
	const replies = new Map<string, string[]>();
	const gamemaker: string[] = [];
	for (const event of fixture.log.events) {
		if (event.type === "tool_result") {
			const at = key(event.minute, event.agent);
			replies.set(at, [...(replies.get(at) ?? []), `${String(event.isError)}|${event.text}`]);
		} else if (event.type === "gamemaker_result") gamemaker.push(`${String(event.isError)}|${event.text}`);
	}
	return { replies, gamemaker, world: fixture.world, events: fixture.log.events.map((event) => ({ ...event })) };
}

/** The mechanics of a plain city on the new host: channels, cast and petitions are the real ones. */
export function cityMechanics(story: AnyStory): readonly MechanicUse[] {
	const rules = story.rules.marks;
	return [
		// The old compose gives every resident `defy` when the story has a gamemaker (direction 10).
		channels.with({ ...channelsOptionsOf(story), defiance: story.gamemaker !== undefined }),
		cast.with(castOptionsFromStory(story)),
		petitions.with({}),
		receipts.with({ quoteDms: story.rules.receipts?.quoteDms === true }),
		ledger.with({ startPoints: story.run.startPoints }),
		rules === undefined ? marksStandIn().with() : marks.with({ rules: { ...rules, ...(rules.ranges === undefined ? {} : { ranges: rules.ranges.map((range) => ({ ...range })) }) } }),
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
