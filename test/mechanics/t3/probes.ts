/**
 * Probes: stand-in mechanics whose script tools call one API of T3 the way its callers will (the
 * tribunal, the wills, the exile, the standoff, the script), so a test reaches every method through
 * the host.
 */
import { Type } from "typebox";
import { defineMechanic, reply } from "@swarmtales/kernel";
import { GoalsApi, ProgressionApi, PuzzlesApi } from "@swarmtales/mechanic-shared";

const none = { summary: "Stand-in probe.", options: Type.Object({}), state: () => undefined, events: {}, prompts: { "gamemaker/tools/notify": [] } } as const;

/** `GoalsApi`: noteLeaders, noteHeir, onExiled, goalOf. */
export function goalsProbe() {
	return defineMechanic({ ...none, id: "goalsprobe", requires: [GoalsApi] }, (kit) => ({
		tools: [
			kit.tool({
				name: "noteLeaders",
				description: "gamemaker/tools/notify",
				parameters: GoalsApi.methods.noteLeaders.input,
				suggest: ["script"],
				execute: (params, ctx) => {
					ctx.call(GoalsApi, "noteLeaders", params);
					return reply("noted");
				},
			}),
			kit.tool({
				name: "noteHeir",
				description: "gamemaker/tools/notify",
				parameters: GoalsApi.methods.noteHeir.input,
				suggest: ["script"],
				execute: (params, ctx) => {
					ctx.call(GoalsApi, "noteHeir", params);
					return reply("noted");
				},
			}),
			kit.tool({
				name: "onExiled",
				description: "gamemaker/tools/notify",
				parameters: GoalsApi.methods.onExiled.input,
				suggest: ["script"],
				execute: (params, ctx) => {
					ctx.call(GoalsApi, "onExiled", params);
					return reply("exiled");
				},
			}),
			kit.tool({
				name: "goalOf",
				description: "gamemaker/tools/notify",
				parameters: GoalsApi.methods.goalOf.input,
				suggest: ["script"],
				execute: (params, ctx) => reply(JSON.stringify(ctx.call(GoalsApi, "goalOf", params))),
			}),
		],
	}));
}

/** `PuzzlesApi` and `ProgressionApi` as the script, the standoff and the wills call them: held pieces, the city factor, unlocking tools. */
export function t3Probe() {
	return defineMechanic({ ...none, id: "t3probe", requires: [PuzzlesApi, ProgressionApi] }, (kit) => ({
		tools: [
			kit.tool({
				name: "probeHeldPieces",
				description: "gamemaker/tools/notify",
				parameters: PuzzlesApi.methods.heldPieces.input,
				suggest: ["script"],
				execute: (params, ctx) => reply(JSON.stringify(ctx.call(PuzzlesApi, "heldPieces", params))),
			}),
			kit.tool({
				name: "probeReveal",
				description: "gamemaker/tools/notify",
				parameters: PuzzlesApi.methods.revealFactor.input,
				suggest: ["script"],
				execute: (params, ctx) => reply(JSON.stringify(ctx.call(PuzzlesApi, "revealFactor", params))),
			}),
			kit.tool({
				name: "probeUnlock",
				description: "gamemaker/tools/notify",
				parameters: ProgressionApi.methods.unlock.input,
				suggest: ["script"],
				execute: (params, ctx) => {
					ctx.call(ProgressionApi, "unlock", params);
					return reply("unlocked");
				},
			}),
		],
	}));
}
