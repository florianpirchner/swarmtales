// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import { shownNameClashes, toolNames, type ToolSource } from "../src/game/tool-names.ts";

const source = (id: string, index: number, tools: readonly string[], as?: Readonly<Record<string, string>>): ToolSource => ({
	mechanic: { id, package: `@example/${id}`, head: { tools: tools.map((name) => ({ name, for: ["resident"] })) } },
	as,
	path: `mechanics[${String(index)}]`,
});

describe("toolNames", () => {
	it("gives canonical names with the full package name, and the bare name as the shown name", () => {
		const { tools, names, issues } = toolNames([source("chat", 1, ["post"]), source("board", 0, ["view", "move"])]);
		expect(issues).toEqual([]);
		expect(tools.map((tool) => tool.canonical)).toEqual(["@example/chat/chat/post", "@example/board/board/view", "@example/board/board/move"]);
		expect(tools[2]).toEqual({ canonical: "@example/board/board/move", name: "move", shown: "move", owner: "board", for: ["resident"], path: "mechanics[0]" });
		expect(names).toEqual({ "@example/chat/chat/post": "post", "@example/board/board/view": "view", "@example/board/board/move": "move" });
	});

	it("shows a tool under the name `as` gives it, and ignores inherited keys", () => {
		const { names } = toolNames([source("board", 0, ["view", "toString"], { view: "look" })]);
		expect(names).toEqual({ "@example/board/board/view": "look", "@example/board/board/toString": "toString" });
	});

	it("raises SWT-G014 for a shown name outside the pattern, at the rename or at the mechanic", () => {
		const { issues, tools } = toolNames([source("board", 0, ["view"], { view: "look at" }), source("chat", 1, ["post.it", "x".repeat(65), "x".repeat(64)])]);
		expect(issues.map((issue) => [issue.code, issue.where?.path])).toEqual([["SWT-G014", "mechanics[0].as.view"], ["SWT-G014", "mechanics[1]"], ["SWT-G014", "mechanics[1]"]]);
		expect(issues[0]?.summary).toBe('tool "@example/board/board/view" would be shown as "look at", which is no valid tool name');
		expect(tools).toHaveLength(4);
	});
});

describe("shownNameClashes", () => {
	const { tools } = toolNames([source("chat", 0, ["post"]), source("forum", 1, ["post", "read"])]);
	const [chatPost, forumPost, read] = tools.map((tool) => tool.canonical);

	it("raises SWT-G013 when one grant holds two tools with one shown name", () => {
		const issues = shownNameClashes({ resident: [chatPost ?? "", read ?? "", forumPost ?? ""], watcher: [forumPost ?? "", read ?? ""] }, tools);
		expect(issues.map((issue) => [issue.code, issue.where?.path, issue.details])).toEqual([["SWT-G013", "mechanics[1]", { tools: ["@example/chat/chat/post", "@example/forum/forum/post"] }]]);
		expect(issues[0]?.summary).toContain('the grant "resident" holds 2 tools that are shown as "post"');
	});

	it("is silent when `as` tells them apart, when they sit in different grants, and for a tool listed twice", () => {
		const renamed = toolNames([source("chat", 0, ["post"]), source("forum", 1, ["post"], { post: "publish" })]).tools;
		expect(shownNameClashes({ resident: renamed.map((tool) => tool.canonical) }, renamed)).toEqual([]);
		expect(shownNameClashes({ resident: [chatPost ?? "", chatPost ?? ""], watcher: [forumPost ?? ""] }, tools)).toEqual([]);
	});

	it("raises SWT-G013 when `as` makes two names one", () => {
		const merged = toolNames([source("board", 0, ["view", "move"], { view: "move" })]).tools;
		expect(shownNameClashes({ resident: merged.map((tool) => tool.canonical) }, merged).map((issue) => issue.code)).toEqual(["SWT-G013"]);
	});
});
