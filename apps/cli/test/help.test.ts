// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `swt --help` from the table in `flags.ts`, the reference page beside it, a refused line of the Human Hand, a
 * `--snapshot-at` that writes nothing, and the fix texts of `SWT-X009` and `SWT-D002`.
 */
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { directorName } from "@swarmtales/sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { COMMANDS, FLAGS, isCommand } from "../src/flags.ts";
import { handEnded } from "../src/hand.ts";
import { main } from "../src/main.ts";
import { cli } from "./support.ts";

const GAME = fileURLToPath(new URL("./fixtures/hand.ts", import.meta.url));
const PAGE = readFileSync(fileURLToPath(new URL("../../../docs/reference/cli.md", import.meta.url)), "utf8");
const names = Object.keys(COMMANDS).filter(isCommand);

let cwd = "";
beforeAll(() => {
	cwd = mkdtempSync(join(tmpdir(), "swt-help-"));
});
afterAll(() => {
	rmSync(cwd, { recursive: true, force: true });
});

/** Writes a file of the Human Hand and gives its name. */
function hand(name: string, lines: readonly unknown[]): string {
	writeFileSync(join(cwd, name), lines.map((line) => `${JSON.stringify(line)}\n`).join(""));
	return name;
}

describe("swt --help", () => {
	it("prints every command of the table and exits with 0, with and without the flag", async () => {
		const swt = cli(cwd);
		const bare = await swt();
		expect([bare.code, bare.err, names.length]).toEqual([0, "", 9]);
		for (const name of names) expect(bare.out.join("\n")).toContain(`swt ${name} ${COMMANDS[name].argument}`);
		expect([await swt("--help"), await swt("play", "x", "--help")]).toEqual([bare, bare]);
		// No help without the flag: a command without its argument is still refused.
		const refused = await swt("experiment", "run");
		expect([refused.code, refused.issue, refused.err.includes("`swt --help` lists the commands")]).toEqual([1, "SWT-C003", true]);
	});

	it("prints the flags and the exit codes of one command, with or without its argument", async () => {
		const swt = cli(cwd);
		for (const name of names) {
			const { code, out, err } = await swt(...name.split(" "), "--help");
			const row = COMMANDS[name];
			expect([code, err, out[0]]).toEqual([0, "", `swt ${name} ${row.argument} [flags]`]);
			for (const flag of row.flags) expect(out.join("\n")).toMatch(new RegExp(`^  --${flag}[ <]`, "m"));
			expect(out.slice(out.indexOf("Exit codes:") + 1).map((line) => Number(line.trim().split("  ")[0]))).toEqual(Object.keys(row.exits).map(Number));
		}
		const run = await swt("run", "--help");
		expect(run.out).toContain("  --snapshot-at <ticks>   write a snapshot after these numbers of finished ticks, a comma list");
		expect(run.out).toContain("  3  the run is paused and the Human Hand has ended (`SWT-X009`); a snapshot is written");
		expect([await swt("run", GAME, "--help"), existsSync(join(cwd, "runs"))]).toEqual([run, false]);
		expect((await swt("scan", "--help")).out.at(-1)).toBe("  3  nothing was scanned: no key variable is set");
	});

	it("has a reference page that names every command, every flag and every exit code of the table", () => {
		for (const name of names) {
			const section = PAGE.split(/^### /m).find((part) => part.startsWith(`\`swt ${name} ${COMMANDS[name].argument}\``)) ?? "";
			for (const flag of COMMANDS[name].flags) expect(section, `${name} --${flag}`).toContain(`\`--${flag}`);
			for (const code of Object.keys(COMMANDS[name].exits)) expect(section, `${name} exit ${code}`).toContain(`| ${code} |`);
		}
		for (const flag of Object.keys(FLAGS)) expect(PAGE).toContain(`\`--${flag}`);
		expect(PAGE).toContain("## The hand file");
	});
});

describe("what a run says about its Human Hand and its snapshots", () => {
	it("prints a refused line of --hand with its code as it happens, and counts it in the result lines", async () => {
		const lines = [{ at: 1, tool: "pause" }, { at: 1, tool: "pause" }, { at: 9, tool: "resume" }];
		const printed: string[] = [];
		const io = { cwd, now: () => new Date("2026-11-14T12:00:00.000Z"), out: (line: string) => printed.push(line), err: (line: string) => printed.push(`! ${line}`), env: {} };
		expect(await main(["run", GAME, "--fake", "--hand", hand("twice.jsonl", lines)], io)).toBe(0);
		expect(printed.slice(0, 4)).toEqual(['! warning: the Human Hand\'s call of "pause" after 1 ticks was refused with ALREADY_PAUSED: the run is in that state already', "fake models: no result", "hand seed 4: ended after 4 ticks (tick limit)", "Human Hand: 1 of 3 calls refused"]);
		const json = await cli(cwd)("run", GAME, "--fake", "--json", "--hand", "twice.jsonl");
		expect([json.code, json.err.includes("ALREADY_PAUSED"), JSON.parse(json.out[0] ?? "")]).toMatchObject([0, true, { hand: { calls: 3, refused: 1 } }]);
		// A hand that is taken whole has no line of its own, and a run without a hand no count.
		const clean = await cli(cwd)("run", GAME, "--fake", "--hand", hand("once.jsonl", [lines[0], lines[2]]));
		expect([clean.code, clean.err, clean.out.length]).toEqual([0, "", 4]);
		expect(JSON.parse((await cli(cwd)("run", GAME, "--fake", "--json")).out[0] ?? "")).not.toHaveProperty("hand");
	});

	it("warns about a --snapshot-at beyond the last tick and keeps the exit code", async () => {
		const { code, out, err } = await cli(cwd)("run", GAME, "--fake", "--out", "shot", "--snapshot-at", "2,4,9");
		expect([code, out.length, readdirSync(join(cwd, "shot/hand-001/snapshots"))]).toEqual([0, 4, ["t2.json"]]);
		expect(err.split("\n")).toEqual([4, 9].map((tick) => `warning: \`--snapshot-at ${String(tick)}\` wrote no snapshot: the run ended after 4 ticks and had no tick boundary after ${String(tick)}`));
		const stopped = await cli(cwd)("run", GAME, "--fake", "--out", "shot", "--snapshot-at", "1,3", "--hand", hand("pause.jsonl", [{ at: 1, tool: "pause" }]));
		expect([stopped.code, stopped.err.split("\n")[0]]).toEqual([3, "warning: `--snapshot-at 3` wrote no snapshot: the run stopped after 1 ticks and had no tick boundary after 3"]);
	});

	it("has fix texts that can be followed", () => {
		expect(handEnded({ tick: 7 }).fix).toMatch(/^Resume with the hand file of the stopped run plus a `resume` line/);
		expect(directorName({ name: "warden", path: "directors[0]", taken: "unknown", known: [] }).fix).toContain("A data game (a YAML or JSON file) cannot carry a Director definition yet");
	});
});
