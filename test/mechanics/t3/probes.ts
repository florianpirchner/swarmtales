/**
 * Probes: stand-in mechanics whose script tools call one API of T3 the way its callers will (the
 * tribunal, the wills, the exile, the standoff, the script), so a test reaches every method through
 * the host.
 */
import { Type } from "typebox";
import { defineMechanic, reply } from "@swarmtales/kernel";
import { GoalsApi } from "@swarmtales/mechanic-shared";

const none = { summary: "Stand-in probe.", options: Type.Object({}), state: () => undefined, events: {}, prompts: { "standin/tool": [] } } as const;

/** `GoalsApi`: noteLeaders, noteHeir, onExiled, goalOf. */
export function goalsProbe() {
	return defineMechanic({ ...none, id: "goalsprobe", requires: [GoalsApi] }, (kit) => ({
		tools: [
			kit.tool({
				name: "noteLeaders",
				description: "standin/tool",
				parameters: GoalsApi.methods.noteLeaders.input,
				suggest: ["script"],
				execute: (params, ctx) => {
					ctx.call(GoalsApi, "noteLeaders", params);
					return reply("noted");
				},
			}),
			kit.tool({
				name: "noteHeir",
				description: "standin/tool",
				parameters: GoalsApi.methods.noteHeir.input,
				suggest: ["script"],
				execute: (params, ctx) => {
					ctx.call(GoalsApi, "noteHeir", params);
					return reply("noted");
				},
			}),
			kit.tool({
				name: "onExiled",
				description: "standin/tool",
				parameters: GoalsApi.methods.onExiled.input,
				suggest: ["script"],
				execute: (params, ctx) => {
					ctx.call(GoalsApi, "onExiled", params);
					return reply("exiled");
				},
			}),
			kit.tool({
				name: "goalOf",
				description: "standin/tool",
				parameters: GoalsApi.methods.goalOf.input,
				suggest: ["script"],
				execute: (params, ctx) => reply(JSON.stringify(ctx.call(GoalsApi, "goalOf", params))),
			}),
		],
	}));
}
