// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The `roster` plugin: who plays, in which team and in which role. Game resolution adds it to every game that
 * lists no provider of the service `roster`. It is written by hand as a `ResolvedPlugin`, not with
 * `defineMechanic`: it has no options, no state, no tools and no events. Its fact `residents` holds the resident ids in roster order (A74). It speaks in resident ids (`A01`), as an
 * author does, and reads what resolution wrote into `ActorSpec.shared` (`team`, `role`).
 */
import { actorId, SwtError, type ActorsView, type PluginPort, type ResolvedPlugin, type ServiceMethods } from "@swarmtales/contracts";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { serviceMismatch } from "../errors.ts";
import { defineService } from "../mechanic/definers.ts";

const ID = "roster";
const KIND = "resident";
const none = Type.Object({}, { additionalProperties: false, description: "No input" });
const one = Type.Object({ resident: Type.String({ description: "A resident id, for example `A01`" }) }, { additionalProperties: false, description: "The resident that is asked about" });
const residents = (description: string) => Type.Array(Type.String({ description: "A resident id" }), { description });
const groups = (of: string) => Type.Record(Type.String({ description: `The name of a ${of}` }), residents(`The residents of the ${of}, in the game's order`), { description: `The ${of}s that have a resident, by name` });
const groupOf = (of: string) => Type.Union([Type.String({ description: `The name of the ${of}` }), Type.Null({ description: `The resident has no ${of}, or is no resident` })], { description: `The ${of} of the resident` });

/**
 * The contract of the service `roster`: the residents of the game, their teams and their roles. Every method is a
 * query. A resident has at most one team and one role: the first that names it in the game.
 *
 * @public
 */
export const RosterService = defineService({
	name: ID,
	summary: "The residents of the game, their teams and their roles.",
	methods: {
		ids: { kind: "query", summary: "Every resident, in the game's order.", input: none, output: residents("The resident ids") },
		teams: { kind: "query", summary: "The residents of each team.", input: none, output: groups("team") },
		teamOf: { kind: "query", summary: "The team of a resident.", input: one, output: groupOf("team") },
		roles: { kind: "query", summary: "The residents of each role.", input: none, output: groups("role") },
		roleOf: { kind: "query", summary: "The role of a resident.", input: one, output: groupOf("role") },
		present: { kind: "query", summary: "Says whether the resident may act now.", input: one, output: Type.Boolean({ description: "False for a suspended resident and for an id that is no resident" }) },
	},
});

/**
 * Answers one method of the service from the actors of the run.
 *
 * @param actors - The actors of the run.
 * @param method - The method name; the caller has checked that the contract holds it.
 * @param resident - The resident asked about; an empty string for a method without input.
 * @returns The answer of the method.
 */
function answer(actors: ActorsView, method: string, resident: string): unknown {
	const ids = actors.ofKind(KIND).map((id) => id.slice(KIND.length + 1));
	const of = (key: string, id: string): string | null => {
		const value = actors.has(actorId(KIND, id)) ? actors.shared(actorId(KIND, id), key) : undefined;
		return typeof value === "string" ? value : null;
	};
	const all = (key: string): Readonly<Record<string, readonly string[]>> => {
		const names = [...new Set(ids.flatMap((id) => of(key, id) ?? []))];
		return Object.fromEntries(names.map((name) => [name, ids.filter((id) => of(key, id) === name)]));
	};
	const answers: Readonly<Record<string, () => unknown>> = {
		ids: () => ids,
		teams: () => all("team"),
		teamOf: () => of("team", resident),
		roles: () => all("role"),
		roleOf: () => of("role", resident),
		present: () => actors.has(actorId(KIND, resident)) && actors.mayAct(actorId(KIND, resident)),
	};
	return answers[method]?.();
}

/**
 * Checks a call of the service against the contract and answers it.
 *
 * @param port - The port of the plugin.
 * @param method - The method name.
 * @param input - The input as the caller gave it.
 * @param caller - The id of the plugin that calls.
 * @returns The answer of the method.
 * @throws SwtError `SWT-M022` when the service has no such method or the input does not match its schema.
 */
function call(port: PluginPort, method: string, input: unknown, caller: string): unknown {
	const methods: ServiceMethods = RosterService.methods;
	const contract = Object.hasOwn(methods, method) ? methods[method] : undefined;
	const wrong = contract === undefined ? { instancePath: "", message: "names no method of the service" } : Value.Errors(contract.input, input)[0];
	if (wrong !== undefined) throw new SwtError(serviceMismatch({ service: ID, method, side: "input", provider: ID, caller, path: wrong.instancePath, message: wrong.message }));
	return answer(port.actors, method, Value.Check(one, input) ? input.resident : "");
}

/**
 * The `roster` plugin of a game.
 *
 * @param version - The version of the sdk package, for the manifest.
 * @returns The plugin: it provides `roster` and computes the fact `residents`.
 *
 * @public
 */
export function rosterPlugin(version: string): ResolvedPlugin {
	return {
		id: ID,
		package: "@swarmtales/sdk",
		version,
		requires: [],
		provides: [ID],
		events: {},
		audiences: {},
		options: {},
		create: (port) => ({
			tools: [],
			services: [{ service: RosterService, call: (method, input, caller) => call(port, method, input, caller) }],
			listeners: [],
			hooks: {},
			stages: {},
			jobs: {},
			limits: [],
			facts: { residents: { output: residents("The resident ids, in the game's order"), compute: () => answer(port.actors, "ids", "") } },
			slice: undefined,
		}),
	};
}

/**
 * Adds the `roster` plugin to the plugins of a game, unless one of them provides `roster`. It is called with the
 * plugins in load order and never goes through `loadOrder`: `roster` is the last plugin, unless a plugin requires
 * the service, and then it stands before the first that does.
 *
 * @param plugins - The plugins of the game, in load order.
 * @param version - The version of the sdk package.
 * @returns The same list when a plugin provides `roster`, else the list with the `roster` plugin before its first
 * requirer, or at its end when no plugin requires it.
 *
 * @public
 */
export function appendRoster(plugins: readonly ResolvedPlugin[], version: string): readonly ResolvedPlugin[] {
	if (plugins.some((plugin) => plugin.provides.includes(ID))) return plugins;
	const first = plugins.findIndex((plugin) => plugin.requires.includes(ID));
	const at = first === -1 ? plugins.length : first;
	return [...plugins.slice(0, at), rosterPlugin(version), ...plugins.slice(at)];
}
