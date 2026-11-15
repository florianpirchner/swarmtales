// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The core-motive check of a Director's note, a `rule` handler of `motives` on the note tools by bare name
 * (12-m5-spec.md 2.3, pattern 2): the part of the old note desk's `characterLeaks` check (old
 * `mechanics/channels/src/notes.ts`, `characters`) that reads the core motives. The goals' part is `goals`' own.
 */
import type { Refusal } from "@swarmtales/contracts";
import { IdentityService } from "@swarmtales/mechanic-contracts";
import { refuse, type StageCall } from "@swarmtales/sdk";
import type { MotivesCtx } from "./head.ts";
import { characterLeaks } from "./rules.ts";

/**
 * The lower-case cue words of a resident's drives (old `cuesOf`).
 *
 * @param ctx - The context.
 * @param resident - The resident.
 * @returns The cue words, none without a core motive.
 */
export function cuesOf(ctx: Pick<MotivesCtx, "state" | "options">, resident: string): string[] {
	const coreMotive = ctx.state.coreMotives.get(resident);
	return (coreMotive?.drives ?? []).flatMap((entry) => ctx.options.drives.find((drive) => drive.id === entry.drive)?.cues ?? []).map((word) => word.toLowerCase());
}

// The text of a note tool's call: its `text`, or the `reason` of a tribunal's tool (erratum J134).
function textOf(params: unknown): string | undefined {
	if (typeof params !== "object" || params === null) return undefined;
	const text = "text" in params ? params.text : "reason" in params ? params.reason : undefined;
	return typeof text === "string" ? text.trim() : undefined;
}

// The reader of a note: `notify` goes to its `agent` (an id, `channels` refused anything else before), every other note tool to the board.
function readerOf(call: StageCall): string {
	const params = call.params;
	const agent = call.tool === "notify" && typeof params === "object" && params !== null && "agent" in params ? params.agent : undefined;
	return typeof agent === "string" ? agent : "board";
}

/**
 * The core-motive check of a Director's note: a note that names another resident beside a word about a core motive
 * or a goal, or a cue word of its drives, is refused with the old words (`PRIVATE_BLOCKED`).
 *
 * @param call - The call.
 * @param ctx - The context.
 * @returns The refusal, or undefined.
 *
 * @public
 */
export function checkMotive(call: StageCall, ctx: MotivesCtx): Refusal | undefined {
	const text = ctx.options.noteTools.includes(call.tool) ? textOf(call.params) : undefined;
	if (text === undefined) return undefined;
	const residents = ctx.residents.ids.map((agent) => ({ agent, cues: cuesOf(ctx, agent) }));
	const nameOf = (agent: string): string | undefined => ctx.tryCall(IdentityService, "nameOf", { resident: agent }) ?? undefined;
	const revealed = characterLeaks(text, readerOf(call), residents, nameOf);
	if (revealed.length === 0) return undefined;
	const words = ctx.prompt("motives/notes/private-core-motive", { who: revealed.join(", ") });
	const split = words.indexOf(": ");
	return refuse(words.slice(0, split), words.slice(split + 2));
}
