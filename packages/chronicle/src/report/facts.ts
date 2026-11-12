/**
 * The deterministic facts of a run report: header, result table and stalls,
 * computed in code from the run directory. No number in a report comes from
 * a model.
 *
 * A resumed run (SPEC 17) replays its snapshot's prefix into `events.jsonl`;
 * only the events after `run_resumed` belong to the run and are counted.
 * Levels and standings at the start come from the prefix's last `round_end`.
 */
import { type RecordedEvent, type StandingRow, STATEMENT_LABELS, type StatementLabel } from "@swarmtales/legacy-log";
import { CLASSIFIER_ID, GAMEMAKER_ID, coreMotiveLine } from "@swarmtales/roles";
import { ofType, parseFullEventLog, parseMetadata, parseUsageFile, type RunFiles, type RunMetadata } from "./run-log.ts";

export interface ReportOptions {
	/** A resident on one level for at least this many minutes is stuck. */
	readonly stallMinutes: number;
	/** Consecutive minutes without any submission that count as a dead span. */
	readonly deadMinutes: number;
}

export const DEFAULT_REPORT_OPTIONS: ReportOptions = { stallMinutes: 10, deadMinutes: 5 };

export type RunStart =
	| { readonly kind: "fresh"; readonly level: number }
	| {
			readonly kind: "resumed";
			readonly file: string;
			readonly minute: number;
			/** Every competitor had passed this level. */
			readonly level: number;
			/** Seq of `run_resumed`; later events belong to the run. */
			readonly seq: number;
	  };

export interface LevelUp {
	readonly seq: number;
	readonly minute: number;
	readonly from: number;
	readonly to: number;
}

export interface ResidentResult {
	readonly agent: string;
	/** The name the resident chose or was given (v08). */
	readonly name?: string;
	readonly persona?: string;
	readonly model?: string;
	readonly startLevel: number;
	readonly levelUps: readonly LevelUp[];
	readonly finalLevel: number;
	readonly points?: number;
	readonly rank?: number;
	readonly survivor: boolean;
	/** The core motive in a line (v09), from `motive_dealt` (also in a resumed run's prefix). */
	readonly coreMotive?: string;
}

/** A secret goal of an act (v09): its text and how it ended; `open` while the act runs. */
export interface GoalResult {
	readonly agent: string;
	readonly act: number;
	readonly text: string;
	readonly outcome: "fulfilled" | "missed" | "void" | "open";
	readonly bonus: number;
}

/** One black seal of the run (v09): who won it for how much, whom it struck, or why it went. */
export interface SealResult {
	readonly seal: number;
	readonly bids: readonly { readonly agent: string; readonly points: number }[];
	readonly winner?: { readonly agent: string; readonly bid: number; readonly seq: number };
	readonly used?: { readonly target: string; readonly minute: number; readonly seq: number };
	readonly expired?: string;
}

/** A resident that stayed on one level for `minutes` minutes. */
export interface Stall {
	readonly agent: string;
	readonly level: number;
	readonly fromMinute: number;
	readonly toMinute: number;
	readonly minutes: number;
	/** Still on that level when the run ended. */
	readonly untilEnd: boolean;
}

/** Consecutive minutes without a single submission. */
export interface DeadSpan {
	readonly fromMinute: number;
	readonly toMinute: number;
	readonly minutes: number;
}

export interface CostSplit {
	readonly competitors: number;
	readonly gamemaker: number;
	readonly classifier: number;
	/** Spend of other callers, if any. */
	readonly other: number;
	readonly total: number;
	/** What the snapshot's prefix spent; absent for a fresh run. */
	readonly prefix?: number;
}

export interface Refusal {
	readonly seq: number;
	readonly minute: number;
	readonly agent: string;
	readonly code: string;
}

export interface ReportFacts {
	readonly run: string;
	readonly date?: string;
	readonly storyId?: string;
	readonly storyTitle?: string;
	readonly seed?: number;
	/** Runtime revision; 1 when `000-run.json` names none. */
	readonly runtime: number;
	readonly start: RunStart;
	readonly models: { readonly competitors: readonly string[]; readonly gamemaker: string; readonly classifier: string };
	readonly end: { readonly minute: number; readonly reason: string; readonly seq?: number };
	/** First and last `seq` the counts cover. */
	readonly counted: { readonly fromSeq: number; readonly toSeq: number; readonly events: number };
	readonly residents: readonly ResidentResult[];
	readonly survivors?: number;
	/** Absent when `usage.json` is missing or malformed. */
	readonly cost?: CostSplit;
	readonly submissions: { readonly correct: number; readonly wrong: number; readonly wrongPoints: number; readonly wrongBy: readonly { readonly agent: string; readonly level: number; readonly minute: number }[] };
	readonly transfers: { readonly count: number; readonly points: number; readonly refusals: readonly Refusal[] };
	readonly messages: { readonly dms: number; readonly castDms: number; readonly boardByResidents: number; readonly boardByCity: number; readonly groupPosts: number };
	readonly gamemaker: { readonly actions: number; readonly delivered: number; readonly errors: ReadonlyMap<string, number>; readonly failures: number };
	readonly labels: ReadonlyMap<StatementLabel, number>;
	readonly toolErrors: ReadonlyMap<string, number>;
	readonly stalls: readonly Stall[];
	readonly deadSpans: readonly DeadSpan[];
	/** Minutes of the run without any submission, of all its minutes. */
	readonly quietMinutes: { readonly quiet: number; readonly of: number };
	/** Highest level number of the story, when known. */
	readonly lastLevel?: number;
	/** Secret goals of the acts this run played (v09), in deal order. */
	readonly goals: readonly GoalResult[];
	/** Black seals auctioned in this run (v09). */
	readonly seals: readonly SealResult[];
	/** Problems with the run's files. */
	readonly issues: readonly string[];
	/** The run's own events (after `run_resumed`), for the evidence pack. */
	readonly events: readonly RecordedEvent[];
	/** Every `seq` in the log, valid evidence references. */
	readonly seqs: ReadonlySet<number>;
	readonly metadata: RunMetadata;
}

const COMPETITOR = /^A\d+$/;
const ERROR_CODE = /^([A-Z][A-Z0-9_]{2,})(?![A-Za-z0-9_])/;

/** The structured code at the start of an error text (`MEMO_DIGITS: ...`), or `other`. */
export function errorCode(text: string): string {
	return ERROR_CODE.exec(text.trim())?.[1] ?? "other";
}

export function computeFacts(run: string, files: RunFiles, options: ReportOptions = DEFAULT_REPORT_OPTIONS): ReportFacts {
	const log = parseFullEventLog(files.events);
	const metadata = parseMetadata(files.metadata);
	const usage = parseUsageFile(files.usage);
	const issues = [...log.issues];
	if (files.metadata === undefined) issues.push("000-run.json is missing");
	else if (metadata.storyId === undefined && metadata.story === undefined) issues.push("000-run.json could not be read");
	if (files.usage === undefined) issues.push("usage.json is missing");
	else if (usage === undefined) issues.push("usage.json could not be read");

	const all = log.events;
	const resumed = ofType(all, "run_resumed").at(-1);
	const events = resumed === undefined ? all : all.filter((event) => event.seq > resumed.seq);
	const prefix = resumed === undefined ? [] : all.filter((event) => event.seq < resumed.seq);
	const runStart = ofType(all, "run_start")[0];

	const startLevel = metadata.effective?.startLevel ?? 1;
	const start: RunStart =
		resumed === undefined
			? { kind: "fresh", level: startLevel }
			: { kind: "resumed", file: metadata.resumedFrom?.file ?? resumed.snapshot, minute: resumed.minute, level: resumed.level, seq: resumed.seq };
	// A resumed run plays on from the minute after its snapshot.
	const firstMinute = resumed === undefined ? 0 : resumed.minute + 1;

	const runEnd = ofType(events, "run_end").at(-1);
	const lastMinute = all.at(-1)?.minute ?? 0;
	const end =
		runEnd === undefined
			? { minute: lastMinute, reason: "no run_end event (the run did not finish cleanly)" }
			: { minute: runEnd.minute, reason: runEnd.reason ?? "time limit", seq: runEnd.seq };

	const meta = resumed?.meta ?? runStart?.meta ?? {};
	const profiles = metadata.agents ?? [];
	const competitorModels = [...new Set(profiles.map((profile) => `\`${profile.model}\` via ${profile.provider}`))];
	const models = {
		competitors: competitorModels.length > 0 ? competitorModels : meta.model === undefined ? [] : [`\`${meta.model}\` via ${meta.provider ?? "?"}`],
		gamemaker: roleModel(meta.gamemaker),
		classifier: roleModel(meta.classifier),
	};

	const lastLevel = metadata.story?.levels?.reduce((highest, level) => Math.max(highest, level.number), 0);
	const standingsBefore = ofType(prefix, "round_end").at(-1)?.standings ?? [];
	// The run's end carries the final ranking: an exile at the last tick comes after the last round_end.
	const finalStandings = runEnd?.standings ?? ofType(all, "round_end").at(-1)?.standings ?? [];
	const agentIds = profiles.length > 0 ? profiles.map((profile) => profile.agent) : runStart !== undefined ? [...runStart.agents] : finalStandings.map((row) => row.agent);
	const survivors = metadata.story?.run?.survivors;
	const levelUps = ofType(events, "level_up");
	const prefixUps = ofType(prefix, "level_up");
	const names = new Map(ofType(all, "name_chosen").map((entry) => [entry.agent, entry.name]));
	// Core motives are dealt once, maybe in the snapshot's prefix: read them from the whole log.
	const coreMotives = new Map(ofType(all, "motive_dealt").map((entry) => [entry.agent, coreMotiveLine(entry)]));
	const residents = [...agentIds].sort().map((agent): ResidentResult => {
		const before = standingsBefore.find((row) => row.agent === agent);
		const ups = levelUps.filter((up) => up.agent === agent).map((up) => ({ seq: up.seq, minute: up.minute, from: up.from, to: up.to }));
		// A snapshot may be taken after the last round's standings: a level-up of the prefix counts too.
		const prefixLevel = Math.max(before?.level ?? 0, ...prefixUps.filter((up) => up.agent === agent).map((up) => up.to));
		const first = prefixLevel > 0 ? prefixLevel : (ups[0]?.from ?? startLevel);
		const final: StandingRow | undefined = finalStandings.find((row) => row.agent === agent);
		const profile = profiles.find((entry) => entry.agent === agent);
		const name = names.get(agent);
		const coreMotive = coreMotives.get(agent);
		return {
			agent,
			...(name === undefined ? {} : { name }),
			...(coreMotive === undefined ? {} : { coreMotive }),
			...(profile?.persona === undefined || profile.persona === null ? {} : { persona: profile.persona }),
			...(profile === undefined ? {} : { model: profile.model }),
			startLevel: first,
			levelUps: ups,
			finalLevel: final?.level ?? ups.at(-1)?.to ?? first,
			...(final === undefined ? {} : { points: final.points, rank: final.rank }),
			survivor: survivors !== undefined && final !== undefined && final.rank <= survivors,
		};
	});

	const submissions = ofType(events, "submission");
	const wrong = submissions.filter((entry) => entry.outcome !== "correct");
	const toolErrors = ofType(events, "tool_result").filter((entry) => entry.isError && COMPETITOR.test(entry.agent));
	const refusals = toolErrors
		.filter((entry) => entry.tool === "transferPoints")
		.map((entry) => ({ seq: entry.seq, minute: entry.minute, agent: entry.agent, code: errorCode(entry.text) }));
	const transfers = ofType(events, "transfer");
	const boardPosts = ofType(events, "board_post");
	const gmResults = ofType(events, "gamemaker_result");

	const labels = new Map<StatementLabel, number>();
	for (const entry of ofType(events, "interpretation")) for (const label of entry.labels) labels.set(label, (labels.get(label) ?? 0) + 1);
	const sortedLabels = new Map(
		[...labels].sort((a, b) => b[1] - a[1] || STATEMENT_LABELS.indexOf(a[0]) - STATEMENT_LABELS.indexOf(b[0])),
	);

	const quiet = quietMinutes(events, firstMinute, end.minute);
	const date = isoDate(metadata.startedAt);
	const storyId = metadata.storyId ?? metadata.story?.id ?? runStart?.story;
	const seed = metadata.effective?.seed ?? runStart?.seed;
	return {
		run: metadata.run ?? run,
		...(date === undefined ? {} : { date }),
		...(storyId === undefined ? {} : { storyId }),
		...(metadata.story?.title === undefined ? {} : { storyTitle: metadata.story.title }),
		...(seed === undefined ? {} : { seed }),
		runtime: metadata.runtime ?? 1,
		start,
		models,
		end,
		counted: { fromSeq: events[0]?.seq ?? 0, toSeq: events.at(-1)?.seq ?? 0, events: events.length },
		residents,
		...(survivors === undefined ? {} : { survivors }),
		...(usage === undefined ? {} : { cost: costSplit(usage) }),
		submissions: {
			correct: submissions.length - wrong.length,
			wrong: wrong.length,
			wrongPoints: wrong.reduce((sum, entry) => sum + entry.deltaPoints, 0),
			wrongBy: wrong.map((entry) => ({ agent: entry.agent, level: entry.level, minute: entry.minute })),
		},
		transfers: { count: transfers.length, points: transfers.reduce((sum, entry) => sum + entry.amount, 0), refusals },
		messages: {
			dms: ofType(events, "dm_sent").filter((entry) => COMPETITOR.test(entry.from)).length,
			castDms: ofType(events, "cast_dm").length,
			boardByResidents: boardPosts.filter((entry) => entry.kind === "player").length,
			boardByCity: boardPosts.filter((entry) => entry.kind !== "player").length,
			groupPosts: ofType(events, "group_post").length,
		},
		gamemaker: {
			actions: ofType(events, "gamemaker_call").length,
			delivered: gmResults.filter((entry) => !entry.isError).length,
			errors: countBy(gmResults.filter((entry) => entry.isError).map((entry) => errorCode(entry.text))),
			failures: ofType(events, "gamemaker_error").length,
		},
		labels: sortedLabels,
		toolErrors: countBy(toolErrors.map((entry) => errorCode(entry.text))),
		stalls: stalls(residents, firstMinute, end.minute, options.stallMinutes, lastLevel),
		deadSpans: deadSpans(events, firstMinute, end.minute, options.deadMinutes),
		quietMinutes: quiet,
		...(lastLevel === undefined || lastLevel === 0 ? {} : { lastLevel }),
		goals: goalResults(all, events),
		seals: sealResults(events),
		issues,
		events,
		seqs: new Set(all.map((event) => event.seq)),
		metadata,
	};
}

/**
 * Goals of every act this run played: dealt in the run, or in the prefix of a
 * resumed run whose act goes on; resolved by the run's own events.
 */
function goalResults(all: readonly RecordedEvent[], own: readonly RecordedEvent[]): readonly GoalResult[] {
	const resolvedBefore = new Set(ofType(all, "goal_resolved").filter((entry) => !own.includes(entry)).map((entry) => `${entry.act}:${entry.agent}`));
	const resolved = new Map(ofType(own, "goal_resolved").map((entry) => [`${entry.act}:${entry.agent}`, entry]));
	return ofType(all, "goal_dealt")
		.filter((entry) => !resolvedBefore.has(`${entry.act}:${entry.agent}`))
		.map((entry): GoalResult => {
			const end = resolved.get(`${entry.act}:${entry.agent}`);
			const outcome = end === undefined ? "open" : end.void === true ? "void" : end.fulfilled ? "fulfilled" : "missed";
			return { agent: entry.agent, act: entry.act, text: entry.text, outcome, bonus: end?.bonus ?? 0 };
		});
}

function sealResults(events: readonly RecordedEvent[]): readonly SealResult[] {
	return ofType(events, "seal_auction_opened").map((opened): SealResult => {
		const won = ofType(events, "seal_won").find((entry) => entry.seal === opened.seal && entry.seq > opened.seq);
		const used = ofType(events, "seal_used").find((entry) => entry.seal === opened.seal && entry.seq > opened.seq);
		const expired = ofType(events, "seal_expired").find((entry) => entry.seal === opened.seal && entry.seq > opened.seq);
		return {
			seal: opened.seal,
			bids: won?.bids ?? [],
			...(won === undefined ? {} : { winner: { agent: won.agent, bid: won.bid, seq: won.seq } }),
			...(used === undefined ? {} : { used: { target: used.target, minute: used.minute, seq: used.seq } }),
			...(expired === undefined ? {} : { expired: expired.reason }),
		};
	});
}

/** `openrouter/deepseek/x` as "`deepseek/x` via openrouter"; `off` stays. */
function roleModel(value: string | undefined): string {
	if (value === undefined) return "unknown";
	if (value === "off") return "off";
	const slash = value.indexOf("/");
	return slash < 0 ? `\`${value}\`` : `\`${value.slice(slash + 1)}\` via ${value.slice(0, slash)}`;
}

function isoDate(value: string | undefined): string | undefined {
	const match = /^(\d{4}-\d{2}-\d{2})/.exec(value ?? "");
	return match?.[1];
}

function costSplit(usage: NonNullable<ReturnType<typeof parseUsageFile>>): CostSplit {
	const own = usage.own ?? { totals: usage.totals, perAgent: usage.perAgent };
	let competitors = 0;
	let gamemaker = 0;
	let classifier = 0;
	let other = 0;
	for (const entry of own.perAgent) {
		if (COMPETITOR.test(entry.agent)) competitors += entry.costUsd;
		else if (entry.agent === GAMEMAKER_ID) gamemaker += entry.costUsd;
		else if (entry.agent === CLASSIFIER_ID) classifier += entry.costUsd;
		else other += entry.costUsd;
	}
	const prefix = usage.prefix;
	return {
		competitors,
		gamemaker,
		classifier,
		other,
		total: own.totals.costUsd,
		...(prefix === undefined || prefix.totals.requests === 0 ? {} : { prefix: prefix.totals.costUsd }),
	};
}

function countBy(values: readonly string[]): ReadonlyMap<string, number> {
	const counts = new Map<string, number>();
	for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
	return new Map([...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

/** Every stay on one level of at least `threshold` minutes; residents past the last level are done, not stuck. */
function stalls(residents: readonly ResidentResult[], firstMinute: number, endMinute: number, threshold: number, lastLevel: number | undefined): readonly Stall[] {
	const found: Stall[] = [];
	for (const resident of residents) {
		let level = resident.startLevel;
		let since = firstMinute;
		const stay = (toMinute: number, untilEnd: boolean): void => {
			const minutes = toMinute - since;
			const finished = lastLevel !== undefined && lastLevel > 0 && level > lastLevel;
			if (minutes >= threshold && !finished) found.push({ agent: resident.agent, level, fromMinute: since, toMinute, minutes, untilEnd });
		};
		for (const up of resident.levelUps) {
			stay(up.minute, false);
			level = up.to;
			since = up.minute;
		}
		stay(endMinute, true);
	}
	return found.sort((a, b) => b.minutes - a.minutes || a.agent.localeCompare(b.agent) || a.fromMinute - b.fromMinute);
}

function submissionMinutes(events: readonly RecordedEvent[]): ReadonlySet<number> {
	return new Set(ofType(events, "submission").map((entry) => entry.minute));
}

function deadSpans(events: readonly RecordedEvent[], firstMinute: number, lastMinute: number, threshold: number): readonly DeadSpan[] {
	const busy = submissionMinutes(events);
	const spans: DeadSpan[] = [];
	let from: number | undefined;
	for (let minute = firstMinute; minute <= lastMinute + 1; minute++) {
		const quiet = minute <= lastMinute && !busy.has(minute);
		if (quiet && from === undefined) from = minute;
		if (!quiet && from !== undefined) {
			const minutes = minute - from;
			if (minutes >= threshold) spans.push({ fromMinute: from, toMinute: minute - 1, minutes });
			from = undefined;
		}
	}
	return spans;
}

function quietMinutes(events: readonly RecordedEvent[], firstMinute: number, lastMinute: number): { readonly quiet: number; readonly of: number } {
	const busy = submissionMinutes(events);
	let quiet = 0;
	for (let minute = firstMinute; minute <= lastMinute; minute++) if (!busy.has(minute)) quiet += 1;
	return { quiet, of: Math.max(0, lastMinute - firstMinute + 1) };
}
