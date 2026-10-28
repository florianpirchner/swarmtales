import { describe, expect, it } from "vitest";
import { filterToolPayload, withRequestDefaults } from "../../src/agents/runner.ts";
import { allTools, bindAll, INVALID_ARGUMENTS, TOOL_LOCKED, TOOL_NAMES, TOOLS } from "../../src/tools/index.ts";
import { act, createFixture, say } from "../helpers/fixture.ts";

function textOf(result: { readonly content: readonly { readonly type: string; readonly text?: string }[] }): string {
	return result.content.map((part) => part.text ?? "").join("");
}

describe("tool gateway (ARCHITECTURE 1.4)", () => {
	it("implements every catalog name exactly once", () => {
		expect(allTools.map((tool) => tool.name)).toEqual([...TOOL_NAMES]);
		for (const name of TOOL_NAMES) expect(TOOLS[name].name).toBe(name);
		for (const tool of allTools) expect(tool.description.length).toBeGreaterThan(10);
	});

	it("rejects locked tools with TOOL_LOCKED and unparsable arguments with INVALID_ARGUMENTS", async () => {
		const fixture = createFixture({ agents: 2, minutes: 1, only: 1, script: () => ({}) });
		const tools = bindAll({ self: "A01", world: fixture.world });
		const byName = new Map(tools.map((tool) => [tool.name, tool]));
		const postBoard = byName.get("postBoard");
		const submit = byName.get("submitSolution");
		if (postBoard === undefined || submit === undefined) throw new Error("tools missing");

		const locked = await postBoard.execute("call-1", { message: "hi" });
		expect(textOf(locked)).toBe(TOOL_LOCKED);
		expect(locked.isError).toBe(true);

		const invalid = await submit.execute("call-2", { level: "one" });
		expect(textOf(invalid)).toBe(INVALID_ARGUMENTS);
		expect(fixture.world.board.all()).toEqual([]);
	});

	it("reports the same unlock set in requests and in getStatus", async () => {
		const fixture = createFixture({
			agents: 2,
			minutes: 1,
			only: 2,
			script: () => ({ A01: [act({ name: "getStatus" })], A02: [say()] }),
		});
		await fixture.run();
		const request = fixture.events("request").find((event) => event.agent === "A01");
		expect(request?.tools).toEqual(["getStatus", "getProblem", "submitSolution", "listAgents", "readBoard", "postBoard"]);
		expect(fixture.toolResults("A01", "getStatus")[0]).toContain(
			"unlocked tools: getStatus, getProblem, submitSolution, listAgents, readBoard, postBoard",
		);
	});

	it("removes locked schemas from the provider payload", () => {
		const payload = {
			model: "x",
			tools: [
				{ type: "function", function: { name: "getStatus" } },
				{ type: "function", function: { name: "sendDM" } },
				{ name: "readBoard" },
				"garbage",
			],
		};
		expect(filterToolPayload(payload, new Set(["getStatus", "readBoard"]))).toEqual({
			model: "x",
			tools: [{ type: "function", function: { name: "getStatus" } }, { name: "readBoard" }],
		});
		expect(filterToolPayload("not an object", new Set())).toBe("not an object");
		expect(filterToolPayload({ model: "x" }, new Set())).toEqual({ model: "x" });
	});

	it("merges fixed request fields over the payload", () => {
		expect(withRequestDefaults({ model: "x" }, { provider: { order: ["a"] } })).toEqual({ model: "x", provider: { order: ["a"] } });
		expect(withRequestDefaults({ model: "x" }, undefined)).toEqual({ model: "x" });
	});
});
