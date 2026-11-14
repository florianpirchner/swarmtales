// SPDX-License-Identifier: Apache-2.0
/**
 * The tools notice: the input line that tells a resident which tools are open to it. A port of the old runner's
 * notice: it is sent when the set of open tools differs from the one of the last notice, so once at the start,
 * again after every change, and again after a context reset (the assembly forgets the last notice then).
 */
import type { PromptLookup } from "@swarmtales/contracts";
import { RESIDENT_RECORDS } from "../records.ts";

/**
 * Renders the notice for a list of open tools.
 *
 * @param tools - The shown names of the open tools, in grant order.
 * @param texts - The lookup that renders the prompt file `resident/input/tools-notice`.
 * @returns The text a model reads.
 * @throws What the lookup throws when the prompt file is missing or declares other variables.
 *
 * @public
 */
export function toolsNotice(tools: readonly string[], texts: PromptLookup): string {
	return texts.render(RESIDENT_RECORDS.id, "resident/input/tools-notice", { tools: tools.join(", ") }, ["tools"]);
}

/**
 * What one resident was last told about its open tools.
 *
 * @public
 */
export interface ToolsNotice {
	/**
	 * Gives the notice of a step and remembers it as sent.
	 *
	 * @param open - The shown names of the tools open now, in grant order.
	 * @returns The notice as the only text, or nothing when `open` is empty or equals the list of the last notice.
	 */
	next(open: readonly string[]): readonly string[];
	/** Forgets the last notice (a context reset dropped it), so the next step announces the open tools again. */
	forget(): void;
}

/**
 * Creates the notice memory of one resident.
 *
 * @param texts - The lookup that renders the notice.
 * @returns The memory; nothing is announced yet.
 * @example
 * ```ts
 * const notice = createToolsNotice(texts);
 * notice.next(["guess"]); // ["[tools] Open to you now: guess. ..."]
 * notice.next(["guess"]); // []
 * ```
 *
 * @public
 */
export function createToolsNotice(texts: PromptLookup): ToolsNotice {
	let announced: string | undefined;
	return Object.freeze({
		next: (open: readonly string[]): readonly string[] => {
			const key = open.join(",");
			if (key === announced || open.length === 0) return [];
			announced = key;
			return [toolsNotice(open, texts)];
		},
		forget: (): void => {
			announced = undefined;
		},
	});
}
