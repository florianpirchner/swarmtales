/**
 * Whether a story is the version a run played: the genesis of a signed run commits to `storyHash`, the
 * sha256 of the canonical JSON of the story as `000-run.json` serialises it (`apps/cli/src/host/chain.ts`).
 */
import { jsonHash } from "@swarmtales/chain";

/** The story hash of a story given as plain JSON, or undefined when it is not JSON (a value canonical JSON refuses). */
export function storyHashOf(story: unknown): string | undefined {
	try {
		return jsonHash(story);
	} catch {
		return undefined;
	}
}
