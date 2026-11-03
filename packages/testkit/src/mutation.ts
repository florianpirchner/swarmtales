/**
 * Mutation checks for the carve gates (docs/design/carve-decisions.md, R2-D23): a challenger
 * lists source changes that a test must catch; `runMutants` applies each one in a hard-linked
 * copy of the repository, runs the named test files there and says whether they failed. The
 * repository itself is never written: a mutated file is unlinked in the copy and written fresh, so
 * the hard link to the original breaks before anything changes.
 */
import { spawn } from "node:child_process";
import { link, lstat, mkdir, mkdtemp, readdir, readFile, readlink, rm, symlink, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative } from "node:path";
import { Type, type Static } from "typebox";
import { Value } from "typebox/value";

/** One listed source change and the tests that must catch it. */
export const MutationSchema = Type.Object({
	/** The review's name for it, e.g. "T3 M10". */
	id: Type.String({ minLength: 1 }),
	/** The source file, relative to the repository root. */
	file: Type.String({ minLength: 1 }),
	/** Text that occurs exactly once in the file. */
	find: Type.String({ minLength: 1 }),
	replace: Type.String(),
	/** Test files or directories, relative to the root, that must fail with the change. */
	tests: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
});
export type Mutation = Static<typeof MutationSchema>;
export const MutationListSchema = Type.Array(MutationSchema);

/** `killed`: the tests failed; `survived`: they passed; `broken`: the change did not apply or no test ran. */
export type MutantVerdict = "killed" | "survived" | "broken";

export interface MutantResult {
	readonly id: string;
	readonly verdict: MutantVerdict;
	/** Why it is broken, or the tail of the test output. */
	readonly detail: string;
}

/** A mutation list from a file (untrusted JSON). */
export function parseMutations(text: string, source = "mutations"): Mutation[] {
	const raw: unknown = JSON.parse(text);
	if (!Value.Check(MutationListSchema, raw)) {
		const first = [...Value.Errors(MutationListSchema, raw)][0];
		throw new Error(`${source}: not a mutation list (${first === undefined ? "unknown" : `${first.instancePath} ${first.message}`})`);
	}
	return raw;
}

/** The text with the one occurrence of `find` replaced; throws unless it occurs exactly once. */
export function applyMutation(text: string, mutation: Pick<Mutation, "find" | "replace">): string {
	const first = text.indexOf(mutation.find);
	if (first < 0) throw new Error(`mutation: "${mutation.find}" does not occur`);
	if (text.includes(mutation.find, first + 1)) throw new Error(`mutation: "${mutation.find}" occurs more than once`);
	return text.slice(0, first) + mutation.replace + text.slice(first + mutation.find.length);
}

/**
 * `from` as hard links under `to`, like `cp -al` but also on Windows: a symbolic link (pnpm's
 * links in `node_modules`, junctions on Windows) is made again, and one that points into the
 * repository with an absolute path points into the copy, so the copy imports its own packages.
 * Asynchronous, so a long copy does not block the test worker that runs it.
 */
async function linkTree(root: string, copy: string, from: string, to: string): Promise<void> {
	const stat = await lstat(from);
	if (stat.isSymbolicLink()) {
		const target = await readlink(from);
		const inside = isAbsolute(target) ? relative(root, target) : undefined;
		const moved = inside !== undefined && !inside.startsWith("..") && !isAbsolute(inside) ? join(copy, inside) : target;
		await symlink(moved, to, process.platform === "win32" ? "junction" : undefined);
	} else if (stat.isDirectory()) {
		await mkdir(to);
		await Promise.all((await readdir(from)).map((entry) => linkTree(root, copy, join(from, entry), join(to, entry))));
	} else {
		await link(from, to);
	}
}

/** Hard links of the repository without `.git`, `.claude` and the test caches. */
async function linkedCopy(root: string, scratch: string): Promise<string> {
	const copy = await mkdtemp(join(scratch, "mutant-"));
	for (const entry of await readdir(root)) {
		if (entry === ".git" || entry === ".claude") continue;
		try {
			await linkTree(root, copy, join(root, entry), join(copy, entry));
		} catch (error) {
			throw new Error(`mutation: cannot link ${entry} (${error instanceof Error ? error.message : String(error)})`);
		}
	}
	// A cache file written in place would write through its hard link into the repository.
	for (const cache of [".vite", ".vitest"]) await rm(join(copy, "node_modules", cache), { recursive: true, force: true });
	return copy;
}

/** Writes a file of the copy as a new file, so its original stays untouched. */
async function writeFresh(path: string, text: string): Promise<void> {
	await unlink(path);
	await writeFile(path, text);
}

function runTests(copy: string, tests: readonly string[]): Promise<{ status: number | null; output: string }> {
	// Through node, not `.bin/vitest`: that is a shell script, which Windows cannot start directly.
	const child = spawn(process.execPath, [join(copy, "node_modules", "vitest", "vitest.mjs"), "--run", ...tests], { cwd: copy, env: { ...process.env, CI: "1" } });
	let output = "";
	child.stdout.setEncoding("utf8").on("data", (chunk: string) => (output += chunk));
	child.stderr.setEncoding("utf8").on("data", (chunk: string) => (output += chunk));
	return new Promise((done, fail) => {
		child.on("error", fail);
		child.on("close", (status) => {
			done({ status, output });
		});
	});
}

export interface RunMutantsOptions {
	/** The repository root. */
	readonly root: string;
	readonly mutations: readonly Mutation[];
	/** Where the copy goes; it must be on the root's file system. Default: the system's temp directory. */
	readonly scratch?: string;
}

/** Runs every mutation in one hard-linked copy (each on the unchanged sources) and removes the copy. */
export async function runMutants(options: RunMutantsOptions): Promise<MutantResult[]> {
	const copy = await linkedCopy(options.root, options.scratch ?? tmpdir());
	try {
		const results: MutantResult[] = [];
		for (const mutation of options.mutations) {
			const path = join(copy, mutation.file);
			let original: string;
			let mutated: string;
			try {
				original = await readFile(path, "utf8");
				mutated = applyMutation(original, mutation);
			} catch (error) {
				results.push({ id: mutation.id, verdict: "broken", detail: error instanceof Error ? error.message : String(error) });
				continue;
			}
			await writeFresh(path, mutated);
			try {
				const { status, output } = await runTests(copy, mutation.tests);
				const tail = output.trim().split("\n").slice(-6).join("\n");
				if (output.includes("No test files found")) results.push({ id: mutation.id, verdict: "broken", detail: "no test file matched" });
				else results.push({ id: mutation.id, verdict: status === 0 ? "survived" : "killed", detail: tail });
			} finally {
				await writeFresh(path, original);
			}
		}
		return results;
	} finally {
		await rm(copy, { recursive: true, force: true });
	}
}
