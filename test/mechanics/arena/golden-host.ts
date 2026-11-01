/**
 * The golden replay of the arena (step 18, team A1): the script's golden host (S1,
 * test/mechanics/script/golden-host.ts: the real ledger, channels, receipts, marks, names, cast,
 * petitions, puzzles, progression, script and, for Whispers, whispers) plus the real arena with the
 * story's settings (`arenaFromStory`) and the story's turn policy from the arena (`legacyTurns`).
 * The seal (Act II of the City of Keys) is real too, on stand-ins of exile (nobody leaves) and the
 * tribunal (T4b's `seal/support.ts`), so `bid` opens and closes as in the golden. Every resident
 * tool the golden run ever offered is granted (the tools of its `request` lines), so the
 * standings' `tools` (old `enabledTools(agent).length`) are counted over the same set. Every golden
 * resident call of a replayed tool is made in its golden turn, the gamemaker's board posts and notes
 * in the host's `between` slot. Nothing the arena writes is injected.
 */
import { fileURLToPath } from "node:url";
import { legacySink } from "@swarmtales/chronicle";
import type { AnyStory, Host, MechanicUse, TurnPolicy } from "@swarmtales/contracts";
import { createHost, defineCoreStory } from "@swarmtales/kernel";
import { arena, arenaFromStory, type ArenaRun } from "@swarmtales/mechanic-arena";
import { createPromptLookup } from "@swarmtales/prompts";
import type { LegacyLine } from "@swarmtales/testkit";
import { channels } from "@swarmtales/mechanic-channels";
import { goals } from "@swarmtales/mechanic-goals";
import { CoreMotivesOptions, motives } from "@swarmtales/mechanic-motives";
import { seal } from "@swarmtales/mechanic-seal";
import { Parse } from "typebox/value";
import { goalsOptionsOf } from "../progression/harness.ts";
import { channelsOptionsOf } from "../t2/golden-world.ts";
import { SEAL } from "../../../stories/cityofkeys/characters.ts";
import { ConflictWorld, exileStandIn, tribunalStandIn } from "../seal/support.ts";
import { goldenLog, RESIDENTS, SEED, storyOf, type GoldenName } from "../puzzles/harness.ts";
import { cityOf, REPLAYED, SCRIPT_GRANTS } from "../script/golden-host.ts";
import { planOf, turnKey } from "../t2/golden-plan.ts";

/** The golden runs' effective settings (the golden composer's: one pass, block 1, every resident each minute, no early stop). */
export function goldenRun(): ArenaRun {
	return { startLevel: 1, activation: "always", passesPerMinute: 1, blockSize: 1, stopWhenDone: false, stopWhenSeatsDecided: false };
}

export interface ArenaReplay {
	readonly host: Host;
	readonly golden: readonly LegacyLine[];
	readonly lines: readonly LegacyLine[];
	/** What each turn showed, by `minute:agent:pass`, in the order the host arranged it (the policy's kinds). */
	readonly inputs: ReadonlyMap<string, readonly string[]>;
}

/** Every tool a golden run offered its residents (the union of its `request` lines' tools), in first-seen order. */
export function offeredTools(golden: readonly LegacyLine[]): readonly string[] {
	const tools: string[] = [];
	for (const line of golden) {
		if (line.type !== "request" || !Array.isArray(line.tools)) continue;
		for (const tool of line.tools) if (typeof tool === "string" && !tools.includes(tool)) tools.push(tool);
	}
	return tools;
}

/**
 * Who may `defy` in each golden run (the old composer: `defiance` with a gamemaker at direction 10,
 * `whispererDefies` with the whisperer directed at 10 and a gamemaker; R2-D17).
 */
const DEFIANCE: Readonly<Record<GoldenName, { readonly defiance: boolean; readonly whispererDefies: boolean }>> = {
	"cityofkeys-f4g4": { defiance: false, whispererDefies: false },
	"cityofkeys-f10g10": { defiance: true, whispererDefies: false },
	"whispers-f10-grudge": { defiance: false, whispererDefies: true },
};

/**
 * The real city of the script's golden host, with the golden run's `defy`, and the core motives and
 * the secret goals of the story (their rewards at the act's end are in the final standings).
 */
function realCityOf(name: GoldenName, story: AnyStory, namesChosen: boolean): readonly MechanicUse[] {
	const city = cityOf(story, namesChosen).map((use) => (use.mechanic.id === "channels" ? channels.with({ ...channelsOptionsOf(story), ...DEFIANCE[name] }) : use));
	const goalsOptions = goalsOptionsOf(story);
	return [
		...city,
		...(story.coreMotives === undefined ? [] : [motives.with(Parse(CoreMotivesOptions, story.coreMotives))]),
		...(goalsOptions === undefined ? [] : [goals.with(goalsOptions)]),
	];
}

/** The seal and its stand-ins, for a story with a seal. */
function sealOf(story: AnyStory): readonly MechanicUse[] {
	if (story.seal === undefined) return [];
	const world = new ConflictWorld([...RESIDENTS]);
	return [exileStandIn(world).with(), tribunalStandIn(world).with(), seal.with(SEAL)];
}

/** The story's guards as the host takes them: per tool, the rule that names it (the old `guards.rules`; as the script's golden host). */
function guardPolicies(story: AnyStory) {
	const resident: Record<string, { guard: { id: string; rule: string; on: "block"; secrets?: { minRun: number } } }> = {};
	for (const rule of story.guards?.rules ?? []) {
		for (const tool of rule.tools) resident[tool] = { guard: { id: rule.id, rule: rule.rule, on: rule.on, ...(rule.secrets === undefined ? {} : { secrets: { minRun: rule.secrets.minRun } }) } };
	}
	return { resident };
}

const replayed = (tool: string): boolean => REPLAYED.some((name) => name === tool);

/** The arena and the story's turn policy for a story. */
export function arenaOf(story: AnyStory, run: ArenaRun): { readonly use: MechanicUse; readonly turns: TurnPolicy } {
	const { options, turns } = arenaFromStory(story, run);
	return { use: arena.with(options), turns };
}

/** Plays a golden log on the host of the real city with the arena. */
export async function replayArena(name: GoldenName): Promise<ArenaReplay> {
	const story = storyOf(name);
	const golden = goldenLog(name);
	const plan = planOf(golden);
	const lines: LegacyLine[] = [];
	const { use, turns } = arenaOf(story, goldenRun());
	const definition = defineCoreStory({
		id: `arena-golden-${name}`,
		seed: SEED,
		minutes: plan.minutes,
		residents: [...RESIDENTS],
		mechanics: [...realCityOf(name, story, plan.namesChosen), ...sealOf(story), use],
		grants: { resident: [...offeredTools(golden), ...(story.seal === undefined ? [] : ["permaDeath"])], gamemaker: ["notify", "postBoard"], script: SCRIPT_GRANTS },
		tools: guardPolicies(story),
		turns,
	});
	const between = async (minute: number): Promise<void> => {
		for (const line of plan.between.get(minute) ?? []) {
			if (line.type !== "gamemaker_call") continue;
			const outcome = await host.call("gamemaker", String(line.tool), line.args);
			if (!outcome.ok) throw new Error(`gamemaker ${String(line.tool)} at minute ${String(minute)}: ${outcome.code}`);
		}
	};
	const host = createHost({ story: definition, prompts: createPromptLookup({ story: fileURLToPath(new URL("../t2/prompts", import.meta.url)) }), between });
	host.subscribe(legacySink((event) => lines.push(Object.fromEntries(Object.entries(event)))));
	host.start();
	const inputs = new Map<string, readonly string[]>();
	await host.run(async (turn) => {
		inputs.set(`${turnKey(turn.minute, turn.resident)}:${String(turn.pass)}`, turn.inputs.map((note) => note.text));
		const window = plan.turns.get(turnKey(turn.minute, turn.resident));
		if (window === undefined) throw new Error(`no golden turn for ${turn.resident} at minute ${String(turn.minute)}`);
		for (const line of window.lines) if (line.type === "tool_call" && replayed(String(line.tool))) await turn.call(String(line.tool), line.args);
	});
	return { host, golden, lines, inputs };
}
