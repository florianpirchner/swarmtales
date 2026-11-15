// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The triggers and conditions of the script (old `Director.startMinute`, `#onEnter`, `#onPetitionResolved`,
 * `#onCollect`, the checks, `#fire`, `#holds`, the cooldowns and `#seatsOf`), carried from `legacy`
 * `mechanics/script/src/triggers.ts` with the reads of this platform (`reads.ts`): a tick is the old minute, a
 * direct message is named by its number, and a petition's status is the script's own record of what it heard.
 */
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { ProgressionService } from "@swarmtales/mechanic-progression/contract";
import { resolveCount, runActions, type Occasion } from "./actions.ts";
import { need, type ScriptCtx } from "./head.ts";
import { alive, cast, isExiled, isPlayable, levelOf, teamsOf } from "./reads.ts";
import type { Condition, CooldownScope, Rule, Trigger } from "./rules.ts";

// The event triggers (`onEnter`, `onFirstEnter`, `onHolderBehind`, `onPetitionResolved`, `onCollect`) do nothing here.
function timeTrigger(ctx: ScriptCtx, rule: Rule, trigger: Trigger, tick: number): void {
	if (trigger.kind === "at" || trigger.kind === "every") {
		if (isDue(trigger, tick)) fire(ctx, rule, {});
	} else if (trigger.kind === "onAllPast") {
		checkAllPast(ctx, rule, trigger.level);
	} else if (trigger.kind === "onUnansweredDm") {
		checkUnanswered(ctx, rule, trigger.afterMinutes, tick);
	} else if (trigger.kind === "onTeamSplit") {
		checkSplit(ctx, rule, trigger.level, trigger.forMinutes, tick);
	} else if (trigger.kind === "onCollectionEnd" && cast.collection(trigger.into)?.untilMinute === tick) {
		// Every tick starts once, so the end tick alone marks a collection's end; a resumed run needs no extra state.
		fire(ctx, rule, {});
	}
}

function isDue(trigger: Extract<Trigger, { readonly kind: "at" | "every" }>, tick: number): boolean {
	if (trigger.kind === "at") return trigger.minute === tick;
	const from = trigger.from ?? trigger.minutes;
	const until = trigger.until ?? Number.POSITIVE_INFINITY;
	return tick >= from && tick <= until && (tick - from) % trigger.minutes === 0;
}

/**
 * Fires the triggers of the tick that start with time (old `startMinute` after its first two steps): `at`, `every`,
 * `onAllPast`, `onUnansweredDm`, `onTeamSplit` and `onCollectionEnd`, in the game's order of rules.
 *
 * @param ctx - The script's context.
 */
export function runTimeTriggers(ctx: ScriptCtx): void {
	for (const rule of ctx.state.rules) timeTrigger(ctx, rule, rule.trigger, ctx.tick);
}

/**
 * A resident entered `level` (old `#onEnter`, after `level_up` and the holder notices).
 *
 * @param ctx - The script's context.
 * @param agent - The resident.
 * @param level - The level it entered.
 */
export function onEnter(ctx: ScriptCtx, agent: string, level: number): void {
	const first = !ctx.state.enteredLevels.has(level);
	ctx.state.enteredLevels.add(level);
	for (const rule of ctx.state.rules) {
		const trigger = rule.trigger;
		if (trigger.kind === "onEnter" && trigger.level === level) fire(ctx, rule, { actor: agent, level });
		if (trigger.kind === "onFirstEnter" && trigger.level === level && first) fire(ctx, rule, { actor: agent, level });
		if (trigger.kind === "onAllPast") checkAllPast(ctx, rule, trigger.level);
		if (trigger.kind === "onHolderBehind" && trigger.level === level) fireBehind(ctx, rule, agent, level);
	}
}

// One firing per holder of what the resident needs that stands on a lower level.
function fireBehind(ctx: ScriptCtx, rule: Rule, agent: string, level: number): void {
	for (const behind of need(ctx, ProgressionService, "holdersBehind", { resident: agent, level })) {
		fire(ctx, rule, { actor: agent, other: behind.holder, level, otherLevel: behind.level, piece: behind.piece });
	}
}

/**
 * A petition was resolved: the opening rule's `onPass` or `onFail`, then the `onPetitionResolved` rules (old
 * `#onPetitionResolved`).
 *
 * @param ctx - The script's context.
 * @param id - The petition.
 * @param outcome - How it ended.
 */
export function onPetitionResolved(ctx: ScriptCtx, id: string, outcome: "passed" | "failed"): void {
	ctx.state.statuses.set(id, outcome);
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

/**
 * A sender's first message in a collection; with `distinctSenders` every collected message is one (old `#onCollect`).
 *
 * @param ctx - The script's context.
 * @param into - The collection.
 * @param sender - The resident that sent it.
 */
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

function checkUnanswered(ctx: ScriptCtx, rule: Rule, afterMinutes: number, tick: number): void {
	let handled = ctx.state.handledDms.get(rule.id);
	if (handled === undefined) {
		handled = new Set();
		ctx.state.handledDms.set(rule.id, handled);
	}
	for (const record of need(ctx, ChannelsService, "dmRecords", {})) {
		if (handled.has(record.number) || record.answered || tick - record.tick < afterMinutes) continue;
		handled.add(record.number);
		fire(ctx, rule, { actor: record.from, other: record.to });
	}
}

function checkSplit(ctx: ScriptCtx, rule: Rule, level: number, forMinutes: number, tick: number): void {
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
		const since = ctx.state.splitSince.get(key) ?? tick;
		ctx.state.splitSince.set(key, since);
		if (tick - since < forMinutes || ctx.state.splitAnnounced.has(key)) return;
		ctx.state.splitAnnounced.add(key);
		const straggler = [...members].sort((a, b) => levelOf(ctx, a) - levelOf(ctx, b) || a.localeCompare(b))[0];
		fire(ctx, rule, { level, ...(straggler === undefined ? {} : { actor: straggler }) });
	});
}

// Old `#fire`: every condition holds, then the marks and cooldowns, then the actions.
function fire(ctx: ScriptCtx, rule: Rule, occasion: Occasion): void {
	if (!rule.when.every((condition) => holds(ctx, rule, condition, occasion))) return;
	ctx.state.fired.add(rule.id);
	for (const key of cooldownKeys(rule, occasion)) ctx.state.lastFired.set(key, ctx.tick);
	const seats = seatsOf(ctx, rule);
	runActions(ctx, { rule: rule.id }, rule.actions, seats === undefined ? occasion : { ...occasion, seats });
}

function levelsHold(ctx: ScriptCtx, condition: Extract<Condition, { readonly kind: "minLevelReached" | "competitorsAtLevel" }>): boolean {
	const levels = alive(ctx).map((agent) => levelOf(ctx, agent));
	if (condition.kind === "minLevelReached") return levels.filter((level) => level >= condition.level).length >= condition.count;
	const count = levels.filter((level) => level === condition.level).length;
	return count >= (condition.min ?? 0) && count <= (condition.max ?? Number.POSITIVE_INFINITY);
}

function collectionHolds(ctx: ScriptCtx, into: string, open: boolean): boolean {
	const collection = cast.collection(into);
	if (collection === undefined) return false;
	return open ? ctx.tick < collection.untilMinute && collection.entries < collection.first : ctx.tick >= collection.untilMinute;
}

function holds(ctx: ScriptCtx, rule: Rule, condition: Condition, occasion: Occasion): boolean {
	switch (condition.kind) {
		case "minLevelReached":
		case "competitorsAtLevel":
			return levelsHold(ctx, condition);
		case "petitionStatus":
			return ctx.state.statuses.get(condition.petition) === condition.status;
		case "castActive":
			return cast.isActive(condition.cast);
		case "collectionOpen":
		case "collectionEnded":
			return collectionHolds(ctx, condition.into, condition.kind === "collectionOpen");
		case "onceOnly":
			return !ctx.state.fired.has(rule.id);
		case "cooldown": {
			const last = ctx.state.lastFired.get(cooldownKey(rule, condition.per, occasion));
			return last === undefined || ctx.tick - last >= condition.minutes;
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

// `{seats}` of a rule: the size its own `collectDms` will have in a city this size, else the size of the collection its trigger or a condition names (old `#seatsOf`).
function seatsOf(ctx: ScriptCtx, rule: Rule): number | undefined {
	const starts = rule.actions.find((action) => action.kind === "collectDms");
	if (starts?.kind === "collectDms") return resolveCount(starts.first, alive(ctx).length);
	const trigger = rule.trigger;
	const named =
		trigger.kind === "onCollect" || trigger.kind === "onCollectionEnd"
			? trigger.into
			: rule.when.flatMap((condition) => (condition.kind === "collectionOpen" || condition.kind === "collectionEnded" ? [condition.into] : []))[0];
	return named === undefined ? undefined : cast.collection(named)?.first;
}
