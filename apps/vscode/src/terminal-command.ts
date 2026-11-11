/** The command line "Run Story…" prefills in a terminal (never executed: a run costs money). */

/** Quotes a path for a POSIX shell only when it needs it. */
export function shellQuote(path: string): string {
	return /^[\w./@+:=,-]+$/.test(path) ? path : `'${path.replaceAll("'", "'\\''")}'`;
}

export function runStoryCommand(storyPath: string): string {
	return `pnpm swt run --story ${shellQuote(storyPath)}`;
}
