/**
 * The golden replay of the script mechanic (step 18, team S1): a golden log is played on a host with
 * the old turn order (`legacyTurns`) and the real mechanics the director acts through and reads:
 * ledger, channels, receipts, marks, names, cast, petitions, puzzles, progression, and the real
 * script with the story's rules (`scriptOptionsFromStory`). Every golden resident call of a tool these
 * mechanics offer is made in its golden turn, and the gamemaker's board posts and notes in the
 * host's `between` slot. Nothing the director wrote is injected: its lines come out of the script.
 */
import { fileURLToPath } from "node:url";
import { legacySink } from "@swarmtales/chronicle";
import type { AnyStory, Host, MechanicUse, ToolOutcome } from "@swarmtales/contracts";
import { createHost, defineCoreStory } from "@swarmtales/kernel";
import { cast, castOptionsFromStory } from "@swarmtales/mechanic-cast";
import { channels } from "@swarmtales/mechanic-channels";
import { ledger } from "@swarmtales/mechanic-ledger";
import { marks } from "@swarmtales/mechanic-marks";
import { names } from "@swarmtales/mechanic-names";
import { petitions } from "@swarmtales/mechanic-petitions";
import { progression } from "@swarmtales/mechanic-progression";
import { puzzles } from "@swarmtales/mechanic-puzzles";
import { receipts } from "@swarmtales/mechanic-receipts";
import { script, scriptOptionsFromStory } from "@swarmtales/mechanic-script";
import { whispers } from "@swarmtales/mechanic-whispers";
import { legacyTurns } from "@swarmtales/mechanic-shared";
import { createPromptLookup } from "@swarmtales/prompts";
import { goldenCalls, type GoldenCall, type LegacyLine } from "@swarmtales/testkit";
import { marksStandIn } from "../channels/stand-ins.ts";
import { progressionOptions } from "../progression/harness.ts";
import { goldenLog, puzzleOptions, RESIDENTS, SEED, storyOf, type GoldenName } from "../puzzles/harness.ts";
import { noNames } from "../t1/city.ts";
import { planOf, turnKey } from "../t2/golden-plan.ts";
import { channelsOptionsOf, marksOptions } from "../t2/golden-world.ts";

/** The resident tools of the loaded mechanics: every call of the three goldens. */
export const REPLAYED = ["submitSolution", "getProblem", "getStatus", "listAgents", "activeTools", "readBoard", "postBoard", "sendDM", "nameFavourite", "forgeReceipt"] as const;

const replayed = (tool: string): boolean => REPLAYED.some((name) => name === tool);

/** The whisperer and the popularity vote of the Whispers story (their posts and points come before the director's in the counters). */
function whispersOf(story: AnyStory): readonly MechanicUse[] {
	const spec = story.whisperer;
	if (spec === undefined || story.popularity === undefined) return [];
	return [
		whispers.with({
			whisperer: {
				...(spec.agent === undefined ? {} : { agent: spec.agent }),
				forgery: spec.forgery,
				duty: { ...spec.duty },
				...(spec.direction?.quota === undefined ? {} : { quota: { ...spec.direction.quota, report: { ...spec.direction.quota.report } } }),
			},
			popularity: { rounds: story.popularity.rounds.map((round) => ({ ...round })), texts: { ...story.popularity.texts } },
			// The golden ran at figure direction 10 without a gamemaker that defies.
			direction: { level: 10, defies: false },
		}),
	];
}

/** The minimal run of the story's `postBoard` guard with secrets (the step-17 mapping of `receipts.minRun`). */
function minRunOf(story: AnyStory): number | undefined {
	return story.guards?.rules.find((rule) => rule.tools.includes("postBoard") && rule.secrets !== undefined)?.secrets?.minRun;
}

/** The story's guards as the host takes them: per tool, the rule that names it (the old `guards.rules`). */
function guardPolicies(story: AnyStory) {
	const resident: Record<string, { guard: { id: string; rule: string; on: "block"; secrets?: { minRun: number } } }> = {};
	for (const rule of story.guards?.rules ?? []) {
		for (const tool of rule.tools) resident[tool] = { guard: { id: rule.id, rule: rule.rule, on: rule.on, ...(rule.secrets === undefined ? {} : { secrets: { minRun: rule.secrets.minRun } }) } };
	}
	return { resident };
}

/** The real mechanics of a story's city with the script; `withNames` when the golden run named its residents. */
export function cityOf(story: AnyStory, withNames: boolean): readonly MechanicUse[] {
	const rules = marksOptions(story);
	const naming = withNames ? story.names : undefined;
	return [
		...whispersOf(story),
		ledger.with({ startPoints: story.run.startPoints }),
		channels.with(channelsOptionsOf(story)),
		receipts.with({ quoteDms: story.rules.receipts?.quoteDms === true, ...(minRunOf(story) === undefined ? {} : { minRun: minRunOf(story) }) }),
		rules === undefined ? marksStandIn().with() : marks.with(rules),
		naming === undefined ? noNames() : names.with({ ...naming, fallbackWords: [...naming.fallbackWords], reserved: [...Object.keys(story.cast), story.city] }),
		cast.with(castOptionsFromStory(story)),
		petitions.with({}),
		puzzles.with(puzzleOptions(story)),
		progression.with(progressionOptions(story)),
		script.with(scriptOptionsFromStory(story)),
	];
}

/** What the script is granted in every story: its minute call and the petitions' resolution (R2-D5). */
export const SCRIPT_GRANTS = ["directorMinute", "resolvePetition"] as const;

export interface GoldenReplay {
	readonly host: Host;
	readonly golden: readonly LegacyLine[];
	/** The lines the host wrote, in the old shape. */
	readonly lines: readonly LegacyLine[];
	/** The golden calls the replay did not make, with the reason. */
	readonly skipped: readonly GoldenCall[];
}

function textOf(outcome: ToolOutcome): string {
	if (outcome.ok) return outcome.reply;
	return outcome.detail === undefined ? outcome.code : `${outcome.code}: ${outcome.detail}`;
}

/** Plays a golden log on the host of the real city. */
export async function replayGolden(name: GoldenName): Promise<GoldenReplay> {
	const story = storyOf(name);
	const golden = goldenLog(name);
	const plan = planOf(golden);
	const lines: LegacyLine[] = [];
	const definition = defineCoreStory({
		id: `script-golden-${name}`,
		seed: SEED,
		minutes: plan.minutes,
		residents: [...RESIDENTS],
		mechanics: cityOf(story, plan.namesChosen),
		grants: { resident: story.whisperer === undefined ? REPLAYED.filter((tool) => tool !== "nameFavourite" && tool !== "forgeReceipt") : REPLAYED, gamemaker: ["notify", "postBoard"], script: SCRIPT_GRANTS },
		tools: guardPolicies(story),
		turns: legacyTurns({ passesPerMinute: 1, blockSize: 1, activation: "always" }),
	});
	const between = async (minute: number): Promise<void> => {
		for (const line of plan.between.get(minute) ?? []) {
			if (line.type !== "gamemaker_call") continue;
			const outcome = await host.call("gamemaker", String(line.tool), line.args);
			if (!outcome.ok) throw new Error(`gamemaker ${String(line.tool)} at minute ${String(minute)}: ${textOf(outcome)}`);
		}
	};
	const host = createHost({ story: definition, prompts: createPromptLookup({ story: fileURLToPath(new URL("../t2/prompts", import.meta.url)) }), between });
	host.subscribe(legacySink((event) => lines.push(Object.fromEntries(Object.entries(event)))));
	host.start();
	await host.run(async (turn) => {
		const window = plan.turns.get(turnKey(turn.minute, turn.resident));
		if (window === undefined) throw new Error(`no golden turn for ${turn.resident} at minute ${String(turn.minute)}`);
		for (const line of window.lines) if (line.type === "tool_call" && replayed(String(line.tool))) await turn.call(String(line.tool), line.args);
	});
	// The whisperer's tools (forgeReceipt, nameFavourite) belong to whispers, which writes nothing the director reads.
	const skipped = goldenCalls(golden).filter((call) => !replayed(call.tool));
	return { host, golden, lines, skipped };
}
