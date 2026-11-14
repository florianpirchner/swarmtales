// SPDX-License-Identifier: Apache-2.0
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
