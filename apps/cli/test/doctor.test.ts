// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `swt doctor`, offline: the environment as a record and the installed tree as folders under a temporary directory.
 * A key set under each of its names, none, a stale version of one line, an old Node, a clone of the repository and
 * an unknown `SWT_` name.
 */
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { doctor, type DoctorCheck } from "../src/doctor.ts";
import { main } from "../src/main.ts";

const OWN = fileURLToPath(new URL("../package.json", import.meta.url));
const KEY = `sk-${"d0".repeat(16)}`;

let root = "";
beforeAll(() => {
	root = mkdtempSync(join(tmpdir(), "swt-doctor-"));
});
afterAll(() => {
	rmSync(root, { recursive: true, force: true });
});

/** Writes a `package.json` into a new folder under the temporary directory. */
function pack(folder: string, fields: Readonly<Record<string, unknown>>): void {
	mkdirSync(join(root, folder), { recursive: true });
	writeFileSync(join(root, folder, "package.json"), JSON.stringify(fields));
}

/** An installed project: `swarmtales` with its `engines`, two packages of the platform line and one plugin. */
function project(name: string, sdk: string): string {
	pack(`${name}/node_modules/swarmtales`, { name: "swarmtales", version: "1.0.0", engines: { node: ">=22.19" } });
	pack(`${name}/node_modules/@swarmtales/sdk`, { name: "@swarmtales/sdk", version: sdk });
	pack(`${name}/node_modules/@swarmtales/mechanic-ledger`, { name: "@swarmtales/mechanic-ledger", version: "1.0.0" });
	pack(`${name}/node_modules/@swarmtales/mechanic-whispers`, { name: "@swarmtales/mechanic-whispers", version: "0.1.0" });
	mkdirSync(join(root, name, "games"), { recursive: true });
	return join(root, name, "games");
}

const lines = (checks: readonly DoctorCheck[], check: string): readonly string[] => checks.filter((item) => item.check === check).map((item) => `${item.status} ${item.detail}`);
const check = (cwd: string, node: string, env: Readonly<Record<string, string>> = {}): readonly DoctorCheck[] => doctor({ cwd, node, env, own: OWN });

describe("swt doctor on an installed tree", () => {
	it("checks Node against the engines of the installed swarmtales, and each version line for its step", () => {
		const cwd = project("fresh", "1.0.0");
		const checks = check(cwd, "v22.23.4");
		expect(lines(checks, "node")).toEqual(['ok Node v22.23.4 against the engines ">=22.19" of the installed swarmtales']);
		expect(lines(checks, "versions")).toEqual(["ok the platform line: 3 packages at 1.0.0", "ok the plugins line: 1 packages at 0.1.0"]);
		expect(lines(checks, "swt")).toEqual(["ok this swt is @swarmtales/cli 0.0.0"]);
		expect(checks.every((item) => item.status !== "fail")).toBe(true);
	});

	it("fails an old Node, and warns about a stale version of the platform line", () => {
		const cwd = project("stale", "0.9.0");
		expect(lines(check(cwd, "v22.18.9"), "node")).toEqual(['fail Node v22.18.9 against the engines ">=22.19" of the installed swarmtales']);
		expect(lines(check(cwd, "v20.19.0"), "node")[0]).toMatch(/^fail /);
		expect(lines(check(cwd, "v23.0.0"), "node")[0]).toMatch(/^ok /);
		expect(lines(check(cwd, "v22.23.4"), "versions")).toEqual(["warn the platform line is not in step: swarmtales 1.0.0, @swarmtales/mechanic-ledger 1.0.0, @swarmtales/sdk 0.9.0", "ok the plugins line: 1 packages at 0.1.0"]);
	});

	it("reads the dependencies that pnpm puts beside the real folder of swarmtales", () => {
		pack("pnpm/node_modules/.pnpm/swarmtales@1.0.0/node_modules/swarmtales", { name: "swarmtales", version: "1.0.0", engines: { node: ">=22.19" } });
		pack("pnpm/node_modules/.pnpm/swarmtales@1.0.0/node_modules/@swarmtales/kernel", { name: "@swarmtales/kernel", version: "0.9.0" });
		symlinkSync(join(root, "pnpm/node_modules/.pnpm/swarmtales@1.0.0/node_modules/swarmtales"), join(root, "pnpm/node_modules/swarmtales"));
		expect(lines(check(join(root, "pnpm"), "v22.23.4"), "versions")).toEqual(["warn the platform line is not in step: swarmtales 1.0.0, @swarmtales/kernel 0.9.0"]);
	});

	it("warns when it finds neither a clone nor an installed swarmtales, and still exits with 0", async () => {
		mkdirSync(join(root, "empty"));
		const checks = check(join(root, "empty"), "v22.23.4");
		expect(lines(checks, "node")).toEqual([`warn Node v22.23.4, not checked: no clone of the repository and no installed swarmtales from ${join(root, "empty")}`]);
		expect(lines(checks, "versions")).toEqual([`warn no installed swarmtales or @swarmtales/* package in ${join(root, "empty", "node_modules")}`]);
		const out: string[] = [];
		expect(await main(["doctor"], { cwd: join(root, "empty"), now: () => new Date(0), out: (line) => out.push(line), err: (line) => out.push(line), env: {}, node: "v22.23.4" })).toBe(0);
		expect(out[0]).toMatch(/^warn {2}node {12}Node v22\.23\.4, not checked/);
	});
});

describe("swt doctor in a clone of the repository", () => {
	it("checks the major of the clone's .node-version: the same ok, an older one fail, a newer one warn", () => {
		pack("clone", { name: "swarmtales-workspace", version: "0.0.0" });
		writeFileSync(join(root, "clone", ".node-version"), "22.23.4\n");
		mkdirSync(join(root, "clone", "games", "hello"), { recursive: true });
		const cwd = join(root, "clone", "games", "hello");
		expect(lines(check(cwd, "v22.12.0"), "node")).toEqual(["ok Node v22.12.0 against the clone's `.node-version` 22.23.4 (major 22)"]);
		expect(lines(check(cwd, "v20.19.0"), "node")[0]).toMatch(/^fail /);
		expect(lines(check(cwd, "v24.1.0"), "node")[0]).toMatch(/^warn /);
		// A `.node-version` of the user's own project is not the clone's: it is not read.
		writeFileSync(join(root, "empty", ".node-version"), "20\n");
		expect(lines(check(join(root, "empty"), "v22.23.4"), "node")[0]).toMatch(/^warn Node v22\.23\.4, not checked/);
	});

	it("reads the repository it runs in", () => {
		const repository = fileURLToPath(new URL("../../..", import.meta.url));
		const checks = check(repository, process.version);
		expect(lines(checks, "node")[0]).toMatch(/against the clone's `\.node-version` 22\./);
		expect(lines(checks, "versions")[0]).toMatch(/^ok the platform line: \d+ packages at 0\.0\.0$/);
	});
});

describe("swt doctor on the keys and the SWT_ names", () => {
	it("names the variable a key is read from, under each name, and never its value", () => {
		const cwd = project("keys", "1.0.0");
		expect(lines(check(cwd, "v22.23.4", { SWT_ANTHROPIC_API_KEY: KEY }), "key anthropic")).toEqual(["ok a key is set in SWT_ANTHROPIC_API_KEY"]);
		expect(lines(check(cwd, "v22.23.4", { ARENA_ANTHROPIC_API_KEY: KEY }), "key anthropic")).toEqual(["ok a key is set in ARENA_ANTHROPIC_API_KEY"]);
		expect(lines(check(cwd, "v22.23.4", { SWT_OPENROUTER_API_KEY: KEY, OPENROUTER_API_KEY: KEY }), "key openrouter")).toEqual(["ok a key is set in SWT_OPENROUTER_API_KEY; OPENROUTER_API_KEY is set too and not read"]);
		expect(lines(check(cwd, "v22.23.4", { OPENROUTER_API_KEY: "short" }), "key openrouter")).toEqual(["fail OPENROUTER_API_KEY is set and is no key: SWT-X006"]);
		const none = check(cwd, "v22.23.4", { SWT_ANTHROPIC_API_KEY: "" });
		expect([...lines(none, "key anthropic"), ...lines(none, "key openrouter")]).toEqual([
			"warn no key: none of SWT_ANTHROPIC_API_KEY, ARENA_ANTHROPIC_API_KEY is set; a fake run needs none",
			"warn no key: none of SWT_OPENROUTER_API_KEY, OPENROUTER_API_KEY is set; a fake run needs none",
		]);
	});

	it("lists the SWT_ names it reads and warns about one it does not know", () => {
		const cwd = project("names", "1.0.0");
		expect(lines(check(cwd, "v22.23.4"), "env")).toEqual(["ok none of SWT_PROVIDER, SWT_MODEL is set"]);
		expect(lines(check(cwd, "v22.23.4", { SWT_MODEL: "haiku", SWT_MODLE: "haiku", OTHER: "x" }), "env")).toEqual(["ok set: SWT_MODEL", "warn SWT_MODLE is set, and swt reads no variable of that name"]);
	});

	it("exits with 1 on a fail, prints --json, and refuses an argument", async () => {
		const cwd = project("exit", "1.0.0");
		const out: string[] = [];
		const io = { cwd, now: () => new Date(0), out: (line: string) => out.push(line), err: (line: string) => out.push(line), env: { SWT_ANTHROPIC_API_KEY: KEY }, node: "v22.1.0" };
		expect(await main(["doctor"], io)).toBe(1);
		expect(out.join("\n")).not.toContain(KEY);
		out.length = 0;
		expect(await main(["doctor", "--json"], { ...io, node: "v22.23.4" })).toBe(0);
		expect(JSON.parse(out[0] ?? "")).toMatchObject({ checks: ["node", "swt", "versions", "versions", "key anthropic", "key openrouter", "env"].map((name) => ({ check: name })) });
		out.length = 0;
		expect(await main(["doctor", "now"], io)).toBe(1);
		expect(out.join("\n")).toContain("SWT-C003");
	});
});
