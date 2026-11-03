/**
 * The differential harness of team T4a: one scenario (points, the tribunal spec, flags per minute
 * and the residents' and the gamemaker's actions per minute) driven through the old engine's
 * `Tribunal` (packages/engine, its ports as the old world wired them, `#onExiled` burning the
 * balance) and through the exile and the tribunal on the new host with stand-ins. Each side
 * yields the same streams: effects (posts, notices, bookings, groups), events, the outcome of every
 * action (reply or refusal code and detail, `TOOL_LOCKED` by the old `enabledTools`), the status
 * parts of every turn and who left the city.
 */
import { readFileSync } from "node:fs";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { convertLegacySnapshot } from "@swarmtales/chronicle";
import { competitorIds, createHost, type HostOptions } from "@swarmtales/kernel";
import type { LegacyWorldSnapshot } from "@swarmtales/chronicle";
import { replayOld } from "../../../helpers/old-engine.ts";
import type { TribunalSpec } from "@swarmtales/contracts";
import type { Host, Turn } from "@swarmtales/contracts";
import { ExileApi, TribunalApi, TribunalViewApi } from "@swarmtales/mechanic-shared";
import { exile } from "@swarmtales/mechanic-exile";
import { tribunal } from "@swarmtales/mechanic-tribunal";
import { TestCity, standIns } from "../../exile/support/city.ts";
import { runProbe, storyOptions } from "../../exile/support/host.ts";

/** The 6-agent Act I checkpoint, the file the `restore` scenarios are written into. */
const BASE = new URL("../../../../examples/cityofkeys-act1-06a-04/snapshot-L7.json", import.meta.url);

export type Action =
	| { readonly vote: readonly [string, string] }
	| { readonly nominate: readonly [string, string] }
	| { readonly join: readonly [string, string] }
	| { readonly refuse: readonly [string, string] }
	| { readonly pay: readonly [string, string, number] }
	| { readonly schedule: { readonly minute: number; readonly count: number; readonly factions?: number; readonly reason: string } }
	| { readonly strike: string }
	| { readonly points: readonly [string, number] };

export interface Scenario {
	readonly points: readonly number[];
	readonly spec: TribunalSpec;
	readonly minutes?: number;
	readonly survivors?: number;
	readonly progress?: readonly number[];
	/** The minute the act begins (0 when omitted). */
	readonly actStart?: number;
	/** Flags set before the tick of a minute; `levels` sets residents' levels (8 until set). */
	readonly flags?: Readonly<Record<number, { readonly doorShut?: boolean; readonly passed?: boolean; readonly levels?: Readonly<Record<string, number>> }>>;
	/** The gamemaker's roles (story `gamemaker.roles`); a director from level 1 when omitted. */
	readonly roles?: readonly { readonly fromLevel: number; readonly role: string }[];
	/** Actions after the tick of a minute, in order. */
	readonly actions?: Readonly<Record<number, readonly Action[]>>;
	/** The last minute played. */
	readonly until: number;
	/** An old `TribunalSnapshot` both sides start from: the old `restore`, the converter's version-0 slices on the new host. */
	readonly restore?: NonNullable<LegacyWorldSnapshot["tribunal"]>;
	/** Minutes after whose actions both sides report what the gamemaker's view and the other mechanics read. */
	readonly views?: readonly number[];
}

export interface Streams {
	readonly effects: readonly string[];
	readonly events: readonly string[];
	readonly outcomes: readonly string[];
	readonly status: readonly string[];
	readonly gone: readonly string[];
	readonly views: readonly string[];
	/** The acts ended (old world.ts: `#endAct(spec.act ?? startLevel)` once the tribunal ended). */
	readonly acts: readonly number[];
}

function rolesOf(scenario: Scenario): readonly { readonly fromLevel: number; readonly role: string }[] {
	return scenario.roles ?? [{ fromLevel: 1, role: "director" }];
}

function lastMinute(scenario: Scenario): number {
	return Math.min(scenario.until, (scenario.minutes ?? 60) - 1);
}

const EFFECTS = ["post", "notice", "burn", "mint", "group", "groupRemoved", "groupPost"];

function outcomeOf(minute: number, label: string, result: { readonly ok: true; readonly reply: string } | { readonly ok: false; readonly code: string; readonly detail?: string }): string {
	return `${String(minute)} ${label} → ${result.ok ? result.reply : `${result.code}: ${result.detail ?? ""}`}`;
}

function labelOf(action: Action): string {
	return JSON.stringify(action);
}

/** The old side: `Tribunal` over ports, the old tool replies and the old `enabledTools` and `tribunalParts`. */
const Lines = Type.Array(Type.String());
const StreamsSchema = Type.Object({ effects: Lines, events: Lines, outcomes: Lines, status: Lines, gone: Lines, views: Lines, acts: Type.Array(Type.Number()) });

/** The scenario through the old `Tribunal`, as it was recorded once before the engine went (step 18, item 7b; `test/fixtures/old-engine/`). */
export function runOld(scenario: Scenario): Streams {
	return replayOld(scenario, StreamsSchema);
}

export const T4A_EVENTS = [
	"tribunal_announced",
	"tribunal_scheduled",
	"tribunal_cancelled",
	"tribunal_called",
	"tribunal_opened",
	"faction_nominated",
	"faction_leaders",
	"faction_applied",
	"faction_refused",
	"factions_formed",
	"bloc_result",
	"tribunal_vote",
	"tribunal_result",
	"exile_gate",
	"ransom_paid",
	"ransomed",
	"exiled",
];

/** The new side's host: stand-ins, the exile and the tribunal with the scenario's spec. */
export function newHost(scenario: Scenario): { readonly host: Host; readonly city: TestCity } {
	const ids = competitorIds(scenario.points.length);
	const city = new TestCity(ids, scenario.points);
	city.bounds = { ...city.bounds, survivors: scenario.survivors ?? 2 };
	city.actStart = scenario.actStart ?? 0;
	ids.forEach((id, index) => {
		const progress = scenario.progress?.[index];
		if (progress !== undefined && progress >= 0) city.lastProgress.set(id, progress);
	});
	const host = createHost(storyOf(scenario, ids, city));
	host.start();
	return { host: scenario.restore === undefined ? host : resumed(host, scenario, storyOf(scenario, ids, city)), city };
}

function storyOf(scenario: Scenario, ids: readonly string[], city: TestCity): HostOptions {
	return storyOptions({
		residents: ids,
		minutes: scenario.minutes ?? 60,
		mechanics: [...standIns(city), exile.with(), tribunal.with({ ...scenario.spec, gamemakerRoles: rolesOf(scenario) })],
		residentTools: ["vote", "nominate", "join", "refuse", "payRansom", "lastWill"],
		gamemakerTools: ["scheduleTribunal"],
		turns: { passes: 1, blockSize: ids.length, order: (view) => view.residents },
	});
}

const OldFile = Type.Object({ world: Type.Object({}, { additionalProperties: true }) }, { additionalProperties: true });

/**
 * The new host resumed from the old state through `convertLegacySnapshot`: the scenario's old
 * tribunal state goes into an old run file (the 6-agent Act I checkpoint, whose residents are the
 * scenario's), the converter splits it into the exile's and the tribunal's version-0 slices and
 * suspends the exiled, and the new host takes those slices and suspensions over its own.
 */
function resumed(host: Host, scenario: Scenario, options: HostOptions): Host {
	const old = scenario.restore;
	if (old === undefined) return host;
	const file = Parse(OldFile, JSON.parse(readFileSync(BASE, "utf8")));
	const converted = convertLegacySnapshot({ ...file, world: { ...file.world, tribunal: old } }, {}, "the Act I checkpoint with the scenario's tribunal");
	const { exile: exileSlice, tribunal: tribunalSlice } = converted.host.mechanics;
	const snapshot = host.snapshot();
	const mechanics = { ...snapshot.mechanics, ...(exileSlice === undefined ? {} : { exile: exileSlice }), ...(tribunalSlice === undefined ? {} : { tribunal: tribunalSlice }) };
	const events = host.log.all().map((event): unknown => JSON.parse(JSON.stringify(event)));
	return createHost({ ...options, resume: { snapshot: { ...snapshot, mechanics, residents: { ...snapshot.residents, suspensions: converted.host.residents.suspensions } }, events } });
}

async function actNew(host: Host, city: TestCity, minute: number, action: Action, outcomes: string[]): Promise<void> {
	const label = labelOf(action);
	if ("points" in action) {
		city.points.set(action.points[0], action.points[1]);
		return;
	}
	if ("strike" in action) {
		const resident = action.strike;
		await runProbe(host, (ctx) => ctx.tryCall(ExileApi, "strike", { resident, by: "seal" }));
		return;
	}
	if ("schedule" in action) {
		outcomes.push(outcomeOf(minute, label, await host.call("gamemaker", "scheduleTribunal", action.schedule)));
		return;
	}
	const [actor, tool, params] =
		"vote" in action
			? [action.vote[0], "vote", { target: action.vote[1] }]
			: "nominate" in action
				? [action.nominate[0], "nominate", { agent: action.nominate[1] }]
				: "join" in action
					? [action.join[0], "join", { leader: action.join[1] }]
					: "refuse" in action
						? [action.refuse[0], "refuse", { agent: action.refuse[1] }]
						: [action.pay[0], "payRansom", { target: action.pay[1], amount: action.pay[2] }];
	outcomes.push(outcomeOf(minute, label, await host.call(`resident:${actor}`, tool, params)));
}

/** The new side: the same flags and actions inside each minute, after the minute's hooks. */
export async function runNew(scenario: Scenario): Promise<Streams> {
	const { host, city } = newHost(scenario);
	const outcomes: string[] = [];
	const status: string[] = [];
	const views: string[] = [];
	for (let minute = 0; minute <= lastMinute(scenario); minute++) {
		const flags = scenario.flags?.[minute];
		if (flags?.doorShut !== undefined) city.doorShut = flags.doorShut;
		if (flags?.passed !== undefined) city.passed = flags.passed ? ["A01"] : [];
		for (const [agent, level] of Object.entries(flags?.levels ?? {})) city.levels.set(agent, level);
		let acted = false;
		await host.playMinute(async (turn: Turn) => {
			status.push(
				`${String(minute)} ${turn.resident}: ${turn.inputs
					.filter((note) => note.kind === "status")
					.map((note) => note.text)
					.join(" | ")}`,
			);
			if (acted) return;
			acted = true;
			for (const action of scenario.actions?.[minute] ?? []) await actNew(host, city, minute, action, outcomes);
			if (scenario.views?.includes(minute) === true) views.push(await viewOf(host, minute));
		});
	}
	const events = host.log
		.all()
		.filter((event) => T4A_EVENTS.includes(event.type) && (event.source === "exile" || event.source === "tribunal"))
		.map((event) => JSON.stringify({ type: event.type, ...(typeof event.payload === "object" && event.payload !== null ? event.payload : {}) }));
	const gone = host.log
		.all()
		.filter((event) => event.type === "exiled")
		.map((event) => (typeof event.payload === "object" && event.payload !== null && "agent" in event.payload ? String(event.payload.agent) : ""));
	const effects = city.effects.filter((entry) => EFFECTS.includes(entry.kind)).map((entry) => `${entry.kind} ${JSON.stringify(entry.data)}`);
	return { effects, events, outcomes, status: sortedStatus(status, competitorIds(scenario.points.length)), gone, views, acts: city.of("endAct").map(Number) };
}

/** What the view and the other mechanics read of the tribunal now, through its APIs. */
function viewOf(host: Host, minute: number): Promise<string> {
	const facts = host.facts();
	return runProbe(host, (ctx) => {
		const window = ctx.tryCall(TribunalViewApi, "schedulingWindow", {});
		const risk = ctx.tryCall(TribunalViewApi, "atRisk", {});
		return JSON.stringify({
			minute,
			window,
			cityCall: ctx.tryCall(TribunalViewApi, "cityCall", {}),
			atRisk: risk,
			stop: ctx.tryCall(TribunalViewApi, "stop", {}),
			missing: ctx.tryCall(TribunalApi, "missing", {}),
			inSession: ctx.tryCall(TribunalApi, "inSession", {}),
			prices: ctx.tryCall(TribunalApi, "ransomPrices", {}),
			facts: { stop: facts["tribunal.stop"], section: facts["tribunal.section"] },
		});
	});
}

/** Turns come in the residents' order already; this keeps the old side's order (minute, then story order) explicit. */
function sortedStatus(lines: readonly string[], ids: readonly string[]): readonly string[] {
	const key = (line: string): number => Number(line.split(" ")[0]) * 1000 + ids.indexOf(line.split(" ")[1]?.replace(":", "") ?? "");
	return [...lines].sort((a, b) => key(a) - key(b));
}

