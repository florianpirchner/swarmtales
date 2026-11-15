// SPDX-License-Identifier: LicenseRef-SUL-1.0
// @ts-check
import eslint from "@eslint/js";
import jsdoc from "eslint-plugin-jsdoc";
import tseslint from "typescript-eslint";
import { swt } from "./scripts/eslint/plugin.ts";
import { BARE_ERROR, DOUBLE_CAST, ENV_FILE, ENV_RULE_FILES, PROCESS_ENV } from "./scripts/eslint/restricted.ts";
import { LIMITS } from "./scripts/lib/limits.ts";

/** Test files: `*.test.ts` anywhere and the `test/` folder of a package. A `test` folder under `src/` is code. */
const TESTS = ["**/*.test.ts", "**/*.test.tsx", "*/*/test/**/*.ts"];
/** The code of the packages: what is published and what the TSDoc rule and the error rule apply to. */
const PACKAGE_CODE = ["packages/*/src/**/*.ts", "packages/*/src/**/*.tsx", "mechanics/*/src/**/*.ts"];
/** Code that runs inside a run and must be deterministic: no clock, no randomness, no network, no Node APIs. */
const DETERMINISTIC_CODE = ["packages/kernel/src/**/*.ts", "packages/sdk/src/**/*.ts", "mechanics/*/src/**/*.ts"];
const NO_GLOBAL = "Code that runs inside a run is deterministic: no clock, no randomness, no timer, no network, no process.";
const RUN_GLOBALS = ["process", "Buffer", "Date", "fetch", "setTimeout", "setInterval", "setImmediate", "queueMicrotask", "performance", "crypto", "navigator"];
/** The ways around a restricted global. */
const GLOBAL_OBJECTS = ["globalThis", "global", "window", "self"];
/** The forbidden globals of a package that is not deterministic as a whole (docs/LAYERS.md). */
const noGlobals = (/** @type {readonly string[]} */ names, /** @type {string} */ message) => [...names, ...GLOBAL_OBJECTS].map((name) => ({ name, message }));
const NO_RANDOM = { object: "Math", property: "random", message: "Use the seeded random streams." };

export default tseslint.config(
	// The same folders the gates skip (scripts/lib/files.ts), and vendored code, which is not ours to restyle.
	{ ignores: ["**/node_modules/", "**/dist/", "**/dist-types/", "**/temp/", "**/runs/", "**/worktrees/", "third_party/*/**"] },
	eslint.configs.recommended,
	tseslint.configs.strictTypeChecked,
	tseslint.configs.stylisticTypeChecked,
	{
		languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
		linterOptions: { reportUnusedDisableDirectives: "error" },
		plugins: { swt, jsdoc },
		settings: { jsdoc: { mode: "typescript" } },
		rules: {
			// Only `as const` is allowed.
			"@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "never" }],
			"@typescript-eslint/no-non-null-assertion": "error",
			"@typescript-eslint/no-explicit-any": "error",
			"@typescript-eslint/switch-exhaustiveness-check": [
				"error",
				{ considerDefaultExhaustiveForUnions: false, requireDefaultForNonUnion: true },
			],
			"@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
			"@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
			"no-restricted-syntax": ["error", DOUBLE_CAST],
			// The size limits, in code lines (scripts/lib/limits.ts).
			"swt/code-lines-warning": ["warn", { max: LIMITS.fileWarning }],
			"swt/max-code-lines": ["error", { max: LIMITS.fileMax }],
			"swt/max-function-code-lines": ["error", { max: LIMITS.functionMax }],
			complexity: ["error", LIMITS.complexity],
			// An exception is a disable comment with a reason and a linked issue.
			"swt/disable-needs-issue": "error",
			// Every export says what it is.
			"jsdoc/require-jsdoc": [
				"error",
				{
					publicOnly: true,
					require: { FunctionDeclaration: true, ClassDeclaration: true, MethodDefinition: false },
					contexts: ["TSInterfaceDeclaration", "TSTypeAliasDeclaration", "ExportNamedDeclaration > VariableDeclaration"],
				},
			],
		},
	},
	{
		// Packages: TSDoc with @param, @returns and @throws on every export, and no bare Error.
		files: PACKAGE_CODE,
		rules: {
			"no-restricted-syntax": ["error", DOUBLE_CAST, BARE_ERROR],
			"jsdoc/require-description": "error",
			"jsdoc/require-param": "error",
			"jsdoc/require-param-description": "error",
			"jsdoc/check-param-names": "error",
			"jsdoc/require-returns": "error",
			"jsdoc/require-returns-description": "error",
			"jsdoc/require-throws": "error",
			"jsdoc/no-types": "error",
		},
	},
	{
		files: DETERMINISTIC_CODE,
		rules: {
			"no-restricted-globals": ["error", ...[...RUN_GLOBALS, ...GLOBAL_OBJECTS].map((name) => ({ name, message: NO_GLOBAL }))],
			"no-restricted-properties": ["error", { object: "Math", property: "random", message: "Use the seeded random streams." }],
			"no-restricted-imports": ["error", { patterns: [{ group: ["node:*"], message: "No Node API in code that runs inside a run." }] }],
		},
	},
	{
		// models: no environment, no clock of its own, no Node API; keys and time come in as parameters.
		files: ["packages/models/src/**/*.ts"],
		rules: {
			"no-restricted-globals": ["error", ...noGlobals(["process", "Date", "setTimeout"], "models takes the environment and the clock as parameters; the provider library holds its own timers.")],
			"no-restricted-properties": ["error", NO_RANDOM],
			"no-restricted-imports": ["error", { patterns: [{ group: ["node:*"], message: "No Node API in models." }] }],
		},
	},
	{
		// lab: every number is recomputed from a run folder, so no environment and no randomness of its own.
		files: ["packages/lab/src/**/*.ts"],
		rules: {
			"no-restricted-globals": ["error", ...noGlobals(["process"], "lab reads run folders only; it takes everything else as a parameter.")],
			"no-restricted-properties": ["error", NO_RANDOM],
		},
	},
	{
		// Tests: a higher file limit (E7), a higher function limit that leaves out `describe` callbacks, no TSDoc rule.
		files: TESTS,
		rules: {
			"no-restricted-syntax": ["error", DOUBLE_CAST],
			"swt/code-lines-warning": "off",
			"swt/max-code-lines": ["error", { max: LIMITS.testFileMax }],
			"swt/max-function-code-lines": ["error", { max: LIMITS.testFunctionMax, skipSuites: true }],
			"no-restricted-globals": "off",
			"no-restricted-properties": "off",
			"no-restricted-imports": "off",
			"jsdoc/require-jsdoc": "off",
			"jsdoc/require-description": "off",
			"jsdoc/require-param": "off",
			"jsdoc/require-returns": "off",
			"jsdoc/require-throws": "off",
		},
	},
	{
		// The environment is read in one file. This comes after the test block, so tests are covered too.
		files: [...ENV_RULE_FILES],
		ignores: [ENV_FILE],
		rules: { "no-restricted-syntax": ["error", DOUBLE_CAST, ...PROCESS_ENV] },
	},
	{
		files: PACKAGE_CODE,
		ignores: TESTS,
		rules: { "no-restricted-syntax": ["error", DOUBLE_CAST, BARE_ERROR, ...PROCESS_ENV] },
	},
	{
		// Plain JavaScript and per-package build configs sit outside every tsconfig: lint them without type information.
		files: ["eslint.config.js", "**/tsdown.config.ts"],
		extends: [tseslint.configs.disableTypeChecked],
	},
);
