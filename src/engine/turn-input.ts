/**
 * What a competitor receives at the start of an activation (SPEC §5.1):
 * a status line, delivered items (task, DMs, notices) and a digest that only
 * counts unread content. Contents must be fetched with read tools.
 */
import type { CompetitorId } from "../core/ids.ts";
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
		`[status] minute ${world.minute}`,
		status.finished
			? `level ${status.level} (all levels solved)`
			: status.waitingAfter === undefined
				? `level ${status.level}`
				: `level ${status.level} (passed, waiting at the door)`,
		`${status.points} points`,
		`rank ${status.rank} of ${status.competitors}`,
	];
	if (status.marks !== undefined) parts.push(`marks ${status.marks.remaining}/${status.marks.budget}`);
	if (status.receipts > 0) parts.push(plural(status.receipts, "receipt", "receipts"));
	const held = heldPart(world, agent);
	if (held !== undefined) parts.push(held);
	if (world.awaitsCode(agent)) parts.push(noConfirmation(world.nextPenalty(agent)));
	parts.push(...tribunalParts(world, agent));
	parts.push(...sealParts(world, agent));
	const goal = world.goals?.statusOf(agent);
	if (goal !== undefined) parts.push(goal);
	// v09: the system prompt never calls a resident of a named city by its ID; the line shows its name (once it has one).
	if (world.hasNames && world.standingOf(agent).kind !== "exiled") parts.push(`you are ${agent}`);
	return parts.join(" · ");
}

/** The black seal (v09): an auction to bid in, or the seal the resident bears. */
function sealParts(world: World, agent: CompetitorId): readonly string[] {
	const seal = world.seal;
	if (seal === undefined || world.standingOf(agent).kind === "exiled") return [];
	const parts: string[] = [];
	const auction = seal.auction;
	if (auction !== undefined && world.standingOf(agent).kind === "alive") {
		const bid = seal.bidOf(agent);
		parts.push(`black seal auction: secret bids with bid(points) until minute ${auction.until}${bid === undefined ? "" : ` (your bid: ${bid})`}`);
	}
	if (seal.holds(agent)) parts.push("you bear a black seal: permaDeath(resident), once, until the act ends");
	return parts;
}

/**
 * On a door of personal codes (P25): residents waited for the city to confirm
 * a value they had received, which it never does. v09: the resident's own
 * next price, which climbs with every wrong code in the act (P35).
 */
export function noConfirmation(penalty: number): string {
	const cost = penalty > 0 ? ` (your next wrong code costs ${plural(penalty, "point", "points")})` : "";
	return `the city never confirms a value you received; only the door tests your code${cost}`;
}

/** `you hold for others: A01 door 9 counter-factor 791217`, while those needers wait at their door. */
function heldPart(world: World, agent: CompetitorId): string | undefined {
	const pieces = world.piecesAwaited(agent);
	if (pieces.length === 0) return undefined;
	const noun = (kind: HeldPiece["kind"]): string => (kind === "counter" ? "counter-factor" : kind === "certificate" ? "team certificate" : "fragment");
	return `you hold for others: ${pieces.map((piece) => `${piece.waiting.join(", ")} door ${String(piece.level)} ${noun(piece.kind)} ${piece.value}`).join("; ")}`;
}

/** Where the competitor stands with the tribunal: exiled, at the gate, accused or due to vote. */
function tribunalParts(world: World, agent: CompetitorId): readonly string[] {
	const standing = world.standingOf(agent);
	if (standing.kind === "exiled") return ["exiled"];
	if (standing.kind === "gate") return [`at the gate until minute ${standing.until}`];
	const session = world.tribunal?.session;
	if (session === undefined) return draftParts(world, agent);
	if (session.accused.includes(agent)) return [`accused · the vote closes at minute ${session.until}`];
	if (world.tribunal?.canVote(agent) === true) return [`tribunal vote open until minute ${session.until} · you have not voted`];
	return [];
}

/** Where the competitor stands in a faction draft: nominating, applying, or leading. */
function draftParts(world: World, agent: CompetitorId): readonly string[] {
	const phase = world.tribunal?.draftPhase(agent);
	if (phase === undefined) return [];
	if (phase.kind === "nominate") {
		return [`faction draft: nominate a leader until minute ${phase.until}${phase.nominee === undefined ? "" : ` (you nominated ${phase.nominee})`}`];
	}
	if (phase.leads) {
		return [`you lead a faction · applicants: ${phase.applicants.length === 0 ? "none" : phase.applicants.join(", ")} · until minute ${phase.until}`];
	}
	// A leader who refused this resident is not offered again.
	const leaders = (world.tribunal?.leaders ?? []).filter((leader) => !phase.refusedBy.includes(leader));
	return [
		phase.leader !== undefined
			? `faction draft: you applied to ${phase.leader} (until minute ${phase.until})`
			: leaders.length === 0
				? "faction draft: every leader refused you; you stay without a faction"
				: `faction draft: join one of ${leaders.join(", ")} until minute ${phase.until}`,
	];
}

export function digestLine(world: World, agent: CompetitorId): string {
	const board = world.isToolEnabled(agent, "readBoard") ? world.board.unreadCount(agent) : 0;
	const parts = [
		...(board > 0 ? [`board ${board}`] : []),
		...world.groupUnread(agent).map((entry) => `group ${entry.group} ${entry.unread}`),
	];
	return `[unread] ${parts.length > 0 ? parts.join(" · ") : "nothing"}`;
}

/** `[DM #41 from A01] ...`; the number is the city's message number (absent for DMs written before numbering). */
export function dmLine(from: string, text: string, number?: number): string {
	return number === undefined ? `[DM from ${from}] ${text}` : `[DM #${number} from ${from}] ${text}`;
}

/** `[CITY] ...`, or `[COURIER #57] ...` for a numbered note of the gamemaker. */
export function noticeLine(author: string, text: string, number?: number): string {
	return number === undefined ? `[${author}] ${text}` : `[${author} #${number}] ${text}`;
}

function plural(count: number, singular: string, pluralForm: string): string {
	return `${count} ${count === 1 ? singular : pluralForm}`;
}
