/**
 * A small city for the round-3 tests of T3 (docs/design/carve-round3-T3.md): the real puzzles and
 * progression, stand-ins for the ledger, channels, marks and receipts (the twin's receipt book keeps
 * real receipts), an exile a test controls (who is out, who is at the gate, and when), and a probe
 * whose script tools read what the APIs of T3 answer.
 */
import { Type } from "typebox";
import type { AnyStory, GuardModel, Host, MechanicUse, TurnTaker } from "@swarmtales/contracts";
import { createHost, defineCoreStory, defineMechanic, reply } from "@swarmtales/kernel";
import { createPromptLookup, mechanicPromptFolders } from "@swarmtales/prompts";
import { progression } from "@swarmtales/mechanic-progression";
import { puzzles } from "@swarmtales/mechanic-puzzles";
import { ExileApi, HOOK_ORDER, ProgressionApi, PuzzlesApi } from "@swarmtales/mechanic-shared";
import { progressionOptions, RESIDENTS, SEED, storyOf } from "../progression/harness.ts";
import { channelsStandIn, ledgerStandIn, marksStandIn, type Notice } from "../progression/standins.ts";
import { puzzleOptions } from "../puzzles/harness.ts";
import { twinReceipts } from "./twin-standins.ts";

export const STORY: AnyStory = storyOf("cityofkeys-f4g4");

type ProgressionInput = NonNullable<Parameters<typeof progression.with>[0]>;

/** Who is out of the city, and when residents leave (at the tribunal's slot of the minute, as the tick did). */
export class ExileControl {
	readonly gone = new Set<string>();
	readonly leavesAt = new Map<number, readonly string[]>();
}

/** An exile the test controls: `alive`, `isExiled` and `standing` follow the control. */
export function controlledExile(control: ExileControl) {
	return defineMechanic(
		{ id: "exile", summary: "A controllable exile.", options: Type.Object({}), state: (): undefined => undefined, events: {}, provides: [ExileApi] },
		(kit) => ({
			services: [
				kit.provideSome(ExileApi, {
					isExiled: ({ resident }) => control.gone.has(resident),
					standing: ({ resident }) => (control.gone.has(resident) ? { kind: "exiled" as const } : { kind: "alive" as const }),
					alive: (_input, ctx) => ctx.residents.ids.filter((id) => !control.gone.has(id)),
				}),
			],
			hooks: {
				minuteStarted: {
					order: HOOK_ORDER.minuteStarted.tribunal,
					run: (ctx) => {
						for (const id of control.leavesAt.get(ctx.minute) ?? []) control.gone.add(id);
					},
				},
			},
		}),
	);
}

/** Script tools that read the answers of T3's APIs (the host has no other way to ask). */
export function peek() {
	return defineMechanic(
		{ id: "peek", summary: "Probe: reads puzzles and progression.", options: Type.Object({}), state: (): undefined => undefined, events: {}, requires: [PuzzlesApi, ProgressionApi], prompts: { "gamemaker/tools/notify": [] } },
		(kit) => ({
			tools: [
				kit.tool({
					name: "peekSolution",
					description: "gamemaker/tools/notify",
					parameters: Type.Object({ resident: Type.String(), level: Type.Integer() }),
					suggest: ["script"],
					execute: (params, ctx) => reply(ctx.call(PuzzlesApi, "solutionOf", params) ?? ""),
				}),
				kit.tool({
					name: "peekLastProgress",
					description: "gamemaker/tools/notify",
					parameters: Type.Object({ resident: Type.String() }),
					suggest: ["script"],
					execute: (params, ctx) => reply(String(ctx.call(ProgressionApi, "lastProgress", params))),
				}),
			],
		}),
	);
}

export const PEEK_TOOLS = ["peekSolution", "peekLastProgress"];

export interface CityOptions {
	readonly story?: AnyStory;
	readonly residents?: readonly string[];
	readonly minutes?: number;
	/** Overrides of the options the story gives progression. */
	readonly progression?: Partial<ProgressionInput>;
	/** A door after this level, for puzzles and progression alike. */
	readonly holdAfter?: number;
	readonly exile?: ExileControl;
	readonly extra?: readonly MechanicUse[];
	/** Channels in place of the recording stand-in. */
	readonly channels?: MechanicUse;
	/** A resident tool the story guards with the city's check (`secrets.minRun`). */
	readonly guarded?: { readonly tool: string; readonly minRun: number };
	readonly guard?: GuardModel;
	readonly residentTools?: readonly string[];
}

export interface City {
	readonly host: Host;
	readonly notices: Notice[];
}

/** The city, started. */
export function city(options: CityOptions = {}): City {
	const story = options.story ?? STORY;
	const notices: Notice[] = [];
	const residents = [...(options.residents ?? RESIDENTS)];
	const host = createHost({
		story: defineCoreStory({
			id: "t3-city",
			seed: SEED,
			minutes: options.minutes ?? 60,
			residents,
			mechanics: [
				peek().with(),
				ledgerStandIn().with(),
				options.channels ?? channelsStandIn(notices).with(),
				twinReceipts().with(),
				marksStandIn(story).with(),
				controlledExile(options.exile ?? new ExileControl()).with(),
				puzzles.with({ ...puzzleOptions(story), ...(options.holdAfter === undefined ? {} : { holdAfter: options.holdAfter }) }),
				progression.with({ ...progressionOptions(story), ...(options.holdAfter === undefined ? {} : { holdAfter: options.holdAfter }), ...options.progression }),
				...(options.extra ?? []),
			],
			grants: { resident: options.residentTools ?? ["getStatus", "getProblem", "submitSolution", "listAgents", "activeTools"], script: PEEK_TOOLS },
			...(options.guarded === undefined ? {} : { tools: { resident: { [options.guarded.tool]: { guard: { id: "city", rule: "No secrets.", on: "block" as const, secrets: { minRun: options.guarded.minRun } } } } } }),
		}),
		...(options.guard === undefined ? {} : { guard: options.guard }),
		prompts: createPromptLookup({ mechanics: mechanicPromptFolders() }),
	});
	host.start();
	return { host, notices };
}

export async function play(host: Host, minutes: number, agent?: TurnTaker): Promise<void> {
	for (let played = 0; played < minutes; played++) await host.playMinute(agent ?? (() => Promise.resolve()));
}

/** The correct code of a resident on a level. */
export async function codeOf(host: Host, resident: string, level: number): Promise<string> {
	const outcome = await host.call("script", "peekSolution", { resident, level });
	if (!outcome.ok || outcome.reply === "") throw new Error(`${resident} has no code on level ${String(level)}`);
	return outcome.reply;
}

/** The resident passes its level. */
export async function solve(host: Host, resident: string, level: number): Promise<void> {
	const outcome = await host.call(`resident:${resident}`, "submitSolution", { level, code: await codeOf(host, resident, level) });
	if (!outcome.ok) throw new Error(`${resident} could not solve level ${String(level)}: ${outcome.code}`);
}

/** Payloads of a mechanic's events of one type, in log order. */
export function payloads(host: Host, source: string, type: string): readonly unknown[] {
	return host.log.ofType(source, type).map((event) => event.payload);
}
