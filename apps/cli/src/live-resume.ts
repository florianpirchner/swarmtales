// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `swt resume --budget` (M5 spec 4.5, decision A55): a run of live models goes on live from a snapshot. Its residents
 * go on from the conversations in the snapshot's section `sessions`; the cap counts from the resume, and the
 * reservation line of the ledger names the run it goes on from. The marker `run_resumed` names each actor whose
 * model differs from the one the base played (`--model`, `--director-model`).
 */
import { dirname, relative } from "node:path";
import type { Kernel, ResumeInput } from "@swarmtales/contracts";
import type { RunFolderOptions, SnapshotSessions } from "@swarmtales/runlog";
import type { ResumeBase, ResumeRunInput } from "./resume.ts";
import { runLive, type LiveInput, type ManifestModel } from "./live.ts";
import type { CliIo } from "./main.ts";
import { RUN_RECORDS } from "./records.ts";

/**
 * What makes a live run a resumed one (decision A55): the run goes on from a snapshot of a live run, its residents
 * from their saved conversations, under a cap that counts from the resume.
 *
 * @public
 */
export interface LiveResume {
	/** The id of the run that is resumed: the reservation line of the ledger names it as `base`. */
	readonly base: string;
	/** The hash of the snapshot file, for `resumedFrom` of the manifest. */
	readonly snapshotHash: string;
	/** The checkpoint the new folder chains from, and the lines of the previous log it starts with. */
	readonly folder: Required<Pick<RunFolderOptions, "resumedFrom" | "prefix">>;
	/** The snapshot and the log the kernel resumes from. */
	readonly input: ResumeInput;
	/** The section `sessions` of the snapshot file, parsed by `parseSavedSessions` before the folder is opened. */
	readonly sessions: SnapshotSessions;
	/** The calls of the Human Hand before the snapshot and its tick: the lines of `--hand` the run had applied are dropped. */
	readonly hand: { readonly calls: number; readonly tick: number };
	/** The loop stops after this many finished ticks; the ticks of the game when absent. */
	readonly ticks?: number;
	/** Called once with the resumed kernel and the model of each actor, after the folder is open: writes the marker. */
	readonly began: (kernel: Kernel, models: Readonly<Record<string, ManifestModel>>) => void;
}

const label = (model: ManifestModel): string => `${model.provider}/${model.resolvedId}:${model.params.thinking}`;

/**
 * The actors whose model differs between the base and the resumed run, for the marker.
 *
 * @param before - The model of each actor in the manifest of the base.
 * @param now - The model of each actor in the resumed run.
 * @returns `{ replaced }` with each such actor's model before and now (`<provider>/<model id>:<thinking>`), or `{}` when none differs.
 *
 * @public
 */
export function replacedModels(before: Readonly<Record<string, ManifestModel>>, now: Readonly<Record<string, ManifestModel>>): { readonly replaced?: Readonly<Record<string, { readonly from: string; readonly to: string }>> } {
	const replaced = Object.entries(now).flatMap(([actor, model]) => {
		const was = Object.hasOwn(before, actor) ? before[actor] : undefined;
		return was === undefined || label(was) === label(model) ? [] : [[actor, { from: label(was), to: label(model) }] as const];
	});
	return replaced.length === 0 ? {} : { replaced: Object.fromEntries(replaced) };
}

/**
 * Plays a run of live models on from its snapshot (`swt resume --budget`): the game, the seed, the params and the
 * replicate are the base's; the provider, the model, the thinking level, the Directors' models, the cap, the ledger
 * and the purpose are the flags', as for `swt run`. The kernel resumes from the snapshot and the lines its checkpoint
 * signed, the marker is written after the base's lines, and each resident's session is loaded from the section
 * `sessions` (no `prompt_fixed` is written again: the prompts were fixed in the base).
 *
 * @param base - What the resume read from the base's folder; its snapshot holds `sessions`.
 * @param input - The flags of `swt resume`, with those of a live run and the environment.
 * @param io - The current directory, the clock and the two outputs.
 * @returns The exit code, as `runLive` gives it.
 *
 * @public
 */
export async function resumeLive(base: ResumeBase, input: ResumeRunInput, io: CliIo): Promise<number> {
	const { previous, manifest, path, file, snapshotHash } = base;
	const from = manifest.run.id;
	const models = Object.fromEntries(manifest.actors.flatMap((actor) => (actor.model === undefined ? [] : [[actor.id, actor.model] as const])));
	const resumed: LiveResume = {
		base: from,
		snapshotHash,
		folder: { resumedFrom: { file: relative(previous, path), run: from, checkpoint: file.checkpoint }, prefix: base.prefix },
		input: { snapshot: file.snapshot, log: base.log },
		sessions: file.sessions ?? {},
		hand: { calls: base.calls, tick: file.tick },
		...(input.ticks === undefined ? {} : { ticks: input.ticks }),
		began: (kernel, now) => {
			kernel.record(RUN_RECORDS.id, "script", "run_resumed", { from, snapshotHash, tick: file.tick, ...replacedModels(models, now) });
		},
	};
	return (await runLive({ ...runOf(base, input), resumed }, io)).code;
}

// The flags of the run: the base's game, seed, params and replicate, the rest as `swt run` takes them.
function runOf(base: ResumeBase, input: ResumeRunInput): Omit<LiveInput, "resumed"> {
	const { manifest } = base;
	const params = Object.keys(manifest.game.params).length === 0 ? {} : { params: manifest.game.params };
	const loop = { ...(input.hand === undefined ? {} : { hand: input.hand }), ...(input.snapshotAt === undefined ? {} : { snapshotAt: input.snapshotAt }), ...(input.pauseOn === undefined ? {} : { pauseOn: input.pauseOn }) };
	const run = { file: base.gameFile, seed: manifest.seed, ...params, out: input.out ?? dirname(base.previous), json: input.json, ...loop };
	return { ...run, ...(input.live ?? { purpose: "smoke" }), replicate: manifest.replicate, env: input.env ?? {}, ...(input.source === undefined ? {} : { source: input.source }) };
}
