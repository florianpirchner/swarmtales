// SPDX-License-Identifier: Apache-2.0
/**
 * Finding 1 of the M4 review (`docs/M4-REVIEW.md`), held as a failing test: a live run whose cost meter closed (an
 * answer of a model with a price came without a cost, so the meter fails closed and the run ends at
 * `models.budget`) does not replay equal. The session closes the meter without writing a record
 * (`packages/models/src/driver/session.ts`, `recordAnswer`), so the replay's meter (`apps/cli/src/replay.ts`,
 * `capOf`) never closes and the replay writes no `limit_reached` where the log has one (`SWT-C031`). When the fix
 * lands, `it.fails` becomes `it`.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { act, say, scriptedSource, type ModelSource, type ScriptStep } from "@swarmtales/models";
import { guessNumber } from "@swarmtales/testkit";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { runLive, type LiveInput } from "../src/live.ts";
import { main, type CliIo } from "../src/main.ts";

const GAME = fileURLToPath(new URL("./fixtures/guess-number.ts", import.meta.url));
const KEY = `sk-${"k".repeat(37)}`;
let cwd = "";
beforeAll(() => {
	cwd = mkdtempSync(join(tmpdir(), "swt-cap-closed-"));
	vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("no fetch"))));
});
afterAll(() => {
	rmSync(cwd, { recursive: true, force: true });
	vi.unstubAllGlobals();
});

const guesses: readonly ScriptStep[] = Array.from({ length: 20 }, (_, index) => act({ name: "guess", args: { value: index + 1 } }));
const script = (): ModelSource => scriptedSource({ "resident:A01": guesses, "resident:A02": Array.from({ length: 40 }, () => say()), "resident:A03": Array.from({ length: 40 }, () => say()) });

// The model has a price, and its third answer comes without a cost: the meter closes (fail closed).
function costless(): ModelSource {
	const source = script();
	let answers = 0;
	return {
		bind: (actor, limits) => {
			const binding = source.bind(actor, limits);
			return {
				...binding,
				model: { ...binding.model, cost: { ...binding.model.cost, input: 1, output: 1 } },
				streamFn: async (model, context, options) => {
					const stream = await binding.streamFn(model, context, options);
					const push = stream.push.bind(stream);
					stream.push = (event) => {
						if (event.type !== "done") {
							push(event);
							return;
						}
						answers += 1;
						const total = answers === 3 ? 0 : 0.001;
						push({ ...event, message: { ...event.message, usage: { ...event.message.usage, cost: { ...event.message.usage.cost, total } } } });
					};
					return stream;
				},
			};
		},
	};
}

describe("a live run whose cost meter closed", () => {
	it.fails("replays equal, as a run that ended at its cap does (P471)", async () => {
		const io: CliIo = { cwd, now: () => new Date("2026-11-14T12:00:00.000Z"), out: () => undefined, err: () => undefined, installed: { "guess-number": guessNumber } };
		const input: LiveInput = { file: GAME, seed: undefined, out: "closed", json: false, provider: "anthropic", budget: 1, purpose: "smoke", replicate: 0, env: { ARENA_ANTHROPIC_API_KEY: KEY }, source: costless() };
		const result = await runLive(input, io);
		expect(result.end).toMatchObject({ reason: "limit", limit: "models.budget" });
		const said: string[] = [];
		const again: CliIo = { cwd, now: () => new Date(0), out: (line) => said.push(line), err: (line) => said.push(line), env: {} };
		const code = await main(["replay", "closed/guess-number-001", "--game", GAME], again);
		expect([code, said]).toEqual([0, [expect.stringMatching(/^equal, \d+ lines$/)]]);
	});
});
