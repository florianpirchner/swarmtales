/**
 * The director's firing state (old `Director` fields, packages/engine/src/director.ts): once-only
 * and all-past marks, cooldowns, handled DMs, team splits and the petitions it opened. The slice is
 * the old `DirectorSnapshot`, key for key, so a converted old file (version 0, the old `director`
 * field) and a saved slice have the same shape.
 */
import { Type, type Static } from "typebox";
import { Parse } from "typebox/value";
import type { Action, PetitionSpec, Rule } from "./rules.ts";

export const DirectorSlice = Type.Object({
	fired: Type.Array(Type.String()),
	lastFired: Type.Array(Type.Object({ key: Type.String(), minute: Type.Number() })),
	enteredLevels: Type.Array(Type.Number()),
	allPastDone: Type.Array(Type.String()),
	handledDms: Type.Array(Type.Object({ rule: Type.String(), dms: Type.Array(Type.Number()) })),
	splitSince: Type.Array(Type.Object({ key: Type.String(), minute: Type.Number() })),
	splitAnnounced: Type.Array(Type.String()),
	petitions: Type.Array(Type.Object({ petition: Type.String(), rule: Type.String(), via: Type.Optional(Type.String()) })),
});
export type DirectorSlice = Static<typeof DirectorSlice>;

/** Where an action list comes from: its rule and, for nested lists, the path. */
export interface Origin {
	readonly rule: string;
	readonly via?: string;
}

export interface OpenedPetition {
	readonly origin: Origin;
	readonly spec: PetitionSpec;
}

/** Every petition spec the rules can open, by petition id, nested ones included (old `petitionSpecs`). */
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

export class FiringState {
	readonly rules: readonly Rule[];
	readonly fired = new Set<string>();
	readonly lastFired = new Map<string, number>();
	readonly enteredLevels = new Set<number>();
	readonly allPastDone = new Set<string>();
	readonly handledDms = new Map<string, Set<number>>();
	readonly splitSince = new Map<string, number>();
	readonly splitAnnounced = new Set<string>();
	readonly petitions = new Map<string, OpenedPetition>();

	constructor(rules: readonly Rule[]) {
		this.rules = rules;
	}

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
		};
	}

	/** Old `restore`: a petition whose spec the rules no longer hold loses its pass and fail actions. */
	restore(state: DirectorSlice): void {
		for (const rule of state.fired) this.fired.add(rule);
		for (const entry of state.lastFired) this.lastFired.set(entry.key, entry.minute);
		for (const level of state.enteredLevels) this.enteredLevels.add(level);
		for (const rule of state.allPastDone) this.allPastDone.add(rule);
		for (const entry of state.handledDms) this.handledDms.set(entry.rule, new Set(entry.dms));
		for (const entry of state.splitSince) this.splitSince.set(entry.key, entry.minute);
		for (const key of state.splitAnnounced) this.splitAnnounced.add(key);
		const specs = petitionSpecs(this.rules);
		for (const entry of state.petitions) {
			const spec = specs.get(entry.petition);
			if (spec === undefined) continue;
			this.petitions.set(entry.petition, { origin: { rule: entry.rule, ...(entry.via === undefined ? {} : { via: entry.via }) }, spec });
		}
	}
}

/** The version-0 slice: the old file's `director` field, or `{}` when the file had none (a fresh state, R2-D2). */
export function migrateV0(old: unknown): DirectorSlice {
	if (typeof old === "object" && old !== null && Object.keys(old).length === 0) return new FiringState([]).save();
	return Parse(DirectorSlice, old);
}
