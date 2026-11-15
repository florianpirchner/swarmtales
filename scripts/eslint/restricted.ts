// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The `no-restricted-syntax` entries of `eslint.config.js`, kept here so a test can prove that they match. */

/** A cast of a cast (`x as unknown as T`). Type assertions are forbidden as a whole; this names the worst case. */
export const DOUBLE_CAST = {
	selector: "TSAsExpression > TSAsExpression",
	message: "Double casts are forbidden. Parse untrusted input with Typebox.",
} as const;

/** `throw new Error(...)` in a package: errors for developers are `SwtError`s with a code, a cause and a fix. */
export const BARE_ERROR = {
	selector: "ThrowStatement > NewExpression[callee.name='Error']",
	message: "Do not throw a bare Error in a package. Throw an SwtError with a code, where, why and fix.",
} as const;

const ENV_MESSAGE = "The environment is read in one file, apps/cli/src/env.ts. Take the value as a parameter.";

/**
 * Every way to read the environment of the process: `process.env`, `process["env"]`, the same through a global
 * object, a destructuring of `process`, and the `env` export of the `process` module (M2 specification, 1.2).
 */
export const PROCESS_ENV = [
	{ selector: "MemberExpression[object.name='process'][property.name='env']", message: ENV_MESSAGE },
	{ selector: "MemberExpression[object.name='process'][property.value='env']", message: ENV_MESSAGE },
	{ selector: "MemberExpression[object.property.name='process'][property.name='env']", message: ENV_MESSAGE },
	{ selector: "MemberExpression[object.property.name='process'][property.value='env']", message: ENV_MESSAGE },
	{ selector: "VariableDeclarator[init.name='process'] > ObjectPattern > Property[key.name='env']", message: ENV_MESSAGE },
	{ selector: "VariableDeclarator[init.property.name='process'] > ObjectPattern > Property[key.name='env']", message: ENV_MESSAGE },
	{ selector: "ImportDeclaration[source.value=/^(node:)?process$/] > ImportSpecifier[imported.name='env']", message: ENV_MESSAGE },
] as const;

/** The one file that may read the environment. It returns only the variables it is asked for by name. */
export const ENV_FILE = "apps/cli/src/env.ts";

/** The files the environment rule covers: every package of the workspace, tests included. Scripts keep their reads. */
export const ENV_RULE_FILES = ["packages/**/*.{ts,tsx}", "mechanics/**/*.{ts,tsx}", "games/**/*.{ts,tsx}", "samples/**/*.{ts,tsx}", "apps/**/*.{ts,tsx}"] as const;
