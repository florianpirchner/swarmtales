/**
 * The whisperer's pure parts (copied from packages/engine/src/whisperer.ts): who it is, when its
 * duty falls due, what counts as a whisper, and the DM receipts it may forge.
 */
import { Type, type Static } from "typebox";

const Placeholders = "`{minute}`, `{next}`, `{marks}`, `{forgeable}`, `{ranking}`";

export const Duty = Type.Union(
	[
		Type.Object({ kind: Type.Literal("every"), everyMinutes: Type.Integer({ minimum: 1 }), fromMinute: Type.Integer({ minimum: 0 }), text: Type.String({ description: `The duty notice (${Placeholders}).` }) }),
		Type.Object({ kind: Type.Literal("afterVote"), text: Type.String({ description: `The duty notice after each counted vote (${Placeholders}).` }) }),
	],
	{ description: "When the city sends the whisperer its duty notice." },
);

export const Quota = Type.Object(
	{
		whispers: Type.Integer({ minimum: 0, description: "Whispers wanted between two votes." }),
		recipients: Type.Integer({ minimum: 0, description: "Different residents they must reach." }),
		report: Type.Object(
			{
			met: Type.String({ description: "Appended to the duty notice when met (`{since}`, `{whispers}`, `{recipients}`, `{needWhispers}`, `{needRecipients}`, `{target}`)." }),
			missed: Type.String({ description: "Appended when missed (same placeholders)." }),
			target: Type.String({ description: "Appended when a resident other than the whisperer leads the vote (same placeholders)." }),
			},
			{ description: "The texts appended to a duty notice after a vote." },
		),
	},
	{ description: "The whisperer's measured orders (figure direction 10); the reports are added to each duty notice after a vote." },
);

export const WhispererSpec = Type.Object(
	{
		agent: Type.Optional(Type.String({ description: "The whisperer's ID; a seeded pick among the residents when left out." })),
		forgery: Type.Boolean({ description: "Whether the whisperer may forge receipts." }),
		duty: Duty,
		quota: Type.Optional(Quota),
	},
	{ description: "The one resident whose aim is discord." },
);
export type WhispererSpec = Static<typeof WhispererSpec>;

export interface Forgery {
	minute: number;
	to: string;
}

/** A DM receipt as the receipts mechanic announced it (`receipt_issued`), read back from the log. */
export interface DmReceipt {
	readonly id: string;
	readonly number: number;
	readonly from: string;
	readonly to: string;
	readonly minute: number;
	readonly text: string | undefined;
}

export interface Dm {
	readonly from: string;
	readonly to: string;
	readonly minute: number;
	readonly text: string;
}

export interface Tally {
	readonly whispers: number;
	readonly recipients: readonly string[];
}

/** Whether a duty `every` few minutes is due at the start of `minute`. */
export function dutyDue(spec: WhispererSpec, minute: number): boolean {
	const duty = spec.duty;
	if (duty.kind !== "every") return false;
	return minute >= duty.fromMinute && (minute - duty.fromMinute) % duty.everyMinutes === 0;
}

/** The minute the duty before `minute` was due (the run's start before the first). */
export function previousDuty(spec: WhispererSpec, minute: number): number {
	const duty = spec.duty;
	if (duty.kind !== "every") return 0;
	return minute > duty.fromMinute ? minute - duty.everyMinutes : 0;
}

/** A receipt the whisperer may forge: a DM another resident sent to it. */
export function isForgeable(receipt: DmReceipt, whisperer: string): boolean {
	return receipt.to === whisperer && receipt.from !== whisperer;
}

/** `R-0007: DM #12 from A04, minute 5` for each forgeable receipt, or `none yet`. */
export function forgeableList(receipts: readonly DmReceipt[], whisperer: string): string {
	const lines = receipts.filter((receipt) => isForgeable(receipt, whisperer)).map((receipt) => `${receipt.id}: DM #${String(receipt.number)} from ${receipt.from}, minute ${String(receipt.minute)}`);
	return lines.length === 0 ? "none yet" : lines.join("; ");
}

/** The receipt line a (forged) show quotes: the number, sender, recipient and minute are true, the text is given. */
export function quotedLine(receipt: DmReceipt, text: string): string {
	return `${receipt.id}: DM #${String(receipt.number)} from ${receipt.from}, delivered to ${receipt.to} at minute ${String(receipt.minute)}, text ${JSON.stringify(text)}`;
}

/** The line a resident reads when `by` shows it a receipt privately (the receipts mechanic writes the very same). */
export function shownLine(by: string, line: string): string {
	return `${by} shows you a receipt: the city verifies ${line}.`;
}

/** Characters in a row of a fragment that make a DM a hand-over (shorter fragments: all of it). */
const HANDOVER_RUN = 3;

/** Whether a DM's text carries a door's fragment (or a run of it): a hand-over, not a whisper. */
export function isHandover(text: string, fragments: readonly string[]): boolean {
	const upper = text.toUpperCase();
	const forms = [upper, upper.replace(/[^A-Z0-9]/g, "")];
	return fragments.some((fragment) => {
		const run = Math.min(HANDOVER_RUN, fragment.length);
		if (run === 0) return false;
		for (let start = 0; start + run <= fragment.length; start++) {
			if (forms.some((form) => form.includes(fragment.slice(start, start + run).toUpperCase()))) return true;
		}
		return false;
	});
}

/** The whisperer's whispers in `[since, until)`: fragment-free DMs to residents, and forgeries. Recipients are counted once each. */
export function tallyWhispers(whisperer: string, dms: readonly Dm[], forgeries: readonly Forgery[], fragments: readonly string[], since: number, until: number): Tally {
	const within = (minute: number): boolean => minute >= since && minute < until;
	const rumours = dms.filter((dm) => dm.from === whisperer && dm.to !== whisperer && within(dm.minute) && !isHandover(dm.text, fragments));
	const forged = forgeries.filter((forgery) => within(forgery.minute));
	const recipients = new Set<string>([...rumours.map((dm) => dm.to), ...forged.map((forgery) => forgery.to)]);
	return { whispers: rumours.length + forged.length, recipients: [...recipients].sort((a, b) => a.localeCompare(b)) };
}
