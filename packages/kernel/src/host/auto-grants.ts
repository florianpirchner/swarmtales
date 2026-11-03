/**
 * `grants: "auto"` (docs/design/grants-auto.md): the story's grants derived from the loaded mechanics.
 * Every mechanic tool says in `suggest` which grant names it is meant for; the derived list of a name
 * holds the tools that suggest it, in load order and then in the order the mechanic defines them. An
 * entry that is the id of an overseer's definition counts for every overseer of that definition; a
 * suggestion of a name the story does not know is dropped (a mechanic cannot know a story's names).
 * The core's own tools suggest nothing here: the human's and `amendDecision` stay explicit.
 */
import type { CoreStory, GrantTweak, Grants } from "@swarmtales/contracts";
import { CORE_OWNER } from "./decisions.ts";
import type { ToolCatalog } from "./catalog.ts";
import type { Names } from "./names.ts";

type Resolved = Grants<string, string>;

/** The names an entry of `suggest` stands for. */
function namesOf(entry: string, names: Names, definitions: ReadonlyMap<string, readonly string[]>): readonly string[] {
	const byDefinition = definitions.get(entry) ?? [];
	return names.has(entry) ? [entry, ...byDefinition.filter((name) => name !== entry)] : byDefinition;
}

/** The grants derived from the loaded tools alone. */
export function deriveGrants(story: Pick<CoreStory, "overseers">, tools: ToolCatalog, names: Names): Resolved {
	const definitions = new Map<string, string[]>();
	for (const use of story.overseers ?? []) definitions.set(use.overseer.id, [...(definitions.get(use.overseer.id) ?? []), use.name]);
	const derived = new Map<string, string[]>();
	for (const [name, variants] of tools) {
		for (const { owner, tool } of variants) {
			if (owner === CORE_OWNER) continue;
			for (const entry of tool.suggest) {
				for (const role of namesOf(entry, names, definitions)) {
					const list = derived.get(role) ?? [];
					if (!list.includes(name)) list.push(name);
					derived.set(role, list);
				}
			}
		}
	}
	return Object.fromEntries(derived);
}

function tweaked(derived: readonly string[] | undefined, tweak: GrantTweak<string> | undefined): readonly string[] {
	const dropped = new Set(tweak?.drop ?? []);
	const base = (tweak?.set ?? derived ?? []).filter((tool) => !dropped.has(tool));
	return [...base, ...(tweak?.add ?? []).filter((tool) => !base.includes(tool))];
}

/** The story's grants as the host uses them: its own list, or the derived one with the story's tweaks. */
export function resolveGrants(story: CoreStory, tools: ToolCatalog, names: Names): Resolved {
	if (story.grants !== "auto") {
		if (story.grantTweaks !== undefined) throw new Error('story: grantTweaks only apply with grants: "auto"');
		return story.grants;
	}
	const derived = deriveGrants(story, tools, names);
	const tweaks = story.grantTweaks ?? {};
	// A dropped or set tool may never reach the grant check, so a typo would keep or lose a tool silently (`add` lands in the grants and is checked there).
	for (const [name, tweak] of Object.entries(tweaks)) {
		for (const field of ["set", "drop"] as const) {
			const unknown = (tweak?.[field] ?? []).find((tool) => !tools.has(tool));
			if (unknown !== undefined) throw new Error(`story: grantTweaks.${name}.${field} names tool "${unknown}", which no loaded mechanic defines`);
		}
	}
	const keys = [...new Set([...Object.keys(derived), ...Object.keys(tweaks)])];
	return Object.fromEntries(keys.map((name) => [name, tweaked(derived[name], tweaks[name])]));
}
