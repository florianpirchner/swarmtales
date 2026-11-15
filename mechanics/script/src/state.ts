// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The firing state of the script (old `Director` fields): once-only and all-past marks, cooldowns, handled direct
 * messages, team splits, the petitions it opened, and the status of every petition of the run. The slice is the old
 * `DirectorSnapshot` key for key, plus `statuses`: the old script read a petition's status from the log, which a
 * mechanic on this platform cannot, so it keeps what it heard of `petitions`. Carried from `legacy`
 * `mechanics/script/src/state.ts`; the migration of the old file's version 0 is not carried (A56).
 */
import { Type, type Static } from "typebox";
import type { Action, PetitionSpec, Rule } from "./rules.ts";

const Keyed = Type.Object({ key: Type.String({ description: "The key" }), minute: Type.Number({ description: "The tick" }) }, { description: "A tick by key" });
const Status = Type.Union([Type.Literal("open"), Type.Literal("passed"), Type.Literal("failed")], { description: "The status of a petition" });

/**
 * The snapshot slice of the script.
 *
 * @public
 */
export const DirectorSlice = Type.Object(
	{
		fired: Type.Array(Type.String({ description: "A rule id" }), { description: "The rules that fired once" }),
		lastFired: Type.Array(Keyed, { description: "The last firing per cooldown key" }),
		enteredLevels: Type.Array(Type.Number({ description: "A level" }), { description: "The levels someone entered" }),
		allPastDone: Type.Array(Type.String({ description: "A rule id" }), { description: "The `onAllPast` rules that fired" }),
		handledDms: Type.Array(Type.Object({ rule: Type.String({ description: "A rule id" }), dms: Type.Array(Type.Number({ description: "A message number" }), { description: "The numbers" }) }, { description: "The messages a rule handled" }), { description: "The handled direct messages per rule" }),
		splitSince: Type.Array(Keyed, { description: "Since when a team is split, per rule and team" }),
		splitAnnounced: Type.Array(Type.String({ description: "A rule and team key" }), { description: "The splits announced" }),
		petitions: Type.Array(Type.Object({ petition: Type.String({ description: "A petition id" }), rule: Type.String({ description: "The rule that opened it" }), via: Type.Optional(Type.String({ description: "The path of a nested list" })) }, { description: "A petition the script opened" }), { description: "The petitions the script opened" }),
		statuses: Type.Array(Type.Object({ petition: Type.String({ description: "A petition id" }), status: Status }, { description: "One petition" }), { description: "Every petition opened in the run, with its status" }),
	},
	{ description: "The firing state of the script" },
);

/**
 * The static shape of `DirectorSlice`.
 *
 * @public
 */
export type DirectorSlice = Static<typeof DirectorSlice>;

/**
 * Where an action list comes from: its rule and, for nested lists, the path.
 *
 * @public
 */
export interface Origin {
	/** The id of the rule. */
	readonly rule: string;
	/** The path of a nested list: `petition P1 passed`, `lottery feast`. */
	readonly via?: string;
}

/**
 * A petition the script opened, with the rule it came from.
 *
 * @public
 */
export interface OpenedPetition {
	/** The rule and path that opened it. */
	readonly origin: Origin;
	/** What was opened, with its `onPass` and `onFail` actions. */
	readonly spec: PetitionSpec;
}

// Every petition spec the rules can open, by petition id, nested ones included (old `petitionSpecs`).
function petitionSpecs(rules: readonly Rule[]): ReadonlyMap<string, PetitionSpec> {
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

/**
 * The firing state of the script over the game's rules.
 *
 * @public
 */
export class FiringState {
	/** The game's rules, in its order. */
	readonly rules: readonly Rule[];
	/** The rules that fired once. */
	readonly fired = new Set<string>();
	/** The tick of the last firing per cooldown key. */
	readonly lastFired = new Map<string, number>();
	/** The levels someone entered. */
	readonly enteredLevels = new Set<number>();
	/** The `onAllPast` rules that fired. */
	readonly allPastDone = new Set<string>();
	/** The message numbers each `onUnansweredDm` rule handled. */
	readonly handledDms = new Map<string, Set<number>>();
	/** Since when a team is split, per rule and team. */
	readonly splitSince = new Map<string, number>();
	/** The splits announced. */
	readonly splitAnnounced = new Set<string>();
	/** The petitions the script opened, by id. */
	readonly petitions = new Map<string, OpenedPetition>();
	/** The status of every petition opened in the run, by id. */
	readonly statuses = new Map<string, "open" | "passed" | "failed">();

	/**
	 * A fresh state.
	 *
	 * @param rules - The game's rules.
	 */
	constructor(rules: readonly Rule[]) {
		this.rules = rules;
	}

	/**
	 * The slice of the state.
	 *
	 * @returns The slice, in the old key order.
	 */
	save(): DirectorSlice {
		return {
			fired: [...this.fired],
			lastFired: [...this.lastFired].map(([key, minute]) => ({ key, minute })),
			enteredLevels: [...this.enteredLevels],
			allPastDone: [...this.allPastDone],
			handledDms: [...this.handledDms].map(([rule, dms]) => ({ rule, dms: [...dms] })),
			splitSince: [...this.splitSince].map(([key, minute]) => ({ key, minute })),
			splitAnnounced: [...this.splitAnnounced],
			petitions: [...this.petitions].map(([petition, opened]) => ({ petition, rule: opened.origin.rule, ...(opened.origin.via === undefined ? {} : { via: opened.origin.via }) })),
			statuses: [...this.statuses].map(([petition, status]) => ({ petition, status })),
		};
	}

	/**
	 * Old `restore`: a petition whose spec the rules no longer hold loses its pass and fail actions.
	 *
	 * @param state - A slice saved by {@link FiringState.save}.
	 */
	restore(state: DirectorSlice): void {
		for (const rule of state.fired) this.fired.add(rule);
		for (const entry of state.lastFired) this.lastFired.set(entry.key, entry.minute);
		for (const level of state.enteredLevels) this.enteredLevels.add(level);
		for (const rule of state.allPastDone) this.allPastDone.add(rule);
		for (const entry of state.handledDms) this.handledDms.set(entry.rule, new Set(entry.dms));
		for (const entry of state.splitSince) this.splitSince.set(entry.key, entry.minute);
		for (const key of state.splitAnnounced) this.splitAnnounced.add(key);
		this.#restorePetitions(state);
	}

	#restorePetitions(state: DirectorSlice): void {
		for (const entry of state.statuses) this.statuses.set(entry.petition, entry.status);
		const specs = petitionSpecs(this.rules);
		for (const entry of state.petitions) {
			const spec = specs.get(entry.petition);
			if (spec === undefined) continue;
			this.petitions.set(entry.petition, { origin: { rule: entry.rule, ...(entry.via === undefined ? {} : { via: entry.via }) }, spec });
		}
	}
}
