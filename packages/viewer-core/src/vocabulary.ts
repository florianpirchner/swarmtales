// SPDX-License-Identifier: Apache-2.0
/**
 * The words a log is read with, in one place for a host (the static page, the VS Code extension):
 * who acted and whom a line was about, and which lines are messages. Each part is added to its defaults, so a host names only what its stories do differently.
 */
import type { ActorVocabulary } from "./events.ts";
import type { MessageVocabulary } from "./messages.ts";

/**
 * The words a log is read with, where the defaults do not fit.
 *
 * @public
 */
export interface Vocabulary {
	/** For `loadRun`: actor rules by event type, added to `DEFAULT_ACTORS`. */
	readonly actors?: ActorVocabulary;
	/** For `messageGraph`: message types and system authors, added to `DEFAULT_MESSAGES`. */
	readonly messages?: MessageVocabulary;
}
