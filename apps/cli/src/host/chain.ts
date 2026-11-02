/**
 * The genesis a CLI run states in its signed event log (docs/design/event-log-signing.md): the
 * code's commit, the story's hash, the seed, the models and, for a resumed run, the snapshot's
 * checkpoint it chains from.
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

export interface RunGenesisInput {
	readonly story: AnyStory;
	readonly seed: number;
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
