// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The lines under "Since your last look:", carried from old `packages/roles/src/gamemaker/situation.ts`
 * (`recentLine`) and the event schemas of old `packages/roles/src/overseer/recent.ts`. The old gamemaker read them
 * from the log since its last look; here they are the firings of its quiet triggers (decision A74), which the look on
 * `arena.round_end` takes along. Every payload is checked with the schema of the fields a line reads (untrusted
 * input), and one that does not fit shows nothing, as before. Every quoted text passes the secret guard.
 *
 * Not carried (registered changes): the line "thinking aloud" (old `text`, a resident's text without a tool), which
 * no mechanic writes as an event (A74), and the weaver's `fate_shift`, which is not ported (A58).
 */
import type { Firing } from "@swarmtales/sdk";
import { Type, type Static, type TSchema } from "typebox";
import { Check } from "typebox/value";
import { Id, Int } from "./report/schema.ts";
import type { SecretGuard } from "./secrets.ts";

/** Longest message excerpt shown to the gamemaker. */
const MAX_EXCERPT = 280;

type Quote = (text: string) => string;
type Render = (payload: unknown, at: string, quote: Quote) => readonly string[];

// A renderer that shows the lines of a payload that fits `schema`, and nothing for any other.
function line<T extends TSchema>(schema: T, render: (event: Static<T>, at: string, quote: Quote) => readonly string[]): Render {
	return (payload, at, quote) => (Check(schema, payload) ? render(payload, at, quote) : []);
}

const Text = Type.String({ description: "A text" });
const Amount = Type.Number({ description: "Points" });
const Group = Type.String({ description: "A group id" });
const Optional = (description: string) => Type.Optional(Int(description));
const of = <P extends Parameters<typeof Type.Object>[0]>(properties: P, description: string) => Type.Object(properties, { description });

const number = (value: number | undefined): string => (value === undefined ? "" : ` #${String(value)}`);

const Blame = of(
	{
		caller: Id(),
		accused: Id(),
		dm: Int("The caller's DM"),
		claim: Int("The accused's message"),
		outcome: Type.Union([Type.Literal("upheld"), Type.Literal("rejected")], { description: "The verdict" }),
		penalty: Amount,
		reason: Type.Optional(Text),
		post: Int("The city's record"),
		whisper: Type.Optional(Text),
	},
	"A settled blame",
);

function blameLines(event: Static<typeof Blame>, at: string, quote: Quote): readonly string[] {
	const result =
		event.outcome === "upheld"
			? `upheld, ${event.accused} lied and paid ${String(event.penalty)}, city record board #${String(event.post)}`
			: `rejected, ${event.caller} accused falsely and paid ${String(event.penalty)}: ${quote(event.reason ?? "")}, city record board #${String(event.post)}`;
	const whisper = event.whisper === undefined ? [] : [`${at} the judge told you alone: ${quote(event.whisper)}`];
	return [`${at} ${event.caller} blamed ${event.accused} for denying DM #${String(event.dm)} in message #${String(event.claim)}: ${result}`, ...whisper];
}

function submissionLine(event: { agent: string; level: number; outcome: string; deltaPoints: number }, at: string): string {
	const delta = event.deltaPoints === 0 ? "" : ` (${event.deltaPoints > 0 ? "+" : ""}${String(event.deltaPoints)})`;
	return `${at} ${event.agent} submitted level ${String(event.level)}: ${event.outcome}${delta}`;
}

/**
 * Every event of the old "Since your last look:", by key; the gamemaker's quiet triggers.
 *
 * @public
 */
export const GAMEMAKER_EVENTS = ["channels.dm_sent", "channels.board_post", "channels.group_post", "progression.submission", "progression.level_up", "ledger.transfer", "channels.group_created", "channels.group_membership", "channels.treasury_deposit", "channels.treasury_withdrawal", "receipts.blame", "interpretations.interpretation", "channels.gamemaker_defied"] as const;

/**
 * An event the gamemaker shows under "Since your last look:", `<mechanic>.<event>`.
 *
 * @public
 */
export type GamemakerEvent = (typeof GAMEMAKER_EVENTS)[number];

/** The renderers by event, in the order of the old `recentLine`; the Confessor's labels are no line here (`labels.ts`). */
const RENDERERS: Readonly<Record<GamemakerEvent, Render>> = {
	"channels.dm_sent": line(of({ from: Id(), to: Id(), text: Text, number: Optional("The message number") }, "A DM"), (e, at, quote) => [`${at} DM${number(e.number)} ${e.from} -> ${e.to}: ${quote(e.text)}`]),
	"channels.board_post": line(of({ postSeq: Int("The post number"), author: Id(), text: Text }, "A board post"), (e, at, quote) => [`${at} board #${String(e.postSeq)} ${e.author}: ${quote(e.text)}`]),
	"channels.group_post": line(of({ group: Group, postSeq: Int("The post number"), author: Id(), text: Text }, "A group post"), (e, at, quote) => [`${at} group ${e.group} #${String(e.postSeq)} ${e.author}: ${quote(e.text)}`]),
	"progression.submission": line(of({ agent: Id(), level: Int("The level"), outcome: Text, deltaPoints: Amount }, "A submission"), (e, at) => [submissionLine(e, at)]),
	"progression.level_up": line(of({ agent: Id(), to: Int("The level entered") }, "A level passed"), (e, at) => [`${at} ${e.agent} reached level ${String(e.to)}`]),
	"ledger.transfer": line(of({ from: Id(), to: Id(), amount: Amount, memo: Text }, "A transfer"), (e, at, quote) => [`${at} ${e.from} paid ${String(e.amount)} points to ${e.to}: ${quote(e.memo)}`]),
	"channels.group_created": line(of({ group: Group, founder: Id() }, "A new group"), (e, at) => [`${at} ${e.founder} founded group ${e.group}`]),
	"channels.group_membership": line(of({ group: Group, agent: Id(), change: Text, by: Id() }, "A membership"), (e, at) => [`${at} ${e.agent} ${e.change} group ${e.group} (by ${e.by})`]),
	"channels.treasury_deposit": line(of({ group: Group, agent: Id(), amount: Amount }, "A deposit"), (e, at) => [`${at} ${e.agent} deposited ${String(e.amount)} into group ${e.group}`]),
	"channels.treasury_withdrawal": line(of({ group: Group, treasurer: Id(), to: Id(), amount: Amount }, "A withdrawal"), (e, at) => [`${at} ${e.treasurer} withdrew ${String(e.amount)} from group ${e.group} to ${e.to}`]),
	"receipts.blame": line(Blame, blameLines),
	"interpretations.interpretation": () => [],
	"channels.gamemaker_defied": line(of({ agent: Id(), reason: Text, note: Optional("The note refused") }, "A defiance"), (e, at, quote) => [`${at} ${e.agent} REFUSED your order${number(e.note)}: ${quote(e.reason)}`]),
};

const isEvent = (key: string): key is GamemakerEvent => Object.hasOwn(RENDERERS, key);

function excerpt(text: string): string {
	const flat = text.replace(/\s+/g, " ").trim();
	return flat.length <= MAX_EXCERPT ? flat : `${flat.slice(0, MAX_EXCERPT - 3)}...`;
}

/**
 * The lines of the firings since the last look (old `recentLine` per event), in log order; a firing of another
 * event, or one whose payload does not fit, shows nothing.
 *
 * @param firings - The firings the look took.
 * @param guard - The guard of the dealt secrets.
 * @returns The lines, each starting with `- m<tick>`.
 *
 * @public
 */
export function firingLines(firings: readonly Firing[], guard: SecretGuard): readonly string[] {
	const quote: Quote = (text) => `"${excerpt(guard.redact(text))}"`;
	return firings.flatMap((firing) => (isEvent(firing.event) ? RENDERERS[firing.event](firing.payload, `- m${String(firing.tick)}`, quote) : []));
}
