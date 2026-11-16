// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `swt doctor --online`, offline: a fake provider behind the model port (the scripted source with the prices of a
 * price table), the environment as a record. The estimate stands before the request, a provider above the budget
 * is skipped, a refused key fails, `--provider` chooses one, and `--ledger` writes a reservation and a cost line.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createProviderRegistry, fail, resolveModelSettings, say, scriptedSource, type ModelSettings, type ModelSource, type ScriptStep } from "@swarmtales/models";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CliIo } from "../src/main.ts";
import { main } from "../src/main.ts";

const KEY = `sk-${"e5".repeat(16)}`;
const OTHER = `sk-${"f6".repeat(16)}`;
const idOf = (provider: string, alias: string): string => resolveModelSettings({ provider, modelId: alias }, {}, undefined, createProviderRegistry()).modelId;
const HAIKU = idOf("anthropic", "haiku");
// Prices per million tokens; the sonnet alias is dearer, so the cheapest alias is haiku.
const PRICES: Readonly<Record<string, number>> = { [HAIKU]: 1, [idOf("anthropic", "sonnet")]: 3, [idOf("openrouter", "deepseek-flash")]: 0.2, [idOf("openrouter", "glm-flash")]: 0.4 };

let root = "";
beforeAll(() => {
	root = mkdtempSync(join(tmpdir(), "swt-doctor-online-"));
});
afterAll(() => {
	rmSync(root, { recursive: true, force: true });
});

interface Trace {
	readonly lines: string[];
	readonly io: CliIo;
}

/** The io of one command: every printed line and every request into `lines`, a clock that moves 250 ms per read, and the fake source. */
function traced(env: Readonly<Record<string, string>>, answers: Readonly<Record<string, readonly ScriptStep[]>>): Trace {
	const lines: string[] = [];
	let ms = 0;
	const models = (settings: ModelSettings): ModelSource => {
		const actor = `doctor:${settings.provider}`;
		const scripted = scriptedSource({ [actor]: answers[settings.provider] ?? [] });
		return {
			bind: (bound, limits) => {
				const binding = scripted.bind(bound, limits);
				const price = PRICES[settings.modelId] ?? 0;
				const model = { ...binding.model, id: settings.modelId, cost: { input: price, output: price * 5, cacheRead: 0, cacheWrite: 0 } };
				return { model, streamFn: (asked, context, options) => (lines.push(`request ${asked.id} cap ${String(limits.maxOutputTokens)}`), binding.streamFn(asked, context, options)) };
			},
		};
	};
	const io: CliIo = { cwd: root, now: () => new Date((ms += 250)), out: (line) => void lines.push(line), err: (line) => void lines.push(line), env, node: "v22.23.4", models };
	return { lines, io };
}

const online = (lines: readonly string[]): readonly string[] => lines.filter((line) => /^(request|\w+\s+online)/.test(line)).map((line) => line.replace(/\s+/g, " "));

describe("swt doctor --online with a fake provider", () => {
	it("prints the estimate first, then sends one request to the cheapest alias with an output cap of 1, and prints its time and cost", async () => {
		const { lines, io } = traced({ SWT_ANTHROPIC_API_KEY: KEY }, { anthropic: [say("ready")] });
		expect(await main(["doctor", "--online"], io)).toBe(0);
		expect(online(lines)).toEqual([
			`ok online anthropic one request to anthropic/${HAIKU} (one input line, at most 1 output token) is estimated at 0.000069 USD; sending it`,
			`request ${HAIKU} cap 1`,
			expect.stringMatching(new RegExp(`^ok online anthropic anthropic/${HAIKU} answered in 250 ms: \\d+ input and \\d+ output tokens, 0\\.0000\\d+ USD$`)),
		]);
	});

	it("skips a provider whose estimate is above the budget, with a warning and no request", async () => {
		const { lines, io } = traced({ SWT_ANTHROPIC_API_KEY: KEY }, { anthropic: [say("ready")] });
		expect(await main(["doctor", "--online", "--budget", "0.00005"], io)).toBe(0);
		expect(online(lines)).toEqual([`warn online anthropic skipped: one request to anthropic/${HAIKU} is estimated at 0.000069 USD, above the 0.00005 USD left of the budget`]);
	});

	it("fails a refused key, and prints no key value", async () => {
		const { lines, io } = traced({ ARENA_ANTHROPIC_API_KEY: KEY }, { anthropic: [fail(`401 invalid x-api-key ${KEY}`)] });
		expect(await main(["doctor", "--online"], io)).toBe(1);
		const [, , answered] = online(lines);
		expect(answered).toMatch(/^fail online anthropic .* did not answer \(a refused key or an unreachable provider\) after 250 ms: 401 invalid x-api-key sk-\[redacted\]; \d+ input and 0 output tokens, 0 USD$/);
		expect(lines.join("\n")).not.toContain(KEY);
	});

	it("asks every provider with a key, or only the one of --provider; one without a key fails when it is named", async () => {
		const env = { SWT_ANTHROPIC_API_KEY: KEY, OPENROUTER_API_KEY: OTHER };
		const both = traced(env, { anthropic: [say("ready")], openrouter: [say("ready")] });
		expect(await main(["doctor", "--online"], both.io)).toBe(0);
		expect(online(both.lines).filter((line) => line.startsWith("request"))).toEqual([`request ${idOf("openrouter", "deepseek-flash")} cap 1`, `request ${HAIKU} cap 1`]);
		const one = traced(env, { anthropic: [say("ready")] });
		expect(await main(["doctor", "--online", "--provider", "anthropic", "--json"], one.io)).toBe(0);
		const json = one.lines.at(-1) ?? "";
		expect([one.lines.length, json.match(/"check":"online anthropic","status":"ok"/g)?.length, json.includes("online openrouter")]).toEqual([2, 2, false]);
		const none = traced({}, {});
		expect(await main(["doctor", "--online", "--provider", "openrouter"], none.io)).toBe(1);
		expect(online(none.lines)).toEqual(["fail online openrouter not asked: no key that can be used is set in SWT_OPENROUTER_API_KEY, OPENROUTER_API_KEY"]);
		expect(await main(["doctor", "--online"], none.io)).toBe(0);
		expect(none.lines.some((line) => /^warn\s+online\s+nothing was asked: no provider has a key$/.test(line))).toBe(true);
	});

	it("with --ledger reserves the budget before the request and writes the cost after it", async () => {
		const ledger = join(root, "ledger.jsonl");
		writeFileSync(ledger, '{"capUsd":0.05}\n');
		const { io } = traced({ SWT_ANTHROPIC_API_KEY: KEY }, { anthropic: [say("ready")] });
		expect(await main(["doctor", "--online", "--ledger", "ledger.jsonl", "--budget", "0.02"], io)).toBe(0);
		const [, reserved, cost] = readFileSync(ledger, "utf8").trim().split("\n");
		expect(reserved).toMatch(/^\{"run":"doctor\/online","id":"[^"]+","reservedUsd":0\.02,"at":/);
		expect(cost).toMatch(/^\{"run":"doctor\/online","id":"[^"]+","costUsd":0\.0000\d+,"at":/);
		writeFileSync(ledger, '{"capUsd":0.01}\n');
		const full = traced({ SWT_ANTHROPIC_API_KEY: KEY }, { anthropic: [say("ready")] });
		expect(await main(["doctor", "--online", "--ledger", "ledger.jsonl", "--budget", "0.02"], full.io)).toBe(1);
		expect([full.lines.join("\n").includes("SWT-C025"), full.lines.some((line) => line.startsWith("request"))]).toEqual([true, false]);
	});

	it("refuses --provider, --budget and --ledger without --online, and an unknown provider", async () => {
		const { lines, io } = traced({}, {});
		expect(await main(["doctor", "--budget", "0.01", "--provider", "anthropic"], io)).toBe(1);
		expect(lines.join("\n").match(/SWT-C003[^\n]*needs `--online`/g)?.length).toBe(2);
		expect(await main(["doctor", "--online", "--provider", "nowhere"], io)).toBe(1);
		expect(lines.join("\n")).toContain("SWT-X002");
	});
});
