// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The holdout tribunal's snapshot slice: the old `HoldoutSnapshot` (old `mechanics/standoff-tribunal/src/slice.ts`,
 * version 1) field for field under `holdout`, carried, and the level whose task each resident last read. The
 * migration of the old version 0 is not carried (decision A56). A snapshot file sorts the keys, so the slice is read
 * back in the order of its schema (A43).
 */
import { Type, type Static } from "typebox";
import { inSchemaOrder } from "@swarmtales/sdk";
import { reachedKey } from "./watch.ts";
import { emptyHoldout, type HoldoutData, type Session } from "./types.ts";

const Id = Type.String({ description: "A resident id" });
const Ids = (description: string) => Type.Array(Id, { description });
const Int = (description: string) => Type.Integer({ description });
const Result = Type.Object({ vote: Int("The vote"), yes: Int("Yes ballots"), no: Int("The other voters") }, { description: "The last count" });
const Stage = Type.Union([Type.Literal("grace"), Type.Literal("vote"), Type.Literal("banish"), Type.Literal("lot")], { description: "The stage" });
const Outcome = Type.Union([Type.Literal("dropped"), Type.Literal("graceFailed"), Type.Literal("voteFailed"), Type.Literal("spared")], { description: "The outcome" });

const Saved = Type.Object(
	{
		blockers: Type.Array(Type.Object({ door: Int("The door"), blocker: Id, lacking: Ids("Who lacks it"), passed: Type.Boolean({ description: "Passed the door" }), since: Int("Found at") }, { description: "One blocker" }), {
			description: "The blockers by door",
		}),
		reached: Type.Optional(Type.Array(Type.Object({ door: Int("The door"), agent: Id, minute: Int("First seen at") }, { description: "One resident at a door" }), { description: "Who reached which door when" })),
		struck: Ids("The struck"),
		tribunals: Int("Tribunals called"),
		lots: Int("Lots drawn"),
		cooldownUntil: Type.Optional(Int("No tribunal before this tick")),
		lotDoors: Type.Optional(Type.Array(Int("A door"), { description: "Doors where the lot struck" })),
		session: Type.Optional(
			Type.Object(
				{
					number: Int("The tribunal"),
					accused: Id,
					door: Int("The door"),
					stage: Stage,
					until: Int("The stage's end"),
					vote: Int("The vote"),
					voters: Ids("The voters"),
					ballots: Type.Array(Type.Object({ agent: Id, yes: Type.Boolean({ description: "To banish" }) }, { description: "One ballot" }), { description: "The ballots" }),
					lastResult: Type.Optional(Result),
					drawn: Type.Optional(Id),
				},
				{ description: "The running tribunal" },
			),
		),
		pending: Type.Optional(Type.Object({ tribunal: Int("The tribunal"), kind: Outcome, facts: Type.String({ description: "The facts" }), text: Type.String({ description: "The city's line" }), due: Int("Posted at") }, { description: "To announce" })),
	},
	{ description: "The old holdout snapshot" },
);

/**
 * The slice of the tribunal.
 *
 * @public
 */
export const HoldoutSlice = Type.Object(
	{
		holdout: Saved,
		shown: Type.Array(Type.Object({ agent: Id, level: Int("The level") }, { description: "One task read" }), { description: "The level whose task each resident last read" }),
	},
	{ description: "The holdout tribunal" },
);

type Slice = Static<typeof HoldoutSlice>;

/**
 * The state of the mechanic.
 *
 * @public
 */
export interface HoldoutState {
	/** The tribunal. */
	data: HoldoutData;
}

// The old `HoldoutTribunal.snapshot()`: blockers by door, the rest in insertion order, empty optionals left out.
function saved(data: HoldoutData): Static<typeof Saved> {
	const session = data.session;
	const blockers = [...data.blockers.values()].sort((a, b) => a.door - b.door || a.blocker.localeCompare(b.blocker));
	return {
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
	};
}

/**
 * Saves the state.
 *
 * @param state - The state.
 * @returns The slice.
 */
export function saveHoldout(state: HoldoutState): Slice {
	return { holdout: saved(state.data), shown: [...state.data.shown].map(([agent, level]) => ({ agent, level })) };
}

// Every resident the saved tribunal names (old `restore`, holdout.ts:638-643).
function namedIn(saved: Static<typeof Saved>): readonly string[] {
	const session = saved.session;
	return [
		...saved.struck,
		...(saved.reached ?? []).map((entry) => entry.agent),
		...saved.blockers.flatMap((blocker) => [blocker.blocker, ...blocker.lacking]),
		...(session === undefined ? [] : [session.accused, ...session.voters, ...session.ballots.map((ballot) => ballot.agent), ...(session.drawn === undefined ? [] : [session.drawn])]),
	];
}

// The running tribunal as saved.
function sessionFrom(session: NonNullable<Static<typeof Saved>["session"]>): Session {
	return {
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
}

/**
 * Loads the state (old `restore`).
 *
 * @param slice - The slice, keys in any order.
 * @param setup - The run.
 * @param setup.residents - Every resident of the run.
 * @returns The state.
 * @throws RangeError for a slice that names an unknown resident (holdout.ts:644-645).
 */
export function loadHoldout(slice: Slice, setup: { readonly residents: readonly string[] }): HoldoutState {
	const { holdout: saved, shown } = inSchemaOrder(HoldoutSlice, slice);
	const unknown = namedIn(saved).find((id) => !setup.residents.includes(id));
	if (unknown !== undefined) throw new RangeError(`standoff-tribunal: the snapshot's holdout tribunal names an unknown resident ${unknown}`);
	const data = emptyHoldout();
	for (const blocker of saved.blockers) data.blockers.set(reachedKey(blocker.door, blocker.blocker), { ...blocker, lacking: [...blocker.lacking] });
	data.struck.push(...saved.struck);
	for (const entry of saved.reached ?? []) data.reached.set(reachedKey(entry.door, entry.agent), entry.minute);
	data.lotDoors.push(...(saved.lotDoors ?? []));
	data.tribunals = saved.tribunals;
	data.lots = saved.lots;
	data.cooldownUntil = saved.cooldownUntil ?? 0;
	data.session = saved.session === undefined ? undefined : sessionFrom(saved.session);
	data.pending = saved.pending === undefined ? undefined : { ...saved.pending };
	for (const { agent, level } of shown) data.shown.set(agent, level);
	return { data };
}
