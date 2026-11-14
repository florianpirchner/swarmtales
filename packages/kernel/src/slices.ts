// SPDX-License-Identifier: Apache-2.0
/**
 * Part 2: the kernel's snapshot. It is taken between two ticks from what the kernel owns (suspensions, locks,
 * jobs) plus one versioned slice per plugin that keeps state and one of the scheduler, and loaded back on resume.
 */
import { Clone } from "typebox/value";
import { SwtError } from "@swarmtales/contracts";
import type { KernelSnapshot, RunEnd, SliceData, SnapshotSlice } from "@swarmtales/contracts";
import { guarded, misfit } from "./errors.ts";
import type { SliceParts } from "./parts.ts";

const RESUME = "Resume the snapshot with the definition and the log it was taken from.";

function copyLists(lists: Readonly<Record<string, readonly string[]>>): Record<string, string[]> {
	return Object.fromEntries(Object.entries(lists).map(([key, list]) => [key, [...list]]));
}

// A slice saves a copy, so a later change of the owner's state does not reach the snapshot; no state is `null`.
function saved(owner: string, slice: SnapshotSlice): SliceData {
	return { version: slice.version, data: Clone(guarded(owner, () => slice.save()) ?? null) };
}

// The slices of the plugins that keep state, by plugin id, in load order.
function pluginSlices(parts: SliceParts): readonly (readonly [string, SnapshotSlice])[] {
	return parts.loaded.order.flatMap((id): readonly (readonly [string, SnapshotSlice])[] => {
		const slice = parts.loaded.instances.get(id)?.slice;
		return slice === undefined ? [] : [[id, slice]];
	});
}

/**
 * Takes the snapshot of the parts.
 *
 * @param parts - What the snapshot reads.
 * @param tick - The tick the run continues with.
 * @param ended - The end of the run, once it is over.
 * @returns The snapshot; every value in it is a copy.
 * @throws SwtError `SWT-R003` when a slice's `save` throws.
 */
export function saveKernel(parts: SliceParts, tick: number, ended: RunEnd | undefined): KernelSnapshot {
	const { definition } = parts;
	const scheduler = parts.scheduler;
	return {
		format: "swarmtales.kernel",
		version: 1,
		game: definition.game.id,
		gameHash: definition.game.hash,
		seed: definition.seed,
		tick,
		seq: parts.log.length,
		...(ended === undefined ? {} : { ended }),
		suspensions: copyLists(parts.actors.state()),
		locks: copyLists(parts.access.state()),
		jobs: parts.clock.state().map((job) => Clone(job)),
		plugins: Object.fromEntries(pluginSlices(parts).map(([id, slice]) => [id, saved(id, slice)])),
		...(scheduler === undefined ? {} : { scheduler: saved(definition.scheduler.definition.id, scheduler) }),
	};
}

// Whether the snapshot was taken from this definition and at the end of this log; undefined when it was.
function strangerOf(parts: SliceParts, snapshot: KernelSnapshot): string | undefined {
	const { definition } = parts;
	if (snapshot.game !== definition.game.id || snapshot.gameHash !== definition.game.hash) return `the snapshot was taken from the game "${snapshot.game}" (${snapshot.gameHash}), not from "${definition.game.id}" (${definition.game.hash})`;
	if (snapshot.seed !== definition.seed) return `the snapshot was taken with the seed ${String(snapshot.seed)}, not ${String(definition.seed)}`;
	if (snapshot.seq !== parts.log.length) return `the snapshot was taken at seq ${String(snapshot.seq)}, but the log has ${String(parts.log.length)} events`;
	return undefined;
}

// What does not fit between the snapshot and the parts, in one sentence; undefined when all fits.
function misfitOf(parts: SliceParts, snapshot: KernelSnapshot): string | undefined {
	const stranger = strangerOf(parts, snapshot);
	if (stranger !== undefined) return stranger;
	const slices = new Map(pluginSlices(parts));
	const extra = Object.keys(snapshot.plugins).find((id) => !slices.has(id));
	if (extra !== undefined) return `the snapshot has state of the plugin "${extra}", which is not loaded or keeps no state`;
	const missing = [...slices.keys()].find((id) => !Object.hasOwn(snapshot.plugins, id));
	if (missing !== undefined) return `the snapshot has no state of the plugin "${missing}"`;
	if ((snapshot.scheduler === undefined) !== (parts.scheduler === undefined)) return `the snapshot has ${snapshot.scheduler === undefined ? "no state" : "state"} of the scheduler, and the scheduler keeps ${parts.scheduler === undefined ? "none" : "some"}`;
	const job = snapshot.jobs.find((entry) => !Object.hasOwn(parts.loaded.instances.get(entry.owner)?.jobs ?? {}, entry.job));
	return job === undefined ? undefined : `the snapshot has the job "${job.job}" of "${job.owner}", which no loaded plugin has`;
}

// Loads one slice; whatever its owner throws means that the saved state does not fit.
function load(owner: string, slice: SnapshotSlice, data: SliceData): void {
	try {
		slice.load(Clone(data.data), data.version);
	} catch (thrown) {
		throw new SwtError(misfit(`the saved state of "${owner}" (version ${String(data.version)}) does not load: ${thrown instanceof Error ? thrown.message : String(thrown)}`, RESUME), { cause: thrown });
	}
}

/**
 * Loads a parsed snapshot into the parts. It checks everything before it changes anything but the slices; the
 * assembly sets its tick's end from `snapshot.ended`.
 *
 * @param parts - What the snapshot restores.
 * @param snapshot - The snapshot, parsed already.
 * @returns Nothing.
 * @throws SwtError `SWT-R002` when the snapshot is of another game, hash, seed or log length, when its slices
 * are not those of the loaded plugins and the scheduler, when a job is unknown, or when a slice does not load.
 */
export function restoreKernel(parts: SliceParts, snapshot: KernelSnapshot): void {
	const reason = misfitOf(parts, snapshot);
	if (reason !== undefined) throw new SwtError(misfit(reason, RESUME));
	parts.actors.restore(copyLists(snapshot.suspensions));
	parts.access.restore(copyLists(snapshot.locks));
	parts.clock.restore(
		snapshot.tick,
		snapshot.jobs.map((job) => Clone(job)),
	);
	for (const [id, slice] of pluginSlices(parts)) {
		const data = snapshot.plugins[id];
		if (data !== undefined) load(id, slice, data);
	}
	if (parts.scheduler !== undefined && snapshot.scheduler !== undefined) load(parts.definition.scheduler.definition.id, parts.scheduler, snapshot.scheduler);
}
