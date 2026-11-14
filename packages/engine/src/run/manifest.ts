// SPDX-License-Identifier: Apache-2.0
/**
 * The manifest builder: it turns a resolved game and the facts of one run into the run manifest. It reads data
 * only: it creates no plugin, reads no clock and no file, so the same input gives the same manifest.
 */
import { jsonHash } from "@swarmtales/chain";
import { LOG_FORMAT, LOG_VERSION, type ActorSpec, type KernelDefinition, type RunManifest, SwtError, type ToolSpec } from "@swarmtales/contracts";
import type { ResolvedGame } from "@swarmtales/sdk";

/**
 * The facts of one run that a resolved game does not hold. The caller passes them in, so the engine needs no
 * import of the kernel and reads no clock.
 *
 * @public
 */
export interface ManifestRun {
	/** The id of the run, also the name of its folder. */
	readonly id: string;
	/** The wall-clock time the run started at, as an ISO 8601 string. */
	readonly startedAt: string;
	/** Actor id or actor kind to the id of the driver that answers for it (`fake/sample`, `scripted`); an id wins over its kind. */
	readonly drivers: Readonly<Record<string, string>>;
	/** The runtime revision of the kernel. */
	readonly kernelRevision: number;
	/** The package version of the kernel. */
	readonly kernelVersion: string;
	/** The version of Node.js that runs the kernel. */
	readonly node: string;
	/** The commit of the platform's source tree. */
	readonly commit?: string;
	/** Whether the source tree had changes that are not committed. */
	readonly dirty?: boolean;
	/** What the run is for (`smoke` for a single try); the caller checks what a purpose demands. */
	readonly purpose: RunManifest["run"]["purpose"];
	/** The index of the repetition: same seed, other sampling; 0 for the first. */
	readonly replicate: number;
	/** The cost cap of the run in US dollars; left out for a run that spends nothing. */
	readonly budgetUsd?: number;
	/** The experiment the run belongs to, with its arm; left out for a single run. */
	readonly experiment?: NonNullable<RunManifest["experiment"]>;
	/** Actor id or actor kind to the model behind it, with its price table; an id wins over its kind. An actor without one has a fake or scripted driver. */
	readonly models?: Readonly<Record<string, ManifestModel>>;
	/** Actor id or actor kind to the whole system prompt as it is sent; an id wins over its kind. */
	readonly systemPrompts?: Readonly<Record<string, string>>;
	/** Grant name to its tools as a caller is shown them (`Kernel.toolSpecs`), in grant order: name, rendered description and parameter schema. */
	readonly toolSpecs?: Readonly<Record<string, readonly ToolSpec[]>>;
}

type ManifestActor = RunManifest["actors"][number];
type ManifestModel = NonNullable<ManifestActor["model"]>;

// What the run says about one actor: by its id, else by its kind. A name that is only inherited (`constructor`) is no entry.
function entryOf<V>(table: Readonly<Record<string, V>> | undefined, actor: ActorSpec): V | undefined {
	if (table === undefined) return undefined;
	const key = [actor.id, actor.kind].find((name) => Object.hasOwn(table, name));
	return key === undefined ? undefined : table[key];
}

const hashAll = (texts: Readonly<Record<string, string>>): Record<string, string> =>
	Object.fromEntries(
		Object.keys(texts)
			.sort()
			.map((key) => [key, jsonHash(texts[key])]),
	);

// The tool list of a grant as a caller is shown it: the shown names, in the order of the grant.
function shownTools(definition: KernelDefinition, grant: string): readonly string[] {
	return (definition.grants[grant] ?? []).map((tool) => definition.names[tool] ?? tool);
}

function driverOf(actor: ActorSpec, drivers: ManifestRun["drivers"]): string {
	const driver = drivers[actor.id] ?? drivers[actor.kind];
	if (driver !== undefined) return driver;
	throw new SwtError({
		code: "SWT-R011",
		summary: `the actor ${actor.id} has no driver in the run manifest`,
		where: { package: "@swarmtales/engine" },
		why: "Every actor needs a driver, by its id or by its kind, and the manifest names it.",
		fix: `Add a driver id for "${actor.id}" or for the kind "${actor.kind}" to the drivers of the run.`,
	});
}

function actorOf(resolved: ResolvedGame, actor: ActorSpec, run: ManifestRun): ManifestActor {
	const briefing = resolved.briefings[actor.id];
	const model = entryOf(run.models, actor);
	const system = entryOf(run.systemPrompts, actor);
	const specs = run.toolSpecs !== undefined && Object.hasOwn(run.toolSpecs, actor.grant) ? run.toolSpecs[actor.grant] : undefined;
	return {
		id: actor.id,
		kind: actor.kind,
		grant: actor.grant,
		driver: driverOf(actor, run.drivers),
		...(model === undefined ? {} : { model }),
		textHashes: {
			...(briefing === undefined ? {} : { briefing: jsonHash(briefing) }),
			tools: jsonHash(shownTools(resolved.definition, actor.grant)),
			...(system === undefined ? {} : { system: jsonHash(system) }),
			...(specs === undefined ? {} : { toolSpecs: jsonHash(specs.map((tool) => ({ name: tool.name, description: tool.description, parameters: tool.parameters }))) }),
		},
	};
}

function kernelOf(run: ManifestRun): RunManifest["kernel"] {
	return {
		revision: run.kernelRevision,
		version: run.kernelVersion,
		...(run.commit === undefined ? {} : { commit: run.commit }),
		...(run.dirty === undefined ? {} : { dirty: run.dirty }),
		node: run.node,
	};
}

/**
 * Builds the manifest of a run: everything that defines it, fixed before its first event.
 *
 * @remarks
 * The hash of a text is `jsonHash` of the string (the sha256 of its canonical JSON form), for `texts` and for an
 * actor's `briefing`. An actor's `tools` hash is `jsonHash` of the shown tool names of its grant, in order; the
 * descriptions are among `texts`. The `system` hash is `jsonHash` of the system prompt, and the `toolSpecs` hash is
 * `jsonHash` of the list of `{ name, description, parameters }` of the actor's grant, in grant order; each is present
 * only when the run gives it. `game.params` are the effective params of the resolved game; the cost cap is in
 * `limits.budgetUsd` and never in the game hash. The builder does not check the result against `RunManifestSchema`:
 * the caller's numbers (the kernel revision, the seed, the replicate) are checked where the manifest is written.
 *
 * @param resolved - The resolved game.
 * @param run - The facts of the run: its id, its start, its purpose and replicate, the drivers and the kernel that plays it, and for a live run the models, the system prompts, the tool specs, the cost cap and the experiment.
 * @returns The manifest, a plain JSON value.
 * @throws SwtError `SWT-R011` when an actor has no driver, by its id or by its kind.
 * @throws CanonicalJsonError when the options of the scheduler or of a plugin, or the parameter schema of a tool, hold something that is no JSON value.
 *
 * @example
 * ```ts
 * const manifest = buildManifest(resolveGame(input), { id: "hello-001", startedAt: now, purpose: "smoke", replicate: 0, drivers: { resident: "fake/sample" }, kernelRevision: RUNTIME_REVISION, kernelVersion: "0.0.0", node: process.version });
 * ```
 *
 * @public
 */
export function buildManifest(resolved: ResolvedGame, run: ManifestRun): RunManifest {
	const { definition, data } = resolved;
	const { definition: scheduler, options } = definition.scheduler;
	return {
		format: "swarmtales-run",
		version: 1,
		run: { id: run.id, startedAt: run.startedAt, purpose: run.purpose },
		game: { id: definition.game.id, ...(data.title === undefined ? {} : { title: data.title }), hash: definition.game.hash, params: resolved.params },
		kernel: kernelOf(run),
		scheduler: { id: scheduler.id, revision: scheduler.revision, determinism: scheduler.determinism, options, optionsHash: jsonHash(options) },
		plugins: definition.plugins.map((plugin) => ({ id: plugin.id, package: plugin.package, version: plugin.version, optionsHash: jsonHash(plugin.options) })),
		actors: definition.actors.map((actor) => actorOf(resolved, actor, run)),
		texts: hashAll(resolved.texts),
		seed: definition.seed,
		replicate: run.replicate,
		limits: { maxTicks: definition.limits.maxTicks, ...(definition.limits.maxCallsPerTick === undefined ? {} : { maxCallsPerTick: definition.limits.maxCallsPerTick }), ...(run.budgetUsd === undefined ? {} : { budgetUsd: run.budgetUsd }) },
		naming: 1,
		log: { format: LOG_FORMAT, version: LOG_VERSION },
		...(run.experiment === undefined ? {} : { experiment: run.experiment }),
	};
}
