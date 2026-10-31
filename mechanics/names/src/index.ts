/**
 * The `names` mechanic (carve step 1, team T1, docs/design/carve-team-T1.md). In a fresh run every
 * resident may choose the name the city knows it by (`chooseName`) until `untilMinute` starts;
 * then the city names whoever has none from `fallbackWords`. IDs stay the keys of events and
 * snapshots: the presentation shows names in every text a caller reads (`display`) and takes a
 * name where an id goes (`resolve`). Copied from packages/engine/src/names.ts and world.ts
 * (`chooseName`, `resolveResident`, `display`, `#announceName`).
 */
import { Type } from "typebox";
import { Parse } from "typebox/value";
import type { ContextOf } from "@swarmtales/contracts";
import { defineHead, defineMechanic, refuse, reply } from "@swarmtales/kernel";
import { ChannelsApi, ExileApi, INPUT_KINDS, NamesApi, PuzzlesApi, STATUS_ORDER } from "@swarmtales/mechanic-shared";
import { display, isOpen, label, nameOf, refusal, resolve, type NameEntry, type NamesState } from "./book.ts";

/** The city's author name (kernel `CITY`, copied: a mechanic takes only the authoring calls from the kernel). */
const CITY = "CITY";
const COURIER = "COURIER";
/** Parameters that name a resident; each takes a name as well as an ID (old `RESIDENT_PARAMS`, tools/tool.ts). */
const RESIDENT_PARAMS: readonly string[] = ["target", "agent", "accused", "leader", "to"];

const Entry = Type.Object({ agent: Type.String(), name: Type.String(), fallback: Type.Boolean() });
const Slice = Type.Object({ entries: Type.Array(Entry), settled: Type.Boolean() });
/** The version-0 slice the legacy converter cuts out of the old world: `{ names }`. */
const LegacySlice = Type.Object({ names: Slice });

export const namesHead = defineHead({
	id: "names",
	summary: "Names residents chose, for texts and arguments.",
	options: Type.Object({
		untilMinute: Type.Integer({ minimum: 0, default: 2, description: "The minute at whose start the city names whoever has not chosen." }),
		announcement: Type.String({ default: "", description: "Added to the first task while a resident may choose; placeholder {untilMinute}." }),
		fallbackWords: Type.Array(Type.String({ minLength: 1 }), { minItems: 1, default: ["Stone", "Ash", "Reed", "Flint", "Moss", "Wren"], description: "Words of the names the city gives, letters only, so a name stays within 16 characters." }),
		reserved: Type.Array(Type.String(), { default: [], description: "Names nobody may take besides the system authors: the cast, the city." }),
	}),
	state: ({ residents }): NamesState => ({ ids: residents, entries: new Map<string, NameEntry>(), settled: false }),
	events: { name_chosen: Type.Object({ agent: Type.String(), name: Type.String(), fallback: Type.Boolean() }) },
	prompts: { "tools/chooseName": [], "replies/name-chosen": ["name"], "replies/locked": [], "competitor/status/you-are": ["agent"] },
	provides: [NamesApi],
	uses: [PuzzlesApi, ChannelsApi, ExileApi],
});

type Ctx = ContextOf<typeof namesHead>;

function reservedOf(ctx: Ctx): ReadonlySet<string> {
	return new Set([CITY, COURIER, ...ctx.options.reserved].map((name) => name.toLowerCase()));
}

/** Stores the name, writes `name_chosen` and announces it on the board (and privately to a resident the city named). */
function give(ctx: Ctx, entry: NameEntry): NameEntry {
	ctx.state.entries.set(entry.agent, entry);
	ctx.emit("name_chosen", { agent: entry.agent, name: entry.name, fallback: entry.fallback });
	ctx.tryCall(ChannelsApi, "post", { author: CITY, text: `${entry.agent} is now called ${entry.name}.` });
	// A resident the city names reads its own name privately: its system prompt knows only its ID.
	if (entry.fallback) ctx.tryCall(ChannelsApi, "notify", { to: entry.agent, author: CITY, text: `You chose no name in time; the city calls you ${entry.name}.` });
	return entry;
}

/** At the start of `minute`: once the choice closes, the city names every resident without a name (stream `names`). */
function settle(ctx: Ctx): void {
	const state = ctx.state;
	if (state.settled || ctx.minute < ctx.options.untilMinute) return;
	state.settled = true;
	const rng = ctx.rng("names");
	const reserved = reservedOf(ctx);
	for (const agent of state.ids) {
		if (state.entries.has(agent)) continue;
		for (;;) {
			const name = `${rng.pick(ctx.options.fallbackWords)}-${String(rng.int(1000, 9999))}`;
			if (refusal(state, reserved, name) !== undefined) continue;
			give(ctx, { agent, name, fallback: true });
			break;
		}
	}
}

/** `raw` with every resident parameter, at any depth (a will's bequests), replaced by the ID it stands for. */
function withResidents(raw: unknown, find: (value: string) => string): unknown {
	if (Array.isArray(raw)) return raw.map((item: unknown) => withResidents(item, find));
	if (typeof raw !== "object" || raw === null) return raw;
	return Object.fromEntries(Object.entries(raw).map(([key, value]: [string, unknown]) => [key, typeof value === "string" && RESIDENT_PARAMS.includes(key) ? find(value) : withResidents(value, find)]));
}

export const names = defineMechanic(namesHead, (kit) => ({
	services: [
		kit.provide(NamesApi, {
			hasNames: () => true,
			nameOf: (input, ctx) => nameOf(ctx.state, input.resident) ?? null,
			labelOf: (input, ctx) => label(ctx.state, input.resident),
			resolve: (input, ctx) => resolve(ctx.state, input.text) ?? input.text,
		}),
	],
	tools: [
		kit.tool({
			name: "chooseName",
			description: "tools/chooseName",
			parameters: Type.Object({ name: Type.String({ description: "Your name, e.g. Mira", minLength: 1, maxLength: 40 }) }),
			suggest: ["resident"],
			execute: ({ name }, ctx) => {
				const agent = ctx.resident;
				if (agent === undefined) return refuse("NAME_CLOSED", "the city has closed the choice of names");
				const chosen = nameOf(ctx.state, agent);
				if (chosen !== undefined) return refuse("NAME_CHOSEN", `you are called ${chosen}; a name is chosen once`);
				if (!isOpen(ctx.state, ctx.options.untilMinute, ctx.minute) || !ctx.state.ids.includes(agent)) return refuse("NAME_CLOSED", "the city has closed the choice of names");
				const refused = refusal(ctx.state, reservedOf(ctx), name.trim());
				if (refused !== undefined) return refuse(refused.error, refused.detail);
				const entry = give(ctx, { agent, name: name.trim(), fallback: false });
				return reply(ctx.prompt("replies/name-chosen", { name: entry.name }));
			},
		}),
	],
	// The tool closes for everyone once the choice is over: a handler, not a stored lock, so a resumed run needs nothing kept.
	pipeline: {
		lock: (call, ctx) => (call.tool === "chooseName" && !isOpen(ctx.state, ctx.options.untilMinute, ctx.minute) ? refuse("TOOL_LOCKED", ctx.prompt("replies/locked", {})) : undefined),
	},
	hooks: {
		minuteStarted: settle,
		turnInputs: (resident, ctx) => {
			if (ctx.tryCall(ExileApi, "isExiled", { resident }) === true) return [];
			return [{ kind: INPUT_KINDS[1].kind, order: STATUS_ORDER.youAre, text: ctx.prompt("competitor/status/you-are", { agent: resident }) }];
		},
	},
	presentation: {
		resolve: (call, ctx) => withResidents(call.params, (value) => resolve(ctx.state, value) ?? value),
		display: (text, ctx) => display(ctx.state, text, (token) => ctx.tryCall(PuzzlesApi, "passwordPiece", { token }) === true),
	},
	facts: {
		names: kit.fact(Type.Record(Type.String(), Type.String()), (view) => Object.fromEntries([...view.state.entries].map(([agent, entry]) => [agent, entry.name]))),
	},
	snapshot: kit.snapshot({
		version: 1,
		schema: Slice,
		save: (state) => ({ entries: [...state.entries.values()].map((entry) => ({ agent: entry.agent, name: entry.name, fallback: entry.fallback })), settled: state.settled }),
		load: (data, setup) => ({ ids: setup.residents, entries: new Map(data.entries.map((entry) => [entry.agent, entry])), settled: data.settled }),
		migrations: { 0: (old) => Parse(LegacySlice, old).names },
	}),
}));
