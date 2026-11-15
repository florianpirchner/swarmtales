// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Two short parts of the gamemaker's report, carried word for word: the whisperer's (old
 * `mechanics/whispers/src/section.ts`, `whispererLines` and `whisperDutyLines`: who he is while he is in the city
 * and, at figure direction 10, his measured orders) from the fact `whispers.section`, and the black seal's (old
 * `mechanics/seal/src/section.ts`, `sealLines`: that a seal exists and whether someone bears one, never who) from
 * the fact `seal.section`.
 */
import { Type, type Static } from "typebox";
import { Id, Ids, Int } from "./schema.ts";

const Duty = Type.Object(
	{
		agent: Id("The whisperer"),
		since: Int("The last vote"),
		nextVote: Int("The next vote"),
		whispers: Int("Whispers since the last vote"),
		recipients: Ids("Who got them"),
		needWhispers: Int("Whispers his orders ask"),
		needRecipients: Int("Recipients his orders ask"),
		met: Type.Boolean({ description: "His orders are met" }),
		busiest: Type.Optional(Type.Object({ pair: Type.Tuple([Id(), Id()], { description: "The pair" }), dms: Int("Their DMs") }, { description: "The pair with the most DMs" })),
	},
	{ description: "The whisperer's measured orders" },
);

/**
 * The value of the fact `whispers.section` (old `WhispererSectionFact`): null without a whisperer or once he left.
 *
 * @public
 */
export const WhispererSectionSchema = Type.Union(
	[Type.Null({ description: "No whisperer in the city" }), Type.Object({ whisperer: Id("The whisperer"), minute: Int("The tick of the report"), duty: Type.Union([Duty, Type.Null({ description: "No orders" })], { description: "His orders" }) }, { description: "The whisperer" })],
	{ description: "The whisperer's part of the gamemaker's report" },
);

/**
 * The value of the fact `whispers.section`.
 *
 * @public
 */
export type WhispererSection = Static<typeof WhispererSectionSchema>;

/**
 * The value of the fact `seal.section` (old `SealSectionFact`).
 *
 * @public
 */
export const SealSectionSchema = Type.Object(
	{
		auction: Type.Union([Type.Object({ seal: Int("The seal"), until: Int("The auction ends") }, { description: "A running auction" }), Type.Null({ description: "None" })], { description: "The auction" }),
		borne: Int("Unused seals borne"),
		pending: Int("Seals still to auction in this act"),
	},
	{ description: "The black seal's part of the gamemaker's report" },
);

/**
 * The value of the fact `seal.section`.
 *
 * @public
 */
export type SealSection = Static<typeof SealSectionSchema>;

function dutyLine(minute: number, duty: Static<typeof Duty>): string {
	const left = duty.nextVote - minute;
	const recipients = duty.recipients.length === 0 ? "nobody" : duty.recipients.join(", ");
	const state = duty.met ? "met" : "behind: push him with a private note to him alone, a concrete target and an approach";
	const pair = duty.busiest === undefined ? "" : ` Most DMs since then: ${duty.busiest.pair.join(" and ")} (${String(duty.busiest.dms)}).`;
	return (
		`His orders (for you alone): at least ${String(duty.needWhispers)} whispers to ${String(duty.needRecipients)} different residents before the vote at minute ${String(duty.nextVote)}, ` +
		`${String(left)} ${left === 1 ? "minute" : "minutes"} left. Since the vote at minute ${String(duty.since)}: ${String(duty.whispers)} ${duty.whispers === 1 ? "whisper" : "whispers"} to ${recipients}; ${state}.${pair}`
	);
}

/**
 * The whisperer's lines with the blank line after them, or none.
 *
 * @param section - The fact's value; undefined without `whispers`.
 * @returns The lines.
 */
export function renderWhispererSection(section: WhispererSection | undefined): readonly string[] {
	if (section === null || section === undefined) return [];
	const head = `The whisperer (secret: only you and he know; never reveal it or hint at it, to anyone): ${section.whisperer}`;
	return [head, ...(section.duty === null ? [] : [dutyLine(section.minute, section.duty)]), ""];
}

/**
 * The black seal's lines with the blank line after them, or none.
 *
 * @param section - The fact's value; null or undefined without the seal.
 * @returns The lines.
 */
export function renderSealSection(section: SealSection | null | undefined): readonly string[] {
	if (section === null || section === undefined) return [];
	const { auction } = section;
	const open = auction === null ? 0 : 1;
	const borne = section.borne === 1 ? "someone bears an unused seal" : `${String(section.borne)} unused seals are borne`;
	const parts = [
		...(auction === null ? [] : [`an auction runs until minute ${String(auction.until)} (bids are secret, also from you)`]),
		...(section.borne === 0 ? [] : [`${borne} (you do not know who)`]),
		...(section.pending > open ? [`${String(section.pending - open)} more to auction in this act`] : []),
	];
	if (parts.length === 0) return [];
	return ["Black seal (its bearer strikes one resident from the city at once):", ...parts.map((part) => `- ${part}`), ""];
}
