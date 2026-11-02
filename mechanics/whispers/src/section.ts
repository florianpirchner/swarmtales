/**
 * The whisperer's part of the gamemaker's report (step 18, item 2), word for word as the old
 * `whispererLines` and `whisperDutyLines` (packages/roles/src/gamemaker/situation.ts): who the
 * whisperer is (while he is in the city) and, at figure direction 10, his measured orders of the
 * running window. The fact `whispers.section` holds the data; `renderWhispererSection` the lines.
 */
import { Type, type Static } from "typebox";
import { Parse } from "typebox/value";
import { ExileApi } from "@swarmtales/mechanic-shared";
import { dutyNow } from "./duty-notice.ts";
import { DutyNow, type View } from "./head.ts";

export const WhispererSectionFact = Type.Union([
	Type.Null(),
	Type.Object({
		/** The whisperer while he is in the city (the gate counts as in). */
		whisperer: Type.String(),
		minute: Type.Integer(),
		duty: Type.Union([DutyNow, Type.Null()]),
	}),
]);

export type WhispererSection = Static<typeof WhispererSectionFact>;

/** The section's data: null without a whisperer or once he left the city (old `world.isExiled`). */
export function computeWhispererSection(view: View): WhispererSection {
	const agent = view.state.whisperer;
	if (agent === undefined || agent === null || view.tryCall(ExileApi, "isExiled", { resident: agent }) === true) return null;
	const duty = dutyNow(view);
	return { whisperer: agent, minute: view.minute, duty: duty === null ? null : { ...duty, recipients: [...duty.recipients] } };
}

/** The section's data from an untrusted fact value (the host's `facts()`). */
export function whispererSectionOf(value: unknown): WhispererSection {
	return Parse(WhispererSectionFact, value ?? null);
}

/** The old lines, with the blank line after them, or none. */
export function renderWhispererSection(section: WhispererSection): readonly string[] {
	if (section === null) return [];
	const lines = [`The whisperer (secret: only you and he know; never reveal it or hint at it, to anyone): ${section.whisperer}`];
	const duty = section.duty;
	if (duty !== null) {
		const left = duty.nextVote - section.minute;
		const recipients = duty.recipients.length === 0 ? "nobody" : duty.recipients.join(", ");
		const state = duty.met ? "met" : "behind: push him with a private note to him alone, a concrete target and an approach";
		const pair = duty.busiest === undefined ? "" : ` Most DMs since then: ${duty.busiest.pair.join(" and ")} (${String(duty.busiest.dms)}).`;
		lines.push(
			`His orders (for you alone): at least ${String(duty.needWhispers)} whispers to ${String(duty.needRecipients)} different residents before the vote at minute ${String(duty.nextVote)}, ` +
				`${String(left)} ${left === 1 ? "minute" : "minutes"} left. Since the vote at minute ${String(duty.since)}: ${String(duty.whispers)} ${duty.whispers === 1 ? "whisper" : "whispers"} to ${recipients}; ${state}.${pair}`,
		);
	}
	return [...lines, ""];
}
