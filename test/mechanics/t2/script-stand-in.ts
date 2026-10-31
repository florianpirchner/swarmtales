/**
 * A stand-in for the script mechanic (another team's): it runs a story's director rules of the
 * kinds `at` (time triggers) and `onPetitionResolved` through the APIs of channels, petitions and
 * cast, in the old director's order, for the actions the T2 mechanics serve: `post`, `notify`,
 * `escrowTransfer`, `revealCast`, `openPetition` (with its `onPass`/`onFail` run when it resolves),
 * `collectDms`, `revealCollection` and `lottery` (with `{actor}` as the winner). It writes no
 * `director_*` lines, so it is compared through the lines the T2 mechanics own.
 */
import { Type } from "typebox";
import type { Action, AnyStory, MechanicUse } from "@swarmtales/contracts";
import { resolveCount } from "@swarmtales/kernel";
import { defineMechanic } from "@swarmtales/kernel";
import { CastApi, ChannelsApi, HOOK_ORDER, PetitionsApi, PetitionsEvents } from "@swarmtales/mechanic-shared";

const CITY = "CITY";

interface Opened {
	/** The rule that opened it: the lottery's salt (old `drawLottery(into, origin.rule)`). */
	readonly rule: string;
	readonly onPass: readonly Action[];
	readonly onFail: readonly Action[];
}

/** The `onPass`/`onFail` of every petition a rule opens, nested ones included. */
function petitionsIn(actions: readonly Action[], into: Map<string, Opened>, rule: string): void {
	for (const action of actions) {
		if (action.kind === "openPetition") {
			into.set(action.petition.id, { rule, onPass: action.petition.onPass, onFail: action.petition.onFail });
			petitionsIn([...action.petition.onPass, ...action.petition.onFail], into, rule);
		} else if (action.kind === "lottery") petitionsIn(action.then, into, rule);
	}
}

export function scriptStandIn(story: AnyStory): MechanicUse {
	const specs = new Map<string, Opened>();
	for (const rule of story.director) petitionsIn(rule.actions, specs, rule.id);
	return defineMechanic(
		{ id: "script", summary: "Stand-in script: runs the time rules and petition chains of a story.", options: Type.Object({}), state: (): undefined => undefined, events: {}, requires: [ChannelsApi, PetitionsApi, CastApi], prompts: { "tools/readBoard": [] } },
		(kit) => {
			type Ctx = Parameters<Parameters<typeof kit.listen<typeof PetitionsEvents, "petition_resolved">>[2]>[1];
			const render = (text: string, actor: string | undefined): string => (actor === undefined ? text : text.replaceAll("{actor}", actor));
			const run = (ctx: Pick<Ctx, "call" | "minute" | "residents">, rule: string, actions: readonly Action[], actor?: string): void => {
				for (const action of actions) {
					switch (action.kind) {
						case "post":
							ctx.call(ChannelsApi, "post", { author: action.author, text: render(action.text, actor) });
							break;
						case "notify":
							ctx.call(ChannelsApi, "notify", { to: action.target === "actor" && actor !== undefined ? actor : String(action.target), author: CITY, text: render(action.text, actor) });
							break;
						case "escrowTransfer":
							if (actor !== undefined) ctx.call(CastApi, "escrow", { cast: action.cast, to: actor, amount: action.points });
							break;
						case "revealCast":
							ctx.call(CastApi, "reveal", { cast: action.cast });
							break;
						case "openPetition":
							ctx.call(PetitionsApi, "open", { id: action.petition.id, text: render(action.petition.text, actor), threshold: action.petition.threshold, deadlineMinute: action.petition.deadlineMinute, visibility: action.petition.visibility, ...(action.petition.against === undefined ? {} : { against: [...action.petition.against] }) });
							break;
						case "collectDms": {
							const until = action.untilMinute ?? ctx.minute + (action.forMinutes ?? 0);
							ctx.call(CastApi, "startCollection", { into: action.into, cast: action.cast, first: resolveCount(action.first, ctx.residents.ids.length), untilMinute: until, distinctSenders: action.distinctSenders === true, ...(action.afterSolve === undefined ? {} : { afterSolve: action.afterSolve }) });
							break;
						}
						case "revealCollection":
							ctx.call(CastApi, "revealCollection", { into: action.into, ...(action.header === undefined ? {} : { header: render(action.header, actor) }) });
							break;
						case "lottery": {
							const winner = ctx.call(CastApi, "drawLottery", { into: action.into, salt: rule });
							if (winner !== null) run(ctx, rule, action.then, winner);
							break;
						}
						default:
							throw new Error(`the script stand-in does not run ${action.kind}`);
					}
				}
			};
			return {
				hooks: {
					minuteStarted: {
						order: HOOK_ORDER.minuteStarted.script,
						run: (ctx) => {
							for (const rule of story.director) if (rule.trigger.kind === "at" && rule.trigger.minute === ctx.minute) run(ctx, rule.id, rule.actions);
						},
					},
				},
				listeners: [
					kit.listen(PetitionsEvents, "petition_resolved", (payload, ctx) => {
						const spec = specs.get(payload.petition);
						if (spec !== undefined) run(ctx, spec.rule, payload.outcome === "passed" ? spec.onPass : spec.onFail);
					}),
				],
			};
		},
	).with();
}
