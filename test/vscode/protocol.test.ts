/** Webview messages are untrusted input: only well-formed ones get through the parsers. */
import { describe, expect, it } from "vitest";
import { isInit, parseToHost, parseToWebview } from "../../apps/vscode/src/protocol.ts";

describe("messages from the webview", () => {
	it("accepts ready, list, readText and openFile", () => {
		expect(parseToHost({ type: "ready" })).toEqual({ type: "ready" });
		expect(parseToHost({ type: "rpc", id: 3, method: "list", dir: "runs/a" })).toEqual({ type: "rpc", id: 3, method: "list", dir: "runs/a" });
		expect(parseToHost({ type: "rpc", id: 0, method: "readText", path: "a/events.jsonl" })?.type).toBe("rpc");
		expect(parseToHost({ type: "openFile", path: "agents/A01.md" })).toEqual({ type: "openFile", path: "agents/A01.md" });
	});
	it("refuses everything else", () => {
		for (const bad of [undefined, null, "ready", 7, [], {}, { type: "exec", command: "rm" }, { type: "rpc", id: -1, method: "list", dir: "" }, { type: "rpc", id: 1.5, method: "list", dir: "" }, { type: "rpc", id: 1, method: "writeText", path: "x" }, { type: "rpc", id: 1, method: "list" }, { type: "rpc", id: 1, method: "readText", path: 4 }, { type: "openFile" }]) {
			expect(parseToHost(bad), JSON.stringify(bad)).toBeUndefined();
		}
	});
});

describe("messages to the webview", () => {
	it("accepts init and the three kinds of reply", () => {
		const init = parseToWebview({ type: "init", title: "runs", stories: { chess: { a: 1 } }, views: [{ id: "v", kind: "board-fen", event: "move_played", fields: { fen: "fen" } }], hash: "#view=story" });
		expect(init !== undefined && isInit(init)).toBe(true);
		expect(parseToWebview({ type: "rpc-result", id: 1, ok: true, entries: [{ name: "a", kind: "dir" }] })).toBeDefined();
		expect(parseToWebview({ type: "rpc-result", id: 1, ok: true, text: "x" })).toBeDefined();
		expect(parseToWebview({ type: "rpc-result", id: 1, ok: true })).toBeDefined();
		expect(parseToWebview({ type: "rpc-result", id: 1, ok: false, error: "boom" })).toBeDefined();
	});
	it("refuses a malformed init or reply", () => {
		expect(parseToWebview({ type: "init", title: 3, stories: {}, views: [] })).toBeUndefined();
		expect(parseToWebview({ type: "init", title: "t", stories: {}, views: [{ id: "v" }] })).toBeUndefined();
		expect(parseToWebview({ type: "rpc-result", id: 1, ok: false })).toBeUndefined();
		expect(parseToWebview({ type: "rpc-result", id: 1, ok: true, entries: [{ name: "a", kind: "link" }] })).toBeUndefined();
	});
});
