/** Registry of shipped stories, by name (`pnpm start --story <name>`). */
import type { AnyStory, CoreStory, Host, ModelChoice, ResidentId } from "@swarmtales/contracts";
import cityOfKeys from "./cityofkeys/story.ts";
import tictactoeTeams, { tictactoeEntry } from "./tictactoe-teams/story.ts";
import whispers, { whispersStory } from "./whispers/story.ts";

const tictactoeNobrain = tictactoeEntry({ brain: false });

export const DEFAULT_STORY = "cityofkeys";

export const STORIES: Readonly<Record<string, AnyStory>> = {
	cityofkeys: cityOfKeys,
	whispers,
	// The paper's second factor: no receipts to show, word against word.
	"whispers-rumours": whispersStory(false),
};

/** Earlier names of a story; snapshots and runs recorded before a rename still find it. */
const ALIASES: Readonly<Record<string, string>> = { nexus: "cityofkeys" };

export function storyNames(): readonly string[] {
	return Object.keys(STORIES);
}

/** The current name of a story: "nexus" is now "cityofkeys". */
export function storyId(name: string): string {
	return Object.hasOwn(ALIASES, name) ? (ALIASES[name] ?? name) : name;
}

export function findStory(name: string): AnyStory | undefined {
	const id = storyId(name);
	return Object.hasOwn(STORIES, id) ? STORIES[id] : undefined;
}

/**
 * A story written directly as a `CoreStory` (`defineCoreStory`) with any list of mechanics, played by
 * `swt run --story <name>` through the generic runner (apps/cli/src/host/core-run.ts). It has no city,
 * levels or survivors; residents get the neutral base prompt plus the story's own `briefing`.
 */
export interface CoreStoryEntry {
	readonly title: string;
	readonly story: CoreStory;
	/** The residents' model unless `--provider` / `--model` say otherwise. */
	readonly model: ModelChoice;
	/** The resident's briefing in its system prompt (who it is, where, what is asked); read once the host has started. */
	readonly briefing: (resident: ResidentId, host: Host) => string;
	/** The story's own prompt folder (`stories/<name>/prompts`), looked up before the mechanics' and the library's. */
	readonly prompts?: string;
	/** Set when the roster is fixed by the story (teams): `--agents` is refused with this reason. */
	readonly fixedRoster?: string;
}

/** Registry of core stories, by name. A name here is played by the generic runner, never by the city mapping. */
export const coreStories: Readonly<Record<string, CoreStoryEntry>> = {
	"tictactoe-teams": tictactoeTeams,
	// The control arm: the same briefings, no strategy brain and no retro.
	"tictactoe-teams-nobrain": tictactoeNobrain,
};

export function coreStoryNames(): readonly string[] {
	return Object.keys(coreStories);
}

export function findCoreStory(name: string): CoreStoryEntry | undefined {
	const id = storyId(name);
	return Object.hasOwn(coreStories, id) ? coreStories[id] : undefined;
}
