/**
 * Compile-time checks of the mechanic API (`tsc` runs this file; nothing executes it): options,
 * state, events, prompts, APIs and tool names flow from the declarations into the code that uses
 * them, and every misuse below is a type error.
 */
import { Type } from "typebox";
import { defineCoreStory, defineMechanic, reply } from "@swarmtales/kernel";
import { channels } from "./proof/channels.ts";
import { LedgerApi, ledger } from "./proof/ledger.ts";

export const probe = defineMechanic(
	{
		id: "probe",
		summary: "Type probes.",
		requires: [LedgerApi],
		options: Type.Object({ factor: Type.Integer({ default: 2, description: "A number." }) }),
		state: ({ options }) => ({ total: options.factor }),
		events: { probed: Type.Object({ n: Type.Integer() }) },
		prompts: { "probe/tool": [], "probe/said": ["who"] },
	},
	(kit) => ({
		tools: [
			kit.tool({
				name: "probeTool",
				description: "probe/tool",
				parameters: Type.Object({ n: Type.Integer() }),
				execute: (params, ctx) => {
					const total: number = ctx.state.total + params.n * ctx.options.factor;
					// @ts-expect-error: no such option
					const { missing }: { readonly missing: number } = ctx.options;
					ctx.emit("probed", { n: total + missing });
					// @ts-expect-error: an event the mechanic did not declare
					ctx.emit("unknown", { n: 1 });
					// @ts-expect-error: a payload that does not match the schema
					ctx.emit("probed", { n: "one" });
					const balance: number = ctx.call(LedgerApi, "balance", { resident: "A01" });
					// @ts-expect-error: the input of a method is typed
					ctx.call(LedgerApi, "balance", { who: "A01" });
					// @ts-expect-error: a method the API does not have
					ctx.call(LedgerApi, "steal", {});
					const said = ctx.prompt("probe/said", { who: "A01" });
					// @ts-expect-error: a missing prompt variable
					ctx.prompt("probe/said", {});
					// @ts-expect-error: a prompt the mechanic did not declare
					ctx.prompt("probe/other", {});
					return reply(`${said} ${String(balance)}`);
				},
			}),
			kit.tool({
				name: "badTool",
				// @ts-expect-error: a tool description must be a declared prompt without variables
				description: "probe/said",
				parameters: Type.Object({}),
				execute: () => reply(""),
			}),
		],
		listeners: [
			kit.listen(ledger, "points_transferred", (payload, ctx) => {
				ctx.emit("probed", { n: payload.amount });
			}),
			// @ts-expect-error: the ledger declares no such event
			kit.listen(ledger, "points_stolen", () => undefined),
		],
	}),
);

export const unrequired = defineMechanic(
	{ id: "unrequired", summary: "Calls an API it does not require.", options: Type.Object({}), state: () => undefined, events: {} },
	() => ({
		hooks: {
			runStarted: (ctx) => {
				// @ts-expect-error: the API is not in `requires`
				ctx.call(LedgerApi, "balance", { resident: "A01" });
			},
		},
	}),
);

export const typedStory = defineCoreStory({
	id: "typed",
	seed: 1,
	minutes: 1,
	residents: 2,
	mechanics: [ledger.with({ start: 4 }), channels.with()],
	grants: { resident: ["transferPoints", "sendDM"], gamemaker: ["postBoard"] },
	locked: ["sendDM"],
	tools: { postBoard: { rules: [{ kind: "maxLength", param: "text", max: 10 }] } },
});

export const wrongGrant = defineCoreStory({
	id: "wrong",
	seed: 1,
	minutes: 1,
	residents: 2,
	mechanics: [ledger.with()],
	// @ts-expect-error: postBoard belongs to channels, which this story does not load
	grants: { resident: ["postBoard"] },
});

// @ts-expect-error: an option of the wrong type
export const wrongOption = ledger.with({ start: "ten" });

// @ts-expect-error: an option the mechanic does not have
export const unknownOption = ledger.with({ speed: 3 });
