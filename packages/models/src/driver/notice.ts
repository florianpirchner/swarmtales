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
	/** The open tools the last notice named, for a saved session; `undefined` when none was sent since the start or the last reset. */
	readonly last: readonly string[] | undefined;
}

/**
 * Creates the notice memory of one resident.
 *
 * @param texts - The lookup that renders the notice.
 * @param last - The open tools of the last notice of a saved session; left out: nothing is announced yet.
 * @returns The memory.
 * @example
 * ```ts
 * const notice = createToolsNotice(texts);
 * notice.next(["guess"]); // ["[tools] Open to you now: guess. ..."]
 * notice.next(["guess"]); // []
 * ```
 *
 * @public
 */
export function createToolsNotice(texts: PromptLookup, last?: readonly string[]): ToolsNotice {
	let announced: readonly string[] | undefined = last;
	return Object.freeze({
		next: (open: readonly string[]): readonly string[] => {
			if (open.length === 0 || open.join(",") === announced?.join(",")) return [];
			announced = [...open];
			return [toolsNotice(open, texts)];
		},
		forget: (): void => {
			announced = undefined;
		},
		get last(): readonly string[] | undefined {
			return announced;
		},
	});
}
