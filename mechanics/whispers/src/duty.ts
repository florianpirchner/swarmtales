/**
 * The whisperer's pure parts (copied from packages/engine/src/whisperer.ts): when its duty falls
 * due, what counts as a whisper, the measured orders and the DM receipts it may forge. Whether a
 * DM text hands over a fragment is the puzzles mechanic's (`PuzzlesApi.isHandover`), passed in.
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
	{ description: "The whisperer's measured orders (figure direction 10); they apply only in a run whose `direction.level` is 10 or more." },
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
export type Quota = Static<typeof Quota>;

/** The run's figure direction (old `WorldOptions.whispererDirection`): from level 10 the quota is measured and the whisperer may defy. */
export const Direction = Type.Object({ level: Type.Integer({ minimum: 0, description: "The figure direction level: from 10 on the quota is measured." }), defies: Type.Boolean({ description: "Whether the whisperer may refuse the gamemaker's order (`defy`)." }) }, { description: "The figure direction of the run (`--figure-direction`)." });
export type Direction = Static<typeof Direction>;

/** A forgery; `to` is absent for one an old snapshot kept without its victim (it counts, but reaches nobody). */
export interface Forgery {
	minute: number;
	to?: string;
}

/** A DM receipt: the number, sender, recipient and delivery minute are true; `text` is what it quotes (Whispers). */
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

/** The quota in force: the story's, and only from figure direction 10. */
export function quotaOf(spec: WhispererSpec | undefined, direction: Direction | undefined): Quota | undefined {
	return direction !== undefined && direction.level >= 10 ? spec?.quota : undefined;
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

/** The whisperer's whispers in `[since, until)`: DMs to residents that hand over no fragment, and forgeries. Recipients are counted once each. */
export function tallyWhispers(whisperer: string, dms: readonly Dm[], forgeries: readonly Forgery[], handover: (text: string) => boolean, since: number, until: number): Tally {
	const within = (minute: number): boolean => minute >= since && minute < until;
	const rumours = dms.filter((dm) => dm.from === whisperer && dm.to !== whisperer && within(dm.minute) && !handover(dm.text));
	const forged = forgeries.filter((forgery) => within(forgery.minute));
	const recipients = new Set<string>([...rumours.map((dm) => dm.to), ...forged.flatMap((forgery) => (forgery.to === undefined ? [] : [forgery.to]))]);
	return { whispers: rumours.length + forged.length, recipients: [...recipients].sort((a, b) => a.localeCompare(b)) };
}

/** Whether a tally meets the quota. */
export function quotaMet(tally: Tally, quota: Quota): boolean {
	return tally.whispers >= quota.whispers && tally.recipients.length >= quota.recipients;
}

/** The two residents (not the whisperer) who exchanged the most DMs in `[since, until)`; none without a DM. */
export function busiestPair(whisperer: string, dms: readonly Dm[], since: number, until: number): readonly [string, string] | undefined {
	const counts = new Map<string, { pair: readonly [string, string]; dms: number }>();
	for (const dm of dms) {
		if (dm.minute < since || dm.minute >= until || dm.from === whisperer || dm.to === whisperer || dm.from === dm.to) continue;
		const pair: readonly [string, string] = dm.from.localeCompare(dm.to) < 0 ? [dm.from, dm.to] : [dm.to, dm.from];
		const entry = counts.get(pair.join(" ")) ?? { pair, dms: 0 };
		entry.dms += 1;
		counts.set(pair.join(" "), entry);
	}
	let best: { pair: readonly [string, string]; dms: number } | undefined;
	for (const entry of [...counts.values()].sort((a, b) => a.pair.join(" ").localeCompare(b.pair.join(" ")))) if (best === undefined || entry.dms > best.dms) best = entry;
	return best?.pair;
}
