/**
 * The director's actions (old `Director#run`, `#execute`, `#forEachTarget`, `#personal`, `#render`):
 * every action writes `director_action` first and `director_skipped` after it when it (or part of
 * it) was skipped, with the old reason. Each action is a command of the mechanic that owns it
 * (`ChannelsApi.post`, `CastApi.reveal`, `PuzzlesApi.revealFactor`, ...), run at once, so the lines
 * land where the old synchronous calls wrote them (a director reacting to a level-up writes before
 * the `submission`).
 */
import { CastApi, ChannelsApi, LedgerApi, PetitionsApi, ProgressionApi, PuzzlesApi } from "@swarmtales/mechanic-shared";
import { alive, isExiled, levelOf } from "./city.ts";
import { need, type ScriptCtx } from "./head.ts";
import type { Action, NoticeTarget } from "./rules.ts";
import { publishBands, publishSnapshot } from "./standings.ts";
import type { Origin } from "./state.ts";
import { placeholdersOf, renderTemplate } from "./template.ts";

/** The name the city signs its notices with. */
export const CITY = "CITY";

/** Who and what a firing is about (old `Firing`). */
export interface Occasion {
	readonly actor?: string;
	/** The other party of a pair trigger, e.g. the silent DM recipient. */
	readonly other?: string;
	readonly level?: number;
	/** `onHolderBehind`: the holder's level and what it holds. */
	readonly otherLevel?: number;
	readonly piece?: string;
	/** `{seats}`: the size of the collection the rule starts or names. */
	readonly seats?: number;
}

function auditOf(action: Action): "NPC_LEVEL_SET" | "DIRECTOR_PRIVACY_BREACH" | undefined {
	if (action.kind === "setCastLevel") return "NPC_LEVEL_SET";
	if (action.kind === "revealCollection") return "DIRECTOR_PRIVACY_BREACH";
	return undefined;
}

/** Old `#run`. */
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
		const skipped = execute(ctx, origin, action, occasion);
		if (skipped !== undefined) ctx.emit("director_skipped", { rule: origin.rule, action: action.kind, reason: skipped });
	}
}

/** Mints (`points > 0`) or burns (`points < 0`) for the director (old `adjustPoints`). */
function adjust(ctx: ScriptCtx, resident: string, points: number, reason: string): void {
	if (points > 0) need(ctx, LedgerApi, "mint", { account: resident, amount: points, reason });
	if (points < 0) need(ctx, LedgerApi, "burn", { account: resident, amount: -points, reason });
}

/** Executes one action; returns why it (or part of it) was skipped (old `#execute`). */
function execute(ctx: ScriptCtx, origin: Origin, action: Action, occasion: Occasion): string | undefined {
	switch (action.kind) {
		case "post":
			if (ctx.options.cast.includes(action.author) && !need(ctx, CastApi, "isActive", { cast: action.author })) return `cast member ${action.author} is not active`;
			need(ctx, ChannelsApi, "post", { author: action.author, text: render(ctx, action.text, occasion) });
			return undefined;
		case "notify":
			return forEachTarget(ctx, action.target, occasion, (agent) => {
				need(ctx, ChannelsApi, "notify", { to: agent, author: CITY, text: render(ctx, action.text, personal(occasion, agent)) });
				return undefined;
			});
		case "dm": {
			if (!need(ctx, CastApi, "isActive", { cast: action.from })) return `cast member ${action.from} is not active`;
			const from = action.from;
			return forEachTarget(ctx, action.to, occasion, (agent) => {
				need(ctx, ChannelsApi, "deliver", { from, to: agent, text: render(ctx, action.text, personal(occasion, agent)) });
				return undefined;
			});
		}
		case "setCastLevel":
			need(ctx, CastApi, "setLevel", { cast: action.cast, level: action.level });
			return undefined;
		case "revealCast":
			return need(ctx, CastApi, "reveal", { cast: action.cast }) ? undefined : `cast member ${action.cast} is not hidden`;
		case "retireCast":
			return need(ctx, CastApi, "retire", { cast: action.cast }) ? undefined : `cast member ${action.cast} is already retired`;
		case "grant":
			return forEachTarget(ctx, action.target, occasion, (agent) => {
				adjust(ctx, agent, action.points, action.reason);
				return undefined;
			});
		case "fine":
			return forEachTarget(ctx, action.target, occasion, (agent) => {
				adjust(ctx, agent, -action.points, action.reason);
				return undefined;
			});
		case "escrowTransfer":
			return forEachTarget(ctx, action.target, occasion, (agent) => {
				const paid = need(ctx, CastApi, "escrow", { cast: action.cast, to: agent, amount: action.points });
				return paid.ok ? undefined : `${agent}: ${paid.code}`;
			});
		case "unlockTools":
			return forEachTarget(ctx, action.target, occasion, (agent) => {
				need(ctx, ProgressionApi, "unlock", { resident: agent, tools: [...action.tools] });
				return undefined;
			});
		case "openPetition": {
			const spec = action.petition;
			const opened = need(ctx, PetitionsApi, "open", {
				id: spec.id,
				text: render(ctx, spec.text, occasion),
				threshold: spec.threshold,
				deadlineMinute: spec.deadlineMinute,
				visibility: spec.visibility,
				...(spec.against === undefined ? {} : { against: [...spec.against] }),
			});
			if (!opened.ok) return `petition ${spec.id} was already opened`;
			ctx.state.petitions.set(spec.id, { origin, spec });
			return undefined;
		}
		case "publishStandings":
			if (action.mode === "bands") publishBands(ctx, action.edgeSize);
			else publishSnapshot(ctx);
			return undefined;
		case "collectDms": {
			// Validation guarantees exactly one window; a relative one ends `forMinutes` after now.
			const untilMinute = action.untilMinute ?? ctx.minute + (action.forMinutes ?? 0);
			const first = resolveCount(action.first, alive(ctx).length);
			const started = need(ctx, CastApi, "startCollection", {
				into: action.into,
				cast: action.cast,
				first,
				untilMinute,
				distinctSenders: action.distinctSenders === true,
				...(action.afterSolve === undefined ? {} : { afterSolve: action.afterSolve }),
			});
			return started ? undefined : `collection ${action.into} already exists`;
		}
		case "revealCollection": {
			const revealed = need(ctx, CastApi, "revealCollection", { into: action.into, ...(action.header === undefined ? {} : { header: render(ctx, action.header, occasion) }) });
			return revealed.ok ? undefined : `collection ${action.into} does not exist`;
		}
		case "lottery": {
			const winner = need(ctx, CastApi, "drawLottery", { into: action.into, salt: origin.rule });
			if (winner === null) return `collection ${action.into} has no senders`;
			const via = `${origin.via === undefined ? "" : `${origin.via} / `}lottery ${action.into}`;
			runActions(ctx, { rule: origin.rule, via }, action.then, { actor: winner });
			return undefined;
		}
		case "revealFactor":
			return revealFactor(ctx, action.level, action.target, occasion);
	}
}

function revealFactor(ctx: ScriptCtx, level: number, target: "board" | NoticeTarget, occasion: Occasion): string | undefined {
	if (target === "board") {
		const revealed = need(ctx, PuzzlesApi, "revealFactor", { level, target: "board" });
		return revealed.ok ? undefined : revealed.detail;
	}
	const recipients: string[] = [];
	const skipped = forEachTarget(ctx, target, occasion, (agent) => {
		recipients.push(agent);
		return undefined;
	});
	if (recipients.length === 0) return skipped;
	const revealed = need(ctx, PuzzlesApi, "revealFactor", { level, target: recipients });
	if (!revealed.ok) return revealed.detail;
	// Prior holders are skipped quietly; the action counts as skipped only when it reached nobody new.
	const holders = revealed.agents.length > 0 ? [] : recipients;
	const reasons = [...(skipped === undefined ? [] : [skipped]), ...(holders.length === 0 ? [] : [`${holders.join(", ")} already ${holders.length === 1 ? "holds" : "hold"} it`])];
	return reasons.length === 0 ? undefined : reasons.join("; ");
}

/**
 * Runs `apply` for every resident the target resolves to (old `#forEachTarget`). Returns why the
 * action (or part of it) was skipped: unknown ids in a list, a target that reaches nobody, or the
 * failures `apply` reports.
 */
function forEachTarget(ctx: ScriptCtx, target: NoticeTarget, occasion: Occasion, apply: (agent: string) => string | undefined): string | undefined {
	const reasons: string[] = [];
	let agents: readonly string[];
	if (target === "all") agents = alive(ctx);
	else if (target === "actor") agents = occasion.actor === undefined || isExiled(ctx, occasion.actor) ? [] : [occasion.actor];
	else if ("onLevel" in target) agents = alive(ctx).filter((agent) => levelOf(ctx, agent) === target.onLevel);
	else {
		agents = target.filter((agent) => ctx.residents.has(agent) && !isExiled(ctx, agent));
		const unknown = target.filter((agent) => !ctx.residents.has(agent));
		if (unknown.length > 0) reasons.push(`unknown competitors ${unknown.join(", ")}`);
	}
	if (agents.length === 0) return [...reasons, "no competitor to target"].join("; ");
	for (const agent of agents) {
		const failed = apply(agent);
		if (failed !== undefined) reasons.push(failed);
	}
	return reasons.length === 0 ? undefined : reasons.join(", ");
}

/** Private texts address their recipient: `{actor}` falls back to them. */
function personal(occasion: Occasion, recipient: string): Occasion {
	return occasion.actor === undefined ? { ...occasion, actor: recipient } : occasion;
}

/** Old `#render`; each value is read only when the text names it. */
function render(ctx: ScriptCtx, text: string, occasion: Occasion): string {
	const named = new Set(placeholdersOf(text));
	const value = (name: string, read: () => string): Readonly<Record<string, string>> => (named.has(name) ? { [name]: read() } : {});
	const level = (): string => {
		const found = occasion.level ?? (occasion.actor === undefined ? undefined : levelOf(ctx, occasion.actor));
		return found === undefined ? "" : String(found);
	};
	return renderTemplate(text, {
		...value("actor", () => occasion.actor ?? ""),
		...value("other", () => occasion.other ?? ""),
		...value("minute", () => String(ctx.minute)),
		...value("level", level),
		...value("survivors", () => String(need(ctx, ProgressionApi, "bounds", {}).survivors)),
		...value("agents", () => String(ctx.residents.ids.length)),
		...value("otherLevel", () => (occasion.otherLevel === undefined ? "" : String(occasion.otherLevel))),
		...value("piece", () => occasion.piece ?? ""),
		...value("seats", () => (occasion.seats === undefined ? "" : String(occasion.seats))),
	});
}

/** A count fixed in the story, or a share of the residents in the city, rounded up, at least the minimum (old `resolveCount`). */
export function resolveCount(count: number | { readonly share: number; readonly minimum: number }, residents: number): number {
	return typeof count === "number" ? count : Math.max(count.minimum, Math.ceil(residents * count.share));
}
