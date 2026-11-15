// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The actions of a rule that fired (old `Director#run` and `#execute`), carried from `legacy`
 * `mechanics/script/src/actions.ts`: every action writes `director_action` first and `director_skipped` after it when
 * it (or part of it) was skipped, with the old reason. Each action is a command of the mechanic that owns it
 * (`channels.post`, `cast.reveal`, `ledger.mint`, `petitions.open`, ...), run at once in the frame of the firing, so
 * its lines land where the old synchronous calls wrote them: as the actor `script` in `directorMinute`, in the frame
 * of the resident's call for a firing on `level_entered`. The script makes no tool call for an action: no oracle
 * file holds a call of the actor `script` but `directorMinute`. A message of a member goes through `channels.deliver`, a
 * city factor through the command `revealFactor` of the service `deal` of `puzzles` (decision A76, erratum J155).
 */
import { CastService } from "@swarmtales/mechanic-cast/contract";
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { LedgerService } from "@swarmtales/mechanic-ledger/contract";
import { PetitionsService } from "@swarmtales/mechanic-petitions/contract";
import { ProgressionService } from "@swarmtales/mechanic-progression/contract";
import { PuzzlesService } from "@swarmtales/mechanic-puzzles/contract";
import { need, type ScriptCtx } from "./head.ts";
import { alive, castActive } from "./reads.ts";
import type { Action, NoticeTarget } from "./rules.ts";
import { publishBands, publishSnapshot } from "./standings.ts";
import type { Origin } from "./state.ts";
import { forEachTarget, personal, render } from "./targets.ts";

/** The name the city signs its notices with. */
const CITY = "CITY";

/**
 * Who and what a firing is about (old `Firing`).
 *
 * @public
 */
export interface Occasion {
	/** The resident the firing is about. */
	readonly actor?: string;
	/** The other party of a pair trigger, for example the silent receiver of a direct message. */
	readonly other?: string;
	/** The level of the trigger. */
	readonly level?: number;
	/** `onHolderBehind`: the holder's level. */
	readonly otherLevel?: number;
	/** `onHolderBehind`: what the holder holds. */
	readonly piece?: string;
	/** `{seats}`: the size of the collection the rule starts or names. */
	readonly seats?: number;
}

type ActionOf = { readonly [K in Action["kind"]]: Extract<Action, { readonly kind: K }> };
type Handlers = { readonly [K in keyof ActionOf]: (ctx: ScriptCtx, action: ActionOf[K], origin: Origin, occasion: Occasion) => string | undefined };

function auditOf(action: Action): "NPC_LEVEL_SET" | "DIRECTOR_PRIVACY_BREACH" | undefined {
	if (action.kind === "setCastLevel") return "NPC_LEVEL_SET";
	if (action.kind === "revealCollection") return "DIRECTOR_PRIVACY_BREACH";
	return undefined;
}

/**
 * Runs the actions of a firing in order (old `#run`).
 *
 * @param ctx - The script's context.
 * @param origin - The rule and the path of the list.
 * @param actions - The actions.
 * @param occasion - Who and what the firing is about.
 * @throws RangeError when an action needs a mechanic the game did not load (the kernel ends the run).
 */
export function runActions(ctx: ScriptCtx, origin: Origin, actions: readonly Action[], occasion: Occasion): void {
	for (const action of actions) {
		const audit = auditOf(action);
		ctx.emit("director_action", {
			rule: origin.rule,
			action: action.kind,
			...(occasion.actor === undefined ? {} : { actor: occasion.actor }),
			...(origin.via === undefined ? {} : { via: origin.via }),
			...(audit === undefined ? {} : { audit }),
		});
		const skipped = execute(ctx, action.kind, action, origin, occasion);
		if (skipped !== undefined) ctx.emit("director_skipped", { rule: origin.rule, action: action.kind, reason: skipped });
	}
}

function execute<K extends keyof ActionOf>(ctx: ScriptCtx, kind: K, action: ActionOf[K], origin: Origin, occasion: Occasion): string | undefined {
	const handler: Handlers[K] = HANDLERS[kind];
	return handler(ctx, action, origin, occasion);
}

// Mints (`points > 0`) or burns (`points < 0`) for the script (old `adjustPoints`).
function adjust(ctx: ScriptCtx, resident: string, points: number, reason: string): string | undefined {
	if (points > 0) need(ctx, LedgerService, "mint", { account: resident, amount: points, reason });
	if (points < 0) need(ctx, LedgerService, "burn", { account: resident, amount: -points, reason });
	return undefined;
}

const inactive = (member: string): string => `cast member ${member} is not active`;

const HANDLERS: Handlers = {
	post: (ctx, action, _origin, occasion) => {
		if (ctx.options.cast.includes(action.author) && !castActive(ctx, action.author)) return inactive(action.author);
		need(ctx, ChannelsService, "post", { author: action.author, text: render(ctx, action.text, occasion) });
		return undefined;
	},
	notify: (ctx, action, _origin, occasion) =>
		forEachTarget(ctx, action.target, occasion, (agent) => {
			need(ctx, ChannelsService, "notify", { to: agent, author: CITY, text: render(ctx, action.text, personal(occasion, agent)) });
			return undefined;
		}),
	dm: (ctx, action, _origin, occasion) => {
		if (!castActive(ctx, action.from)) return inactive(action.from);
		return forEachTarget(ctx, action.to, occasion, (agent) => {
			need(ctx, ChannelsService, "deliver", { from: action.from, to: agent, text: render(ctx, action.text, personal(occasion, agent)) });
			return undefined;
		});
	},
	setCastLevel: (ctx, action) => {
		need(ctx, CastService, "setLevel", { cast: action.cast, level: action.level });
		return undefined;
	},
	revealCast: (ctx, action) => (need(ctx, CastService, "reveal", { cast: action.cast }) ? undefined : `cast member ${action.cast} is not hidden`),
	retireCast: (ctx, action) => (need(ctx, CastService, "retire", { cast: action.cast }) ? undefined : `cast member ${action.cast} is already retired`),
	grant: (ctx, action, _origin, occasion) => forEachTarget(ctx, action.target, occasion, (agent) => adjust(ctx, agent, action.points, action.reason)),
	fine: (ctx, action, _origin, occasion) => forEachTarget(ctx, action.target, occasion, (agent) => adjust(ctx, agent, -action.points, action.reason)),
	escrowTransfer: (ctx, action, _origin, occasion) =>
		forEachTarget(ctx, action.target, occasion, (agent) => {
			const paid = need(ctx, CastService, "escrow", { cast: action.cast, to: agent, amount: action.points });
			return paid.ok ? undefined : `${agent}: ${paid.code}`;
		}),
	unlockTools: (ctx, action, _origin, occasion) =>
		forEachTarget(ctx, action.target, occasion, (agent) => {
			need(ctx, ProgressionService, "unlock", { resident: agent, tools: [...action.tools] });
			return undefined;
		}),
	openPetition: (ctx, action, origin, occasion) => {
		const spec = action.petition;
		const opened = need(ctx, PetitionsService, "open", {
			id: spec.id,
			text: render(ctx, spec.text, occasion),
			threshold: spec.threshold,
			deadlineMinute: spec.deadlineMinute,
			visibility: spec.visibility,
			...(spec.against === undefined ? {} : { against: [...spec.against] }),
		});
		if (!opened.ok) return `petition ${spec.id} was already opened`;
		ctx.state.petitions.set(spec.id, { origin, spec });
		// The old status was read from the log at once; the listener of `petition_opened` runs after the step.
		ctx.state.statuses.set(spec.id, "open");
		return undefined;
	},
	publishStandings: (ctx, action) => {
		if (action.mode === "bands") publishBands(ctx, action.edgeSize);
		else publishSnapshot(ctx);
		return undefined;
	},
	collectDms: (ctx, action) => {
		// The game's data holds one window; a relative one ends `forMinutes` after now.
		const untilMinute = action.untilMinute ?? ctx.tick + (action.forMinutes ?? 0);
		const first = resolveCount(action.first, alive(ctx).length);
		const started = need(ctx, CastService, "startCollection", {
			into: action.into,
			cast: action.cast,
			first,
			untilMinute,
			distinctSenders: action.distinctSenders === true,
			...(action.afterSolve === undefined ? {} : { afterSolve: action.afterSolve }),
		});
		return started ? undefined : `collection ${action.into} already exists`;
	},
	revealCollection: (ctx, action, _origin, occasion) => {
		const revealed = need(ctx, CastService, "revealCollection", { into: action.into, ...(action.header === undefined ? {} : { header: render(ctx, action.header, occasion) }) });
		return revealed.ok ? undefined : `collection ${action.into} does not exist`;
	},
	lottery: (ctx, action, origin) => {
		const winner = need(ctx, CastService, "drawLottery", { into: action.into, salt: origin.rule });
		if (winner === null) return `collection ${action.into} has no senders`;
		const via = `${origin.via === undefined ? "" : `${origin.via} / `}lottery ${action.into}`;
		runActions(ctx, { rule: origin.rule, via }, action.then, { actor: winner });
		return undefined;
	},
	revealFactor: (ctx, action, _origin, occasion) => revealFactor(ctx, action.level, action.target, occasion),
};

// The city factor of an additive level through `deal` (old `revealFactor`): the board, or the residents the target
// reaches; prior holders are skipped quietly, and the action counts as skipped only when it reached nobody new.
function revealFactor(ctx: ScriptCtx, level: number, target: "board" | NoticeTarget, occasion: Occasion): string | undefined {
	if (target === "board") {
		const revealed = need(ctx, PuzzlesService, "revealFactor", { level, target: "board" });
		return revealed.ok ? undefined : revealed.detail;
	}
	const recipients: string[] = [];
	const skipped = forEachTarget(ctx, target, occasion, (agent) => {
		recipients.push(agent);
		return undefined;
	});
	if (recipients.length === 0) return skipped;
	const revealed = need(ctx, PuzzlesService, "revealFactor", { level, target: recipients });
	if (!revealed.ok) return revealed.detail;
	const holders = revealed.agents.length > 0 ? [] : recipients;
	const reasons = [...(skipped === undefined ? [] : [skipped]), ...(holders.length === 0 ? [] : [`${holders.join(", ")} already ${holders.length === 1 ? "holds" : "hold"} it`])];
	return reasons.length === 0 ? undefined : reasons.join("; ");
}

/**
 * A count fixed in the game, or a share of the residents in the city, rounded up, at least the minimum (old
 * `resolveCount`).
 *
 * @param count - The count or the share.
 * @param residents - The residents in the city.
 * @returns The count.
 *
 * @public
 */
export function resolveCount(count: number | { readonly share: number; readonly minimum: number }, residents: number): number {
	return typeof count === "number" ? count : Math.max(count.minimum, Math.ceil(residents * count.share));
}
