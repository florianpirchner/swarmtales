// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The recorder of the viewer's fixture `packages/viewer-core/test/fixtures/resumed-run`: the city slice, seed 7,
 * in the variant `amended`, played by `swt run` and `swt resume` with the residents' script the fixture was first
 * made with (issue M3-24; only the fake driver of the command line is replaced). The test fails when the committed
 * log is not the log the platform writes today. To record the fixture again, delete its `events.jsonl` and run this
 * test: it then copies the whole run folder (the chain and its key are new with every run).
 */
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { nameOf } from "@swarmtales/contracts";
import type * as Testkit from "@swarmtales/testkit";
import { afterAll, expect, it, vi } from "vitest";

const story = vi.hoisted(() => {
	const call = (tool: string, params: object): { readonly tool: string; readonly params: object } => ({ tool, params });
	const vote = (target: string): ReturnType<typeof call> => call("vote", { target });
	const pay = (target: string, amount: number): ReturnType<typeof call> => call("transferPoints", { target, amount });
	/** Tick to resident to calls: talk and two transfers, five votes (three against A04), and after the exile a transfer to A04. */
	const script: Readonly<Record<number, Readonly<Record<string, readonly ReturnType<typeof call>[]>>>> = {
		0: { A01: [call("postBoard", { message: "Who holds which fragment?" })], A04: [call("sendDM", { target: "A01", message: "Watch A02." })] },
		2: { A01: [pay("A04", 5)] },
		3: { A06: [pay("A02", 4)] },
		4: { A01: [vote("A04")], A02: [vote("A04")] },
		5: { A03: [vote("A04")], A04: [vote("A02")], A05: [vote("A02")] },
		9: { A01: [pay("A04", 3)], A03: [call("postBoard", { message: "The register is shorter now." })] },
	};
	return { script };
});
vi.mock("@swarmtales/testkit", async (original) => {
	const testkit = await original<typeof Testkit>();
	return { ...testkit, fakeDriver: () => testkit.scriptedDriver((activation) => story.script[activation.tick]?.[nameOf(activation.actor)] ?? []) };
});

// Vitest runs the files of a worker without isolation (`vitest.config.ts`), so the command line may already be loaded
// with the real testkit: it is loaded afresh here, under the mock, and dropped again after the file, so that no later
// file of the worker gets the mocked driver.
vi.resetModules();
const { cli } = await import("./support.ts");

const CITY = fileURLToPath(new URL("../../../games/city-slice/game.ts", import.meta.url));
const FIXTURE = fileURLToPath(new URL("../../../packages/viewer-core/test/fixtures/resumed-run", import.meta.url));
const HAND = [
	{ at: 7, tool: "pause", params: { reason: "the court has a verdict" } },
	{ at: 7, command: "snapshot" },
	{ at: 7, tool: "resume", params: {} },
	{ at: 8, tool: "amendDecision", params: { decision: "D1", proposal: { exiled: "A02" }, reason: "A02 paid for its votes" } },
];
/** The log of a run folder without the one value that is new with every run: the hash of the signed snapshot file. */
const logOf = (folder: string): string => readFileSync(join(folder, "events.jsonl"), "utf8").replace(/"snapshotHash":"[0-9a-f]{64}"/, '"snapshotHash":"-"');

const cwd = mkdtempSync(join(tmpdir(), "swt-fixture-"));
afterAll(() => {
	vi.resetModules();
	rmSync(cwd, { recursive: true, force: true });
});

it("the fixture `resumed-run` is the log that `swt run` and `swt resume` write today", async () => {
	const swt = cli(cwd);
	writeFileSync(join(cwd, "amended.jsonl"), HAND.map((line) => `${JSON.stringify(line)}\n`).join(""));
	expect((await swt("run", CITY, "--fake", "--seed", "7", "--out", "amended", "--hand", "amended.jsonl")).code).toBe(0);
	expect((await swt("resume", "amended/city-slice-001", "--game", CITY, "--hand", "amended.jsonl")).code).toBe(0);
	const fresh = join(cwd, "amended", "city-slice-002");
	if (!existsSync(join(FIXTURE, "events.jsonl"))) for (const file of ["events.jsonl", "events.chain.jsonl", "run.pub", "manifest.json", "game.json", "texts.json"]) cpSync(join(fresh, file), join(FIXTURE, file));
	expect(logOf(FIXTURE)).toBe(logOf(fresh));
});
