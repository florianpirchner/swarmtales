// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The goal check of a Director's note, a `rule` handler of `goals` on the note tools by bare name (12-m5-spec.md
 * 2.3, pattern 2; erratum J164): the part of the old note desk's `characterLeaks` check (old
 * `mechanics/channels/src/notes.ts`, `characters`) that reads the goals. It runs the carried check of
 * `@swarmtales/mechanic-motives/rules` with the goals and no cues; the cues are `motives`' own.
 */
import type { Refusal } from "@swarmtales/contracts";
import { IdentityService } from "@swarmtales/mechanic-contracts";
import { characterLeaks } from "@swarmtales/mechanic-motives/rules";
import { refuse, type StageCall } from "@swarmtales/sdk";
import { goalOf } from "./book.ts";
import type { GoalsCtx } from "./head.ts";

// The text of a note tool's call: its `text`, or the `reason` of a tribunal's tool (erratum J134).
function textOf(params: unknown): string | undefined {
	if (typeof params !== "object" || params === null) return undefined;
	const text = "text" in params ? params.text : "reason" in params ? params.reason : undefined;
	return typeof text === "string" ? text.trim() : undefined;
}

// The reader of a note: `notify` goes to its `agent`, every other note tool to the board.
function readerOf(call: StageCall): string {
	const params = call.params;
	const agent = call.tool === "notify" && typeof params === "object" && params !== null && "agent" in params ? params.agent : undefined;
	return typeof agent === "string" ? agent : "board";
}

/**
 * The goal check of a Director's note: a note that names another resident beside a word about a core motive or a
 * goal, or a cue of its goal with the goal's target, is refused with the old words (`PRIVATE_BLOCKED`).
 *
 * @param call - The call.
 * @param ctx - The context.
 * @returns The refusal, or undefined.
 *
 * @public
 */
export function checkGoal(call: StageCall, ctx: GoalsCtx): Refusal | undefined {
	const text = ctx.options.noteTools.includes(call.tool) ? textOf(call.params) : undefined;
	if (text === undefined) return undefined;
	const residents = ctx.residents.ids.map((agent) => {
		const goal = goalOf(ctx, agent)?.goal;
		return { agent, cues: [], ...(goal === undefined ? {} : { goal: { kind: goal.kind, ...("target" in goal ? { target: goal.target } : {}) } }) };
	});
	const nameOf = (agent: string): string | undefined => ctx.tryCall(IdentityService, "nameOf", { resident: agent }) ?? undefined;
	const revealed = characterLeaks(text, readerOf(call), residents, nameOf);
	if (revealed.length === 0) return undefined;
	const words = ctx.prompt("goals/notes/private-core-motive", { who: revealed.join(", ") });
	const split = words.indexOf(": ");
	return refuse(words.slice(0, split), words.slice(split + 2));
}
