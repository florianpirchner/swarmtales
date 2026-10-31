/**
 * The holdout tribunal's snapshot slice: version 1 holds the old `HoldoutSnapshot` (world.ts
 * `holdout`) field for field under `holdout`; version 0 is the converter's `{ holdout?: <old> }`
 * (absent in a world without a holdout tribunal, request R2-2), the same shape.
 */
import { Type, type Static } from "typebox";
import { Parse } from "typebox/value";
import { reachedKey } from "./court.ts";
import type { HoldoutData } from "./types.ts";

const Id = Type.String();
const Ids = Type.Array(Id);
const Int = Type.Integer();
const Result = Type.Object({ vote: Int, yes: Int, no: Int });
const Stage = Type.Union([Type.Literal("grace"), Type.Literal("vote"), Type.Literal("banish"), Type.Literal("lot")]);
const Outcome = Type.Union([Type.Literal("dropped"), Type.Literal("graceFailed"), Type.Literal("voteFailed"), Type.Literal("spared")]);

const Saved = Type.Object({
	blockers: Type.Array(Type.Object({ door: Int, blocker: Id, lacking: Ids, passed: Type.Boolean(), since: Int })),
	reached: Type.Optional(Type.Array(Type.Object({ door: Int, agent: Id, minute: Int }))),
	struck: Ids,
	tribunals: Int,
	lots: Int,
	cooldownUntil: Type.Optional(Int),
	lotDoors: Type.Optional(Type.Array(Int)),
	session: Type.Optional(
		Type.Object({
			number: Int,
			accused: Id,
			door: Int,
			stage: Stage,
			until: Int,
			vote: Int,
			voters: Ids,
			ballots: Type.Array(Type.Object({ agent: Id, yes: Type.Boolean() })),
			lastResult: Type.Optional(Result),
			drawn: Type.Optional(Id),
		}),
	),
	pending: Type.Optional(Type.Object({ tribunal: Int, kind: Outcome, facts: Type.String(), text: Type.String(), due: Int })),
});

export const HoldoutSlice = Type.Object({ holdout: Type.Optional(Saved) });
type Slice = Static<typeof HoldoutSlice>;

export interface HasHoldout {
	data: HoldoutData;
}

/** The old `HoldoutTribunal.snapshot()`: blockers by door, the rest in insertion order, empty optionals left out. */
function save(state: HasHoldout): Slice {
	const data = state.data;
	const session = data.session;
	const blockers = [...data.blockers.values()].sort((a, b) => a.door - b.door || a.blocker.localeCompare(b.blocker));
	return {
		holdout: {
			blockers: blockers.map((blocker) => ({ door: blocker.door, blocker: blocker.blocker, lacking: [...blocker.lacking], passed: blocker.passed, since: blocker.since })),
			reached: [...data.reached].map(([id, minute]) => {
				const [door, agent] = id.split(":");
				return { door: Number(door), agent: agent ?? "", minute };
			}),
			struck: [...data.struck],
			tribunals: data.tribunals,
			lots: data.lots,
			...(data.cooldownUntil === 0 ? {} : { cooldownUntil: data.cooldownUntil }),
			...(data.lotDoors.length === 0 ? {} : { lotDoors: [...data.lotDoors] }),
			...(session === undefined
				? {}
				: {
						session: {
							number: session.number,
							accused: session.accused,
							door: session.door,
							stage: session.stage,
							until: session.until,
							vote: session.vote,
							voters: [...session.voters],
							ballots: [...session.ballots].map(([agent, yes]) => ({ agent, yes })),
							...(session.lastResult === undefined ? {} : { lastResult: { ...session.lastResult } }),
							...(session.drawn === undefined ? {} : { drawn: session.drawn }),
						},
					}),
			...(data.pending === undefined ? {} : { pending: { ...data.pending } }),
		},
	};
}

/** Every resident the saved tribunal names (old `restore`, holdout.ts:638-643). */
function namedIn(saved: Static<typeof Saved>): readonly string[] {
	const session = saved.session;
	return [
		...saved.struck,
		...(saved.reached ?? []).map((entry) => entry.agent),
		...saved.blockers.flatMap((blocker) => [blocker.blocker, ...blocker.lacking]),
		...(session === undefined ? [] : [session.accused, ...session.voters, ...session.ballots.map((ballot) => ballot.agent), ...(session.drawn === undefined ? [] : [session.drawn])]),
	];
}

/** The old `restore`: a slice that names an unknown resident is refused (holdout.ts:644-645). */
function load(slice: Slice, setup: { readonly residents: readonly string[] }): HasHoldout {
	const saved = slice.holdout;
	const data: HoldoutData = { blockers: new Map(), struck: [], reached: new Map(), lotDoors: [], tribunals: 0, lots: 0, cooldownUntil: 0, session: undefined, pending: undefined };
	if (saved === undefined) return { data };
	const unknown = namedIn(saved).find((id) => !setup.residents.includes(id));
	if (unknown !== undefined) throw new Error(`The snapshot's holdout tribunal names an unknown resident ${unknown}`);
	for (const blocker of saved.blockers) data.blockers.set(reachedKey(blocker.door, blocker.blocker), { ...blocker, lacking: [...blocker.lacking] });
	data.struck.push(...saved.struck);
	for (const entry of saved.reached ?? []) data.reached.set(reachedKey(entry.door, entry.agent), entry.minute);
	data.lotDoors.push(...(saved.lotDoors ?? []));
	data.tribunals = saved.tribunals;
	data.lots = saved.lots;
	data.cooldownUntil = saved.cooldownUntil ?? 0;
	const session = saved.session;
	data.session =
		session === undefined
			? undefined
			: {
					number: session.number,
					accused: session.accused,
					door: session.door,
					stage: session.stage,
					until: session.until,
					vote: session.vote,
					voters: [...session.voters],
					ballots: new Map(session.ballots.map((ballot) => [ballot.agent, ballot.yes])),
					...(session.lastResult === undefined ? {} : { lastResult: { ...session.lastResult } }),
					...(session.drawn === undefined ? {} : { drawn: session.drawn }),
				};
	data.pending = saved.pending === undefined ? undefined : { ...saved.pending };
	return { data };
}

export const holdoutSnapshot = {
	version: 1,
	schema: HoldoutSlice,
	save,
	load,
	migrations: { 0: (old: unknown): Slice => Parse(HoldoutSlice, old) },
} as const;
