// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import { resolveGrants } from "../src/game/grants.ts";
import { toolNames, type ToolSource } from "../src/game/tool-names.ts";

type Declared = readonly (readonly [name: string, ...grants: string[]])[];
const source = (id: string, index: number, tools: Declared, as?: Readonly<Record<string, string>>): ToolSource => ({
	mechanic: { id, package: "@x/m", head: { tools: tools.map(([name, ...grants]) => ({ name, for: grants })) } },
	as,
	path: `mechanics[${String(index)}]`,
});
const c = (id: string, tool: string): string => `@x/m/${id}/${tool}`;

/** In load order: `chat` is listed second in the game and loads first. */
const chat = source("chat", 1, [["post", "resident", "watcher"], ["read", "resident"]]);
const board = source("board", 0, [["view", "resident", "watcher"], ["move", "resident"], ["resign", "resident"], ["audit"]]);
const { tools } = toolNames([chat, board]);

describe("resolveGrants", () => {
	it("derives the grants from `for`, in load order and within a mechanic in the head's order", () => {
		expect(resolveGrants({ tools })).toEqual({
			grants: { resident: [c("chat", "post"), c("chat", "read"), c("board", "view"), c("board", "move"), c("board", "resign")], watcher: [c("chat", "post"), c("board", "view")] },
			startLocks: {},
			issues: [],
		});
	});

	it("lets a list replace the derived one and set the order, also for a grant name no tool names", () => {
		const { grants, issues } = resolveGrants({ tools, grants: { resident: ["move", "post", "move"], judge: ["audit"] } });
		expect(issues).toEqual([]);
		expect(grants).toEqual({ resident: [c("board", "move"), c("chat", "post")], watcher: [c("chat", "post"), c("board", "view")], judge: [c("board", "audit")] });
	});

	it("applies `drop` and then `add` to the derived list; an added tool that is there stays in its place", () => {
		const { grants, issues } = resolveGrants({ tools, grants: { resident: { drop: ["resign", "post"], add: ["audit", "view", "post"] }, watcher: { drop: ["post"] }, judge: { add: ["audit"] } } });
		expect(issues).toEqual([]);
		expect(grants).toEqual({ resident: [c("chat", "read"), c("board", "view"), c("board", "move"), c("board", "audit"), c("chat", "post")], watcher: [c("board", "view")], judge: [c("board", "audit")] });
	});

	it("turns `locked` into the start locks of `resident`", () => {
		expect(resolveGrants({ tools, locked: ["move", "resign", "move"] }).startLocks).toEqual({ resident: [c("board", "move"), c("board", "resign")] });
	});

	it("raises SWT-G012 with the closest name for every name no mechanic defines, in a list, a tweak and `locked`", () => {
		const { grants, startLocks, issues } = resolveGrants({ tools, grants: { resident: ["post", "mov"], watcher: { drop: ["veiw"], add: ["zzzzzz"] } }, locked: ["resing"] });
		expect(issues.map((issue) => [issue.code, issue.where?.path])).toEqual([["SWT-G012", "grants.resident[1]"], ["SWT-G012", "grants.watcher.drop[0]"], ["SWT-G012", "grants.watcher.add[0]"], ["SWT-G012", "locked[0]"]]);
		expect(issues[0]?.summary).toBe('tool "mov" is granted but no mechanic of the game defines it');
		expect(issues[0]?.fix).toContain('did you mean "move"?');
		expect(issues[2]?.fix).not.toContain("did you mean");
		expect(issues[3]?.summary).toContain('tool "resing" is locked');
		expect(issues[3]?.fix).toContain('did you mean "resign"?');
		expect(grants).toEqual({ resident: [c("chat", "post")], watcher: [c("chat", "post"), c("board", "view")] });
		expect(startLocks).toEqual({});
	});

	it("names a tool by its bare name also when `as` renames it; the shown name is no name of the game", () => {
		const renamed = toolNames([chat, source("board", 0, [["view", "resident"], ["move", "resident"]], { move: "place" })]).tools;
		expect(resolveGrants({ tools: renamed, grants: { resident: ["move"] }, locked: ["move"] })).toEqual({ grants: { resident: [c("board", "move")], watcher: [c("chat", "post")] }, startLocks: { resident: [c("board", "move")] }, issues: [] });
		expect(resolveGrants({ tools: renamed, locked: ["place"] }).issues.map((issue) => issue.code)).toEqual(["SWT-G012"]);
	});

	it("takes a bare name that two mechanics declare for both, and raises SWT-G013 unless `as` tells them apart", () => {
		const forum = (as?: Readonly<Record<string, string>>): ToolSource => source("forum", 2, [["post", "resident"]], as);
		const clash = resolveGrants({ tools: toolNames([chat, forum()]).tools });
		expect(clash.issues.map((issue) => [issue.code, issue.where?.path])).toEqual([["SWT-G013", "mechanics[2]"]]);
		const apart = resolveGrants({ tools: toolNames([chat, forum({ post: "publish" })]).tools, grants: { resident: ["post"] } });
		expect(apart).toEqual({ grants: { resident: [c("chat", "post"), c("forum", "post")], watcher: [c("chat", "post")] }, startLocks: {}, issues: [] });
	});
});
