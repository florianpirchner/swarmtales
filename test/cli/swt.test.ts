import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { execute } from "../../apps/cli/src/swt/commands.ts";
import type { Io } from "../../apps/cli/src/swt/io.ts";

const ROOT = resolve(import.meta.dirname, "..", "..");
const RECORDED = join(ROOT, "stories", "whispers", "runs", "whispers-06a-008-deepseek", "run");

async function swt(...argv: string[]): Promise<{ code: number; out: string; err: string }> {
	const out: string[] = [];
	const err: string[] = [];
	const io: Io = { out: (text) => void out.push(text), err: (text) => void err.push(text) };
	const code = await execute(argv, io);
	return { code, out: out.join("\n"), err: err.join("\n") };
}

afterEach(() => vi.unstubAllEnvs());

describe("swt help and dispatch", () => {
	it("lists the noun-verb commands and keeps the older ones", async () => {
		const { code, out } = await swt("--help");
		expect(code).toBe(0);
		expect(out.startsWith("Usage: swt <command>")).toBe(true);
		for (const words of ["story list", "story schema", "run list", "run cost", "module show", "prompt check", "archetype show", "doctor", "completion", "validate", "report run", "log verify", "digest", "novel"]) {
			expect(out).toContain(words);
		}
	});

	it("rejects an unknown command with exit 1 and an unknown verb with exit 2", async () => {
		expect((await swt("nonsense")).code).toBe(1);
		const verb = await swt("story", "nonsense");
		expect(verb.code).toBe(2);
		expect(verb.err).toContain('Unknown verb "nonsense"');
		expect((await swt("story")).out).toContain("Usage: swt story");
		expect((await swt("story", "list", "--help")).out).toContain("Usage: swt story");
	});
});

describe("swt story", () => {
	it("lists the registered stories, as a table and as JSON", async () => {
		expect((await swt("story", "list")).out).toContain("cityofkeys");
		const rows: unknown = JSON.parse((await swt("story", "list", "--json")).out);
		expect(JSON.stringify(rows)).toContain('"name":"whispers"');
	});

	it("shows a story", async () => {
		const { code, out } = await swt("story", "show", "whispers");
		expect(code).toBe(0);
		expect(out).toContain("whispers");
		expect(out).toContain("levels:");
		expect(out).toContain("features:");
		expect((await swt("story", "show", "nope")).code).toBe(1);
		const summary: unknown = JSON.parse((await swt("story", "show", "whispers", "--json")).out);
		expect(JSON.stringify(summary)).toContain('"whisperer"');
		expect(summary).toMatchObject({ id: "whispers" });
	});

	it("validates the registry, a name, and a wrong name", async () => {
		expect((await swt("story", "validate")).code).toBe(0);
		const one = await swt("story", "validate", "cityofkeys");
		expect(one.out).toContain("ok   cityofkeys");
		const bad = await swt("story", "validate", "nope");
		expect(bad.code).toBe(1);
		expect(bad.out).toContain("FAIL nope");
	});

	it("writes the schema to a file and to stdout; the committed story.schema.json is current", async () => {
		const directory = mkdtempSync(join(tmpdir(), "swt-schema-"));
		const file = join(directory, "story.schema.json");
		expect((await swt("story", "schema", "--out", file)).code).toBe(0);
		const written = readFileSync(file, "utf8");
		expect(written).toBe(`${(await swt("story", "schema", "--out", "-")).out}\n`);
		expect(written).toBe(readFileSync(join(ROOT, "story.schema.json"), "utf8"));
	});

	it("round-trips every registered story through YAML", async () => {
		const directory = mkdtempSync(join(tmpdir(), "swt-yaml-"));
		for (const name of ["cityofkeys", "whispers", "whispers-rumours"]) {
			const dumped = await swt("story", "show", name, "--yaml");
			expect(dumped.out.startsWith("# yaml-language-server: $schema=")).toBe(true);
			const file = join(directory, `${name}.yaml`);
			writeFileSync(file, `${dumped.out}\n`);
			const checked = await swt("story", "validate", file);
			expect(checked.out).toContain("ok   ");
			expect(checked.code).toBe(0);
		}
	});
});

describe("swt run", () => {
	it("lists the runs in a folder", async () => {
		const { code, out } = await swt("run", "list", "--runs", join(ROOT, "stories", "whispers", "runs"));
		expect(code).toBe(0);
		// The recorded runs keep their files in a `run/` subfolder, so the folder itself holds none.
		expect(out).toContain("No runs in");
		const none = await swt("run", "list", "--runs", join(tmpdir(), "swt-no-such-folder"));
		expect(none.out).toContain("No runs in");
	});

	it("shows result, cost, stop reason, dials and log state of a recorded run", async () => {
		const { code, out } = await swt("run", "show", RECORDED);
		expect(code).toBe(0);
		expect(out).toContain("whispers");
		expect(out).toContain("stop: completed at minute 45");
		expect(out).toContain("cost: 1.2653 USD");
		expect(out).toContain("signed log: unsigned");
		expect(out).toContain("figureDirection=10");
		expect(out).toMatch(/1\s+A03\s+8\s+110/);
		const data: unknown = JSON.parse((await swt("run", "show", RECORDED, "--json")).out);
		expect(data).toMatchObject({ story: "whispers", minute: 45, dials: { gmDirection: 4 } });
	});

	it("prints the cost per competitor and refuses an unknown run", async () => {
		const { code, out } = await swt("run", "cost", RECORDED);
		expect(code).toBe(0);
		expect(out).toContain("1041 requests");
		expect(out).toContain("A06");
		const missing = await swt("run", "show", "run-999", "--runs", tmpdir());
		expect(missing.code).toBe(2);
		expect(missing.err).toContain('No run "run-999"');
	});

	it("finds a run by name under --runs and lists it", async () => {
		const directory = mkdtempSync(join(tmpdir(), "swt-runs-"));
		const run = join(directory, "run-001");
		mkdirSync(run);
		for (const file of ["events.jsonl", "000-run.json", "usage.json"]) copyFileSync(join(RECORDED, file), join(run, file));
		const listed = await swt("run", "list", "--runs", directory);
		expect(listed.out).toContain("run-001");
		expect(listed.out).toContain("whispers");
		expect((await swt("run", "show", "run-001", "--runs", directory)).code).toBe(0);
	});
});

describe("swt module, prompt, archetype", () => {
	it("lists and shows modules", async () => {
		const list = await swt("module", "list");
		for (const id of ["marks", "tribunal", "whispers"]) expect(list.out).toContain(id);
		const shown = await swt("module", "show", "marks");
		expect(shown.out).toContain("marks:");
		expect(shown.out).toContain("events:");
		const data: unknown = JSON.parse((await swt("module", "show", "marks", "--json")).out);
		expect(data).toMatchObject({ id: "marks", options: { type: "object" } });
		expect((await swt("module", "show", "nope")).code).toBe(1);
	});

	it("lists prompts, shows which file wins and checks the library", async () => {
		const list = await swt("prompt", "list", "--json");
		const rows: unknown = JSON.parse(list.out);
		expect(Array.isArray(rows) && rows.length > 100).toBe(true);
		const key = "competitor/system/header-id";
		expect(JSON.stringify(rows)).toContain(`"${key}"`);
		const shown = await swt("prompt", "show", key);
		expect(shown.code).toBe(0);
		expect(shown.out).toContain("wins");
		expect(shown.out).toContain("variables:");
		expect((await swt("prompt", "show", "no/such/prompt")).code).toBe(1);
		expect((await swt("prompt", "check")).code).toBe(0);
	});

	it("lists and shows archetypes", async () => {
		expect((await swt("archetype", "list", "drives")).out).toContain("greed");
		expect((await swt("archetype", "list", "nonsense")).code).toBe(2);
		const figure = await swt("archetype", "show", "c01");
		expect(figure.out).toContain("figures/c01");
		expect(figure.out).toContain("Who you are");
		expect((await swt("archetype", "show", "greed")).out).toContain("drives/greed");
		expect((await swt("archetype", "show", "zzz")).code).toBe(1);
	});
});

describe("swt doctor and completion", () => {
	it("reports keys as set or missing and never prints one", async () => {
		vi.stubEnv("OPENROUTER_API_KEY", "sk-or-very-secret-value");
		vi.stubEnv("ARENA_ANTHROPIC_API_KEY", "");
		const { code, out } = await swt("doctor");
		expect(code).toBe(0);
		expect(out).toContain("OPENROUTER_API_KEY set");
		expect(out).toContain("ARENA_ANTHROPIC_API_KEY not set");
		expect(out).not.toContain("very-secret-value");
		expect(out).toMatch(/node\s+ok/);
	});

	it("prints a completion script per shell, built from the command table", async () => {
		for (const shell of ["bash", "zsh", "fish"]) {
			const { code, out } = await swt("completion", shell);
			expect(code).toBe(0);
			expect(out).toContain("story");
			expect(out).toContain("validate");
			expect(out).toContain("archetype");
		}
		expect((await swt("completion", "bash")).out).toContain("complete -F _swt swt swarmtales");
		expect((await swt("completion", "bash")).out).toMatch(/run\) COMPREPLY=.*start/);
		expect((await swt("completion", "powershell")).code).toBe(2);
		expect((await swt("completion")).code).toBe(2);
	});
});
