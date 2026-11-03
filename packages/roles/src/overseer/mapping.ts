/**
 * The story mapping's gamemaker lines (step 18, team C2), keyed by the overseer's name: what the old
 * gamemaker decided from the run's dial and the story, said through `grants: "auto"` and the
 * mechanics' options (docs/design/grants-auto.md, "Not derived").
 *
 * - `ultimatum`: the standoff suggests it to the gamemaker; below direction 10, or in a story without
 *   ultimatums, the mapping drops it (`grantsUltimatum`, mechanics/standoff/src/grants.ts). Roles may
 *   not depend on a mechanic (check-packages), so the caller passes that answer in.
 * - The tribunal's `gamemakerRoles`: the story's `gamemaker.roles` as the tribunal's option.
 */
import type { GamemakerActRole, GrantTweak } from "@swarmtales/contracts";
import { GAMEMAKER_NAME } from "./gamemaker.ts";

export interface GamemakerGrantInput {
	/** The overseer's name in the story; the tribunal's actor check needs the bare `gamemaker` (see the requests). */
	readonly name?: string;
	/** `grantsUltimatum(direction, hasUltimatums)` of the run. */
	readonly ultimatum: boolean;
	/** Whether the standoff is loaded: a tweak for a tool no loaded mechanic defines fails the load. */
	readonly standoff: boolean;
}

/** The `grantTweaks` entries for the gamemaker overseer: `ultimatum` dropped unless the run grants it. */
export function gamemakerGrantTweaks(input: GamemakerGrantInput): Readonly<Record<string, GrantTweak<string>>> {
	if (input.ultimatum || !input.standoff) return {};
	return { [input.name ?? GAMEMAKER_NAME]: { drop: ["ultimatum"] } };
}

/** The tribunal's `gamemakerRoles` option from the story's `gamemaker.roles`. */
export function tribunalGamemakerRoles(roles: readonly GamemakerActRole[]): readonly { readonly fromLevel: number; readonly role: string }[] {
	return roles.map((entry) => ({ fromLevel: entry.fromLevel, role: entry.role }));
}
