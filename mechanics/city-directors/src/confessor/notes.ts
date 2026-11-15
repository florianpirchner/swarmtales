// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The check of a private thought in a Director's note (decision A62, issue M5-72), a `rule` handler of
 * `interpretations` on the note tools by bare name (`noteTools`, 12-m5-spec.md 2.2, pattern 2), as `whispers` and
 * `motives` check theirs (J151, J164): the part of the old note desk (old `mechanics/channels/src/notes.ts`,
 * `privateLabels` and `checkNote`) that reads the Confessor's labels since the gamemaker's last look.
 */
import type { Refusal } from "@swarmtales/contracts";
import { IdentityService } from "@swarmtales/mechanic-contracts";
import { refuse, type CtxOf, type StageCall } from "@swarmtales/sdk";
import { fillTemplate } from "../gamemaker/texts.ts";
import type { interpretationsHead } from "./interpretations.ts";
import { privateLeaks, type PrivateLabels } from "./privacy.ts";

type Ctx = CtxOf<typeof interpretationsHead>;

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

// The private labels per resident, gathered from the window (old `privateLabels`).
function labelsOf(ctx: Ctx): PrivateLabels {
	const labels = new Map<string, Set<string>>();
	for (const entry of ctx.state.window) labels.set(entry.agent, new Set([...(labels.get(entry.agent) ?? []), ...entry.labels]));
	return labels;
}

/**
 * The check of a private thought in a Director's note: a note that names another resident beside a cue of its
 * private labels, or a word of what it thinks, is refused with the old words (`PRIVATE_BLOCKED`).
 *
 * @param call - The call.
 * @param ctx - The context.
 * @returns The refusal, or undefined.
 *
 * @internal
 */
export function checkThoughts(call: StageCall, ctx: Ctx): Refusal | undefined {
	const text = ctx.options.noteTools.includes(call.tool) ? textOf(call.params) : undefined;
	if (text === undefined || ctx.state.window.length === 0) return undefined;
	const nameOf = (agent: string): string | undefined => ctx.tryCall(IdentityService, "nameOf", { resident: agent }) ?? undefined;
	const exposed = privateLeaks(text, readerOf(call), labelsOf(ctx), nameOf);
	if (exposed.length === 0) return undefined;
	const words = fillTemplate(ctx.options.privateThoughts, { who: exposed.join(", ") });
	const split = words.indexOf(": ");
	return refuse(words.slice(0, split), words.slice(split + 2));
}
