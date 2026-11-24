// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The switch of `main`, prepared (M6-20, `13-m6-spec.md` 7.3 and 7.4), on a fixture remote: a bare repository cloned
 * from a fixture work clone, whose states are made by `update-ref` inside the bare repository itself (6.3), so the
 * test sends nothing to any remote. The owed tags are read from this repository.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { REPO_ROOT } from "../../lib/files.ts";
import { checkSwitch, type OpenPull, parsePulls, type SwitchOptions, verifySwitch } from "../switch-main.ts";
import { heldTags, owedTags, runtimeTags } from "../tags.ts";

let folder = "";
let work = "";
let bare = "";
const ids = { legacy: "", root: "", target: "", develop: "", red: "", stray: "" };

function git(cwd: string, ...args: string[]): string {
	return execFileSync("git", ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.com", ...args], { cwd, encoding: "utf8" }).trim();
}

/** One commit on the work clone's current branch, with a file of its own; returns its id. */
function commit(message: string): string {
	writeFileSync(join(work, `${String(Math.random())}.txt`), message);
	git(work, "add", "-A");
	git(work, "commit", "-q", "-m", message);
	return git(work, "rev-parse", "HEAD");
}

/** Sets (or, with no commit, deletes) a ref inside the bare repository. */
function ref(name: string, id?: string): void {
	if (id === undefined) git(bare, "update-ref", "-d", name);
	else git(bare, "update-ref", name, id);
}

/** Deletes every ref of the bare repository that is not a branch of the clone. */
function clear(): void {
	for (const name of ["refs/heads/develop", "refs/tags/v0-final", "refs/tags/runtime-r3"]) if (git(bare, "for-each-ref", name) !== "") ref(name);
}

/**
 * Puts the remote into one state, whatever the test before left: `legacy` at the old platform and `rewrite/develop`
 * at its head always; `main` at the old platform before the switch and at the target after it.
 */
function remote(state: "tag missing" | "ready" | "switched"): void {
	clear();
	ref("refs/heads/legacy", ids.legacy);
	ref("refs/heads/rewrite/develop", ids.develop);
	ref("refs/heads/main", state === "switched" ? ids.target : ids.legacy);
	if (state !== "tag missing") ref("refs/tags/v0-final", ids.legacy);
	if (state === "switched") ref("refs/heads/develop", ids.develop);
}

const options = (pulls: readonly OpenPull[] = [], target = ids.target): SwitchOptions => ({
	root: work,
	remote: bare,
	target,
	pulls: () => pulls,
	legacy: ids.legacy,
	rewriteRoot: ids.root,
	tags: [
		{ name: "v0-final", commit: ids.legacy, source: "fixture" },
		{ name: "runtime-r3", commit: ids.root, source: "fixture" },
		{ name: "milestone-m5", commit: ids.target, source: "fixture" },
	],
});

/** True when a printed line holds the part; the commands are matched without their verbs, which only the owner runs. */
const has = (lines: readonly string[], part: string): boolean => lines.some((line) => line.includes(part));

const lease = (): string => `--force-with-lease=main:${ids.legacy}`;

beforeAll(() => {
	folder = mkdtempSync(join(tmpdir(), "swt-switch-main-test-"));
	work = join(folder, "work");
	bare = join(folder, "remote.git");
	git(folder, "init", "-q", "-b", "legacy", work);
	ids.legacy = commit("the old platform");
	git(work, "checkout", "-q", "--orphan", "rewrite/develop");
	ids.root = commit("the root of the rewrite");
	ids.target = commit("M5 closed\n\npnpm check: green\n");
	ids.develop = commit("M6-01 after the close");
	ids.red = ids.develop;
	git(work, "checkout", "-q", "--orphan", "stray");
	ids.stray = commit("unrelated\n\npnpm check: green\n");
	git(work, "checkout", "-q", "rewrite/develop");
	git(folder, "clone", "-q", "--bare", work, bare);
});

afterAll(() => {
	rmSync(folder, { recursive: true, force: true });
});

describe("the switch of main, on a fixture remote", () => {
	it("stops with \"push the tag first\" while v0-final is not on the remote, and prints that push alone", () => {
		remote("tag missing");
		const result = checkSwitch(options());
		expect(result.state).toBe("tag missing");
		expect(result.problems).toEqual(["push the tag first: v0-final is not on the remote"]);
		expect(has(result.lines, `-a v0-final ${ids.legacy} -m "v0-final"`)).toBe(true);
		expect(has(result.lines, "origin refs/tags/v0-final")).toBe(true);
		expect(result.lines.join("\n")).not.toContain("--force-with-lease");
	});

	it("is ready with the tag on the remote, and prints the tags, the push with its lease, develop and the default branch in order", () => {
		remote("ready");
		const result = checkSwitch(options());
		expect(result.problems).toEqual([]);
		expect(result.state).toBe("ready");
		const lines = result.lines;
		const at = (part: string): number => lines.findIndex((line) => line.includes(part));
		expect(has(lines, `-a runtime-r3 ${ids.root} -m "runtime-r3"`)).toBe(true);
		expect(has(lines, "origin refs/tags/v0-final")).toBe(false);
		expect(has(lines, `origin ${ids.target}:refs/heads/main ${lease()}`)).toBe(true);
		expect(at("refs/tags/milestone-m5")).toBeLessThan(at(lease()));
		expect(at(lease())).toBeLessThan(at("rewrite/develop:refs/heads/develop"));
		expect(at("rewrite/develop:refs/heads/develop")).toBeLessThan(at("--default-branch main"));
		expect(at("# O4")).toBeGreaterThan(at("--default-branch main"));
	});

	it("retargets every open pull request against main to legacy before the push, and stops when they cannot be read", () => {
		remote("ready");
		const result = checkSwitch(options([{ number: 7, title: "Old work" }, { number: 9, title: "More" }]));
		expect(result.state).toBe("ready");
		const at = (part: string): number => result.lines.findIndex((line) => line.includes(part));
		expect(at("gh pr edit 7 --repo florianpirchner/swarmtales --base legacy")).toBeGreaterThan(-1);
		expect(at("gh pr edit 9 ")).toBeLessThan(at(lease()));
		const unread = checkSwitch({ ...options(), pulls: () => undefined });
		expect(unread.state).toBe("blocked");
		expect(unread.problems).toEqual(["the open pull requests against main cannot be read; retarget them to legacy before the push"]);
	});

	it("is blocked on a target outside the rewrite, a target without a green check, a moved main and a tag at another commit", () => {
		remote("ready");
		expect(checkSwitch(options([], ids.stray)).problems).toEqual([`the target ${ids.stray.slice(0, 8)} does not descend from rewrite/root ${ids.root.slice(0, 8)}`]);
		expect(checkSwitch(options([], ids.red)).problems).toEqual([`the target ${ids.red.slice(0, 8)} records no green check ("pnpm check: green" in its message)`]);
		ref("refs/heads/main", ids.develop);
		ref("refs/tags/runtime-r3", ids.target);
		expect(checkSwitch(options()).problems).toEqual([
			`main is at ${ids.develop.slice(0, 8)} on the remote, neither the old platform nor the target; the lease would refuse`,
			`runtime-r3: on the remote at ${ids.target.slice(0, 8)}, owed at ${ids.root.slice(0, 8)}`,
		]);
	});

	it("verifies the switch: fails before it, passes after it, and fails when legacy moved", () => {
		remote("ready");
		expect(verifySwitch(options()).problems).toEqual([
			`main is at ${ids.legacy.slice(0, 8)} on the remote, not at ${ids.target.slice(0, 8)}`,
			`develop is at nothing on the remote, not at ${ids.develop.slice(0, 8)}`,
		]);
		remote("switched");
		expect(checkSwitch(options()).state).toBe("switched");
		expect(verifySwitch(options())).toMatchObject({ state: "switched", problems: [] });
		ref("refs/heads/legacy", ids.develop);
		expect(verifySwitch(options()).problems).toEqual([`legacy is at ${ids.develop.slice(0, 8)} on the remote, not at ${ids.legacy.slice(0, 8)}`]);
	});

	it("reads only lists of pull requests from the API's answer", () => {
		expect(parsePulls('[{"number":3,"title":"t","head":{"ref":"x"}}]')).toEqual([{ number: 3, title: "t" }]);
		expect(parsePulls('{"message":"Not Found"}')).toBeUndefined();
		expect(parsePulls("not json")).toBeUndefined();
	});
});

describe("the owed tags of this repository (7.4)", () => {
	it("names runtime-r3 at 9d3ba515 and every revision up to the kernel's, each commit in the clone", () => {
		const runtime = runtimeTags(REPO_ROOT);
		expect(runtime.problems).toEqual([]);
		expect(runtime.tags.map((tag) => `${tag.name} ${tag.commit.slice(0, 7)}`)).toEqual(["runtime-r3 9d3ba51", "runtime-r4 b158a5b", "runtime-r5 6d1a685", "runtime-r6 390448d", "runtime-r7 d022725", "runtime-r8 2e9d969"]);
		const owed = owedTags(REPO_ROOT);
		expect(owed.problems).toEqual([]);
		expect(owed.tags.filter((tag) => tag.optional !== true).map((tag) => tag.name)).toEqual(["v0-final", "runtime-r3", "runtime-r4", "runtime-r5", "runtime-r6", "runtime-r7", "runtime-r8", "milestone-m1", "milestone-m2", "milestone-m3", "milestone-m4", "milestone-m5"]);
	});

	it("leaves out an optional tag whose commit the clone does not hold, and still names a missing owed one (A159)", () => {
		const optional = { name: "runs/absent", commit: "0000000000000000000000000000000000000001", source: "test", optional: true };
		const owed = { name: "runtime-r99", commit: "0000000000000000000000000000000000000002", source: "test" };
		const held = heldTags(REPO_ROOT, [optional, owed]);
		expect(held.tags.map((tag) => tag.name)).toEqual(["runtime-r99"]);
		expect(held.problems).toEqual([expect.stringContaining("runtime-r99: the clone holds no commit")]);
	});

	it("prints runtime-r3 at 9d3ba515 for the owner when the remote lacks it", () => {
		const real: SwitchOptions = { root: REPO_ROOT, remote: bare, target: "4604a127", pulls: () => [], legacy: ids.legacy, tags: owedTags(REPO_ROOT).tags };
		remote("ready");
		const result = checkSwitch(real);
		expect(result.problems).toEqual([]);
		expect(result.lines).toContain("# runtime-r3 at 9d3ba5159a120d18c47487471d0f26c4592041ee: docs/RUNTIME-REVISIONS.md");
		expect(has(result.lines, "origin refs/tags/runtime-r3")).toBe(true);
		expect(has(result.lines, `origin 4604a127c5740fe7386515b0de917d320843a565:refs/heads/main ${lease()}`)).toBe(true);
	});
});
