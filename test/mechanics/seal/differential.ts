/**
 * The differential harness of the seal (team T4b): one scripted scenario runs on the old
 * `SealHouse` (packages/engine, read only) wired as the old `World` wired it (its ports, the old
 * `enabledTools` and the tools' replies), and on the new host with the `seal` mechanic and the
 * stand-ins. Both sides record the seal's events (with their minute), the city's posts and
 * notices, the points burnt, the strikes and every reply, so a test compares them field for field.
 */
import { SealHouse as OldSealHouse, type SealSnapshot } from "@swarmtales/engine";
import { render } from "@swarmtales/prompts";
import { rngFor } from "@swarmtales/kernel";
import type { Host, ToolOutcome } from "@swarmtales/contracts";
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
}

const SEED = 7;

function replyText(outcome: ToolOutcome): string {
	return outcome.ok ? outcome.reply : `${outcome.code}: ${outcome.detail ?? ""}`;
}

/** The old engine: `SealHouse` with the ports of world.ts:636-661, `enabledTools` (world.ts:1459-1461) and the tools of tools/seal.ts. */
export interface OldRun {
	readonly restore?: SealSnapshot;
	/** The first minute to play (a resumed run). */
	readonly from?: number;
	/** Stops before this minute, the act still running, and returns the old snapshot there. */
	readonly until?: number;
}

export function runOld(scenario: Scenario, options: OldRun = {}): { readonly record: SealRecord; readonly house: OldSealHouse; readonly snapshot: SealSnapshot | undefined } {
	const { restore, from = 0, until = scenario.minutes } = options;
	const points = new Map(Object.entries(scenario.points));
	const standing = new Map<string, "alive" | "exiled" | { until: number }>((scenario.exiled ?? []).map((id) => [id, "exiled"]));
	let missing = scenario.missing;
	let minute = 0;
	const record: { readonly [K in keyof SealRecord]: string[] } = { events: [], posts: [], notices: [], burns: [], strikes: [], replies: [] };
	const standingOf = (agent: string) => {
		const found = standing.get(agent) ?? "alive";
		return found === "alive" ? { kind: "alive" as const } : found === "exiled" ? { kind: "exiled" as const } : { kind: "gate" as const, until: found.until };
	};
	const house: OldSealHouse = new OldSealHouse({
		spec: { ...scenario.rule, texts: SEAL_TEXTS },
		seed: SEED,
		ids: scenario.residents,
		points: (agent) => points.get(agent) ?? 0,
		standing: standingOf,
		missing: () => missing,
		burn: (agent, amount, reason) => {
			points.set(agent, (points.get(agent) ?? 0) - amount);
			record.burns.push(`${agent} ${String(amount)} ${reason}`);
		},
		post: (text) => record.posts.push(`CITY ${text}`),
		notify: (agent, text) => record.notices.push(`${agent} CITY ${text}`),
		emit: (event) => {
			const { type, ...payload } = event;
			record.events.push(JSON.stringify({ type, ...payload, minute }));
		},
		strike: (target) => {
			// The old tribunal's strike: exiled at once, then `#onExiled` tells the seal.
			record.strikes.push(`${target} seal`);
			standing.set(target, "exiled");
			house.onExiled(target);
		},
	});
	if (restore !== undefined) house.restore(restore);
	const enabled = (tool: "bid" | "permaDeath", agent: string): boolean =>
		tool === "bid" ? house.auction !== undefined && standingOf(agent).kind === "alive" : house.holds(agent);
	const locked = `TOOL_LOCKED: ${render("replies/locked", {})}`;
	for (minute = from; minute < until; minute++) {
		if (scenario.actEndAt === minute) house.end();
		if (scenario.actStartAt === minute) house.begin(minute, scenario.residents.filter((id) => standingOf(id).kind !== "exiled").length);
		house.tick(minute);
		for (const action of scenario.steps[minute] ?? []) {
			switch (action.kind) {
				case "bid": {
					if (!enabled("bid", action.agent)) {
						record.replies.push(locked);
						break;
					}
					const result = house.bid(action.agent, action.points);
					record.replies.push(
						result.ok
							? result.value.points === 0
								? render("replies/bid-none", { until: result.value.until })
								: render("replies/bid-stands", { points: result.value.points, until: result.value.until })
							: `${result.error}: ${result.detail ?? ""}`,
					);
					break;
				}
				case "use": {
					if (!enabled("permaDeath", action.agent)) {
						record.replies.push(locked);
						break;
					}
					const result = house.use(action.agent, action.target);
					record.replies.push(result.ok ? render("replies/seal-broken", { target: result.value }) : `${result.error}: ${result.detail ?? ""}`);
					break;
				}
				case "exile":
					record.strikes.push(`${action.agent} seal`);
					standing.set(action.agent, "exiled");
					house.onExiled(action.agent);
					break;
				case "missing":
					missing = action.value;
					break;
				case "gate":
					standing.set(action.agent, { until: action.until });
					break;
			}
		}
	}
	if (until < scenario.minutes) return { record, house, snapshot: house.snapshot() };
	if (scenario.actEndAt === undefined || scenario.actEndAt >= scenario.minutes) house.end();
	return { record, house, snapshot: house.snapshot() };
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

/** A new-side run: the host, the world of its stand-ins and the replies so far. */
export interface NewRun {
	readonly host: Host;
	readonly world: ConflictWorld;
	readonly replies: string[];
}

/** Plays the scenario's minutes on `run.host` until `until` (exclusive), or to the run's end. */
export async function playNew(run: NewRun, scenario: Scenario, until?: number): Promise<void> {
	const { host, world, replies } = run;
	let done = -1;
	const agent = async (turn: { readonly minute: number }): Promise<void> => {
		if (done === turn.minute) return;
		done = turn.minute;
		for (const action of scenario.steps[turn.minute] ?? []) {
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
	};
}

/** The new host: the same scenario through the tools, the API and the stand-ins, to the run's end. */
export async function runNew(scenario: Scenario): Promise<{ readonly record: SealRecord; readonly host: Host; readonly world: ConflictWorld }> {
	const world = worldFor(scenario);
	const run: NewRun = { host: startHost(sealStory(scenario, world)), world, replies: [] };
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
