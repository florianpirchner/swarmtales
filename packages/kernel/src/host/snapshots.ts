/**
 * The host's snapshot: taken between minutes from the parts the host owns (residents, locks,
 * schedule, referee counts, one versioned slice per stateful mechanic) and loaded back on resume.
 */
import { Clone } from "typebox/value";
import type { CoreStory, HostSnapshot, JsonValue, RunEnd } from "@swarmtales/contracts";
import type { AccessControl } from "./access.ts";
import type { Loaded } from "./loader.ts";
import type { EventBus } from "./log.ts";
import type { Referee } from "./referee.ts";
import type { ResidentRegistry, ResidentsState } from "./residents.ts";
import type { Scheduler } from "./scheduler.ts";

/** What a snapshot reads and restores. */
export interface SnapshotParts {
	readonly story: CoreStory;
	readonly bus: EventBus;
	readonly registry: ResidentRegistry;
	readonly access: AccessControl;
	readonly scheduler: Scheduler;
	readonly referee: Referee;
	readonly loaded: Loaded;
}

function isJsonValue(value: unknown): value is JsonValue {
	if (value === null || typeof value === "string" || typeof value === "boolean") return true;
	if (typeof value === "number") return Number.isFinite(value);
	if (Array.isArray(value)) return value.every((item: unknown) => isJsonValue(item));
	if (typeof value === "object") return Object.values(value).every((item: unknown) => isJsonValue(item));
	return false;
}

function copyLists(lists: Readonly<Record<string, readonly string[]>>): Record<string, string[]> {
	return Object.fromEntries(Object.entries(lists).map(([key, list]) => [key, [...list]]));
}

function residentsState(saved: HostSnapshot["residents"]): ResidentsState {
	const attributes: Record<string, Record<string, Record<string, JsonValue>>> = {};
	for (const [id, byOwner] of Object.entries(saved.attributes)) {
		for (const [owner, bag] of Object.entries(byOwner)) {
			for (const [key, value] of Object.entries(bag)) {
				if (!isJsonValue(value)) throw new Error(`snapshot: attribute ${owner}.${key} of ${id} is not JSON`);
				const forId = (attributes[id] ??= {});
				(forId[owner] ??= {})[key] = value;
			}
		}
	}
	return { ids: saved.ids, attributes, suspensions: saved.suspensions };
}

/** The snapshot of the parts at `minute`; `ended` once the run is over. */
export function saveHost(parts: SnapshotParts, minute: number, ended: RunEnd | undefined): HostSnapshot {
	const mechanics: Record<string, { version: number; data: unknown }> = {};
	for (const id of parts.loaded.order) {
		const slice = parts.loaded.instances.get(id)?.snapshot;
		if (slice !== undefined) mechanics[id] = { version: slice.version, data: Clone(slice.save()) };
	}
	const residents = parts.registry.save();
	const base = {
		format: "swarmtales.host" as const,
		version: 1 as const,
		story: parts.story.id,
		seed: parts.story.seed,
		minute,
		seq: parts.bus.lastSeq,
		residents: { ids: [...residents.ids], attributes: residents.attributes, suspensions: copyLists(residents.suspensions) },
		locks: copyLists(parts.access.save()),
		jobs: [...parts.scheduler.save()],
		referee: parts.referee.save(),
		mechanics,
	};
	return ended === undefined ? base : { ...base, ended };
}

/** Loads a parsed snapshot into the parts; the host sets its minute and end from it. */
export function restoreHost(parts: SnapshotParts, snapshot: HostSnapshot): void {
	const { story, bus, loaded } = parts;
	if (snapshot.story !== story.id || snapshot.seed !== story.seed) throw new Error("snapshot: taken from another story or seed");
	if (snapshot.seq !== bus.lastSeq) throw new Error(`snapshot: taken at seq ${String(snapshot.seq)}, but the log has ${String(bus.lastSeq)} events`);
	parts.registry.load(residentsState(snapshot.residents));
	// Without locks the story's start locks stay: a resume never silently opens a locked tool.
	if (snapshot.locks !== undefined) parts.access.load(snapshot.locks);
	parts.scheduler.load(
		snapshot.jobs.map((job) => {
			if (job.data !== undefined && !isJsonValue(job.data)) throw new Error(`snapshot: data of job ${job.job} is not JSON`);
			const { data, ...rest } = job;
			return data === undefined || !isJsonValue(data) ? rest : { ...rest, data };
		}),
	);
	parts.referee.load(snapshot.referee);
	for (const id of loaded.order) {
		const slice = loaded.instances.get(id)?.snapshot;
		const saved = snapshot.mechanics[id];
		if (slice === undefined) continue;
		if (saved === undefined) throw new Error(`snapshot: no slice for mechanic "${id}"`);
		slice.load(saved.data, saved.version);
	}
	const unknown = Object.keys(snapshot.mechanics).find((id) => !loaded.order.includes(id));
	if (unknown !== undefined) throw new Error(`snapshot: slice of mechanic "${unknown}", which the story does not load`);
}
