/**
 * The heads of the goals mechanic. `goalsHead` has the shape the wave 3.0 plan froze (what
 * `test/mechanics/packages.test.ts` reads); `goalsWorkHead` is the one the mechanic is built from:
 * the real options and state, the points it pays (`LedgerApi`), the exile it asks (`ExileApi`) and the
 * local extras (`goals-extras` is provided, `cores-extras` is used; docs/design/carve-requests-T3.md).
 */
import { Type } from "typebox";
import type { ContextOf } from "@swarmtales/contracts";
import { defineHead } from "@swarmtales/kernel";
import { ChannelsApi, ExileApi, GoalsApi, LedgerApi, ProgressionApi } from "@swarmtales/mechanic-shared";
import { CoresExtrasApi } from "./cores-extras.ts";
import { GoalsExtrasApi } from "./extras.ts";
import { freshGoals, GOALS_EVENTS, GoalsOptions } from "./model.ts";

export const goalsHead = defineHead({
	id: "goals",
	summary: "Secret goals per resident.",
	options: Type.Object({}),
	state: () => undefined,
	events: { ...GOALS_EVENTS },
	provides: [GoalsApi],
	requires: [ProgressionApi, ChannelsApi],
});

export const goalsWorkHead = defineHead({
	id: "goals",
	summary: goalsHead.summary,
	options: GoalsOptions,
	state: () => freshGoals(),
	events: { ...GOALS_EVENTS },
	provides: [GoalsApi, GoalsExtrasApi],
	requires: [ProgressionApi, ChannelsApi, LedgerApi],
	uses: [ExileApi, CoresExtrasApi],
});

export type GoalsCtx = ContextOf<typeof goalsWorkHead>;
