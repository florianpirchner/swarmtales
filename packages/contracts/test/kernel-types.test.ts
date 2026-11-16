// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The constants of the kernel-facing contracts (strings that logs and callers carry byte for byte), and the three
 * lines that must not compile: `tsc -b` fails on an `@ts-expect-error` line when the types loosen.
 */
import { describe, expect, it } from "vitest";
import type { RunEnd } from "../src/values.ts";
import {
	INVALID_ARGUMENTS,
	LOG_FORMAT,
	LOG_VERSION,
	STAGES,
	STEP_LIMIT,
	TOOL_LOCKED,
	TOOL_NAME_PATTERN,
	TOOL_NOT_GRANTED,
	TOOL_UNKNOWN,
	type PluginPort,
	type StageHandlers,
} from "../src/kernel/index.ts";

describe("kernel-facing constants", () => {
	it("keeps the ten stage names in their order", () => {
		expect(STAGES).toEqual(["lock", "parse", "limit", "afford", "rule", "guard", "consult", "execute", "settle", "after"]);
	});

	it("keeps the refusal codes of the kernel", () => {
		expect([TOOL_UNKNOWN, TOOL_NOT_GRANTED, TOOL_LOCKED, INVALID_ARGUMENTS, STEP_LIMIT]).toEqual([
			"TOOL_UNKNOWN",
			"TOOL_NOT_GRANTED",
			"TOOL_LOCKED",
			"INVALID_ARGUMENTS",
			"STEP_LIMIT",
		]);
	});

	it("names the log format and its version", () => {
		expect(LOG_FORMAT).toBe("swarmtales.events");
		expect(LOG_VERSION).toBe(1);
	});

	it("accepts a shown tool name of 1 to 64 letters, digits, underscores and hyphens", () => {
		const pattern = new RegExp(TOOL_NAME_PATTERN);
		for (const name of ["playMove", "post_team", "a-1", "x".repeat(64)]) expect(pattern.test(name)).toBe(true);
		for (const name of ["", "play move", "grid/playMove", "x".repeat(65), "né"]) expect(pattern.test(name)).toBe(false);
	});
});

// A stage handler exists for `lock`, `rule` and `after` only (1.4).
export const handlers: StageHandlers = {
	lock: () => undefined,
	// @ts-expect-error -- `guard` has no handler at M1
	guard: () => undefined,
};

// Staged calls (M5-02): the port stages a call by its name with a `then` job, and takes no other option.
export const staged: Parameters<PluginPort["stage"]> = ["directorMinute", {}, {
	then: "minuteRan",
	// @ts-expect-error -- a staged call has no option but `then`
	delay: 1,
}];

// A run ends by its ticks, by a limit or by an error, and by nothing else.
export const end: RunEnd = {
	// @ts-expect-error -- `stopped` is no reason of a run end
	reason: "stopped",
	tick: 1,
};
