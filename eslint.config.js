// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
	{ ignores: ["node_modules/", "runs/", ".claude/"] },
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
		// This config is plain JavaScript outside every tsconfig: lint it without type information.
		files: ["eslint.config.js"],
		extends: [tseslint.configs.disableTypeChecked],
	},
);
