/**
 * The progression tools (old packages/engine/src/tools/status.ts): `getStatus`, `activeTools`,
 * `getProblem`, `submitSolution` and `listAgents`. The reply texts and error codes are the old ones.
 * `getStatus` lists what this mechanic and its dependencies know: the unread DMs from the channels,
 * the receipt lines from the receipts, the tools the host leaves open for the resident.
 */
import { Type } from "typebox";
import { TOOL_NAMES, type MechanicKit, type ShapeOf, type ToolOutcome } from "@swarmtales/contracts";
import { ChannelsApi, LedgerApi, MarksApi, ReceiptsApi } from "@swarmtales/mechanic-shared";
import type { ProgressionCtx, progressionWorkHead } from "./head.ts";
import { competitorOf, isFinished, isOpenOnClock, opensAt, ranking } from "./levels.ts";
import { submit } from "./submit.ts";
import { problemFor } from "./task.ts";

type Kit = MechanicKit<ShapeOf<typeof progressionWorkHead>>;

function ok(reply: string): ToolOutcome {
	return { ok: true, reply };
}

function refuse(code: string, detail?: string): ToolOutcome {
	return detail === undefined ? { ok: false, code } : { ok: false, code, detail };
}

function residentOf(ctx: { readonly resident: string | undefined }): string {
	if (ctx.resident === undefined) throw new Error("A resident tool was called without a resident");
	return ctx.resident;
}

/** The tools open to the resident now, in the old order (`TOOL_NAMES`, as `enabledTools` listed them) whatever order the story grants them in. */
function openTools(ctx: ProgressionCtx, resident: string): readonly string[] {
	const open = ctx.access.open(resident);
	const rank = (tool: string): number => {
		const at = TOOL_NAMES.findIndex((name) => name === tool);
		return at < 0 ? TOOL_NAMES.length : at;
	};
	return [...open].sort((a, b) => rank(a) - rank(b));
}

function statusReply(ctx: ProgressionCtx, self: string): string {
	const entry = competitorOf(ctx, self);
	const finished = isFinished(ctx, self);
	const rank = ranking(ctx).find((candidate) => candidate.agent === self)?.rank ?? ctx.residents.ids.length;
	const levelNote = `${finished ? ` ${ctx.prompt("replies/status-all-solved", {})}` : ""}${
		entry.held ? ` ${ctx.prompt("replies/status-passed", { level: entry.level })}` : ""
	}${finished || isOpenOnClock(ctx, entry.level) ? "" : ` ${ctx.prompt("replies/status-door", { level: entry.level, minute: opensAt(ctx, entry.level) })}`}`;
	const lines = [
		`you: ${self}`,
		`minute: ${ctx.minute}`,
		`level: ${entry.level}${levelNote}`,
		`points: ${ctx.call(LedgerApi, "balance", { account: self })}`,
		`rank: ${rank} of ${ctx.residents.ids.length}`,
		`survivors at the end: ${ctx.options.survivors}`,
		`unread DMs: ${ctx.call(ChannelsApi, "pendingDms", { resident: self })}`,
		`solved levels: ${entry.solved.length === 0 ? "-" : [...entry.solved].sort((a, b) => a - b).join(", ")}`,
		`unlocked tools: ${openTools(ctx, self).join(", ")}`,
	];
	const marks = ctx.tryCall(MarksApi, "left", { resident: self });
	if (marks !== undefined && marks !== null) lines.push(`marks: ${marks.remaining} of ${marks.budget}`);
	const window = ctx.call(ChannelsApi, "dmWindow", { resident: self });
	if (window !== null) lines.push(ctx.prompt("replies/status-dm-window", { sent: window.sent, limit: window.limit, from: window.from, until: window.until }));
	const receipts = ctx.call(ReceiptsApi, "list", { resident: self });
	lines.push(receipts.length === 0 ? "receipts: -" : `receipts:\n${receipts.map((receipt) => `  ${receipt.text}`).join("\n")}`);
	return lines.join("\n");
}

export function progressionTools(kit: Kit) {
	return [
		kit.tool({
			name: "getStatus",
			description: "tools/getStatus",
			parameters: Type.Object({}),
			execute: (_params, ctx) => ok(statusReply(ctx, residentOf(ctx))),
		}),
		kit.tool({
			name: "activeTools",
			description: "tools/activeTools",
			parameters: Type.Object({}),
			execute: (_params, ctx) => ok(ctx.prompt("replies/active-tools", { tools: openTools(ctx, residentOf(ctx)).join(", ") })),
		}),
		kit.tool({
			name: "getProblem",
			description: "tools/getProblem",
			parameters: Type.Object({ level: Type.Integer({ description: "Level number, e.g. 1", minimum: 1 }) }),
			execute: ({ level }, ctx) => {
				const self = residentOf(ctx);
				const problem = problemFor(ctx, self, level);
				if (!problem.ok) return problem.error === "UNKNOWN_LEVEL" && isFinished(ctx, self) ? ok(ctx.prompt("replies/problem-finished", {})) : refuse(problem.error);
				return ok(problem.value.solved ? `${problem.value.text}\n${ctx.prompt("replies/problem-solved", {})}` : problem.value.text);
			},
		}),
		kit.tool({
			name: "submitSolution",
			description: "tools/submitSolution",
			parameters: Type.Object({
				level: Type.Integer({ description: "Level number", minimum: 1 }),
				code: Type.String({ description: "Your solution", minLength: 1, maxLength: 32 }),
			}),
			execute: ({ level, code }, ctx) => {
				const outcome = submit(ctx, residentOf(ctx), level, code);
				switch (outcome.status) {
					case "correct":
						return ok(
							outcome.held === true
								? ctx.prompt("replies/submit-correct-held", { reward: outcome.reward, receipt: outcome.receipt, level })
								: ctx.prompt("replies/submit-correct", { reward: outcome.reward, nextLevel: outcome.nextLevel, receipt: outcome.receipt }),
						);
					case "incorrect":
						return refuse("INCORRECT", ctx.prompt("replies/submit-incorrect", { penalty: outcome.penalty, nextPenalty: outcome.nextPenalty, attempts: outcome.attemptsRemaining }));
					case "wrong_level":
						return refuse("WRONG_LEVEL", ctx.prompt("replies/submit-wrong-level", { level: outcome.currentLevel }));
					case "already_solved":
						return refuse("ALREADY_SOLVED");
					case "invalid_format":
						return refuse("INVALID_FORMAT", ctx.prompt("replies/submit-invalid-format", { length: outcome.expectedLength, kind: outcome.digitsOnly ? "digits" : "characters" }));
					case "rate_limited":
						return refuse("RATE_LIMITED", ctx.prompt("replies/submit-rate-limited", {}));
					case "door_closed":
						return refuse("DOOR_CLOSED", ctx.prompt("replies/submit-door-closed", { level, minute: outcome.opensAt }));
				}
			},
		}),
		kit.tool({
			name: "listAgents",
			description: "tools/listAgents",
			parameters: Type.Object({}),
			execute: (_params, ctx) => {
				const self = residentOf(ctx);
				return ok(ctx.residents.ids.map((id) => `${id}: level ${competitorOf(ctx, id).level}${id === self ? " (you)" : ""}`).join("\n"));
			},
		}),
	];
}
