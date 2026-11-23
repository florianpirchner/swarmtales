// SPDX-License-Identifier: LicenseRef-SUL-1.0
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readText } from "../lib/files.ts";
import { allowedPath, artifactProblems } from "./artifact.ts";
import { packIndex, packRun, PAGES_RUNS } from "./runs.ts";

const CSP = '<html><head><meta http-equiv="Content-Security-Policy" content="default-src \'self\'" /></head></html>';

describe("the public viewer page", () => {
	const dirs: string[] = [];
	afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

	it("allows the app and the listed runs, nothing else", () => {
		expect(allowedPath("index.html")).toBe(true);
		expect(allowedPath("assets/index-abc.js")).toBe(true);
		expect(allowedPath("runs/index.json")).toBe(true);
		expect(allowedPath(`runs/${PAGES_RUNS[0]?.name ?? ""}.json`)).toBe(true);
		expect(allowedPath("runs/other-run.json")).toBe(false);
		expect(allowedPath("assets/index-abc.js.map")).toBe(false);
	});

	it("refuses keys, local paths and a page without its policy", () => {
		expect(artifactProblems([{ path: "index.html", text: CSP }])).toEqual([]);
		expect(artifactProblems([{ path: "index.html", text: "<html></html>" }])).toEqual(["index.html has no Content Security Policy"]);
		expect(artifactProblems([{ path: "index.html", text: CSP }, { path: "runs/index.json", text: '{"a":"/home/flo/x"}' }])).toEqual(["runs/index.json: contains a local path"]);
		expect(artifactProblems([{ path: "assets/a.js", text: `x="sk-ant-${"a".repeat(24)}"` }])).toEqual(["assets/a.js: contains an API key", "index.html is missing"]);
	});

	it("packs the files the viewer reads, keyed by the run's name", () => {
		const dir = mkdtempSync(join(tmpdir(), "swt-pages-"));
		dirs.push(dir);
		writeFileSync(join(dir, "events.jsonl"), "{}\n");
		writeFileSync(join(dir, "manifest.json"), "{}");
		writeFileSync(join(dir, "notes.txt"), "not read");
		mkdirSync(join(dir, "agents"));
		writeFileSync(join(dir, "agents", "A01.md"), "not read");
		const texts = packRun(dir, "run-1");
		expect(Object.keys(texts).sort()).toEqual(["run-1/events.jsonl", "run-1/manifest.json"]);
		expect(packIndex({ "run-1.json": texts })).toEqual({ title: "Swarm Tales: recorded runs", packs: { "run-1.json": ["run-1/events.jsonl", "run-1/manifest.json"] } });
	});

	it("links from the README only to runs the page carries", () => {
		const names = new Set(PAGES_RUNS.map((run) => run.name));
		const linked = [...readText("README.md").matchAll(/github\.io\/swarmtales\/#run=([\w.-]+)/g)].map((match) => match[1] ?? "");
		expect(linked.length).toBeGreaterThan(0);
		for (const name of linked) expect(names.has(name)).toBe(true);
	});
});
