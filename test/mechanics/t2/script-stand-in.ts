/** The script's side for the T2 phase tests: opens petitions through `PetitionsApi`. */
import { Type } from "typebox";
import { defineMechanic, reply } from "@swarmtales/kernel";
import { PetitionsApi } from "@swarmtales/mechanic-shared";

export const scriptStandIn = defineMechanic(
	{ id: "script", summary: "Stand-in script: opens petitions.", options: Type.Object({}), state: () => undefined, events: {}, requires: [PetitionsApi], prompts: { "tools/signPetition": [] } },
	(kit) => ({
		tools: [
			kit.tool({
				name: "openPetition",
				description: "tools/signPetition",
				parameters: Type.Object({ id: Type.String(), threshold: Type.Object({ count: Type.Integer() }), deadlineMinute: Type.Integer(), visibility: Type.Union([Type.Literal("public"), Type.Literal("secret")]) }),
				execute: (params, ctx) => reply(JSON.stringify(ctx.call(PetitionsApi, "open", { ...params, text: `Text of ${params.id}.` }))),
			}),
		],
	}),
);
