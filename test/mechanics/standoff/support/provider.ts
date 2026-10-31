/**
 * A stand-in provider of one frozen API (docs/design/carve-plan.md, "Gate per team"): a mechanic
 * with no state that implements the API's methods with the given functions. Tests of team T4 use
 * these for every mechanic of another team ("stand-in" is part of the test names that rely on one).
 * A stand-in implements only the methods its tests call (`provideSome`): any other call fails.
 */
import { Type } from "typebox";
import type { ApiDefinition, ApiImplementation } from "@swarmtales/contracts";
import { defineMechanic } from "@swarmtales/kernel";

export function provider<const A extends ApiDefinition>(id: string, api: A, implementation: Partial<ApiImplementation<A, unknown>>) {
	return defineMechanic(
		{ id, summary: `Stand-in provider of ${api.name}.`, options: Type.Object({}), state: (): undefined => undefined, events: {}, provides: [api] },
		(kit) => ({ services: [kit.provideSome(api, implementation)] }),
	);
}
