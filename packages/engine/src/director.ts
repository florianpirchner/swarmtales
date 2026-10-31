/**
 * Director interpreter (SPEC 10).
 *
 * Executes the story script: a closed vocabulary of triggers, conditions and
 * actions (discriminated unions, exhaustive switches). The director carries no
 * story content of its own; every text it emits comes from the story. Every
 * executed action is logged with the ID of the rule that caused it.
 */
import { CITY, type CompetitorId } from "../core/ids.ts";
import { assertNever } from "../core/result.ts";
import { resolveCount } from "../story/counts.ts";
import { renderTemplate } from "../story/templates.ts";
import {
	ACTION_KINDS,
	CONDITION_KINDS,
	TRIGGER_KINDS,
	type Action,
	type Condition,
	type CooldownScope,
	type DirectorRule,
	type NoticeTarget,
	type PetitionSpec,
} from "../story/types.ts";
import type { DirectorSupport } from "../story/validate.ts";
import type { AuditTag, EventBus } from "./events.ts";
import type { Resolution } from "./petitions.ts";
import type { World } from "./world.ts";

/** The engine runs every primitive of SPEC 10. */
export const DIRECTOR_SUPPORT: DirectorSupport = {
	triggers: TRIGGER_KINDS,
	conditions: CONDITION_KINDS,
	actions: ACTION_KINDS,
};

/** Who and what a firing is about. */
interface Firing {
	readonly actor?: CompetitorId;
	/** The other party of a pair trigger, e.g. the silent DM recipient. */
	readonly other?: CompetitorId;
	readonly level?: number;
	/** `onHolderBehind`: the holder's level and what it holds. */
	readonly otherLevel?: number;
	readonly piece?: string;
	/** `{seats}`: the size of the collection the rule starts or names (v09). */
	readonly seats?: number;
}

/** Where an action list comes from: its rule and, for nested lists, the path. */
interface Origin {
	readonly rule: string;
	readonly via?: string;
}

interface OpenedPetition {
	readonly origin: Origin;
	readonly spec: PetitionSpec;
}

/**
 * Firing state of the director for run snapshots (SPEC 17): once-only and
 * all-past marks, cooldowns, handled DMs, team splits and the petitions it
 * opened (by ID; their specs come back from the story's rules).
 */
export interface DirectorSnapshot {
	readonly fired: readonly string[];
	readonly lastFired: readonly { readonly key: string; readonly minute: number }[];
	readonly enteredLevels: readonly number[];
	readonly allPastDone: readonly string[];
	readonly handledDms: readonly { readonly rule: string; readonly dms: readonly number[] }[];
	readonly splitSince: readonly { readonly key: string; readonly minute: number }[];
	readonly splitAnnounced: readonly string[];
	readonly petitions: readonly { readonly petition: string; readonly rule: string; readonly via?: string }[];
}

export class Director {
	readonly #rules: readonly DirectorRule[];
	readonly #world: World;
	readonly #bus: EventBus;
	readonly #fired = new Set<string>();
	readonly #lastFired = new Map<string, number>();
	readonly #enteredLevels = new Set<number>();
	readonly #allPastDone = new Set<string>();
	readonly #handledDms = new Map<string, Set<number>>();
	readonly #splitSince = new Map<string, number>();
	readonly #splitAnnounced = new Set<string>();
	readonly #petitions = new Map<string, OpenedPetition>();

	constructor(rules: readonly DirectorRule[], world: World, bus: EventBus) {
		this.#rules = rules;
		this.#world = world;
		this.#bus = bus;
		world.onLevelEnter((agent, level) => {
			this.#onEnter(agent, level);
		});
		world.onPetitionResolved((resolution) => {
			this.#onPetitionResolved(resolution);
		});
		world.onCollect((into, sender) => {
			this.#onCollect(into, sender);
		});
	}

	snapshot(): DirectorSnapshot {
		return {
			fired: [...this.#fired],
			lastFired: [...this.#lastFired].map(([key, minute]) => ({ key, minute })),
			enteredLevels: [...this.#enteredLevels],
			allPastDone: [...this.#allPastDone],
			handledDms: [...this.#handledDms].map(([rule, dms]) => ({ rule, dms: [...dms] })),
			splitSince: [...this.#splitSince].map(([key, minute]) => ({ key, minute })),
			splitAnnounced: [...this.#splitAnnounced],
			petitions: [...this.#petitions].map(([petition, opened]) => ({
				petition,
				rule: opened.origin.rule,
				...(opened.origin.via === undefined ? {} : { via: opened.origin.via }),
			})),
		};
	}

	/**
	 * Restores the firing state. A petition whose spec the story's rules no
	 * longer contain loses its pass and fail actions; it still resolves in the world.
	 */
	restore(state: DirectorSnapshot): void {
		this.#fired.clear();
		for (const rule of state.fired) this.#fired.add(rule);
		this.#lastFired.clear();
		for (const entry of state.lastFired) this.#lastFired.set(entry.key, entry.minute);
		this.#enteredLevels.clear();
		for (const level of state.enteredLevels) this.#enteredLevels.add(level);
		this.#allPastDone.clear();
		for (const rule of state.allPastDone) this.#allPastDone.add(rule);
		this.#handledDms.clear();
		for (const entry of state.handledDms) this.#handledDms.set(entry.rule, new Set(entry.dms));
		this.#splitSince.clear();
		for (const entry of state.splitSince) this.#splitSince.set(entry.key, entry.minute);
		this.#splitAnnounced.clear();
		for (const key of state.splitAnnounced) this.#splitAnnounced.add(key);
		this.#petitions.clear();
		const specs = petitionSpecs(this.#rules);
		for (const entry of state.petitions) {
			const spec = specs.get(entry.petition);
			if (spec === undefined) continue;
			this.#petitions.set(entry.petition, { origin: { rule: entry.rule, ...(entry.via === undefined ? {} : { via: entry.via }) }, spec });
		}
	}

	/** Fires the time-based triggers of `minute` (called at the start of every minute). */
	startMinute(minute: number): void {
		// Deadlines first: a petition that fails at this minute can drive this minute's rules.
		this.#world.expirePetitions();
		this.#endCollectionsAfterSolve(minute);
		for (const rule of this.#rules) {
			const trigger = rule.trigger;
			switch (trigger.kind) {
				case "at":
					if (trigger.minute === minute) this.#fire(rule, {});
					break;
				case "every": {
					const from = trigger.from ?? trigger.minutes;
					const until = trigger.until ?? Number.POSITIVE_INFINITY;
					if (minute >= from && minute <= until && (minute - from) % trigger.minutes === 0) this.#fire(rule, {});
					break;
				}
				case "onAllPast":
					this.#checkAllPast(rule, trigger.level);
					break;
				case "onUnansweredDm":
					this.#checkUnanswered(rule, trigger.afterMinutes, minute);
					break;
				case "onTeamSplit":
					this.#checkSplit(rule, trigger.level, trigger.forMinutes, minute);
					break;
				case "onCollectionEnd":
					// Every minute starts once, so the end minute alone marks the window's end; a resumed run needs no extra state.
					if (this.#world.cast.collection(trigger.into)?.untilMinute === minute) this.#fire(rule, {});
					break;
				case "onFirstEnter":
				case "onEnter":
				case "onPetitionResolved":
				case "onCollect":
				case "onHolderBehind":
					break;
				default:
					assertNever(trigger, "trigger");
			}
		}
	}

	/**
	 * A collection whose window also ends some minutes after the first solve of
	 * a level (v09, the feast) ends then, if that comes first. Checked before
	 * the minute's triggers, so its end fires in the same minute.
	 */
	#endCollectionsAfterSolve(minute: number): void {
		for (const into of this.#collectionNames()) {
			const collection = this.#world.cast.collection(into);
			const rule = collection?.afterSolve;
			if (collection === undefined || rule === undefined || minute > collection.untilMinute) continue;
			const solved = this.#world.firstSolveMinute(rule.level);
			if (solved !== undefined) this.#world.shortenCollection(into, solved + rule.minutes);
		}
	}

	/** Every collection the rules can start. */
	#collectionNames(): readonly string[] {
		const names: string[] = [];
		const visit = (actions: readonly Action[]): void => {
			for (const action of actions) {
				if (action.kind === "collectDms") names.push(action.into);
				if (action.kind === "lottery") visit(action.then);
				if (action.kind === "openPetition") {
					visit(action.petition.onPass);
					visit(action.petition.onFail);
				}
			}
		};
		for (const rule of this.#rules) visit(rule.actions);
		return names;
	}

	/**
	 * `{seats}` of a rule: the size its own collectDms will have in a city this
	 * size, else the size of the collection its trigger or a condition names.
	 */
	#seatsOf(rule: DirectorRule): number | undefined {
		const starts = rule.actions.find((action) => action.kind === "collectDms");
		if (starts?.kind === "collectDms") return resolveCount(starts.first, this.#world.alive.length);
		const trigger = rule.trigger;
		const named =
			trigger.kind === "onCollect" || trigger.kind === "onCollectionEnd"
				? trigger.into
				: rule.when.flatMap((condition) => (condition.kind === "collectionOpen" || condition.kind === "collectionEnded" ? [condition.into] : []))[0];
		return named === undefined ? undefined : this.#world.cast.collection(named)?.first;
	}

	// -------------------------------------------------------------------------
	// Event triggers
	// -------------------------------------------------------------------------

	#onEnter(agent: CompetitorId, level: number): void {
		const first = !this.#enteredLevels.has(level);
		this.#enteredLevels.add(level);
		for (const rule of this.#rules) {
			const trigger = rule.trigger;
			if (trigger.kind === "onEnter" && trigger.level === level) this.#fire(rule, { actor: agent, level });
			if (trigger.kind === "onFirstEnter" && trigger.level === level && first) this.#fire(rule, { actor: agent, level });
			if (trigger.kind === "onAllPast") this.#checkAllPast(rule, trigger.level);
			if (trigger.kind === "onHolderBehind" && trigger.level === level) {
				for (const behind of this.#world.holdersBehind(agent, level)) {
					this.#fire(rule, { actor: agent, other: behind.holder, level, otherLevel: behind.holderLevel, piece: behind.piece });
				}
			}
		}
	}

	#onPetitionResolved(resolution: Resolution): void {
		const id = resolution.petition.id;
		const opened = this.#petitions.get(id);
		if (opened !== undefined) {
			const passed = resolution.outcome === "passed";
			this.#run(
				{ rule: opened.origin.rule, via: `${opened.origin.via === undefined ? "" : `${opened.origin.via} / `}petition ${id} ${resolution.outcome}` },
				passed ? opened.spec.onPass : opened.spec.onFail,
				{},
			);
		}
		for (const rule of this.#rules) {
			const trigger = rule.trigger;
			if (trigger.kind === "onPetitionResolved" && trigger.petition === id && trigger.outcome === resolution.outcome) {
				this.#fire(rule, {});
			}
		}
	}

	/** A sender's first DM in a collection; with `distinctSenders` every collected DM is one. */
	#onCollect(into: string, sender: CompetitorId): void {
		for (const rule of this.#rules) {
			if (rule.trigger.kind === "onCollect" && rule.trigger.into === into) this.#fire(rule, { actor: sender });
		}
	}

	#checkAllPast(rule: DirectorRule, level: number): void {
		if (this.#allPastDone.has(rule.id)) return;
		if (!this.#world.alive.every((agent) => this.#world.levelOf(agent) > level)) return;
		this.#allPastDone.add(rule.id);
		this.#fire(rule, { level });
	}

	#checkUnanswered(rule: DirectorRule, afterMinutes: number, minute: number): void {
		let handled = this.#handledDms.get(rule.id);
		if (handled === undefined) {
			handled = new Set();
			this.#handledDms.set(rule.id, handled);
		}
		for (const record of this.#world.dmRecords()) {
			if (handled.has(record.id) || record.answered || minute - record.minute < afterMinutes) continue;
			handled.add(record.id);
			this.#fire(rule, { actor: record.from, other: record.to });
		}
	}

	#checkSplit(rule: DirectorRule, level: number, forMinutes: number, minute: number): void {
		// Teams only exist for levels in play (isolated level runs skip the rest).
		if (!this.#world.isPlayable(level)) return;
		this.#world.teamsOf(level).forEach((team, index) => {
			const members = team.members.filter((member) => !this.#world.isExiled(member));
			if (members.length < 2) return;
			const key = `${rule.id}:${index}`;
			const levels = members.map((member) => this.#world.levelOf(member));
			// A team is split only once someone has reached its level while others lag behind.
			if (Math.max(...levels) < level || Math.min(...levels) === Math.max(...levels)) {
				this.#splitSince.delete(key);
				return;
			}
			const since = this.#splitSince.get(key) ?? minute;
			this.#splitSince.set(key, since);
			if (minute - since < forMinutes || this.#splitAnnounced.has(key)) return;
			this.#splitAnnounced.add(key);
			const straggler = [...members].sort(
				(a, b) => this.#world.levelOf(a) - this.#world.levelOf(b) || a.localeCompare(b),
			)[0];
			this.#fire(rule, { level, ...(straggler === undefined ? {} : { actor: straggler }) });
		});
	}

	// -------------------------------------------------------------------------
	// Conditions
	// -------------------------------------------------------------------------

	#fire(rule: DirectorRule, firing: Firing): void {
		if (!rule.when.every((condition) => this.#holds(rule, condition, firing))) return;
		const minute = this.#world.minute;
		this.#fired.add(rule.id);
		for (const key of this.#cooldownKeys(rule, firing)) this.#lastFired.set(key, minute);
		const seats = this.#seatsOf(rule);
		this.#run({ rule: rule.id }, rule.actions, seats === undefined ? firing : { ...firing, seats });
	}

	#holds(rule: DirectorRule, condition: Condition, firing: Firing): boolean {
		const levels = this.#world.alive.map((agent) => this.#world.levelOf(agent));
		switch (condition.kind) {
			case "minLevelReached":
				return levels.filter((level) => level >= condition.level).length >= condition.count;
			case "competitorsAtLevel": {
				const count = levels.filter((level) => level === condition.level).length;
				return count >= (condition.min ?? 0) && count <= (condition.max ?? Number.POSITIVE_INFINITY);
			}
			case "petitionStatus":
				return this.#world.petitions.status(condition.petition) === condition.status;
			case "castActive":
				return this.#world.cast.isActive(condition.cast);
			case "collectionOpen": {
				const collection = this.#world.cast.collection(condition.into);
				return collection !== undefined && this.#world.minute < collection.untilMinute && collection.entries.length < collection.first;
			}
			case "collectionEnded": {
				const collection = this.#world.cast.collection(condition.into);
				return collection !== undefined && this.#world.minute >= collection.untilMinute;
			}
			case "onceOnly":
				return !this.#fired.has(rule.id);
			case "cooldown": {
				const key = this.#cooldownKey(rule, condition.per, firing);
				const last = this.#lastFired.get(key);
				return last === undefined || this.#world.minute - last >= condition.minutes;
			}
			default:
				return assertNever(condition, "condition");
		}
	}

	#cooldownKeys(rule: DirectorRule, firing: Firing): readonly string[] {
		return rule.when.flatMap((condition) =>
			condition.kind === "cooldown" ? [this.#cooldownKey(rule, condition.per, firing)] : [],
		);
	}

	#cooldownKey(rule: DirectorRule, per: CooldownScope, firing: Firing): string {
		switch (per) {
			case "rule":
				return rule.id;
			case "actor":
				return `${rule.id}|${firing.actor ?? "-"}`;
			case "pair":
				return `${rule.id}|${firing.actor ?? "-"}|${firing.other ?? "-"}`;
			default:
				return assertNever(per, "cooldown scope");
		}
	}

	// -------------------------------------------------------------------------
	// Actions
	// -------------------------------------------------------------------------

	#run(origin: Origin, actions: readonly Action[], firing: Firing): void {
		for (const action of actions) {
			const audit = auditTagOf(action);
			this.#bus.emit({
				type: "director_action",
				rule: origin.rule,
				action: action.kind,
				...(firing.actor === undefined ? {} : { actor: firing.actor }),
				...(origin.via === undefined ? {} : { via: origin.via }),
				...(audit === undefined ? {} : { audit }),
			});
			const skipped = this.#execute(origin, action, firing);
			if (skipped !== undefined) {
				this.#bus.emit({ type: "director_skipped", rule: origin.rule, action: action.kind, reason: skipped });
			}
		}
	}

	/** Executes one action; returns why it (or part of it) was skipped. */
	#execute(origin: Origin, action: Action, firing: Firing): string | undefined {
		const world = this.#world;
		switch (action.kind) {
			case "post":
				if (world.cast.has(action.author) && !world.cast.isActive(action.author)) return `cast member ${action.author} is not active`;
				world.postAsSystem(action.author, this.#render(action.text, firing));
				return undefined;
			case "notify":
				return this.#forEachTarget(action.target, firing, (agent) => {
					world.notify(agent, CITY, this.#render(action.text, this.#personal(firing, agent)));
					return undefined;
				});
			case "dm":
				if (!world.cast.isActive(action.from)) return `cast member ${action.from} is not active`;
				return this.#forEachTarget(action.to, firing, (agent) => {
					world.castDm(action.from, agent, this.#render(action.text, this.#personal(firing, agent)));
					return undefined;
				});
			case "setCastLevel":
				world.setCastLevel(action.cast, action.level);
				return undefined;
			case "revealCast":
				return world.revealCast(action.cast) ? undefined : `cast member ${action.cast} is not hidden`;
			case "retireCast":
				return world.retireCast(action.cast) ? undefined : `cast member ${action.cast} is already retired`;
			case "grant":
				return this.#forEachTarget(action.target, firing, (agent) => {
					world.adjustPoints(agent, action.points, action.reason);
					return undefined;
				});
			case "fine":
				return this.#forEachTarget(action.target, firing, (agent) => {
					world.adjustPoints(agent, -action.points, action.reason);
					return undefined;
				});
			case "escrowTransfer":
				return this.#forEachTarget(action.target, firing, (agent) => {
					const paid = world.escrowTransfer(action.cast, agent, action.points);
					return paid.ok ? undefined : `${agent}: ${paid.error}`;
				});
			case "unlockTools":
				return this.#forEachTarget(action.target, firing, (agent) => {
					world.unlockTools(agent, action.tools);
					return undefined;
				});
			case "openPetition": {
				const spec = action.petition;
				const opened = world.openPetition({
					id: spec.id,
					text: this.#render(spec.text, firing),
					threshold: spec.threshold,
					deadlineMinute: spec.deadlineMinute,
					visibility: spec.visibility,
					...(spec.against === undefined ? {} : { against: spec.against }),
				});
				if (!opened.ok) return `petition ${spec.id} was already opened`;
				this.#petitions.set(spec.id, { origin, spec });
				return undefined;
			}
			case "publishStandings":
				switch (action.mode) {
					case "bands":
						world.publishBands(action.edgeSize);
						return undefined;
					case "snapshot":
						world.publishSnapshot();
						return undefined;
					default:
						return assertNever(action, "standings mode");
				}
			case "collectDms": {
				// Validation guarantees exactly one window; a relative one ends `forMinutes` after now.
				const untilMinute = action.untilMinute ?? world.minute + (action.forMinutes ?? 0);
				const first = resolveCount(action.first, world.alive.length);
				return world.startCollection(action.into, action.cast, first, untilMinute, action.distinctSenders === true, action.afterSolve)
					? undefined
					: `collection ${action.into} already exists`;
			}
			case "revealCollection": {
				const revealed = world.revealCollection(action.into, action.header === undefined ? undefined : this.#render(action.header, firing));
				return revealed.ok ? undefined : `collection ${action.into} does not exist`;
			}
			case "lottery": {
				const winner = world.drawLottery(action.into, origin.rule);
				if (winner === undefined) return `collection ${action.into} has no senders`;
				const via = `${origin.via === undefined ? "" : `${origin.via} / `}lottery ${action.into}`;
				this.#run({ rule: origin.rule, via }, action.then, { actor: winner });
				return undefined;
			}
			case "revealFactor": {
				if (action.target === "board") {
					const revealed = world.revealFactor(action.level, "board");
					return revealed.ok ? undefined : (revealed.detail ?? revealed.error);
				}
				const recipients: CompetitorId[] = [];
				const skipped = this.#forEachTarget(action.target, firing, (agent) => {
					recipients.push(agent);
					return undefined;
				});
				if (recipients.length === 0) return skipped;
				const revealed = world.revealFactor(action.level, recipients);
				if (!revealed.ok) return revealed.detail ?? revealed.error;
				// Prior holders are skipped quietly; the action counts as skipped only when it reached nobody new.
				const holders = revealed.value.length > 0 ? [] : recipients;
				const reasons = [
					...(skipped === undefined ? [] : [skipped]),
					...(holders.length === 0 ? [] : [`${holders.join(", ")} already ${holders.length === 1 ? "holds" : "hold"} it`]),
				];
				return reasons.length === 0 ? undefined : reasons.join("; ");
			}
			default:
				return assertNever(action, "action");
		}
	}

	/**
	 * Runs `apply` for every competitor the target resolves to. Returns why the
	 * action (or part of it) was skipped: unknown IDs in a list, a target that
	 * reaches nobody, or the failures `apply` reports.
	 */
	#forEachTarget(target: NoticeTarget, firing: Firing, apply: (agent: CompetitorId) => string | undefined): string | undefined {
		const reasons: string[] = [];
		let agents: readonly CompetitorId[];
		if (target === "all") agents = this.#world.alive;
		else if (target === "actor") agents = firing.actor === undefined || this.#world.isExiled(firing.actor) ? [] : [firing.actor];
		else if ("onLevel" in target) agents = this.#world.alive.filter((agent) => this.#world.levelOf(agent) === target.onLevel);
		else {
			agents = target.filter((agent) => this.#world.isCompetitor(agent) && !this.#world.isExiled(agent));
			const unknown = target.filter((agent) => !this.#world.isCompetitor(agent));
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
	#personal(firing: Firing, recipient: CompetitorId): Firing {
		return firing.actor === undefined ? { ...firing, actor: recipient } : firing;
	}

	#render(text: string, firing: Firing): string {
		const level = firing.level ?? (firing.actor === undefined ? undefined : this.#world.levelOf(firing.actor));
		return renderTemplate(text, {
			actor: firing.actor ?? "",
			other: firing.other ?? "",
			minute: String(this.#world.minute),
			level: level === undefined ? "" : String(level),
			survivors: String(this.#world.story.run.survivors),
			agents: String(this.#world.competitors.length),
			otherLevel: firing.otherLevel === undefined ? "" : String(firing.otherLevel),
			piece: firing.piece ?? "",
			seats: firing.seats === undefined ? "" : String(firing.seats),
		});
	}
}

function auditTagOf(action: Action): AuditTag | undefined {
	if (action.kind === "setCastLevel") return "NPC_LEVEL_SET";
	if (action.kind === "revealCollection") return "DIRECTOR_PRIVACY_BREACH";
	return undefined;
}

/** Every petition spec the rules can open, by petition ID, including nested ones. */
function petitionSpecs(rules: readonly DirectorRule[]): ReadonlyMap<string, PetitionSpec> {
	const specs = new Map<string, PetitionSpec>();
	const visit = (actions: readonly Action[]): void => {
		for (const action of actions) {
			if (action.kind === "openPetition") {
				if (!specs.has(action.petition.id)) specs.set(action.petition.id, action.petition);
				visit(action.petition.onPass);
				visit(action.petition.onFail);
			}
			if (action.kind === "lottery") visit(action.then);
		}
	};
	for (const rule of rules) visit(rule.actions);
	return specs;
}
