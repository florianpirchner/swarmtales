// SPDX-License-Identifier: Apache-2.0
/**
 * Shared by the progression tests: the options a game of the oracle files gives the mechanic (from its story file),
 * the submissions of a file, and stand-ins for the pieces (`level-pieces`) and the receipts (`receipt-source`). The
 * stand-in of the pieces knows each code from the file: a team's code is what a member of the team submitted and the
 * file answered with `correct`; the teams are drawn by the planner of `puzzles`, as the files drew them.
 */
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { Type, type Static } from "typebox";
import { Value } from "typebox/value";
import { ReceiptSourceService } from "@swarmtales/mechanic-contracts";
import { channels } from "@swarmtales/mechanic-channels";
import { ledger } from "@swarmtales/mechanic-ledger";
import { defineGame, defineHead, defineMechanic, type Game, type MechanicUse } from "@swarmtales/sdk";
import { PuzzlesOptions, TeamPlanner } from "@swarmtales/mechanic-puzzles";
import { readOracle, type Oracle } from "@swarmtales/testkit";
import { LevelPiecesService, progression } from "../src/index.ts";

/** The options of `progression` as a game writes them. */
export type Options = NonNullable<Parameters<typeof progression>[0]>;

const ORACLES = resolve(import.meta.dirname, "../../../oracles");

const Story = Type.Object({
	run: Type.Object({ survivors: Type.Integer(), startPoints: Type.Integer() }),
	rules: Type.Object({ penalty: Type.Array(Type.Integer()), blame: Type.Optional(Type.Object({ penalty: Type.Array(Type.Integer()) })), maxAttemptsPerWindow: Type.Integer(), attemptWindowMinutes: Type.Integer() }),
	levels: Type.Array(
		Type.Object({ number: Type.Integer(), title: Type.String(), reward: Type.Number(), tools: Type.Array(Type.String()), task: Type.String(), team: PuzzlesOptions.properties.levels.items.properties.team, opensAt: Type.Optional(Type.Integer()), puzzle: Type.Object({ kind: Type.String(), overlap: Type.Optional(Type.Integer()), digits: Type.Optional(Type.Integer()) }) }),
	),
	finishedNotice: Type.String(),
});
type StoryData = Static<typeof Story>;

/** One oracle file and its story. */
export interface Fixture {
	readonly oracle: Oracle;
	readonly story: StoryData;
}

/** Reads `oracles/<game>/<file>.json` and the story file it names. */
export function fixture(game: string, file: string): Fixture {
	const oracle = readOracle(resolve(ORACLES, game, `${file}.json`));
	const definition = Value.Parse(Type.Object({ file: Type.String() }), oracle.setup.definition);
	return { oracle, story: Value.Parse(Story, JSON.parse(readFileSync(resolve(ORACLES, game, definition.file), "utf8"))) };
}

/** The options a game of the story gives `progression`, as the old command line mapped them (R2-D17). */
export function optionsOf({ story, oracle }: Fixture): Options {
	const effective = Value.Parse(Type.Object({ effective: Type.Object({ lastLevel: Type.Integer() }) }), oracle.setup.definition).effective;
	return {
		levels: story.levels.map(({ number, title, reward, tools, task, opensAt }) => ({ number, title, reward, tools, task, ...(opensAt === undefined ? {} : { opensAt }) })),
		lastLevel: effective.lastLevel,
		penalty: story.rules.penalty,
		...(story.rules.blame === undefined ? {} : { blamePenalty: story.rules.blame.penalty }),
		maxAttemptsPerWindow: story.rules.maxAttemptsPerWindow,
		attemptWindowMinutes: story.rules.attemptWindowMinutes,
		survivors: story.run.survivors,
		finishedNotice: story.finishedNotice,
	};
}

const Params = Type.Object({ level: Type.Optional(Type.Integer()), code: Type.Optional(Type.String()) });

/** One call of the file, with the minute it was made in. */
export interface FileCall {
	readonly minute: number;
	readonly resident: string;
	readonly tool: string;
	readonly params: Static<typeof Params>;
	readonly answer: string;
}

const answerOf = (entry: { readonly ok: boolean; readonly reply?: string; readonly code?: string; readonly detail?: string }): string => (entry.ok ? (entry.reply ?? "") : `${entry.code ?? ""}: ${entry.detail ?? ""}`);

/** The calls of `tools` in the file, in file order. */
export function callsOf(oracle: Oracle, tools: readonly string[]): readonly FileCall[] {
	let minute = 0;
	return oracle.timeline.flatMap((entry) => {
		if (entry.k === "minute") minute = entry.minute;
		if (entry.k !== "call" || !tools.includes(entry.tool) || !entry.actor.startsWith("resident:")) return [];
		return [{ minute, resident: entry.actor.slice("resident:".length), tool: entry.tool, params: Value.Parse(Params, entry.params), answer: answerOf(entry) }];
	});
}

const Dealt = Type.Object({ level: Type.Integer(), holdings: Type.Array(Type.Object({ agent: Type.String(), team: Type.Integer(), fragment: Type.String() })) });
const Issued = Type.Object({ receipt: Type.String(), kind: Type.String(), text: Type.String() });

function eventsOf(oracle: Oracle, source: string, type: string): readonly unknown[] {
	return oracle.timeline.flatMap((entry) => (entry.k === "event" && entry.source === source && entry.type === type ? [entry.payload] : []));
}

/** Stands in for `puzzles`: the codes, teams and fragments of the file. A level without a known code takes `0` digits (additive) or `?`. */
export function piecesOf({ oracle, story }: Fixture): MechanicUse {
	const deals = eventsOf(oracle, "puzzles", "fragments_dealt").map((payload) => Value.Parse(Dealt, payload));
	const holding = (resident: string, level: number) => deals.find((deal) => deal.level === level)?.holdings.find((entry) => entry.agent === resident);
	let planner: TeamPlanner | undefined;
	const teamOf = (rng: ConstructorParameters<typeof TeamPlanner>[2], resident: string, level: number) => {
		planner ??= new TeamPlanner(story.levels, oracle.setup.residents, rng);
		return planner.teamOf(level, resident);
	};
	const team = (resident: string, level: number): readonly string[] => {
		const own = holding(resident, level);
		return own === undefined ? [resident] : (deals.find((deal) => deal.level === level)?.holdings.filter((entry) => entry.team === own.team).map((entry) => entry.agent) ?? [resident]);
	};
	const solved = callsOf(oracle, ["submitSolution"]).filter((call) => !call.answer.includes(":")).map((call) => ({ ...call, code: call.params.code ?? "" }));
	const spec = (level: number) => story.levels.find((entry) => entry.number === level)?.puzzle;
	const solutionOf = (resident: string, level: number): string =>
		solved.find((call) => call.params.level === level && team(resident, level).includes(call.resident))?.code ?? (spec(level)?.kind === "additive" ? "0".repeat(spec(level)?.digits ?? 6) : "?");
	// The length of a fragment password: its fragments less the overlap at each seam.
	const lengthOf = (resident: string, level: number): number => {
		const fragments = team(resident, level).map((member) => holding(member, level)?.fragment ?? "");
		return fragments.reduce((sum, fragment) => sum + fragment.length, 0) - (spec(level)?.overlap ?? 0) * (fragments.length - 1);
	};
	const head = defineHead({ id: "puzzles", package: "@test/puzzles", summary: "Test: the pieces of an oracle file.", provides: [LevelPiecesService] });
	return defineMechanic(head, {
		services: {
			"level-pieces": {
				deal: () => null,
				solutionOf: ({ resident, level }) => solutionOf(resident, level),
				kindOf: ({ level }) => (spec(level)?.kind === "additive" ? "additive" : "fragments"),
				teamOf: ({ resident, level }, ctx) => {
					const { members, leader } = teamOf(ctx.rng, resident, level);
					return { members: [...members], leader };
				},
				taskValues: ({ resident, level }) => ({ length: String(lengthOf(resident, level)), overlap: String(spec(level)?.overlap ?? 0), fragment: holding(resident, level)?.fragment ?? "", digits: String(spec(level)?.digits ?? ""), factors: "" }),
				holders: () => [],
			},
		},
	})();
}

/** Stands in for `receipts`: the id of a solved level is the id the file issued for it; the texts are none. */
export function receiptsOf({ oracle }: Fixture): MechanicUse {
	const ids = new Map<string, string>();
	for (const payload of eventsOf(oracle, "receipts", "receipt_issued")) {
		const issued = Value.Parse(Issued, payload);
		const found = /^R-\d+: (\S+) solved level (\d+),/.exec(issued.text);
		if (issued.kind === "levelUp" && found !== null) ids.set(`${found[1] ?? ""}:${found[2] ?? ""}`, issued.receipt);
	}
	const head = defineHead({ id: "receipts", package: "@test/receipts", summary: "Test: the receipt ids of an oracle file.", provides: [ReceiptSourceService] });
	return defineMechanic(head, { services: { "receipt-source": { ofTransfer: () => null, ofMessage: () => null, ofLevel: ({ resident, level }) => ids.get(`${resident}:${String(level)}`) ?? null, textsOf: () => [] } } })();
}

/** The game of an oracle file: the ledger with the story's start points, the channels, the stand-ins and the progression. */
export function gameOf(fix: Fixture, more: readonly MechanicUse[] = []): Game {
	return defineGame({
		id: "progression-test",
		seed: fix.oracle.seed,
		residents: [...fix.oracle.setup.residents],
		mechanics: [ledger({ startPoints: fix.story.run.startPoints }), channels(), piecesOf(fix), receiptsOf(fix), progression(optionsOf(fix)), ...more],
		scheduler: { id: "turns", options: { passes: 1, activation: "always", order: "roster" } },
		end: { ticks: Value.Parse(Type.Object({ minutes: Type.Integer() }), fix.oracle.setup).minutes },
	});
}

const Chosen = Type.Object({ agent: Type.String(), name: Type.String() });

/** A text of the file with every name the file's residents chose replaced by the id: the run plays without `names`. */
export function unnamed(oracle: Oracle): (text: string) => string {
	const names = eventsOf(oracle, "names", "name_chosen").map((payload) => Value.Parse(Chosen, payload));
	return (text) => names.reduce((done, { agent, name }) => done.split(name).join(agent), text);
}
