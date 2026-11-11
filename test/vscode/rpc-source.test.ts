/** The RunSource that asks the extension host, over a fake channel wired to the real request handler. */
import { findRuns, loadRun, memorySource } from "@swarmtales/viewer-core";
import { describe, expect, it } from "vitest";
import { answer } from "../../apps/vscode/src/folder-files.ts";
import type { RpcRequest } from "../../apps/vscode/src/protocol.ts";
import { rpcSource } from "../../apps/vscode/src/rpc-source.ts";

const EVENTS = '{"type":"a","seq":1,"minute":0}\n{"type":"b","seq":2,"minute":1}\n';

/** A channel whose "host" answers each request on a later tick, like postMessage does. */
function wired(files: Record<string, string>) {
	const sent: RpcRequest[] = [];
	const host = memorySource(files);
	const rpc = rpcSource({
		post(request) {
			sent.push(request);
			void answer(host, request).then((reply) => { queueMicrotask(() => { rpc.accept(reply); }); });
		},
	});
	return { rpc, sent };
}

describe("rpcSource", () => {
	it("lists and reads through requests with fresh ids", async () => {
		const { rpc, sent } = wired({ "runs/one/events.jsonl": EVENTS, "runs/README.md": "# runs" });
		expect(await rpc.source.list("runs")).toEqual([{ name: "README.md", kind: "file" }, { name: "one", kind: "dir" }]);
		expect(await rpc.source.readText("runs/README.md")).toBe("# runs");
		expect(await rpc.source.readText("runs/missing.md")).toBeUndefined();
		expect(sent.map((request) => request.id)).toEqual([0, 1, 2]);
	});
	it("serves findRuns and loadRun like a local source", async () => {
		const { rpc } = wired({ "runs/one/events.jsonl": EVENTS, "runs/two/run/events.jsonl": EVENTS });
		expect((await findRuns(rpc.source, "")).map((run) => run.dir)).toEqual(["runs/one", "runs/two/run"]);
		expect((await loadRun(rpc.source, "runs/one")).events).toHaveLength(2);
	});
	it("answers concurrent requests to the right caller, whatever the reply order", async () => {
		const sent: RpcRequest[] = [];
		const rpc = rpcSource({ post: (request) => { sent.push(request); } });
		const first = rpc.source.readText("a");
		const second = rpc.source.readText("b");
		rpc.accept({ type: "rpc-result", id: 1, ok: true, text: "B" });
		rpc.accept({ type: "rpc-result", id: 0, ok: true, text: "A" });
		expect([await first, await second]).toEqual(["A", "B"]);
	});
	it("rejects on an error reply and ignores unknown or repeated ids", async () => {
		const rpc = rpcSource({ post: () => undefined });
		const read = rpc.source.list("x");
		rpc.accept({ type: "rpc-result", id: 99, ok: true, text: "stray" });
		rpc.accept({ type: "rpc-result", id: 0, ok: false, error: "no access" });
		rpc.accept({ type: "rpc-result", id: 0, ok: true, entries: [] });
		await expect(read).rejects.toThrow("no access");
	});
});
