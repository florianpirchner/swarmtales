/**
 * The holdout tribunal on the new host with the real `channels` (team T2: the board, notices, the
 * message numbers and the gamemaker's note desk `NotesApi`, the old `#checked` and `#deliver`), the
 * real `ledger` and `marks` (team T1, which channels requires), and stand-ins over one
 * `FragmentModel` for what the real mechanics cannot give in a city this small:
 * - puzzles and progression: the real ones deal their own passwords; the model holds the old
 *   world's door-1 fragments and passwords, so both engines guard the same secrets;
 * - exile: the real one requires the standoff, the tribunal's extras and the deal of the real
 *   puzzles; the model's standings are the old world's;
 * - names: the old run plays without names (`names: false`); the real names mechanic names every
 *   resident at its `untilMinute`, so the stand-in of T2 (no names) stands in.
 */
import type { Host, ToolOutcome, TurnTaker } from "@swarmtales/contracts";
import { Type } from "typebox";
import { createHost, defineMechanic } from "@swarmtales/kernel";
import { createPromptLookup, mechanicPromptFolders } from "@swarmtales/prompts";
import { ExileApi, ExileEvents, ProgressionApi, PuzzlesApi } from "@swarmtales/mechanic-shared";
import { channels } from "@swarmtales/mechanic-channels";
import { ledger } from "@swarmtales/mechanic-ledger";
import { marks } from "@swarmtales/mechanic-marks";
import { standoffTribunal } from "@swarmtales/mechanic-standoff-tribunal";
import { ownLines, storyOptions, SUPPORT_PROMPTS } from "../standoff/support/host.ts";
import { probe } from "../standoff/support/probe.ts";
import { provider } from "../standoff/support/provider.ts";
import { namesStandIn } from "../channels/stand-ins.ts";
import type { FragmentModel } from "./model.ts";
import { HOLDOUT_RULE } from "./rule.ts";
import type { GamemakerCall } from "./world-run.ts";

/** What the residents do in the model at a minute, before the gamemaker's calls. */
export type ModelStep = (model: FragmentModel) => void;

export interface RealChannelsRun {
	readonly host: Host;
	readonly replies: string[];
}

function standIns(model: FragmentModel, passwords: Readonly<Record<string, string>>) {
	const lastLevel = Math.max(...model.doors.keys());
	return [
		provider("puzzles", PuzzlesApi, {
			openFragmentDoors: () => [...model.openDoors()],
			lacking: ({ level, holder }) => [...model.lacking(level, holder)],
			kindOf: ({ level }) => (model.doors.has(level) ? "fragments" : "none"),
			inherited: ({ resident, level }) => model.inherited(resident, level).map((entry) => ({ ...entry })),
			isDealt: ({ level }) => model.doors.has(level),
			solutionOf: ({ resident, level }) => (model.doors.has(level) ? (passwords[resident] ?? null) : null),
			// The note desk reads the deal's secrets in one call (round 3, R2-D8): every dealt level's passwords, no numbers.
			secrets: () => ({ passwords: [...model.doors.keys()].sort((x, y) => x - y).flatMap(() => Object.values(passwords)), numbers: [] }),
		}),
		provider("progression", ProgressionApi, {
			levelOf: ({ resident }) => model.levelOf(resident),
			hasPassed: ({ resident, level }) => model.hasPassed(resident, level),
			isOpenOnClock: ({ level }) => model.doors.has(level),
			bounds: () => ({ startLevel: 1, lastLevel, survivors: model.residents.length - 1 }),
		}),
		exileStandIn(model),
	];
}

/** Exile over the model: standings, and a strike writes `exiled` as the old `#onStruck` did (world.ts:1264). */
function exileStandIn(model: FragmentModel) {
	return defineMechanic(
		{ id: "exile", summary: "Stand-in exile over the fragment model.", options: Type.Object({}), state: (): undefined => undefined, events: ExileEvents.events, provides: [ExileApi] },
		(kit) => ({
			services: [
				kit.provideSome(ExileApi, {
					alive: () => [...model.alive()],
					standing: ({ resident }) => model.standing(resident),
					isExiled: ({ resident }) => model.exiled.has(resident),
					strike: ({ resident, by }, ctx) => {
						model.exiled.add(resident);
						ctx.emit("exiled", { agent: resident, by });
						return { ok: true as const };
					},
				}),
			],
		}),
	);
}

function replyText(outcome: ToolOutcome): string {
	return outcome.ok ? outcome.reply : outcome.detail === undefined || outcome.detail === "" ? outcome.code : `${outcome.code}: ${outcome.detail}`;
}

/** Plays `minutes` minutes: each minute the model's steps, the residents' ballots, then the gamemaker's calls, in the minute's last turn. */
export async function playRealChannels(options: {
	readonly model: FragmentModel;
	readonly passwords: Readonly<Record<string, string>>;
	readonly city: string;
	readonly minutes: number;
	readonly steps: Readonly<Record<number, readonly ModelStep[]>>;
	readonly ballots: Readonly<Record<number, readonly { readonly agent: string; readonly yes: boolean }[]>>;
	readonly calls: Readonly<Record<number, readonly GamemakerCall[]>>;
}): Promise<RealChannelsRun> {
	const { model } = options;
	const story = {
		residents: model.residents,
		minutes: options.minutes,
		mechanics: [
			standoffTribunal.with({ ...HOLDOUT_RULE, author: "COURIER" }),
			probe.with(),
			channels.with({ city: options.city }),
			ledger.with({ startPoints: 10 }),
			marks.with(),
			namesStandIn(new Map<string, string>()).with(),
			...standIns(model, options.passwords).map((mechanic) => mechanic.with()),
		],
		residentTools: ["tribunalVote"],
		gamemakerTools: ["callTribunal", "drawLot", "announceTribunal", "permaDeath"],
	};
	// The real mechanics read their own prompt folders, the probe its own.
	const host = createHost({ ...storyOptions(story), prompts: createPromptLookup({ mechanics: { ...mechanicPromptFolders(), probe: SUPPORT_PROMPTS } }) });
	host.start();
	const replies: string[] = [];
	let turns = 0;
	const agent: TurnTaker = async (turn) => {
		turns += 1;
		if (turns < model.residents.length) return;
		turns = 0;
		for (const step of options.steps[turn.minute] ?? []) step(model);
		for (const ballot of options.ballots[turn.minute] ?? []) replies.push(`${ballot.agent} ${replyText(await host.call(`resident:${ballot.agent}`, "tribunalVote", { yes: ballot.yes }))}`);
		for (const call of options.calls[turn.minute] ?? []) replies.push(`gamemaker ${call.name} ${replyText(await host.call("gamemaker", call.name, call.args))}`);
	};
	while (host.ended === undefined) await host.playMinute(agent);
	return { host, replies };
}

/** The new host's lines of the holdout and of the note desk and board. */
export function newLines(run: RealChannelsRun): { readonly holdout: readonly string[]; readonly channels: readonly string[] } {
	return { holdout: ownLines(run.host, ["standoff-tribunal"]), channels: ownLines(run.host, ["channels"]) };
}
