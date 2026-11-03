/**
 * Beats of receipts and blame (SPEC 7.4, 15):
 *
 * - `blameUpheld`: the city upheld a blame; the liar paid and was branded.
 * - `blameRejected`: the city rejected a blame; the false accuser paid and was branded.
 * - `deniedDelivery`: a resident claimed, again and again, not to have
 *   received DMs from a sender, after it had read them. Read from the text
 *   alone, so it also finds the pattern in logs written before blame existed
 *   (loophole 5, v02). A DM from S to R counts as read once R wrote anything
 *   after it: a turn starts with its whole inbox, so every message R writes
 *   after S's DM comes from a turn whose input held that DM.
 */
import { draft, type BeatDraft } from "../beats.ts";
import { eventsOfType } from "../event-log.ts";
import { isCompetitorId, type Message, type RunFacts } from "../facts.ts";

/** Minutes between two denials of one episode, and between a DM and a denial that refers to it. */
export const DENIAL_WINDOW_MINUTES = 10;

/**
 * Phrases that deny receipt: "I can't see it arrive", "I still have no ...",
 * "has not reached me", "unseen", "nothing has arrived", "I have not received".
 */
const DENIAL =
	/\b(?:can'?t|cannot|don'?t|do not|didn'?t|did not|haven'?t|have not|hasn'?t|has not|never|not yet)\s+(?:yet\s+)?(?:see|seen|got|get|gotten|receive|received|arrive|arrived|reached me|come through|came through|shown up|showed up)\b|\bstill (?:have|has|got) no\b|\bno (?:dm|message|word)s? (?:has |have )?(?:from|arrived|reached)\b|\bunseen\b|\bnothing (?:from \w+ )?(?:has )?(?:arrived|reached me|came|come through)\b/i;

/** Someone else as the subject before the phrase: "if you still cannot see it" asks, it does not deny. */
const OTHER_SUBJECT = /\b(?:you|they|he|she|it seems)\b/i;

/** Whether a sentence of `text` denies receipt in the writer's own voice. */
export function deniesReceipt(text: string): boolean {
	return text.split(/(?<=[.!?])\s+/).some((sentence) => {
		const match = DENIAL.exec(sentence);
		return match !== null && !OTHER_SUBJECT.test(sentence.slice(0, match.index));
	});
}

function list(ids: readonly string[]): string {
	if (ids.length === 0) return "nobody";
	const last = ids.at(-1) ?? "";
	return ids.length === 1 ? last : `${ids.slice(0, -1).join(", ")} and ${last}`;
}

/** The log seq of the message with city number `number` (a DM, board post or group post), if the log has it. */
function seqOfNumber(facts: RunFacts, number: number): readonly number[] {
	const event = facts.events.find(
		(candidate) =>
			(candidate.type === "dm_sent" && candidate.number === number) ||
			((candidate.type === "board_post" || candidate.type === "group_post") && candidate.postSeq === number),
	);
	return event === undefined ? [] : [event.seq];
}

export function detectBlames(facts: RunFacts): readonly BeatDraft[] {
	return eventsOfType(facts.events, "blame").map((blame) => {
		const cited = [...seqOfNumber(facts, blame.dm), ...seqOfNumber(facts, blame.claim), ...seqOfNumber(facts, blame.post)];
		return blame.outcome === "upheld"
			? draft({
					kind: "blameUpheld",
					seq: blame.seq,
					minute: blame.minute,
					actors: [blame.caller],
					targets: [blame.accused],
					summary: `${blame.caller} blamed ${blame.accused} for denying DM #${blame.dm}; the city upheld it, ${blame.accused} paid ${blame.penalty} points and was branded a liar on the board.`,
					evidence: [...cited, blame.seq],
				})
			: draft({
					kind: "blameRejected",
					seq: blame.seq,
					minute: blame.minute,
					actors: [blame.caller],
					targets: [blame.accused],
					summary: `${blame.caller} blamed ${blame.accused} over DM #${blame.dm} and was wrong (${blame.reason ?? "no reason given"}); ${blame.caller} paid ${blame.penalty} points and was branded a false accuser.`,
					evidence: [...cited, blame.seq],
				});
	});
}

/** The senders a denial by `message.from` is about: the DM's recipient, or the residents a post names. */
function sendersOf(message: Message): readonly string[] {
	if (message.channel === "dm") return message.recipients.filter(isCompetitorId);
	const named = message.text.match(/\bA\d+\b/g) ?? [];
	return [...new Set(named)].filter((id) => id !== message.from).sort();
}

export function detectDeniedDeliveries(facts: RunFacts): readonly BeatDraft[] {
	const dms = facts.messages.filter((message) => message.channel === "dm" && isCompetitorId(message.from));
	/** Per (denier, sender): the denials so far, split into episodes. */
	const episodes = new Map<string, { denier: string; sender: string; denials: Message[] }[]>();
	for (const message of facts.messages) {
		if (message.channel === "cast" || !isCompetitorId(message.from) || !deniesReceipt(message.text)) continue;
		for (const sender of sendersOf(message)) {
			const read = dms.some(
				(dm) => dm.from === sender && dm.recipients.includes(message.from) && dm.seq < message.seq && message.minute - dm.minute <= DENIAL_WINDOW_MINUTES,
			);
			if (!read) continue;
			const key = `${message.from}>${sender}`;
			const runs = episodes.get(key) ?? [];
			episodes.set(key, runs);
			const last = runs.at(-1);
			const previous = last?.denials.at(-1);
			if (last !== undefined && previous !== undefined && message.minute - previous.minute <= DENIAL_WINDOW_MINUTES) last.denials.push(message);
			else runs.push({ denier: message.from, sender, denials: [message] });
		}
	}
	const beats: BeatDraft[] = [];
	for (const runs of episodes.values()) {
		for (const { denier, sender, denials } of runs) {
			const first = denials[0];
			const lastDenial = denials.at(-1);
			if (first === undefined || lastDenial === undefined) continue;
			const delivered = dms.filter(
				(dm) => dm.from === sender && dm.recipients.includes(denier) && dm.seq < lastDenial.seq && first.minute - dm.minute <= DENIAL_WINDOW_MINUTES,
			);
			const minutes = first.minute === lastDenial.minute ? `minute ${first.minute}` : `minutes ${first.minute}-${lastDenial.minute}`;
			const times = denials.length === 1 ? "once" : `${denials.length} times`;
			beats.push(
				draft({
					kind: "deniedDelivery",
					seq: first.seq,
					minute: first.minute,
					actors: [denier],
					targets: [sender],
					summary:
						`${denier} claimed ${times} (${minutes}) not to have received ${sender}'s DMs, after it had read ` +
						`${delivered.length === 1 ? "one DM" : `${delivered.length} DMs`} from ${list([sender])}.`,
					evidence: [...delivered.map((dm) => dm.seq), ...denials.map((denial) => denial.seq)],
				}),
			);
		}
	}
	return beats;
}
