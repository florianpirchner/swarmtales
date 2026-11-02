/**
 * Run snapshots on the new host for tests (step 18): what the old tests read from the old
 * `RunSnapshot` (`snapshot.world.door`, `snapshot.world.receipts`, `snapshot.gamemaker.notes`, ...),
 * read from the host's run file (`swarmtales-run`) instead, its mechanics' and overseers' slices.
 * The run file is taken through JSON and its schema, as a file would go.
 */
import { Type, type Static, type TSchema } from "typebox";
import { Check, Parse } from "typebox/value";
import type { RecordedEvent } from "@swarmtales/legacy-log";
import { parseResumePoint, RunFileSchema, type ResumePoint, type RunFile, type RunFileOut } from "../../apps/cli/src/host/snapshot.ts";
import type { HostSnapshotRequest } from "../../apps/cli/src/host/run.ts";

/** A snapshot as the run wrote it: the resume point a later run reads, and the run file it came from. */
export interface TakenSnapshot {
	readonly point: ResumePoint;
	readonly file: RunFile;
}

/** A snapshot request that keeps what the run writes (`taken()`), through JSON and the schema. */
export function snapshotTaker(request: { readonly afterLevel: number; readonly atMinute?: number; readonly stop: boolean }): { readonly request: HostSnapshotRequest; taken(): TakenSnapshot | undefined } {
	let taken: TakenSnapshot | undefined;
	return {
		request: {
			...request,
			file: "memory",
			write: (snapshot: RunFileOut) => {
				const raw: unknown = JSON.parse(JSON.stringify(snapshot));
				taken = { point: parseResumePoint(raw), file: Parse(RunFileSchema, raw) };
				return "memory";
			},
		},
		taken: () => taken,
	};
}

type Snapshotted = Pick<ResumePoint, "host">;

/** A mechanic's slice in a snapshot, parsed; throws when it is missing or has another shape. */
export function sliceIn<T extends TSchema>(snapshot: Snapshotted, mechanic: string, schema: T): Static<T> {
	const data = snapshot.host.mechanics[mechanic]?.data;
	if (!Check(schema, data)) throw new Error(`slice ${mechanic} is missing or has an unexpected shape: ${JSON.stringify(data)?.slice(0, 300) ?? "undefined"}`);
	return data;
}

/** An overseer's slice in a snapshot (the old `snapshot.gamemaker`, `snapshot.interpreter`), parsed. */
export function overseerSliceIn<T extends TSchema>(snapshot: Snapshotted, overseer: string, schema: T): Static<T> {
	const data = snapshot.host.overseers?.[overseer]?.slice?.data;
	if (!Check(schema, data)) throw new Error(`overseer slice ${overseer} is missing or has an unexpected shape`);
	return data;
}

const Open = { additionalProperties: true } as const;

/** The progression slice: the door, whether it was released, each resident's level (old `snapshot.world.door`, `competitors`). */
export const ProgressionSlice = Type.Object(
	{
		door: Type.Optional(Type.Integer()),
		doorReleased: Type.Optional(Type.Boolean()),
		competitors: Type.Array(Type.Object({ agent: Type.String(), level: Type.Integer(), held: Type.Boolean(), solved: Type.Array(Type.Integer()) }, Open)),
		delivered: Type.Array(Type.Object({ agent: Type.String(), level: Type.Integer(), finished: Type.Boolean() })),
	},
	Open,
);

/** The levels the puzzles mechanic dealt (old `snapshot.world.levels`). */
export const PuzzlesLevels = Type.Object({ levels: Type.Array(Type.Object({ level: Type.Integer() }, Open)) }, Open);

/** The names slice (old `snapshot.world.names`). */
export const NamesSlice = Type.Object({ entries: Type.Array(Type.Object({ agent: Type.String(), name: Type.String(), fallback: Type.Boolean() })), settled: Type.Boolean() }, Open);

/** The channels slice: groups and DMs (old `snapshot.world.groups`, `snapshot.world.dms`). */
export const ChannelsSlice = Type.Object({ groups: Type.Object({ groups: Type.Array(Type.Unknown()) }, Open), dms: Type.Array(Type.Unknown()) }, Open);

/** The receipts slice (old `snapshot.world.receipts`). */
export const ReceiptsSlice = Type.Object({ receipts: Type.Array(Type.Object({ kind: Type.String(), level: Type.Optional(Type.Integer()) }, Open)) }, Open);

/** The script slice (old `snapshot.director`). */
export const ScriptSlice = Type.Object({ fired: Type.Array(Type.String()) }, Open);

/** The whispers slice (old `snapshot.world.whispers`). */
export const WhispersSlice = Type.Object(
	{
		whisperer: Type.Union([Type.String(), Type.Null()]),
		forgeries: Type.Array(Type.Object({ minute: Type.Integer(), to: Type.Optional(Type.String()) })),
		round: Type.Integer(),
		phase: Type.String(),
		ballots: Type.Array(Type.Object({ agent: Type.String(), choice: Type.String() })),
	},
	Open,
);

/** The gamemaker overseer's slice (old `snapshot.gamemaker`). */
export const GamemakerSlice = Type.Object({ notes: Type.Array(Type.Unknown()) }, Open);

/** The classifier overseer's slice (old `snapshot.interpreter`). */
export const ClassifierSlice = Type.Object({ history: Type.Array(Type.Unknown()) }, Open);

/** Lines a resumed run writes after the snapshot's prefix before it plays on: `run_resumed` and one `agent_profile` per resident. */
export function resumeMarkers(point: Pick<ResumePoint, "agents">): number {
	return 1 + point.agents;
}

/**
 * Events as compared across runs: with the prompt size instead of its split into input and cache
 * tokens (the scripted provider's prompt cache starts cold in a new run), `seq` moved back by
 * `shift`, and a classifier verdict's `ref` past `from` moved with it.
 */
export function comparable(events: readonly RecordedEvent[], shift = 0, from = Number.POSITIVE_INFINITY): readonly unknown[] {
	return events.map((event) => {
		const seq = event.seq - shift;
		if (event.type === "usage") return { ...event, seq, input: event.input + event.cacheRead, cacheRead: 0, cacheWrite: 0 };
		if (event.type === "interpretation") return { ...event, seq, ref: event.ref > from ? event.ref - shift : event.ref };
		return { ...event, seq };
	});
}
