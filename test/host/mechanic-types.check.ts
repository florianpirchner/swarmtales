/**
 * Compile-time checks of the mechanic API (`tsc` runs this file; nothing executes it): options,
 * state, events, prompts, APIs and tool names flow from the declarations into the code that uses
 * them, and every misuse below is a type error.
 */
import { Type } from "typebox";
import { defineCoreStory, defineEvents, defineHead, defineMechanic, defineTool, reply } from "@swarmtales/kernel";
import type { ContextOf, ToolContextOf, ViewOf } from "@swarmtales/contracts";
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

const Poke = defineTool("poke", Type.Object({ who: Type.String() }));
const Shared = defineEvents("ledger", { points_transferred: Type.Object({ amount: Type.Integer() }) });

export const sharedListener = defineMechanic(
	{ id: "shared", summary: "Listens to declared events.", options: Type.Object({}), state: () => undefined, events: { noted: Type.Object({ n: Type.Integer() }) } },
	(kit) => ({
		listeners: [
			kit.listen(
				Shared,
				"points_transferred",
				(payload, ctx) => {
					ctx.emit("noted", { n: payload.amount });
				},
				{ immediate: true },
			),
			// @ts-expect-error: the declaration has no such event
			kit.listen(Shared, "points_stolen", () => undefined),
		],
	}),
);

export const optional = defineMechanic(
	{ id: "optional", summary: "Uses the ledger when it is loaded.", uses: [LedgerApi], options: Type.Object({}), state: () => undefined, events: {} },
	() => ({
		hooks: {
			runStarted: (ctx) => {
				const balance: number | undefined = ctx.tryCall(LedgerApi, "balance", { resident: "A01" });
				const loaded: boolean = ctx.has(LedgerApi);
				// @ts-expect-error: a used API may be absent, so it is called with tryCall
				ctx.call(LedgerApi, "balance", { resident: "A01" });
				// @ts-expect-error: the output of tryCall may be undefined
				const sure: number = ctx.tryCall(LedgerApi, "balance", { resident: "A01" });
				return loaded ? (balance ?? sure) : undefined;
			},
		},
	}),
);

export const unrequired = defineMechanic(
	{ id: "unrequired", summary: "Calls an API it does not require.", options: Type.Object({}), state: () => undefined, events: {} },
	() => ({
		hooks: {
			runStarted: (ctx) => {
				// @ts-expect-error: the API is not in `requires`
				ctx.call(LedgerApi, "balance", { resident: "A01" });
				// @ts-expect-error: another mechanic's attributes are read through its API, never from its bag
				ctx.residents.attribute("A01", "mood", "ledger");
				// @ts-expect-error: tryCall is for APIs in `uses`
				ctx.tryCall(LedgerApi, "balance", { resident: "A01" });
				ctx.stage(Poke, { who: "A01" });
				// @ts-expect-error: staged parameters are typed by the tool's declaration
				ctx.stage(Poke, { who: 1 });
				// @ts-expect-error: a tool is staged by its declaration, not by a bare name
				ctx.stage("poke", { who: "A01" });
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

/** `ContextOf` types a helper outside the body from a head declared apart. */
const helperHead = defineHead({
	id: "helped",
	summary: "A head declared apart.",
	requires: [LedgerApi],
	options: Type.Object({ bonus: Type.Integer({ default: 1, description: "A number." }) }),
	state: () => ({ seen: 0 }),
	events: { helped: Type.Object({ n: Type.Integer() }) },
	prompts: { "helped/tool": [] },
});

function help(ctx: ContextOf<typeof helperHead>): number {
	ctx.state.seen += ctx.options.bonus;
	ctx.emit("helped", { n: ctx.state.seen });
	// @ts-expect-error: an event the head did not declare
	ctx.emit("other", { n: 1 });
	// @ts-expect-error: no such option
	const { gone }: { readonly gone: number } = ctx.options;
	return ctx.call(LedgerApi, "balance", { resident: "A01" }) + gone;
}

function toolHelp(ctx: ToolContextOf<typeof helperHead>): string {
	return ctx.resident ?? ctx.actor;
}

function viewHelp(view: ViewOf<typeof helperHead>): number {
	// @ts-expect-error: a view has no emit
	const emit: unknown = view.emit;
	return emit === undefined ? view.state.seen : 0;
}

export const helped = defineMechanic(helperHead, (kit) => ({
	tools: [kit.tool({ name: "help", description: "helped/tool", parameters: Type.Object({}), execute: (_params, ctx) => reply(`${toolHelp(ctx)} ${String(help(ctx))}`) })],
	facts: { seen: kit.fact(Type.Integer(), (view) => viewHelp(view)) },
	snapshot: kit.snapshot({ version: 1, schema: Type.Object({ seen: Type.Integer() }), save: (state) => ({ seen: state.seen }), load: (data) => ({ seen: data.seen }) }),
}));
