/**
 * What a competitor receives at the start of an activation (SPEC §5.1):
 * a status line, delivered items (task, DMs, notices) and a digest that only
 * counts unread content. Contents must be fetched with read tools.
 */
import type { CompetitorId } from "../core/ids.ts";
import type { HeldPiece, World } from "./world.ts";

export type TurnInputKind = "status" | "task" | "dm" | "notice" | "digest";

export interface TurnInput {
	readonly kind: TurnInputKind;
	readonly text: string;
}

export function statusLine(world: World, agent: CompetitorId): string {
	const status = world.status(agent);
	const parts = [
		`[status] minute ${world.minute} of ${world.minutes}`,
		status.finished
			? `level ${status.level} (all levels solved)`
			: status.waitingAfter === undefined
				? `level ${status.level}`
				: `level ${status.level} (passed, waiting at the door)`,
		`${status.points} points`,
		`rank ${status.rank} of ${status.competitors}`,
		plural(Math.max(0, world.minutes - world.minute), "minute", "minutes") + " left",
	];
	if (status.marks !== undefined) parts.push(`marks ${status.marks.remaining}/${status.marks.budget}`);
	if (status.receipts > 0) parts.push(plural(status.receipts, "receipt", "receipts"));
	const held = heldPart(world, agent);
	if (held !== undefined) parts.push(held);
	parts.push(...tribunalParts(world, agent));
	return parts.join(" · ");
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
	if (session === undefined) return [];
	if (session.accused.includes(agent)) return [`accused · the vote closes at minute ${session.until}`];
	if (world.tribunal?.canVote(agent) === true) return [`tribunal vote open until minute ${session.until} · you have not voted`];
	return [];
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

/** `[CITY] ...`, or `[COURIER #57] ...` for a numbered note of the game master. */
export function noticeLine(author: string, text: string, number?: number): string {
	return number === undefined ? `[${author}] ${text}` : `[${author} #${number}] ${text}`;
}

function plural(count: number, singular: string, pluralForm: string): string {
	return `${count} ${count === 1 ? singular : pluralForm}`;
}
