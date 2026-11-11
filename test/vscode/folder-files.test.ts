/** The host's side: path checks, request answers and run-folder detection. */
import { memorySource } from "@swarmtales/viewer-core";
import { describe, expect, it } from "vitest";
import { answer, classifyFolder, isStoryFile, safeRelative } from "../../apps/vscode/src/folder-files.ts";

const EVENTS = '{"type":"a","seq":1,"minute":0}\n';

describe("safeRelative", () => {
	it("normalises plain relative paths", () => {
		expect(safeRelative("")).toBe("");
		expect(safeRelative("a/b/events.jsonl")).toBe("a/b/events.jsonl");
		expect(safeRelative("./a//b/")).toBe("a/b");
	});
	it("refuses paths that leave the folder", () => {
		for (const bad of ["../x", "a/../../x", "a/..", "/etc/passwd", "C:/Windows", "c:\\x", "a\\b", "a\0b", "a/.../x", "a/.. /x", "run./events.jsonl", "run /x"]) expect(safeRelative(bad), bad).toBeUndefined();
	});
});

describe("answer", () => {
	const files = memorySource({ "r/events.jsonl": EVENTS });
	it("lists, reads and reports a missing file as no text", async () => {
		expect(await answer(files, { type: "rpc", id: 1, method: "list", dir: "r" })).toEqual({ type: "rpc-result", id: 1, ok: true, entries: [{ name: "events.jsonl", kind: "file" }] });
		expect(await answer(files, { type: "rpc", id: 2, method: "readText", path: "r/events.jsonl" })).toEqual({ type: "rpc-result", id: 2, ok: true, text: EVENTS });
		expect(await answer(files, { type: "rpc", id: 3, method: "readText", path: "r/none" })).toEqual({ type: "rpc-result", id: 3, ok: true });
	});
	it("refuses a path outside the folder and turns a failing read into an error reply", async () => {
		const outside = await answer(files, { type: "rpc", id: 4, method: "readText", path: "../secret" });
		expect(outside.ok).toBe(false);
		const broken = await answer({ list: () => Promise.reject(new Error("disk gone")), readText: () => Promise.resolve(undefined) }, { type: "rpc", id: 5, method: "list", dir: "" });
		expect(broken).toEqual({ type: "rpc-result", id: 5, ok: false, error: "disk gone" });
	});
});

describe("classifyFolder", () => {
	it("knows a run folder, a folder of runs and neither", async () => {
		expect(await classifyFolder(memorySource({ "events.jsonl": EVENTS, "agents/A01.md": "x" }))).toEqual({ kind: "run" });
		expect(await classifyFolder(memorySource({ "runs/a/events.jsonl": EVENTS, "runs/b/run/events.jsonl": EVENTS }))).toEqual({ kind: "runs", count: 2 });
		expect(await classifyFolder(memorySource({ "docs/readme.md": "x" }))).toEqual({ kind: "none" });
		expect(await classifyFolder(memorySource({}))).toEqual({ kind: "none" });
	});
	it("does not search deeper than the depth given", async () => {
		const deep = memorySource({ "a/b/c/d/e/events.jsonl": EVENTS });
		expect(await classifyFolder(deep, 2)).toEqual({ kind: "none" });
		expect(await classifyFolder(deep, 5)).toEqual({ kind: "runs", count: 1 });
	});
});

describe("isStoryFile", () => {
	it("matches story files only", () => {
		for (const good of ["a.story.yaml", "x/y/chess.story.json", "/w/stories/story.yaml", "story.yml", "C:\\w\\a.story.yml"]) expect(isStoryFile(good), good).toBe(true);
		for (const bad of ["story.ts", "mystory.yaml", "a.yaml", "story.yaml.bak", "events.jsonl"]) expect(isStoryFile(bad), bad).toBe(false);
	});
});
