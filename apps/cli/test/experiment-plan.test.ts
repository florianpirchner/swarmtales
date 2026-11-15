// SPDX-License-Identifier: Apache-2.0
/**
 * `swt experiment run --plan` over the three committed specs of the M4 rerun plan (`docs/RERUN-PLAN-M4.md`): each
 * prints its plan and its caps, resolves its arms and its metrics against the game, and plays nothing. The global
 * `fetch` rejects, and no key is set.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseExperimentSpec } from "@swarmtales/lab";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { main, type CliIo } from "../src/main.ts";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const LEDGER = "games/m4-ledger.jsonl";

// The spec file, its id, the runs, and the estimate line: the caps of section 7.1 of the M4 specification.
const PLANS = [
	["games/harbor-lights/experiments/private-notes.json", "harbor-lights-private-notes", 24, "estimate: 1.22 USD of the cap 1.60 USD, at most 0.12 USD per run", 2],
	["games/lanterns/experiments/team-brain.json", "lanterns-team-brain", 24, "estimate: 1.65 USD of the cap 2.35 USD, at most 0.20 USD per run", 2],
	["games/chess/experiments/requests.json", "chess-requests", 4, "estimate: 1.28 USD of the cap 2.00 USD, at most 0.80 USD per run", 1],
] as const;

let scratch = "";
beforeAll(() => {
	scratch = mkdtempSync(join(tmpdir(), "swt-plan-"));
	vi.stubGlobal("fetch", () => Promise.reject(new TypeError("a test reached the global fetch")));
});
afterAll(() => {
	vi.unstubAllGlobals();
	rmSync(scratch, { recursive: true, force: true });
});

async function swt(cwd: string, ...args: readonly string[]): Promise<{ readonly code: number; readonly out: readonly string[]; readonly err: string }> {
	const [out, err]: [string[], string[]] = [[], []];
	const io: CliIo = { cwd, now: () => new Date("2026-11-15T12:00:00.000Z"), out: (line) => out.push(line), err: (line) => err.push(line), env: {} };
	return { code: await main(args, io), out, err: err.join("\n") };
}

describe("swt experiment run --plan", () => {
	it.each(PLANS)("prints the plan of %s and its caps, and plays nothing", async (spec, id, runs, estimate, inFlight) => {
		const { code, out, err } = await swt(ROOT, "experiment", "run", spec, "--plan", "--ledger", LEDGER, "--out", join(scratch, id));
		expect([code, err]).toEqual([0, ""]);
		expect(out[0]).toMatch(new RegExp(`^${id}: ${String(runs)} runs, in this order \\(arm/seed/replicate\\): `));
		expect(out[0]?.split(": ")[2]?.split(" ")).toHaveLength(runs);
		expect(out.slice(1, 3)).toEqual([estimate, `model: anthropic/haiku, thinking medium, ${String(inFlight)} in flight`]);
		expect(out[3]).toMatch(/^ledger games\/m4-ledger\.jsonl: \d+\.\d{4} USD of its cap 12\.00 USD spent or reserved$/);
		expect(existsSync(join(scratch, id))).toBe(false);
	});

	it("holds the arms and seeds of section 7.2 and the caps of 7.1: three series, 5.95 USD, under the ledger's 12.00", () => {
		const [harbor, lanterns, chess] = PLANS.map(([file]) => parseExperimentSpec(JSON.parse(readFileSync(join(ROOT, file), "utf8"))));
		expect(harbor).toMatchObject({ design: "paired", seeds: Array.from({ length: 12 }, (_, index) => 101 + index), arms: [{ id: "nobrain", params: { brain: "nobrain", games: 1 } }, { id: "solo", params: { brain: "solo", games: 1 } }], pass: { contrast: ["solo", "nobrain"], sign: "positive", minN: 10 } });
		expect(lanterns).toMatchObject({ design: "paired", seeds: [59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107], arms: [{ id: "nobrain", params: { brain: false } }, { id: "brain", params: {} }], pass: { contrast: ["brain", "nobrain"], sign: "positive", minN: 10 } });
		expect(chess).toMatchObject({ design: "replicates", seeds: [41, 43, 47, 53], arms: [{ params: { games: 4, maxPlies: 80, fresh: true, compact: true } }], concurrency: 1 });
		expect(chess?.pass).toBeUndefined();
		expect([harbor, lanterns, chess].map((spec) => [spec?.model, spec?.purpose, spec?.budget.perRunUsd, spec?.budget.totalUsd])).toEqual([0.12, 0.2, 0.8].map((perRun, index) => [{ provider: "anthropic", id: "haiku", thinking: "medium" }, "confirmatory", perRun, [1.6, 2.35, 2][index]]));
		expect(readFileSync(join(ROOT, LEDGER), "utf8").split("\n")[0]).toBe('{"capUsd":12}');
	});

	it("refuses a metric no mechanic exports (E010), and takes a generic key of the lab that no run has yet", async () => {
		const chess = parseExperimentSpec(JSON.parse(readFileSync(join(ROOT, PLANS[2][0]), "utf8")));
		const write = (name: string, primary: string): string => {
			const file = join(scratch, `${name}.json`);
			writeFileSync(file, JSON.stringify({ ...chess, game: join(ROOT, "games/chess/game.ts"), metrics: { primary, secondary: [], guardrails: [] } }));
			return file;
		};
		const unknown = await swt(scratch, "experiment", "run", write("unknown", "chess.nope"), "--plan");
		expect([unknown.code, unknown.err.includes("SWT-E010")]).toEqual([1, true]);
		const generic = await swt(scratch, "experiment", "run", write("generic", "run.noCallActivations"), "--plan");
		expect([generic.code, generic.out.length]).toEqual([0, 3]);
	});
});
