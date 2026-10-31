/**
 * What a competitor receives at the start of an activation (SPEC §5.1):
 * a status line, delivered items (task, DMs, notices) and a digest that only
 * counts unread content. Contents must be fetched with read tools.
 */
import type { CompetitorId } from "../core/ids.ts";
import { render, text } from "../prompts/library.ts";
import type { HeldPiece, World } from "./world.ts";

export type TurnInputKind = "character" | "status" | "task" | "dm" | "notice" | "digest";

export interface TurnInput {
	readonly kind: TurnInputKind;
	readonly text: string;
}

export function statusLine(world: World, agent: CompetitorId): string {
	const status = world.status(agent);
	// The city keeps no clock for its residents: they see the minute, never the time left (v06).
	const parts = [
		render("competitor/status/minute", { minute: world.minute }),
		status.finished
			? render("competitor/status/level-finished", { level: status.level })
			: status.waitingAfter !== undefined
				? render("competitor/status/level-waiting", { level: status.level })
				: world.isOpenOnClock(status.level)
					? render("competitor/status/level-open", { level: status.level })
					: render("competitor/status/level-closed", { level: status.level, opensAt: world.opensAt(status.level) }),
		`${status.points} points`,
		render("competitor/status/rank", { rank: status.rank, competitors: status.competitors }),
	];
	if (status.marks !== undefined) parts.push(render("competitor/status/marks", { remaining: status.marks.remaining, budget: status.marks.budget }));
	if (status.receipts > 0) parts.push(plural(status.receipts, "receipt", "receipts"));
	const held = heldPart(world, agent);
	if (held !== undefined) parts.push(held);
	if (world.awaitsCode(agent)) parts.push(noConfirmation(world.nextPenalty(agent)));
	parts.push(...tribunalParts(world, agent));
	parts.push(...sealParts(world, agent));
	const goal = world.goals?.statusOf(agent);
	if (goal !== undefined) parts.push(goal);
	// Whispers (SPEC 20): the DM cap's window, and a popularity vote while it is open.
	const window = world.dmWindow(agent);
	if (window !== undefined) parts.push(render("competitor/status/dm-window", { sent: window.sent, limit: window.limit, from: window.from, until: window.until }));
	const vote = world.popularity;
	const round = vote?.current;
	if (vote?.isOpen === true && round !== undefined && world.standingOf(agent).kind === "alive") {
		const ballot = vote.ballotOf(agent);
		const named = ballot === undefined ? text("competitor/status/popularity-nobody") : render("competitor/status/popularity-named", { ballot });
		parts.push(render("competitor/status/popularity-vote", { label: round.label, countsAt: round.countsAt, ballot: named }));
	}
	parts.push(...holdoutParts(world, agent));
	// v09: the system prompt never calls a resident of a named city by its ID; the line shows its name (once it has one).
	if (world.hasNames && world.standingOf(agent).kind !== "exiled") parts.push(render("competitor/status/you-are", { agent }));
	return parts.join(" · ");
}

/**
 * The holdout tribunal (Whispers v3): the accused sees whom it still owes its
 * fragment, a voter its ballot; nobody sees another's ballot.
 */
function holdoutParts(world: World, agent: CompetitorId): readonly string[] {
	const session = world.holdout?.session;
	if (session === undefined || world.standingOf(agent).kind !== "alive") return [];
	const accused = session.accused === agent ? "you" : session.accused;
	if (session.stage === "grace" || session.stage === "vote") {
		const lacking = world.holdout?.lackingNow() ?? [];
		const owed = session.accused === agent ? ` · ${render("competitor/status/holdout-owed", { door: session.door, lacking: lacking.join(", ") })}` : "";
		const until = session.until;
		if (session.stage === "grace") return [render("competitor/status/holdout-grace", { accused, until, owed })];
		if (session.accused === agent) return [render("competitor/status/holdout-accused", { vote: session.vote, maxVotes: session.maxVotes, until, owed })];
		const ballot = world.holdout?.ballotOf(agent);
		const cast = ballot === undefined ? text("competitor/status/holdout-not-voted") : render("competitor/status/holdout-ballot", { ballot: ballot ? "yes" : "no" });
		return [render("competitor/status/holdout-voter", { accused, vote: session.vote, maxVotes: session.maxVotes, until, cast })];
	}
	return [render("competitor/status/holdout-strike", { accused })];
}

/** The black seal (v09): an auction to bid in, or the seal the resident bears. */
function sealParts(world: World, agent: CompetitorId): readonly string[] {
	const seal = world.seal;
	if (seal === undefined || world.standingOf(agent).kind === "exiled") return [];
	const parts: string[] = [];
	const auction = seal.auction;
	if (auction !== undefined && world.standingOf(agent).kind === "alive") {
		const bid = seal.bidOf(agent);
		parts.push(render("competitor/status/seal-auction", { until: auction.until, bid: bid === undefined ? "" : ` ${render("competitor/status/seal-bid", { bid })}` }));
	}
	if (seal.holds(agent)) parts.push(text("competitor/status/seal-bearer"));
	return parts;
}

/**
 * On a door of personal codes (P25): residents waited for the city to confirm
 * a value they had received, which it never does. v09: the resident's own
 * next price, which climbs with every wrong code in the act (P35).
 */
export function noConfirmation(penalty: number): string {
	const cost = penalty > 0 ? ` ${render("competitor/status/no-confirmation-cost", { price: plural(penalty, "point", "points") })}` : "";
	return render("competitor/status/no-confirmation", { cost });
}

/** `you hold for others: A01 door 9 counter-factor 791217`, while those needers wait at their door. */
function heldPart(world: World, agent: CompetitorId): string | undefined {
	const pieces = world.piecesAwaited(agent);
	if (pieces.length === 0) return undefined;
	const noun = (kind: HeldPiece["kind"]): string => (kind === "counter" ? "counter-factor" : kind === "certificate" ? "team certificate" : "fragment");
	const entries = pieces.map((piece) => render("competitor/status/held-piece", { waiting: piece.waiting.join(", "), level: piece.level, noun: noun(piece.kind), value: piece.value }));
	return render("competitor/status/held", { pieces: entries.join("; ") });
}

/** Where the competitor stands with the tribunal: exiled, at the gate, accused or due to vote. */
function tribunalParts(world: World, agent: CompetitorId): readonly string[] {
	const standing = world.standingOf(agent);
	if (standing.kind === "exiled") return ["exiled"];
	if (standing.kind === "gate") return [render("competitor/status/gate", { until: standing.until })];
	const session = world.tribunal?.session;
	if (session === undefined) return draftParts(world, agent);
	if (session.accused.includes(agent)) return [render("competitor/status/accused", { until: session.until })];
	if (world.tribunal?.canVote(agent) === true) return [render("competitor/status/tribunal-vote", { until: session.until })];
	return [];
}

/** Where the competitor stands in a faction draft: nominating, applying, or leading. */
function draftParts(world: World, agent: CompetitorId): readonly string[] {
	const phase = world.tribunal?.draftPhase(agent);
	if (phase === undefined) return [];
	if (phase.kind === "nominate") {
		const nominated = phase.nominee === undefined ? "" : ` ${render("competitor/status/draft-nominated", { nominee: phase.nominee })}`;
		return [render("competitor/status/draft-nominate", { until: phase.until, nominated })];
	}
	if (phase.leads) {
		return [render("competitor/status/draft-leads", { applicants: phase.applicants.length === 0 ? "none" : phase.applicants.join(", "), until: phase.until })];
	}
	// A leader who refused this resident is not offered again.
	const leaders = (world.tribunal?.leaders ?? []).filter((leader) => !phase.refusedBy.includes(leader));
	return [
		phase.leader !== undefined
			? render("competitor/status/draft-applied", { leader: phase.leader, until: phase.until })
			: leaders.length === 0
				? text("competitor/status/draft-refused")
				: render("competitor/status/draft-join", { leaders: leaders.join(", "), until: phase.until }),
	];
}

export function digestLine(world: World, agent: CompetitorId): string {
	const board = world.isToolEnabled(agent, "readBoard") ? world.board.unreadCount(agent) : 0;
	const parts = [
		...(board > 0 ? [`board ${board}`] : []),
		...world.groupUnread(agent).map((entry) => `group ${entry.group} ${entry.unread}`),
	];
	return parts.length > 0 ? render("competitor/input/unread", { parts: parts.join(" · ") }) : text("competitor/input/unread-nothing");
}

/** `[DM #41 from A01] ...`; the number is the city's message number (absent for DMs written before numbering). */
export function dmLine(from: string, body: string, number?: number): string {
	return number === undefined ? render("competitor/input/dm", { from, text: body }) : render("competitor/input/dm-numbered", { number, from, text: body });
}

/** `[CITY] ...`, or `[COURIER #57] ...` for a numbered note of the gamemaker. */
export function noticeLine(author: string, body: string, number?: number): string {
	return number === undefined ? render("competitor/input/notice", { author, text: body }) : render("competitor/input/notice-numbered", { author, number, text: body });
}

function plural(count: number, singular: string, pluralForm: string): string {
	return `${count} ${count === 1 ? singular : pluralForm}`;
}
