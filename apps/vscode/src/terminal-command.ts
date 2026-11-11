/**
 * The command line "Run Story…" prefills in a terminal (never executed: a run costs money). The path
 * is never quoted: a file name outside a plain pattern (letters, digits, `_ . @ + = , -`, and `/` before and
 * between parts, no part starting with `-`) is refused, so no shell or terminal ever reads a name
 * that someone chose to look like a command.
 */

const SAFE_PATH = /^\/?(?!-)[\w.@+=,-]+(?:\/(?!-)[\w.@+=,-]+)*$/;

/** The command for a story path relative to the workspace folder, or `undefined` when the name is not plain enough to type. */
export function runStoryCommand(storyPath: string): string | undefined {
	return SAFE_PATH.test(storyPath) ? `pnpm swt run --story ${storyPath}` : undefined;
}
