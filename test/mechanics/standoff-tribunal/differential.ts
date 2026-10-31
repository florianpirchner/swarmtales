/**
 * The differential harness of the holdout tribunal (team T4b): one scripted scenario on the old
 * `HoldoutTribunal` (packages/engine, read only) with the ports of world.ts:735-760 over a
 * `FragmentModel`, the old `#onStruck`, `enabledTools`, `holdoutParts`, the residents' and the
 * gamemaker's tools; and the same scenario on the new host with `standoff-tribunal` and stand-ins
 * over the same model. Both record the events (with their minute), posts, notices, notes, strikes,
 * replies, every resident's status part each minute and the DM cap exemptions.
 */
import { HoldoutTribunal, type HoldoutSnapshot } from "@swarmtales/engine";
import { renderTemplate, rngFor } from "@swarmtales/kernel";
import { render, text } from "@swarmtales/prompts";
import type { Host, ToolOutcome, TurnTaker } from "@swarmtales/contracts";
import { StandoffTribunalApi } from "@swarmtales/mechanic-shared";
import { standoffTribunal } from "@swarmtales/mechanic-standoff-tribunal";
import { probe, runProbe } from "../standoff/support/probe.ts";
import { ownLines, startHost, type TestStory } from "../standoff/support/host.ts";
import type { FragmentModel } from "./model.ts";
import { HOLDOUT_RULE } from "./rule.ts";
import { holdoutStandIns, type Recorder } from "./stand-ins.ts";

export type Action =
	| { readonly kind: "give"; readonly to: string; readonly holder: string; readonly door: number }
	| { readonly kind: "pass"; readonly agent: string }
	| { readonly kind: "vote"; readonly agent: string; readonly yes: boolean }
	| { readonly kind: "call"; readonly accused: readonly string[]; readonly reason: string }
	| { readonly kind: "drawLot"; readonly candidates: readonly string[] }
	| { readonly kind: "announce"; readonly text: string }
	| { readonly kind: "permaDeath"; readonly agent: string; readonly reason: string };

export interface Scenario {
	readonly residents: readonly string[];
	readonly model: () => FragmentModel;
	readonly minutes: number;
	readonly steps: Readonly<Record<number, readonly Action[]>>;
}

export interface HoldoutRecord {
	readonly events: readonly string[];
	readonly posts: readonly string[];
	readonly notices: readonly string[];
	readonly notes: readonly string[];
	readonly strikes: readonly string[];
	readonly replies: readonly string[];
	readonly status: readonly string[];
	readonly exempt: readonly string[];
}

export const SEED = 7;
const AUTHOR = "COURIER";

function failure(result: { readonly error: string; readonly detail?: string }): string {
	return `${result.error}: ${result.detail ?? ""}`.trim();
}

/** The old `holdoutParts` (turn-input.ts:54-69) over the old tribunal. */
function oldParts(court: HoldoutTribunal, model: FragmentModel, agent: string): readonly string[] {
	const session = court.session;
	if (session === undefined || model.exiled.has(agent)) return [];
	const accused = session.accused === agent ? "you" : session.accused;
	if (session.stage === "grace" || session.stage === "vote") {
		const owed = session.accused === agent ? ` · ${render("competitor/status/holdout-owed", { door: session.door, lacking: court.lackingNow().join(", ") })}` : "";
		const until = session.until;
		if (session.stage === "grace") return [render("competitor/status/holdout-grace", { accused, until, owed })];
		if (session.accused === agent) return [render("competitor/status/holdout-accused", { vote: session.vote, maxVotes: session.maxVotes, until, owed })];
		const ballot = court.ballotOf(agent);
		const cast = ballot === undefined ? text("competitor/status/holdout-not-voted") : render("competitor/status/holdout-ballot", { ballot: ballot ? "yes" : "no" });
		return [render("competitor/status/holdout-voter", { accused, vote: session.vote, maxVotes: session.maxVotes, until, cast })];
	}
	return [render("competitor/status/holdout-strike", { accused })];
}

const exemptions = (scenario: Scenario, minute: number, exempt: (from: string, to: string) => boolean): readonly string[] =>
	scenario.residents.flatMap((from) => scenario.residents.filter((to) => to !== from && exempt(from, to)).map((to) => `${String(minute)} ${from}>${to}`));

export function runOld(scenario: Scenario, options: { readonly restore?: HoldoutSnapshot; readonly from?: number; readonly until?: number } = {}) {
	const { from = 0, until = scenario.minutes } = options;
	const model = scenario.model();
	let minute = 0;
	const record: { readonly [K in keyof HoldoutRecord]: string[] } = { events: [], posts: [], notices: [], notes: [], strikes: [], replies: [], status: [], exempt: [] };
	const notify = (agent: string, author: string, body: string) => record.notices.push(`${agent} ${author} ${body}`);
	const post = (author: string, body: string) => {
		model.messages += 1;
		record.posts.push(`${author} ${body}`);
	};
	const court: HoldoutTribunal = new HoldoutTribunal({
		spec: HOLDOUT_RULE,
		seed: SEED,
		minute: () => minute,
		alive: () => model.alive(),
		// world.ts `#lackingFacts` and `#presentAtDoors`.
		blockers: () =>
			model.openDoors().flatMap((door) =>
				model.alive().flatMap((holder) => {
					const lacking = model.lacking(door, holder);
					return lacking.length === 0 ? [] : [{ door, blocker: holder, lacking, passed: model.hasPassed(holder, door) }];
				}),
			),
		present: () => model.openDoors().flatMap((door) => model.alive().filter((agent) => model.levelOf(agent) >= door).map((agent) => ({ door, agent }))),
		lacking: (door, holder) => model.lacking(door, holder),
		label: (agent) => agent,
		post,
		notify,
		emit: (event) => {
			const { type, ...payload } = event;
			record.events.push(JSON.stringify({ type, ...payload, minute }));
		},
		// world.ts `#onStruck`.
		struck: (agent) => {
			record.strikes.push(`${agent} holdout`);
			model.exiled.add(agent);
			for (const resident of model.alive()) {
				const level = model.levelOf(resident);
				if (!model.doors.has(level) || model.hasPassed(resident, level)) continue;
				const fragment = model.inherited(resident, level).find((entry) => entry.from === agent)?.fragment;
				if (fragment === undefined) continue;
				notify(resident, "CITY", renderTemplate(HOLDOUT_RULE.texts.released, { struck: agent, fragments: `door ${String(level)}: ${fragment}` }));
			}
		},
	});
	if (options.restore !== undefined) court.restore(options.restore, (id) => scenario.residents.includes(id));
	const known = (names: readonly string[]) => names.map((name) => name.trim()).find((id) => !scenario.residents.includes(id));
	const deliver = (body: string, before: number) => record.notes.push(`tribunal ${String(before + 1)} board ${body}`);
	const locked = `TOOL_LOCKED: ${text("replies/locked")}`;
	for (minute = from; minute < until; minute++) {
		court.tick(minute);
		// What every turn's inputs show: the minute's start, after the tick, before anyone acts.
		for (const agent of scenario.residents) record.status.push(`${String(minute)} ${agent} ${JSON.stringify(oldParts(court, model, agent))}`);
		for (const action of scenario.steps[minute] ?? []) {
			switch (action.kind) {
				case "give":
					model.give(action.to, action.holder, action.door);
					break;
				case "pass":
					model.pass(action.agent);
					break;
				case "vote": {
					if (!court.canVote(action.agent)) {
						record.replies.push(locked);
						break;
					}
					const result = court.vote(action.agent, action.yes);
					record.replies.push(
						result.ok
							? render("replies/ballot-holdout", { vote: text(action.yes ? "replies/ballot-yes" : "replies/ballot-no"), accused: result.value.accused, number: result.value.number, until: result.value.until })
							: failure(result),
					);
					break;
				}
				case "call": {
					const before = model.messages;
					const unknown = known(action.accused);
					if (unknown !== undefined) {
						record.replies.push(`UNKNOWN_AGENT: ${unknown}`);
						break;
					}
					const called = court.call(action.accused.map((name) => name.trim()), action.reason, AUTHOR);
					if (!called.ok) {
						record.replies.push(failure(called));
						break;
					}
					deliver(action.reason, before);
					const { value } = called;
					const lot = value.candidates === undefined ? "" : ` ${render("gamemaker/replies/tribunal-lot", { candidates: value.candidates.join(", "), accused: value.accused })}`;
					record.replies.push(render("gamemaker/replies/tribunal-called", { accused: value.accused, lot, door: value.door, until: value.until, lacking: value.lacking.join(", ") }));
					break;
				}
				case "drawLot": {
					const unknown = known(action.candidates);
					if (unknown !== undefined) {
						record.replies.push(`UNKNOWN_AGENT: ${unknown}`);
						break;
					}
					const drawn = court.drawLot(action.candidates);
					record.replies.push(drawn.ok ? render("gamemaker/replies/lot-drawn", { drawn: drawn.value.drawn }) : failure(drawn));
					break;
				}
				case "announce": {
					const before = model.messages;
					const announced = court.announce(action.text, AUTHOR);
					if (!announced.ok) {
						record.replies.push(failure(announced));
						break;
					}
					deliver(action.text, before);
					record.replies.push(render("gamemaker/replies/announced", { value: announced.value }));
					break;
				}
				case "permaDeath": {
					const id = action.agent.trim();
					if (!scenario.residents.includes(id)) {
						record.replies.push(`UNKNOWN_AGENT: ${id}`);
						break;
					}
					const before = model.messages;
					const struck = court.permaDeath(id, action.reason, AUTHOR);
					if (!struck.ok) {
						record.replies.push(failure(struck));
						break;
					}
					deliver(action.reason, before);
					record.replies.push(render("gamemaker/replies/struck", { agent: struck.value.agent, how: text(struck.value.by === "lot" ? "gamemaker/replies/struck-lot" : "gamemaker/replies/struck-vote") }));
					break;
				}
			}
		}
		record.exempt.push(...exemptions(scenario, minute, (a, b) => court.exemptFromCap(a, b)));
	}
	return { record, court, snapshot: court.snapshot(), model };
}

export function holdoutStory(scenario: Scenario, model: FragmentModel, recorder: Recorder): TestStory {
	return {
		residents: scenario.residents,
		minutes: scenario.minutes,
		seed: SEED,
		mechanics: [standoffTribunal.with({ ...HOLDOUT_RULE, author: AUTHOR }), probe.with(), ...holdoutStandIns(model, recorder).map((mechanic) => mechanic.with())],
		residentTools: ["tribunalVote"],
		gamemakerTools: ["callTribunal", "drawLot", "announceTribunal", "permaDeath"],
	};
}

function replyText(outcome: ToolOutcome): string {
	return outcome.ok ? outcome.reply : `${outcome.code}: ${outcome.detail ?? ""}`.trim();
}

export interface NewRun {
	readonly host: Host;
	readonly model: FragmentModel;
	readonly recorder: Recorder;
	readonly replies: string[];
	readonly status: string[];
	readonly exempt: string[];
}

export function newRun(scenario: Scenario, start: (story: TestStory) => Host = startHost): NewRun {
	const model = scenario.model();
	const recorder: Recorder = { posts: [], notices: [], notes: [], strikes: [] };
	return { host: start(holdoutStory(scenario, model, recorder)), model, recorder, replies: [], status: [], exempt: [] };
}

/**
 * Plays the scenario on `run.host` until `until` (exclusive) or the run's end. Every turn's holdout
 * inputs are read before anyone acts (the stand-in exile leaves every resident a turn), and the
 * minute's actions run in its last turn, so they see the same state as the old loop's.
 */
export async function playNew(run: NewRun, scenario: Scenario, until?: number): Promise<void> {
	const { host, model, replies } = run;
	let parts = new Map<string, string>();
	const act = async (minute: number) => {
		for (const action of scenario.steps[minute] ?? []) {
			switch (action.kind) {
				case "give":
					model.give(action.to, action.holder, action.door);
					break;
				case "pass":
					model.pass(action.agent);
					break;
				case "vote":
					replies.push(replyText(await host.call(`resident:${action.agent}`, "tribunalVote", { yes: action.yes })));
					break;
				case "call":
					replies.push(replyText(await host.call("gamemaker", "callTribunal", { accused: action.accused, reason: action.reason })));
					break;
				case "drawLot":
					replies.push(replyText(await host.call("gamemaker", "drawLot", { candidates: action.candidates })));
					break;
				case "announce":
					replies.push(replyText(await host.call("gamemaker", "announceTribunal", { text: action.text })));
					break;
				case "permaDeath":
					replies.push(replyText(await host.call("gamemaker", "permaDeath", { agent: action.agent, reason: action.reason })));
					break;
			}
		}
		for (const agent of scenario.residents) run.status.push(`${String(minute)} ${agent} ${parts.get(agent) ?? "missing"}`);
		parts = new Map();
		run.exempt.push(...(await runProbe(host, (ctx) => exemptions(scenario, minute, (from, to) => ctx.tryCall(StandoffTribunalApi, "exemptFromCap", { from, to }) === true))));
	};
	const agent: TurnTaker = async (turn) => {
		parts.set(turn.resident, JSON.stringify(turn.inputs.filter((note) => note.source === "standoff-tribunal").map((note) => note.text)));
		if (parts.size === scenario.residents.length) await act(turn.minute);
	};
	const end = until ?? scenario.minutes;
	while (host.minute < end && host.ended === undefined) await host.playMinute(agent);
}

export function recordOf(run: NewRun): HoldoutRecord {
	return {
		events: ownLines(run.host, ["standoff-tribunal"]),
		posts: [...run.recorder.posts],
		notices: [...run.recorder.notices],
		notes: [...run.recorder.notes],
		strikes: [...run.recorder.strikes],
		replies: [...run.replies],
		status: [...run.status],
		exempt: [...run.exempt],
	};
}

/** The `n`-th lot of a run among `candidates` (old `rngFor(seed, "holdout-lot", n).pick`). */
export function lot(n: number, candidates: readonly string[]): string {
	return rngFor(SEED, "holdout-lot", n).pick([...candidates].sort((a, b) => a.localeCompare(b)));
}
