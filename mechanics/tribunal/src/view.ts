// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * What others read of the tribunal without calling a tool, carried from the old `view.ts` and `court.ts`
 * (`endReason`, `pursuing`): the run's stop rule (`tribunal-view.stop` of `arena`), the data of the gamemaker's tribunal
 * section (`tribunal.section`) and the running draft (`tribunal.draft`), computed live through `Reads`.
 */
import type { Static } from "typebox";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { active, endOfAct, exiledList, missing, residentsCount, target, text } from "./city.ts";
import type { Reads, TribunalView } from "./head.ts";
import { cityCall, schedulingWindow } from "./schedule.ts";
import type { DraftFact, TribunalSection } from "./section.ts";
import { currentSession } from "./state.ts";
import { namesOf } from "./template.ts";
import { busy } from "./verdict.ts";

/**
 * What the run's stop rule reads of the tribunal (old `TribunalViewApi.stop`).
 *
 * @public
 */
export interface TribunalStop {
	/** The target-reached text once the act is over, else null (old `endReason`). */
	readonly endReason: string | null;
	/** Whether a tribunal is under way (old `busy`). */
	readonly busy: boolean;
	/** Whether the city still pursues its target (old `pursuing`). */
	readonly pursuing: boolean;
}

/**
 * The facts' `Reads`, or undefined before the first tick set the run's ticks (old `readsOf`).
 *
 * @param view - The facts' view.
 * @returns The reads.
 */
export function readsOf(view: TribunalView): Reads | undefined {
	const ticks = view.state.ticks;
	if (ticks === undefined) return undefined;
	return { options: view.options, state: view.state, residents: view.residents, call: view.call.bind(view), tryCall: view.tryCall.bind(view), ticks, mechanic: "tribunal" };
}

/**
 * Old `stop`: the end reason, whether a tribunal is under way, whether the city still pursues its target.
 *
 * @param reads - The context or the facts' reads.
 * @returns The stop.
 * @throws SwtError `SWT-G020` when the text names an unknown placeholder.
 */
export function stopOf(reads: Reads): TribunalStop {
	const { state } = reads;
	const endReason = state.ended ? text(reads, "targetReached", { exiledList: namesOf(exiledList(reads)) }) : null;
	return { endReason, busy: busy(reads), pursuing: active(reads) && !state.ended && !state.halted && target(reads) > 0 };
}

/**
 * The running draft's group and leaders (old fact `draft`).
 *
 * @param reads - The context or the facts' reads.
 * @returns The draft, or null.
 */
export function draftOf(reads: Pick<Reads, "state">): Static<typeof DraftFact> {
	const draft = reads.state.draft;
	return draft === undefined ? null : { group: draft.group, leaders: [...(draft.leaders ?? [])] };
}

/**
 * Old `sectionOf`: the data of the gamemaker's "Tribunal:" section, or null when the city holds no tribunal.
 *
 * @param reads - The facts' reads.
 * @returns The section.
 */
export function sectionOf(reads: Reads): TribunalSection {
	if (!active(reads)) return null;
	const { state, options: spec } = reads;
	const { plan } = state;
	const session = currentSession(state);
	return {
		residents: residentsCount(reads),
		target: target(reads),
		exiled: [...exiledList(reads)],
		missing: missing(reads),
		actEnd: endOfAct(reads),
		rules: { voteMinutes: spec.voteMinutes, gateMinutes: spec.gateMinutes, ransom: { ...spec.ransom }, bequestPerHeir: spec.bequestPerHeir, blocBonus: spec.factions?.blocBonus ?? null, fallbackGap: spec.fallbackGap },
		plan: plan === undefined ? null : { tribunal: plan.tribunal, called: plan.called, by: plan.by, calledAt: plan.calledAt, opens: plan.opens, count: plan.count, factions: plan.factions },
		window: schedulingWindow(reads),
		cityCall: cityCall(reads),
		session: session === undefined ? null : { tribunal: session.tribunal, accused: [...session.accused], count: session.count, until: session.until },
		draft: draftOf(reads),
		gates: reads.call(ExileService, "gates", {}).map((gate) => ({ ...gate })),
	};
}
