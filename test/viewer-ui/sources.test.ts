/** The web app's sources: a file list (picked or dropped folder) and GitHub through a fake fetch. */
import { findRuns, loadRun } from "@swarmtales/viewer-core";
import { describe, expect, it } from "vitest";
import { filesSource, rootName, sourceFilesOf, type FileLike } from "../../apps/viewer-web/src/file-source.ts";
import { contentsUrl, githubSource, locationFromQuery, rawUrl, treeUrl, type FetchFn, type GithubLocation } from "../../apps/viewer-web/src/github-source.ts";
import { parseViewerData } from "../../apps/viewer-web/src/viewer-data.ts";

const file = (path: string, text: string): FileLike => ({ name: path.split("/").at(-1) ?? path, webkitRelativePath: path, text: () => Promise.resolve(text) });
const EVENTS = '{"type":"a","seq":1,"minute":0}\n{"type":"b","seq":2,"minute":1}\n';

describe("file list source", () => {
	const files = sourceFilesOf([
		file("runs/one/run/events.jsonl", EVENTS),
		file("runs/one/run/000-run.json", '{"storyId":"chess","startedAt":"2026-01-01T00:00:00Z"}'),
		file("runs/two/events.jsonl", EVENTS),
		file("runs/README.md", "# runs"),
	]);
	const source = filesSource(files);
	it("lists directories implied by the paths", async () => {
		expect(await source.list("")).toEqual([{ name: "runs", kind: "dir" }]);
		expect(await source.list("runs")).toEqual([{ name: "README.md", kind: "file" }, { name: "one", kind: "dir" }, { name: "two", kind: "dir" }]);
		expect(await source.list("runs/one/run")).toEqual([{ name: "000-run.json", kind: "file" }, { name: "events.jsonl", kind: "file" }]);
		expect(await source.list("nope")).toEqual([]);
	});
	it("reads files lazily and returns undefined for a missing one", async () => {
		expect(await source.readText("runs/README.md")).toBe("# runs");
		expect(await source.readText("runs/missing.md")).toBeUndefined();
		expect(await source.readText("/runs//README.md")).toBe("# runs");
	});
	it("serves findRuns and loadRun", async () => {
		const runs = await findRuns(source, "");
		expect(runs.map((run) => run.dir)).toEqual(["runs/one/run", "runs/two"]);
		expect(runs[0]?.story).toBe("chess");
		expect((await loadRun(source, "runs/two")).events).toHaveLength(2);
	});
	it("names the picked folder and falls back to the bare file name", () => {
		expect(rootName(files)).toBe("runs");
		expect(rootName(sourceFilesOf([file("a/x", ""), file("b/y", "")]))).toBe("folder");
		expect(sourceFilesOf([{ name: "events.jsonl", text: () => Promise.resolve("") }])[0]?.path).toBe("events.jsonl");
	});
});

const location: GithubLocation = { owner: "o", repo: "r", ref: "main", path: "stories/chess/runs" };

describe("GitHub source", () => {
	it("reads the query", () => {
		expect(locationFromQuery("?repo=o/r&ref=dev&path=stories/chess/runs/")).toEqual({ owner: "o", repo: "r", ref: "dev", path: "stories/chess/runs" });
		expect(locationFromQuery("repo=o/r")).toEqual({ owner: "o", repo: "r", ref: "main", path: "" });
		expect(locationFromQuery("?repo=nope")).toBeUndefined();
		expect(locationFromQuery("")).toBeUndefined();
		expect(locationFromQuery("?repo=a/b/c")).toBeUndefined();
		// The launcher builds its query with URLSearchParams, so a ref or path with & or = stays whole.
		expect(locationFromQuery(new URLSearchParams({ repo: "o/r", ref: "feat&path=x", path: "a b/c=d" }).toString())).toEqual({ owner: "o", repo: "r", ref: "feat&path=x", path: "a b/c=d" });
	});
	it("builds the URLs", () => {
		expect(treeUrl(location)).toBe("https://api.github.com/repos/o/r/git/trees/main?recursive=1");
		expect(rawUrl(location, "x y/events.jsonl")).toBe("https://raw.githubusercontent.com/o/r/main/stories/chess/runs/x%20y/events.jsonl");
		expect(contentsUrl(location, "a/b.md")).toBe("https://api.github.com/repos/o/r/contents/stories/chess/runs/a/b.md?ref=main");
		expect(rawUrl({ ...location, ref: "feature/x", path: "" }, "a")).toBe("https://raw.githubusercontent.com/o/r/feature/x/a");
	});

	const tree = { tree: [
		{ path: "README.md", type: "blob" },
		{ path: "stories/chess/runs/one/run/events.jsonl", type: "blob" },
		{ path: "stories/chess/runs/one/run/000-run.json", type: "blob" },
		{ path: "stories/chess/runs/one/run", type: "tree" },
		{ path: "stories/other/x.md", type: "blob" },
	] };
	function fake(): { readonly fetchFn: FetchFn; readonly calls: { readonly url: string; readonly headers: Readonly<Record<string, string>> }[] } {
		const calls: { url: string; headers: Readonly<Record<string, string>> }[] = [];
		const fetchFn: FetchFn = (url, init) => {
			calls.push({ url, headers: init?.headers ?? {} });
			const reply = (status: number, body: unknown) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body), text: () => Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)) });
			if (url.includes("/git/trees/")) return reply(200, tree);
			if (url.endsWith("events.jsonl") || url.includes("events.jsonl?")) return reply(200, '{"type":"a","seq":1,"minute":0}\n');
			return reply(200, '{"storyId":"chess"}');
		};
		return { fetchFn, calls };
	}
	it("lists from one tree request and reads only files the tree has", async () => {
		const { fetchFn, calls } = fake();
		const source = githubSource(location, fetchFn);
		expect((await findRuns(source, "")).map((run) => run.dir)).toEqual(["one/run"]);
		expect(await source.readText("one/run/REPORT.md")).toBeUndefined();
		expect(await source.readText("one/run/events.jsonl")).toContain('"seq":1');
		const urls = calls.map((call) => call.url);
		expect(urls.filter((url) => url.includes("/git/trees/"))).toHaveLength(1);
		expect(urls).toContain("https://raw.githubusercontent.com/o/r/main/stories/chess/runs/one/run/events.jsonl");
		expect(urls.some((url) => url.includes("REPORT.md"))).toBe(false);
		expect(calls.every((call) => call.headers.Authorization === undefined)).toBe(true);
	});
	it("sends a token to the API only, never in a URL", async () => {
		const { fetchFn, calls } = fake();
		const source = githubSource(location, fetchFn, "secret-token");
		await source.readText("one/run/events.jsonl");
		expect(calls.map((call) => call.url).every((url) => !url.includes("secret-token") && !url.includes("raw.githubusercontent.com"))).toBe(true);
		expect(calls.every((call) => call.headers.Authorization === "Bearer secret-token")).toBe(true);
		expect(calls.at(-1)?.headers.Accept).toBe("application/vnd.github.raw+json");
	});
	it("explains a missing repository and a rate limit without leaking the token", async () => {
		const answer = (status: number): FetchFn => () => Promise.resolve({ ok: false, status, json: () => Promise.resolve({}), text: () => Promise.resolve("") });
		await expect(githubSource(location, answer(404), "tok").list("")).rejects.toThrow(/not found.*token/);
		await expect(githubSource(location, answer(403), "tok").list("")).rejects.toThrow(/rate limit/);
		const message = await githubSource(location, answer(404), "secret-token").list("").then(() => "", (error: unknown) => (error instanceof Error ? error.message : ""));
		expect(message).not.toContain("secret-token");
	});
	it("says once when GitHub sent only part of the tree", async () => {
		const tree = { tree: [{ path: "stories/chess/runs/one/run/events.jsonl", type: "blob" }], truncated: true };
		const partial: FetchFn = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(tree), text: () => Promise.resolve("") });
		let told = 0;
		const source = githubSource(location, partial, undefined, () => { told += 1; });
		expect((await findRuns(source, "")).map((run) => run.dir)).toEqual(["one/run"]);
		await source.list("one");
		expect(told).toBe(1);
	});
	it("refuses a tree of an unexpected shape", async () => {
		const odd: FetchFn = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ nope: 1 }), text: () => Promise.resolve("") });
		await expect(githubSource(location, odd).list("")).rejects.toThrow(/unexpected shape/);
	});
});

describe("viewer data file", () => {
	it("merges aliases and parses the views", () => {
		const data = parseViewerData({ stories: { cityofkeys: { id: 1 } }, aliases: { nexus: "cityofkeys", gone: "missing" }, views: [{ id: "b", kind: "board-fen", event: "e", fields: { fen: "fen" } }, 3] });
		expect(Object.keys(data.stories).sort()).toEqual(["cityofkeys", "nexus"]);
		expect(data.stories.nexus).toBe(data.stories.cityofkeys);
		expect(data.views).toHaveLength(1);
	});
	it("gives an empty viewer for a file that does not fit", () => {
		expect(parseViewerData({ nope: true })).toEqual({ stories: {}, views: [], games: [] });
		expect(parseViewerData(undefined)).toEqual({ stories: {}, views: [], games: [] });
	});
});
