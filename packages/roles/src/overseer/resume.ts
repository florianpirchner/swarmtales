/**
 * The overseers' slices of a resumed legacy run (step 18, team R3; C1-13 and C2-9). An old run
 * snapshot keeps the roles' state in three fields (`gamemaker`, `interpreter`, `weaver`); the
 * overseers keep theirs in the host snapshot's `overseers` section, each with a cursor into the host
 * log. There is no schema migration (the cursor is not in the old file); the CLI that converts a
 * legacy snapshot writes the entries this module builds.
 *
 * The converter keeps the old `seq` of every event as the envelope's seq, so a legacy seq is a host
 * log seq and the cursor is the log's last seq at the cut:
 *
 * - **classifier**: `cursor` is the log position the interpreter had read to. The old `pending`
 *   (statements recorded and not yet classified) is not stored; it is re-derived from the log after
 *   the cursor, so the cursor stops just before the first pending statement. `history` is kept.
 * - **weaver**: the old `WeaverSnapshot` plus `cursor`; its old `pending` hits are already in the
 *   file, so the cursor is the last seq (the prefix of the log is only observed, not asked about again).
 * - **gamemaker**: `tracks` and `notes` are kept; `seen` is the last seq, so the first look after the
 *   resume drops its "since your last look" lines, as an old resumed gamemaker started fresh
 *   (`recentFrom` is an old bus seq and cannot be mapped).
 *
 * An old file without a role's field has no entry for it: the overseer starts fresh.
 */
import { Type, type Static } from "typebox";
import { Parse } from "typebox/value";
import { StatementSchema } from "./statements.ts";
import { FateHitSchema } from "./fate.ts";

/** The roles' fields of an old run snapshot, as the converter keeps them (`ConvertedSnapshot.roles`). */
const LegacyRoles = Type.Object({
	gamemaker: Type.Optional(
		Type.Object({
			tracks: Type.Array(Type.Object({ agent: Type.String(), levelSince: Type.Integer(), wrongOnLevel: Type.Integer(), lastActive: Type.Optional(Type.Integer()) })),
			notes: Type.Array(Type.Object({ minute: Type.Integer(), to: Type.String(), text: Type.String() })),
		}),
	),
	interpreter: Type.Optional(
		Type.Object({
			pending: Type.Array(StatementSchema),
			history: Type.Array(Type.Object({ conversation: Type.String(), statements: Type.Array(StatementSchema) })),
		}),
	),
	weaver: Type.Optional(
		Type.Object({
			pending: Type.Array(FateHitSchema),
			patches: Type.Array(
				Type.Object({
					agent: Type.String(),
					act: Type.Integer(),
					kind: Type.Union([Type.Literal("soft"), Type.Literal("hard")]),
					text: Type.String(),
					minute: Type.Integer(),
					seq: Type.Integer(),
				}),
			),
			shifts: Type.Array(Type.Object({ agent: Type.String(), text: Type.String() })),
			voices: Type.Array(Type.Object({ agent: Type.String(), text: Type.String() })),
			closed: Type.Array(Type.Integer()),
		}),
	),
});
type LegacyRoles = Static<typeof LegacyRoles>;

/** The story names the overseers are used under; a role whose overseer the story does not use gets no entry. */
export interface OverseerNames {
	readonly classifier?: string;
	readonly weaver?: string;
	readonly gamemaker?: string;
}

/** One entry of the host snapshot's `overseers` section (`HostSnapshot.overseers`). */
export interface OverseerEntry {
	readonly calls: number;
	readonly costUsd: number;
	readonly slice: { readonly version: number; readonly data: unknown };
}

/**
 * The host snapshot's `overseers` entries for the roles of a legacy snapshot. `roles` is
 * `ConvertedSnapshot.roles` (untrusted: checked here), `lastSeq` the seq of the last event of the
 * converted log (`ConvertedSnapshot.host.seq`).
 */
export function overseerEntriesAtResume(roles: unknown, lastSeq: number, names: OverseerNames): Readonly<Record<string, OverseerEntry>> {
	const legacy: LegacyRoles = Parse(LegacyRoles, roles);
	const entries: Record<string, OverseerEntry> = {};
	const entry = (data: unknown): OverseerEntry => ({ calls: 0, costUsd: 0, slice: { version: 1, data } });
	if (names.classifier !== undefined && legacy.interpreter !== undefined) {
		const first = legacy.interpreter.pending.reduce<number | undefined>((least, statement) => (least === undefined ? statement.seq : Math.min(least, statement.seq)), undefined);
		entries[names.classifier] = entry({ cursor: first === undefined ? lastSeq : Math.max(0, first - 1), history: legacy.interpreter.history });
	}
	if (names.weaver !== undefined && legacy.weaver !== undefined) entries[names.weaver] = entry({ cursor: lastSeq, ...legacy.weaver });
	if (names.gamemaker !== undefined && legacy.gamemaker !== undefined) entries[names.gamemaker] = entry({ tracks: legacy.gamemaker.tracks, notes: legacy.gamemaker.notes, seen: lastSeq });
	return entries;
}
