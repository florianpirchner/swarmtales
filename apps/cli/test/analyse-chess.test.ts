// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `swt analyse chess` (M4-56): the engine analysis of a fake chess run writes `analysis.json` and `ANALYSIS.md`
 * with the pinned engine, the depth and every half-move of the log; a bad depth, a run of another game and a folder
 * that does not verify are refused.
 */
import { appendFileSync, cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { EVENTS_FILE } from "@swarmtales/chain";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { depthOf, helpOf } from "../src/index.ts";
import { cli, eventsOf, type Printed } from "./support.ts";

const CHESS = fileURLToPath(new URL("../../../games/chess/game.ts", import.meta.url));
const QUARRY = fileURLToPath(new URL("../../../games/quarry/game.ts", import.meta.url));

let cwd = "";
let swt: (...args: readonly string[]) => Promise<Printed> = () => Promise.reject(new Error("before all"));
beforeAll(async () => {
	cwd = mkdtempSync(join(tmpdir(), "swt-chess-"));
	swt = cli(cwd);
	expect((await swt("run", CHESS, "--fake", "--seed", "3", "--set", "games=1", "--set", "maxPlies=12", "--out", "runs")).code).toBe(0);
	expect((await swt("run", QUARRY, "--fake", "--seed", "3", "--out", "other")).code).toBe(0);
}, 120_000);
afterAll(() => {
	rmSync(cwd, { recursive: true, force: true });
});

describe("swt analyse chess", () => {
	it("scores every half-move of the run's log and writes both files", async () => {
		const run = join(cwd, "runs/chess-001");
		const played = eventsOf(run).filter((event) => event.type === "move_played");
		expect(played.length).toBeGreaterThan(0);
		const printed = await swt("analyse", "chess", "runs/chess-001", "--depth", "2");
		expect(printed).toMatchObject({ code: 0, err: "" });
		expect(printed.out[0]).toBe("# Engine analysis");
		expect(printed.out.at(-1)).toBe("analysis: runs/chess-001/ANALYSIS.md");
		const json: unknown = JSON.parse(readFileSync(join(run, "analysis.json"), "utf8"));
		expect(json).toMatchObject({ engine: "garbochess-js", commit: "4ff0f9e49a0041545b645e25d3d2da7af3b36a90", sha256: "b0ebcf80e7bc7c5c9dd08e57f96a07af0a655f6138590243028d6b98717c938c", depth: 2 });
		expect(json).toMatchObject({ games: [{ game: 1, white: "A01", black: "A02", plies: played.map((event): { readonly san: unknown } => ({ san: Reflect.get(Object(event.payload), "san") })) }] });
		expect(readFileSync(join(run, "ANALYSIS.md"), "utf8")).toBe(`${printed.out.slice(0, -1).join("\n")}\n`);
	}, 120_000);

	it("gives the same files on a second analysis at the same depth", async () => {
		// Each test makes what it reads (M6-15): the first analysis here, not the one of the test above.
		const run = join(cwd, "runs/chess-001");
		expect((await swt("analyse", "chess", "runs/chess-001", "--depth", "2")).code).toBe(0);
		const first = readFileSync(join(run, "analysis.json"), "utf8");
		expect((await swt("analyse", "chess", "runs/chess-001", "--depth", "2")).code).toBe(0);
		expect(readFileSync(join(run, "analysis.json"), "utf8")).toBe(first);
	}, 120_000);

	it("reads --depth as a whole number from 1 to 64, 10 when left out", async () => {
		expect([depthOf(undefined), depthOf("1"), depthOf("64")]).toEqual([10, 1, 64]);
		for (const bad of ["0", "65", "2.5", "x", "100"]) expect(() => depthOf(bad), bad).toThrow("no whole number of plies from 1 to 64");
		expect(await swt("analyse", "chess", "runs/chess-001", "--depth", "0")).toMatchObject({ code: 1, issue: "SWT-C003" });
		expect(helpOf("analyse chess")).toContain("  --depth <plies>         the search depth of the chess reference engine, 1 to 64; 10 when left out");
	});

	it("refuses a run of another game and a folder whose log does not verify with SWT-E006", async () => {
		expect(await swt("analyse", "chess", "other/quarry-001")).toMatchObject({ code: 1, issue: "SWT-E006" });
		// A copy is tampered, so that the run the other tests read stays whole in any order (M6-15).
		cpSync(join(cwd, "runs/chess-001"), join(cwd, "tampered/chess-001"), { recursive: true });
		appendFileSync(join(cwd, "tampered/chess-001", EVENTS_FILE), "{}\n");
		expect(await swt("analyse", "chess", "tampered/chess-001", "--depth", "1")).toMatchObject({ code: 1, issue: "SWT-E006" });
	});
});
