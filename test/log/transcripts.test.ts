import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fauxAssistantMessage, fauxThinking, fauxToolCall } from "@earendil-works/pi-ai";
import { afterEach, describe, expect, it } from "vitest";
import { EventBus } from "@swarmtales/engine";
import { AgentTranscriptLog } from "@swarmtales/chronicle";
import { createHostFixture, say } from "../helpers/host-fixture.ts";
import { fragmentOf } from "../helpers/host-inspect.ts";

const directories: string[] = [];

function tempDirectory(): string {
	const directory = mkdtempSync(join(tmpdir(), "arena-transcripts-"));
	directories.push(directory);
	return directory;
}

afterEach(() => {
	for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("AgentTranscriptLog", () => {
	it("writes one Markdown file per competitor with inputs, reasoning, tools and results", async () => {
		const directory = tempDirectory();
		const fixture = createHostFixture({
			agents: 2,
			minutes: 1,
			only: 2,
			sinks: [new AgentTranscriptLog(directory)],
			script: (host) => ({
				A01: [
					fauxAssistantMessage([
						fauxThinking("A02 holds the other fragment. I post mine first."),
						fauxToolCall("postBoard", { message: fragmentOf(host, "A01", 2) }),
					]),
				],
				A02: [fauxAssistantMessage(fauxThinking("I read the board first.")), say()],
			}),
		});
		await fixture.run();

		const a01 = readFileSync(join(directory, "A01.md"), "utf8");
		for (const expected of ["# A01", "## Minute 0", "**Input**", "**Reasoning**", "A02 holds the other fragment", "**Tool `postBoard`**", "posted · #", "_End of run._"]) {
			expect(a01).toContain(expected);
		}
		const a02 = readFileSync(join(directory, "A02.md"), "utf8");
		expect(a02).toContain("I read the board first.");
		expect(a02).not.toContain("A02 holds the other fragment");
	});

	it("writes run metadata into the header and the unlock set only when it changes", () => {
		const directory = tempDirectory();
		const bus = new EventBus([new AgentTranscriptLog(directory)], () => 0);
		bus.emit({ type: "run_start", story: "cityofkeys", agents: ["A01"], minutes: 3, seed: 7, meta: { provider: "scripted", model: "-" } });
		bus.emit({ type: "request", agent: "A01", tools: ["getStatus", "submitSolution"] });
		bus.emit({ type: "request", agent: "A01", tools: ["getStatus", "submitSolution"] });
		const content = readFileSync(join(directory, "A01.md"), "utf8");
		expect(content).toContain("- provider: scripted");
		expect(content).toContain("- model: -");
		expect(content.split("**Unlocked tools:**")).toHaveLength(2);
	});
});
