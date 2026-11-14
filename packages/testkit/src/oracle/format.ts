// SPDX-License-Identifier: Apache-2.0
/**
 * The oracle file format (`oracles/README.md`): one game configuration and one seed as plain JSON, written
 * from the old platform before the rewrite. A file names the game and its effective options, the ordered
 * inputs that drove the run (minutes, turns, tool calls) and the ordered outcomes the mechanics produced
 * (call results, events), all in one timeline. Nothing in it names a class, a module or an API of the old code.
 */
import { Type, type Static } from "typebox";

/**
 * The value of `format` in every oracle file.
 *
 * @public
 */
export const ORACLE_FORMAT = "swarmtales.oracle";
/**
 * The version of the oracle file format this schema describes.
 *
 * @public
 */
export const ORACLE_VERSION = 1;

const Json = Type.Unknown();

/** Who acts: `resident:<id>`, `gamemaker`, `script`, `human`, `overseer:<name>` or `host` (clock, timers, hooks). */
const Actor = Type.String({ pattern: "^(resident:[A-Za-z0-9_-]+|overseer:[A-Za-z0-9_-]+|gamemaker|script|human|host)$" });

/** The stages of the old call pipeline, in the order a call passes them; a refusal names the stage that stopped it. */
export const Stage = Type.Union([Type.Literal("lock"), Type.Literal("parse"), Type.Literal("limit"), Type.Literal("afford"), Type.Literal("rule"), Type.Literal("guard"), Type.Literal("consult"), Type.Literal("execute")]);

/** A minute of the virtual clock begins. Timers of the mechanics fire on minute boundaries. */
const MinuteEntry = Type.Object({ k: Type.Literal("minute"), minute: Type.Integer({ minimum: 0 }) }, { additionalProperties: false });

/** A resident's turn begins; `inputs` is what the resident is shown (level 2, text). */
const TurnEntry = Type.Object(
	{
		k: Type.Literal("turn"),
		resident: Type.String(),
		pass: Type.Integer({ minimum: 1 }),
		block: Type.Integer({ minimum: 1 }),
		inputs: Type.Array(Type.Object({ source: Type.String(), kind: Type.Optional(Type.String()), text: Type.String() }, { additionalProperties: false })),
	},
	{ additionalProperties: false },
);

/** A resident had no news and got no turn (level 3, scheduling). */
const SkipEntry = Type.Object({ k: Type.Literal("skip"), resident: Type.String(), pass: Type.Integer({ minimum: 1 }), block: Type.Integer({ minimum: 1 }) }, { additionalProperties: false });

/**
 * A tool call and its result. `ok`, `code` and `stage` are level 1 (rules); `reply` and `detail` are level 2
 * (text). `reply` is absent for a successful call whose caller is not a resident (the old log does not keep it).
 */
const CallEntry = Type.Object(
	{
		k: Type.Literal("call"),
		actor: Actor,
		tool: Type.String(),
		params: Json,
		ok: Type.Boolean(),
		reply: Type.Optional(Type.String()),
		endsTurn: Type.Optional(Type.Boolean()),
		code: Type.Optional(Type.String({ pattern: "^[A-Z][A-Z0-9_]*$" })),
		stage: Type.Optional(Stage),
		detail: Type.Optional(Type.String()),
	},
	{ additionalProperties: false },
);

/** An event a mechanic (or the platform, source `core`) emitted. `audience` absent: everyone may read it. */
const EventEntry = Type.Object(
	{
		k: Type.Literal("event"),
		source: Type.String(),
		type: Type.String(),
		actor: Actor,
		audience: Type.Optional(Type.Array(Type.String())),
		payload: Json,
	},
	{ additionalProperties: false },
);

/** The run was saved here and continued from the saved state by a fresh instance of the platform. */
const ResumeEntry = Type.Object({ k: Type.Literal("resume"), minute: Type.Integer({ minimum: 0 }) }, { additionalProperties: false });

/**
 * One entry of the timeline: `minute`, `turn`, `skip`, `call`, `event` or `resume`.
 *
 * @public
 */
export const OracleEntrySchema = Type.Union([MinuteEntry, TurnEntry, SkipEntry, CallEntry, EventEntry, ResumeEntry]);
/**
 * One entry of the timeline.
 *
 * @public
 */
export type OracleEntry = Static<typeof OracleEntrySchema>;
/**
 * A `call` entry: a tool call and its result.
 *
 * @public
 */
export type OracleCall = Static<typeof CallEntry>;

const Source = Type.Object(
	{
		/** `live-replay`: the calls of a recorded live run, played again; `scripted`: calls written by hand. */
		kind: Type.Union([Type.Literal("live-replay"), Type.Literal("scripted")]),
		/** The recorded run (repository path of its `events.jsonl`) or the script's name. */
		from: Type.String(),
		/** What the script does, or what differs from the recording. */
		note: Type.Optional(Type.String()),
		/** `live-replay` only: how closely today's code reproduced the recording. */
		fidelity: Type.Optional(
			Type.Object(
				{
					/** Turns of the recording played again, and how many of them showed the same inputs word for word. */
					turns: Type.Integer({ minimum: 0 }),
					turnsWithEqualInputs: Type.Integer({ minimum: 0 }),
					/** Tool calls played again, and how many got the recorded answer word for word. */
					calls: Type.Integer({ minimum: 0 }),
					callsWithEqualResult: Type.Integer({ minimum: 0 }),
					/** Recorded turns that were never reached (the replay ended earlier, or was cut). */
					turnsLeft: Type.Integer({ minimum: 0 }),
				},
				{ additionalProperties: false },
			),
		),
	},
	{ additionalProperties: false },
);

const Setup = Type.Object(
	{
		/** The story id as the old platform logged it. */
		story: Type.String(),
		seed: Type.Number(),
		minutes: Type.Integer({ minimum: 0 }),
		residents: Type.Array(Type.String()),
		/** In load order, each with its effective options (functions left out). */
		mechanics: Type.Array(Type.Object({ id: Type.String(), options: Json }, { additionalProperties: false })),
		/** The tools residents were granted, in grant order. */
		residentTools: Type.Array(Type.String()),
		/** Tools every resident starts with locked. */
		locked: Type.Array(Type.String()),
		turns: Type.Object(
			{
				passes: Type.Integer({ minimum: 1 }),
				blockSize: Type.Integer({ minimum: 1 }),
				activation: Type.Union([Type.Literal("always"), Type.Literal("onNews")]),
				/** `seeded`: the platform's seeded shuffle per pass; `custom`: a rule of the story or a mechanic (read the turn entries). */
				order: Type.Union([Type.Literal("seeded"), Type.Literal("custom")]),
			},
			{ additionalProperties: false },
		),
		limits: Type.Optional(Json),
		/**
		 * A story written as one definition from which the old platform derived the mechanics' options (City of Keys,
		 * Whispers): `file` is the definition as JSON next to the oracle, `effective` the run dials applied to it.
		 */
		definition: Type.Optional(Type.Object({ file: Type.String(), effective: Json }, { additionalProperties: false })),
	},
	{ additionalProperties: false },
);

/**
 * A whole oracle file: the head and the timeline.
 *
 * @public
 */
export const OracleSchema = Type.Object(
	{
		format: Type.Literal(ORACLE_FORMAT),
		version: Type.Literal(ORACLE_VERSION),
		/** The folder under `oracles/`. */
		game: Type.String(),
		/** The name the old registry played the configuration under (`swt run --story <variant>`). */
		variant: Type.String(),
		seed: Type.Number(),
		/** The runtime revision of the old platform that produced the file (`docs/RUNTIME-REVISIONS.md`). */
		runtimeRevision: Type.Integer(),
		source: Source,
		setup: Setup,
		/** Present when the run was cut before its end: after which minute, and why. */
		truncated: Type.Optional(Type.Object({ afterMinute: Type.Integer({ minimum: 0 }), reason: Type.String() }, { additionalProperties: false })),
		/** How the run ended; absent in a truncated file. */
		end: Type.Optional(Type.Object({ reason: Type.Union([Type.Literal("referee"), Type.Literal("minutes")]), minute: Type.Integer({ minimum: 0 }), limit: Type.Optional(Type.String()) }, { additionalProperties: false })),
		/** Entries per kind and events per `source.type`, for a quick look and as a checksum of the timeline. */
		counts: Type.Object({ entries: Type.Record(Type.String(), Type.Integer()), events: Type.Record(Type.String(), Type.Integer()) }, { additionalProperties: false }),
		timeline: Type.Array(OracleEntrySchema),
	},
	{ additionalProperties: false },
);
/**
 * A parsed oracle file.
 *
 * @public
 */
export type Oracle = Static<typeof OracleSchema>;
/**
 * Where the calls of an oracle file come from.
 *
 * @public
 */
export type OracleSource = Static<typeof Source>;
/**
 * The game identity and the effective options of an oracle file.
 *
 * @public
 */
export type OracleSetup = Static<typeof Setup>;
