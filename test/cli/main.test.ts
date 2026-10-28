import { execFile } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import nexus from "../../stories/nexus/story.ts";

const run = promisify(execFile);

describe("pnpm start (end to end, offline)", () => {
	it("plays a scripted nexus run and writes every artifact including the serialized story", async () => {
		const runs = mkdtempSync(join(tmpdir(), "arena-cli-"));
		try {
			const { stdout } = await run(
				process.execPath,
				["--import", "tsx", "src/cli/main.ts", "--provider", "scripted", "--minutes", "5", "--runs", runs],
				{ cwd: process.cwd(), env: { ...process.env, OPENROUTER_API_KEY: "" } },
			);
			expect(stdout).toContain("end of run");
			const directory = join(runs, "run-001");
			for (const file of ["000-run.json", "events.jsonl", "minutes.md", "usage.json", join("agents", "A01.md"), join("000-minute", "events.jsonl")]) {
				expect(existsSync(join(directory, file)), file).toBe(true);
			}
			const metadata: unknown = JSON.parse(readFileSync(join(directory, "000-run.json"), "utf8"));
			expect(metadata).toMatchObject({ run: "run-001", provider: "scripted", storyId: "nexus", effective: { minutes: 5, agents: 6 } });
			expect(metadata).toHaveProperty("story", JSON.parse(JSON.stringify(nexus)));
			// Model and persona per competitor (SPEC 5.2, 5.3); --provider overrides every assignment.
			expect(metadata).toHaveProperty("agents", expect.arrayContaining([expect.objectContaining({ agent: "A01", provider: "scripted" })]));
			expect(metadata).toHaveProperty("agents.length", 6);
			expect(metadata).toHaveProperty("agents.0.persona", expect.any(String));
			expect(readFileSync(join(directory, "agents", "A01.md"), "utf8")).toMatch(/- persona: \w+/);
			expect(readdirSync(join(directory, "agents"))).toHaveLength(6);
			// Three passes a minute: the oracle passes the last level in minute 3 and the run stops there.
			expect(readFileSync(join(directory, "minutes.md"), "utf8")).toContain("## Minute 3 (round 4)");
			expect(readFileSync(join(directory, "agents", "A01.md"), "utf8")).toContain("## Minute 0, pass 1");
		} finally {
			rmSync(runs, { recursive: true, force: true });
		}
	}, 60_000);

	it("snapshots a scripted run after level 7 and resumes it exactly where the run that is not stopped goes on (SPEC 17)", async () => {
		const runs = mkdtempSync(join(tmpdir(), "arena-cli-"));
		const start = (...flags: string[]) =>
			run(process.execPath, ["--import", "tsx", "src/cli/main.ts", "--provider", "scripted", "--runs", runs, ...flags], {
				cwd: process.cwd(),
				env: { ...process.env, OPENROUTER_API_KEY: "" },
			});
		/** Every event without its wall-clock stamp and run name, and with the prompt size instead of its cache split. */
		const eventsOf = (name: string): readonly Record<string, unknown>[] =>
			readFileSync(join(runs, name, "events.jsonl"), "utf8")
				.trim()
				.split("\n")
				.map((line) => {
					const event: unknown = JSON.parse(line);
					if (typeof event !== "object" || event === null) throw new Error("not an event");
					const rest = Object.fromEntries(Object.entries(event).filter(([key]) => key !== "at"));
					if (rest.type === "run_start") return { ...rest, meta: "(run name)" };
					if (rest.type !== "usage" || typeof rest.input !== "number" || typeof rest.cacheRead !== "number") return rest;
					return { ...rest, input: rest.input + rest.cacheRead, cacheRead: 0, cacheWrite: 0 };
				});
		try {
			// The reference holds everyone at the door of level 7 too, and lets them in after the snapshot.
			await start("--snapshot-after", "7");
			const { stdout } = await start("--snapshot-after", "7", "--stop-after-snapshot");
			expect(stdout).toMatch(/end of run: snapshot after level 7 written to .*snapshot-L7\.json; stopped there/);
			const file = join(runs, "run-002", "snapshot-L7.json");
			expect(existsSync(file)).toBe(true);
			const resumedRun = await start("--resume", file);
			// The cost line and usage.json keep the prefix's spend apart from the run's own.
			expect(resumedRun.stdout).toMatch(/cost: \d+\.\d{4} USD this run \+ \d+\.\d{4} USD before the snapshot = /);

			const whole = eventsOf("run-001");
			const prefix = eventsOf("run-002");
			const resumed = eventsOf("run-003");
			const cut = prefix.findIndex((event) => event.type === "run_end");
			expect(cut).toBeGreaterThan(400);
			expect(resumed.slice(0, cut)).toEqual(prefix.slice(0, cut));
			expect(resumed.slice(0, cut)).toEqual(whole.slice(0, cut));
			expect(resumed[cut]).toMatchObject({ type: "run_resumed", seq: cut + 1, snapshot: "snapshot-L7.json", level: 7 });
			// One run_resumed and one agent_profile per competitor; no event of the oracle run refers to a seq.
			const markers = 7;
			const after = resumed.slice(cut + markers).map((event) => ({ ...event, seq: Number(event.seq) - markers }));
			expect(after.length).toBeGreaterThan(100);
			expect(after).toEqual(whole.slice(cut));

			const usage: unknown = JSON.parse(readFileSync(join(runs, "run-003", "usage.json"), "utf8"));
			const requests = (events: readonly Record<string, unknown>[]) => events.filter((event) => event.type === "usage").length;
			expect(usage).toMatchObject({
				totals: { requests: requests(resumed) },
				prefix: { totals: { requests: requests(prefix.slice(0, cut)) } },
				own: { totals: { requests: requests(resumed.slice(cut)) } },
			});

			const metadata: unknown = JSON.parse(readFileSync(join(runs, "run-003", "000-run.json"), "utf8"));
			expect(metadata).toMatchObject({ resumedFrom: { run: "run-002", level: 7, events: cut }, effective: { seed: 7, agents: 6 } });
			expect(readFileSync(join(runs, "run-003", "agents", "A01.md"), "utf8")).toContain("_Resumed from snapshot-L7.json after round");

			// A snapshot that does not fit is refused before anything is played, and no run directory stays behind.
			await expect(start("--resume", file, "--seed", "8")).rejects.toThrow(/Cannot resume\.\nThe snapshot was taken with seed 7/);
			await expect(start("--resume", file, "--agents", "12")).rejects.toThrow(/6 agents; this run asks for 12/);
			expect(readdirSync(runs).sort()).toEqual(["run-001", "run-002", "run-003"]);
		} finally {
			rmSync(runs, { recursive: true, force: true });
		}
	}, 120_000);

	it("says so when a requested snapshot was never taken", async () => {
		const runs = mkdtempSync(join(tmpdir(), "arena-cli-"));
		try {
			const { stdout } = await run(
				process.execPath,
				["--import", "tsx", "src/cli/main.ts", "--provider", "scripted", "--minutes", "2", "--runs", runs, "--snapshot-after", "9", "--stop-after-snapshot"],
				{ cwd: process.cwd(), env: { ...process.env, OPENROUTER_API_KEY: "" } },
			);
			expect(stdout).toContain("snapshot:    none; not every competitor passed level 9 before the run ended");
			expect(readdirSync(join(runs, "run-001")).filter((name) => name.startsWith("snapshot-"))).toEqual([]);
		} finally {
			rmSync(runs, { recursive: true, force: true });
		}
	}, 60_000);

	it("rejects agent counts the story cannot be played with, without leaving a run directory", async () => {
		const runs = mkdtempSync(join(tmpdir(), "arena-cli-"));
		try {
			const start = (agents: string) =>
				run(process.execPath, ["--import", "tsx", "src/cli/main.ts", "--provider", "scripted", "--agents", agents, "--runs", runs], {
					cwd: process.cwd(),
				});
			const four = start("4").then(
				() => "",
				(error: unknown) => String(error),
			);
			await expect(four).resolves.toMatch(/4 agents cannot be split into teams of 3/);
			await expect(four).resolves.not.toMatch(/\n\s+at /);
			await expect(start("1")).rejects.toThrow(/run\.survivors: must be between 1 and agents - 1/);
			expect(readdirSync(runs)).toEqual([]);
		} finally {
			rmSync(runs, { recursive: true, force: true });
		}
	}, 60_000);

	it("fails with a usage message for unknown stories and flags", async () => {
		await expect(run(process.execPath, ["--import", "tsx", "src/cli/main.ts", "--story", "atlantis", "--provider", "scripted"])).rejects.toThrow(
			/Unknown story "atlantis"/,
		);
		await expect(run(process.execPath, ["--import", "tsx", "src/cli/main.ts", "--bogus"])).rejects.toThrow(/Usage: pnpm start/);
	}, 60_000);
});
