// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The gamemaker's "Tribunal:" section, carried from old `mechanics/tribunal/src/section.ts` (word for word as the
 * old `tribunalLines`), written from the fact `tribunal.section`. The schema is the old `SectionFact` with the
 * outputs of the old `schedulingWindow`, `cityCall` and `gates` queries it held.
 */
import { Type, type Static } from "typebox";
import { Id, Ids, Int } from "./schema.ts";

const Window = Type.Union(
	[
		Type.Object({ open: Type.Literal(false, { description: "Closed" }), why: Type.String({ description: "Why it is closed" }) }, { description: "Closed" }),
		Type.Object(
			{
				open: Type.Literal(true, { description: "Open" }),
				earliest: Int("Earliest opening tick"),
				latestFinal: Int("Latest opening of a tribunal that exiles everything still missing"),
				latestWithRoom: Type.Optional(Int("Latest opening that leaves room for one more tribunal after it")),
				missing: Int("Residents still to exile"),
				maxFactions: Int("Factions allowed: 2 up to this; 0 without a draft"),
			},
			{ description: "Open" },
		),
	],
	{ description: "Whether scheduleTribunal is open now, and its bounds" },
);

const Gate = Type.Object(
	{
		agent: Id(),
		since: Int("The tick the gate opened"),
		until: Int("The tick it closes"),
		ransomable: Type.Boolean({ description: "May still be bought back" }),
		price: Type.Number({ description: "The ransom from others" }),
		selfPrice: Type.Number({ description: "The ransom from itself" }),
		paid: Type.Number({ description: "Paid so far" }),
		covered: Int("The percentage covered"),
		willDone: Type.Boolean({ description: "Its last will is written" }),
	},
	{ description: "One gate" },
);

const Ransom = Type.Object({ share: Type.Number({ description: "Share of the median" }), selfShare: Type.Number({ description: "Share when paid by the exiled" }), minimum: Type.Number({ description: "The least" }) }, { description: "The ransom" });

const Rules = Type.Object(
	{
		voteMinutes: Int("Ticks of a vote"),
		gateMinutes: Int("Ticks at the gate"),
		ransom: Ransom,
		bequestPerHeir: Type.Number({ description: "The most an heir gets, as a share" }),
		blocBonus: Type.Union([Int("Points per voter of a faction that holds"), Type.Null({ description: "No factions" })], { description: "The bloc bonus" }),
		fallbackGap: Int("Ticks after a result before the city calls one itself"),
	},
	{ description: "The tribunal's rules" },
);

const Plan = Type.Object({ tribunal: Int("Its number"), called: Type.Boolean({ description: "Called already" }), by: Type.String({ description: "Who planned it" }), calledAt: Int("Called at"), opens: Int("Opens at"), count: Int("Exiles"), factions: Int("Factions") }, { description: "The next tribunal" });

/**
 * The value of the fact `tribunal.section`: null while the tribunal's act has not begun or without one.
 *
 * @public
 */
export const TribunalSectionSchema = Type.Union(
	[
		Type.Null({ description: "No tribunal now" }),
		Type.Object(
			{
				residents: Int("Residents of the act"),
				target: Int("Residents to exile"),
				exiled: Ids("Who left, in order"),
				missing: Int("Still to exile"),
				actEnd: Int("The latest end of the act"),
				rules: Rules,
				plan: Type.Union([Type.Null({ description: "None" }), Plan], { description: "The next tribunal" }),
				window: Window,
				cityCall: Type.Union([Type.Object({ calledAt: Int("Called at"), opens: Int("Opens at") }, { description: "The city's own call" }), Type.Null({ description: "None" })], { description: "When the city calls one itself" }),
				session: Type.Union([Type.Null({ description: "None" }), Type.Object({ tribunal: Int("Its number"), accused: Ids("The accused"), count: Int("Exiles"), until: Int("The vote closes") }, { description: "The open tribunal" })], { description: "The open tribunal" }),
				draft: Type.Union([Type.Null({ description: "None" }), Type.Object({ group: Type.String({ description: "The group" }), leaders: Ids("Its leaders") }, { description: "The faction draft" })], { description: "The faction draft" }),
				gates: Type.Array(Gate, { description: "Every gate in the order it opened" }),
			},
			{ description: "The tribunal" },
		),
	],
	{ description: "The tribunal's part of the gamemaker's report" },
);

/**
 * The value of the fact `tribunal.section`.
 *
 * @public
 */
export type TribunalSection = Static<typeof TribunalSectionSchema>;

type Open = NonNullable<TribunalSection>;

const percent = (share: number): string => String(Math.round(share * 100));

function ruleLine({ rules }: Open): string {
	return (
		`- each tribunal accuses one more than it exiles (the fewest points), vote ${String(rules.voteMinutes)} minutes, gate ${String(rules.gateMinutes)} minutes, ` +
		`ransom ${percent(rules.ransom.share)}% of the median points (${percent(rules.ransom.selfShare)}% when paid by the exiled itself, at least ${String(rules.ransom.minimum)}), ` +
		`a last will leaves each heir at most ${percent(rules.bequestPerHeir)}% of the points` +
		(rules.blocBonus === null ? "" : `; a faction voting as one earns each voter ${String(rules.blocBonus)} points`)
	);
}

function planLines({ plan }: Open): readonly string[] {
	if (plan === null) return [];
	const state = plan.called ? "called" : `planned (by ${plan.by}), called at minute ${String(plan.calledAt)}`;
	return [`- tribunal ${String(plan.tribunal)} ${state}: opens at minute ${String(plan.opens)}, exiles ${String(plan.count)}${plan.factions >= 2 ? `, ${String(plan.factions)} factions` : ""}`];
}

function moveLines(section: Open): readonly string[] {
	const { window } = section;
	if (!window.open) return [`- scheduleTribunal is closed: ${window.why}`];
	const call = section.cityCall;
	const missing = String(window.missing);
	const plain = call === null ? "If you plan nothing, the city calls no further tribunal itself." : `If you plan nothing, the city calls one itself at minute ${String(call.calledAt)} (it opens at minute ${String(call.opens)}).`;
	const count = window.latestWithRoom === undefined ? `, count must be ${missing}` : ` (by minute ${String(window.latestWithRoom)} for a count below ${missing}), count 1-${missing}`;
	return [
		`- YOUR MOVE: scheduleTribunal is available now. The city still has to exile ${missing} ${window.missing === 1 ? "resident" : "residents"}; the earliest opening is minute ${String(window.earliest)}. ${plain}`,
		`- scheduleTribunal is open: minute ${String(window.earliest)}-${String(window.latestFinal)}${count}${window.maxFactions >= 2 ? `, factions 2-${String(window.maxFactions)}` : ""}; without a plan the city calls one itself ${String(section.rules.fallbackGap)} minutes after the last result`,
	];
}

function gateLine(gate: Open["gates"][number]): string {
	const ransom = gate.ransomable ? `ransom ${String(gate.covered)}% covered (${String(gate.price)} from others, ${String(gate.selfPrice)} from itself)` : "bought back once already, no ransom";
	return `- ${gate.agent} at the gate until minute ${String(gate.until)}: ${ransom}${gate.willDone ? ", will written" : ""}`;
}

function sessionLines({ session, draft }: Open): readonly string[] {
	return [
		...(session === null ? [] : [`- open tribunal ${String(session.tribunal)}: ${session.accused.join(", ")} accused, ${String(session.count)} to exile, the vote closes at minute ${String(session.until)}`]),
		...(draft === null ? [] : [`- faction draft in group ${draft.group}${draft.leaders.length === 0 ? "" : `, leaders ${draft.leaders.join(", ")}`}`]),
	];
}

/**
 * The old lines, word for word, with the blank line after them, or none.
 *
 * @param section - The fact's value.
 * @returns The lines.
 */
export function renderTribunalSection(section: TribunalSection): readonly string[] {
	if (section === null) return [];
	const head = `- the city keeps ${String(section.residents - section.target)} of ${String(section.residents)}: ${String(section.target)} to exile, ${String(section.exiled.length)} exiled so far, ${String(section.missing)} still missing; the act ends at minute ${String(section.actEnd)} at the latest (the residents do not know)`;
	return [
		"Tribunal:",
		head,
		ruleLine(section),
		...planLines(section),
		...moveLines(section),
		...sessionLines(section),
		...section.gates.map(gateLine),
		...(section.exiled.length > 0 ? [`- exiled: ${section.exiled.join(", ")}`] : []),
		"",
	];
}
