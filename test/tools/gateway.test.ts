import { describe, expect, it } from "vitest";
import { TOOL_NAMES } from "@swarmtales/contracts";
import { INVALID_ARGUMENTS } from "@swarmtales/kernel";
import { toolsNotice } from "@swarmtales/roles";
import { withRequestDefaults } from "@swarmtales/models";
import { findStory, storyNames } from "../../stories/index.ts";
import { act, createHostFixture as createFixture, say } from "../helpers/host-fixture.ts";

/** What a resident reads when it calls a tool it may not use (the old engine's `LOCKED_REPLY`). */
const LOCKED_REPLY = "TOOL_LOCKED: not available to you at this level or in this phase; activeTools lists the tools you can use now";

describe("tool gateway (ARCHITECTURE 1.4)", () => {
	it("implements every catalog name exactly once", () => {
		// The host serves each catalog tool from one mechanic: across the registered stories every name is served, none twice in one city.
		const served = new Set<string>();
		for (const name of storyNames()) {
			const story = findStory(name);
			if (story === undefined) throw new Error(`no story ${name}`);
			// The holdout tribunal plays only with a gamemaker (apps/cli/src/host/story.ts).
			const specs = createFixture({ story, minutes: 1, script: () => ({}), ...(story.gamemaker === undefined ? {} : { gamemakerScript: () => [] }) }).host.toolSpecs("resident");
			const names = specs.map((spec) => spec.name);
			expect(new Set(names).size, name).toBe(names.length);
			for (const spec of specs) {
				expect(TOOL_NAMES, name).toContain(spec.name);
				expect(spec.description.length, spec.name).toBeGreaterThan(10);
				served.add(spec.name);
			}
		}
		expect([...served].sort()).toEqual([...TOOL_NAMES].sort());
	});

	it("rejects locked tools with TOOL_LOCKED and unparsable arguments with INVALID_ARGUMENTS", async () => {
		const fixture = createFixture({
			agents: 2,
			minutes: 1,
			only: 1,
			script: () => ({ A01: [act({ name: "postBoard", args: { message: "hi" } })], A02: [say()] }),
		});
		// Unparsable arguments, called past the model's own schema check (the old test called the bound tool directly).
		expect(await fixture.host.call("resident:A01", "submitSolution", { level: "one" })).toMatchObject({ ok: false, code: INVALID_ARGUMENTS });
		await fixture.run();
		const results = fixture.events("tool_result").filter((event) => event.agent === "A01");
		expect(results.map((event) => [event.tool, event.text, event.isError])).toEqual([["postBoard", LOCKED_REPLY, true]]);
		expect(fixture.boardPosts()).toEqual([]);
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
		expect(fixture.toolResults("A01", "getStatus")[0]).toContain("unlocked tools: getStatus, getProblem, submitSolution, listAgents, readBoard, postBoard, activeTools");
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
