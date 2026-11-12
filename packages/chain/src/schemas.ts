/** The chain's file names, constants and entry schemas (docs/design/event-log-signing.md). */
import { Type, type Static } from "typebox";

export const EVENTS_FILE = "events.jsonl";
export const CHAIN_FILE = "events.chain.jsonl";
export const PUBLIC_KEY_FILE = "run.pub";
export const CHAIN_FORMAT = "swarmtales-chain";
export const CHAIN_VERSION = 1;
/** What a head signature is made over (`format` of the signed message). */
export const HEAD_FORMAT = "swarmtales-chain-head";
/** The `previousHash` of a chain that continues none. */
export const ZERO_HASH = "0".repeat(64);

const Hash = Type.String({ pattern: "^[0-9a-f]{64}$" });
const Lines = Type.Integer({ minimum: 0 });

/** A signed head, as a snapshot carries it: what a resumed run chains from. */
export const ChainCheckpointSchema = Type.Object(
	{
		/** The genesis hash of the chain it belongs to. */
		genesis: Hash,
		/** How many lines of `events.jsonl` it covers. */
		lines: Lines,
		hash: Hash,
		/** The chain's public key (base64 SPKI DER). */
		publicKey: Type.String(),
		/** Ed25519 over the canonical head message (base64). */
		signature: Type.String(),
		/**
		 * sha256 of the canonical JSON of the snapshot the checkpoint was taken for, without its `chain`
		 * (`snapshotStateHash`): the host state, the envelopes and the residents' contexts a resumed run
		 * plays on from. Signed with the head; absent for a checkpoint written before it was (step 18
		 * challenge, chain-security M1).
		 */
		state: Type.Optional(Hash),
	},
	{ additionalProperties: false },
);
export type ChainCheckpoint = Static<typeof ChainCheckpointSchema>;

const ResumedFromSchema = Type.Object(
	{
		/** The snapshot's file name. */
		file: Type.String(),
		/** The run that took it, when its file names it. */
		run: Type.Optional(Type.String()),
		/** The snapshot's signed head; absent for a file written before the chain (no anchor). */
		checkpoint: Type.Optional(ChainCheckpointSchema),
	},
	{ additionalProperties: false },
);

export const ChainGenesisSchema = Type.Object(
	{
		format: Type.Literal(CHAIN_FORMAT),
		version: Type.Literal(CHAIN_VERSION),
		algorithm: Type.Literal("ed25519"),
		digest: Type.Literal("sha256"),
		canonical: Type.Literal("RFC 8785"),
		/** base64 SPKI DER; the same key as `run.pub`. */
		publicKey: Type.String(),
		/** The code's commit, when the run knew it. */
		commit: Type.Optional(Type.String()),
		/** The runtime revision the run played on (docs/RUNTIME-REVISIONS.md); absent means revision 1. */
		runtime: Type.Optional(Type.Integer({ minimum: 1 })),
		/** The run's name (`run-004`), so a renamed run directory shows. */
		run: Type.Optional(Type.String()),
		/**
		 * sha256 of a document registered outside before the run (`--preregistration <file>`, e.g. the
		 * ISTAnt replica's pre-registration with its nonce and declared run count): ties the run to a
		 * statement fixed before it started. See "The limit" in docs/design/event-log-signing.md.
		 */
		preregistration: Type.Optional(Hash),
		story: Type.String(),
		/** sha256 of the canonical JSON of the serialised story (`story` in `000-run.json`). */
		storyHash: Hash,
		seed: Type.Number(),
		/** Model per role and resident, e.g. `A01: anthropic/claude-haiku-4-5`. */
		models: Type.Record(Type.String(), Type.String()),
		/** Further commitments fixed before the first line (e.g. a hash of a treatment assignment). */
		commitments: Type.Optional(Type.Record(Type.String(), Type.String())),
		resumedFrom: Type.Optional(ResumedFromSchema),
	},
	{ additionalProperties: false },
);
export type ChainGenesis = Static<typeof ChainGenesisSchema>;

/** What the writer of a run states in its genesis; the key and the format fields are the chain's own. */
export type ChainGenesisInput = Omit<ChainGenesis, "format" | "version" | "algorithm" | "digest" | "canonical" | "publicKey">;

/** Line 1 of `events.chain.jsonl`. */
export const GenesisEntrySchema = Type.Object({ kind: Type.Literal("genesis"), seq: Type.Literal(0), previousHash: Hash, hash: Hash, genesis: ChainGenesisSchema }, { additionalProperties: false });
/** One line of `events.jsonl`, chained. */
export const LineEntrySchema = Type.Object({ seq: Type.Integer({ minimum: 1 }), hash: Hash }, { additionalProperties: false });
/** A signed head over the lines so far. */
export const HeadEntrySchema = Type.Object({ kind: Type.Literal("head"), seq: Lines, hash: Hash, state: Type.Optional(Hash), signature: Type.String() }, { additionalProperties: false });

export type ChainVerdict =
	| {
			readonly ok: true;
			/** Lines of `events.jsonl` covered. */
			readonly lines: number;
			readonly head: string;
			readonly genesisHash: string;
			readonly genesis: ChainGenesis;
			/** The signed heads, in chain order (the last covers every line); a checkpoint's head names its snapshot's state. */
			readonly heads: readonly { readonly lines: number; readonly hash: string; readonly state?: string }[];
	  }
	| {
			readonly ok: false;
			/** The first line of `events.jsonl` that is broken, when the fault is in a line. */
			readonly line?: number;
			readonly reason: string;
	  };
