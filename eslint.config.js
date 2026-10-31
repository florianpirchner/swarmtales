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
		// Plain JavaScript and per-package build configs sit outside every tsconfig: lint them without type information.
		files: ["eslint.config.js", "scripts/**/*.mjs", "**/tsdown.config.ts"],
		extends: [tseslint.configs.disableTypeChecked],
	},
);
