/**
 * The differential harness of team T4a: one scenario (points, the tribunal spec, flags per minute
 * and the residents' and the gamemaker's actions per minute) driven through the old engine's
 * `Tribunal` (packages/engine, its ports as the old world wired them, `#onExiled` burning the
 * balance) and through the exile and the tribunal on the new host with stand-ins. Each side
 * yields the same streams: effects (posts, notices, bookings, groups), events, the outcome of every
 * action (reply or refusal code and detail, `TOOL_LOCKED` by the old `enabledTools`), the status
 * parts of every turn and who left the city.
 */
import { competitorIds, createHost, type HostOptions } from "@swarmtales/kernel";
import { Tribunal, type TribunalEvent, type TribunalSnapshot } from "@swarmtales/engine";
import { render } from "@swarmtales/prompts";
import type { TribunalSpec } from "@swarmtales/contracts";
import type { Host, Turn } from "@swarmtales/contracts";
import { ExileApi, TribunalApi, TribunalViewApi } from "@swarmtales/mechanic-shared";
import { exile } from "@swarmtales/mechanic-exile";
import { tribunal } from "@swarmtales/mechanic-tribunal";
import { TestCity, standIns } from "../../exile/support/city.ts";
import { runProbe, storyOptions } from "../../exile/support/host.ts";

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
	readonly restore?: TribunalSnapshot;
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

/** Old `roleOn` (gamemaker.ts:285). */
function roleOn(scenario: Scenario, level: number): string | undefined {
	return rolesOf(scenario)
		.filter((entry) => entry.fromLevel <= level)
		.at(-1)?.role;
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
export function runOld(scenario: Scenario): Streams {
	const ids = competitorIds(scenario.points.length);
	const balances = new Map(ids.map((id, index) => [id, scenario.points[index] ?? 0]));
	const effects: string[] = [];
	const events: TribunalEvent[] = [];
	const outcomes: string[] = [];
	const status: string[] = [];
	const gone: string[] = [];
	const views: string[] = [];
	const acts: number[] = [];
	const flags = { doorShut: false, passed: false };
	let groups = 0;
	const record = (kind: string, data: unknown) => effects.push(`${kind} ${JSON.stringify(data)}`);
	const court = new Tribunal({
		spec: scenario.spec,
		minutes: scenario.minutes ?? 60,
		seed: 7,
		ids,
		survivors: scenario.survivors ?? 2,
		points: (agent) => balances.get(agent) ?? 0,
		lastProgress: (agent) => scenario.progress?.[ids.indexOf(agent)] ?? -1,
		passed: () => flags.passed,
		doorShut: () => flags.doorShut,
		actStart: () => scenario.actStart ?? 0,
		post: (text) => record("post", text),
		notify: (agent, text) => record("notice", { agent, text }),
		burn: (agent, amount, reason) => {
			record("burn", { agent, amount, reason });
			balances.set(agent, (balances.get(agent) ?? 0) - amount);
		},
		grant: (agent, amount, reason) => {
			record("mint", { agent, amount, reason });
			balances.set(agent, (balances.get(agent) ?? 0) + amount);
		},
		createGroup: (name, members) => {
			groups += 1;
			const id = `G${String(groups)}`;
			record("group", { id, name, members });
			return id;
		},
		removeGroup: (group) => record("groupRemoved", group),
		postGroup: (group, text) => record("groupPost", { group, text }),
		emit: (event) => events.push(event),
		onExiled: (agent) => {
			// The old world's `#onExiled`: the points left are gone (pieces, goals and the deal are the world-level tests').
			gone.push(agent);
			const balance = balances.get(agent) ?? 0;
			if (balance > 0) {
				record("burn", { agent, amount: balance, reason: `exiled ${agent}` });
				balances.set(agent, 0);
			}
		},
	});
	if (scenario.restore !== undefined) court.restore(scenario.restore);
	const enabled = (agent: string, tool: string): boolean => {
		const standing = court.standing(agent);
		if (standing.kind === "exiled") return false;
		if (tool === "payRansom") return court.gates().some((gate) => gate.ransomable);
		if (standing.kind === "gate") return false;
		if (tool === "vote") return court.canVote(agent);
		const phase = court.draftPhase(agent);
		if (tool === "nominate") return phase?.kind === "nominate";
		if (tool === "join") return phase?.kind === "join" && !phase.leads;
		return phase?.kind === "join" && phase.leads;
	};
	const reply = <T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: string; readonly detail?: string }, text: (value: T) => string) =>
		result.ok ? { ok: true as const, reply: text(result.value) } : { ok: false as const, code: result.error, ...(result.detail === undefined ? {} : { detail: result.detail }) };
	const locked = { ok: false as const, code: "TOOL_LOCKED", detail: render("replies/locked", {}) };
	const levels = new Map<string, number>();
	let offer: { readonly minute: number; readonly open: boolean } | undefined;
	const act = (minute: number, action: Action): void => {
		const label = labelOf(action);
		if ("points" in action) {
			balances.set(action.points[0], action.points[1]);
			return;
		}
		if ("strike" in action) {
			court.strike(action.strike);
			return;
		}
		if ("schedule" in action) {
			// The old gamemaker's look (gamemaker.ts:213, `#mayScheduleTribunal`): the tool is offered or not when the look begins.
			if (offer?.minute !== minute) offer = { minute, open: court.schedulingWindow().open && ids.some((agent) => court.standing(agent).kind === "alive" && roleOn(scenario, levels.get(agent) ?? 8) === "director") };
			if (!offer.open) {
				outcomes.push(outcomeOf(minute, label, locked));
				return;
			}
			const { minute: opens, count, factions, reason } = action.schedule;
			const planned = court.schedule(opens, count, factions, reason);
			outcomes.push(
				outcomeOf(
					minute,
					label,
					reply(planned, (plan) => render("gamemaker/replies/tribunal-planned", { tribunal: plan.tribunal, calledAt: plan.calledAt, opens: plan.opens, count: plan.count }) + (plan.factions >= 2 ? `, ${render("gamemaker/replies/tribunal-factions", { factions: plan.factions })}` : "")),
				),
			);
			return;
		}
		const [tool, agent] = "vote" in action ? ["vote", action.vote[0]] : "nominate" in action ? ["nominate", action.nominate[0]] : "join" in action ? ["join", action.join[0]] : "refuse" in action ? ["refuse", action.refuse[0]] : ["payRansom", action.pay[0]];
		if (!enabled(agent, tool)) {
			outcomes.push(outcomeOf(minute, label, locked));
			return;
		}
		if ("vote" in action) outcomes.push(outcomeOf(minute, label, reply(court.vote(agent, action.vote[1]), (target) => render("replies/vote-recorded", { target }))));
		if ("nominate" in action) {
			const result = court.nominate(agent, action.nominate[1]);
			const phase = court.draftPhase(agent);
			const until = phase?.kind === "nominate" ? ` · ${render("replies/nominate-until", { until: phase.until })}` : "";
			outcomes.push(outcomeOf(minute, label, reply(result, (named) => `${render("replies/nominate-recorded", { agent: named })}${until}`)));
		}
		if ("join" in action) {
			const result = court.join(agent, action.join[1]);
			const phase = court.draftPhase(agent);
			const until = phase?.kind === "join" ? ` ${render("replies/join-until", { until: phase.until })}` : "";
			outcomes.push(outcomeOf(minute, label, reply(result, (leader) => `${render("replies/join-applied", { leader })}${until}`)));
		}
		if ("refuse" in action) outcomes.push(outcomeOf(minute, label, reply(court.refuse(agent, action.refuse[1]), (named) => render("replies/refuse-done", { agent: named }))));
		if ("pay" in action) {
			const [, target, amount] = action.pay;
			const result = ids.includes(target) ? court.payRansom(agent, target, amount) : { ok: false as const, error: "UNKNOWN_AGENT", detail: target };
			outcomes.push(
				outcomeOf(minute, label, reply(result, (paid) => (paid.freed ? render("replies/ransom-covered", { paid: paid.paid, target }) : render("replies/ransom-paid", { covered: paid.covered, target, price: paid.price, selfPrice: paid.selfPrice })))),
			);
		}
	};
	// The run's minutes end it: the last minute played is `minutes - 1`.
	for (let minute = 0; minute <= lastMinute(scenario); minute++) {
		const { levels: changed, ...set } = scenario.flags?.[minute] ?? {};
		Object.assign(flags, set);
		for (const [agent, level] of Object.entries(changed ?? {})) levels.set(agent, level);
		court.tick(minute);
		if (court.ended && acts.length === 0) acts.push(scenario.spec.act ?? 8);
		// The old turn inputs: the status parts of every resident still in the city (turn-input.ts `tribunalParts`).
		for (const agent of ids) {
			const standing = court.standing(agent);
			if (standing.kind === "exiled") continue;
			status.push(`${String(minute)} ${agent}: ${oldParts(court, agent).join(" | ")}`);
		}
		for (const action of scenario.actions?.[minute] ?? []) act(minute, action);
		if (scenario.views?.includes(minute) === true) {
			views.push(
				JSON.stringify({
					minute,
					window: court.schedulingWindow(),
					cityCall: court.cityCall() ?? null,
					atRisk: court.atRisk() ?? null,
					stop: { endReason: court.endReason ?? null, busy: court.busy, pursuing: court.pursuing },
					missing: court.missing,
					inSession: court.session !== undefined,
					prices: court.ransomPrices(),
				}),
			);
		}
	}
	return { effects, events: events.map((event) => JSON.stringify(event)), outcomes, status, gone, views, acts };
}

function oldParts(court: Tribunal, agent: string): readonly string[] {
	const standing = court.standing(agent);
	if (standing.kind === "gate") return [render("competitor/status/gate", { until: standing.until })];
	const session = court.session;
	if (session !== undefined) {
		if (session.accused.includes(agent)) return [render("competitor/status/accused", { until: session.until })];
		return court.canVote(agent) ? [render("competitor/status/tribunal-vote", { until: session.until })] : [];
	}
	const phase = court.draftPhase(agent);
	if (phase === undefined) return [];
	if (phase.kind === "nominate") {
		const nominated = phase.nominee === undefined ? "" : ` ${render("competitor/status/draft-nominated", { nominee: phase.nominee })}`;
		return [render("competitor/status/draft-nominate", { until: phase.until, nominated })];
	}
	if (phase.leads) return [render("competitor/status/draft-leads", { applicants: phase.applicants.length === 0 ? "none" : phase.applicants.join(", "), until: phase.until })];
	const leaders = court.leaders.filter((leader) => !phase.refusedBy.includes(leader));
	if (phase.leader !== undefined) return [render("competitor/status/draft-applied", { leader: phase.leader, until: phase.until })];
	return [leaders.length === 0 ? render("competitor/status/draft-refused", {}) : render("competitor/status/draft-join", { leaders: leaders.join(", "), until: phase.until })];
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

/**
 * The new host resumed from the old state the way `convertLegacySnapshot` hands it over: the
 * tribunal's `gates`, `exiled` and `ransomed` as the exile's version-0 slice, the rest as the
 * tribunal's, and the exiled suspended by `exile`.
 */
function resumed(host: Host, scenario: Scenario, options: HostOptions): Host {
	const old = scenario.restore;
	if (old === undefined) return host;
	const { gates, exiled, ransomed, ...rest } = old;
	const snapshot = host.snapshot();
	const mechanics = { ...snapshot.mechanics, exile: { version: 0, data: { tribunal: { gates, exiled, ransomed } } }, tribunal: { version: 0, data: { tribunal: rest } } };
	const suspensions = Object.fromEntries(exiled.map((id) => [id, ["exile"]]));
	const events = host.log.all().map((event): unknown => JSON.parse(JSON.stringify(event)));
	return createHost({ ...options, resume: { snapshot: { ...snapshot, mechanics, residents: { ...snapshot.residents, suspensions } }, events } });
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
		});
	});
}

/** Turns come in the residents' order already; this keeps the old side's order (minute, then story order) explicit. */
function sortedStatus(lines: readonly string[], ids: readonly string[]): readonly string[] {
	const key = (line: string): number => Number(line.split(" ")[0]) * 1000 + ids.indexOf(line.split(" ")[1]?.replace(":", "") ?? "");
	return [...lines].sort((a, b) => key(a) - key(b));
}

