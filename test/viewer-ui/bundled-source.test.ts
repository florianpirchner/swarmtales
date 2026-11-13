/** Runs packed next to the page: `runs/index.json` names the packs, each pack is fetched once on the first read. */
import { findRuns, loadRun } from "@swarmtales/viewer-core";
import { describe, expect, it } from "vitest";
import { loadBundle } from "../../apps/viewer-web/src/bundled-source.ts";
import type { FetchFn } from "../../apps/viewer-web/src/github-source.ts";

const EVENTS = '{"type":"a","seq":1,"minute":0}\n{"type":"b","seq":2,"minute":1}\n';

function server(files: Readonly<Record<string, string>>): { readonly fetchFn: FetchFn; readonly urls: string[] } {
	const urls: string[] = [];
	const fetchFn: FetchFn = (url) => {
		urls.push(url);
		const text = files[url];
		return Promise.resolve(text === undefined
			? { ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve("") }
			: { ok: true, status: 200, json: () => Promise.resolve(JSON.parse(text)), text: () => Promise.resolve(text) });
	};
	return { fetchFn, urls };
}

describe("bundled source", () => {
	it("opens the runs of the packs in runs/index.json, one fetch per pack", async () => {
		const { fetchFn, urls } = server({
			"./runs/index.json": JSON.stringify({ title: "selected runs", packs: { "one run.json": ["one run/run/events.jsonl", "one run/run/usage.json"], "two.json": ["two/events.jsonl"] } }),
			"./runs/one%20run.json": JSON.stringify({ "one run/run/events.jsonl": EVENTS, "one run/run/usage.json": "{}" }),
			"./runs/two.json": JSON.stringify({ "two/events.jsonl": EVENTS }),
		});
		const bundle = await loadBundle("./runs", fetchFn);
		expect(bundle?.title).toBe("selected runs");
		if (bundle === undefined) return;
		expect((await findRuns(bundle.source, "")).map((run) => run.dir).sort()).toEqual(["one run/run", "two"]);
		expect((await loadRun(bundle.source, "one run/run")).events).toHaveLength(2);
		expect(await bundle.source.readText("one run/run/usage.json")).toBe("{}");
		expect(urls.filter((url) => url === "./runs/one%20run.json")).toHaveLength(1);
		expect(await bundle.source.readText("missing.json")).toBeUndefined();
	});

	it("is absent without an index or with a bad one", async () => {
		expect(await loadBundle("./runs", server({}).fetchFn)).toBeUndefined();
		expect(await loadBundle("./runs", server({ "./runs/index.json": '{"packs":3}' }).fetchFn)).toBeUndefined();
		const throwing: FetchFn = () => Promise.reject(new Error("offline"));
		expect(await loadBundle("./runs", throwing)).toBeUndefined();
	});

	it("fails a read when its pack is broken", async () => {
		const { fetchFn } = server({ "./runs/index.json": JSON.stringify({ title: "t", packs: { "p.json": ["a/events.jsonl"] } }), "./runs/p.json": "[1]" });
		const bundle = await loadBundle("./runs", fetchFn);
		await expect(bundle?.source.readText("a/events.jsonl")).rejects.toThrow("unexpected shape");
	});
});
