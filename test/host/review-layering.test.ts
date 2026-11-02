/**
 * Fixes of the challenger review (docs/design/core-review-2c.md), part 6: layering (problem 12).
 * The new core imports no type of the old contracts (`roles.ts` with `CompetitorId`, the old story),
 * and `Turn.record` writes an app event only once the turn is ready, so a runner that records a
 * model's output on arrival keeps the log in the pass's order.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { createHost, defineCoreStory, defineMechanic, reply } from "@swarmtales/kernel";

const LEGACY_CONTRACTS = ["ids.ts", "roles.ts", "story.ts", "tool-names.ts", "turn.ts"].map((file) => join("packages", "contracts", "src", file));
const NEW_CORE = [join("packages", "contracts", "src", "core"), join("packages", "kernel", "src", "host")];

function exportedNames(file: string): readonly string[] {
	return [...readFileSync(file, "utf8").matchAll(/^export\s+(?:declare\s+)?(?:interface|type|const|function|class|enum)\s+(\w+)/gm)].map((match) => match[1] ?? "");
}

describe("the new core and the old contracts (review problem 12)", () => {
	const legacy = new Set(LEGACY_CONTRACTS.flatMap(exportedNames));
	const files = NEW_CORE.flatMap((directory) => readdirSync(directory).filter((name) => name.endsWith(".ts")).map((name) => join(directory, name)));

	it("finds the old names to look for", () => {
		expect(legacy.has("GuardJudge")).toBe(true);
		expect(legacy.has("CompetitorId")).toBe(true);
		expect(files.length).toBeGreaterThan(20);
	});

	it("imports no file and no type of the old contracts", () => {
		const problems = files.flatMap((file) => {
			const text = readFileSync(file, "utf8");
			const relative = [...text.matchAll(/from\s+["'](\.\.\/[^"']+)["']/g)].map((match) => match[1] ?? "").filter((specifier) => /\/(ids|roles|story|tool-names|turn)\.ts$/.test(specifier) && file.includes(join("contracts", "src", "core")));
			const named = [...text.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+["']@swarmtales\/contracts["']/g)]
				.flatMap((match) => (match[1] ?? "").split(","))
				.map((part) => part.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0]?.trim() ?? "")
				.filter((name) => legacy.has(name));
			return [...relative.map((specifier) => `${file}: imports ${specifier}`), ...named.map((name) => `${file}: imports ${name}`)];
		});
		expect(problems).toEqual([]);
	});
});

describe("Turn.record (review problem 12)", () => {
	const talk = defineMechanic({ id: "talk", summary: "A say tool.", options: Type.Object({}), state: () => undefined, events: {}, prompts: { "talk/say": [] } }, (kit) => ({
		tools: [kit.tool({ name: "say", description: "talk/say", parameters: Type.Object({}), execute: () => reply("said") })],
	}));
	const story = defineCoreStory({ id: "record", seed: 2, minutes: 1, residents: 2, mechanics: [talk.with()], grants: { resident: ["say"] }, turns: { blockSize: 2 } });
	const app = { events: { text: Type.Object({ agent: Type.String() }) } };

	it("waits for the turn to be ready, so a later member's model output lands after the earlier member's calls", async () => {
		const host = createHost({ story, app });
		host.start();
		let first = "";
		await host.playMinute(async (turn) => {
			if (first === "") first = turn.resident;
			if (turn.resident === first) {
				// The first member's model is slow; the second member's answers at once.
				await new Promise((resolve) => setTimeout(resolve, 20));
				await turn.call("say", {});
			}
			await turn.record("text", { agent: turn.resident });
		});
		const order = host.log.all().filter((event) => event.type === "tool_called" || event.type === "text").map((event) => `${event.type}:${event.actor}`);
		const second = host.residents.find((id) => id !== first) ?? "";
		expect(order).toEqual([`tool_called:resident:${first}`, `text:resident:${first}`, `text:resident:${second}`]);
	});
});
