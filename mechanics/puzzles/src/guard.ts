// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The hand-over guard (old `mechanics/puzzles/src/guard.ts` and the stage `guard` of old
 * `packages/kernel/src/host/waits.ts`), a `review` handler on the guarded tools by bare name (12-m5-spec.md 4.3):
 * the city's own check refuses at once a text that carries a run of what the author knows (`GUARD_BLOCKED`, old
 * `by: "check"`); then the guard is asked with the author's secrets, and a text it judges against the rule is refused.
 * Without a guard in the run, or when the guard fails, the call goes on (old `by: "none"`, "fail open").
 */
import { Type } from "typebox";
import { Value } from "typebox/value";
import type { JsonValue, Refusal, ReviewAnswer } from "@swarmtales/contracts";
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { refuse, type StageCall } from "@swarmtales/sdk";
import { inheritedFragments, lastLevelOf } from "./deal.ts";
import type { PuzzlesCtx } from "./head.ts";
import { carriesRun, sharedRuns } from "./secrets.ts";
import { hasPassed, levelOf } from "./standing.ts";

/** The refusal of the guard (old `GUARD_BLOCKED`). */
const GUARD_BLOCKED = "GUARD_BLOCKED";
/** The fields that hold the guarded text of a tool, in the order looked up (old `guardText`). */
const TEXT_FIELDS = ["message", "memo", "name", "text"] as const;
const Verdict = Type.Object({ allowed: Type.Boolean({ description: "Whether the text keeps the rule" }), reason: Type.Optional(Type.String({ description: "Why" })) }, { description: "The guard's verdict" });

/** A secret a resident legitimately knows (old `GuardedSecret`). */
interface GuardedSecret {
	readonly label: string;
	readonly value: string;
}

/**
 * The residents in the city: not banished, and not taken by a strike that keeps.
 *
 * @param ctx - The context.
 * @returns The residents, in roster order.
 */
export function inCity(ctx: PuzzlesCtx): readonly string[] {
	const gone = [...(ctx.tryCall(ExileService, "exiled", {}) ?? []), ...ctx.state.struck];
	return ctx.residents.ids.filter((id) => !gone.includes(id));
}

/**
 * The open fragment levels that not every resident in the city has passed: the ones whose fragments the city keeps off the board.
 *
 * @param ctx - The context.
 * @returns The levels, ascending.
 */
export function guardedLevels(ctx: PuzzlesCtx): readonly number[] {
	const levels: number[] = [];
	const alive = inCity(ctx);
	for (let level = ctx.options.startLevel; level <= lastLevelOf(ctx); level++) {
		const open = ctx.tick >= (ctx.options.levels.find((entry) => entry.number === level)?.opensAt ?? 0);
		if (ctx.state.levels.get(level)?.puzzle.kind !== "fragments" || !open || alive.every((id) => hasPassed(ctx, id, level))) continue;
		levels.push(level);
	}
	return levels;
}

// The fragments of a guarded level, with the passwords of its teams.
function fragmentLevel(ctx: PuzzlesCtx, level: number): { readonly fragments: ReadonlyMap<string, string>; readonly passwords: readonly string[] } | undefined {
	const puzzle = ctx.state.levels.get(level)?.puzzle;
	return puzzle?.kind === "fragments" ? { fragments: puzzle.fragments, passwords: puzzle.puzzles.map((item) => item.password) } : undefined;
}

/**
 * Whether a text quotes `minRun` or more characters in a row of a fragment of a guarded level.
 *
 * @param ctx - The context.
 * @param text - The text.
 * @param minRun - The shortest run that counts.
 * @returns True when it does.
 */
export function carriesGuardedFragment(ctx: PuzzlesCtx, text: string, minRun: number): boolean {
	return guardedLevels(ctx).some((level) => [...(fragmentLevel(ctx, level)?.fragments.values() ?? [])].some((fragment) => carriesRun(text, fragment, minRun)));
}

/**
 * What `agent` legitimately knows (old `secretsOf`): on every guarded fragment level it has reached, its own fragment
 * (and any it holds for the exiled), and the runs of `minRun` or more password characters in the direct messages it
 * sent or that reached it (`channels.dm_delivered`). Never a whole password it was not told.
 *
 * @param ctx - The context.
 * @param agent - The resident.
 * @param minRun - The shortest run that counts.
 * @returns The secrets, level by level.
 */
export function secretsOf(ctx: PuzzlesCtx, agent: string, minRun: number): readonly GuardedSecret[] {
	const records = ctx.tryCall(ChannelsService, "dmRecords", {}) ?? [];
	const texts = records.filter((record) => record.from === agent || (record.to === agent && ctx.state.delivered.has(record.number))).map((record) => record.text);
	const secrets: GuardedSecret[] = [];
	for (const level of guardedLevels(ctx)) {
		const dealt = fragmentLevel(ctx, level);
		const own = dealt?.fragments.get(agent);
		if (dealt === undefined || own === undefined || level > levelOf(ctx, agent)) continue;
		secrets.push({ label: `your fragment of door ${String(level)}`, value: own });
		for (const [from, fragment] of inheritedFragments(ctx, level, agent)) secrets.push({ label: `the fragment of ${from} on door ${String(level)}, which you hold`, value: fragment });
		const runs = new Set(dealt.passwords.flatMap((password) => texts.flatMap((text) => sharedRuns(text, password, minRun))));
		for (const run of runs) secrets.push({ label: `a part of a door ${String(level)} password you sent or received by DM`, value: run });
	}
	return secrets;
}

/**
 * The city's own check (old `leakOf`): the first secret of which `text` carries `minRun` characters in a row blocks,
 * with one reason whatever matched.
 *
 * @param ctx - The context.
 * @param text - The text.
 * @param secrets - What the author knows.
 * @param minRun - The shortest run that counts.
 * @returns The reason, or undefined.
 */
export function leakOf(ctx: PuzzlesCtx, text: string, secrets: readonly GuardedSecret[], minRun: number): string | undefined {
	return secrets.some((secret) => carriesRun(text, secret.value, minRun)) ? ctx.prompt("puzzles/replies/guard-check", {}) : undefined;
}

// The guarded text of a call: the first text field of its arguments.
function guardText(params: unknown): string | undefined {
	if (typeof params !== "object" || params === null) return undefined;
	for (const field of TEXT_FIELDS) {
		const value: unknown = field in params ? Reflect.get(params, field) : undefined;
		if (typeof value === "string") return value;
	}
	return undefined;
}

/**
 * The guard's question on a call of a guarded tool by a resident: refused at once by the city's check, skipped
 * without a guard in the run, else asked with the rule, the text and the author's secrets.
 *
 * @param call - The call.
 * @param ctx - The context.
 * @param answerable - Whether a guard answers in this run.
 * @returns The question, a refusal, or undefined (the call goes on).
 */
export function askGuard(call: StageCall, ctx: PuzzlesCtx, answerable: boolean): { readonly question: JsonValue } | Refusal | undefined {
	const policy = ctx.options.guards.find((rule) => rule.tools.includes(call.tool));
	const text = guardText(call.params);
	if (policy === undefined || call.resident === undefined || text === undefined) return undefined;
	const secrets = policy.minRun === undefined ? [] : secretsOf(ctx, call.resident, policy.minRun);
	const leak = policy.minRun === undefined ? undefined : leakOf(ctx, text, secrets, policy.minRun);
	if (leak !== undefined) return refuse(GUARD_BLOCKED, leak);
	if (!answerable) return undefined;
	return { question: { resident: call.resident, tool: call.tool, rule: policy.rule, text, secrets: secrets.map((secret) => ({ label: secret.label, value: secret.value })) } };
}

/**
 * The guard's verdict: a text it judges against the rule is refused with its reason; a failed answer lets the call
 * through ("fail open").
 *
 * @param answer - The answer.
 * @returns `GUARD_BLOCKED`, or undefined.
 */
export function decideGuard(answer: ReviewAnswer): Refusal | undefined {
	if (!answer.ok || !Value.Check(Verdict, answer.answer)) return undefined;
	return answer.answer.allowed ? undefined : refuse(GUARD_BLOCKED, answer.answer.reason ?? "");
}
