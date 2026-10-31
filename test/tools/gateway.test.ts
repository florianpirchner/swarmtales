import { describe, expect, it } from "vitest";
import { toolsNotice } from "@swarmtales/roles";
import { withRequestDefaults } from "@swarmtales/models";
import { allTools, bindAll, INVALID_ARGUMENTS, LOCKED_REPLY, TOOL_NAMES, TOOLS } from "@swarmtales/engine";
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
		expect(textOf(locked)).toBe(LOCKED_REPLY);
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
		expect(request?.tools).toEqual(["getStatus", "getProblem", "submitSolution", "listAgents", "readBoard", "postBoard", "activeTools"]);
		expect(fixture.toolResults("A01", "getStatus")[0]).toContain(
			"unlocked tools: getStatus, getProblem, submitSolution, listAgents, readBoard, postBoard, activeTools",
		);
	});

	it("names the open tools in the first step and again only when they change (P46)", async () => {
		const fixture = createFixture({
			agents: 2,
			minutes: 2,
			only: 2,
			script: () => ({ A01: [act({ name: "activeTools" }), say(), say()], A02: [say(), say(), say()] }),
		});
		await fixture.run();
		const inputs = fixture.events("turn_input").filter((event) => event.agent === "A01");
		const open = ["getStatus", "getProblem", "submitSolution", "listAgents", "readBoard", "postBoard", "activeTools"];
		expect(inputs[0]?.inputs.at(-1)).toBe(toolsNotice(open));
		expect(inputs.slice(1).flatMap((event) => event.inputs).filter((text) => text.startsWith("[tools]"))).toEqual([]);
		expect(fixture.toolResults("A01", "activeTools")[0]).toBe(`active tools: ${open.join(", ")}`);
	});

	it("merges fixed request fields over the payload", () => {
		expect(withRequestDefaults({ model: "x" }, { provider: { order: ["a"] } })).toEqual({ model: "x", provider: { order: ["a"] } });
		expect(withRequestDefaults({ model: "x" }, undefined)).toEqual({ model: "x" });
	});
});
