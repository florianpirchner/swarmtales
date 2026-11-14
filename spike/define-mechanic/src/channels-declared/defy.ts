/**
 * `defy` (the gamemaker's direction at 10): a resident refuses an order of the gamemaker, for a
 * reason of its own character. Copied from packages/engine/src/tools/defy.ts and `World#defyGamemaker`;
 * the reason goes to the log as `gamemaker_defied`, no other resident learns of it. The tool is
 * locked for every resident unless the story lets all (`defiance`) or only the whisperer
 * (`whispererDefies`) use it.
 */
import type { Ctx } from "./messages.ts";
import { whispererOf } from "./whisperer.ts";

/**
 * Whether `defy` is open to the resident: to everyone with `defiance`, else only to the story's
 * whisperer when `whispererDefies`. The whisperer is read from the log on every ask, so the tool
 * stays open after a resume, where `whisperer_chosen` is not written again (R2-D5).
 */
export function defyOpen(ctx: Ctx, resident: string): boolean {
	if (ctx.options.defiance) return true;
	return ctx.options.whispererDefies && whispererOf(ctx) === resident;
}
