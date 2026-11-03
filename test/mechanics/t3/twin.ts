/**
 * The twin: the old engine's `World` (as it was recorded once before the engine went, step 18, item
 * 7b) and the new host with puzzles, progression and goals, driven by the same calls and the same minutes (docs/design/carve-round2-T3.md, "differential tests"). The
 * mechanics of the other teams are the stand-ins of `twin-standins.ts`. After any step the replies,
 * the event lines of the types the twin implements (in log order) and the state the snapshot keeps
 * can be compared.
 */
import { expect } from "vitest";
import { convertLegacySnapshot, legacyOwner, legacySink, parseSnapshot } from "@swarmtales/chronicle";
import { TOOL_NAMES, type AnyStory, type Host, type MechanicUse, type ToolName, type TurnTaker } from "@swarmtales/contracts";
import { createHost, defineCoreStory, defineMechanic, reply } from "@swarmtales/kernel";
import { goals } from "@swarmtales/mechanic-goals";
import { CoreMotivesOptions, motives } from "@swarmtales/mechanic-motives";
import { progression } from "@swarmtales/mechanic-progression";
import { puzzles } from "@swarmtales/mechanic-puzzles";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { goldenLine, standInsFor, type LegacyLine } from "@swarmtales/testkit";
import { goalsOptionsOf, progressionOptions, promptLookup } from "../progression/harness.ts";
import { puzzleOptions } from "../puzzles/harness.ts";
import { OldWorld, twinChannels, twinCoreMotives, twinExile, twinLedger, twinMarks, twinNames, twinReceipts } from "./twin-standins.ts";
import { RecordedTrace } from "../../helpers/old-engine.ts";

export interface TwinOptions {
	readonly story: AnyStory;
	readonly ids?: readonly string[];
	readonly seed?: number;
	readonly minutes?: number;
	readonly holdAfter?: number;
	/** More mechanics on the new host (probes). */
	readonly extra?: readonly MechanicUse[];
	/** Script tools the probes offer. */
	readonly scriptTools?: readonly string[];
	/** An old run snapshot (the parsed `snapshot-L7.json`) both sides resume from. */
	readonly resume?: unknown;
	/** The real core motives (T2) instead of the stand-in that reads the old world's: their `motive_dealt` lines are compared too. */
	readonly realMotives?: boolean;
}

/** The mechanics the twin loads; every other slice of a resumed snapshot gets an inert stand-in. */
const LOADED = ["ledger", "channels", "receipts", "marks", "names", "exile", "motives", "dummies", "puzzles", "progression", "goals"];

const T3_TOOLS: readonly string[] = ["getStatus", "activeTools", "getProblem", "submitSolution", "listAgents"];

/** The event types both sides write in the twin (the mechanics of T3 and the stand-ins' own lines). */
const BASE_COMPARED = ["fragments_dealt", "factors_dealt", "factor_revealed", "factor_burned", "level_contracted", "submission", "level_up", "tools_unlocked", "goal_dealt", "goal_resolved", "ledger_entry", "receipt_issued", "notice", "board_post"];

/**
 * The story as the old world plays it in the twin: without the tribunal, the seal, the whisperer,
 * the popularity vote and the holdout tribunal, which are other teams' mechanics and are not on the
 * new host (their notices, board posts, dynamic tools and task rules would only differ).
 */
function withoutOtherMechanics(story: AnyStory): AnyStory {
	const rest: { -readonly [K in keyof AnyStory]: AnyStory[K] } = { ...story };
	delete rest.tribunal;
	delete rest.seal;
	delete rest.whisperer;
	delete rest.popularity;
	delete rest.holdout;
	return rest;
}

export interface Pair {
	readonly old: string;
	readonly now: string;
}

/** A tool no T3 mechanic offers, so a story can grant it: its reply is empty. */
export function dummyTools(names: readonly ToolName[]) {
	return defineMechanic({ id: "dummies", summary: "Twin tools.", options: Type.Object({}), state: () => undefined, events: {}, prompts: { "gamemaker/tools/notify": [] } }, (kit) => ({
		tools: names.map((name) => kit.tool({ name, description: "gamemaker/tools/notify", parameters: Type.Object({}, { additionalProperties: true }), execute: () => reply("") })),
	}));
}

export class Twin {
	/** The old world beside the host, as the old engine answered it (recorded once, step 18, item 7b). */
	readonly world: OldWorld;
	readonly #oldSeen = new Map<string, readonly string[]>();
	readonly host: Host;
	readonly lines: LegacyLine[] = [];
	readonly story: AnyStory;
	readonly #compared: ReadonlySet<string>;
	readonly ids: readonly string[];
	#minute = 0;
	#next = 0;

	constructor(options: TwinOptions) {
		const { story } = options;
		this.story = story;
		this.#compared = new Set(options.realMotives === true ? [...BASE_COMPARED, "motive_dealt"] : BASE_COMPARED);
		this.ids = options.ids ?? ["A01", "A02", "A03", "A04", "A05", "A06"];
		const seed = options.seed ?? 7;
		const minutes = options.minutes ?? 30;
		const saved = options.resume === undefined ? undefined : parseSnapshot(options.resume);
		const converted = options.resume === undefined ? undefined : convertLegacySnapshot(options.resume, {}, "twin snapshot");
		if (converted !== undefined) {
			this.ids = converted.host.residents.ids;
			this.#next = converted.host.minute;
			// The old world restores at the file's minute (composeRun's clock), one before the host's next minute, where the host's `runResumed` phases run (L1).
			this.#minute = converted.host.minute - 1;
		}
		this.world = new OldWorld(new RecordedTrace(), story);
		const levelTools = new Set(story.levels.flatMap((level) => level.tools));
		const dummies = TOOL_NAMES.filter((name) => (levelTools.has(name) || name === "activeTools") && !T3_TOOLS.includes(name));
		const goalsOptions = goalsOptionsOf(withoutOtherMechanics(story));
		const progressionInput = { ...progressionOptions(story), ...(options.holdAfter === undefined ? {} : { holdAfter: options.holdAfter }) };
		const puzzlesInput = { ...puzzleOptions(story), ...(options.holdAfter === undefined ? {} : { holdAfter: options.holdAfter }) };
		const granted = TOOL_NAMES.filter((name) => levelTools.has(name) || name === "activeTools");
		const coreStory = defineCoreStory({
			id: converted?.host.story ?? story.id,
			seed,
			minutes,
			residents: [...this.ids],
			mechanics: [
				twinLedger(story.run.startPoints, saved?.world.ledger).with(),
				twinChannels(this.world, Math.max(0, ...(saved?.world.board.posts ?? []).map((post) => post.seq))).with(),
				twinReceipts(saved?.world.receipts).with(),
				twinMarks(this.world).with(),
				twinNames(this.world).with(),
				twinExile(this.world).with(),
				options.realMotives === true ? motives.with(Parse(CoreMotivesOptions, story.coreMotives)) : twinCoreMotives(this.world).with(),
				dummyTools(dummies).with(),
				puzzles.with(puzzlesInput),
				progression.with(progressionInput),
				...(goalsOptions === undefined ? [] : [goals.with(goalsOptions)]),
				...(options.extra ?? []),
				...(converted === undefined ? [] : standInsFor(converted.host, LOADED)),
			],
			grants: { resident: granted, script: [...(options.scriptTools ?? [])] },
			limits: { maxStepsPerMinute: 10_000 },
		});
		this.host = createHost({ story: coreStory, prompts: promptLookup(), ...(converted === undefined ? {} : { resume: { snapshot: converted.host, events: converted.events } }) });
		this.host.subscribe(legacySink((event) => this.lines.push(Object.fromEntries(Object.entries(event)))));
		if (converted === undefined) this.host.start();
	}

	get minute(): number {
		return this.#minute;
	}

	/** The minute the next `minuteWith` plays. */
	get nextMinute(): number {
		return this.#next;
	}

	/** Plays the next minute on both sides; `actions` runs inside it, after the minute's hooks. */
	async minuteWith(actions: () => Promise<void> = () => Promise.resolve()): Promise<void> {
		this.#minute = this.#next;
		this.#next += 1;
		// The old arena (`#nextMinute`) opens doors and ticks the city from the second minute on.
		if (this.#minute > 0) this.world.step(`minute ${String(this.#minute)}`);
		let ran = false;
		const agent: TurnTaker = async () => {
			if (ran) return;
			ran = true;
			await actions();
		};
		await this.host.playMinute(agent);
	}

	/** Plays `count` empty minutes. */
	async minutes(count: number): Promise<void> {
		for (let played = 0; played < count; played++) await this.minuteWith();
	}

	/** The same call on both sides. */
	async call(agent: string, tool: string, args: unknown): Promise<Pair> {
		if (!T3_TOOLS.includes(tool)) throw new Error(`the twin calls only the tools of T3, not ${tool}`);
		const result = this.#oldCall(agent, tool, args);
		// A resumed world keeps the names its residents chose; the twin's new side has no names mechanic, so ids stand for them.
		const old = this.ids.reduce((text, id) => {
			const name = this.world.nameOf(id);
			return name === undefined ? text : text.replaceAll(name, id);
		}, result.text);
		const outcome = await this.host.call(`resident:${agent}`, tool, args);
		const now = outcome.ok ? outcome.reply : outcome.detail === undefined ? outcome.code : `${outcome.code}: ${outcome.detail}`;
		expect(outcome.ok, `${agent} ${tool} ${JSON.stringify(args)}: ${old} / ${now}`).toBe(!result.isError);
		return { old, now };
	}

	/** The old tool's reply: its text and whether it was an error. */
	#oldCall(agent: string, tool: string, args: unknown): { readonly text: string; readonly isError: boolean } {
		return this.world.read(`call ${agent} ${tool} ${JSON.stringify(args)}`, Type.Object({ text: Type.String(), isError: Type.Boolean() }));
	}

	/** The same call on both sides, replies equal; returns the reply. */
	async same(agent: string, tool: string, args: unknown): Promise<string> {
		const pair = await this.call(agent, tool, args);
		expect(pair.now, `${agent} ${tool} ${JSON.stringify(args)}`).toBe(pair.old);
		return pair.old;
	}

	/** The old engine's solution for the resident on the level. */
	codeOf(agent: string, level: number): string {
		return this.world.codeOf(agent, level);
	}

	/** The old log's lines (as plain records) that `keep` keeps. */
	#oldLines(label: string): readonly string[] {
		// The trace holds only what was added since the last read of the same lines.
		const known = this.#oldSeen.get(label) ?? [];
		const added = this.world.read(`old log ${label} from ${String(known.length)}`, Type.Array(Type.String()));
		const lines = [...known, ...added];
		this.#oldSeen.set(label, lines);
		return lines;
	}

	/** Both logs, reduced to the compared types and the old line shape, in log order. */
	logs(): { readonly old: readonly string[]; readonly now: readonly string[] } {
		const old = this.#oldLines("compared");
		const now = this.lines.filter((line) => typeof line.type === "string" && this.#compared.has(line.type));
		return { old, now: now.map(bare) };
	}

	expectSameLog(): void {
		const { old, now } = this.logs();
		expect(now).toEqual(old);
	}

	/** The compared lines owned by one mechanic of T3, as golden lines. */
	ownedLines(): { readonly old: readonly string[]; readonly now: readonly string[] } {
		const owned = (line: LegacyLine): boolean => ["puzzles", "progression", "goals"].includes(legacyOwner(typeof line.type === "string" ? line.type : ""));
		const old = this.#oldLines("owned");
		return { old, now: this.lines.filter(owned).map((line) => goldenLine(line)) };
	}

	/** The slices T3 keeps against the old snapshot's fields. */
	expectSameState(): void {
		const snapshot = this.world.snapshot();
		const slices = this.host.snapshot().mechanics;
		const progression = slices.progression?.data;
		const field = (data: unknown, key: string): unknown => (typeof data === "object" && data !== null ? Reflect.get(data, key) : undefined);
		const competitors = field(progression, "competitors") ?? [];
		expect(JSON.stringify(competitors)).toBe(JSON.stringify(snapshot.competitors.map(({ agent, level, held, solved, wrongAttempts, extraTools }) => ({ agent, level, held, solved, wrongAttempts, extraTools }))));
		expect(field(progression, "door")).toEqual(snapshot.door);
		expect(field(progression, "doorReleased") ?? false).toEqual(snapshot.doorReleased ?? false);
		expect(field(progression, "actStarts")).toEqual(snapshot.actStarts);
		expect(field(progression, "endedActs")).toEqual(snapshot.endedActs);
		expect(field(progression, "offences")).toEqual(snapshot.offences);
		const puzzlesData = slices.puzzles?.data;
		expect(JSON.stringify(field(puzzlesData, "levels"))).toBe(JSON.stringify(snapshot.levels));
		expect(JSON.stringify(field(puzzlesData, "cityFactors"))).toBe(JSON.stringify(snapshot.cityFactors));
		expect(JSON.stringify(field(puzzlesData, "exclusions"))).toBe(JSON.stringify(snapshot.exclusions));
		if (snapshot.goals !== undefined) expect(JSON.stringify(slices.goals?.data)).toBe(JSON.stringify(snapshot.goals));
	}
}

function bare(line: LegacyLine): string {
	// The minute stays: a line written one minute late is a difference (round 3, must-fix 8).
	return JSON.stringify(Object.fromEntries(Object.entries(line).filter(([key]) => key !== "seq" && key !== "at")));
}
