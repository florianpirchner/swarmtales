// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The new side of the differential, carried from the old `test/mechanics/tribunal/support/twin.ts` and the stand-ins
 * of `test/mechanics/exile/support/city.ts`: one scenario (points, the options, flags per tick and the residents' and
 * the gamemaker's actions per tick) played by the real `exile` and `tribunal` over stand-ins of `ledger`, `channels`
 * and `progression` that record what they are asked, in call order. It yields the old streams: effects (posts,
 * notices, bookings, groups), events, the outcome of every action, the status parts of every activation, who left the
 * city, the views and the acts ended. The old side is the recording of the old `Tribunal` (`fixtures/`).
 */
import { Type } from "typebox";
import { Value } from "typebox/value";
import type { Activation, ActorId, Envelope, ToolOutcome } from "@swarmtales/contracts";
import { RansomPriceService, TrialRiskService } from "@swarmtales/mechanic-standoff/contract";
import { TribunalViewService } from "@swarmtales/mechanic-arena/contract";
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { NoticesService } from "@swarmtales/mechanic-contracts";
import { exile } from "@swarmtales/mechanic-exile";
import { ExileEvents, ExilePurseService, ExileService } from "@swarmtales/mechanic-exile/contract";
import { LedgerService } from "@swarmtales/mechanic-ledger/contract";
import { ProgressionService } from "@swarmtales/mechanic-progression/contract";
import { defineGame, defineHead, defineMechanic, reply, type MechanicUse } from "@swarmtales/sdk";
import { testKernel } from "@swarmtales/testkit";
import { TribunalService } from "../src/contract.ts";
import { tribunal, type TribunalSpec } from "../src/index.ts";

/** One step of a scenario, as the old twin wrote it. */
export type Action =
	| { readonly vote: readonly [string, string] }
	| { readonly nominate: readonly [string, string] }
	| { readonly join: readonly [string, string] }
	| { readonly refuse: readonly [string, string] }
	| { readonly pay: readonly [string, string, number] }
	| { readonly schedule: { readonly minute: number; readonly count: number; readonly factions?: number; readonly reason: string } }
	| { readonly strike: string }
	| { readonly points: readonly [string, number] };

/** One scenario of the old twin, without the old `restore` (no old snapshot is resumed, A56). */
export interface Scenario {
	readonly points: readonly number[];
	readonly spec: TribunalSpec;
	readonly minutes?: number;
	readonly survivors?: number;
	readonly progress?: readonly number[];
	readonly actStart?: number;
	readonly flags?: Readonly<Record<number, { readonly doorShut?: boolean; readonly passed?: boolean; readonly levels?: Readonly<Record<string, number>> }>>;
	readonly roles?: readonly { readonly fromLevel: number; readonly role: string }[];
	readonly actions?: Readonly<Record<number, readonly Action[]>>;
	readonly until: number;
	readonly views?: readonly number[];
}

// The city the stand-ins read and record into (old `TestCity`).
class City {
	readonly points = new Map<string, number>();
	readonly levels = new Map<string, number>();
	readonly progress = new Map<string, number>();
	readonly effects: string[] = [];
	readonly acts: number[] = [];
	passed: string[] = [];
	doorShut = false;
	groups = 0;
	readonly scenario: Scenario;
	constructor(scenario: Scenario) {
		this.scenario = scenario;
	}
	record(kind: string, data: unknown): void {
		this.effects.push(`${kind} ${JSON.stringify(data)}`);
	}
	add(account: string, delta: number): void {
		this.points.set(account, (this.points.get(account) ?? 0) + delta);
	}
}

const stub = <T>(value: T) => () => value;

function ledgerOf(city: City): MechanicUse {
	const book = (kind: string) => ({ account, amount, reason }: { account: string; amount: number; reason: string }) => {
		city.record(kind, { agent: account, amount, reason });
		city.add(account, kind === "mint" ? amount : -amount);
		return null;
	};
	const move = ({ from, to, amount }: { from: string; to: string; amount: number }) => {
		city.add(from, -amount);
		city.add(to, amount);
		return null;
	};
	const balance = ({ account }: { account: string }) => city.points.get(account) ?? 0;
	const head = defineHead({ id: "ledger", package: "@test/ledger", summary: "Test: the points of the city.", provides: [LedgerService, ExilePurseService] });
	return defineMechanic(head, {
		services: {
			ledger: { balance, balances: () => Object.fromEntries(city.points), open: stub(null), has: stub(true), mint: book("mint"), burn: book("burn"), move: (input) => ({ ok: true as const, txId: String(move(input)) }) },
			"exile-purse": { balance, burn: book("burn"), move },
		},
		// The old `#onExiled` burnt the exiled's balance.
		listeners: (kit) => [
			kit.listen(ExileEvents, "exiled", ({ agent }) => {
				const left = city.points.get(agent) ?? 0;
				if (left > 0) book("burn")({ account: agent, amount: left, reason: `exiled ${agent}` });
			}),
		],
	})();
}

function channelsOf(city: City): MechanicUse {
	const post = ({ text }: { text: string }) => {
		city.record("post", text);
		return { postSeq: city.effects.length };
	};
	const notify = ({ to, text }: { to: string; text: string }) => {
		city.record("notice", { agent: to, text });
		return null;
	};
	const head = defineHead({ id: "channels", package: "@test/channels", summary: "Test: the voice of the city.", provides: [ChannelsService, NoticesService] });
	return defineMechanic(head, {
		services: {
			channels: {
				...{ post, notify, deliver: stub({ number: 0 }), dmRecords: stub([]), boardPost: stub(null), pendingDms: stub(0), dmWindow: stub(null), group: stub(null), groupPost: stub(null), couldRead: stub(false) },
				createCityGroup: ({ name, members }) => {
					city.groups += 1;
					const group = `G${String(city.groups)}`;
					city.record("group", { id: group, name, members });
					return { group };
				},
				removeCityGroup: ({ group }) => {
					city.record("groupRemoved", group);
					return null;
				},
				postGroupAsCity: ({ group, text }) => {
					city.record("groupPost", { group, text });
					return null;
				},
			},
			notices: { post, notify },
		},
	})();
}

function progressionOf(city: City): MechanicUse {
	const { scenario } = city;
	const head = defineHead({ id: "progression", package: "@test/progression", summary: "Test: the levels of the city.", provides: [ProgressionService] });
	return defineMechanic(head, {
		// The scenario's flags of the tick, before the tribunal's tick (old: before the tick of a minute).
		hooks: {
			tickStarted: (ctx) => {
				const flags = scenario.flags?.[ctx.tick];
				if (flags?.doorShut !== undefined) city.doorShut = flags.doorShut;
				if (flags?.passed !== undefined) city.passed = flags.passed ? ["A01"] : [];
				for (const [agent, level] of Object.entries(flags?.levels ?? {})) city.levels.set(agent, level);
			},
		},
		services: {
			progression: {
				...{ levelOf: ({ resident }) => city.levels.get(resident) ?? 8, passed: () => [...city.passed], lastProgress: ({ resident }) => city.progress.get(resident) ?? -1, actStart: () => scenario.actStart ?? 0, doorShut: () => city.doorShut },
				...{ isFinished: stub(false), hasPassed: stub(false), hasSolved: stub(false), currentAct: stub(8), door: stub(null), openDoor: stub(false), releaseDoor: stub(null), unlock: stub(null), ranking: stub([]) },
				...{ holdersBehind: stub([]), nextPenalty: stub(0), nextBlamePenalty: stub(0), chargeBlame: stub(0), isOpenOnClock: stub(true), opensAt: stub(0) },
				bounds: () => ({ startLevel: 8, lastLevel: 10, survivors: scenario.survivors ?? 2 }),
				endAct: ({ fromLevel }) => {
					const first = !city.acts.includes(fromLevel);
					if (first) city.acts.push(fromLevel);
					return first;
				},
			},
		},
	})();
}

/** What the old view held, as the new services and facts answer it (the old `TribunalApi` and `TribunalViewApi`). */
export interface View {
	readonly minute: number;
	readonly atRisk: unknown;
	readonly stop: unknown;
	readonly missing: unknown;
	readonly price: unknown;
	readonly section: unknown;
}

// The script's two tools: the seal's strike (old `ExileApi.strike`) and the view.
function probeOf(views: View[]): MechanicUse {
	const head = defineHead({
		id: "probe",
		package: "@test/probe",
		summary: "Test: the seal's strike and the view.",
		requires: [ExileService],
		uses: [TribunalViewService, TrialRiskService, RansomPriceService, TribunalService],
		tools: { strike: { description: "Strike.", params: Type.Object({ resident: Type.String() }), for: ["gamemaker"] }, view: { description: "View.", params: Type.Object({ section: Type.Unknown() }), for: ["gamemaker"] } },
	});
	return defineMechanic(head, {
		tools: {
			strike: {
				run: ({ resident }, ctx) => {
					ctx.call(ExileService, "banish", { resident, by: "seal" });
					return reply("struck");
				},
			},
			view: {
				run: ({ section }, ctx) => {
					const risk = ctx.tryCall(TrialRiskService, "atRisk", {});
					views.push({ minute: ctx.tick, atRisk: risk, stop: ctx.tryCall(TribunalViewService, "stop", {}), missing: ctx.tryCall(TribunalService, "missing", {}), price: ctx.tryCall(RansomPriceService, "price", {}), section });
					return reply("viewed");
				},
			},
		},
	})();
}

const answer = (outcome: ToolOutcome): string => (outcome.ok ? outcome.reply : `${outcome.code}: ${outcome.detail ?? ""}`);
const Payload = Type.Record(Type.String(), Type.Unknown());
const fields = (event: Envelope) => Value.Parse(Payload, event.payload);
const ids = (count: number) => Array.from({ length: count }, (_, index) => `A${String(index + 1).padStart(2, "0")}`);

// An action as the kernel's call: the actor, the tool and its params.
function callOf(action: Action): readonly [ActorId, string, unknown] {
	if ("vote" in action) return [`resident:${action.vote[0]}`, "vote", { target: action.vote[1] }];
	if ("nominate" in action) return [`resident:${action.nominate[0]}`, "nominate", { agent: action.nominate[1] }];
	if ("join" in action) return [`resident:${action.join[0]}`, "join", { leader: action.join[1] }];
	if ("refuse" in action) return [`resident:${action.refuse[0]}`, "refuse", { agent: action.refuse[1] }];
	if ("pay" in action) return [`resident:${action.pay[0]}`, "payRansom", { target: action.pay[1], amount: action.pay[2] }];
	if ("strike" in action) return ["script", "strike", { resident: action.strike }];
	if ("schedule" in action) return ["script", "scheduleTribunal", action.schedule];
	return ["script", "", null];
}

/**
 * Plays the scenario on the new platform and gives the old streams.
 *
 * @param scenario - The scenario.
 * @param events - The event types the streams keep.
 * @returns The streams and the views.
 */
export async function runNew(scenario: Scenario, events: readonly string[]) {
	const city = new City(scenario);
	const roster = ids(scenario.points.length);
	roster.forEach((id, index) => {
		city.points.set(id, scenario.points[index] ?? 0);
		const progress = scenario.progress?.[index];
		if (progress !== undefined && progress >= 0) city.progress.set(id, progress);
	});
	const views: View[] = [];
	const ticks = Math.min(scenario.until, (scenario.minutes ?? 60) - 1) + 1;
	const options = { ...scenario.spec, gamemakerRoles: scenario.roles ?? [{ fromLevel: 1, role: "director" }] };
	const game = defineGame({
		id: "tribunal-differential",
		seed: 7,
		residents: roster,
		mechanics: [ledgerOf(city), channelsOf(city), progressionOf(city), exile(), tribunal(options), probeOf(views)],
		grants: { script: ["scheduleTribunal", "strike", "view"] },
		scheduler: { id: "turns", options: { passes: 1, activation: "always", order: "roster", blockSize: roster.length } },
		end: { ticks: scenario.minutes ?? 60 },
	});
	const { kernel } = testKernel(game);
	const outcomes: string[] = [];
	const status: string[] = [];
	let acted = -1;
	const act = async (tick: number, action: Action): Promise<void> => {
		if ("points" in action) {
			city.points.set(action.points[0], action.points[1]);
			return;
		}
		const [actor, as, params] = callOf(action);
		const outcome = answer(await kernel.submit({ actor, as, params }));
		if (as !== "strike") outcomes.push(`${String(tick)} ${JSON.stringify(action)} → ${outcome}`);
	};
	const driver = async (activation: Activation): Promise<void> => {
		const { tick } = activation;
		status.push(`${String(tick)} ${activation.actor.slice("resident:".length)}: ${activation.inputs.filter((note) => note.kind === "status").map((note) => note.text).join(" | ")}`);
		if (acted === tick) return;
		acted = tick;
		for (const action of scenario.actions?.[tick] ?? []) await act(tick, action);
		if (scenario.views?.includes(tick) === true) await kernel.submit({ actor: "script", as: "view", params: { section: kernel.fact("tribunal.section") } });
	};
	await kernel.run({ resident: driver }, { ticks });
	const log = kernel.log.all();
	const kept = log.filter((event) => events.includes(event.type) && (event.source.endsWith("exile") || event.source.endsWith("tribunal")));
	return {
		effects: city.effects,
		events: kept.map((event) => JSON.stringify({ type: event.type, ...fields(event) })),
		outcomes,
		status,
		gone: log.filter((event) => event.type === "exiled").map((event) => String(fields(event).agent)),
		views,
		acts: city.acts,
	};
}
