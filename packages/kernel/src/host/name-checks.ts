/**
 * The load-time checks of open grant names and overseers (docs/design/overseer-api.md §2): a bad
 * name, a doubled name, a grant or policy for a name the story does not declare, an overseer
 * without the tools its prompt expects, `amendDecision` for residents, clashing events or ids, a
 * consult role served twice or with another answer schema, and an input prompt that does not end
 * with `{{standingOrders}}`. Each fails the load with the story's own words.
 */
import { BUILT_IN_NAMES, CORE_EVENTS, DECISION_TOOL, STANDING_ORDERS, type CoreStory, type Grants, type OverseerDefinition, type PromptLookup } from "@swarmtales/contracts";
import type { ToolCatalog } from "./catalog.ts";
import type { Names } from "./names.ts";

const NAME = /^[a-z][a-z0-9-]*$/u;
/** What the input prompt is rendered with to find where `{{standingOrders}}` lands. */
const SENTINEL = "\u0000standing-orders\u0000";

export interface NameCheckParts {
	readonly story: CoreStory;
	/** The story's grants as loaded (`grants: "auto"` resolved). */
	readonly grants: Grants<string, string>;
	readonly names: Names;
	readonly tools: ToolCatalog;
	/** Event type to the mechanic that declares it. */
	readonly events: ReadonlyMap<string, string>;
	/** The app's consult roles (`HostOptions.roles`). */
	readonly roles: ReadonlySet<string>;
	readonly prompts: PromptLookup | undefined;
}

function nameError(name: string): string | undefined {
	if (name === "host") return "is the host's";
	if (name !== "gamemaker" && BUILT_IN_NAMES.some((builtIn) => builtIn === name)) return "is a built-in name";
	if (!NAME.test(name)) return "is not lower case letters, digits and hyphens, starting with a letter";
	return undefined;
}

/** The overseers' names, before anything is loaded: a bad name would make every later message wrong. */
export function checkOverseerNames(story: CoreStory): void {
	const seen = new Set<string>();
	for (const use of story.overseers ?? []) {
		const problem = nameError(use.name);
		if (problem !== undefined) throw new Error(`story: the overseer name "${use.name}" ${problem}`);
		if (seen.has(use.name)) throw new Error(`story: two overseers are named "${use.name}"`);
		seen.add(use.name);
	}
}

/** Everything else, once the mechanics are loaded. */
export function checkNames(parts: NameCheckParts): void {
	const { story, names, grants } = parts;
	const overseers = story.overseers ?? [];
	const grantKeys = Object.keys(grants);
	const policyKeys = Object.keys(story.tools ?? {});
	const decisionHolders = Object.values(story.decisions ?? {}).flatMap((policy) => policy?.holders ?? []);
	for (const [what, list] of [["grants", grantKeys], ["tools", policyKeys], ["decisions", decisionHolders]] as const) {
		const unknown = list.find((name) => !names.has(name));
		if (unknown !== undefined) throw new Error(`story: ${what} name "${unknown}", which is neither built in nor an overseer of the story`);
	}
	const declared = new Set(story.mechanics.flatMap((use) => Object.keys(use.mechanic.decisions).map((kind) => `${use.mechanic.id}.${kind}`)));
	const stray = Object.keys(story.decisions ?? {}).find((kind) => !declared.has(kind));
	if (stray !== undefined) throw new Error(`story: decisions kind "${stray}", which no loaded mechanic declares`);
	const granted = (name: string): readonly string[] => grants[name] ?? [];
	if (granted("resident").includes(DECISION_TOOL)) throw new Error(`story: ${DECISION_TOOL} is granted to residents, but residents never hold a decision`);
	for (const [kind, policy] of Object.entries(story.decisions ?? {})) {
		const holder = (policy?.holders ?? []).find((name) => !granted(name).includes(DECISION_TOOL));
		if (holder !== undefined) throw new Error(`story: "${holder}" holds ${kind} but is not granted ${DECISION_TOOL}`);
	}
	checkOverseers(parts, overseers.map((use) => [use.name, use.overseer] as const), granted);
}

function checkOverseers(parts: NameCheckParts, uses: readonly (readonly [string, OverseerDefinition])[], granted: (name: string) => readonly string[]): void {
	const ids = new Map<string, OverseerDefinition>();
	const events = new Map(parts.events);
	for (const [name, definition] of uses) {
		const missing = definition.needs.find((tool) => !granted(name).includes(tool));
		if (missing !== undefined) throw new Error(`story: overseer "${name}" (${definition.id}) needs ${missing}, which the story does not grant to it`);
		const known = ids.get(definition.id);
		if (known !== undefined && known !== definition) throw new Error(`story: two overseer definitions have the id "${definition.id}"`);
		if (known === undefined) {
			ids.set(definition.id, definition);
			for (const type of Object.keys(definition.events)) {
				if (Object.hasOwn(CORE_EVENTS, type)) throw new Error(`${definition.id}: event "${type}" is reserved by the core`);
				const owner = events.get(type);
				if (owner !== undefined) throw new Error(`${definition.id}: event "${type}" is declared by "${owner}" too`);
				events.set(type, definition.id);
			}
		}
		if (definition.triggers.some((trigger) => "consult" in trigger)) checkConsult(parts, name, definition);
		checkInput(parts.prompts, definition);
	}
}

/** A consult overseer replaces the app's role of its name and answers in the tool's own schema. */
function checkConsult(parts: NameCheckParts, name: string, definition: OverseerDefinition): void {
	if (parts.roles.has(name)) throw new Error(`story: the consult role "${name}" is served by the overseer ${definition.id} and by the app's role caller`);
	for (const variants of parts.tools.values()) {
		for (const { owner, tool } of variants) {
			if (tool.consult?.role === name && tool.consult.answer !== definition.output) {
				throw new Error(`story: overseer "${name}" answers ${owner}'s ${tool.name} with another schema object than the tool's answer`);
			}
		}
	}
}

/** The input prompt declares `standingOrders` and, as far as the lookup can tell, ends with it. */
function checkInput(prompts: PromptLookup | undefined, definition: OverseerDefinition): void {
	const declared = definition.prompts[definition.input];
	if (declared?.includes(STANDING_ORDERS) !== true) throw new Error(`${definition.id}: the input prompt "${definition.input}" does not take {{${STANDING_ORDERS}}}`);
	if (prompts === undefined) return;
	const variables = Object.fromEntries(declared.map((variable) => [variable, variable === STANDING_ORDERS ? SENTINEL : ""]));
	if (!prompts.render(definition.id, definition.input, variables, declared).trimEnd().endsWith(SENTINEL)) {
		throw new Error(`${definition.id}: the input prompt "${definition.input}" does not end with {{${STANDING_ORDERS}}}`);
	}
}
