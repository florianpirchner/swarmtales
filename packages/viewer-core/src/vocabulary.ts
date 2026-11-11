/**
 * The words a log is read with, in one place for a host (the static page, the VS Code extension):
 * who acted and whom a line was about, which lines are messages, and which lines the story graph
 * overlay reads. Each part is added to its defaults, so a host names only what its stories do differently.
 */
import type { ActorVocabulary } from "./events.ts";
import type { MessageVocabulary } from "./messages.ts";
import type { OverlayVocabulary } from "./overlay.ts";

export interface Vocabulary {
	/** For `loadRun`: actor rules by event type, added to `DEFAULT_ACTORS`. */
	readonly actors?: ActorVocabulary;
	/** For `messageGraph`: message types and system authors, added to `DEFAULT_MESSAGES`. */
	readonly messages?: MessageVocabulary;
	/** For `runOverlay`: event type names that replace those of `DEFAULT_VOCABULARY`. */
	readonly overlay?: Partial<OverlayVocabulary>;
}
