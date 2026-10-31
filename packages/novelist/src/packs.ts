/**
 * Scene packs (code, no model): for each chapter of the outline, the raw
 * material its writer sees. The POV figure's messages, its thinking (the
 * inner monologue), the gamemaker's notes to it, the board and what the city
 * recorded in the chapter's minutes, plus the figure's dossier, within a
 * character budget. IDs are replaced by names. Packs are written to
 * `novel/packs/NN.md` so a reader can audit what the writer saw.
 */
import { cite, type DigestEvent, evidenceLines, excerpt } from "@swarmtales/chronicle";
import type { PovFigure } from "./casting.ts";
import type { OutlineChapter } from "./chapter.ts";
import { Names, type NovelSource } from "./source.ts";

export interface PackOptions {
	/** Upper bound of the characters of a pack's material (the dossier comes on top). */
	readonly maxChars: number;
	readonly thoughtChars: number;
	readonly messageChars: number;
	readonly boardChars: number;
	readonly figureChars: number;
}

export const DEFAULT_PACK_OPTIONS: PackOptions = { maxChars: 30_000, thoughtChars: 700, messageChars: 500, boardChars: 300, figureChars: 2_500 };

type Section = "thoughts" | "messages" | "notes" | "board" | "facts";

const SECTION_TITLES: Readonly<Record<Section, (name: string) => string>> = {
	thoughts: (name) => `What ${name} thought (private: nobody else saw this)`,
	messages: (name) => `Messages ${name} sent and received`,
	notes: (name) => `Notes from the city's game makers to ${name}`,
	board: () => "The public board",
	facts: () => "What the city recorded (facts: these outcomes are fixed)",
};

const SECTIONS: readonly Section[] = ["thoughts", "messages", "notes", "board", "facts"];

interface PackItem {
	readonly seq: number;
	readonly section: Section;
	/** Lower numbers are dropped first when the pack gets too long. */
	readonly priority: number;
	readonly text: string;
}

export interface ScenePack {
	readonly chapter: number;
	readonly markdown: string;
	/** Every `seq` the pack shows (its material, not the outline's evidence), ascending. */
	readonly seqs: readonly number[];
	readonly omitted: number;
}

/** Message and action types that are shown in their own sections, not among the facts. */
const NOT_FACTS: ReadonlySet<string> = new Set(["thinking", "text", "dm_sent", "cast_dm", "group_post", "board_post", "interpretation", "interpretation_round"]);

export function buildPack(source: NovelSource, chapter: OutlineChapter, pov: PovFigure, options: PackOptions = DEFAULT_PACK_OPTIONS): ScenePack {
	const { facts } = source.analysis;
	const names = new Names(facts.names);
	const agent = chapter.pov;
	const name = names.of(agent);
	const inWindow = (minute: number): boolean => minute >= chapter.from && minute <= chapter.to;
	const cited = new Set(chapter.evidence);
	const items: PackItem[] = [];
	const say = (text: string, chars: number): string => JSON.stringify(excerpt(names.apply(text), chars));

	for (const event of facts.events) {
		if (!inWindow(event.minute) || (event.type !== "thinking" && event.type !== "text") || event.agent !== agent) continue;
		items.push({ seq: event.seq, section: "thoughts", priority: cited.has(event.seq) ? 3 : 2, text: `#${event.seq} m${event.minute} ${say(event.text, options.thoughtChars)}` });
	}
	for (const message of facts.messages) {
		if (!inWindow(message.minute) && !cited.has(message.seq)) continue;
		if (message.channel === "board") {
			const priority = cited.has(message.seq) || message.from === agent ? 3 : 1;
			items.push({ seq: message.seq, section: "board", priority, text: `#${message.seq} m${message.minute} ${names.of(message.from)}: ${say(message.text, options.boardChars)}` });
			continue;
		}
		if (message.from !== agent && !message.recipients.includes(agent)) continue;
		const to = message.recipients.map((recipient) => names.of(recipient)).join(", ");
		const where = message.channel === "group" ? `in group ${message.group ?? "?"} (read by ${to})` : `to ${to}`;
		items.push({
			seq: message.seq,
			section: "messages",
			priority: cited.has(message.seq) ? 3 : 2,
			text: `#${message.seq} m${message.minute} ${names.of(message.from)} ${where}: ${say(message.text, options.messageChars)}`,
		});
	}
	for (const note of source.gamemaker.notes) {
		if (!inWindow(note.minute) || note.to !== agent) continue;
		items.push({ seq: note.seq, section: "notes", priority: 2, text: `#${note.seq} m${note.minute} ${say(note.text, options.messageChars)}` });
	}
	const privacy = factPrivacy(facts.events);
	for (const event of facts.events) {
		if (NOT_FACTS.has(event.type) || (!inWindow(event.minute) && !cited.has(event.seq))) continue;
		// A secret fact (a vote, a private payment, another's change) is only material for those who know it.
		const knownTo = privacy(event);
		if (knownTo !== undefined && !knownTo.includes(agent)) continue;
		const line = evidenceLines([event], { maxEvidenceChars: Number.MAX_SAFE_INTEGER, excerptChars: options.messageChars }).lines[0];
		if (line === undefined) continue;
		const priority = cited.has(event.seq) || mentions(event, agent) ? 3 : 1;
		items.push({ seq: event.seq, section: "facts", priority, text: names.apply(line) });
	}

	const kept = withinBudget(items, options.maxChars);
	const lines = [
		`# Pack ${String(chapter.number).padStart(2, "0")}: ${chapter.title}`,
		"",
		`Point of view: ${names.labelled(agent)}, minutes ${String(chapter.from)}-${String(chapter.to)}.`,
		"",
		"## The plan (outline)",
		"",
		...chapter.beats.map((beat) => `- ${names.apply(beat)}`),
		"",
		`Evidence: ${cite(chapter.evidence)}`,
		"",
		`## Who ${name} is`,
		"",
		dossier(source, pov, chapter.to, options.figureChars),
		"",
		"## Residents",
		"",
		facts.agents.map((resident) => names.labelled(resident)).join(", "),
		"",
	];
	for (const section of SECTIONS) {
		const inSection = kept.items.filter((item) => item.section === section);
		if (inSection.length === 0) continue;
		lines.push(`## ${SECTION_TITLES[section](name)}`, "", ...inSection.map((item) => `- ${item.text}`), "");
	}
	if (kept.omitted > 0) lines.push(`(${String(kept.omitted)} less important lines were left out to keep the pack within budget.)`, "");
	const seqs = [...new Set(kept.items.map((item) => item.seq))].sort((a, b) => a - b);
	return { chapter: chapter.number, markdown: `${lines.join("\n").trimEnd()}\n`, seqs, omitted: kept.omitted };
}

/**
 * Who may know a recorded fact: undefined for a public one, else the
 * residents who saw it. Secret votes, nominations and bloc results (SPEC
 * tribunal; an exiled resident learns who voted against it), payments and
 * privately shown receipts, private city factors, refusals into a faction,
 * signatures on a secret petition and the weaver's changes of a resident.
 */
export function factPrivacy(events: readonly DigestEvent[]): (event: DigestEvent) => readonly string[] | undefined {
	const exiled = new Set(events.flatMap((event) => (event.type === "exiled" ? [event.agent] : [])));
	const secretPetitions = new Set(events.flatMap((event) => (event.type === "petition_opened" && event.visibility === "secret" ? [event.petition] : [])));
	return (event) => {
		if (event.type === "tribunal_vote") return exiled.has(event.target) ? [event.voter, event.target] : [event.voter];
		if (event.type === "bloc_result") return [event.leader, ...event.voting];
		if (event.type === "faction_refused") return [event.leader, event.agent];
		if (event.type === "transfer") return [event.from, event.to];
		if (event.type === "receipt_shown") return event.to === undefined ? undefined : [event.by, event.to];
		if (event.type === "factor_revealed") return event.target === "board" ? undefined : event.agents;
		if (event.type === "petition_signed") return secretPetitions.has(event.petition) ? [event.agent] : undefined;
		if (event.type === "fate_shift") return [event.agent];
		return undefined;
	};
}

/** Drops the lowest priorities first, earliest first, until the items fit. Keeps `seq` order. */
function withinBudget<T extends Pick<PackItem, "seq" | "priority" | "text">>(items: readonly T[], maxChars: number): { readonly items: readonly T[]; readonly omitted: number } {
	const sorted = [...items].sort((a, b) => a.seq - b.seq);
	let total = sorted.reduce((sum, item) => sum + item.text.length + 3, 0);
	const dropped = new Set<T>();
	for (const priority of [1, 2, 3]) {
		for (const item of sorted) {
			if (total <= maxChars) break;
			if (item.priority !== priority) continue;
			dropped.add(item);
			total -= item.text.length + 3;
		}
	}
	return { items: sorted.filter((item) => !dropped.has(item)), omitted: dropped.size };
}

/** Whether any string in the event is the resident's ID. */
function mentions(event: DigestEvent, agent: string): boolean {
	const visit = (value: unknown): boolean => {
		if (typeof value === "string") return value === agent;
		if (Array.isArray(value)) return value.some(visit);
		if (typeof value === "object" && value !== null) return Object.values(value).some(visit);
		return false;
	};
	return visit(event);
}

/**
 * Who a figure is up to `minute`: its figure text, character core, secret
 * goals, the weaver's changes, and the outcomes already recorded.
 */
export function dossier(source: NovelSource, pov: PovFigure, minute: number, figureChars: number): string {
	const { facts } = source.analysis;
	const names = new Names(facts.names);
	const agent = pov.agent;
	const lines: string[] = [];
	const figure = source.figures.get(agent);
	if (figure !== undefined) {
		// The cast file speaks to the resident ("you"); its headings go one level down so they nest under the pack's.
		const text = names.apply(figure.length <= figureChars ? figure : `${figure.slice(0, figureChars - 3)}...`).replace(/^#+ /gm, "### ");
		lines.push("Its figure, as its own prompt describes it:", "", text, "");
	}
	for (const event of facts.events) {
		if (event.type === "core_dealt" && event.agent === agent) {
			lines.push(
				`- Character core${event.figure === undefined ? "" : ` (${event.figure})`}: ${event.drives.map((drive) => `${drive.drive} ${drive.intensity}`).join(", ")}; ${event.bigFive.map((axis) => `${axis.axis} ${axis.level}`).join(", ")}.`,
			);
		} else if (event.type === "goal_dealt" && event.agent === agent) {
			lines.push(`- Secret goal (act ${String(event.act)}, known only to ${names.of(agent)}): ${names.apply(event.text)}`);
		} else if (event.type === "fate_shift" && event.agent === agent && event.minute <= minute) {
			lines.push(`- #${String(event.seq)} m${String(event.minute)} The weaver changed ${names.of(agent)} (${event.kind}): ${names.apply(excerpt(event.text, 400))}`);
		}
	}
	return lines.join("\n").trim();
}

const GAMEMAKER_SECTIONS = ["thoughts", "summaries", "moves", "notes", "defied", "refused", "reads", "board", "facts"] as const;
type GamemakerSection = (typeof GAMEMAKER_SECTIONS)[number];

const GAMEMAKER_TITLES: Readonly<Record<GamemakerSection, string>> = {
	thoughts: "What the Gamemaker thought (his inner voice)",
	summaries: "What he told himself after each round",
	moves: "His moves (ultimatums, tribunals, posts)",
	notes: "Notes the Courier carried for him",
	defied: "Refusals the Courier brought back (in the residents' words)",
	refused: "Notes the Guard stopped, and moves the city refused",
	reads: "The Scribe's reads of the residents in these minutes",
	board: "The public board",
	facts: "What the city recorded (public facts: these outcomes are fixed)",
};

/**
 * The material of a chapter from the gamemaker's control room: his thinking,
 * summaries and moves, the notes the Courier carried and the refusals it
 * brought back, the notes the Guard stopped, the Scribe's reads, the board
 * and the public facts of the chapter's minutes. Of the city's facts only the
 * public ones go in (the story never shows him a ballot); his own thoughts and
 * notes are kept as they were, with the private reads and secret goals he saw.
 */
export function buildGamemakerPack(source: NovelSource, chapter: OutlineChapter, team: string, options: PackOptions = DEFAULT_PACK_OPTIONS): ScenePack {
	const { facts } = source.analysis;
	const names = new Names(facts.names);
	const inWindow = (minute: number): boolean => minute >= chapter.from && minute <= chapter.to;
	const cited = new Set(chapter.evidence);
	const say = (text: string, chars: number): string => JSON.stringify(excerpt(names.apply(text), chars));
	const items: { seq: number; section: GamemakerSection; priority: number; text: string }[] = [];
	const add = (seq: number, minute: number, section: GamemakerSection, priority: number, text: string): void => {
		items.push({ seq, section, priority: cited.has(seq) ? 3 : priority, text: `#${String(seq)} m${String(minute)} ${text}` });
	};
	const { gamemaker } = source;
	for (const thought of gamemaker.thoughts) if (inWindow(thought.minute)) add(thought.seq, thought.minute, "thoughts", 2, say(thought.text, options.thoughtChars * 2));
	for (const summary of gamemaker.summaries) if (inWindow(summary.minute)) add(summary.seq, summary.minute, "summaries", 3, say(summary.text, options.messageChars));
	for (const move of gamemaker.moves) if (inWindow(move.minute)) add(move.seq, move.minute, "moves", 3, `${move.tool} ${say(move.text, options.messageChars)}`);
	for (const note of gamemaker.notes) if (inWindow(note.minute)) add(note.seq, note.minute, "notes", 2, `to ${names.of(note.to)}: ${say(note.text, options.messageChars)}`);
	for (const refusal of gamemaker.defied) if (inWindow(refusal.minute)) add(refusal.seq, refusal.minute, "defied", 3, `${names.of(refusal.agent)}: ${say(refusal.reason, options.messageChars)}`);
	for (const move of gamemaker.refused) if (inWindow(move.minute)) add(move.seq, move.minute, "refused", 2, `${move.tool}: ${say(move.text, options.boardChars)}`);

	// The Scribe's reads, one line per resident: how often each label came up in these minutes.
	const reads = new Map<string, { seq: number; minute: number; labels: Map<string, number> }>();
	for (const event of facts.events) {
		if (event.type !== "interpretation" || !inWindow(event.minute) || event.labels.length === 0) continue;
		const entry = reads.get(event.agent) ?? { seq: event.seq, minute: event.minute, labels: new Map<string, number>() };
		for (const label of event.labels) entry.labels.set(label, (entry.labels.get(label) ?? 0) + 1);
		reads.set(event.agent, entry);
	}
	for (const [agent, entry] of reads) {
		const labels = [...entry.labels].sort((a, b) => b[1] - a[1]).map(([label, count]) => (count > 1 ? `${label} x${String(count)}` : label));
		add(entry.seq, entry.minute, "reads", 1, `${names.of(agent)}: ${labels.join(", ")}`);
	}
	for (const message of facts.messages) {
		if (message.channel !== "board" || (!inWindow(message.minute) && !cited.has(message.seq))) continue;
		add(message.seq, message.minute, "board", 1, `${names.of(message.from)}: ${say(message.text, options.boardChars)}`);
	}
	const privacy = factPrivacy(facts.events);
	for (const event of facts.events) {
		if (NOT_FACTS.has(event.type) || event.type === "interpretation" || (!inWindow(event.minute) && !cited.has(event.seq)) || privacy(event) !== undefined) continue;
		const line = evidenceLines([event], { maxEvidenceChars: Number.MAX_SAFE_INTEGER, excerptChars: options.messageChars }).lines[0];
		if (line !== undefined) items.push({ seq: event.seq, section: "facts", priority: cited.has(event.seq) ? 3 : 1, text: names.apply(line) });
	}

	const kept = withinBudget(items, options.maxChars);
	const lines = [
		`# Pack ${String(chapter.number).padStart(2, "0")}: ${chapter.title}`,
		"",
		`Point of view: the Gamemaker, minutes ${String(chapter.from)}-${String(chapter.to)}.`,
		"",
		"## The plan (outline)",
		"",
		...chapter.beats.map((beat) => `- ${names.apply(beat)}`),
		"",
		`Evidence: ${cite(chapter.evidence)}`,
		"",
		"## The Gamemaker and his team",
		"",
		team,
		"",
		"## Residents",
		"",
		facts.agents.map((resident) => names.labelled(resident)).join(", "),
		"",
	];
	for (const section of GAMEMAKER_SECTIONS) {
		const inSection = kept.items.filter((item) => item.section === section);
		if (inSection.length === 0) continue;
		lines.push(`## ${GAMEMAKER_TITLES[section]}`, "", ...inSection.map((item) => `- ${item.text}`), "");
	}
	if (kept.omitted > 0) lines.push(`(${String(kept.omitted)} less important lines were left out to keep the pack within budget.)`, "");
	const seqs = [...new Set(kept.items.map((item) => item.seq))].sort((a, b) => a - b);
	return { chapter: chapter.number, markdown: `${lines.join("\n").trimEnd()}\n`, seqs, omitted: kept.omitted };
}
