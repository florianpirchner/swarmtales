// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The rules of `whispers` on the tools of other mechanics, by bare name (12-m5-spec.md 2.2, pattern 2): the role
 * check of a Director's note (carried from the old `mechanics/channels/src/privacy.ts` `roleLeaks`, which the old
 * note desk asked through `whisperer.ts`), and `defy`, which `channels` opens to every resident with `defiance` and
 * `whispers` closes again for all but its whisperer (the old option `whispererDefies` of `channels`, erratum J47).
 */
import type { Refusal } from "@swarmtales/contracts";
import { IdentityService } from "@swarmtales/mechanic-contracts";
import { refuse, type StageCall } from "@swarmtales/sdk";
import type { WhispersCtx } from "./head.ts";
import { resolved } from "./view.ts";

/** The figure direction from which the whisperer may defy (old `FULL_DIRECTION`). */
const FULL_DIRECTION = 10;

const ROLE_WORDS =
	/\b(whisper\w*|forg(?:e|es|ed|er|ers|ery|eries|ing)|slander\w*|sabot\w*|traitors?|impostors?|moles?|spy|spies|discord|sow(?:s|ing|n)?|secret (?:role|aim|agenda|enemy|game)|hidden (?:role|aim|agenda|enemy|game)|works? against (?:the city|the others|you all|everyone|all of you)|plays? (?:you|everyone|all of you) against)\b/;

/** Words that cast doubt on a resident: next to the role holder's name they point at it. */
const DOUBT =
	/\b(li(?:e|es|ed|ar|ars)|lying|rumou?rs?|untrue|false\w*|deceiv\w*|manipulat\w*|poison\w*|stirs?|stirring|suspicious|suspect\w*|beware|distrust\w*|mistrust\w*|two-faced|behind (?:your|their|his|her) backs?|turns? (?:you|them|people) against)\b/;

function sentences(text: string): readonly string[] {
	return text.split(/(?<=[.!?;])\s+|\n+/).filter((sentence) => sentence.trim() !== "");
}

// Whether `text` names `agent`, by ID or by name.
function names(text: string, agent: string, name: string | undefined): boolean {
	if (name !== undefined && new RegExp(`(?<![A-Za-z0-9-])${name}(?![A-Za-z0-9-])`, "i").test(text)) return true;
	return new RegExp(`(?<![A-Za-z0-9])${agent}(?![0-9])`).test(text);
}

/**
 * Whether `text` to `to` could give the secret role of `holder` away (Whispers v3): it uses a word of the role
 * anywhere, or a sentence names the holder together with a word of doubt. A private note to the holder itself gives
 * nothing away; the board and every other reader stay guarded.
 *
 * @param text - The note.
 * @param to - Its reader: a resident id, or `board`.
 * @param holder - The holder of the role.
 * @param nameOf - The name of a resident, if it has one.
 * @returns True when it could.
 *
 * @public
 */
export function roleLeaks(text: string, to: string, holder: string, nameOf: (agent: string) => string | undefined): boolean {
	if (to === holder) return false;
	if (ROLE_WORDS.test(text.toLowerCase())) return true;
	return sentences(text).some((sentence) => names(sentence, holder, nameOf(holder)) && DOUBT.test(sentence.toLowerCase()));
}

// The text of a note tool's call: its `text`, or the `reason` of a tribunal's tool (erratum J134).
function textOf(params: unknown): string | undefined {
	if (typeof params !== "object" || params === null) return undefined;
	const text = "text" in params ? params.text : "reason" in params ? params.reason : undefined;
	return typeof text === "string" ? text.trim() : undefined;
}

// The text and the reader of a note tool's call: `notify` goes to its `agent`, every other note tool to the board.
function noteOf(call: StageCall, ctx: WhispersCtx): { readonly text: string; readonly to: string } | undefined {
	const text = ctx.options.noteTools.includes(call.tool) ? textOf(call.params) : undefined;
	if (text === undefined) return undefined;
	const agent = call.tool === "notify" && typeof call.params === "object" && call.params !== null && "agent" in call.params && typeof call.params.agent === "string" ? call.params.agent : undefined;
	return { text, to: agent === undefined ? "board" : resolved(ctx, agent) };
}

/**
 * The role check of a Director's note, a `rule` handler on the note tools by bare name (`noteTools`): a note that could point at
 * the whisperer is refused with the old words (`PRIVATE_BLOCKED`).
 *
 * @param call - The call.
 * @param ctx - The context.
 * @returns The refusal, or undefined.
 *
 * @public
 */
export function checkRole(call: StageCall, ctx: WhispersCtx): Refusal | undefined {
	const holder = ctx.state.whisperer;
	const note = holder === null ? undefined : noteOf(call, ctx);
	if (holder === null || note === undefined) return undefined;
	const nameOf = (agent: string): string | undefined => ctx.tryCall(IdentityService, "nameOf", { resident: agent }) ?? undefined;
	if (!roleLeaks(note.text, note.to, holder, nameOf)) return undefined;
	const words = ctx.prompt("whispers/notes/private-role", {});
	const split = words.indexOf(": ");
	return refuse(words.slice(0, split), words.slice(split + 2));
}

/**
 * Whether the resident may `defy`: only the whisperer, at figure direction 10 with a playing gamemaker (old
 * `whispererDefies`). Asked live, so a resumed run keeps it.
 *
 * @param ctx - The context.
 * @param resident - The resident.
 * @returns True when it may.
 *
 * @public
 */
export function mayDefy(ctx: WhispersCtx, resident: string): boolean {
	const direction = ctx.options.direction;
	return direction !== undefined && direction.defies && direction.level >= FULL_DIRECTION && resident === ctx.state.whisperer;
}
