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
 * `holdout.struck`). Every other world field goes whole to one mechanic.
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
	if (slice.version !== 0) throw new SnapshotError(`${mechanic}: only version-0 slices are written back in the old shape`);
	if (!isRecord(slice.data)) throw new SnapshotError(`${mechanic}: the slice is not an object`);
	return slice.data;
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
		for (const [key, value] of Object.entries(sliceData(host, mechanic))) {
			if (mechanic === "progression" && key === "competitors") progression = records(value, "progression.competitors");
			else if (mechanic === "channels" && key === "inboxes") inboxes = records(value, "channels.inboxes");
			else if (key === "tribunal" && (mechanic === "tribunal" || mechanic === "exile") && isRecord(value)) Object.assign(tribunal, value);
			// Exile's copy of the struck residents: the holdout's own slice writes `world.holdout`.
			else if (mechanic === "exile" && key === "holdout") continue;
			else world[key] = value;
		}
	}
	if (Object.keys(tribunal).length > 0) world.tribunal = ordered(tribunal, layout.tribunal, "world.tribunal");
	world.competitors = progression.map((entry, index) => ordered({ ...entry, ...inboxes[index] }, layout.competitor, "world.competitors"));
	const legacy = new LegacyEventAdapter();
	const events = converted.events.flatMap((event) => legacy.write(event)).map((event) => toRecorded(event));
	const whole: Json = { ...converted.app, ...converted.roles, events, arena: sliceData(host, "arena"), director: sliceData(host, "script"), world: ordered(world, layout.world, "world") };
	return parseSnapshot(ordered(whole, layout.top, "snapshot"), "converted snapshot");
}
