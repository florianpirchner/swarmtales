/**
 * What others read of the tribunal without calling it: the run's stop rule (old arena
 * `#stopReason`, arena.ts:335-345), the gamemaker's tribunal section (old `tribunalLines`,
 * situation.ts:269-321) and the gamemaker's offer of `scheduleTribunal` (old
 * `#mayScheduleTribunal`, gamemaker.ts:281). The facts compute them live through `Reads`, the same
 * functions `TribunalViewApi` answers with.
 */
import { Type, type Static } from "typebox";
import { ExileApi, ProgressionApi, TribunalViewApi } from "@swarmtales/mechanic-shared";
import { active, endOfAct, exiledList, missing, present, residentsCount, target, type Reads } from "./city.ts";
import { busy, endReason, pursuing } from "./court.ts";
import type { TribunalCtx, TribunalFactView } from "./head.ts";
import { cityCall, schedulingWindow } from "./schedule.ts";
import { currentSession } from "./state.ts";

const Int = Type.Integer();
const Ids = Type.Array(Type.String());

export const StopFact = TribunalViewApi.methods.stop.output;

/** The data of the gamemaker's "Tribunal:" section, or null when the city holds no tribunal (old `tribunalLines`). */
export const SectionFact = Type.Union([
	Type.Null(),
	Type.Object({
		residents: Int,
		target: Int,
		/** Who left through the gate or by the seal, in order (old `tribunal.exiled`). */
		exiled: Ids,
		missing: Int,
		actEnd: Int,
		rules: Type.Object({
			voteMinutes: Int,
			gateMinutes: Int,
			ransom: Type.Object({ share: Type.Number(), selfShare: Type.Number(), minimum: Type.Number() }),
			bequestPerHeir: Type.Number(),
			blocBonus: Type.Union([Int, Type.Null()]),
			fallbackGap: Int,
		}),
		plan: Type.Union([Type.Null(), Type.Object({ tribunal: Int, called: Type.Boolean(), by: Type.String(), calledAt: Int, opens: Int, count: Int, factions: Int })]),
		window: TribunalViewApi.methods.schedulingWindow.output,
		cityCall: TribunalViewApi.methods.cityCall.output,
		session: Type.Union([Type.Null(), Type.Object({ tribunal: Int, accused: Ids, count: Int, until: Int })]),
		draft: Type.Union([Type.Null(), Type.Object({ group: Type.String(), leaders: Ids })]),
		gates: ExileApi.methods.gates.output,
	}),
]);

/** The facts' `Reads`, or undefined before the first minute set the run's minutes (request 1). */
export function readsOf(view: TribunalFactView): Reads | undefined {
	const minutes = view.state.minutes;
	if (minutes === undefined) return undefined;
	return { state: view.state, options: view.options, minutes, residents: view.residents, decisions: view.decisions, call: view.call.bind(view) };
}

export function stopOf(reads: Reads): Static<typeof StopFact> {
	return { endReason: endReason(reads) ?? null, busy: busy(reads), pursuing: pursuing(reads) };
}

export function sectionOf(reads: Reads): Static<typeof SectionFact> {
	if (!active(reads)) return null;
	const { state, options: spec } = reads;
	const plan = state.plan;
	const session = currentSession(state);
	const draft = state.draft;
	return {
		residents: residentsCount(reads),
		target: target(reads),
		exiled: [...exiledList(reads)],
		missing: missing(reads),
		actEnd: endOfAct(reads),
		rules: {
			voteMinutes: spec.voteMinutes,
			gateMinutes: spec.gateMinutes,
			ransom: { ...spec.ransom },
			bequestPerHeir: spec.bequestPerHeir,
			blocBonus: spec.factions?.blocBonus ?? null,
			fallbackGap: spec.fallbackGap,
		},
		plan: plan === undefined ? null : { tribunal: plan.tribunal, called: plan.called, by: plan.by, calledAt: plan.calledAt, opens: plan.opens, count: plan.count, factions: plan.factions },
		window: schedulingWindow(reads),
		cityCall: cityCall(reads) ?? null,
		session: session === undefined ? null : { tribunal: session.tribunal, accused: [...session.accused], count: session.count, until: session.until },
		draft: draft === undefined ? null : { group: draft.group, leaders: [...(draft.leaders ?? [])] },
		gates: reads.call(ExileApi, "gates", {}),
	};
}

/** The gamemaker's role on `level`: the last entry whose `fromLevel` it reached (old `roleOn`). */
function roleOn(ctx: TribunalCtx, level: number): string | undefined {
	return (ctx.options.gamemakerRoles ?? []).filter((entry) => entry.fromLevel <= level).at(-1)?.role;
}

/**
 * Old `#mayScheduleTribunal`: the gamemaker is offered `scheduleTribunal` when its look begins,
 * while the window is open and a resident in the city plays a level of the director role. The old
 * look kept the tool for the rest of the look, so a second plan in the same minute is let through
 * to `NOT_NOW` once the gamemaker planned one.
 */
export function mayScheduleTribunal(ctx: TribunalCtx): boolean {
	const plannedNow = ctx.log.ofType("tribunal", "tribunal_scheduled").some((event) => event.minute === ctx.minute && event.actor === "gamemaker");
	if (plannedNow) return true;
	if (!schedulingWindow(ctx).open) return false;
	return present(ctx).some((agent) => roleOn(ctx, ctx.call(ProgressionApi, "levelOf", { resident: agent })) === "director");
}
