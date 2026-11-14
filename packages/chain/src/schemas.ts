// SPDX-License-Identifier: Apache-2.0
/**
 * The chain's file names, constants and entry schemas. Version 1 is the genesis the old platform wrote (it is
 * still read, so old runs verify); version 2 names the hash of the run's manifest instead of repeating its content.
 */
import { Type, type Static } from "typebox";

/** The log of a run, one stored envelope per line. @public */
export const EVENTS_FILE = "events.jsonl";
/** The chain beside the log: the genesis, one hash entry per line, signed heads. @public */
export const CHAIN_FILE = "events.chain.jsonl";
/** The run's Ed25519 public key (PEM, SPKI). @public */
export const PUBLIC_KEY_FILE = "run.pub";
/** The `format` of a genesis. @public */
export const CHAIN_FORMAT = "swarmtales-chain";
/** The genesis version a run writes today. @public */
export const CHAIN_VERSION = 2;
/** What a head signature is made over (`format` of the signed message). */
export const HEAD_FORMAT = "swarmtales-chain-head";
/** The `previousHash` of a chain that continues none. @public */
export const ZERO_HASH = "0".repeat(64);

const hash = (description: string) => Type.String({ pattern: "^[0-9a-f]{64}$", description });
const lines = (description: string) => Type.Integer({ minimum: 0, description });
const literal = <T extends string | number>(value: T, description: string) => Type.Literal(value, { description });

/** A signed head, as a snapshot carries it: what a resumed run chains from. @public */
export const ChainCheckpointSchema = Type.Object(
	{
		genesis: hash("The genesis hash of the chain it belongs to."),
		lines: lines("How many lines of `events.jsonl` it covers."),
		hash: hash("The hash of the last line it covers."),
		publicKey: Type.String({ description: "The chain's public key (base64 SPKI DER)." }),
		signature: Type.String({ description: "Ed25519 over the canonical head message (base64)." }),
		state: Type.Optional(
			hash(
				"sha256 of the canonical JSON of the snapshot the checkpoint was taken for, without its `chain` (`snapshotStateHash`): what a resumed run plays on from. Signed with the head; absent for a checkpoint written before it was.",
			),
		),
	},
	{ additionalProperties: false, description: "A signed head, as a snapshot carries it." },
);
/** A signed head, as a snapshot carries it. @public */
export type ChainCheckpoint = Static<typeof ChainCheckpointSchema>;

const ResumedFromSchema = Type.Object(
	{
		file: Type.String({ description: "The snapshot's file name." }),
		run: Type.Optional(Type.String({ description: "The run that took it, when its file names it." })),
		checkpoint: Type.Optional(ChainCheckpointSchema),
	},
	{ additionalProperties: false, description: "The snapshot a run resumed from; its checkpoint is absent for a file written before the chain (no anchor)." },
);

/** The fields every genesis version has. */
const COMMON = {
	format: literal(CHAIN_FORMAT, "The chain format's name."),
	algorithm: literal("ed25519", "The signature algorithm."),
	digest: literal("sha256", "The hash function."),
	canonical: literal("RFC 8785", "The canonical form a line is hashed in."),
	publicKey: Type.String({ description: "base64 SPKI DER; the same key as `run.pub`." }),
	resumedFrom: Type.Optional(ResumedFromSchema),
} as const;

/** The genesis of version 1, as the old platform wrote it; read only. @public */
export const ChainGenesisSchema = Type.Object(
	{
		...COMMON,
		version: literal(1, "The genesis version."),
		commit: Type.Optional(Type.String({ description: "The code's commit, when the run knew it." })),
		runtime: Type.Optional(Type.Integer({ minimum: 1, description: "The runtime revision the run played on; absent means revision 1." })),
		run: Type.Optional(Type.String({ description: "The run's name, so a renamed run directory shows." })),
		preregistration: Type.Optional(hash("sha256 of a document registered outside before the run: ties the run to a statement fixed before it started.")),
		story: Type.String({ description: "The name of what was played." }),
		storyHash: hash("sha256 of the canonical JSON of the serialised definition of what was played."),
		seed: Type.Number({ description: "The run's seed." }),
		models: Type.Record(Type.String(), Type.String({ description: "A model, as provider and name." }), { description: "Model per role and resident." }),
		commitments: Type.Optional(
			Type.Record(Type.String(), Type.String({ description: "One commitment, usually a hash." }), { description: "Further commitments fixed before the first line (e.g. a hash of a treatment assignment)." }),
		),
	},
	{ additionalProperties: false, description: "The genesis of version 1, as the old platform wrote it." },
);
/** The genesis of version 1. @public */
export type ChainGenesis = Static<typeof ChainGenesisSchema>;

/** The genesis of version 2: everything about the run is in its manifest, and the genesis names the manifest's hash. @public */
export const ChainGenesisV2Schema = Type.Object(
	{
		...COMMON,
		version: literal(2, "The genesis version."),
		manifest: hash("sha256 of the canonical JSON of `manifest.json`."),
		log: Type.Object(
			{ format: Type.String({ description: "The log format's name." }), version: Type.Integer({ description: "The log format's version." }) },
			{ description: "The format of the lines of `events.jsonl`." },
		),
	},
	{ additionalProperties: false, description: "The genesis of version 2: it names the hash of the run's manifest." },
);
/** The genesis of version 2. @public */
export type ChainGenesisV2 = Static<typeof ChainGenesisV2Schema>;

/** What the writer of a version 1 run stated in its genesis; the key and the format fields are the chain's own. @public */
export type ChainGenesisInput = Omit<ChainGenesis, "format" | "version" | "algorithm" | "digest" | "canonical" | "publicKey">;
/** What the writer of a run states in its genesis; the key and the format fields are the chain's own. @public */
export type ChainGenesisV2Input = Omit<ChainGenesisV2, "format" | "version" | "algorithm" | "digest" | "canonical" | "publicKey">;

/** Line 1 of `events.chain.jsonl`. @public */
export const GenesisEntrySchema = Type.Object(
	{
		kind: literal("genesis", "Marks the genesis entry."),
		seq: literal(0, "The genesis stands before line 1."),
		previousHash: hash("The hash the chain continues: a snapshot checkpoint's, or zeros."),
		hash: hash("sha256 of `previousHash` and the canonical JSON of `genesis`."),
		genesis: Type.Union([ChainGenesisSchema, ChainGenesisV2Schema], { description: "The genesis, in either version." }),
	},
	{ additionalProperties: false, description: "Line 1 of `events.chain.jsonl`." },
);
/** One line of `events.jsonl`, chained. */
export const LineEntrySchema = Type.Object(
	{ seq: Type.Integer({ minimum: 1, description: "The line number in `events.jsonl`, from 1." }), hash: hash("sha256 of the hash before and the line's canonical JSON.") },
	{ additionalProperties: false, description: "One line of `events.jsonl`, chained." },
);
/** A signed head over the lines so far. */
export const HeadEntrySchema = Type.Object(
	{
		kind: literal("head", "Marks a signed head."),
		seq: lines("How many lines the head covers."),
		hash: hash("The hash of the last covered line."),
		state: Type.Optional(hash("The state hash of the snapshot the head was signed for.")),
		signature: Type.String({ description: "Ed25519 over the canonical head message (base64)." }),
	},
	{ additionalProperties: false, description: "A signed head over the lines so far." },
);

/** One signed head of a verified chain. @public */
export interface VerifiedHead {
	/** How many lines the head covers. */
	readonly lines: number;
	/** The hash of the last covered line. */
	readonly hash: string;
	/** The state hash of the snapshot the head was signed for, when it is a checkpoint's. */
	readonly state?: string;
}

/** A chain that holds. @public */
export interface ChainHolds {
	/** The chain holds. */
	readonly ok: true;
	/** Lines of `events.jsonl` covered. */
	readonly lines: number;
	/** The hash of the last line. */
	readonly head: string;
	/** The hash of the genesis entry. */
	readonly genesisHash: string;
	/** The genesis; its `version` tells which one. */
	readonly genesis: ChainGenesis | ChainGenesisV2;
	/** The signed heads, in chain order (the last covers every line); a checkpoint's head names its snapshot's state. */
	readonly heads: readonly VerifiedHead[];
}

/** A chain that does not hold. @public */
export interface ChainBroken {
	/** The chain does not hold. */
	readonly ok: false;
	/** The first line of `events.jsonl` that is broken, when the fault is in a line. */
	readonly line?: number;
	/** What is wrong, as a sentence. */
	readonly reason: string;
}

/** What a verification says. @public */
export type ChainVerdict = ChainHolds | ChainBroken;
