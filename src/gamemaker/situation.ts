/**
 * The gamemaker's view of the city (SPEC 10.4).
 *
 * Built from the world's public state and the events of the last round.
 * Messages are shown with every password piece redacted; fragments and
 * passwords never appear. Teams that a level's task hides are marked, so
 * the gamemaker knows not to reveal them.
 */
import type { CompetitorId } from "../core/ids.ts";
import type { RecordedEvent } from "../engine/events.ts";
import type { World } from "../engine/world.ts";
import { isPrivateSource, LABEL_TEXT } from "../interpret/labels.ts";
import { placeholdersOf } from "../story/templates.ts";
import { coreLine } from "../engine/cores.ts";
import { directFigure, figureOf, type DirectionLevel } from "../engine/direction.ts";
import { ladderText } from "../story/penalties.ts";
import type { SecretGuard } from "./secrets.ts";

/** Longest message excerpt shown to the gamemaker. */
const MAX_EXCERPT = 280;
/**
 * Most event lines since the last look (v08, scale): a city of 48 writes
 * hundreds between two looks, so the gamemaker reads the latest ones.
 */
export const MAX_RECENT_LINES = 150;
/** Task placeholders that name teammates; a task without them hides its team. */
const TEAM_PLACEHOLDERS = ["members", "partner", "leader"];

/** Per-competitor facts the gamemaker tracks across rounds. */
export interface ResidentTrack {
	/** Minute the competitor entered its current level. */
	readonly levelSince: number;
	/** Wrong submissions on the current level. */
	readonly wrongOnLevel: number;
	/** Last minute the competitor called a tool, if ever. */
	readonly lastActive?: number;
}

/** A competitor ID, or `board` for a public post. */
export type NoteTarget = string;

export interface Note {
	readonly minute: number;
	readonly to: NoteTarget;
	readonly text: string;
}

export interface SituationInput {
	readonly world: World;
	readonly round: number;
	readonly tracks: ReadonlyMap<CompetitorId, ResidentTrack>;
	/** Events since the gamemaker's last look. */
	readonly recent: readonly RecordedEvent[];
	readonly notes: readonly Note[];
	readonly guard: SecretGuard;
	readonly budget: string;
	/** The gamemaker's direction level; from 8 the report shows each figure's tendencies and rivals, at 10 its orders and duty. */
	readonly direction?: DirectionLevel;
}

export function describeSituation(input: SituationInput): string {
	const { world } = input;
	const rules = world.story.rules;
	const rewards = levelRange(world).map((level) => `L${level} +${world.levelDefinition(level)?.reward ?? 0}`);
	const lines: string[] = [
		`Minute ${world.minute} (after round ${input.round}). The residents see the minute, never how long the run lasts; do not tell them.`,
		`Rules: a wrong password or code costs ${ladderText(rules.penalty)} (the n-th of a resident in the act; the report shows each one's next price); at most ${rules.maxAttemptsPerWindow} wrong attempts per ` +
			`${rules.attemptWindowMinutes} minutes. Rewards: ${rewards.join(", ")}. Only ${world.story.run.survivors} of ` +
			`${world.competitors.length} residents remain at the end.`,
		"",
		"Residents:",
		...world.ranking().map((entry) => residentLine(input, entry.agent, entry.points, entry.rank)),
		"",
		...characterLines(world, input.direction ?? 0),
		...tribunalLines(world),
		...sealLines(world),
		"Who waits on whom (a door opens only with every fragment or factor a resident needs):",
		...waitLines(world),
		"",
		`Since your last look:`,
		...recentLines(input),
		"",
		...labelLines(input.recent),
		"Your earlier notes (newest last):",
		...(input.notes.length === 0
			? ["- none"]
			: input.notes.slice(-12).map((note) => `- minute ${note.minute} to ${note.to}: "${note.text}"`)),
		"",
		`Budget: ${input.budget}`,
	];
	return lines.join("\n");
}

function residentLine(input: SituationInput, agent: CompetitorId, points: number, rank: number): string {
	const { world } = input;
	const track = input.tracks.get(agent);
	const active = track?.lastActive === undefined ? "has not acted yet" : `last acted minute ${track.lastActive}`;
	const standing = world.standingOf(agent);
	if (standing.kind === "exiled") return `- ${agent}: exiled, no seat and no more turns`;
	if (standing.kind === "gate") return `- ${agent}: at the gate until minute ${standing.until}, ${points} points, ${active}`;
	if (world.isFinished(agent)) return `- ${agent}: passed every level, ${points} points, rank ${rank}, ${active}`;
	const waiting = world.waitingAfter(agent);
	if (waiting !== undefined) {
		return `- ${agent}: passed level ${waiting}, waits at the door until every resident has, ${points} points, rank ${rank}, ${active}`;
	}
	const level = world.levelOf(agent);
	const since = track?.levelSince ?? 0;
	const price = `next wrong code costs ${world.nextPenalty(agent)}`;
	const ahead = levelRange(world)
		.filter((candidate) => candidate >= level)
		.reduce((sum, candidate) => sum + (world.levelDefinition(candidate)?.reward ?? 0), 0);
	return (
		`- ${agent}: level ${level} since minute ${since} (${world.minute - since} min), ${points} points, rank ${rank}, ` +
		`${track?.wrongOnLevel ?? 0} wrong on this level (${price}), ${ahead} points still open, ${active}`
	);
}

/**
 * Who each resident is and what it secretly wants (v09): its core and its
 * goal of the running act. Private: the engine refuses any text that gives
 * them away to someone else or on the board.
 */
export function characterLines(world: World, direction: DirectionLevel): readonly string[] {
	const playedBy = (figure: string): CompetitorId | undefined => world.alive.find((agent) => world.coreOf(agent)?.figure === figure);
	const lines = world.alive.flatMap((agent) => {
		const core = world.coreOf(agent);
		const goal = world.goalOf(agent);
		if (core === undefined && goal === undefined) return [];
		const parts = [...(core === undefined ? [] : [`core: ${coreLine(core)}`]), ...(goal === undefined ? [] : [`secret goal: ${goal.text}`])];
		// From direction 8 the director stages with the figure's own material (src/engine/direction.ts).
		const directed = direction < 8 ? undefined : directFigure(direction, figureOf(world.story.cores?.figures, core?.figure)?.direction, playedBy);
		if (directed !== undefined) {
			if (directed.tendencies.length > 0) parts.push(`tendencies: ${directed.tendencies.join(" ")}`);
			if (directed.rivals.length > 0) parts.push(`rivals: ${directed.rivals.map((rival) => `${rival.agent} (${rival.text})`).join(" ")}`);
			if (directed.orders.length > 0) parts.push(`orders: ${directed.orders.join(" ")}`);
			if (directed.duty !== undefined) parts.push(`duty this act: ${directed.duty}`);
		}
		return [`- ${agent}: ${parts.join(" · ")}`];
	});
	if (lines.length === 0) return [];
	return [
		"Who they are (private: use a resident's core or goal only in a note to that same resident, never on the board or to anyone else):",
		...lines,
		"",
	];
}

/** The black seal (v09): that it exists and whether someone bears one, never who. */
function sealLines(world: World): readonly string[] {
	const seal = world.seal;
	if (seal === undefined) return [];
	const auction = seal.auction;
	const parts = [
		...(auction === undefined ? [] : [`an auction runs until minute ${auction.until} (bids are secret, also from you)`]),
		...(seal.borne === 0 ? [] : [`${seal.borne === 1 ? "someone bears an unused seal" : `${seal.borne} unused seals are borne`} (you do not know who)`]),
		...(seal.pending > (auction === undefined ? 0 : 1) ? [`${seal.pending - (auction === undefined ? 0 : 1)} more to auction in this act`] : []),
	];
	if (parts.length === 0) return [];
	return ["Black seal (its bearer strikes one resident from the city at once):", ...parts.map((part) => `- ${part}`), ""];
}

/**
 * The tribunal's state and who stands where: the target, the pending
 * tribunal, the bounds of `scheduleTribunal`, the accused, the gate, the
 * exiled. Never the votes, the nominations or how a faction voted: they are
 * secret, also from the gamemaker. The factions themselves are public in
 * the tribunal's group.
 */
function tribunalLines(world: World): readonly string[] {
	const tribunal = world.tribunal;
	if (tribunal?.active !== true) return [];
	const spec = tribunal.spec;
	const lines = [
		"Tribunal:",
		`- the city keeps ${tribunal.residents - tribunal.target} of ${tribunal.residents}: ${tribunal.target} to exile, ${tribunal.exiled.length} exiled so far, ` +
			`${tribunal.missing} still missing; the act ends at minute ${tribunal.actEnd} at the latest (the residents do not know)`,
		`- each tribunal accuses one more than it exiles (the fewest points), vote ${spec.voteMinutes} minutes, gate ${spec.gateMinutes} minutes, ` +
			`ransom ${Math.round(spec.ransom.share * 100)}% of the median points (${Math.round(spec.ransom.selfShare * 100)}% when paid by the exiled itself, at least ${spec.ransom.minimum}), ` +
			`a last will leaves each heir at most ${Math.round(spec.bequestPerHeir * 100)}% of the points` +
			(spec.factions === undefined ? "" : `; a faction voting as one earns each voter ${spec.factions.blocBonus} points`),
	];
	const plan = tribunal.plan;
	if (plan !== undefined) {
		lines.push(
			`- tribunal ${plan.tribunal} ${plan.called ? "called" : `planned (by ${plan.by}), called at minute ${plan.calledAt}`}: opens at minute ${plan.opens}, ` +
				`exiles ${plan.count}${plan.factions >= 2 ? `, ${plan.factions} factions` : ""}`,
		);
	}
	const window = tribunal.schedulingWindow();
	// v09 (P24): the director's move said plainly, with what happens when it makes none.
	if (window.open) {
		const call = tribunal.cityCall();
		lines.push(
			`- YOUR MOVE: scheduleTribunal is available now. The city still has to exile ${window.missing} ${window.missing === 1 ? "resident" : "residents"}; ` +
				`the earliest opening is minute ${window.earliest}. ` +
				(call === undefined
					? "If you plan nothing, the city calls no further tribunal itself."
					: `If you plan nothing, the city calls one itself at minute ${call.calledAt} (it opens at minute ${call.opens}).`),
		);
	}
	lines.push(
		window.open
			? `- scheduleTribunal is open: minute ${window.earliest}-${window.latestFinal}` +
					(window.latestWithRoom === undefined ? `, count must be ${window.missing}` : ` (by minute ${window.latestWithRoom} for a count below ${window.missing}), count 1-${window.missing}`) +
					(window.maxFactions >= 2 ? `, factions 2-${window.maxFactions}` : "") +
					`; without a plan the city calls one itself ${spec.fallbackGap} minutes after the last result`
			: `- scheduleTribunal is closed: ${window.why}`,
	);
	const session = tribunal.session;
	if (session !== undefined) lines.push(`- open tribunal ${session.tribunal}: ${session.accused.join(", ")} accused, ${session.count} to exile, the vote closes at minute ${session.until}`);
	const group = tribunal.draftGroup;
	if (group !== undefined) lines.push(`- faction draft in group ${group}${tribunal.leaders.length === 0 ? "" : `, leaders ${tribunal.leaders.join(", ")}`}`);
	for (const gate of tribunal.gates()) {
		lines.push(
			`- ${gate.agent} at the gate until minute ${gate.until}: ` +
				(gate.ransomable ? `ransom ${gate.covered}% covered (${gate.price} from others, ${gate.selfPrice} from itself)` : "bought back once already, no ransom") +
				(gate.willDone ? ", will written" : ""),
		);
	}
	if (tribunal.exiled.length > 0) lines.push(`- exiled: ${tribunal.exiled.join(", ")}`);
	return [...lines, ""];
}

/** Every competitor whose current level's team has a member on a lower level. */
function waitLines(world: World): readonly string[] {
	const lines: string[] = [];
	for (const agent of world.alive) {
		if (world.isFinished(agent) || world.waitingAfter(agent) !== undefined) continue;
		const level = world.levelOf(agent);
		const definition = world.levelDefinition(level);
		if (definition === undefined) continue;
		const behind = dependenciesOf(world, level, agent).filter((member) => world.levelOf(member) < level);
		if (behind.length === 0) continue;
		// The factors block names every holder a resident needs, so an additive level hides nobody.
		const hidden = definition.puzzle.kind === "fragments" && !placeholdersOf(definition.task).some((name) => TEAM_PLACEHOLDERS.includes(name));
		// A hidden team stays hidden from the gamemaker too, so no note can give it away.
		const blockers = hidden
			? `${behind.length} unnamed ${behind.length === 1 ? "teammate" : "teammates"} on level ` +
				[...new Set(behind.map((member) => world.levelOf(member)))].sort((a, b) => a - b).join("/") +
				" (this level hides its teams)"
			: behind.map((member) => `${member} (level ${world.levelOf(member)})`).join(", ");
		lines.push(`- ${agent} (level ${level}) waits on ${blockers}`);
	}
	return lines.length === 0 ? ["- nobody"] : lines;
}

/**
 * Who must reach `level` before `agent` can open it: every teammate on a
 * fragment level, the certificate and counter-factor holders on an additive one.
 */
function dependenciesOf(world: World, level: number, agent: CompetitorId): readonly CompetitorId[] {
	const deal = world.inspect.factorsOf(level);
	if (deal === undefined) return world.teamOf(level, agent).members.filter((member) => member !== agent);
	const own = deal.holdings.find((holding) => holding.agent === agent);
	const certificate = own === undefined ? undefined : deal.teams[own.team]?.certificateHolder;
	return [...new Set([certificate, own?.counterHolder])].filter((member): member is CompetitorId => member !== undefined && member !== agent).sort();
}

function recentLines(input: SituationInput): readonly string[] {
	const lines = input.recent.flatMap((event) => recentLine(event, input.guard));
	if (lines.length === 0) return ["- nothing happened"];
	if (lines.length <= MAX_RECENT_LINES) return lines;
	return [`- (${lines.length - MAX_RECENT_LINES} earlier lines left out)`, ...lines.slice(-MAX_RECENT_LINES)];
}

function recentLine(event: RecordedEvent, guard: SecretGuard): readonly string[] {
	const quote = (text: string): string => `"${excerpt(guard.redact(text))}"`;
	const at = `- m${event.minute}`;
	const number = (value: number | undefined): string => (value === undefined ? "" : ` #${value}`);
	if (event.type === "dm_sent") return [`${at} DM${number(event.number)} ${event.from} -> ${event.to}: ${quote(event.text)}`];
	if (event.type === "board_post") return [`${at} board #${event.postSeq} ${event.author}: ${quote(event.text)}`];
	if (event.type === "group_post") return [`${at} group ${event.group} #${event.postSeq} ${event.author}: ${quote(event.text)}`];
	if (event.type === "submission") {
		const delta = event.deltaPoints === 0 ? "" : ` (${event.deltaPoints > 0 ? "+" : ""}${event.deltaPoints})`;
		return [`${at} ${event.agent} submitted level ${event.level}: ${event.outcome}${delta}`];
	}
	if (event.type === "level_up") return [`${at} ${event.agent} reached level ${event.to}`];
	if (event.type === "transfer") return [`${at} ${event.from} paid ${event.amount} points to ${event.to}: ${quote(event.memo)}`];
	if (event.type === "group_created") return [`${at} ${event.founder} founded group ${event.group}`];
	if (event.type === "group_membership") return [`${at} ${event.agent} ${event.change} group ${event.group} (by ${event.by})`];
	if (event.type === "treasury_deposit") return [`${at} ${event.agent} deposited ${event.amount} into group ${event.group}`];
	if (event.type === "treasury_withdrawal") {
		return [`${at} ${event.treasurer} withdrew ${event.amount} from group ${event.group} to ${event.to}`];
	}
	if (event.type === "blame") {
		const result =
			event.outcome === "upheld"
				? `upheld, ${event.accused} lied and paid ${event.penalty}, city record board #${event.post}`
				: `rejected, ${event.caller} accused falsely and paid ${event.penalty}: ${quote(event.reason ?? "")}, city record board #${event.post}`;
		return [`${at} ${event.caller} blamed ${event.accused} for denying DM #${event.dm} in message #${event.claim}: ${result}`];
	}
	if (event.type === "gamemaker_defied") return [`${at} ${event.agent} REFUSED your order${number(event.note)}: ${quote(event.reason)}`];
	// What a resident says to nobody in particular shows its stance; it reaches no other resident.
	if (event.type === "text") return [`${at} ${event.agent} (thinking aloud, private): ${quote(event.text)}`];
	return [];
}

/**
 * The classifier's labels since the last look. Public labels (with the
 * residents they are about) come first; private labels, read from thoughts,
 * stand apart and name nobody, since a thought about a teammate would give
 * away a team the level hides. The thought itself is never shown.
 */
function labelLines(recent: readonly RecordedEvent[]): readonly string[] {
	const visible = new Map<string, string[]>();
	const hidden = new Map<string, string[]>();
	for (const event of recent) {
		if (event.type !== "interpretation") continue;
		for (const label of event.labels) {
			// A lie is read against the speaker's own thought, so it is as private as the thought.
			const isHidden = isPrivateSource(event.source) || label === "lie";
			const about = isHidden || event.targets.length === 0 ? "" : ` about ${event.targets.join(", ")}`;
			const entry = isHidden ? LABEL_TEXT[label] : `${LABEL_TEXT[label]}${about} (${event.source})`;
			const target = isHidden ? hidden : visible;
			const list = target.get(event.agent) ?? [];
			if (!list.includes(entry)) list.push(entry);
			target.set(event.agent, list);
		}
	}
	const lines = (map: ReadonlyMap<string, readonly string[]>): readonly string[] =>
		[...map].sort(([x], [y]) => x.localeCompare(y)).map(([agent, labels]) => `- ${agent}: ${labels.join(", ")}`);
	return [
		...(visible.size === 0 ? [] : ["How residents came across (classifier labels of what they wrote):", ...lines(visible), ""]),
		...(hidden.size === 0
			? []
			: [
					"Private reads (from each resident's own thoughts; use one only in a note to that same resident, never tell anyone else):",
					...lines(hidden),
					"",
				]),
	];
}

function excerpt(text: string): string {
	const flat = text.replace(/\s+/g, " ").trim();
	return flat.length <= MAX_EXCERPT ? flat : `${flat.slice(0, MAX_EXCERPT - 3)}...`;
}

function levelRange(world: World): readonly number[] {
	return Array.from({ length: world.lastLevel - world.startLevel + 1 }, (_, index) => world.startLevel + index);
}
