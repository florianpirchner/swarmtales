/**
 * Which story the Story tab draws for a run, and whether it is the version the run played. A signed
 * run's genesis commits to the story's hash, so a candidate is checked against it: the run's own
 * `000-run.json` story first, then the host's story under the run's id, then shorter ids (`chess-p80` is
 * a variant of `chess`). A matching candidate wins; without one the view says the story is not the
 * version the run played, and the overlay is only approximate.
 */

/** What the lookup reads of a run (a `RunModel` has all of it). */
export interface StoryHints {
	readonly name: string;
	readonly meta?: { readonly storyId?: string; readonly story?: unknown };
	readonly genesis?: { readonly story: string; readonly storyHash?: string };
}

export interface FoundStory {
	readonly id: string;
	readonly story: unknown;
	/** Where it came from: the run's own `000-run.json`, the host under the run's id, or the host under a shorter id. */
	readonly from: "run" | "host" | "host-prefix";
	/** `matches`: its hash is the genesis' `storyHash`; `differs`: it is not the version the run played; `unchecked`: the run is not signed. */
	readonly check: "matches" | "differs" | "unchecked";
}

/** Story ids a run may be filed under: its own, then shorter names (`chess-p80` is a variant of `chess`). */
function candidates(id: string): readonly string[] {
	const parts = id.split("-");
	return parts.map((_part, index) => parts.slice(0, parts.length - index).join("-"));
}

/**
 * The story of a run (see the file comment). `hashOf` is viewer-core's `storyHashOf`; it is passed in so
 * this lookup stays a plain function a test can drive.
 */
export function storyOfRun(model: StoryHints, stories: Readonly<Record<string, unknown>> = {}, hashOf: (story: unknown) => string | undefined = () => undefined): FoundStory | undefined {
	const ids = [model.meta?.storyId, model.genesis?.story].filter((id): id is string => id !== undefined);
	const found: Omit<FoundStory, "check">[] = [];
	const own = model.meta?.story;
	if (own !== undefined) found.push({ id: ids[0] ?? model.name, story: own, from: "run" });
	const seen = new Set<string>();
	for (const [index, id] of ids.flatMap((one) => candidates(one).map((candidate, position) => [position, candidate] as const))) {
		if (seen.has(id)) continue;
		seen.add(id);
		const story = Object.entries(stories).find(([key]) => key === id)?.[1];
		if (story !== undefined) found.push({ id, story, from: index === 0 ? "host" : "host-prefix" });
	}
	const expected = model.genesis?.storyHash;
	if (expected === undefined) {
		// Unsigned: the host's story by the run's id first (it is what the build knows), else the run's own.
		const pick = found.find((one) => one.from === "host") ?? found.find((one) => one.from === "run") ?? found[0];
		return pick === undefined ? undefined : { ...pick, check: "unchecked" };
	}
	const matching = found.find((one) => hashOf(one.story) === expected);
	if (matching !== undefined) return { ...matching, check: "matches" };
	const pick = found[0];
	return pick === undefined ? undefined : { ...pick, check: "differs" };
}
