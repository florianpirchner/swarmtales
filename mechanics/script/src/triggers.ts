/**
 * The director's triggers and conditions (old `Director.startMinute`, `#onEnter`,
 * `#onPetitionResolved`, `#onCollect`, the checks, `#fire`, `#holds`, the cooldowns and `#seatsOf`).
 * Petitions expire (petitions) and feast windows are shortened (cast) before these run, as the old
 * `startMinute` began with them.
 */
import { CastApi, ChannelsApi, ProgressionApi } from "@swarmtales/mechanic-shared";
import { runActions, resolveCount, type Occasion } from "./actions.ts";
import { alive, collectionOf, isExiled, isPlayable, levelOf, petitionStatus, teamsOf } from "./city.ts";
import { need, type ScriptCtx } from "./head.ts";
import type { Condition, CooldownScope, Rule } from "./rules.ts";

/** Fires the time-based triggers of the minute (old `startMinute` after its first two steps). */
export function startMinute(ctx: ScriptCtx): void {
	const minute = ctx.minute;
	for (const rule of ctx.state.rules) {
		const trigger = rule.trigger;
		switch (trigger.kind) {
			case "at":
				if (trigger.minute === minute) fire(ctx, rule, {});
				break;
			case "every": {
				const from = trigger.from ?? trigger.minutes;
				const until = trigger.until ?? Number.POSITIVE_INFINITY;
				if (minute >= from && minute <= until && (minute - from) % trigger.minutes === 0) fire(ctx, rule, {});
				break;
			}
			case "onAllPast":
				checkAllPast(ctx, rule, trigger.level);
				break;
			case "onUnansweredDm":
				checkUnanswered(ctx, rule, trigger.afterMinutes, minute);
				break;
			case "onTeamSplit":
				checkSplit(ctx, rule, trigger.level, trigger.forMinutes, minute);
				break;
			case "onCollectionEnd":
				// Every minute starts once, so the end minute alone marks the window's end; a resumed run needs no extra state.
				if (collectionOf(ctx, trigger.into)?.untilMinute === minute) fire(ctx, rule, {});
				break;
			case "onFirstEnter":
			case "onEnter":
			case "onPetitionResolved":
			case "onCollect":
			case "onHolderBehind":
				break;
		}
	}
}

/** A resident entered `level` (old `#onEnter`, after `level_up` and the holder notices). */
export function onEnter(ctx: ScriptCtx, agent: string, level: number): void {
	const first = !ctx.state.enteredLevels.has(level);
	ctx.state.enteredLevels.add(level);
	for (const rule of ctx.state.rules) {
		const trigger = rule.trigger;
		if (trigger.kind === "onEnter" && trigger.level === level) fire(ctx, rule, { actor: agent, level });
		if (trigger.kind === "onFirstEnter" && trigger.level === level && first) fire(ctx, rule, { actor: agent, level });
		if (trigger.kind === "onAllPast") checkAllPast(ctx, rule, trigger.level);
		if (trigger.kind === "onHolderBehind" && trigger.level === level) {
			for (const behind of need(ctx, ProgressionApi, "holdersBehind", { resident: agent, level })) {
				fire(ctx, rule, { actor: agent, other: behind.holder, level, otherLevel: behind.level, piece: behind.piece });
			}
		}
	}
}

/** A petition was resolved: the opening rule's `onPass`/`onFail`, then the `onPetitionResolved` rules (old `#onPetitionResolved`). */
export function onPetitionResolved(ctx: ScriptCtx, id: string, outcome: "passed" | "failed"): void {
	const opened = ctx.state.petitions.get(id);
	if (opened !== undefined) {
		const via = `${opened.origin.via === undefined ? "" : `${opened.origin.via} / `}petition ${id} ${outcome}`;
		runActions(ctx, { rule: opened.origin.rule, via }, outcome === "passed" ? opened.spec.onPass : opened.spec.onFail, {});
	}
	for (const rule of ctx.state.rules) {
		const trigger = rule.trigger;
		if (trigger.kind === "onPetitionResolved" && trigger.petition === id && trigger.outcome === outcome) fire(ctx, rule, {});
	}
}

/** A sender's first DM in a collection; with `distinctSenders` every collected DM is one (old `#onCollect`). */
export function onCollect(ctx: ScriptCtx, into: string, sender: string): void {
	for (const rule of ctx.state.rules) {
		if (rule.trigger.kind === "onCollect" && rule.trigger.into === into) fire(ctx, rule, { actor: sender });
	}
}

function checkAllPast(ctx: ScriptCtx, rule: Rule, level: number): void {
	if (ctx.state.allPastDone.has(rule.id)) return;
	if (!alive(ctx).every((agent) => levelOf(ctx, agent) > level)) return;
	ctx.state.allPastDone.add(rule.id);
	fire(ctx, rule, { level });
}

function checkUnanswered(ctx: ScriptCtx, rule: Rule, afterMinutes: number, minute: number): void {
	let handled = ctx.state.handledDms.get(rule.id);
	if (handled === undefined) {
		handled = new Set();
		ctx.state.handledDms.set(rule.id, handled);
	}
	for (const record of need(ctx, ChannelsApi, "dmRecords", {})) {
		if (handled.has(record.id) || record.answered || minute - record.minute < afterMinutes) continue;
		handled.add(record.id);
		fire(ctx, rule, { actor: record.from, other: record.to });
	}
}

function checkSplit(ctx: ScriptCtx, rule: Rule, level: number, forMinutes: number, minute: number): void {
	// Teams only exist for levels in play (isolated level runs skip the rest).
	if (!isPlayable(ctx, level)) return;
	teamsOf(ctx, level).forEach((team, index) => {
		const members = team.filter((member) => !isExiled(ctx, member));
		if (members.length < 2) return;
		const key = `${rule.id}:${String(index)}`;
		const levels = members.map((member) => levelOf(ctx, member));
		// A team is split only once someone has reached its level while others lag behind.
		if (Math.max(...levels) < level || Math.min(...levels) === Math.max(...levels)) {
			ctx.state.splitSince.delete(key);
			return;
		}
		const since = ctx.state.splitSince.get(key) ?? minute;
		ctx.state.splitSince.set(key, since);
		if (minute - since < forMinutes || ctx.state.splitAnnounced.has(key)) return;
		ctx.state.splitAnnounced.add(key);
		const straggler = [...members].sort((a, b) => levelOf(ctx, a) - levelOf(ctx, b) || a.localeCompare(b))[0];
		fire(ctx, rule, { level, ...(straggler === undefined ? {} : { actor: straggler }) });
	});
}

/** Old `#fire`: every condition holds, then the marks and cooldowns, then the actions. */
function fire(ctx: ScriptCtx, rule: Rule, occasion: Occasion): void {
	if (!rule.when.every((condition) => holds(ctx, rule, condition, occasion))) return;
	ctx.state.fired.add(rule.id);
	for (const key of cooldownKeys(rule, occasion)) ctx.state.lastFired.set(key, ctx.minute);
	const seats = seatsOf(ctx, rule);
	runActions(ctx, { rule: rule.id }, rule.actions, seats === undefined ? occasion : { ...occasion, seats });
}

function holds(ctx: ScriptCtx, rule: Rule, condition: Condition, occasion: Occasion): boolean {
	const levels = (): readonly number[] => alive(ctx).map((agent) => levelOf(ctx, agent));
	switch (condition.kind) {
		case "minLevelReached":
			return levels().filter((level) => level >= condition.level).length >= condition.count;
		case "competitorsAtLevel": {
			const count = levels().filter((level) => level === condition.level).length;
			return count >= (condition.min ?? 0) && count <= (condition.max ?? Number.POSITIVE_INFINITY);
		}
		case "petitionStatus":
			return petitionStatus(ctx, condition.petition) === condition.status;
		case "castActive":
			return need(ctx, CastApi, "isActive", { cast: condition.cast });
		case "collectionOpen": {
			const collection = collectionOf(ctx, condition.into);
			return collection !== undefined && ctx.minute < collection.untilMinute && collection.entries < collection.first;
		}
		case "collectionEnded": {
			const collection = collectionOf(ctx, condition.into);
			return collection !== undefined && ctx.minute >= collection.untilMinute;
		}
		case "onceOnly":
			return !ctx.state.fired.has(rule.id);
		case "cooldown": {
			const last = ctx.state.lastFired.get(cooldownKey(rule, condition.per, occasion));
			return last === undefined || ctx.minute - last >= condition.minutes;
		}
	}
}

function cooldownKeys(rule: Rule, occasion: Occasion): readonly string[] {
	return rule.when.flatMap((condition) => (condition.kind === "cooldown" ? [cooldownKey(rule, condition.per, occasion)] : []));
}

function cooldownKey(rule: Rule, per: CooldownScope, occasion: Occasion): string {
	switch (per) {
		case "rule":
			return rule.id;
		case "actor":
			return `${rule.id}|${occasion.actor ?? "-"}`;
		case "pair":
			return `${rule.id}|${occasion.actor ?? "-"}|${occasion.other ?? "-"}`;
	}
}

/**
 * `{seats}` of a rule: the size its own `collectDms` will have in a city this size, else the size of
 * the collection its trigger or a condition names (old `#seatsOf`).
 */
function seatsOf(ctx: ScriptCtx, rule: Rule): number | undefined {
	const starts = rule.actions.find((action) => action.kind === "collectDms");
	if (starts?.kind === "collectDms") return resolveCount(starts.first, alive(ctx).length);
	const trigger = rule.trigger;
	const named =
		trigger.kind === "onCollect" || trigger.kind === "onCollectionEnd"
			? trigger.into
			: rule.when.flatMap((condition) => (condition.kind === "collectionOpen" || condition.kind === "collectionEnded" ? [condition.into] : []))[0];
	return named === undefined ? undefined : collectionOf(ctx, named)?.first;
}
