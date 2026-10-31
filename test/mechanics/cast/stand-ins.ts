/**
 * Stand-ins for the cast tests: the progression provider of team T3 (only `firstSolveMinute`
 * answers from a script, the rest is inert) and a driver that makes the script's calls to
 * `CastApi`. Named so in the tests that rely on them.
 */
import { Type } from "typebox";
import { defineMechanic } from "@swarmtales/kernel";
import { CastApi, CastExtrasApi, ProgressionApi } from "@swarmtales/mechanic-shared";
import { reply } from "@swarmtales/kernel";

/** `solves`: the minute the first resident passed each level; seen only from the next minute on, as real receipts are. */
export function progressionStandIn(solves: ReadonlyMap<number, number>) {
	return defineMechanic(
		{
			id: "progression",
			summary: "Stand-in progression: the first solves of a script.",
			options: Type.Object({}),
			state: (): { old: unknown } => ({ old: null }),
			events: {},
			provides: [ProgressionApi],
		},
		(kit) => ({
			services: [
				kit.provideSome(ProgressionApi, {
					levelOf: () => 1,
					isFinished: () => false,
					hasPassed: () => false,
					passed: () => [],
					lastProgress: () => null,
					currentAct: () => 1,
					actStart: () => null,
					door: () => null,
					doorShut: () => false,
					openDoor: () => false,
					releaseDoor: () => null,
					unlock: () => null,
					ranking: () => [],
					holdersBehind: () => [],
					firstSolveMinute: (input, ctx) => {
						const minute = solves.get(input.level);
						return minute !== undefined && minute < ctx.minute ? minute : null;
					},
				}),
			],
			snapshot: kit.snapshot({
				version: 1,
				schema: Type.Object({ old: Type.Unknown() }),
				save: (state) => ({ old: state.old }),
				load: (data) => ({ old: data.old }),
				migrations: { 0: (old: unknown) => ({ old }) },
			}),
		}),
	);
}

const Op = Type.Union([
	Type.Object({ op: Type.Literal("setLevel"), cast: Type.String(), level: Type.Integer() }),
	Type.Object({ op: Type.Literal("reveal"), cast: Type.String() }),
	Type.Object({ op: Type.Literal("retire"), cast: Type.String() }),
	Type.Object({ op: Type.Literal("escrow"), cast: Type.String(), to: Type.String(), amount: Type.Number() }),
	Type.Object({
		op: Type.Literal("startCollection"),
		into: Type.String(),
		cast: Type.String(),
		first: Type.Integer(),
		untilMinute: Type.Integer(),
		distinctSenders: Type.Boolean(),
		afterSolve: Type.Optional(Type.Object({ level: Type.Integer(), minutes: Type.Integer() })),
	}),
	Type.Object({ op: Type.Literal("shortenCollection"), into: Type.String(), untilMinute: Type.Integer() }),
	Type.Object({ op: Type.Literal("revealCollection"), into: Type.String(), header: Type.Optional(Type.String()) }),
	Type.Object({ op: Type.Literal("drawLottery"), into: Type.String(), salt: Type.String() }),
	Type.Object({ op: Type.Literal("isActive"), cast: Type.String() }),
	Type.Object({ op: Type.Literal("active") }),
]);

/** The script's side: one tool, `driveCast`, with an operation per `CastApi` method that the script calls. */
export const castDriver = defineMechanic(
	{ id: "script", summary: "Test driver: calls CastApi.", options: Type.Object({}), state: () => undefined, events: {}, requires: [CastApi, CastExtrasApi], prompts: { "tools/readBoard": [] } },
	(kit) => ({
		tools: [
			kit.tool({
				name: "driveCast",
				description: "tools/readBoard",
				parameters: Op,
				execute: (params, ctx) => {
					switch (params.op) {
						case "setLevel":
							return reply(JSON.stringify(ctx.call(CastApi, "setLevel", { cast: params.cast, level: params.level })));
						case "reveal":
							return reply(JSON.stringify(ctx.call(CastApi, "reveal", { cast: params.cast })));
						case "retire":
							return reply(JSON.stringify(ctx.call(CastApi, "retire", { cast: params.cast })));
						case "escrow":
							return reply(JSON.stringify(ctx.call(CastApi, "escrow", { cast: params.cast, to: params.to, amount: params.amount })));
						case "startCollection":
							return reply(JSON.stringify(ctx.call(CastApi, "startCollection", { into: params.into, cast: params.cast, first: params.first, untilMinute: params.untilMinute, distinctSenders: params.distinctSenders, ...(params.afterSolve === undefined ? {} : { afterSolve: params.afterSolve }) })));
						case "shortenCollection":
							return reply(JSON.stringify(ctx.call(CastApi, "shortenCollection", { into: params.into, untilMinute: params.untilMinute })));
						case "revealCollection":
							return reply(JSON.stringify(ctx.call(CastApi, "revealCollection", { into: params.into, ...(params.header === undefined ? {} : { header: params.header }) })));
						case "drawLottery":
							return reply(JSON.stringify(ctx.call(CastApi, "drawLottery", { into: params.into, salt: params.salt })));
						case "isActive":
							return reply(JSON.stringify(ctx.call(CastApi, "isActive", { cast: params.cast })));
						case "active":
							return reply(JSON.stringify(ctx.call(CastExtrasApi, "active", {})));
						default:
							return params satisfies never;
					}
				},
			}),
		],
	}),
);
