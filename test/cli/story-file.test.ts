import { execFile } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { isStoryFile, readStoryFile, resolveStory, storyToYaml } from "../../apps/cli/src/swt/story-file.ts";

const run = promisify(execFile);
const ROOT = resolve(import.meta.dirname, "..", "..");
const FIXTURE = join(ROOT, "test", "fixtures", "stories", "lantern-row.story.yaml");

function scratch(name: string, text: string): string {
	const file = join(mkdtempSync(join(tmpdir(), "swt-story-")), name);
	writeFileSync(file, text);
	return file;
}

describe("story files", () => {
	it("loads a YAML story that declares the schema for the editor", () => {
		const text = readFileSync(FIXTURE, "utf8");
		expect(text).toContain("# yaml-language-server: $schema=../../../story.schema.json");
		// The path in the header points at the schema file the repository commits.
		expect(readFileSync(resolve(join(ROOT, "test", "fixtures", "stories"), "../../../story.schema.json"), "utf8")).toContain('"title": "Swarm Tales story"');
		const parsed = readStoryFile(FIXTURE);
		expect(parsed.issues).toBeUndefined();
		expect(parsed.story).toMatchObject({ id: "lantern-row", run: { agents: 2 }, levels: [{ number: 1 }, { number: 2 }], director: [{ id: "first-light" }] });
	});

	it("loads the same story from JSON", () => {
		const yaml = readStoryFile(FIXTURE);
		const file = scratch("lantern.json", JSON.stringify(yaml.story));
		expect(readStoryFile(file).story).toEqual(yaml.story);
	});

	it("tells a YAML syntax error with its line", () => {
		const parsed = readStoryFile(scratch("broken.yaml", "id: x\nrun: [unclosed\n"));
		expect(parsed.story).toBeUndefined();
		expect(parsed.issues?.join("\n")).toMatch(/line 2|at line/i);
	});

	it("refuses duplicate keys, wrong types, unknown tools and cross-field mistakes", () => {
		const text = readFileSync(FIXTURE, "utf8");
		expect(readStoryFile(scratch("dup.yaml", `${text}\nid: again\n`)).issues?.join("\n")).toMatch(/unique|duplicate/i);
		expect(readStoryFile(scratch("type.yaml", text.replace("reward: 2", "reward: many"))).issues?.join("\n")).toContain("/levels/0/reward");
		expect(readStoryFile(scratch("tool.yaml", text.replace("[getStatus, submitSolution, sendDM, postBoard, readBoard]", "[getStatus, teleport]"))).issues?.join("\n")).toContain("/levels/0/tools/1");
		expect(readStoryFile(scratch("rule.yaml", text.replace("survivors: 1", "survivors: 9"))).issues?.join("\n")).toContain("run.survivors");
		expect(readStoryFile(join(tmpdir(), "no-such-story.yaml")).issues).toEqual([`No file ${join(tmpdir(), "no-such-story.yaml")}`]);
	});

	it("resolves a registered name or a file, and writes a story out as YAML", () => {
		expect(isStoryFile("cityofkeys")).toBe(false);
		expect(isStoryFile("a/b/story.YML")).toBe(true);
		expect(resolveStory("whispers").story?.id).toBe("whispers");
		expect(resolveStory("nope").issues?.[0]).toContain("Unknown story");
		expect(resolveStory(FIXTURE).story?.id).toBe("lantern-row");
		const whispers = resolveStory("whispers").story;
		if (whispers === undefined) throw new Error("whispers is not registered");
		const yaml = storyToYaml(whispers, join(ROOT, "story.schema.json"), join(ROOT, "stories", "whispers"));
		expect(yaml.split("\n")[0]).toBe("# yaml-language-server: $schema=../../story.schema.json");
	});

	it("plays a YAML story offline with the scripted provider", async () => {
		const runs = mkdtempSync(join(tmpdir(), "swt-yaml-run-"));
		try {
			const { stdout } = await run(process.execPath, ["--conditions=development", "--import", "tsx", "apps/cli/src/swt.ts", "run", "--story", FIXTURE, "--provider", "scripted", "--minutes", "4", "--runs", runs], {
				cwd: ROOT,
				env: { ...process.env, OPENROUTER_API_KEY: "" },
			});
			expect(stdout).toContain("end of run");
			const metadata: unknown = JSON.parse(readFileSync(join(runs, "run-001", "000-run.json"), "utf8"));
			expect(metadata).toMatchObject({ storyId: "lantern-row", provider: "scripted" });
			// `run show` reads what the run left behind.
			const listed = await run(process.execPath, ["--conditions=development", "--import", "tsx", "apps/cli/src/swt.ts", "run", "show", "run-001", "--runs", runs], { cwd: ROOT });
			expect(listed.stdout).toContain("lantern-row");
		} finally {
			rmSync(runs, { recursive: true, force: true });
		}
	}, 60_000);
});
