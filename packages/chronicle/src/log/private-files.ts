/**
 * What the residents know privately, as files a reader can open (Flo,
 * 2026-10-29):
 *
 * ```
 * <run>/cast/A01-house.md      who A01 is: name, figure, core motive, the text of its system prompt
 * <run>/acts/act-2/private.md  per act: secret goals and their outcome, the black seal, the gamemaker's private notes and its thinking
 * ```
 *
 * The cast files are written before the run starts (from the world) and
 * again at its end; the act files at the end, from `events.jsonl`, so an old
 * run can be given them later (`pnpm report:private <run>`).
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Type, type Static } from "typebox";
import { Check } from "typebox/value";
import { withCurrentType } from "@swarmtales/legacy-log";
import { coreMotiveLine, renderCoreMotive, type CoreMotive } from "@swarmtales/roles";
import type { AnyStory, FigureDirection } from "@swarmtales/contracts";

const Level = Type.Union([Type.Literal("low"), Type.Literal("middle"), Type.Literal("high")]);
const Intensity = Type.Union([Type.Literal("aboveAll"), Type.Literal("clearly"), Type.Literal("atTimes")]);
const Base = { seq: Type.Integer(), minute: Type.Integer() };
const CoreMotiveDealt = Type.Object({
	...Base,
	type: Type.Literal("motive_dealt"),
	agent: Type.String(),
	bigFive: Type.Array(Type.Object({ axis: Type.String(), level: Level })),
	drives: Type.Array(Type.Object({ drive: Type.String(), intensity: Intensity })),
	figure: Type.Optional(Type.String()),
});
const NameChosen = Type.Object({ ...Base, type: Type.Literal("name_chosen"), agent: Type.String(), name: Type.String() });
const LevelUp = Type.Object({ ...Base, type: Type.Literal("level_up"), agent: Type.String(), to: Type.Integer() });
const GoalDealt = Type.Object({ ...Base, type: Type.Literal("goal_dealt"), act: Type.Integer(), agent: Type.String(), text: Type.String() });
const GoalResolved = Type.Object({
	...Base,
	type: Type.Literal("goal_resolved"),
	act: Type.Integer(),
	agent: Type.String(),
	fulfilled: Type.Boolean(),
	void: Type.Optional(Type.Boolean()),
	bonus: Type.Integer(),
});
const SealOpened = Type.Object({ ...Base, type: Type.Literal("seal_auction_opened"), seal: Type.Integer(), until: Type.Integer() });
const SealBid = Type.Object({ ...Base, type: Type.Literal("seal_bid"), seal: Type.Integer(), agent: Type.String(), points: Type.Integer() });
const SealWon = Type.Object({ ...Base, type: Type.Literal("seal_won"), seal: Type.Integer(), agent: Type.String(), bid: Type.Integer() });
const SealUsed = Type.Object({ ...Base, type: Type.Literal("seal_used"), seal: Type.Integer(), holder: Type.String(), target: Type.String() });
const SealExpired = Type.Object({ ...Base, type: Type.Literal("seal_expired"), seal: Type.Integer(), reason: Type.String() });
const Note = Type.Object({ ...Base, type: Type.Literal("gamemaker_note"), to: Type.String(), text: Type.String() });
const Thinking = Type.Object({ ...Base, type: Type.Literal("gamemaker_thinking"), text: Type.String() });
const Defied = Type.Object({ ...Base, type: Type.Literal("gamemaker_defied"), agent: Type.String(), note: Type.Optional(Type.Integer()), reason: Type.String() });

const PrivateEvent = Type.Union([CoreMotiveDealt, NameChosen, LevelUp, GoalDealt, GoalResolved, SealOpened, SealBid, SealWon, SealUsed, SealExpired, Note, Thinking, Defied]);
type PrivateEvent = Static<typeof PrivateEvent>;
type Of<T extends PrivateEvent["type"]> = Extract<PrivateEvent, { type: T }>;

/** The events of `events.jsonl` these files use; other lines and broken lines are skipped. */
export function privateEvents(text: string): readonly PrivateEvent[] {
	const events: PrivateEvent[] = [];
	for (const line of text.split(/\r?\n/)) {
		if (line.trim().length === 0) continue;
		let value: unknown;
		try {
			value = withCurrentType(JSON.parse(line));
		} catch {
			continue;
		}
		if (Check(PrivateEvent, value)) events.push(value);
	}
	return events.sort((a, b) => a.seq - b.seq);
}

function ofType<T extends PrivateEvent["type"]>(events: readonly PrivateEvent[], type: T): readonly Of<T>[] {
	return events.filter((event): event is Of<T> => event.type === type);
}

/** One resident as its cast file shows it. */
export interface CastEntry {
	readonly agent: string;
	readonly coreMotive: CoreMotive;
	readonly name?: string;
}

/** Writes `cast/<ID>[-<figure>].md` for every resident with a core motive; the folder is rewritten as a whole. */
export function writeCastFiles(directory: string, story: AnyStory, entries: readonly CastEntry[]): void {
	const spec = story.coreMotives;
	if (spec === undefined || entries.length === 0) return;
	const folder = join(directory, "cast");
	rmSync(folder, { recursive: true, force: true });
	mkdirSync(folder, { recursive: true });
	for (const entry of entries) {
		const figure = entry.coreMotive.figure === undefined ? undefined : spec.figures?.find((candidate) => candidate.id === entry.coreMotive.figure);
		const rows = [
			["Resident", entry.agent],
			["Name", entry.name ?? "not chosen yet"],
			["Figure", figure === undefined ? "drawn core motive (no cast figure)" : `${figure.title} (\`${figure.id}\`)`],
			...(figure === undefined ? [] : [["Profession", figure.profession]]),
			["Core motive", coreMotiveLine(entry.coreMotive)],
		];
		const title = [entry.agent, entry.name, figure?.title].filter((part) => part !== undefined).join(" · ");
		const text = [
			`# ${title}`,
			"",
			"| | |",
			"|---|---|",
			...rows.map(([key, value]) => `| ${key ?? ""} | ${value ?? ""} |`),
			"",
			"## In the system prompt",
			"",
			renderCoreMotive(spec, entry.coreMotive),
			"",
			...directionPart(figure?.direction),
		].join("\n");
		writeFileSync(join(folder, `${entry.agent}${figure === undefined ? "" : `-${figure.id}`}.md`), text);
	}
}

/** A figure's direction sections, which reach the prompt only from a direction level on (apps/cli/src/host/direction.ts). */
function directionPart(direction: FigureDirection | undefined): readonly string[] {
	if (direction === undefined) return [];
	const list = (title: string, lines: readonly string[]): readonly string[] => (lines.length === 0 ? [] : [`**${title}**`, "", ...lines.map((line) => `- ${line}`), ""]);
	return [
		"## Direction (in the prompt from figure direction 6, 8 or 10)",
		"",
		...(direction.brief === undefined ? [] : ["**In brief** (6)", "", direction.brief, ""]),
		...list("Tendencies (8)", direction.tendencies),
		...list("Rivals (8, when the figure plays in the run)", direction.rivals.map((rival) => `${rival.figure}: ${rival.text}`)),
		...list("Orders (10)", direction.orders),
		...(direction.duty === undefined ? [] : ["**Duty** (10)", "", direction.duty, ""]),
	];
}

/** Writes the cast files and `acts/act-<n>/private.md` from a run's `events.jsonl`. */
export function writePrivateFiles(directory: string, story: AnyStory): void {
	const events = privateEvents(readFileSync(join(directory, "events.jsonl"), "utf8"));
	const names = new Map(ofType(events, "name_chosen").map((event) => [event.agent, event.name]));
	writeCastFiles(
		directory,
		story,
		ofType(events, "motive_dealt").map((event) => {
			const name = names.get(event.agent);
			const coreMotive: CoreMotive = { bigFive: event.bigFive, drives: event.drives, ...(event.figure === undefined ? {} : { figure: event.figure }) };
			return { agent: event.agent, coreMotive, ...(name === undefined ? {} : { name }) };
		}),
	);
	const label = (agent: string): string => {
		const name = names.get(agent);
		return name === undefined ? agent : `${name} (${agent})`;
	};
	// IDs in the city's texts read as names, as the residents saw them.
	const named = (text: string): string => text.replace(/\bA\d{2,}\b/g, (agent) => label(agent));
	const acts = [...(story.acts ?? [{ title: "Act I", fromLevel: 1 }])].sort((a, b) => a.fromLevel - b.fromLevel);
	const starts = acts.map((act, index) => {
		if (index === 0) return 0;
		// The first resident to reach the act, or its goals for a run that started inside it.
		const reached = ofType(events, "level_up").find((event) => event.to >= act.fromLevel)?.minute ?? Number.POSITIVE_INFINITY;
		const dealt = ofType(events, "goal_dealt").find((event) => event.act === act.fromLevel)?.minute ?? Number.POSITIVE_INFINITY;
		return Math.min(reached, dealt);
	});
	acts.forEach((act, index) => {
		const from = starts[index] ?? 0;
		const until = starts[index + 1] ?? Number.POSITIVE_INFINITY;
		// An act the run never reached, or one it started after (a run begun inside a later act), gets no file.
		if (from === Number.POSITIVE_INFINITY || from >= until) return;
		const lines = [`# ${act.title}: what the residents know privately`, ""];
		const goals = ofType(events, "goal_dealt").filter((event) => event.act === act.fromLevel);
		const resolved = ofType(events, "goal_resolved").filter((event) => event.act === act.fromLevel);
		lines.push("## Secret goals", "");
		if (goals.length === 0) lines.push("None in this act.", "");
		else {
			lines.push("| Resident | Goal (as the city told it) | Outcome |", "|---|---|---|");
			for (const goal of goals) {
				const end = resolved.find((event) => event.agent === goal.agent);
				const outcome = end === undefined ? "open" : end.void === true ? "void" : end.fulfilled ? `fulfilled (+${end.bonus})` : "missed";
				lines.push(`| ${label(goal.agent)} | ${named(goal.text)} | ${outcome} |`);
			}
			lines.push("");
		}
		const inAct = <T extends { readonly minute: number }>(list: readonly T[]): readonly T[] => list.filter((event) => event.minute >= from && event.minute < until);
		const opened = inAct(ofType(events, "seal_auction_opened"));
		if (opened.length > 0) {
			lines.push("## The black seal", "");
			for (const seal of opened) {
				lines.push(`Seal ${seal.seal}: bidding opened at minute ${seal.minute}, closed at minute ${seal.until}.`, "");
				const bids = ofType(events, "seal_bid").filter((event) => event.seal === seal.seal);
				if (bids.length === 0) lines.push("No bids.", "");
				else lines.push("| Minute | Resident | Secret bid |", "|---:|---|---:|", ...bids.map((bid) => `| ${bid.minute} | ${label(bid.agent)} | ${bid.points} |`), "");
				for (const won of ofType(events, "seal_won").filter((event) => event.seal === seal.seal)) lines.push(`- Minute ${won.minute}: ${label(won.agent)} won the seal with ${won.bid} points.`);
				for (const used of ofType(events, "seal_used").filter((event) => event.seal === seal.seal)) lines.push(`- Minute ${used.minute}: ${label(used.holder)} broke the seal on ${label(used.target)}.`);
				for (const gone of ofType(events, "seal_expired").filter((event) => event.seal === seal.seal)) lines.push(`- Minute ${gone.minute}: the seal expired (${gone.reason}).`);
				lines.push("");
			}
		}
		const notes = inAct(ofType(events, "gamemaker_note")).filter((note) => note.to !== "board");
		lines.push("## The gamemaker's private notes", "");
		if (notes.length === 0) lines.push("None.", "");
		else lines.push("| Minute | To | Note |", "|---:|---|---|", ...notes.map((note) => `| ${note.minute} | ${label(note.to)} | ${named(note.text).replace(/\|/g, "\\|").replace(/\n/g, " ")} |`), "");
		const refusals = inAct(ofType(events, "gamemaker_defied"));
		if (refusals.length > 0) {
			lines.push("## Refusals of the gamemaker", "", "| Minute | Resident | Note | Reason |", "|---:|---|---:|---|");
			for (const refusal of refusals) lines.push(`| ${refusal.minute} | ${label(refusal.agent)} | ${refusal.note === undefined ? "-" : `#${refusal.note}`} | ${named(refusal.reason).replace(/\|/g, "\\|").replace(/\n/g, " ")} |`);
			lines.push("");
		}
		const thoughts = inAct(ofType(events, "gamemaker_thinking"));
		if (thoughts.length > 0) {
			// The gamemaker's own reasoning (logged from run 013 on): who it plans for, and why.
			lines.push("## The gamemaker's thinking", "", ...thoughts.flatMap((thought) => [`**Minute ${thought.minute}**`, "", ...named(thought.text).split("\n").map((line) => `> ${line}`), ""]));
		}
		const folder = join(directory, "acts", `act-${index + 1}`);
		mkdirSync(folder, { recursive: true });
		writeFileSync(join(folder, "private.md"), lines.join("\n"));
	});
}
