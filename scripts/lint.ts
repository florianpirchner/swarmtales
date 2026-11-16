// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `pnpm lint`: the typecheck and ESLint in one pass (decision A110, issue M5-100). Each project of the root
 * `tsconfig.json` (its references, followed to the end) is built as `tsc -b` builds it, with the TypeScript solution
 * builder: the same diagnostics, the same `dist-types` and `.tsbuildinfo`, so the build reuses them. ESLint then lints
 * the project's own files from that same program (`parserOptions.programs`), so the typed rules read the types the
 * typecheck has computed instead of checking every file a second time (lint's second type check, errata J299). A
 * project types against the declarations of its references, as in `tsc -b`, not against their sources.
 *
 * `PARALLEL` worker processes, each in a 4 GB heap, take the projects in the order of the references: a project
 * starts once every project it references is typed, so its dependents start while it is still linted. A project with
 * type errors fails, and its dependents are skipped, as `tsc -b` skips them. A file belongs to the project with the
 * deepest folder that lists it and is linted once; the files no project lists (the plain JavaScript and the build
 * configs) are linted in one more pass with the project service of `eslint.config.js`, where a TypeScript file that no
 * project lists fails as before. The pass fails when it finds no project or no file.
 * `--parallel <n>` sets the number of workers; `--times` prints the time of each project.
 */
import { fork, type ChildProcess } from "node:child_process";
import { join, relative, resolve } from "node:path";
import { isatty } from "node:tty";
import { ESLint } from "eslint";
import { Type, type Static } from "typebox";
import { Value } from "typebox/value";
import ts from "typescript";

/** The repository root. */
const ROOT = resolve(import.meta.dirname, "..");
/** Worker processes side by side, unless `--parallel <n>` says otherwise. */
const PARALLEL = 3;

/** One TypeScript project of the solution. */
export interface Project {
	/** The absolute path of its `tsconfig.json`. */
	readonly config: string;
	/** The configs of the projects it references. */
	readonly references: readonly string[];
	/** The absolute paths of the files it lists. */
	readonly files: readonly string[];
}

function parse(config: string): ts.ParsedCommandLine {
	const host: ts.ParseConfigFileHost = { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => undefined };
	const parsed = ts.getParsedCommandLineOfConfigFile(config, {}, host);
	if (parsed === undefined) throw new Error(`lint: cannot read the project ${config}`);
	return parsed;
}

/**
 * Reads the projects of a solution, every project after the projects it references.
 *
 * @param rootConfig - The `tsconfig.json` of the solution.
 * @returns The projects, the root last.
 */
export function readProjects(rootConfig: string): readonly Project[] {
	const seen = new Set<string>();
	const order: Project[] = [];
	const visit = (config: string): void => {
		if (seen.has(config)) return;
		seen.add(config);
		const parsed = parse(config);
		const references = (parsed.projectReferences ?? []).map((reference) => resolve(ts.resolveProjectReferencePath(reference)));
		references.forEach(visit);
		order.push({ config, references, files: parsed.fileNames.map((file) => resolve(file)) });
	};
	visit(resolve(rootConfig));
	return order;
}

/**
 * Gives every file to one project: the one with the deepest folder that lists it.
 *
 * @param projects - The projects.
 * @returns The files of each project by its config; a file listed by two projects is in one of them only.
 */
export function ownFiles(projects: readonly Project[]): ReadonlyMap<string, readonly string[]> {
	const owner = new Map<string, string>();
	const depth = (config: string): number => config.split("/").length;
	for (const project of [...projects].sort((left, right) => depth(right.config) - depth(left.config))) {
		for (const file of project.files) if (!owner.has(file)) owner.set(file, project.config);
	}
	const own = new Map<string, string[]>(projects.map((project) => [project.config, []]));
	for (const [file, config] of owner) own.get(config)?.push(file);
	return own;
}

/** A task for a worker: a project to type and lint, or (without `config`) the files no project lists. */
const Task = Type.Object(
	{
		config: Type.Optional(Type.String({ description: "The project's tsconfig.json; absent for the rest pass." })),
		files: Type.Array(Type.String(), { description: "The files to lint; for the rest pass, the files to leave out." }),
		pretty: Type.Boolean({ description: "Whether the output goes to a terminal." }),
	},
	{ description: "A task of the lint worker." },
);
type Task = Static<typeof Task>;

/** What a worker reports: a project typed, then its files linted. */
const Report = Type.Union(
	[
		Type.Object({ kind: Type.Literal("typed"), config: Type.String(), ok: Type.Boolean(), output: Type.String() }, { description: "A project typed." }),
		Type.Object(
			{
				kind: Type.Literal("linted"),
				config: Type.String(),
				errors: Type.Number(),
				warnings: Type.Number(),
				files: Type.Number(),
				output: Type.String(),
				seconds: Type.Number(),
				memoryMb: Type.Number(),
			},
			{ description: "A project's files linted." },
		),
	],
	{ description: "A report of the lint worker." },
);
type Report = Static<typeof Report>;

/** The parsed declaration files of `node_modules`, shared by the programs of one worker (they never change). */
const LIBRARY = new Map<string, ts.SourceFile>();

/**
 * Builds a program as `tsc -b` does, but reads each declaration file of `node_modules` once per process: a program
 * parses and binds about 6 MB of them (Node, TypeScript, Typebox, Vitest), about a second for every project.
 */
const createProgram: ts.CreateProgram<ts.EmitAndSemanticDiagnosticsBuilderProgram> = (rootNames, options, host, ...rest) => {
	if (host !== undefined) {
		const read = host.getSourceFile.bind(host);
		host.getSourceFile = (fileName, version, onError, fresh) => {
			if (!fileName.includes("/node_modules/") || fresh === true) return read(fileName, version, onError, fresh);
			const key = `${fileName}\0${JSON.stringify(version)}`;
			const file = LIBRARY.get(key) ?? read(fileName, version, onError, fresh);
			if (file !== undefined) LIBRARY.set(key, file);
			return file;
		};
	}
	return ts.createEmitAndSemanticDiagnosticsBuilderProgram(rootNames, options, host, ...rest);
};

/**
 * Types a project as `tsc -b` does and keeps its program.
 *
 * @param config - The project's `tsconfig.json`.
 * @param pretty - Whether the diagnostics are printed with colour and context.
 * @returns The program of the project, whether it has no type error, and the diagnostics as text.
 */
export function typecheck(config: string, pretty: boolean): { readonly program: ts.Program; readonly ok: boolean; readonly output: string } {
	const diagnostics: ts.Diagnostic[] = [];
	const built: ts.Program[] = [];
	const host = ts.createSolutionBuilderHost(ts.sys, createProgram, (diagnostic) => diagnostics.push(diagnostic), () => undefined, () => undefined);
	host.afterProgramEmitAndDiagnostics = (builder): void => {
		built.push(builder.getProgram());
	};
	const status = ts.createSolutionBuilder(host, [config], {}).build();
	// The project itself is built last; an up-to-date project builds nothing, so its program is made for lint alone.
	const program = built.at(-1) ?? freshProgram(config);
	const format: ts.FormatDiagnosticsHost = { getCanonicalFileName: (file) => file, getCurrentDirectory: () => ROOT, getNewLine: () => "\n" };
	const output = pretty ? ts.formatDiagnosticsWithColorAndContext(diagnostics, format) : ts.formatDiagnostics(diagnostics, format);
	const errors = diagnostics.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error).length;
	return { program, ok: status === ts.ExitStatus.Success && errors === 0, output };
}

function freshProgram(config: string): ts.Program {
	const parsed = parse(config);
	return ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options, projectReferences: parsed.projectReferences ?? [] });
}

/**
 * Lints files with ESLint and the repository's configuration.
 *
 * @param options - The ESLint options: the program of the files, or the files to leave out.
 * @param files - The files or patterns to lint.
 * @returns The counts and the output of the `stylish` formatter.
 */
export async function lintFiles(options: ESLint.Options, files: readonly string[]): Promise<{ errors: number; warnings: number; files: number; output: string }> {
	const eslint = new ESLint({ cwd: ROOT, ...options });
	const results = files.length === 0 ? [] : await eslint.lintFiles([...files]);
	const output = await (await eslint.loadFormatter("stylish")).format(results);
	const count = (key: "errorCount" | "fatalErrorCount" | "warningCount"): number => results.reduce((sum, result) => sum + result[key], 0);
	return { errors: count("errorCount") + count("fatalErrorCount"), warnings: count("warningCount"), files: results.length, output };
}

async function work(task: Task, send: (report: Report) => void): Promise<void> {
	const started = performance.now();
	const config = task.config ?? "";
	let options: ESLint.Options = { overrideConfig: { ignores: task.files.map((file) => relative(ROOT, file)) } };
	let patterns: readonly string[] = ["."];
	if (task.config !== undefined) {
		const typed = typecheck(task.config, task.pretty);
		send({ kind: "typed", config, ok: typed.ok, output: typed.output });
		const parserOptions = { programs: [typed.program], projectService: false, project: false };
		// A listed file that `eslint.config.js` ignores is left out, as `eslint .` leaves it out.
		options = { overrideConfig: { languageOptions: { parserOptions } }, warnIgnored: false };
		patterns = task.files;
	}
	const linted = await lintFiles(options, patterns);
	send({ kind: "linted", config, ...linted, seconds: (performance.now() - started) / 1000, memoryMb: process.memoryUsage().rss / 2 ** 20 });
	// The program is no longer needed: give its memory back before the next project.
	globalThis.gc?.();
}

function worker(): void {
	const send = (report: Report): void => {
		process.send?.(report);
	};
	process.on("message", (message: unknown) => {
		if (!Value.Check(Task, message)) throw new Error("lint: the worker got a message that is no task");
		void work(message, send).catch((error: unknown) => {
			console.error(error);
			process.exit(1);
		});
	});
}

/** The whole number after `--<name>`, at least 1; `fallback` without the flag. */
function option(name: string, fallback: number): number {
	const at = process.argv.indexOf(`--${name}`);
	const value = at === -1 ? fallback : Number(process.argv[at + 1]);
	if (!Number.isInteger(value) || value < 1) throw new Error(`lint: --${name} takes a whole number of at least 1, not "${process.argv[at + 1] ?? ""}"`);
	return value;
}

/** What the pass found so far. */
interface Tally {
	readonly typed: Set<string>;
	readonly failed: Set<string>;
	readonly skipped: Set<string>;
	errors: number;
	warnings: number;
	files: number;
	crashed: number;
}

/** The next project whose references are all typed, after skipping the ones that wait on a failed project. */
function nextReady(pending: Project[], tally: Tally): Project | undefined {
	for (const project of [...pending]) {
		if (project.references.some((reference) => tally.failed.has(reference) || tally.skipped.has(reference))) {
			tally.skipped.add(project.config);
			pending.splice(pending.indexOf(project), 1);
		}
	}
	const ready = pending.find((project) => project.references.every((reference) => tally.typed.has(reference)));
	if (ready !== undefined) pending.splice(pending.indexOf(ready), 1);
	return ready;
}

function record(report: Report, tally: Tally, times: boolean): void {
	if (report.output.trim() !== "") process.stdout.write(report.output.endsWith("\n") ? report.output : `${report.output}\n`);
	const name = report.config === "" ? "(files no project lists)" : relative(ROOT, report.config);
	if (report.kind === "typed") {
		(report.ok ? tally.typed : tally.failed).add(report.config);
		if (!report.ok) console.error(`lint: ${name} has type errors`);
		return;
	}
	tally.errors += report.errors;
	tally.warnings += report.warnings;
	tally.files += report.files;
	if (times) console.error(`lint: ${name} ${report.seconds.toFixed(1)} s, ${String(report.files)} file(s), ${report.memoryMb.toFixed(0)} MB`);
}

/** The workers and the projects they still have to take. */
interface Pool {
	readonly pending: Project[];
	readonly own: ReadonlyMap<string, readonly string[]>;
	readonly idle: ChildProcess[];
	readonly tally: Tally;
	readonly pretty: boolean;
	/** The rest pass, until a worker has taken it. */
	rest: Task | undefined;
	busy: number;
}

function nextTask(pool: Pool): Task | undefined {
	if (pool.idle.length === 0) return undefined;
	const { rest } = pool;
	pool.rest = undefined;
	if (rest !== undefined) return rest;
	const project = nextReady(pool.pending, pool.tally);
	return project === undefined ? undefined : { config: project.config, files: [...(pool.own.get(project.config) ?? [])], pretty: pool.pretty };
}

/** Gives the idle workers what is ready; true once nothing runs and nothing is left. */
function dispatch(pool: Pool): boolean {
	for (let task = nextTask(pool); task !== undefined; task = nextTask(pool)) {
		pool.busy += 1;
		pool.idle.pop()?.send(task);
	}
	if (pool.busy > 0) return false;
	// A project that never became ready (a cycle of references) did not run either.
	for (const project of pool.pending.splice(0)) pool.tally.skipped.add(project.config);
	for (const child of pool.idle) child.kill();
	return true;
}

function startWorker(pool: Pool, times: boolean, next: () => void): void {
	const child = fork(import.meta.filename, ["--worker"], { execArgv: ["--max-old-space-size=4096", "--expose-gc"] });
	child.on("message", (message: unknown) => {
		if (!Value.Check(Report, message)) throw new Error("lint: a worker sent a message that is no report");
		record(message, pool.tally, times);
		if (message.kind === "linted") {
			pool.busy -= 1;
			pool.idle.push(child);
		}
		next();
	});
	child.on("exit", (code) => {
		if (code === 0 || code === null) return;
		pool.tally.crashed += 1;
		pool.pending.length = 0;
		pool.busy -= 1;
		next();
	});
	pool.idle.push(child);
}

function main(): Promise<Tally> {
	const parallel = option("parallel", PARALLEL);
	const times = process.argv.includes("--times");
	const projects = readProjects(join(ROOT, "tsconfig.json"));
	const own = ownFiles(projects);
	const tally: Tally = { typed: new Set(), failed: new Set(), skipped: new Set(), errors: 0, warnings: 0, files: 0, crashed: 0 };
	const pretty = isatty(1);
	const pool: Pool = { pending: [...projects], own, idle: [], tally, pretty, rest: { files: [...own.values()].flat(), pretty }, busy: 0 };
	return new Promise((done) => {
		const next = (): void => {
			if (dispatch(pool)) done(tally);
		};
		for (let index = 0; index < parallel; index += 1) startWorker(pool, times, next);
		next();
	});
}

if (process.argv[1] === import.meta.filename) {
	if (process.argv.includes("--worker")) worker();
	else {
		const started = performance.now();
		const tally = await main();
		const seconds = ((performance.now() - started) / 1000).toFixed(1);
		console.log(`lint: ${String(tally.typed.size)} project(s) typed, ${String(tally.files)} file(s) linted, ${String(tally.errors)} error(s), ${String(tally.warnings)} warning(s), ${seconds} s`);
		const problems = [
			...[...tally.failed].map((config) => `${relative(ROOT, config)} has type errors`),
			...[...tally.skipped].map((config) => `${relative(ROOT, config)} was skipped: a project it references has type errors`),
			...(tally.crashed > 0 ? [`${String(tally.crashed)} worker(s) ended early`] : []),
			...(tally.errors > 0 ? [`ESLint found ${String(tally.errors)} error(s)`] : []),
			...(tally.typed.size === 0 || tally.files === 0 ? ["no project or no file was found"] : []),
		];
		for (const problem of problems) console.error(`lint: ${problem}`);
		process.exitCode = problems.length === 0 ? 0 : 1;
	}
}
