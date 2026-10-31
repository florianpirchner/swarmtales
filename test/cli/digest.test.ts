import { execFile } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { UsageError } from "../../apps/cli/src/args.ts";
import { parseDigestArgs } from "../../apps/cli/src/digest-args.ts";
import { createProviderRegistry } from "@swarmtales/models";

const run = promisify(execFile);
const TSX_LOADER = pathToFileURL(createRequire(import.meta.url).resolve("tsx")).href;

/**
 * The environment without any model choice or API key, so `--chronicle` can
 * never reach the network: no ARENA_* settings and no provider key, whatever
 * the developer's shell holds.
 */
function offlineEnv(): NodeJS.ProcessEnv {
	const registry = createProviderRegistry();
	const keys = new Set(registry.ids().flatMap((id) => registry.get(id)?.apiKeyEnv ?? []));
	const env: NodeJS.ProcessEnv = {};
	for (const [name, value] of Object.entries(process.env)) {
		if (name.startsWith("ARENA_") || keys.has(name)) continue;
		env[name] = value;
	}
	return env;
}

/**
 * Runs a CLI script from an empty temporary directory, so the repository's
 * `.env` is never loaded, with the offline environment.
 */
async function tsx(script: string, args: readonly string[]) {
	const cwd = mkdtempSync(join(tmpdir(), "arena-digest-cwd-"));
	try {
		return await run(process.execPath, ["--conditions=development", "--import", TSX_LOADER, resolve(script), ...args], { cwd, env: offlineEnv() });
	} finally {
		rmSync(cwd, { recursive: true, force: true });
	}
}

describe("pnpm digest arguments", () => {
	it("takes a run directory, --chronicle and an optional model", () => {
		expect(parseDigestArgs(["runs/run-001"])).toEqual({ runDirectory: "runs/run-001", chronicle: false });
		expect(parseDigestArgs(["runs/run-002", "--chronicle", "--provider", "zai", "--model", "glm-flash"])).toEqual({
			runDirectory: "runs/run-002",
			chronicle: true,
			provider: "zai",
			model: "glm-flash",
		});
	});

	it("rejects missing directories, extra arguments and unknown flags", () => {
		expect(() => parseDigestArgs([])).toThrow(UsageError);
		expect(() => parseDigestArgs(["a", "b"])).toThrow(/Unexpected arguments: b/);
		expect(() => parseDigestArgs(["a", "--bogus"])).toThrow(UsageError);
	});
});

describe("pnpm digest (end to end, offline)", () => {
	it("digests a scripted cityofkeys run; the start command already wrote the digest and --chronicle skips without a key", async () => {
		const runs = mkdtempSync(join(tmpdir(), "arena-digest-cli-"));
		try {
			const started = await tsx("apps/cli/src/main.ts", ["--provider", "scripted", "--minutes", "4", "--runs", runs]);
			const directory = join(runs, "run-001");
			expect(started.stdout).toContain(`digest:      ${join(directory, "digest")}`);
			expect(existsSync(join(directory, "digest", "timeline.md"))).toBe(true);

			const { stdout } = await tsx("apps/cli/src/digest.ts", [directory, "--chronicle"]);
			expect(stdout).toContain('chronicle skipped: missing API key OPENROUTER_API_KEY for provider "openrouter"');
			expect(stdout).toMatch(/beats: +.*beats\.json/);
			for (const file of ["beats.json", "relationships.json", "timeline.md"]) expect(existsSync(join(directory, "digest", file)), file).toBe(true);
			expect(existsSync(join(directory, "digest", "chronicle.md"))).toBe(false);
			const timeline = readFileSync(join(directory, "digest", "timeline.md"), "utf8");
			expect(timeline).toContain("# Timeline of run-001");
			expect(timeline).toContain("## Act I - Learning to talk");
			expect(timeline).toMatch(/A0\d solved level 1 and reached level 2\./);
		} finally {
			rmSync(runs, { recursive: true, force: true });
		}
	}, 60_000);

	it("fails with a message for a directory without events", async () => {
		const empty = mkdtempSync(join(tmpdir(), "arena-digest-empty-"));
		try {
			await expect(tsx("apps/cli/src/digest.ts", [empty])).rejects.toThrow(/No events\.jsonl in/);
			await expect(tsx("apps/cli/src/digest.ts", [])).rejects.toThrow(/Usage: pnpm digest/);
		} finally {
			rmSync(empty, { recursive: true, force: true });
		}
	}, 60_000);
});
