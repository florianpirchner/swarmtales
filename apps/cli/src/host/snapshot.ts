/**
 * The run snapshot of the new host (step 18, R1-5, R3-4): what `--snapshot-after`/`--snapshot-at`
 * write and `--resume` reads. The old file (`agent-arena-snapshot` version 2) is still read: it is
 * converted (`convertLegacySnapshot`) and its roles' state becomes the overseers' slices
 * (`overseerEntriesAtResume`). A new snapshot is the host's own (`swarmtales-run` version 1): the host
 * snapshot, the host log up to the cut (envelopes, so a resumed run's mechanics and overseers read the
 * log they wrote), the residents' model contexts (the old `competitors`, which the host does not
 * keep) and the app's weaver desk. The old format is no longer written: writing it would need a writer
 * back to the old shape for every mechanic's slice (R3-4), and nothing reads it but `--resume`.
 */
import { createPublicKey } from "node:crypto";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Type, type Static } from "typebox";
import { Check, Parse } from "typebox/value";
import {
	type ChainCheckpoint,
	ChainCheckpointSchema,
	checkpointVerifies,
	ContextMessageSchema,
	convertLegacySnapshot,
	keyFingerprint,
	LegacyEventAdapter,
	parseSnapshot,
	PUBLIC_KEY_FILE,
	type RunSnapshot,
	SnapshotError,
	snapshotFileName,
	snapshotStateHash,
} from "@swarmtales/chronicle";
import { currentEventType, type RecordedEvent } from "@swarmtales/legacy-log";
import { EventEnvelopeSchema, type EventEnvelope, type HostSnapshot, HostSnapshotSchema } from "@swarmtales/contracts";
import type { ContextMessage } from "@swarmtales/roles";
import { storyId } from "../../../../stories/index.ts";

export const RUN_FILE_FORMAT = "swarmtales-run";
export const RUN_FILE_VERSION = 1;

const Int = Type.Integer();
const AgentText = Type.Object({ agent: Type.String(), text: Type.String() });

const Brake = Type.Object({ act: Type.String(), minute: Int, maxMinutes: Int, behind: Type.Array(Type.Object({ agent: Type.String(), level: Int })) });

export const RunFileSchema = Type.Object({
	format: Type.Literal(RUN_FILE_FORMAT),
	version: Type.Literal(RUN_FILE_VERSION),
	story: Type.String(),
	seed: Type.Number(),
	agents: Int,
	/** Every resident still in the city had passed this level. */
	level: Int,
	/** The last round played and its minute. */
	round: Int,
	minute: Int,
	run: Type.Object({ startLevel: Int, lastLevel: Int, minutes: Int, personas: Type.Boolean(), meta: Type.Optional(Type.Record(Type.String(), Type.String())) }),
	host: HostSnapshotSchema,
	/** The host log up to the cut. */
	events: Type.Array(EventEnvelopeSchema),
	/** Each resident's persistent model context, without system messages. */
	competitors: Type.Array(Type.Object({ agent: Type.String(), messages: Type.Array(ContextMessageSchema) })),
	/** The app's weaver desk: the inner voices each resident already heard of the weaver's act, and the hard texts its prompt shows. */
	weaver: Type.Optional(Type.Object({ heard: Type.Array(AgentText), shifts: Type.Array(AgentText) })),
	/** Set when an act's brake wrote the snapshot (v08). */
	brake: Type.Optional(Brake),
	/** The signed head of the run's event chain at the cut; a resumed run's chain continues from it. */
	chain: Type.Optional(ChainCheckpointSchema),
});

export type RunFile = Static<typeof RunFileSchema>;

/** A run file as the app writes it (checked as `--resume` reads it, `writeRunFile`). */
export interface RunFileOut extends Omit<RunFile, "host" | "events" | "competitors"> {
	readonly host: HostSnapshot;
	readonly events: readonly EventEnvelope[];
	readonly competitors: readonly { readonly agent: string; readonly messages: readonly ContextMessage[] }[];
}

/** What a run resumes from, whichever file it was. */
export interface ResumePoint {
	readonly story: string;
	readonly seed: number;
	readonly agents: number;
	readonly level: number;
	readonly round: number;
	readonly minute: number;
	readonly run: RunFile["run"];
	readonly host: HostSnapshot;
	readonly events: readonly EventEnvelope[];
	readonly competitors: RunFile["competitors"];
	/** Whether the residents' core motives were dealt (a fresh `--cast` no longer applies). */
	readonly coresDealt: boolean;
	/** The old file's log lines (replayed to the sinks as they were, under today's event names); a new file's lines are rebuilt from `events`. */
	readonly legacyLines?: readonly RecordedEvent[];
	/** The old file's roles (gamemaker, interpreter, weaver), for the overseers' slices. */
	readonly legacyRoles?: unknown;
	readonly weaver?: RunFile["weaver"];
	/** The signed head of the event chain at the cut (a new file written since the signed log). */
	readonly chain?: RunFile["chain"];
}

/** An event of an older file under its current name (`core_dealt` is `motive_dealt` since step 18): a resumed run goes on with today's names. */
function currentEnvelope(envelope: EventEnvelope): EventEnvelope {
	const renamed = currentEventType(envelope.type);
	return renamed === envelope.type ? envelope : { ...envelope, type: renamed };
}

/**
 * An old file's log line under its current name, as the resumed run replays it into its own
 * `events.jsonl`. The run's own snapshot keeps the renamed envelopes, so a run resumed from that
 * one rebuilds the same prefix lines (step 18 challenge, determinism M1: with the old name kept here,
 * the second resume's prefix said `motive_dealt` where the first's said `core_dealt`, and
 * `swt log verify --previous` failed).
 */
function currentLine(line: RecordedEvent): RecordedEvent {
	return line.type === "core_dealt" ? { ...line, type: "motive_dealt" } : line;
}

function fromLegacy(raw: unknown, path: string): ResumePoint {
	const snapshot: RunSnapshot = parseSnapshot(raw, path);
	const converted = convertLegacySnapshot(raw, {}, path);
	return {
		story: snapshot.story,
		seed: snapshot.seed,
		agents: snapshot.agents,
		level: snapshot.level,
		round: snapshot.round,
		minute: snapshot.minute,
		run: snapshot.run,
		// An old file may name the story by its old name (`nexus`); the host checks the snapshot against the story's id.
		host: { ...converted.host, story: storyId(converted.host.story) },
		events: converted.events.map(currentEnvelope),
		competitors: snapshot.competitors.map((entry) => ({ agent: entry.agent, messages: entry.messages.map((message) => Parse(ContextMessageSchema, message)) })),
		coresDealt: (snapshot.world.cores ?? []).length > 0,
		legacyLines: snapshot.events.map(currentLine),
		legacyRoles: converted.roles,
	};
}

/**
 * Refuses a run file whose checkpoint does not hold: its signature fails under the key it names, or
 * the file's state (all but `chain`) is not the state the checkpoint signed, i.e. the host, the
 * envelopes or a resident's context were edited after the cut (step 18 challenge, chain-security M1
 * and M2). A checkpoint written before it signed the state (no `state`) is only checked for its signature.
 */
function checkCheckpoint(raw: unknown, chain: ChainCheckpoint, path: string): void {
	if (!checkpointVerifies(chain)) throw new SnapshotError(`${path}: its chain checkpoint is not signed by the key it names (key ${keyFingerprint(chain.publicKey)}); the file was edited or its checkpoint comes from elsewhere`);
	if (chain.state !== undefined && snapshotStateHash(raw) !== chain.state) {
		throw new SnapshotError(`${path}: the snapshot's state is not the one its checkpoint signed (the file was edited after the cut)`);
	}
}

function fromRunFile(raw: unknown, path: string): ResumePoint {
	if (!Check(RunFileSchema, raw)) throw new SnapshotError(`${path} is not a ${RUN_FILE_FORMAT} file of version ${String(RUN_FILE_VERSION)}`);
	const file = Parse(RunFileSchema, raw);
	if (file.chain !== undefined) checkCheckpoint(raw, file.chain, path);
	// The motives' slice is the list of dealt core motives.
	const motives = file.host.mechanics.motives?.data;
	return {
		story: file.story,
		seed: file.seed,
		agents: file.agents,
		level: file.level,
		round: file.round,
		minute: file.minute,
		run: file.run,
		host: file.host,
		events: file.events.map(currentEnvelope),
		competitors: file.competitors,
		coresDealt: Array.isArray(motives) && motives.length > 0,
		...(file.weaver === undefined ? {} : { weaver: file.weaver }),
		...(file.chain === undefined ? {} : { chain: file.chain }),
	};
}

/** How many `events.jsonl` lines the snapshot's prefix is (the old file's events, or the legacy lines the host's envelopes become). */
export function prefixLines(point: ResumePoint): number {
	if (point.legacyLines !== undefined) return point.legacyLines.length;
	const adapter = new LegacyEventAdapter();
	return point.events.reduce((count, envelope) => count + adapter.write(envelope).length, 0);
}

/** A snapshot file from `--resume` (untrusted): an old one or the host's. */
export function parseResumePoint(raw: unknown, path = "snapshot"): ResumePoint {
	const format: unknown = typeof raw === "object" && raw !== null ? Reflect.get(raw, "format") : undefined;
	return format === RUN_FILE_FORMAT ? fromRunFile(raw, path) : fromLegacy(raw, path);
}

export function readResumePoint(path: string): ResumePoint {
	let text: string;
	try {
		text = readFileSync(path, "utf8");
	} catch (error) {
		throw new SnapshotError(`Cannot read snapshot ${path}: ${error instanceof Error ? error.message : String(error)}`);
	}
	let raw: unknown;
	try {
		raw = JSON.parse(text);
	} catch (error) {
		throw new SnapshotError(`Snapshot ${path} is not JSON: ${error instanceof Error ? error.message : String(error)}`);
	}
	const point = parseResumePoint(raw, path);
	// A snapshot in a run directory belongs to that run: its checkpoint must be signed by the run's key (chain-security M2).
	const beside = join(dirname(path), PUBLIC_KEY_FILE);
	if (point.chain !== undefined && existsSync(beside)) {
		let own: string;
		try {
			own = createPublicKey(readFileSync(beside, "utf8")).export({ type: "spki", format: "der" }).toString("base64");
		} catch (error) {
			throw new SnapshotError(`${path}: the run's ${PUBLIC_KEY_FILE} beside it is not a public key (${error instanceof Error ? error.message : String(error)})`);
		}
		if (own !== point.chain.publicKey) {
			throw new SnapshotError(`${path}: its chain checkpoint names key ${keyFingerprint(point.chain.publicKey)}, but the run beside it signed with key ${keyFingerprint(own)}`);
		}
	}
	return point;
}

/** A run file with its chain's checkpoint, signed over the file's state (what `--snapshot-*` writes). */
export function withCheckpoint(file: RunFileOut, chain: { checkpoint(state?: string): ChainCheckpoint }): RunFileOut {
	return { ...file, chain: chain.checkpoint(snapshotStateHash(file)) };
}

/** The file name of a snapshot: after a level, or at a minute. */
export function runFileName(level: number, atMinute?: number): string {
	return atMinute === undefined ? snapshotFileName(level) : `snapshot-M${String(atMinute)}.json`;
}

/**
 * Writes the snapshot into a run directory; returns its path. The file appears whole or not at
 * all, and it is checked as `--resume` will check it.
 */
export function writeRunFile(directory: string, file: RunFileOut, name: string): string {
	const path = join(directory, name);
	const text = `${JSON.stringify(file)}\n`;
	const partial = `${path}.partial`;
	writeFileSync(partial, text);
	renameSync(partial, path);
	parseResumePoint(JSON.parse(text), path);
	return path;
}
