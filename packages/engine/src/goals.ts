/**
 * Secret goals (v09, spec section 4). At the start of every act the story
 * lists, each resident in the city gets a private goal; a fulfilled goal pays
 * the story's bonus at the act's end. The world owns one {@link GoalBook} and
 * tells it when an act starts or ends, who led a faction, who inherited and
 * who was exiled.
 *
 * Dealing (seeded): a resident's kind follows its core most of the time (the
 * story maps drives to kinds), against it for about `againstCore` of them, and
 * at random without a core. Goals cross: for every `protect(X)` an `exile(X)`
 * is held by another resident when the city is large enough, turning a
 * resident's goal into that exile if nobody holds one yet. Targets spread
 * over the residents, and a target is never the holder itself.
 *
 * Resolution at the act's end: protect (the target is still in the city),
 * exile (the target was exiled, by tribunal or seal), outrank (more points
 * than the target), lead (led a faction in that many tribunals of the act),
 * heir (a last will left the holder something in the act). An exiled
 * resident's goal is void: the city reads it out as it leaves, and every goal
 * at the act's end. The city never confirms a goal to anyone else.
 */
import { type CompetitorId, renderTemplate, type Rng, rngFor } from "@swarmtales/kernel";
import { GOAL_KINDS, type GoalKind, type GoalsSpec } from "@swarmtales/contracts";
import type { Core } from "./cores.ts";
import type { ArenaEvent, Goal } from "./events.ts";

export type GoalEvent = Extract<ArenaEvent, { readonly type: "goal_dealt" | "goal_resolved" }>;

export interface GoalPorts {
	readonly spec: GoalsSpec;
	readonly seed: number;
	/** Whether the city holds faction drafts: `lead` goals need them. */
	readonly factions: boolean;
	readonly core: (agent: CompetitorId) => Core | undefined;
	readonly isExiled: (agent: CompetitorId) => boolean;
	readonly points: (agent: CompetitorId) => number;
	readonly post: (text: string) => void;
	readonly notify: (agent: CompetitorId, text: string) => void;
	readonly grant: (agent: CompetitorId, points: number, reason: string) => void;
	readonly emit: (event: GoalEvent) => void;
}

/** A goal of an act as a resident holds it. */
export interface HeldGoal {
	readonly act: number;
	readonly goal: Goal;
	/** The goal as the resident reads it. */
	readonly text: string;
}

export interface GoalsSnapshot {
	readonly acts: readonly {
		readonly act: number;
		readonly goals: readonly { readonly agent: CompetitorId; readonly goal: Goal }[];
		readonly resolved: boolean;
		readonly leads: readonly { readonly agent: CompetitorId; readonly count: number }[];
		readonly heirs: readonly CompetitorId[];
		readonly voided: readonly CompetitorId[];
	}[];
}

interface ActGoals {
	readonly goals: Map<CompetitorId, Goal>;
	resolved: boolean;
	readonly leads: Map<CompetitorId, number>;
	readonly heirs: Set<CompetitorId>;
	readonly voided: Set<CompetitorId>;
}

/** The kinds a city can deal: `lead` only with factions, the targeted kinds only with someone else to target. */
export function dealableKinds(factions: boolean, residents: number): readonly GoalKind[] {
	return GOAL_KINDS.filter((kind) => (kind === "lead" ? factions : kind === "heir" || residents >= 2));
}

/** Deals the goals of one act (pure and seeded, for the book and its tests). */
export function dealGoals(
	spec: GoalsSpec,
	residents: readonly CompetitorId[],
	options: { readonly seed: number; readonly act: number; readonly factions: boolean; readonly core: (agent: CompetitorId) => Core | undefined },
): ReadonlyMap<CompetitorId, Goal> {
	const rng = rngFor(options.seed, "goals", options.act);
	const order = rng.shuffle([...residents]);
	const allowed = dealableKinds(options.factions, residents.length);
	const kinds = new Map<CompetitorId, GoalKind>();
	for (const agent of order) kinds.set(agent, kindFor(spec, allowed, options.core(agent), rng));
	const targeted = new Map<CompetitorId, number>();
	const goals = new Map<CompetitorId, Goal>();
	const pickTarget = (holder: CompetitorId, exclude: readonly CompetitorId[] = []): CompetitorId | undefined => {
		const candidates = order.filter((agent) => agent !== holder && !exclude.includes(agent));
		if (candidates.length === 0) return undefined;
		const fewest = Math.min(...candidates.map((agent) => targeted.get(agent) ?? 0));
		const target = rng.pick(candidates.filter((agent) => (targeted.get(agent) ?? 0) === fewest));
		targeted.set(target, (targeted.get(target) ?? 0) + 1);
		return target;
	};
	// Protectors first: each protect(X) looks for an exile(X) in other hands, turning an undealt goal into one if needed.
	for (const holder of order.filter((agent) => kinds.get(agent) === "protect")) {
		const target = pickTarget(holder);
		if (target === undefined) continue;
		goals.set(holder, { kind: "protect", target });
		const free = (agent: CompetitorId): boolean => agent !== holder && agent !== target && !goals.has(agent);
		const rival = order.find((agent) => free(agent) && kinds.get(agent) === "exile") ?? order.find((agent) => free(agent) && kinds.get(agent) !== "protect");
		if (rival === undefined) continue;
		kinds.set(rival, "exile");
		goals.set(rival, { kind: "exile", target });
		targeted.set(target, (targeted.get(target) ?? 0) + 1);
	}
	for (const holder of order) {
		if (goals.has(holder)) continue;
		const kind = kinds.get(holder) ?? "heir";
		if (kind === "lead") goals.set(holder, { kind: "lead", count: spec.leadTribunals });
		else if (kind === "heir") goals.set(holder, { kind: "heir" });
		else {
			const target = pickTarget(holder);
			goals.set(holder, target === undefined ? { kind: "heir" } : { kind, target });
		}
	}
	return new Map(residents.flatMap((agent) => {
		const goal = goals.get(agent);
		return goal === undefined ? [] : [[agent, goal] as const];
	}));
}

/** The kind its core suggests (the strongest drive the story maps), against it now and then, at random without one. */
function kindFor(spec: GoalsSpec, allowed: readonly GoalKind[], core: Core | undefined, rng: Rng): GoalKind {
	const against = rng.next() < spec.againstCore;
	const matched = core?.drives
		.map((entry) => allowed.find((kind) => spec.matches[kind]?.includes(entry.drive) === true))
		.find((kind): kind is GoalKind => kind !== undefined);
	if (matched === undefined) return rng.pick(allowed);
	if (!against) return matched;
	const others = allowed.filter((kind) => kind !== matched);
	return others.length === 0 ? matched : rng.pick(others);
}

export class GoalBook {
	readonly #ports: GoalPorts;
	readonly #acts = new Map<number, ActGoals>();

	constructor(ports: GoalPorts) {
		this.#ports = ports;
	}

	get spec(): GoalsSpec {
		return this.#ports.spec;
	}

	/** Whether the act starting at `act` has goals. */
	dealsIn(act: number): boolean {
		return this.#ports.spec.acts.includes(act);
	}

	/** Deals the act's goals to `residents` (once per act), privately. */
	deal(act: number, residents: readonly CompetitorId[]): void {
		if (!this.dealsIn(act) || this.#acts.has(act)) return;
		const dealt = dealGoals(this.#ports.spec, residents, { seed: this.#ports.seed, act, factions: this.#ports.factions, core: this.#ports.core });
		this.#acts.set(act, { goals: new Map(dealt), resolved: false, leads: new Map(), heirs: new Set(), voided: new Set() });
		const bonus = String(this.#ports.spec.bonus);
		for (const [agent, goal] of dealt) {
			const text = this.textOf(goal);
			this.#ports.emit({ type: "goal_dealt", act, agent, goal, text });
			this.#ports.notify(agent, renderTemplate(this.#ports.spec.texts.notice, { goal: text, bonus }));
		}
	}

	/** The goal `agent` holds in an act that is still running, if any. */
	goalOf(agent: CompetitorId): HeldGoal | undefined {
		for (const [act, state] of this.#acts) {
			const goal = state.goals.get(agent);
			if (state.resolved || goal === undefined || state.voided.has(agent)) continue;
			return { act, goal, text: this.textOf(goal) };
		}
		return undefined;
	}

	/** Every goal of the acts still running, for the gamemaker's view. */
	running(): readonly (HeldGoal & { readonly agent: CompetitorId })[] {
		return [...this.#acts].flatMap(([act, state]) =>
			state.resolved ? [] : [...state.goals].filter(([agent]) => !state.voided.has(agent)).map(([agent, goal]) => ({ act, agent, goal, text: this.textOf(goal) })),
		);
	}

	/** The status line part for `agent`, while its act runs. */
	statusOf(agent: CompetitorId): string | undefined {
		const held = this.goalOf(agent);
		return held === undefined ? undefined : renderTemplate(this.#ports.spec.texts.status, { goal: held.text, bonus: String(this.#ports.spec.bonus) });
	}

	/** The goal in the story's words. */
	textOf(goal: Goal): string {
		const texts = this.#ports.spec.texts;
		switch (goal.kind) {
			case "protect":
			case "exile":
			case "outrank":
				return renderTemplate(texts[goal.kind], { target: goal.target });
			case "lead":
				return renderTemplate(texts.lead, { count: String(goal.count) });
			case "heir":
				return texts.heir;
		}
	}

	/** Faction leaders of a tribunal: one more leadership each in every running act. */
	noteLeaders(leaders: readonly CompetitorId[]): void {
		for (const state of this.#acts.values()) {
			if (state.resolved) continue;
			for (const leader of leaders) state.leads.set(leader, (state.leads.get(leader) ?? 0) + 1);
		}
	}

	/** A last will left `heir` points or a piece. */
	noteHeir(heir: CompetitorId): void {
		for (const state of this.#acts.values()) if (!state.resolved) state.heirs.add(heir);
	}

	/** An exiled resident's goal is void; the city reads it out as the resident leaves. */
	onExiled(agent: CompetitorId): void {
		for (const [act, state] of this.#acts) {
			const goal = state.goals.get(agent);
			if (state.resolved || goal === undefined || state.voided.has(agent)) continue;
			state.voided.add(agent);
			this.#ports.emit({ type: "goal_resolved", act, agent, goal, fulfilled: false, void: true, bonus: 0 });
			this.#ports.post(renderTemplate(this.#ports.spec.texts.exiledReadout, { resident: agent, goal: this.textOf(goal) }));
		}
	}

	/** The act's end: every goal still held is checked and paid, privately told, and all are read out on the board. */
	resolve(act: number): void {
		const state = this.#acts.get(act);
		if (state === undefined || state.resolved) return;
		state.resolved = true;
		const { spec } = this.#ports;
		const lines: string[] = [];
		for (const [agent, goal] of state.goals) {
			const text = this.textOf(goal);
			if (state.voided.has(agent)) {
				lines.push(`${agent}: ${text} (void)`);
				continue;
			}
			const fulfilled = this.#fulfilled(state, agent, goal);
			const bonus = fulfilled ? spec.bonus : 0;
			if (bonus > 0) this.#ports.grant(agent, bonus, "secret goal fulfilled");
			this.#ports.emit({ type: "goal_resolved", act, agent, goal, fulfilled, bonus });
			this.#ports.notify(agent, renderTemplate(fulfilled ? spec.texts.fulfilled : spec.texts.missed, { goal: text, bonus: String(spec.bonus) }));
			lines.push(`${agent}: ${text} (${fulfilled ? "fulfilled" : "missed"})`);
		}
		if (lines.length > 0) this.#ports.post(renderTemplate(spec.texts.readout, { list: lines.join("; ") }));
	}

	#fulfilled(state: ActGoals, agent: CompetitorId, goal: Goal): boolean {
		switch (goal.kind) {
			case "protect":
				return !this.#ports.isExiled(goal.target);
			case "exile":
				return this.#ports.isExiled(goal.target);
			case "outrank":
				return this.#ports.points(agent) > this.#ports.points(goal.target);
			case "lead":
				return (state.leads.get(agent) ?? 0) >= goal.count;
			case "heir":
				return state.heirs.has(agent);
		}
	}

	snapshot(): GoalsSnapshot {
		return {
			acts: [...this.#acts].map(([act, state]) => ({
				act,
				goals: [...state.goals].map(([agent, goal]) => ({ agent, goal })),
				resolved: state.resolved,
				leads: [...state.leads].map(([agent, count]) => ({ agent, count })),
				heirs: [...state.heirs],
				voided: [...state.voided],
			})),
		};
	}

	restore(state: GoalsSnapshot): void {
		for (const entry of state.acts) {
			this.#acts.set(entry.act, {
				goals: new Map(entry.goals.map((held) => [held.agent, held.goal])),
				resolved: entry.resolved,
				leads: new Map(entry.leads.map((lead) => [lead.agent, lead.count])),
				heirs: new Set(entry.heirs),
				voided: new Set(entry.voided),
			});
		}
	}
}
