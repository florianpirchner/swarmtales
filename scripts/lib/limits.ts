// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The size limits of the repository, in one place. Lines are code lines (see `code-lines.ts`), except the README
 * limit, which counts raw lines. Sources: `docs/refactoring-before-release/DECISIONS.md` D4, D13, E7 and section 4.
 */
export const LIMITS = {
	/** A source file gets a warning above this many code lines. */
	fileWarning: 250,
	/** A source file fails above this many code lines. */
	fileMax: 300,
	/** A function fails above this many code lines. */
	functionMax: 50,
	/** The highest cyclomatic complexity of a function. */
	complexity: 10,
	/** A test file fails above this many code lines (E7). */
	testFileMax: 600,
	/**
	 * A function in a test file fails above this many code lines; the callback of `describe` is left out. Decided
	 * with the root scaffold: a test or a helper that nobody can read at once proves nothing, and tables of cases need
	 * more room than code.
	 */
	testFunctionMax: 100,
	/** The raw lines of the root `README.md` (section 4). */
	readmeMax: 120,
} as const;
