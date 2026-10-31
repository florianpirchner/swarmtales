import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { EventBus } from "@swarmtales/engine";
import {
	allocateRunDirectory,
	JsonlEventLog,
	minuteDirectoryName,
	MinuteEventLog,
	runDirectoryName,
	writeRunMetadata,
	writeSystemPrompts,
} from "@swarmtales/chronicle";

const directories: string[] = [];

function tempDirectory(prefix = "arena-test-"): string {
	const directory = mkdtempSync(join(tmpdir(), prefix));
	directories.push(directory);
	return directory;
}

afterEach(() => {
	for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("run artifacts (SPEC 14)", () => {
	it("writes each system prompt to agents/<id>.prompt.md", () => {
		const directory = join(tempDirectory(), "agents");
		writeSystemPrompts(directory, [{ agent: "A01", label: "persona: Archivist", prompt: "You are a resident.\n" }]);
		expect(readFileSync(join(directory, "A01.prompt.md"), "utf8")).toBe("# A01: system prompt\n\npersona: Archivist\n\n---\n\nYou are a resident.\n");
	});

	it("numbers runs consecutively", () => {
		const base = tempDirectory();
		const first = allocateRunDirectory(base);
		expect(first).toEqual({ directory: join(base, "run-001"), number: 1, name: "run-001" });
		expect(existsSync(first.directory)).toBe(true);
		mkdirSync(join(base, "run-007"));
		expect(allocateRunDirectory(base).number).toBe(8);
		expect(runDirectoryName(8)).toBe("run-008");
	});

	it("names minute folders with a number and a constant word", () => {
		expect(minuteDirectoryName(0)).toBe("000-minute");
		expect(minuteDirectoryName(12)).toBe("012-minute");
		expect(minuteDirectoryName(1000)).toBe("1000-minute");
	});

	it("writes every event once in total and once per minute, with seq, minute and wall-clock time", () => {
		const directory = tempDirectory();
		let minute = 0;
		const bus = new EventBus([new JsonlEventLog(join(directory, "events.jsonl")), new MinuteEventLog(directory)], () => minute);
		bus.emit({ type: "round_start", round: 1, order: ["A01"] });
		bus.emit({ type: "text", agent: "A01", text: "Hello" });
		minute = 1;
		bus.emit({ type: "round_start", round: 2, order: ["A01"] });

		const all = readFileSync(join(directory, "events.jsonl"), "utf8").trim().split("\n");
		expect(all).toHaveLength(3);
		const parsed: unknown = JSON.parse(all[1] ?? "");
		expect(parsed).toMatchObject({ seq: 2, minute: 0, type: "text", text: "Hello" });
		expect(parsed).toHaveProperty("at");

		const minute0 = readFileSync(join(directory, "000-minute", "events.jsonl"), "utf8").trim().split("\n");
		const minute1 = readFileSync(join(directory, "001-minute", "events.jsonl"), "utf8").trim().split("\n");
		expect(minute0).toHaveLength(2);
		expect(minute1).toHaveLength(1);
		expect(minute1[0]).toContain('"round":2');
	});

	it("writes the run metadata to 000-run.json", () => {
		const directory = tempDirectory();
		const path = writeRunMetadata(directory, { run: "run-001", agents: 6 });
		expect(path).toBe(join(directory, "000-run.json"));
		const meta: unknown = JSON.parse(readFileSync(path, "utf8"));
		expect(meta).toEqual({ run: "run-001", agents: 6 });
	});
});
