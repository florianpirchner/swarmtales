// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The run manifest: everything that defines a run, fixed before its first event. It is written as `manifest.json`
 * into the run folder, and its hash is in the genesis of the chain. No behaviour.
 */
import { type Static, Type } from "typebox";

/**
 * A sha256 hash as 64 lower-case hex digits.
 *
 * @param description - What the hash is taken of.
 * @returns The string schema with the pattern of a hash.
 */
const hash = (description: string) => Type.String({ pattern: "^[0-9a-f]{64}$", description });

/**
 * A sampling value: a number, or the literal that says the provider chose it. A sampling field is never absent.
 *
 * @param description - What the value controls.
 * @returns The union schema of a number and `provider-default`.
 */
const sampling = (description: string) =>
	Type.Union([Type.Number({ description: "The value that was sent to the provider" }), Type.Literal("provider-default")], { description });

const Run = Type.Object(
	{
		id: Type.String({ description: "The id of the run, also the name of its folder" }),
		startedAt: Type.String({ description: "The wall-clock time the run started at, as an ISO 8601 string" }),
		purpose: Type.Union([Type.Literal("smoke"), Type.Literal("pilot"), Type.Literal("exploratory"), Type.Literal("confirmatory")], {
			description: "What the run is for; it decides how strict the runner is and whether results may be pooled",
		}),
	},
	{ additionalProperties: false, description: "The identity of the run" },
);

const Game = Type.Object(
	{
		id: Type.String({ description: "The id of the game" }),
		title: Type.Optional(Type.String({ description: "The title of the game, for a reader" })),
		hash: hash("The sha256 of the canonical JSON of the resolved game definition (`game.json`)"),
		params: Type.Record(Type.String(), Type.Unknown({ description: "The value of one parameter; it must be a JSON value, which the manifest builder guarantees" }), {
			description: "The parameters the game was started with, by name",
		}),
	},
	{ additionalProperties: false, description: "The game that is played" },
);

const Kernel = Type.Object(
	{
		revision: Type.Integer({ minimum: 3, description: "The runtime revision of the kernel; it rises when the way a run plays changes" }),
		version: Type.String({ description: "The package version of the kernel" }),
		commit: Type.Optional(Type.String({ description: "The commit of the platform's source tree" })),
		dirty: Type.Optional(Type.Boolean({ description: "Whether the source tree had changes that are not committed" })),
		node: Type.String({ description: "The version of Node.js that ran the kernel" }),
	},
	{ additionalProperties: false, description: "The kernel that ran the game" },
);

const Scheduler = Type.Object(
	{
		id: Type.String({ description: "The id of the scheduler; an open id, not a closed list" }),
		revision: Type.Integer({ minimum: 1, description: "The revision of the scheduler; it rises when its order of activations changes" }),
		determinism: Type.String({ description: "What the scheduler promises about repeating a run with the same seed" }),
		options: Type.Unknown({ description: "The options the scheduler was given; they must be a JSON value, which the manifest builder guarantees, so that `optionsHash` is defined" }),
		optionsHash: hash("The sha256 of the canonical JSON of the scheduler's options"),
	},
	{ additionalProperties: false, description: "The scheduler that decided who acts when" },
);

const Plugin = Type.Object(
	{
		id: Type.String({ description: "The id of the plugin inside the game" }),
		package: Type.String({ description: "The name of the package the plugin comes from" }),
		version: Type.String({ description: "The version of that package" }),
		optionsHash: hash("The sha256 of the canonical JSON of the plugin's options"),
	},
	{ additionalProperties: false, description: "One plugin of the run" },
);

const ModelParams = Type.Object(
	{
		temperature: sampling("The sampling temperature"),
		topP: sampling("The nucleus sampling limit"),
		maxOutputTokens: sampling("The limit of output tokens of one request"),
		thinking: Type.String({ description: "The thinking setting of the model, as the driver names it" }),
	},
	{ additionalProperties: false, description: "The sampling parameters; every field is a value or `provider-default`, never absent" },
);

const Model = Type.Object(
	{
		provider: Type.String({ description: "The provider the requests go to" }),
		requestedId: Type.String({ description: "The model id as the command gave it, an alias included" }),
		resolvedId: Type.String({ description: "The model id after the alias was resolved" }),
		params: ModelParams,
		pricing: Type.String({ description: "The price table the cost of the run is computed with, as `<library>@<version>`" }),
	},
	{ additionalProperties: false, description: "The model behind the actor; absent for a fake or scripted driver" },
);

const Actor = Type.Object(
	{
		id: Type.String({ description: "The actor id" }),
		kind: Type.String({ description: "The kind of the actor, the part of its id before the colon" }),
		grant: Type.String({ description: "The name of the grant the actor's tools come from" }),
		driver: Type.String({ description: "The id of the driver that answers for the actor, for example `fake/sample` or `scripted`" }),
		model: Type.Optional(Model),
		textHashes: Type.Record(Type.String(), hash("The sha256 of one text"), {
			description: "The hashes of the texts the actor is shown, by part: `briefing`, `tools` (the tool list as shown) and, for a model actor, `system` (the whole system prompt as sent) and `toolSpecs` (name, description and parameter schema of every granted tool, in grant order)",
		}),
	},
	{ additionalProperties: false, description: "One actor of the run" },
);

const Limits = Type.Object(
	{
		maxTicks: Type.Integer({ minimum: 1, description: "The tick after which the run ends at the latest" }),
		maxCallsPerTick: Type.Optional(Type.Integer({ minimum: 1, description: "The most tool calls one actor may make in one tick" })),
		budgetUsd: Type.Optional(Type.Number({ minimum: 0, description: "The money the run may spend, in US dollars" })),
	},
	{ additionalProperties: false, description: "The limits the run stops at" },
);

/**
 * The schema of the run manifest (`manifest.json`), version 1.
 *
 * @remarks
 * One document says everything that defines a run: the game by hash, the kernel and its runtime revision, the
 * scheduler, the plugins, the actors with their drivers and text hashes, the seed and the limits. It is fixed
 * before the first event and its hash is in the genesis of the chain, so two runs can be compared without reading
 * code. An unknown field is refused at every level; only the maps (`params`, `texts`, `textHashes`) and the scheduler's
 * `options` are open.
 *
 * @example
 * ```ts
 * import { Value } from "typebox/value";
 * import { RunManifestSchema } from "@swarmtales/contracts";
 *
 * const ok = Value.Check(RunManifestSchema, JSON.parse(text));
 * ```
 *
 * @public
 */
export const RunManifestSchema = Type.Object(
	{
		format: Type.Literal("swarmtales-run", { description: "The name of the manifest format" }),
		version: Type.Literal(1, { description: "The version of the manifest format" }),
		run: Run,
		game: Game,
		kernel: Kernel,
		scheduler: Scheduler,
		plugins: Type.Array(Plugin, { description: "The plugins of the run, in load order" }),
		actors: Type.Array(Actor, { description: "The actors of the run" }),
		texts: Type.Record(Type.String(), hash("The sha256 of one text"), { description: "The hash of every plugin text and kernel reply, by key" }),
		seed: Type.Integer({ minimum: 0, maximum: 4294967295, description: "The seed of the world, a 32-bit number: deals, order and lots follow from it" }),
		replicate: Type.Integer({ minimum: 0, description: "The index of the repetition: same seed, other sampling" }),
		limits: Limits,
		naming: Type.Literal(1, { description: "The version of the naming rules for ids and event types" }),
		log: Type.Object(
			{
				format: Type.String({ description: "The name of the log format" }),
				version: Type.Integer({ minimum: 1, description: "The version of the log format" }),
			},
			{ additionalProperties: false, description: "The format of the event log the run writes" },
		),
		resumedFrom: Type.Optional(
			Type.Object({ snapshotHash: hash("The sha256 of the snapshot the run started from") }, { additionalProperties: false, description: "Set when the run resumes from a snapshot" }),
		),
		human: Type.Optional(Type.Literal(true, { description: "Set when the game has the actor `human`: a person may intervene in the run. Absent otherwise, never `false`" })),
		experiment: Type.Optional(
			Type.Object(
				{
					id: Type.String({ description: "The id of the experiment" }),
					specHash: hash("The sha256 of the experiment's specification"),
					arm: Type.String({ description: "The arm of the experiment the run belongs to" }),
				},
				{ additionalProperties: false, description: "Set when the run is part of an experiment" },
			),
		),
	},
	{ additionalProperties: false, description: "Everything that defines a run, fixed before its first event" },
);

/**
 * The run manifest: everything that defines a run, fixed before its first event.
 *
 * @public
 */
export type RunManifest = Static<typeof RunManifestSchema>;
