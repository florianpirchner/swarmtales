/**
 * The differential harness of the script mechanic (step 18, team S1): the same planned calls are
 * played through the old engine (a composed run with scripted competitors and the real `Director`
 * of packages/engine/src/director.ts) and through the new host with the real city (ledger, channels,
 * receipts, marks, puzzles, progression, cast, petitions; nobody named, nobody exiled) and the real
 * script with the story's rules. A plan may submit solutions: `codeOf` is the old world's, the new
 * puzzles deal the same codes (T3's gates). Replies, the lines of the compared owners (in log order)
 * and the script's snapshot slice against the old `director` field are then compared by the tests.
 */
import type { JsonObject } from "@earendil-works/pi-ai";
import { legacySink } from "@swarmtales/chronicle";
import type { AnyStory, Host, TurnTaker } from "@swarmtales/contracts";
import type { World } from "@swarmtales/engine";
import { createHost, defineCoreStory } from "@swarmtales/kernel";
import { cast, castOptionsFromStory } from "@swarmtales/mechanic-cast";
import { petitions } from "@swarmtales/mechanic-petitions";
import { script, scriptOptionsFromStory } from "@swarmtales/mechanic-script";
import { legacyTurns } from "@swarmtales/mechanic-shared";
import { createPromptLookup } from "@swarmtales/prompts";
import { ownedBy, type GoldenLine, type LegacyLine, type PlannedCall } from "@swarmtales/testkit";
import { act, createFixture, say } from "../../helpers/fixture.ts";
import { replyText } from "../t1/differential.ts";
import { realCity } from "../t1/city.ts";
import { ids } from "../t1/support.ts";
import { SCRIPT_GRANTS } from "./golden-host.ts";

/** The old world's solution of a resident for a level. */
export type CodeOf = (agent: string, level: number) => string;

/** Which calls a resident makes in a minute. */
export type Plan = (agent: string, minute: number, codeOf: CodeOf) => readonly PlannedCall[];

export interface Spec {
	readonly story: AnyStory;
	readonly agents: number;
	readonly minutes: number;
	readonly plan: Plan;
	/** The resident tools the plan calls. */
	readonly tools: readonly string[];
}

export interface Played {
	/** `minute:agent` to the replies in call order (`isError|text`). */
	readonly replies: ReadonlyMap<string, readonly string[]>;
	readonly lines: readonly LegacyLine[];
}

export interface OldPlayed extends Played {
	readonly world: World;
	/** The old director's snapshot (`DirectorSnapshot`, the old file's `director` field). */
	readonly director: unknown;
}

export interface NewPlayed extends Played {
	readonly host: Host;
}

/** The owners whose lines a director action writes or orders: the script and the mechanics it acts through. */
export const OWNERS = ["script", "channels", "cast", "petitions", "ledger", "receipts", "marks", "progression", "puzzles", "arena"] as const;

const key = (minute: number, agent: string): string => `${String(minute)}:${agent}`;

function argsOf(params: unknown): JsonObject {
	if (typeof params !== "object" || params === null) return {};
	return Object.fromEntries(
		Object.entries(params).map(([name, value]): [string, string | number | boolean] => {
			if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") throw new Error(`unsupported plan parameter ${name}`);
			return [name, value];
		}),
	);
}

export async function playOld(spec: Spec): Promise<OldPlayed> {
	const residents = ids(spec.agents);
	const fixture = createFixture({
		story: spec.story,
		agents: spec.agents,
		minutes: spec.minutes,
		script: (world) => {
			const codeOf: CodeOf = (agent, level) => world.inspect.codeOf(agent, level);
			return Object.fromEntries(
				residents.map((agent) => [
					agent,
					Array.from({ length: spec.minutes }, (_unused, minute) => {
						const calls = spec.plan(agent, minute, codeOf);
						return calls.length === 0 ? say() : act(...calls.map((call) => ({ name: call.tool, args: argsOf(call.params) })));
					}),
				]),
			);
		},
	});
	await fixture.run();
	const replies = new Map<string, string[]>();
	for (const event of fixture.log.events) {
		if (event.type !== "tool_result") continue;
		const at = key(event.minute, event.agent);
		replies.set(at, [...(replies.get(at) ?? []), `${String(event.isError)}|${event.text}`]);
	}
	return { replies, lines: fixture.log.events.map((event) => ({ ...event })), world: fixture.world, director: fixture.director.snapshot() };
}

export async function playNew(spec: Spec, codeOf: CodeOf): Promise<NewPlayed> {
	const residents = ids(spec.agents);
	const definition = defineCoreStory({
		id: "script-differential",
		seed: spec.story.run.seed,
		minutes: spec.minutes,
		residents,
		mechanics: [...realCity(spec.story), cast.with(castOptionsFromStory(spec.story)), petitions.with({}), script.with(scriptOptionsFromStory(spec.story))],
		grants: { resident: [...spec.tools], gamemaker: ["notify", "postBoard"], script: SCRIPT_GRANTS },
		turns: legacyTurns({ passesPerMinute: 1, blockSize: 1, activation: "always" }),
	});
	const lines: LegacyLine[] = [];
	const host = createHost({ story: definition, prompts: createPromptLookup() });
	host.subscribe(legacySink((event) => lines.push(Object.fromEntries(Object.entries(event)))));
	host.start();
	const replies = new Map<string, string[]>();
	const agent: TurnTaker = async (turn) => {
		for (const call of spec.plan(turn.resident, turn.minute, codeOf)) {
			const outcome = await turn.call(call.tool, call.params);
			replies.set(key(turn.minute, turn.resident), [...(replies.get(key(turn.minute, turn.resident)) ?? []), replyText(outcome)]);
		}
	};
	await host.run(agent);
	return { replies, lines, host };
}

/** Both sides of a plan. */
export async function playBoth(spec: Spec): Promise<{ readonly old: OldPlayed; readonly fresh: NewPlayed }> {
	const old = await playOld(spec);
	const fresh = await playNew(spec, (agent, level) => old.world.inspect.codeOf(agent, level));
	return { old, fresh };
}

/** The arena's lines the new host does not write without the app's runner (its standings at the end of a minute and the run). */
const UNWRITTEN = new Set(["run_start", "round_end", "run_end"]);

/** The compared lines of a side: `round_start` and `pass_start` stay, so a line written in the wrong minute or before the minute's start differs. */
export function compared(side: Played): readonly GoldenLine[] {
	return ownedBy(
		side.lines.filter((line) => !UNWRITTEN.has(String(line.type))),
		OWNERS,
	);
}

/** The script slice of the new host (its data, the old `DirectorSnapshot` shape). */
export function scriptSlice(side: NewPlayed): unknown {
	return side.host.snapshot().mechanics.script?.data;
}
