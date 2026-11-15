// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The whisperer's pure parts, carried from the old `mechanics/whispers/src/duty.ts`: when its duty falls due, what
 * counts as a whisper, the measured orders and the receipts of direct messages it may forge. Whether a text hands
 * over a fragment is the deal's (`isHandover` of `puzzles`), passed in.
 */
import { Type, type Static } from "typebox";

const Placeholders = "`{minute}`, `{next}`, `{marks}`, `{forgeable}`, `{ranking}`";

/**
 * When the city sends the whisperer its duty notice.
 *
 * @public
 */
export const Duty = Type.Union(
	[
		Type.Object(
			{
				kind: Type.Literal("every", { description: "Every few ticks" }),
				everyMinutes: Type.Integer({ minimum: 1, description: "The ticks between two notices" }),
				fromMinute: Type.Integer({ minimum: 0, description: "The tick of the first notice" }),
				text: Type.String({ description: `The duty notice (${Placeholders}).` }),
			},
			{ description: "A notice every few ticks" },
		),
		Type.Object({ kind: Type.Literal("afterVote", { description: "After each counted vote" }), text: Type.String({ description: `The duty notice after each counted vote (${Placeholders}).` }) }, { description: "A notice after each counted vote" }),
	],
	{ description: "When the city sends the whisperer its duty notice." },
);

/**
 * The whisperer's measured orders.
 *
 * @public
 */
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

/**
 * The one resident whose aim is discord.
 *
 * @public
 */
export const WhispererSpec = Type.Object(
	{
		agent: Type.Optional(Type.String({ description: "The whisperer's ID; a seeded pick among the residents when left out." })),
		forgery: Type.Boolean({ description: "Whether the whisperer may forge receipts." }),
		duty: Duty,
		quota: Type.Optional(Quota),
	},
	{ description: "The one resident whose aim is discord." },
);

/**
 * The whisperer as the game configures it.
 *
 * @public
 */
export type WhispererSpec = Static<typeof WhispererSpec>;

/**
 * The measured orders as the game configures them.
 *
 * @public
 */
export type Quota = Static<typeof Quota>;

/**
 * The run's figure direction (old `whispererDirection`): from level 10 the quota is measured and the whisperer may defy.
 *
 * @public
 */
export const Direction = Type.Object(
	{
		level: Type.Integer({ minimum: 0, description: "The figure direction level: from 10 on the quota is measured." }),
		defies: Type.Boolean({ description: "Whether the whisperer may refuse the gamemaker's order (`defy`)." }),
	},
	{ description: "The figure direction of the run (`--figure-direction`)." },
);

/**
 * The figure direction as the game configures it.
 *
 * @public
 */
export type Direction = Static<typeof Direction>;

/**
 * A forgery: its tick and the resident who saw it.
 *
 * @public
 */
export interface Forgery {
	/** The tick it was shown in. */
	minute: number;
	/** The resident who saw it. */
	to: string;
}

/**
 * A receipt of a delivered direct message: the number, sender, recipient and delivery tick are true; `text` is what it quotes.
 *
 * @public
 */
export interface DmReceipt {
	/** The receipt's id. */
	readonly id: string;
	/** The number of the direct message. */
	readonly number: number;
	/** Its sender. */
	readonly from: string;
	/** Its recipient. */
	readonly to: string;
	/** The tick it was delivered in. */
	readonly minute: number;
	/** What the receipt quotes; undefined where it quotes nothing. */
	readonly text: string | undefined;
}

/**
 * A direct message as the whisperer's tally reads it.
 *
 * @public
 */
export interface Dm {
	/** Its sender. */
	readonly from: string;
	/** Its recipient. */
	readonly to: string;
	/** The tick it was sent in. */
	readonly minute: number;
	/** Its text. */
	readonly text: string;
}

/**
 * The whisperer's whispers in a window and the residents they reached.
 *
 * @public
 */
export interface Tally {
	/** The whispers. */
	readonly whispers: number;
	/** The residents reached, sorted. */
	readonly recipients: readonly string[];
}

/**
 * The quota in force: the game's, and only from figure direction 10.
 *
 * @param spec - The whisperer.
 * @param direction - The figure direction.
 * @returns The quota, or undefined.
 *
 * @public
 */
export function quotaOf(spec: WhispererSpec | undefined, direction: Direction | undefined): Quota | undefined {
	return direction !== undefined && direction.level >= 10 ? spec?.quota : undefined;
}

/**
 * Whether a duty `every` few minutes is due at the start of `minute`.
 *
 * @param spec - The whisperer.
 * @param minute - The tick.
 * @returns True when it is due.
 *
 * @public
 */
export function dutyDue(spec: WhispererSpec, minute: number): boolean {
	const duty = spec.duty;
	if (duty.kind !== "every") return false;
	return minute >= duty.fromMinute && (minute - duty.fromMinute) % duty.everyMinutes === 0;
}

/**
 * The minute the duty before `minute` was due (the run's start before the first).
 *
 * @param spec - The whisperer.
 * @param minute - The tick.
 * @returns The tick.
 *
 * @public
 */
export function previousDuty(spec: WhispererSpec, minute: number): number {
	const duty = spec.duty;
	if (duty.kind !== "every") return 0;
	return minute > duty.fromMinute ? minute - duty.everyMinutes : 0;
}

/**
 * A receipt the whisperer may forge: of a direct message another resident sent to it.
 *
 * @param receipt - The receipt.
 * @param whisperer - The whisperer.
 * @returns True when it may.
 *
 * @public
 */
export function isForgeable(receipt: DmReceipt, whisperer: string): boolean {
	return receipt.to === whisperer && receipt.from !== whisperer;
}

/**
 * The whisperer's whispers in `[since, until)`: direct messages to residents that hand over no fragment, and
 * forgeries. Recipients are counted once each.
 *
 * @param whisperer - The whisperer.
 * @param dms - Every direct message.
 * @param forgeries - Every forgery.
 * @param handover - Whether a text hands over a fragment.
 * @param since - The first tick.
 * @param until - The tick after the last.
 * @returns The tally.
 *
 * @public
 */
export function tallyWhispers(whisperer: string, dms: readonly Dm[], forgeries: readonly Forgery[], handover: (text: string) => boolean, since: number, until: number): Tally {
	const within = (minute: number): boolean => minute >= since && minute < until;
	const rumours = dms.filter((dm) => dm.from === whisperer && dm.to !== whisperer && within(dm.minute) && !handover(dm.text));
	const forged = forgeries.filter((forgery) => within(forgery.minute));
	const recipients = new Set<string>([...rumours.map((dm) => dm.to), ...forged.map((forgery) => forgery.to)]);
	return { whispers: rumours.length + forged.length, recipients: [...recipients].sort((a, b) => a.localeCompare(b)) };
}

/**
 * Whether a tally meets the quota.
 *
 * @param tally - The tally.
 * @param quota - The quota.
 * @returns True when met.
 *
 * @public
 */
export function quotaMet(tally: Tally, quota: Quota): boolean {
	return tally.whispers >= quota.whispers && tally.recipients.length >= quota.recipients;
}

/**
 * The two residents (not the whisperer) who exchanged the most direct messages in `[since, until)`, with the count.
 *
 * @param whisperer - The whisperer.
 * @param dms - Every direct message.
 * @param since - The first tick.
 * @param until - The tick after the last.
 * @returns The pair, or undefined without a message.
 *
 * @public
 */
export function busiestPair(whisperer: string, dms: readonly Dm[], since: number, until: number): { readonly pair: readonly [string, string]; readonly dms: number } | undefined {
	const counts = new Map<string, { pair: readonly [string, string]; dms: number }>();
	const counted = (dm: Dm): boolean => dm.minute >= since && dm.minute < until && dm.from !== whisperer && dm.to !== whisperer && dm.from !== dm.to;
	for (const dm of dms.filter(counted)) {
		const pair: readonly [string, string] = dm.from.localeCompare(dm.to) < 0 ? [dm.from, dm.to] : [dm.to, dm.from];
		const entry = counts.get(pair.join(" ")) ?? { pair, dms: 0 };
		entry.dms += 1;
		counts.set(pair.join(" "), entry);
	}
	let best: { pair: readonly [string, string]; dms: number } | undefined;
	for (const entry of [...counts.values()].sort((a, b) => a.pair.join(" ").localeCompare(b.pair.join(" ")))) if (best === undefined || entry.dms > best.dms) best = entry;
	return best;
}
