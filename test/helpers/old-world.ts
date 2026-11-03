/**
 * The old `World` after a recorded run (step 18, item 7b): what the differential tests read from
 * the old engine's world once its run was over, recorded with the run (by the old recorder, deleted with the engine in step 18)
 * and read back here with the old method names, so a test reads `old.world.levelOf(id)` as it did.
 */
import { LegacyWorldSnapshotSchema } from "@swarmtales/chronicle";
import { Type, type Static } from "typebox";

export const HeldPiece = Type.Object({
	id: Type.String(),
	kind: Type.Union([Type.Literal("certificate"), Type.Literal("counter"), Type.Literal("fragment")]),
	level: Type.Number(),
	label: Type.String(),
	value: Type.String(),
	needers: Type.Array(Type.String()),
});

const Resident = Type.Object({
	level: Type.Number(),
	finished: Type.Boolean(),
	exiled: Type.Boolean(),
	/** `display(id)`: the resident's id as the city shows it (with its name when names are on). */
	display: Type.String(),
	name: Type.Optional(Type.String()),
	balance: Type.Number(),
	held: Type.Array(HeldPiece),
	/** The levels `hasPassed` is true for. */
	passed: Type.Array(Type.Number()),
	/** `inspect.codeOf(id, level)` per level, where the level has a solution for the resident. */
	codes: Type.Record(Type.String(), Type.String()),
});

const WhisperDuty = Type.Object({
	agent: Type.String(),
	since: Type.Number(),
	nextVote: Type.Number(),
	whispers: Type.Number(),
	recipients: Type.Array(Type.String()),
	needWhispers: Type.Number(),
	needRecipients: Type.Number(),
	met: Type.Boolean(),
	busiest: Type.Optional(Type.Object({ pair: Type.Tuple([Type.String(), Type.String()]), dms: Type.Number() })),
});

const Standing = Type.Object({ points: Type.Number(), rank: Type.Number() });
/** A question the old run asked its judge (`DenialQuestion`). */
export const DenialQuestionRecord = Type.Object({
	sender: Type.String(),
	accused: Type.String(),
	dm: Type.Object({ number: Type.Number(), text: Type.String() }),
	claim: Type.Object({ number: Type.Number(), channel: Type.Union([Type.Literal("dm"), Type.Literal("board"), Type.Literal("group")]), text: Type.String() }),
	standing: Type.Optional(Type.Object({ sender: Standing, accused: Standing, residents: Type.Number() })),
});

export const OldWorldRecord = Type.Object({
	snapshot: LegacyWorldSnapshotSchema,
	minute: Type.Number(),
	competitors: Type.Array(Type.String()),
	startLevel: Type.Number(),
	lastLevel: Type.Number(),
	residents: Type.Record(Type.String(), Resident),
	/** `actStartOf(level)` per level that has an answer. */
	actStarts: Type.Record(Type.String(), Type.Number()),
	whisperDutyNow: Type.Optional(WhisperDuty),
});
export type OldWorldRecord = Static<typeof OldWorldRecord>;

type Snapshot = Static<typeof LegacyWorldSnapshotSchema>;
type Receipt = Snapshot["receipts"][number];

/** The recorded world, read through the old `World`'s method names. */
export class RecordedWorld {
	readonly #record: OldWorldRecord;
	readonly minute: number;
	readonly competitors: readonly string[];
	readonly startLevel: number;
	readonly lastLevel: number;

	constructor(record: OldWorldRecord) {
		this.#record = record;
		this.minute = record.minute;
		this.competitors = record.competitors;
		this.startLevel = record.startLevel;
		this.lastLevel = record.lastLevel;
	}

	#resident(agent: string): Static<typeof Resident> {
		const resident = this.#record.residents[agent];
		if (resident === undefined) throw new Error(`the recorded world has no resident ${agent}`);
		return resident;
	}

	snapshot(): Snapshot {
		return this.#record.snapshot;
	}

	get alive(): readonly string[] {
		return this.competitors.filter((agent) => !this.isExiled(agent));
	}

	levelOf(agent: string): number {
		return this.#resident(agent).level;
	}

	isFinished(agent: string): boolean {
		return this.#resident(agent).finished;
	}

	isExiled(agent: string): boolean {
		return this.#resident(agent).exiled;
	}

	display(agent: string): string {
		return this.#resident(agent).display;
	}

	nameOf(agent: string): string | undefined {
		return this.#resident(agent).name;
	}

	heldPieces(agent: string): readonly Static<typeof HeldPiece>[] {
		return this.#resident(agent).held;
	}

	hasPassed(agent: string, level: number): boolean {
		return this.#resident(agent).passed.includes(level);
	}

	actStartOf(level: number): number | undefined {
		return this.#record.actStarts[String(level)];
	}

	whisperDutyNow(): Static<typeof WhisperDuty> | undefined {
		return this.#record.whisperDutyNow;
	}

	get dms(): Snapshot["dms"] {
		return this.#record.snapshot.dms;
	}

	readonly ledger = {
		balance: (agent: string): number => this.#resident(agent).balance,
	};

	readonly receipts = {
		/** Receipts `party` is involved in, oldest first. */
		of: (party: string): readonly Receipt[] => this.#record.snapshot.receipts.filter((receipt) => receipt.parties.includes(party)),
	};

	/** The resident's code of a level, or `?` where the old run never dealt it (for fingerprints, which ask every minute). */
	knownCode(agent: string, level: number): string {
		return this.#resident(agent).codes[String(level)] ?? "?";
	}

	readonly inspect = {
		codeOf: (agent: string, level: number): string => {
			const code = this.#resident(agent).codes[String(level)];
			if (code === undefined) throw new Error(`the recorded world has no code of ${agent} on level ${String(level)}`);
			return code;
		},
	};
}
