/**
 * The genesis a CLI run states in its signed event log (docs/design/event-log-signing.md): the
 * code's commit, the run's name, the story's hash, the seed, the models, hashes of the run's options
 * and prompt addenda, an optional pre-registration and, for a resumed run, the snapshot's checkpoint
 * it chains from.
 */
import { execFileSync } from "node:child_process";
import { type ChainGenesisInput, jsonHash } from "@swarmtales/chronicle";
import type { AnyStory } from "@swarmtales/contracts";
import type { ResumePoint } from "./snapshot.ts";

/**
 * The commit the code runs from: `SWARMTALES_COMMIT` (a built binary outside a checkout), else
 * `git rev-parse HEAD` beside this file, with `+dirty` when the work tree has changes; `undefined`
 * when neither is known.
 */
export function codeCommit(env: NodeJS.ProcessEnv = process.env, cwd: string = import.meta.dirname): string | undefined {
	const given = env.SWARMTALES_COMMIT;
	if (given !== undefined && given.length > 0) return given;
	try {
		const git = (...args: string[]): string => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
		const head = git("rev-parse", "HEAD");
		if (!/^[0-9a-f]{40,64}$/.test(head)) return undefined;
		return git("status", "--porcelain", "--untracked-files=no").length === 0 ? head : `${head}+dirty`;
	} catch {
		return undefined;
	}
}

/** sha256 of the canonical JSON of the story as `000-run.json` serialises it. */
export function storyHash(story: AnyStory): string {
	const serialised: unknown = JSON.parse(JSON.stringify(story));
	return jsonHash(serialised);
}

/**
 * What steers a run beyond the story, the seed and the models, as hashes for the genesis's
 * `commitments` (step 18 challenge, chain-security m4): `runOptions` (the command line's overrides,
 * e.g. `--no-guards`, the dials, `--no-personas`, and the judge's temper) and `promptAddenda` (each
 * `--prompt-addendum` text with the resident it is for). The system prompts are built from these,
 * the story, the seed and the code (`commit`), so the genesis commits to them through their inputs;
 * they themselves are written after the chain starts and are not hashed.
 */
export function inputCommitments(input: {
	readonly overrides: unknown;
	readonly judgeTemper?: string;
	readonly promptAddenda?: readonly { readonly agent?: string; readonly text: string }[];
}): Readonly<Record<string, string>> {
	return {
		runOptions: jsonHash(JSON.parse(JSON.stringify({ overrides: input.overrides, ...(input.judgeTemper === undefined ? {} : { judgeTemper: input.judgeTemper }) }))),
		...(input.promptAddenda === undefined ? {} : { promptAddenda: jsonHash(input.promptAddenda.map((entry) => ({ agent: entry.agent ?? null, text: entry.text }))) }),
	};
}

export interface RunGenesisInput {
	readonly story: AnyStory;
	readonly seed: number;
	/** The run's name (`run-004`). */
	readonly run?: string;
	/** sha256 of the pre-registration document (`--preregistration <file>`). */
	readonly preregistration?: string;
	/** Model per resident (`A01`) and per role (`gamemaker`, `classifier`, ...). */
	readonly models: Readonly<Record<string, string>>;
	readonly commit?: string;
	readonly commitments?: Readonly<Record<string, string>>;
	readonly resume?: { readonly point: ResumePoint; readonly name: string };
}

export function runGenesis(input: RunGenesisInput): ChainGenesisInput {
	const resume = input.resume;
	const previousRun = resume?.point.run.meta?.run;
	return {
		...(input.commit === undefined ? {} : { commit: input.commit }),
		...(input.run === undefined ? {} : { run: input.run }),
		...(input.preregistration === undefined ? {} : { preregistration: input.preregistration }),
		story: input.story.id,
		storyHash: storyHash(input.story),
		seed: input.seed,
		models: { ...input.models },
		...(input.commitments === undefined ? {} : { commitments: { ...input.commitments } }),
		...(resume === undefined
			? {}
			: {
					resumedFrom: {
						file: resume.name,
						...(previousRun === undefined ? {} : { run: previousRun }),
						...(resume.point.chain === undefined ? {} : { checkpoint: resume.point.chain }),
					},
				}),
	};
}
