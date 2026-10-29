/**
 * Run snapshots (SPEC 17): the complete state of a run at a round boundary,
 * written as `snapshot-L<level>.json` once every competitor has passed that
 * level, so a later run can continue from it instead of replaying the warm-up.
 *
 * The file serializes every engine object explicitly (each component has its
 * own `snapshot()` and `restore()`), together with the recorded event prefix
 * the new run's log starts with. It is versioned and, being a file, untrusted:
 * {@link parseSnapshot} checks all of it with typebox before anything is used.
 */
import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Type, type Static } from "typebox";
import { Compile } from "typebox/compile";
import type { ContextMessage } from "../agents/runner.ts";
import type { ArenaSnapshot } from "../engine/arena.ts";
import type { DirectorSnapshot } from "../engine/director.ts";
import type { RecordedEvent } from "../engine/events.ts";
import type { WorldSnapshot } from "../engine/world.ts";
import type { GamemakerSnapshot } from "../gamemaker/gamemaker.ts";
import type { InterpreterSnapshot } from "../interpret/interpreter.ts";
import { STATEMENT_SOURCES } from "../interpret/labels.ts";
import { TOOL_NAMES } from "../tools/catalog.ts";
import { CoreDriveSchema, CoreTraitSchema, FactorHoldingSchema, GoalSchema, RecordedEventSchema, TeamCertificateSchema } from "./event-schema.ts";
import { ContextMessageSchema, type Writable } from "./message-schema.ts";

export const SNAPSHOT_FORMAT = "agent-arena-snapshot";
/** Raised whenever the file layout changes; older files are refused, never guessed at. */
export const SNAPSHOT_VERSION = 2;

/** The parameters of the run that took the snapshot. */
export interface SnapshotRun {
	readonly startLevel: number;
	readonly lastLevel: number;
	readonly minutes: number;
	readonly personas: boolean;
	/** The `run_start` meta of the snapshot's run (run name, models). */
	readonly meta?: Readonly<Record<string, string>>;
}

export interface RunSnapshot {
	readonly format: typeof SNAPSHOT_FORMAT;
	readonly version: typeof SNAPSHOT_VERSION;
	readonly story: string;
	readonly seed: number;
	readonly agents: number;
	/** Every competitor had passed this level. */
	readonly level: number;
	/** The last round played; the clock still shows its minute. */
	readonly round: number;
	readonly minute: number;
	readonly run: SnapshotRun;
	/** Every event up to the cut, numbered 1..n; a resumed run's log starts with them. */
	readonly events: readonly RecordedEvent[];
	readonly arena: ArenaSnapshot;
	readonly world: WorldSnapshot;
	readonly director: DirectorSnapshot;
	/** Each competitor's persistent model context, without system messages. */
	readonly competitors: readonly { readonly agent: string; readonly messages: readonly ContextMessage[] }[];
	readonly gamemaker?: GamemakerSnapshot;
	readonly interpreter?: InterpreterSnapshot;
	/**
	 * Set when an act's brake wrote the snapshot (v08): not every resident had
	 * passed `level`; those `behind` play on from their level after the resume.
	 */
	readonly brake?: SnapshotBrake;
}

export interface SnapshotBrake {
	readonly act: string;
	readonly minute: number;
	readonly maxMinutes: number;
	readonly behind: readonly { readonly agent: string; readonly level: number }[];
}

export class SnapshotError extends Error {
	override readonly name = "SnapshotError";
}

export function snapshotFileName(level: number): string {
	return `snapshot-L${level}.json`;
}

/**
 * Writes the snapshot into a run directory; returns its path. The file appears
 * whole or not at all (written aside, then renamed), and it is checked as
 * `--resume` will check it, so a snapshot that could not be resumed fails
 * now, at the cut, and not in a later run.
 */
export function writeSnapshot(directory: string, snapshot: RunSnapshot, name = snapshotFileName(snapshot.level)): string {
	const path = join(directory, name);
	const text = `${JSON.stringify(snapshot)}\n`;
	const partial = `${path}.partial`;
	writeFileSync(partial, text);
	renameSync(partial, path);
	parseSnapshot(JSON.parse(text), path);
	return path;
}

export function readSnapshot(path: string): RunSnapshot {
	let text: string;
	try {
		text = readFileSync(path, "utf8");
	} catch (error) {
		throw new SnapshotError(`Cannot read snapshot ${path}: ${error instanceof Error ? error.message : String(error)}`);
	}
	let raw: unknown;
	try {
		raw = JSON.parse(text);
	} catch (error) {
		throw new SnapshotError(`Snapshot ${path} is not JSON: ${error instanceof Error ? error.message : String(error)}`);
	}
	return parseSnapshot(raw, path);
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const Id = Type.String();
const Ids = Type.Array(Type.String());
const Int = Type.Integer();
const Texts = Type.Record(Type.String(), Type.String());
const Team = Type.Object({ members: Ids, leader: Id });
const MailboxEntry = Type.Object({ from: Id, text: Type.String(), minute: Int, number: Type.Optional(Int) });
const CollectedDm = Type.Object({ from: Id, text: Type.String(), minute: Int });
const Statement = Type.Object({
	seq: Int,
	minute: Int,
	agent: Id,
	source: Type.Enum(STATEMENT_SOURCES),
	to: Ids,
	group: Type.Optional(Type.String()),
	text: Type.String(),
});
const Keyed = Type.Object({ key: Type.String(), minute: Int });

const LevelSchema = Type.Union([
	Type.Object({
		level: Int,
		teams: Type.Array(Team),
		kind: Type.Literal("fragments"),
		puzzles: Type.Array(Type.Object({ password: Type.String(), fragments: Type.Array(Type.String()), overlap: Int })),
		fragments: Type.Array(Type.Object({ agent: Id, fragment: Type.String() })),
	}),
	Type.Object({
		level: Int,
		teams: Type.Array(Team),
		kind: Type.Literal("additive"),
		deal: Type.Object({ digits: Int, cityFactor: Type.String(), teams: Type.Array(TeamCertificateSchema), holdings: Type.Array(FactorHoldingSchema) }),
	}),
]);

const ReceiptBase = { id: Type.String(), minute: Int, parties: Ids };
const ReceiptSchema = Type.Union([
	Type.Object({ ...ReceiptBase, kind: Type.Literal("transfer"), from: Id, to: Id, amount: Int, memo: Type.String() }),
	Type.Object({ ...ReceiptBase, kind: Type.Literal("escrow"), cast: Id, to: Id, amount: Int }),
	Type.Object({ ...ReceiptBase, kind: Type.Literal("deposit"), from: Id, group: Id, amount: Int }),
	Type.Object({ ...ReceiptBase, kind: Type.Literal("withdrawal"), group: Id, treasurer: Id, to: Id, amount: Int }),
	Type.Object({ ...ReceiptBase, kind: Type.Literal("levelUp"), agent: Id, level: Int, reward: Int }),
	Type.Object({ ...ReceiptBase, kind: Type.Literal("dm"), from: Id, to: Id, number: Int }),
]);

const WorldSchema = Type.Object({
	door: Type.Optional(Int),
	doorReleased: Type.Optional(Type.Boolean()),
	actStarts: Type.Optional(Type.Array(Type.Object({ fromLevel: Int, minute: Int }))),
	competitors: Type.Array(
		Type.Object({
			agent: Id,
			level: Int,
			held: Type.Boolean(),
			solved: Type.Array(Int),
			wrongAttempts: Type.Array(Int),
			extraTools: Type.Array(Type.Enum(TOOL_NAMES)),
			mailbox: Type.Array(MailboxEntry),
			notices: Type.Array(Type.Object({ author: Id, text: Type.String(), number: Type.Optional(Int) })),
		}),
	),
	ledger: Type.Object({
		balances: Type.Array(Type.Object({ account: Type.String(), balance: Int })),
		entries: Type.Array(
			Type.Object({
				txId: Type.String(),
				debit: Type.String(),
				credit: Type.String(),
				amount: Int,
				reason: Type.String(),
				minute: Int,
				idempotencyKey: Type.Optional(Type.String()),
			}),
		),
		txSeq: Int,
	}),
	board: Type.Object({
		posts: Type.Array(
			Type.Object({
				seq: Int,
				author: Id,
				text: Type.String(),
				minute: Int,
				kind: Type.Union([Type.Literal("player"), Type.Literal("city"), Type.Literal("system")]),
			}),
		),
		cursors: Type.Array(Type.Object({ reader: Id, seq: Int })),
	}),
	groups: Type.Object({
		groups: Type.Array(
			Type.Object({
				id: Id,
				name: Type.String(),
				founder: Id,
				treasurer: Id,
				members: Type.Array(Type.Object({ agent: Id, joinedAtSeq: Int })),
				reads: Type.Array(Type.Object({ agent: Id, seq: Int })),
				posts: Type.Array(Type.Object({ seq: Int, author: Id, text: Type.String(), minute: Int })),
				removed: Type.Optional(Type.Literal(true)),
			}),
		),
		founded: Type.Array(Type.Object({ agent: Id, count: Int })),
		seq: Int,
	}),
	marks: Type.Array(Type.Object({ agent: Id, level: Int, remaining: Int, since: Type.Optional(Int) })),
	cast: Type.Object({
		members: Type.Array(Type.Object({ id: Id, level: Int, hidden: Type.Boolean(), retired: Type.Boolean() })),
		collections: Type.Array(
			Type.Object({
				into: Type.String(),
				cast: Id,
				first: Int,
				untilMinute: Int,
				distinctSenders: Type.Boolean(),
				entries: Type.Array(CollectedDm),
				afterSolve: Type.Optional(Type.Object({ level: Int, minutes: Int })),
			}),
		),
	}),
	receipts: Type.Array(ReceiptSchema),
	petitions: Type.Array(
		Type.Object({
			id: Type.String(),
			text: Type.String(),
			threshold: Int,
			deadlineMinute: Int,
			visibility: Type.Union([Type.Literal("public"), Type.Literal("secret")]),
			openedAt: Int,
			status: Type.Union([Type.Literal("open"), Type.Literal("passed"), Type.Literal("failed")]),
			signatures: Int,
			signers: Ids,
			resolvedAt: Type.Optional(Int),
		}),
	),
	dms: Type.Array(
		Type.Object({
			id: Int,
			from: Id,
			to: Id,
			minute: Int,
			answered: Type.Boolean(),
			text: Type.Optional(Type.String()),
			deliveredMinute: Type.Optional(Int),
			deliveredAfter: Type.Optional(Int),
		}),
	),
	messages: Type.Optional(Int),
	cityFactors: Type.Optional(Type.Array(Type.Object({ level: Int, agents: Ids }))),
	blames: Type.Optional(Type.Object({ pairs: Type.Array(Type.Object({ dm: Int, claim: Int })) })),
	tribunal: Type.Optional(
		Type.Object({
			announced: Type.Boolean(),
			sessions: Type.Array(
				Type.Object({
					minute: Int,
					accused: Ids,
					voters: Ids,
					until: Int,
					votes: Type.Array(Type.Object({ voter: Id, target: Id })),
					closed: Type.Boolean(),
					tribunal: Type.Optional(Int),
					count: Type.Optional(Int),
				}),
			),
			gates: Type.Array(
				Type.Object({
					agent: Id,
					since: Int,
					until: Int,
					ransomable: Type.Boolean(),
					price: Type.Optional(Int),
					selfPrice: Type.Optional(Int),
					voters: Ids,
					payments: Type.Array(Type.Object({ payer: Id, amount: Int })),
					will: Type.Optional(Type.Object({ text: Type.String(), factors: Type.Array(Type.String()) })),
				}),
			),
			exiled: Ids,
			ransomed: Ids,
			// Since v06: the pacing and the faction draft.
			residents: Type.Optional(Int),
			// Since v08: the act's start.
			actStart: Type.Optional(Int),
			called: Type.Optional(Int),
			plan: Type.Optional(
				Type.Object({
					tribunal: Int,
					opens: Int,
					calledAt: Int,
					count: Int,
					factions: Int,
					by: Type.Union([Type.Literal("progress"), Type.Literal("deadline"), Type.Literal("gamemaker"), Type.Literal("fallback"), Type.Literal("final")]),
					reason: Type.Optional(Type.String()),
					called: Type.Boolean(),
				}),
			),
			lastResult: Type.Optional(Int),
			ended: Type.Optional(Type.Boolean()),
			halted: Type.Optional(Type.Boolean()),
			draft: Type.Optional(
				Type.Object({
					tribunal: Int,
					factions: Int,
					group: Id,
					members: Ids,
					nominateUntil: Int,
					opens: Int,
					cap: Type.Optional(Int),
					nominations: Type.Array(Type.Object({ voter: Id, nominee: Id })),
					leaders: Type.Optional(Ids),
					applications: Type.Array(Type.Object({ agent: Id, leader: Id })),
					refusals: Type.Array(Type.Object({ leader: Id, agent: Id })),
					formed: Type.Optional(Type.Array(Type.Object({ leader: Id, group: Id, members: Ids }))),
				}),
			),
		}),
	),
	exclusions: Type.Optional(Type.Array(Type.Object({ level: Int, agents: Ids }))),
	// Since v08: resident names.
	names: Type.Optional(
		Type.Object({
			entries: Type.Array(Type.Object({ agent: Id, name: Type.String({ minLength: 1 }), fallback: Type.Boolean() })),
			settled: Type.Boolean(),
		}),
	),
	levels: Type.Array(LevelSchema),
	// Since v09: wrong codes and lost blames per resident in the current act.
	offences: Type.Optional(Type.Array(Type.Object({ agent: Id, wrong: Int, blames: Int }))),
	// Since v09: character cores (permanent), secret goals per act, the black seal, acts that are over.
	cores: Type.Optional(
		Type.Array(Type.Object({ agent: Id, bigFive: Type.Array(CoreTraitSchema), drives: Type.Array(CoreDriveSchema), figure: Type.Optional(Type.String()) })),
	),
	goals: Type.Optional(
		Type.Object({
			acts: Type.Array(
				Type.Object({
					act: Int,
					goals: Type.Array(Type.Object({ agent: Id, goal: GoalSchema })),
					resolved: Type.Boolean(),
					leads: Type.Array(Type.Object({ agent: Id, count: Int })),
					heirs: Ids,
					voided: Ids,
				}),
			),
		}),
	),
	seal: Type.Optional(
		Type.Object({
			actStart: Int,
			seals: Type.Array(
				Type.Object({
					seal: Int,
					opens: Int,
					until: Int,
					bids: Type.Array(Type.Object({ agent: Id, points: Int })),
					state: Type.Union([Type.Literal("pending"), Type.Literal("open"), Type.Literal("held"), Type.Literal("used"), Type.Literal("gone")]),
					holder: Type.Optional(Id),
				}),
			),
		}),
	),
	endedActs: Type.Optional(Type.Array(Int)),
	standoff: Type.Optional(
		Type.Object({
			given: Type.Array(Type.String()),
			givenAt: Type.Optional(Type.Record(Type.String(), Int)),
			city: Type.Array(
				Type.Object({
					from: Id,
					piece: Type.Object({ id: Type.String(), level: Int, label: Type.String(), value: Type.String(), needers: Ids }),
					claimed: Ids,
					price: Type.Optional(Int),
				}),
			),
			ultimatums: Type.Array(
				Type.Object({
					number: Int,
					between: Ids,
					until: Int,
					penalty: Int,
					debts: Type.Array(
						Type.Object({ holder: Id, needer: Id, level: Int, pieces: Type.Array(Type.Object({ id: Type.String(), label: Type.String() })) }),
					),
				}),
			),
			lastUltimatum: Int,
		}),
	),
});

const RunSnapshotSchema = Type.Object({
	format: Type.Literal(SNAPSHOT_FORMAT),
	version: Type.Literal(SNAPSHOT_VERSION),
	story: Type.String(),
	seed: Int,
	agents: Type.Integer({ minimum: 1 }),
	level: Type.Integer({ minimum: 1 }),
	round: Type.Integer({ minimum: 1 }),
	minute: Type.Integer({ minimum: 0 }),
	run: Type.Object({
		startLevel: Type.Integer({ minimum: 1 }),
		lastLevel: Type.Integer({ minimum: 1 }),
		minutes: Type.Integer({ minimum: 1 }),
		personas: Type.Boolean(),
		meta: Type.Optional(Texts),
	}),
	events: Type.Array(RecordedEventSchema),
	arena: Type.Object({
		delivered: Type.Array(Type.Object({ agent: Id, level: Int, finished: Type.Boolean() })),
		seenPoints: Type.Array(Type.Object({ agent: Id, points: Int })),
		seenBoard: Type.Array(Type.Object({ agent: Id, seq: Int })),
		braked: Type.Optional(Type.Array(Int)),
	}),
	world: WorldSchema,
	director: Type.Object({
		fired: Ids,
		lastFired: Type.Array(Keyed),
		enteredLevels: Type.Array(Int),
		allPastDone: Ids,
		handledDms: Type.Array(Type.Object({ rule: Type.String(), dms: Type.Array(Int) })),
		splitSince: Type.Array(Keyed),
		splitAnnounced: Ids,
		petitions: Type.Array(Type.Object({ petition: Type.String(), rule: Type.String(), via: Type.Optional(Type.String()) })),
	}),
	competitors: Type.Array(Type.Object({ agent: Id, messages: Type.Array(ContextMessageSchema) })),
	gamemaker: Type.Optional(
		Type.Object({
			tracks: Type.Array(Type.Object({ agent: Id, levelSince: Int, wrongOnLevel: Int, lastActive: Type.Optional(Int) })),
			notes: Type.Array(Type.Object({ minute: Int, to: Type.String(), text: Type.String() })),
			recentFrom: Type.Integer({ minimum: 1 }),
		}),
	),
	interpreter: Type.Optional(
		Type.Object({
			pending: Type.Array(Statement),
			history: Type.Array(Type.Object({ conversation: Type.String(), statements: Type.Array(Statement) })),
		}),
	),
	brake: Type.Optional(
		Type.Object({ act: Type.String(), minute: Int, maxMinutes: Int, behind: Type.Array(Type.Object({ agent: Id, level: Int })) }),
	),
});

// A checked file is a snapshot, so the run takes it without a cast.
const checkedIsSnapshot = (snapshot: Static<typeof RunSnapshotSchema>): RunSnapshot => snapshot;
// ... and every snapshot the engine takes passes the check.
const snapshotIsChecked = (snapshot: Writable<RunSnapshot>): Static<typeof RunSnapshotSchema> => snapshot;
export const snapshotSchemaChecks = [checkedIsSnapshot, snapshotIsChecked] as const;

const validator = Compile(RunSnapshotSchema);
const header = Compile(Type.Object({ format: Type.String(), version: Type.Number() }));

/** Checks an untrusted value against the snapshot schema and its invariants. */
export function parseSnapshot(raw: unknown, source = "snapshot"): RunSnapshot {
	if (!header.Check(raw)) throw new SnapshotError(`${source} is not a run snapshot`);
	if (raw.format !== SNAPSHOT_FORMAT) throw new SnapshotError(`${source} is not a run snapshot (format "${raw.format}")`);
	if (raw.version !== SNAPSHOT_VERSION) {
		throw new SnapshotError(`${source} has snapshot version ${raw.version}; this build reads version ${SNAPSHOT_VERSION} only`);
	}
	if (!validator.Check(raw)) {
		if (JSON.stringify(raw).includes('"type":"gamemaster_')) {
			throw new SnapshotError(`${source} was recorded before the gamemaker rename; run \`pnpm migrate:gamemaker <its directory>\` first`);
		}
		const errors = validator
			.Errors(raw)
			.slice(0, 5)
			.map((error) => `  ${error.instancePath === "" ? "/" : error.instancePath}: ${error.message}`);
		throw new SnapshotError(`${source} does not match the snapshot schema:\n${errors.join("\n")}`);
	}
	raw.events.forEach((event, index) => {
		if (event.seq !== index + 1) throw new SnapshotError(`${source}: event ${index + 1} has seq ${event.seq}`);
	});
	const ids = raw.world.competitors.map((entry) => entry.agent);
	if (ids.length !== raw.agents) throw new SnapshotError(`${source}: ${ids.length} competitors for ${raw.agents} agents`);
	if (raw.competitors.map((entry) => entry.agent).join(",") !== ids.join(",")) {
		throw new SnapshotError(`${source}: the competitor contexts do not match the world's competitors`);
	}
	if (raw.round !== raw.minute + 1) throw new SnapshotError(`${source}: round ${raw.round} is not played at minute ${raw.minute}`);
	return raw;
}
