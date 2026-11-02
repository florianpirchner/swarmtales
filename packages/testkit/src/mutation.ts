/**
 * Mutation checks for the carve gates (docs/design/carve-decisions.md, R2-D23): a challenger
 * lists source changes that a test must catch; `runMutants` applies each one in a hard-linked
 * copy of the repository, runs the named test files there and says whether they failed. The
 * repository itself is never written: a mutated file is unlinked in the copy and written fresh, so
 * the hard link to the original breaks before anything changes.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

/** Hard links of the repository without `.git`, `.claude` and the test caches. */
function linkedCopy(root: string, scratch: string): string {
	const copy = mkdtempSync(join(scratch, "mutant-"));
	for (const entry of readdirSync(root)) {
		if (entry === ".git" || entry === ".claude") continue;
		const linked = spawnSync("cp", ["-al", join(root, entry), join(copy, entry)], { encoding: "utf8" });
		if (linked.status !== 0) throw new Error(`mutation: cannot link ${entry} (${linked.stderr.trim()})`);
	}
	// A cache file written in place would write through its hard link into the repository.
	for (const cache of [".vite", ".vitest"]) rmSync(join(copy, "node_modules", cache), { recursive: true, force: true });
	return copy;
}

/** Writes a file of the copy as a new file, so its original stays untouched. */
function writeFresh(path: string, text: string): void {
	unlinkSync(path);
	writeFileSync(path, text);
}

function runTests(copy: string, tests: readonly string[]): { status: number | null; output: string } {
	const run = spawnSync(join(copy, "node_modules", ".bin", "vitest"), ["--run", ...tests], { cwd: copy, encoding: "utf8", env: { ...process.env, CI: "1" } });
	return { status: run.status, output: `${run.stdout}${run.stderr}` };
}

export interface RunMutantsOptions {
	/** The repository root. */
	readonly root: string;
	readonly mutations: readonly Mutation[];
	/** Where the copy goes; it must be on the root's file system. Default: the system's temp directory. */
	readonly scratch?: string;
}

/** Runs every mutation in one hard-linked copy (each on the unchanged sources) and removes the copy. */
export function runMutants(options: RunMutantsOptions): MutantResult[] {
	const copy = linkedCopy(options.root, options.scratch ?? tmpdir());
	try {
		return options.mutations.map((mutation): MutantResult => {
			const path = join(copy, mutation.file);
			let original: string;
			let mutated: string;
			try {
				original = readFileSync(path, "utf8");
				mutated = applyMutation(original, mutation);
			} catch (error) {
				return { id: mutation.id, verdict: "broken", detail: error instanceof Error ? error.message : String(error) };
			}
			writeFresh(path, mutated);
			try {
				const { status, output } = runTests(copy, mutation.tests);
				const tail = output.trim().split("\n").slice(-6).join("\n");
				if (output.includes("No test files found")) return { id: mutation.id, verdict: "broken", detail: "no test file matched" };
				return { id: mutation.id, verdict: status === 0 ? "survived" : "killed", detail: tail };
			} finally {
				writeFresh(path, original);
			}
		});
	} finally {
		rmSync(copy, { recursive: true, force: true });
	}
}
