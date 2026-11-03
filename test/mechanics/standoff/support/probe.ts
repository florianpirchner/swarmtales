/**
 * A probe mechanic: it `uses` the five APIs of team T4 and runs the function a test hands it as the
 * script's tool `probe`, so a test calls `ctx.tryCall(StandoffApi, ...)` the way another mechanic
 * would, through the host (with `service_called` and causes), and reads what came back.
 */
import { Type } from "typebox";
import type { Host, ToolContextOf } from "@swarmtales/contracts";
import { defineHead, defineMechanic, reply } from "@swarmtales/kernel";
import { ExileApi, SealApi, StandoffApi, StandoffTribunalApi, TribunalApi } from "@swarmtales/mechanic-shared";

const head = defineHead({
	id: "probe",
	summary: "Test probe: runs a function as a tool.",
	options: Type.Object({}),
	state: (): undefined => undefined,
	events: {},
	uses: [StandoffApi, ExileApi, TribunalApi, SealApi, StandoffTribunalApi],
	prompts: { "probe/tools/probe": [] },
});

export type ProbeContext = ToolContextOf<typeof head>;

let action: ((ctx: ProbeContext) => void) | undefined;

export const probe = defineMechanic(head, (kit) => ({
	tools: [
		kit.tool({
			name: "probe",
			description: "probe/tools/probe",
			parameters: Type.Object({}),
			suggest: ["script"],
			execute: (_params, ctx) => {
				action?.(ctx);
				return reply("probed");
			},
		}),
	],
}));

/** Runs `run` inside the host as the script and returns what it returned. */
export async function runProbe<T>(host: Host, run: (ctx: ProbeContext) => T): Promise<T> {
	const out: [T][] = [];
	action = (ctx) => {
		out.push([run(ctx)]);
	};
	const outcome = await host.call("script", "probe", {});
	action = undefined;
	if (!outcome.ok) throw new Error(`probe refused: ${outcome.code} ${outcome.detail ?? ""}`);
	const first = out[0];
	if (first === undefined) throw new Error("the probe did not run");
	return first[0];
}
