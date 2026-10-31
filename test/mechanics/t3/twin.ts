/**
 * The twin: the old engine's `World` and the new host with puzzles, progression and goals, driven by
 * the same calls and the same minutes (docs/design/carve-round2-T3.md, "differential tests"). The
 * mechanics of the other teams are the stand-ins of `twin-standins.ts`. After any step the replies,
 * the event lines of the types the twin implements (in log order) and the state the snapshot keeps
 * can be compared.
 */
import { expect } from "vitest";
import { EventBus, MemorySink, activeTools, getProblem, getStatus, listAgents, submitSolution, World, type ArenaTool } from "@swarmtales/engine";
import { convertLegacySnapshot, legacyOwner, legacySink, parseSnapshot } from "@swarmtales/chronicle";
import { TOOL_NAMES, type AnyStory, type Host, type MechanicUse, type ToolName, type TurnTaker } from "@swarmtales/contracts";
import { createHost, defineCoreStory, defineMechanic, reply } from "@swarmtales/kernel";
import { goals } from "@swarmtales/mechanic-goals";
import { progression } from "@swarmtales/mechanic-progression";
import { puzzles } from "@swarmtales/mechanic-puzzles";
import { Type } from "typebox";
import { goldenLine, standInsFor, type LegacyLine } from "@swarmtales/testkit";
import { goalsOptionsOf, progressionOptions, promptLookup } from "../progression/harness.ts";
import { puzzleOptions } from "../puzzles/harness.ts";
import { twinChannels, twinCores, twinExile, twinLedger, twinMarks, twinNames, twinReceipts } from "./twin-standins.ts";

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
}

/** The mechanics the twin loads; every other slice of a resumed snapshot gets an inert stand-in. */
const LOADED = ["ledger", "channels", "receipts", "marks", "names", "exile", "motives", "dummies", "puzzles", "progression", "goals"];

const OLD_TOOLS: Readonly<Record<string, ArenaTool>> = { getStatus, activeTools, getProblem, submitSolution, listAgents };

/** The event types both sides write in the twin (the mechanics of T3 and the stand-ins' own lines). */
const COMPARED = new Set(["fragments_dealt", "factors_dealt", "factor_revealed", "factor_burned", "level_contracted", "submission", "level_up", "tools_unlocked", "goal_dealt", "goal_resolved", "ledger_entry", "receipt_issued", "notice", "board_post"]);

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
function dummyTools(names: readonly ToolName[]) {
	return defineMechanic({ id: "dummies", summary: "Twin tools.", options: Type.Object({}), state: () => undefined, events: {}, prompts: { "gamemaker/tools/notify": [] } }, (kit) => ({
		tools: names.map((name) => kit.tool({ name, description: "gamemaker/tools/notify", parameters: Type.Object({}, { additionalProperties: true }), execute: () => reply("") })),
	}));
}

export class Twin {
	readonly world: World;
	readonly oldLog = new MemorySink();
	readonly host: Host;
	readonly lines: LegacyLine[] = [];
	readonly story: AnyStory;
	readonly ids: readonly string[];
	#minute = 0;
	#next = 0;

	constructor(options: TwinOptions) {
		const { story } = options;
		this.story = story;
		this.ids = options.ids ?? ["A01", "A02", "A03", "A04", "A05", "A06"];
		const seed = options.seed ?? 7;
		const minutes = options.minutes ?? 30;
		const bus = new EventBus([this.oldLog], () => this.#minute);
		const saved = options.resume === undefined ? undefined : parseSnapshot(options.resume);
		const converted = options.resume === undefined ? undefined : convertLegacySnapshot(options.resume, {}, "twin snapshot");
		if (converted !== undefined) {
			this.ids = converted.host.residents.ids;
			this.#next = converted.host.minute;
		}
		this.world = new World({
			story: withoutOtherMechanics(story),
			competitors: this.ids,
			seed,
			minutes,
			bus,
			minute: () => this.#minute,
			...(options.holdAfter === undefined ? {} : { holdAfter: options.holdAfter }),
			...(saved === undefined ? {} : { restore: saved.world }),
			names: false,
		});
		const levelTools = new Set(story.levels.flatMap((level) => level.tools));
		const dummies = TOOL_NAMES.filter((name) => (levelTools.has(name) || name === "activeTools") && OLD_TOOLS[name] === undefined);
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
				twinCores(this.world).with(),
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
		if (this.#minute > 0) {
			this.world.openDoor();
			this.world.startMinute(this.#minute);
			this.world.openDoor();
		}
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
		const oldTool = OLD_TOOLS[tool];
		if (oldTool === undefined) throw new Error(`the twin calls only the tools of T3, not ${tool}`);
		const result = await oldTool.bind({ self: agent, world: this.world }).execute("twin", args);
		const first = result.content[0];
		// A resumed world keeps the names its residents chose; the twin's new side has no names mechanic, so ids stand for them.
		const old = this.ids.reduce((text, id) => {
			const name = this.world.nameOf(id);
			return name === undefined ? text : text.replaceAll(name, id);
		}, first?.type === "text" ? first.text : "");
		const outcome = await this.host.call(`resident:${agent}`, tool, args);
		const now = outcome.ok ? outcome.reply : outcome.detail === undefined ? outcome.code : `${outcome.code}: ${outcome.detail}`;
		expect(outcome.ok, `${agent} ${tool} ${JSON.stringify(args)}: ${old} / ${now}`).toBe(result.isError !== true);
		return { old, now };
	}

	/** The same call on both sides, replies equal; returns the reply. */
	async same(agent: string, tool: string, args: unknown): Promise<string> {
		const pair = await this.call(agent, tool, args);
		expect(pair.now, `${agent} ${tool} ${JSON.stringify(args)}`).toBe(pair.old);
		return pair.old;
	}

	/** The old engine's solution for the resident on the level. */
	codeOf(agent: string, level: number): string {
		return this.world.inspect.codeOf(agent, level);
	}

	/** Both logs, reduced to the compared types and the old line shape, in log order. */
	logs(): { readonly old: readonly string[]; readonly now: readonly string[] } {
		const old = this.oldLog.events.map((event) => Object.fromEntries(Object.entries(event))).filter((line) => typeof line.type === "string" && COMPARED.has(line.type));
		const now = this.lines.filter((line) => typeof line.type === "string" && COMPARED.has(line.type));
		return { old: old.map(bare), now: now.map(bare) };
	}

	expectSameLog(): void {
		const { old, now } = this.logs();
		expect(now).toEqual(old);
	}

	/** The compared lines owned by one mechanic of T3, as golden lines. */
	ownedLines(): { readonly old: readonly string[]; readonly now: readonly string[] } {
		const owned = (line: LegacyLine): boolean => ["puzzles", "progression", "goals"].includes(legacyOwner(typeof line.type === "string" ? line.type : ""));
		const old = this.oldLog.events.map((event) => Object.fromEntries(Object.entries(event))).filter(owned);
		return { old: old.map((line) => goldenLine(line)), now: this.lines.filter(owned).map((line) => goldenLine(line)) };
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
	return JSON.stringify(Object.fromEntries(Object.entries(line).filter(([key]) => key !== "seq" && key !== "minute" && key !== "at")));
}
