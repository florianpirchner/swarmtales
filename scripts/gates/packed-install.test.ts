// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The packed-install gate (`13-m6-spec.md` section 2, decision A120, issue M6-08): the case of a person who installs
 * `swarmtales` outside the repository, without the registry. It packs the published packages that the case needs
 * (the closure of `swarmtales` and of the packages the copied project code imports) and the two fixture plugins in
 * plain JavaScript into a folder outside the work tree, writes a project there with a lockfile taken from the
 * workspace's (`fixtures/outside/lockfile.ts`), installs it with `--frozen-lockfile --offline`, and plays through
 * the installed `swt` bin, without `--conditions development`: the Hello Game, samples 5 and 6, a game file and a
 * YAML game that use the installed mechanic and Director, and the planted undeclared call (A37); in the project made a
 * git repository, the installed `swt` asks git nothing and records each plugin under its package's version (issue
 * M6-34, lessons P502 and P503). It checks every
 * packed tarball of the release (6.2). It needs the build, so `pnpm test` does not collect it (`vitest.config.ts`);
 * `pnpm check:pack` runs it in lane 0 after the build (`scripts/lib/check-run.ts`).
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { REPO_ROOT } from "../lib/files.ts";
import { CLONE_ONLY } from "../release/check.ts";
import { readList } from "../release/list.ts";
import { readTarball, tarballProblems, unpackInto, type TarballExpectation, type TarballFiles } from "../release/tarball.ts";
import { importerDependencies, outsideLockfile, sections, type PackedPackage } from "./fixtures/outside/lockfile.ts";

const FIXTURES = join(REPO_ROOT, "scripts", "gates", "fixtures", "outside");
/** The project code copied unchanged: the Hello Game and samples 5 and 6, each with the folders its game imports. */
const COPIED: Readonly<Record<string, readonly string[]>> = { "games/hello": ["game.ts"], "samples/own-mechanic": ["game.ts", "src"], "samples/own-director": ["game.ts", "src", "hands"] };
const PLUGINS = ["mechanic", "director"] as const;
const SLOW = 240_000;

/** What one `swt` command did. */
interface Done { readonly code: number; readonly out: string; readonly err: string }

/** The facts of a play: the exit code, and the last event of its log. */
interface Play { readonly code: number; readonly err: string; readonly last: unknown }

/**
 * The problems of the installed bin: `node_modules/.bin/swt` of the project, which the umbrella declares (6.1).
 *
 * @param project - The project folder.
 * @returns One line per problem.
 */
function binProblems(project: string): readonly string[] {
	return existsSync(join(project, "node_modules", ".bin", "swt")) ? [] : ["node_modules/.bin/swt is missing: the installed swarmtales declares no bin"];
}

/**
 * The problems of the planted call: the run must end with `SWT-M026`, exit 2 (the run ended with the reason `error`,
 * `docs/reference/cli.md`; errata K?), and a log whose last line is an `error` end.
 *
 * @param play - What the planted run did.
 * @returns One line per problem.
 */
function plantedProblems(play: Play): readonly string[] {
	const last = typeof play.last === "object" && play.last !== null ? play.last : {};
	const ended = Reflect.get(last, "type") === "run_ended" && JSON.stringify(Reflect.get(last, "payload") ?? {}).includes('"error"');
	return [
		...(play.code === 2 ? [] : [`the planted call exited ${String(play.code)}, not 2`]),
		...(play.err.includes("SWT-M026") ? [] : ["the planted call was not refused with SWT-M026"]),
		...(ended ? [] : ["the log of the planted call does not end with an error end"]),
	];
}

/** The last event of a run's log, or undefined. */
function lastEvent(run: string): unknown {
	const file = join(run, "events.jsonl");
	if (!existsSync(file)) return undefined;
	const line = readFileSync(file, "utf8").trim().split("\n").at(-1) ?? "null";
	return JSON.parse(line);
}

let temp = "";
const at = (...parts: readonly string[]): string => join(temp, ...parts);

/** Runs a command; its exit code and output. */
function exec(command: string, args: readonly string[], cwd: string, env: NodeJS.ProcessEnv = process.env): Done {
	const done = spawnSync(command, args, { cwd, env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
	return { code: done.status ?? -1, out: done.stdout, err: done.stderr };
}

/** Runs a command that must pass. */
function must(command: string, args: readonly string[], cwd: string): string {
	const done = exec(command, args, cwd);
	if (done.code !== 0) throw new Error(`packed install: \`${[command, ...args].join(" ")}\` failed in ${cwd}:\n${done.err || done.out}`);
	return done.out;
}

/** The installed `swt` of the project, with no development condition and no key in the environment. */
const swt = (...args: readonly string[]): Done => exec(join(at("project"), "node_modules", ".bin", "swt"), args, at("project"), { PATH: process.env.PATH ?? "", HOME: at("home") });

const folderOf = new Map(readList(REPO_ROOT).map((entry) => [entry.name, entry.folder]));
const Packed = Type.Object(
	{ name: Type.String({ description: "The package name" }), version: Type.String({ description: "Its version" }), dependencies: Type.Optional(Type.Record(Type.String(), Type.String(), { description: "Name to version" })) },
	{ description: "The fields of a packed package.json that the gate reads" },
);
const lock = readFileSync(join(REPO_ROOT, "pnpm-lock.yaml"), "utf8");
const importers = sections(lock).get("importers") ?? new Map<string, readonly string[]>();
const resolvedOf = (folder: string): Readonly<Record<string, string>> => importerDependencies(importers.get(folder) ?? []);

/** The dependencies of the project: those of each copied package, `swarmtales`, `typebox` and the two plugins. */
function directDependencies(): Readonly<Record<string, string>> {
	const own = Object.fromEntries(Object.keys(COPIED).flatMap((folder) => Object.entries(resolvedOf(folder))));
	return { ...own, swarmtales: "", typebox: own.typebox ?? "", "@outside/mechanic-beacon": "", "@outside/director-herald": "" };
}

/** The listed packages that the direct dependencies reach through the workspace. */
function packedClosure(direct: readonly string[]): readonly string[] {
	const found = new Set<string>();
	const queue = direct.filter((name) => folderOf.has(name));
	for (let name = queue.shift(); name !== undefined; name = queue.shift()) {
		if (found.has(name)) continue;
		found.add(name);
		queue.push(...Object.keys(resolvedOf(folderOf.get(name) ?? "")).filter((dependency) => folderOf.has(dependency)));
	}
	return [...found].sort();
}

/** Packs the closure and the two plugins into `packed/`; every packed package by its name. */
function pack(names: readonly string[]): readonly PackedPackage[] {
	mkdirSync(at("packed"));
	must("pnpm", ["-r", ...names.flatMap((name) => ["--filter", name]), "pack", "--pack-destination", at("packed")], REPO_ROOT);
	for (const plugin of PLUGINS) {
		mkdirSync(at("plugins", plugin), { recursive: true });
		copyFileSync(join(FIXTURES, plugin, "package.template.json"), at("plugins", plugin, "package.json"));
		// Kept as `.js.fixture` in the repository, so that no tsconfig and no lint pass takes it for a file of the workspace.
		copyFileSync(join(FIXTURES, plugin, "index.js.fixture"), at("plugins", plugin, "index.js"));
		must("pnpm", ["pack", "--pack-destination", at("packed")], at("plugins", plugin));
	}
	return readdirSync(at("packed")).map((file) => {
		const manifest = Value.Parse(Packed, JSON.parse(readTarball(at("packed", file)).get("package.json")?.toString("utf8") ?? "{}"));
		const folder = folderOf.get(manifest.name);
		return { name: manifest.name, version: manifest.version, ref: `file:../packed/${file}`, tarball: at("packed", file), dependencies: folder === undefined ? (manifest.dependencies ?? {}) : resolvedOf(folder) };
	});
}

/** Writes the project with its lockfile and installs it offline. */
function install(packed: readonly PackedPackage[], direct: Readonly<Record<string, string>>): void {
	const refs = Object.fromEntries(packed.map((entry) => [entry.name, entry.ref]));
	const dependencies = Object.fromEntries(Object.entries(direct).map(([name, version]) => [name, refs[name] ?? version]));
	// A packed `workspace:*` names a version that no registry holds, so every packed package is mapped to its tarball.
	const overrides = refs;
	mkdirSync(at("project"));
	mkdirSync(at("home"));
	writeFileSync(at("project", "package.json"), JSON.stringify({ name: "outside-project", private: true, type: "module", dependencies, pnpm: { overrides } }, null, "\t"));
	writeFileSync(at("project", "pnpm-lock.yaml"), outsideLockfile(lock, packed, direct));
	for (const [folder, parts] of Object.entries(COPIED)) for (const part of parts) cpSync(join(REPO_ROOT, folder, part), at("project", folder.split("/")[1] ?? folder, part), { recursive: true });
	cpSync(join(FIXTURES, "project"), at("project", "outside"), { recursive: true });
	renameSync(at("project", "outside", "game.ts.fixture"), at("project", "outside", "game.ts"));
	const store = must("pnpm", ["store", "path"], REPO_ROOT).trim();
	// The store of the workspace's frozen install holds the tarballs; an empty cache holds no metadata of the registry, as on a
	// fresh runner (the first test of 2.1): the lockfile leaves nothing to resolve.
	must("pnpm", ["install", "--frozen-lockfile", "--offline", "--ignore-scripts", "--store-dir", store, "--cache-dir", at("cache")], at("project"));
}

/** Plays a game fake, verifies its log and replays it; what each command did. */
function playVerifyReplay(game: string, run: string, ...flags: readonly string[]): readonly Done[] {
	return [swt("run", game, "--fake", ...flags), swt("log", "verify", `runs/${run}`), swt("replay", `runs/${run}`, "--game", game)];
}

let packed: readonly PackedPackage[] = [];

beforeAll(() => {
	temp = mkdtempSync(join(tmpdir(), "swt-packed-"));
	const direct = directDependencies();
	packed = pack(packedClosure(Object.keys(direct)));
	install(packed, direct);
}, SLOW);
afterAll(() => {
	rmSync(temp, { recursive: true, force: true });
});

describe("the packed install, outside the repository", () => {
	it("installs into a folder outside the work tree, with the swt bin of the installed swarmtales", () => {
		expect(relative(REPO_ROOT, temp).startsWith("..")).toBe(true);
		expect(binProblems(at("project"))).toEqual([]);
		expect(packed.length).toBeGreaterThan(20);
	});

	it("plays, verifies and replays the Hello Game and samples 5 and 6, each with its committed outcome", () => {
		const cases = [
			{ game: "hello/game.ts", run: "hello-game-001", flags: [], output: undefined },
			{ game: "own-mechanic/game.ts", run: "own-mechanic-001", flags: [], output: "samples/own-mechanic/output.txt" },
			{ game: "own-director/game.ts", run: "own-director-001", flags: ["--hand", "own-director/hands/amend.jsonl"], output: "samples/own-director/output.txt" },
		];
		for (const { game, run, flags, output } of cases) {
			const done = playVerifyReplay(game, run, ...flags);
			expect(done.map((one) => [one.code, one.err])).toEqual([[0, ""], [0, ""], [0, ""]]);
			if (output !== undefined) expect(done[0]?.out.startsWith(readFileSync(join(REPO_ROOT, output), "utf8"))).toBe(true);
		}
	});

	it("plays a game file and a YAML game with the installed JavaScript mechanic and Director", () => {
		for (const [game, run] of [["outside/game.ts", "outside-beacon-001"], ["outside/game.yaml", "outside-beacon-data-001"]] as const) {
			const done = playVerifyReplay(game, run);
			expect(done.map((one) => [one.code, one.err])).toEqual([[0, ""], [0, ""], [0, ""]]);
			expect(readFileSync(at("project", "runs", run, "events.jsonl"), "utf8")).toContain('"director:herald"');
		}
	});

	it("refuses the planted call of a service the head does not declare", () => {
		const done = swt("run", "outside/planted.yaml", "--fake");
		expect(plantedProblems({ code: done.code, err: done.err, last: lastEvent(at("project", "runs", "outside-planted-001")) }), done.err).toEqual([]);
	});

	it("asks no git about the project, also when it is a git repository, and records each plugin's version (P502, P503)", () => {
		const commit = ["-c", "user.name=t", "-c", "user.email=t@example.test", "-c", "commit.gpgsign=false", "commit", "--quiet", "--no-verify", "-m", "the user's commit"];
		for (const args of [["init", "--quiet"], ["add", "package.json"], commit]) must("git", args, at("project"));
		const cli = createRequire(realpathSync(at("project", "node_modules", "swarmtales", "package.json"))).resolve("@swarmtales/cli");
		const tree = must(process.execPath, ["--input-type=module", "-e", "const { readSourceTree } = await import(process.argv[1]); console.log(JSON.stringify(readSourceTree()));", pathToFileURL(cli).href], at("project"));
		expect(JSON.parse(tree)).toEqual({ installed: true });
		const plugins: unknown = Reflect.get(Object(JSON.parse(readFileSync(at("project", "runs", "hello-game-001", "manifest.json"), "utf8"))), "plugins");
		const version = (name: string): string | undefined => packed.find((entry) => entry.name === name)?.version;
		expect(plugins).toMatchObject([{ id: "grid", version: version("@swarmtales/mechanic-grid") }, { id: "roster", version: version("@swarmtales/sdk") }]);
	});

	it("checks every packed tarball of the release by 6.2", () => {
		const expected: TarballExpectation = { licence: readFileSync(join(REPO_ROOT, "LICENSE"), "utf8"), cloneOnly: CLONE_ONLY, localPaths: [REPO_ROOT] };
		const problems = packed.filter((entry) => folderOf.has(entry.name)).flatMap((entry) => tarballProblems(readTarball(entry.tarball), expected).map((problem) => `${entry.name}: ${problem}`));
		expect(problems).toEqual([]);
		// The leak scan of 6.2, by the installed `swt`, with a canary key that no tarball may hold.
		for (const [index, entry] of packed.filter((one) => folderOf.has(one.name)).entries()) unpackInto(readTarball(entry.tarball), at("unpacked", String(index)));
		const scan = exec(join(at("project"), "node_modules", ".bin", "swt"), ["scan", at("unpacked")], at("project"), { PATH: process.env.PATH ?? "", HOME: at("home"), SWT_ANTHROPIC_API_KEY: "sk-ant-canary-packed-install-0123456789" });
		expect([scan.code, scan.err]).toEqual([0, ""]);
	});
});

describe("the checks of the gate fail where they must", () => {
	const prepared = (name: string): string => {
		const folder = at("prepared", name);
		mkdirSync(folder, { recursive: true });
		return folder;
	};

	it("fails on a project without the swt bin", () => {
		const project = prepared("no-bin");
		mkdirSync(join(project, "node_modules", ".bin"), { recursive: true });
		expect(binProblems(project)).toEqual(["node_modules/.bin/swt is missing: the installed swarmtales declares no bin"]);
	});

	it("fails on an undeclared call that is not refused", () => {
		const run = prepared("not-refused");
		writeFileSync(join(run, "events.jsonl"), `${JSON.stringify({ type: "run_ended", payload: { reason: "ticks" } })}\n`);
		expect(plantedProblems({ code: 0, err: "", last: lastEvent(run) })).toEqual(["the planted call exited 0, not 2", "the planted call was not refused with SWT-M026", "the log of the planted call does not end with an error end"]);
	});

	it("fails on a tarball without LICENSE", () => {
		const sdk = packed.find((entry) => entry.name === "@swarmtales/sdk");
		const files: TarballFiles = new Map([...readTarball(sdk?.tarball ?? "")].filter(([path]) => path !== "dist/LICENSE"));
		const expected: TarballExpectation = { licence: readFileSync(join(REPO_ROOT, "LICENSE"), "utf8"), cloneOnly: CLONE_ONLY, localPaths: [REPO_ROOT] };
		expect(tarballProblems(files, expected)).toContain("dist/LICENSE is missing or not the project's LICENSE");
	});
});
