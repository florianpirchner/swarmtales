/**
 * The converter for old run snapshots (`agent-arena-snapshot` version 2, e.g.
 * examples/cityofkeys-act1-06a-04/snapshot-L7.json) into the new core's host snapshot: one slice
 * of version 0 per mechanic of the carve plan (docs/design/carve-plan.md), holding the old fields
 * unchanged, so each wave 3 mechanic migrates its own slice from version 0. The rest of the file
 * (the header, the run, the residents' model contexts, the roles' state) is kept beside it, and
 * `toLegacySnapshot` writes the old file back byte for byte (test/snapshot/legacy-snapshot.test.ts).
 *
 * Split world fields: a resident's `level`, `held`, `solved`, `wrongAttempts`, `extraTools` go to
 * `progression`, its `mailbox` and `notices` to `channels` (as `inboxes`); the tribunal's `gates`,
 * `exiled` and `ransomed` go to `exile`, and so does a copy of the holdout's `struck` (as
 * `holdout.struck`). Every other world field goes whole to one mechanic. Progression gets a copy of
 * `arena.delivered`, channels copies of `arena.seenBoard` and `gamemaker.notes`.
 */
import type { EventEnvelope, HostSnapshot } from "@swarmtales/contracts";
import { LegacyEventAdapter, envelopeFromLegacy, toRecorded } from "../log/legacy-events.ts";
import { parseSnapshot, SnapshotError, type RunSnapshot } from "./snapshot.ts";

/** World field to the mechanic whose version-0 slice holds it. */
export const LEGACY_WORLD_OWNERS: Readonly<Record<string, string>> = {
	door: "progression",
	doorReleased: "progression",
	actStarts: "progression",
	offences: "progression",
	endedActs: "progression",
	ledger: "ledger",
	board: "channels",
	groups: "channels",
	dms: "channels",
	messages: "channels",
	marks: "marks",
	cast: "cast",
	receipts: "receipts",
	blames: "receipts",
	petitions: "petitions",
	levels: "puzzles",
	cityFactors: "puzzles",
	exclusions: "puzzles",
	tribunal: "tribunal",
	names: "names",
	cores: "motives",
	goals: "goals",
	seal: "seal",
	standoff: "standoff",
	holdout: "standoff-tribunal",
	whispers: "whispers",
};

const PROGRESSION_FIELDS = ["agent", "level", "held", "solved", "wrongAttempts", "extraTools"];
const INBOX_FIELDS = ["agent", "mailbox", "notices"];
const EXILE_FIELDS = ["gates", "exiled", "ransomed"];
/** Lists of the old file outside `world` that a mechanic reads from its version-0 slice (R2-D16). */
const COPIES: readonly { readonly from: string; readonly key: string; readonly mechanic: string }[] = [
	{ from: "arena", key: "delivered", mechanic: "progression" },
	{ from: "arena", key: "seenBoard", mechanic: "channels" },
	{ from: "gamemaker", key: "notes", mechanic: "channels" },
];

type Json = Readonly<Record<string, unknown>>;

/** The old file around the host snapshot, and the key orders to write it back in. */
export interface ConvertedSnapshot {
	readonly host: HostSnapshot;
	/** The log up to the cut, as envelopes (`envelopeFromLegacy`). */
	readonly events: readonly EventEnvelope[];
	/** The old header and run fields, the residents' model contexts and the brake: the app's, not a mechanic's. */
	readonly app: Json;
	/** State of the model-backed roles (gamemaker, interpreter, weaver). */
	readonly roles: Json;
	/** Key orders of the old file, so it is written back unchanged. */
	readonly layout: { readonly top: readonly string[]; readonly world: readonly string[]; readonly competitor: readonly string[]; readonly tribunal: readonly string[] };
}

export interface ConvertOptions {
	/**
	 * The host's locks per resident, from the old state (the story's start locks minus what it
	 * unlocked). Left out, the host snapshot carries no locks and a resumed host keeps the story's
	 * start locks (never an empty set, which would open every locked tool).
	 */
	readonly locks?: (resident: { readonly agent: string; readonly extraTools: readonly string[] }) => readonly string[];
}

const APP_KEYS = ["format", "version", "story", "seed", "agents", "level", "round", "minute", "run", "competitors", "brake"];
const ROLE_KEYS = ["gamemaker", "interpreter", "weaver"];

function isRecord(value: unknown): value is Json {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pick(source: Json, keys: readonly string[]): Record<string, unknown> {
	return Object.fromEntries(Object.entries(source).filter(([key]) => keys.includes(key)));
}

function records(value: unknown, what: string): readonly Json[] {
	if (!Array.isArray(value) || !value.every((entry: unknown) => isRecord(entry))) throw new SnapshotError(`${what} is not a list of objects`);
	return value;
}

/** An old snapshot (untrusted, checked with the old schema) as a host snapshot with version-0 slices. */
export function convertLegacySnapshot(raw: unknown, options: ConvertOptions = {}, source = "snapshot"): ConvertedSnapshot {
	const snapshot: RunSnapshot = parseSnapshot(raw, source);
	if (!isRecord(raw) || !isRecord(raw.world)) throw new SnapshotError(`${source} is not a run snapshot`);
	const world = raw.world;
	const slices: Record<string, Record<string, unknown>> = {};
	const put = (mechanic: string, key: string, value: unknown): void => {
		(slices[mechanic] ??= {})[key] = value;
	};
	for (const [key, value] of Object.entries(world)) {
		if (key === "competitors") continue;
		const owner = LEGACY_WORLD_OWNERS[key];
		if (owner === undefined) throw new SnapshotError(`${source}: world field "${key}" has no owner in the carve plan`);
		if (key === "tribunal" && isRecord(value)) {
			put("tribunal", "tribunal", Object.fromEntries(Object.entries(value).filter(([field]) => !EXILE_FIELDS.includes(field))));
			const exile = pick(value, EXILE_FIELDS);
			if (Object.keys(exile).length > 0) put("exile", "tribunal", exile);
			continue;
		}
		// The holdout's struck residents are exiled too: exile keeps them (`by: "holdout"`, wave 3.5 T4 R6).
		if (key === "holdout" && isRecord(value) && Array.isArray(value.struck)) put("exile", "holdout", { struck: value.struck });
		put(owner, key, value);
	}
	const competitors = records(world.competitors, `${source}: world.competitors`);
	for (const entry of competitors) {
		const unknown = Object.keys(entry).find((key) => !PROGRESSION_FIELDS.includes(key) && !INBOX_FIELDS.includes(key));
		if (unknown !== undefined) throw new SnapshotError(`${source}: competitor field "${unknown}" has no owner in the carve plan`);
	}
	put("progression", "competitors", competitors.map((entry) => pick(entry, PROGRESSION_FIELDS)));
	put("channels", "inboxes", competitors.map((entry) => pick(entry, INBOX_FIELDS)));
	// Copies of the arena's and the gamemaker's lists the mechanics took over (round 2, R2-D16); the
	// arena and the roles keep the originals, so these copies are not written back.
	for (const copy of COPIES) {
		const from = raw[copy.from];
		const value = isRecord(from) ? from[copy.key] : undefined;
		if (Array.isArray(value)) put(copy.mechanic, copy.key, value);
	}
	const ids = snapshot.world.competitors.map((entry) => entry.agent);
	const gone = [...(snapshot.world.tribunal?.exiled ?? []), ...(snapshot.world.holdout?.struck ?? [])];
	const locks = options.locks;
	const host: HostSnapshot = {
		format: "swarmtales.host",
		version: 1,
		story: snapshot.story,
		seed: snapshot.seed,
		// The old file names the minute of its last round; the host names the next one to play.
		minute: snapshot.minute + 1,
		seq: snapshot.events.length,
		residents: { ids, attributes: {}, suspensions: Object.fromEntries(ids.filter((id) => gone.includes(id)).map((id) => [id, ["exile"]])) },
		...(locks === undefined ? {} : { locks: Object.fromEntries(snapshot.world.competitors.map((entry) => [entry.agent, [...locks(entry)].sort()])) }),
		jobs: [],
		referee: { counts: {}, costUsd: 0 },
		mechanics: {
			arena: { version: 0, data: raw.arena },
			script: { version: 0, data: raw.director },
			...Object.fromEntries(Object.entries(slices).map(([mechanic, data]) => [mechanic, { version: 0, data }])),
		},
	};
	const tribunal = world.tribunal;
	return {
		host,
		events: records(raw.events, `${source}: events`).map((event) => envelopeFromLegacy(event)),
		app: pick(raw, APP_KEYS),
		roles: pick(raw, ROLE_KEYS),
		layout: {
			top: Object.keys(raw),
			world: Object.keys(world),
			competitor: Object.keys(competitors[0] ?? {}),
			tribunal: isRecord(tribunal) ? Object.keys(tribunal) : [],
		},
	};
}

function ordered(entries: Json, keys: readonly string[], what: string): Record<string, unknown> {
	const known = new Set(keys);
	const extra = Object.keys(entries).find((key) => !known.has(key));
	if (extra !== undefined) throw new SnapshotError(`${what}: field "${extra}" is not in the layout`);
	return Object.fromEntries(keys.flatMap((key) => (Object.hasOwn(entries, key) ? [[key, entries[key]]] : [])));
}

function sliceData(host: HostSnapshot, mechanic: string): Json {
	const slice = host.mechanics[mechanic];
	if (slice === undefined) return {};
	if (slice.version !== 0) throw new SnapshotError(`${mechanic}: only version-0 slices are written back in the old shape (no writer for version ${String(slice.version)})`);
	if (!isRecord(slice.data)) throw new SnapshotError(`${mechanic}: the slice is not an object`);
	return slice.data;
}

/** The version of the slices of the arena, progression, channels and script that have a writer back to the old shape (S1-5, A1-5). */
const CURRENT_SLICE = 1;

/** The data of a slice that is either version 0 (the converter's) or the current version of a mechanic with a writer. */
function dataOf(host: HostSnapshot, mechanic: string): { readonly version: number; readonly data: Json } | undefined {
	const slice = host.mechanics[mechanic];
	if (slice === undefined) return undefined;
	if (slice.version !== 0 && slice.version !== CURRENT_SLICE) throw new SnapshotError(`${mechanic}: no writer back to the old shape for version ${String(slice.version)}`);
	if (!isRecord(slice.data)) throw new SnapshotError(`${mechanic}: the slice is not an object`);
	return { version: slice.version, data: slice.data };
}

function listOf(value: unknown, what: string): readonly Json[] {
	return value === undefined ? [] : records(value, what);
}

/**
 * The old file's `arena` field from the host's slices. Version 0 holds it whole (the converter's
 * copy). From version 1 on the three owners each hold their part: the arena `seenPoints` and
 * `braked`, progression `delivered`, channels `seen` (the old `seenBoard`).
 */
function arenaField(host: HostSnapshot): Json {
	const arena = dataOf(host, "arena");
	if (arena === undefined) return {};
	if (arena.version === 0) return arena.data;
	const progression = dataOf(host, "progression");
	const channels = dataOf(host, "channels");
	const delivered = progression === undefined ? [] : listOf(progression.data.delivered, "progression.delivered");
	const seenBoard = channels === undefined ? [] : listOf(channels.version === 0 ? channels.data.seenBoard : channels.data.seen, "channels.seen");
	return { delivered, seenPoints: listOf(arena.data.seenPoints, "arena.seenPoints"), seenBoard, braked: arena.data.braked ?? [] };
}

/** Fields a current slice adds that the old world has no field for (they went to the arena, to the roles, or are new). */
const CURRENT_ONLY: Readonly<Record<string, readonly string[]>> = { progression: ["delivered", "locksStale"], channels: ["exiled", "seen", "notes"] };

/** The world fields a progression or channels slice writes: version 0 as it is, the current version without what it added. */
function worldFields(host: HostSnapshot, mechanic: string, layout: ConvertedSnapshot["layout"]): Json {
	const slice = dataOf(host, mechanic);
	if (slice === undefined || slice.version === 0) return slice?.data ?? {};
	const added = CURRENT_ONLY[mechanic] ?? [];
	// A current slice names fields the old file may have left out (`messages`, `offences`): they stay out as they were.
	return Object.fromEntries(Object.entries(slice.data).filter(([key]) => !added.includes(key) && (key === "competitors" || key === "inboxes" || layout.world.includes(key))));
}

/** The old file from a converted snapshot, in the old key order; checked with the old schema. */
export function toLegacySnapshot(converted: ConvertedSnapshot): RunSnapshot {
	const { host, layout } = converted;
	const world: Record<string, unknown> = {};
	let progression: readonly Json[] = [];
	let inboxes: readonly Json[] = [];
	const tribunal: Record<string, unknown> = {};
	for (const mechanic of Object.keys(host.mechanics)) {
		if (mechanic === "arena" || mechanic === "script") continue;
		const fields = mechanic === "progression" || mechanic === "channels" ? worldFields(host, mechanic, layout) : sliceData(host, mechanic);
		for (const [key, value] of Object.entries(fields)) {
			if (mechanic === "progression" && key === "competitors") progression = records(value, "progression.competitors");
			else if (mechanic === "channels" && key === "inboxes") inboxes = records(value, "channels.inboxes");
			else if (key === "tribunal" && (mechanic === "tribunal" || mechanic === "exile") && isRecord(value)) Object.assign(tribunal, value);
			// Exile's copy of the struck residents: the holdout's own slice writes `world.holdout`.
			else if (mechanic === "exile" && key === "holdout") continue;
			// Copies of the arena's and the gamemaker's lists: the originals are written back from there.
			else if (COPIES.some((copy) => copy.mechanic === mechanic && copy.key === key)) continue;
			else world[key] = value;
		}
	}
	if (Object.keys(tribunal).length > 0) world.tribunal = ordered(tribunal, layout.tribunal, "world.tribunal");
	world.competitors = progression.map((entry, index) => ordered({ ...entry, ...inboxes[index] }, layout.competitor, "world.competitors"));
	const legacy = new LegacyEventAdapter();
	const events = converted.events.flatMap((event) => legacy.write(event)).map((event) => toRecorded(event));
	const whole: Json = { ...converted.app, ...converted.roles, events, arena: arenaField(host), director: dataOf(host, "script")?.data ?? {}, world: ordered(world, layout.world, "world") };
	return parseSnapshot(ordered(whole, layout.top, "snapshot"), "converted snapshot");
}
