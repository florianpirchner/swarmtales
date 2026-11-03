/**
 * The differential harness of the holdout tribunal (team T4b): one scripted scenario on the old
 * `HoldoutTribunal` (packages/engine, read only) with the ports of world.ts:735-760 over a
 * `FragmentModel`, the old `#onStruck`, `enabledTools`, `holdoutParts`, the residents' and the
 * gamemaker's tools; and the same scenario on the new host with `standoff-tribunal` and stand-ins
 * over the same model. Both record the events (with their minute), posts, notices, notes, strikes,
 * replies, every resident's status part each minute and the DM cap exemptions.
 */
import { Type, type Static } from "typebox";
import { replayOld } from "../../helpers/old-engine.ts";
import { rngFor } from "@swarmtales/kernel";
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
	/** The resident goes to the gate (another mechanic's doing: in the city, not "alive" for the status line). */
	| { readonly kind: "gate"; readonly agent: string; readonly until: number }
	/** The resident leaves the city by another mechanic's strike (the seal, say): the holdout only sees it gone. */
	| { readonly kind: "exile"; readonly agent: string }
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

const exemptions = (scenario: Scenario, minute: number, exempt: (from: string, to: string) => boolean): readonly string[] =>
	scenario.residents.flatMap((from) => scenario.residents.filter((to) => to !== from && exempt(from, to)).map((to) => `${String(minute)} ${from}>${to}`));

const Lines = Type.Array(Type.String());
/** A recorded old holdout run: its record and the old `HoldoutSnapshot` at its end (the session's voters typed, the rest kept). */
const OldHoldoutRun = Type.Object({
	record: Type.Object({ events: Lines, posts: Lines, notices: Lines, notes: Lines, strikes: Lines, replies: Lines, status: Lines, exempt: Lines }),
	snapshot: Type.Object({ session: Type.Optional(Type.Object({ voters: Lines })) }),
});

/** The old holdout tribunal's run of a scenario, as it was recorded once before the engine went (step 18, item 7b; `test/fixtures/old-engine/`). */
export function runOld(scenario: Scenario, options: { readonly restore?: unknown; readonly from?: number; readonly until?: number } = {}): Static<typeof OldHoldoutRun> {
	return replayOld({ scenario: { ...scenario, model: scenario.model() }, options }, OldHoldoutRun);
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
				case "gate":
					model.gate.set(action.agent, action.until);
					break;
				case "exile":
					model.exiled.add(action.agent);
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
