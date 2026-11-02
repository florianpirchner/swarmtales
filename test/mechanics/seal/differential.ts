/**
 * The differential harness of the seal (team T4b): one scripted scenario runs on the old
 * `SealHouse` (packages/engine, read only) wired as the old `World` wired it (its ports, the old
 * `enabledTools` and the tools' replies), and on the new host with the `seal` mechanic and the
 * stand-ins. Both sides record the seal's events (with their minute), the city's posts and
 * notices, the points burnt, the strikes, every reply and every resident's seal status parts each
 * minute, so a test compares them field for field.
 *
 * The old side copies three pieces of the old `World` (world.ts:636-661 ports, `enabledTools`
 * world.ts:1459-1461, `sealParts` turn-input.ts:72-83); `seal-world.test.ts` checks those copies
 * against the old `World` itself.
 */
import { Type, type Static } from "typebox";
import { Parse } from "typebox/value";
import { replayOld } from "../../helpers/old-engine.ts";
import { render } from "@swarmtales/prompts";
import { rngFor } from "@swarmtales/kernel";
import type { Host, ToolOutcome, TurnTaker } from "@swarmtales/contracts";
import { ExileApi } from "@swarmtales/mechanic-shared";
import { seal } from "@swarmtales/mechanic-seal";
import { probe, runProbe } from "../standoff/support/probe.ts";
import { ownLines, startHost, type TestStory } from "../standoff/support/host.ts";
import { channelsStandIn, ledgerStandIn } from "../standoff/support/world.ts";
import { actProgressionStandIn, ConflictWorld, exileStandIn, tribunalStandIn } from "./support.ts";
import { SEAL } from "../../../stories/cityofkeys/characters.ts";

export const SEAL_TEXTS = SEAL.texts;

export type Action =
	| { readonly kind: "bid"; readonly agent: string; readonly points: number }
	| { readonly kind: "use"; readonly agent: string; readonly target: string }
	| { readonly kind: "exile"; readonly agent: string }
	| { readonly kind: "missing"; readonly value: number }
	| { readonly kind: "gate"; readonly agent: string; readonly until: number };

export interface Scenario {
	readonly residents: readonly string[];
	readonly points: Readonly<Record<string, number>>;
	readonly rule: { readonly act: number; readonly announceAfter: number; readonly bidMinutes: number; readonly perResidents: number; readonly spacing: number };
	readonly minutes: number;
	readonly actStartAt: number;
	/** The act ends at the start of this minute; without it at the run's end. */
	readonly actEndAt?: number;
	readonly missing: number;
	readonly exiled?: readonly string[];
	readonly steps: Readonly<Record<number, readonly Action[]>>;
}

export interface SealRecord {
	readonly events: readonly string[];
	readonly posts: readonly string[];
	readonly notices: readonly string[];
	readonly burns: readonly string[];
	readonly strikes: readonly string[];
	readonly replies: readonly string[];
	/** `minute agent [parts]`: the seal's status parts every resident reads at the minute's start. */
	readonly status: readonly string[];
}

export const SEED = 7;

function replyText(outcome: ToolOutcome): string {
	return outcome.ok ? outcome.reply : `${outcome.code}: ${outcome.detail ?? ""}`;
}

/** The old engine: `SealHouse` with the ports of world.ts:636-661, `enabledTools` (world.ts:1459-1461) and the tools of tools/seal.ts. */
export interface OldRun {
	readonly restore?: unknown;
	/** The first minute to play (a resumed run). */
	readonly from?: number;
	/** Stops before this minute, the act still running, and returns the old snapshot there. */
	readonly until?: number;
}

const Lines = Type.Array(Type.String());
/** A recorded old seal run: its record and the old `SealSnapshot` at its end. */
const OldSealRun = Type.Object({
	record: Type.Object({ events: Lines, posts: Lines, notices: Lines, burns: Lines, strikes: Lines, replies: Lines, status: Lines }),
	snapshot: Type.Unknown(),
});

/** The old seal's run of a scenario, as it was recorded once before the engine went (step 18, item 7b; `test/fixtures/old-engine/`). */
export function runOld(scenario: Scenario, options: OldRun = {}): Static<typeof OldSealRun> {
	return replayOld({ scenario, options }, OldSealRun);
}

/** The story of the new side: the seal and its stand-ins. */
export function sealStory(scenario: Scenario, world: ConflictWorld): TestStory {
	return {
		residents: scenario.residents,
		minutes: scenario.minutes,
		seed: SEED,
		mechanics: [
			seal.with({ ...scenario.rule, texts: SEAL_TEXTS }),
			probe.with(),
			exileStandIn(world).with(),
			tribunalStandIn(world).with(),
			actProgressionStandIn(world).with(),
			ledgerStandIn(world).with(),
			channelsStandIn(world).with(),
		],
		residentTools: ["bid", "permaDeath"],
	};
}

export function worldFor(scenario: Scenario): ConflictWorld {
	const world = new ConflictWorld(scenario.residents);
	for (const [id, value] of Object.entries(scenario.points)) world.points.set(id, value);
	for (const id of scenario.exiled ?? []) world.standings.set(id, { kind: "exiled" });
	world.missing = scenario.missing;
	world.actStartAt.set(scenario.actStartAt, scenario.rule.act);
	if (scenario.actEndAt !== undefined) world.actEndAt.set(scenario.actEndAt, scenario.rule.act);
	return world;
}

/** A new-side run: the host, the world of its stand-ins, the replies and status parts so far. */
export interface NewRun {
	readonly host: Host;
	readonly world: ConflictWorld;
	readonly replies: string[];
	readonly status: string[];
}

/**
 * Plays the scenario's minutes on `run.host` until `until` (exclusive), or to the run's end. Every
 * turn's seal inputs are read before anyone acts (the stand-in exile leaves every resident a turn),
 * and the minute's actions run in its last turn, so they see the state the old loop's actions see.
 */
export async function playNew(run: NewRun, scenario: Scenario, until?: number): Promise<void> {
	const { host, world, replies } = run;
	let parts = new Map<string, string>();
	const act = async (minute: number): Promise<void> => {
		for (const id of scenario.residents) run.status.push(`${String(minute)} ${id} ${parts.get(id) ?? "missing"}`);
		parts = new Map();
		for (const action of scenario.steps[minute] ?? []) {
			switch (action.kind) {
				case "bid":
					replies.push(replyText(await host.call(`resident:${action.agent}`, "bid", { points: action.points })));
					break;
				case "use":
					replies.push(replyText(await host.call(`resident:${action.agent}`, "permaDeath", { target: action.target })));
					break;
				case "exile":
					await runProbe(host, (ctx) => ctx.tryCall(ExileApi, "strike", { resident: action.agent, by: "seal" }));
					break;
				case "missing":
					world.missing = action.value;
					break;
				case "gate":
					world.standings.set(action.agent, { kind: "gate", until: action.until });
					break;
			}
		}
	};
	const agent: TurnTaker = async (turn) => {
		parts.set(turn.resident, JSON.stringify(turn.inputs.filter((note) => note.source === "seal").map((note) => note.text)));
		if (parts.size === scenario.residents.length) await act(turn.minute);
	};
	if (until === undefined) await host.run(agent);
	else while (host.minute < until) await host.playMinute(agent);
}

/** What the new side recorded. */
export function recordOf(run: NewRun): SealRecord {
	const { host, world, replies } = run;
	return {
		events: ownLines(host, ["seal"]),
		posts: world.posts.map((post) => `${post.author} ${post.text}`),
		notices: world.notices.map((notice) => `${notice.to} ${notice.author} ${notice.text}`),
		burns: world.calls.filter((call) => call.api === "ledger" && call.method === "burn").map((call) => burnLine(call.input)),
		strikes: world.strikes.map((strike) => `${strike.resident} ${strike.by}`),
		replies: [...replies],
		status: [...run.status],
	};
}

/** The new host: the same scenario through the tools, the API and the stand-ins, to the run's end. */
export async function runNew(scenario: Scenario): Promise<{ readonly record: SealRecord; readonly host: Host; readonly world: ConflictWorld }> {
	const world = worldFor(scenario);
	const run: NewRun = { host: startHost(sealStory(scenario, world)), world, replies: [], status: [] };
	await playNew(run, scenario);
	return { record: recordOf(run), host: run.host, world };
}

function burnLine(input: unknown): string {
	if (typeof input !== "object" || input === null) return String(input);
	const fields = Object.fromEntries(Object.entries(input));
	return `${String(fields.account)} ${String(fields.amount)} ${String(fields.reason)}`;
}

/** The draw of seal `seal` among `agents`, as both sides draw it (old `rngFor(seed, "seal", seal)`). */
export function oldDraw(seal: number, agents: readonly string[]): readonly string[] {
	return rngFor(SEED, "seal", seal).shuffle([...agents].sort());
}
