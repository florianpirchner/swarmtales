/**
 * Open grant names (docs/design/overseer-api.md §2): the names a story grants tools to are the
 * built-ins (`resident`, `gamemaker`, `script`, `human`) and the story names of its overseers. An
 * overseer acts as `overseer:<name>`, except one named `gamemaker`, which acts under the bare name.
 * A tool's `serves` entry matches a caller by its grant name or, for an overseer, by the id of its
 * definition, so a mechanic can serve every use of `acme/terminator` without knowing the story.
 */
import { BUILT_IN_NAMES, type Actor, type CoreStory, type GrantRole } from "@swarmtales/contracts";

/** Who calls, as `serves` and the policies see it. */
export interface Caller {
	readonly name: string;
	/** The overseer's definition id, when an overseer calls. */
	readonly definition?: string;
}

const OVERSEER = "overseer:";

/** The grant name an actor acts in; `host` holds no grants. */
export function roleOf(actor: Actor): GrantRole | undefined {
	if (actor.startsWith("resident:")) return "resident";
	if (actor.startsWith(OVERSEER)) return actor.slice(OVERSEER.length);
	if (actor === "gamemaker" || actor === "script" || actor === "human") return actor;
	return undefined;
}

function isBuiltIn(name: string): boolean {
	return BUILT_IN_NAMES.some((builtIn) => builtIn === name);
}

/** The actor a grant name acts as: a built-in under its bare name, an overseer as `overseer:<name>`. */
export function actorOf(name: string): Actor {
	if (name === "resident") throw new Error("names: residents act as resident:<id>");
	if (name === "gamemaker" || name === "script" || name === "human") return name;
	return `${OVERSEER}${name}`;
}

/** Whether a tool's `serves` entries take this caller (undefined: every caller). */
export function serves(entries: readonly string[] | undefined, caller: Caller): boolean {
	if (entries === undefined) return true;
	return entries.includes(caller.name) || (caller.definition !== undefined && entries.includes(caller.definition));
}

/** The names of one story: its grant names in registration order and its callers. */
export class Names {
	readonly #definitions = new Map<string, string>();
	/** Built-ins in the old order, then `human`, then the overseers in story order (§2, byte identity of the referee's keys). */
	readonly all: readonly string[];

	constructor(story: Pick<CoreStory, "overseers">) {
		const declared: string[] = [];
		for (const use of story.overseers ?? []) {
			this.#definitions.set(use.name, use.overseer.id);
			if (!isBuiltIn(use.name)) declared.push(use.name);
		}
		this.all = [...BUILT_IN_NAMES, ...declared];
	}

	/** Whether the story knows the name (a built-in or a declared overseer). */
	has(name: string): boolean {
		return isBuiltIn(name) || this.#definitions.has(name);
	}

	/** The caller a grant name stands for. */
	caller(name: string): Caller {
		const definition = this.#definitions.get(name);
		return definition === undefined ? { name } : { name, definition };
	}

	/** The caller an actor stands for; `host` is none. */
	callerOf(actor: Actor): Caller | undefined {
		const name = roleOf(actor);
		return name === undefined ? undefined : this.caller(name);
	}

	/** Every caller the story can have: what two variants of one tool must not both serve. */
	callers(): readonly Caller[] {
		return this.all.map((name) => this.caller(name));
	}

	/**
	 * Whether two variants of one tool could serve one caller: an entry they share, or a caller of
	 * this story that both take (one by its name, the other by its definition id).
	 */
	overlap(a: readonly string[] | undefined, b: readonly string[] | undefined): boolean {
		if (a === undefined || b === undefined) return true;
		if (a.some((entry) => b.includes(entry))) return true;
		return this.callers().some((caller) => serves(a, caller) && serves(b, caller));
	}
}
