// SPDX-License-Identifier: LicenseRef-SUL-1.0
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readText } from "../lib/files.ts";
import { allowedPath, artifactProblems } from "./artifact.ts";
import { packAll, packIndex, packName, runFolders } from "./runs.ts";

const CSP = '<html><head><meta http-equiv="Content-Security-Policy" content="default-src \'self\'" /></head></html>';

describe("the public viewer page", () => {
	const dirs: string[] = [];
	afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

	it("allows the app and the run packs, nothing else", () => {
		expect(allowedPath("index.html")).toBe(true);
		expect(allowedPath("assets/index-abc.js")).toBe(true);
		expect(allowedPath("runs/index.json")).toBe(true);
		expect(allowedPath(`runs/${packName("whispers/smoke/whispers-001")}`)).toBe(true);
		expect(allowedPath("runs/../secret.json")).toBe(false);
		expect(allowedPath("assets/index-abc.js.map")).toBe(false);
		expect(allowedPath("notes.txt")).toBe(false);
	});

	it("refuses keys, local paths and a page without its policy", () => {
		expect(artifactProblems([{ path: "index.html", text: CSP }])).toEqual([]);
		expect(artifactProblems([{ path: "index.html", text: "<html></html>" }])).toEqual(["index.html has no Content Security Policy"]);
		expect(artifactProblems([{ path: "index.html", text: CSP }, { path: "runs/index.json", text: '{"a":"/home/flo/x"}' }])).toEqual(["runs/index.json: contains a local path"]);
		expect(artifactProblems([{ path: "assets/a.js", text: `x="sk-ant-${"a".repeat(24)}"` }])).toEqual(["assets/a.js: contains an API key", "index.html is missing"]);
	});

	it("packs every run folder: the headers into one pack, the rest of a run into its own", () => {
		const root = mkdtempSync(join(tmpdir(), "swt-pages-"));
		dirs.push(root);
		const run = join(root, "game", "series", "run-1");
		mkdirSync(join(run, "agents"), { recursive: true });
		writeFileSync(join(run, "events.jsonl"), "{}\n");
		writeFileSync(join(run, "manifest.json"), "{}");
		writeFileSync(join(run, "notes.txt"), "not read");
		writeFileSync(join(run, "agents", "A01.md"), "transcript");
		mkdirSync(join(root, "empty"));
		expect(runFolders(root)).toEqual(["game/series/run-1"]);
		const packs = packAll(root);
		expect(packs.meta).toEqual({ "game/series/run-1/manifest.json": "{}" });
		expect(packs.runs).toEqual({ "game__series__run-1.json": { "game/series/run-1/agents/A01.md": "transcript", "game/series/run-1/events.jsonl": "{}\n" } });
		expect(packIndex(packs)).toEqual({
			title: "Swarm Tales: recorded runs",
			packs: { "meta.json": ["game/series/run-1/manifest.json"], "game__series__run-1.json": ["game/series/run-1/agents/A01.md", "game/series/run-1/events.jsonl"] },
		});
	});

	it("links from the README into the page by a run's path on data/runs", () => {
		const linked = [...readText("README.md").matchAll(/github\.io\/swarmtales\/#run=([^&)\s]+)/g)].map((match) => match[1] ?? "");
		expect(linked.length).toBeGreaterThan(0);
		for (const run of linked) expect(run).toMatch(/^[\w-]+(\/[\w.-]+)+$/);
	});
});
