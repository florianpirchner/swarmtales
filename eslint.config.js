// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
	{ ignores: ["**/node_modules/", "**/dist/", "**/dist-types/", "runs/", ".claude/", "lab/out/"] },
	eslint.configs.recommended,
	tseslint.configs.strictTypeChecked,
	tseslint.configs.stylisticTypeChecked,
	{
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			// Only `as const` is allowed (ARCHITECTURE §4).
			"@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "never" }],
			"@typescript-eslint/no-non-null-assertion": "error",
			"@typescript-eslint/no-explicit-any": "error",
			"@typescript-eslint/switch-exhaustiveness-check": [
				"error",
				{ considerDefaultExhaustiveForUnions: false, requireDefaultForNonUnion: true },
			],
			"@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
			"@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
			"no-restricted-syntax": [
				"error",
				{ selector: "TSAsExpression > TSAsExpression", message: "Double casts are forbidden." },
			],
		},
	},
	{
		// The core's file cap (docs/ideas/monorepo.md §3f): at most 400 code lines per file.
		files: ["packages/kernel/src/**/*.ts", "packages/contracts/src/core/**/*.ts"],
		rules: { "max-lines": ["error", { max: 400, skipBlankLines: true, skipComments: true }] },
	},
	// The ratchet: the files over the cap at step 18 (docs/design/step18-decisions.md, F2 M3), each held at
	// its size then. Lower a number when the file shrinks; drop the entry once it is under 400.
	...Object.entries({
		"packages/kernel/src/host/host.ts": 639,
		"packages/kernel/src/host/overseers.ts": 476,
	}).map(([file, max]) => ({ files: [file], rules: { "max-lines": ["error", { max, skipBlankLines: true, skipComments: true }] } })),
	{
		// Plain JavaScript and per-package build configs sit outside every tsconfig: lint them without type information.
		files: ["eslint.config.js", "scripts/**/*.mjs", "**/tsdown.config.ts"],
		extends: [tseslint.configs.disableTypeChecked],
	},
);
