/**
 * The `marks` mechanic (carve step 3, team T1, docs/design/carve-team-T1.md): the message allowance
 * of SPEC §7. It answers whether a resident can afford a channel, books the price after a message
 * was sent (`marks_spent`) and shows what is left in the status line. The allowance resets whenever
 * a resident changes level: the mechanic follows the levels through `level_up` (and the
 * `startLevel` option), since the frozen `MarksApi` carries no level. The refill is booked lazily
 * on every read, as before, so it needs no job. Copied from packages/engine/src/marks.ts and the
 * `#canAfford`/`#spend` of world.ts.
 */
import { Type } from "typebox";
import { Parse } from "typebox/value";
import type { ContextOf } from "@swarmtales/contracts";
import { defineHead, defineMechanic } from "@swarmtales/kernel";
import { INPUT_KINDS, LedgerApi, MarksApi, MarksChannel, ProgressionEvents, STATUS_ORDER } from "@swarmtales/mechanic-shared";
import { canAfford, priceOf, spend, statusOf, type Allowance, type Book, type MarksState } from "./book.ts";

const count = (description: string) => Type.Integer({ minimum: 0, description });
const Prices = Type.Object(
	{ board: count("Marks a board post costs."), group: count("Marks a group post costs."), dm: count("Marks a DM costs."), receipt: Type.Optional(count("Marks a shown receipt costs; 1 when left out.")) },
	{ description: "Marks per channel." },
);
const Refill = Type.Object({ marks: count("Marks that come back."), everyMinutes: count("Minutes between two refills.") }, { description: "Marks regained on a level, up to its allowance." });
const Range = Type.Object(
	{
		fromLevel: count("The first level of the range."),
		perLevel: Type.Optional(count("The range's allowance; the base rules' when left out.")),
		prices: Type.Optional(Prices),
		refill: Type.Optional(Refill),
	},
	{ description: "A level range with its own allowance, prices and refill." },
);
const Rules = Type.Object(
	{
		fromLevel: count("The first level marks apply on."),
		perLevel: Type.Optional(count("The allowance per level, reset whenever a resident changes level.")),
		perRun: Type.Optional(count("One allowance for the whole run instead, never reset and never refilled (Whispers).")),
		prices: Prices,
		ranges: Type.Optional(Type.Array(Range, { description: "Later level ranges, ascending." })),
	},
	{ description: "The story's message allowance." },
);

const AllowanceSlice = Type.Object({ agent: Type.String(), level: Type.Integer(), remaining: Type.Number(), since: Type.Optional(Type.Integer()) });
const Slice = Type.Object({ allowances: Type.Array(AllowanceSlice), levels: Type.Array(Type.Object({ agent: Type.String(), level: Type.Integer() })) });
/** The version-0 slice the legacy converter cuts out of the old world: `{ marks }`, the old `MarksSnapshot`. */
const LegacySlice = Type.Object({ marks: Type.Array(AllowanceSlice) });

export const marksHead = defineHead({
	id: "marks",
	summary: "The marks a message costs and their refill.",
	options: Type.Object({
		rules: Type.Optional(Rules),
		levels: Type.Array(Type.Object({ level: Type.Integer({ minimum: 1, description: "The level." }), perLevel: count("Its allowance, in place of the rules'.") }), {
			default: [],
			description: "Allowances of single levels (the story's `levels[].marks.perLevel`).",
		}),
		startLevel: Type.Integer({ minimum: 1, default: 1, description: "The level every resident starts on, until a `level_up` says otherwise." }),
	}),
	state: (): MarksState => ({ allowances: new Map<string, Allowance>(), levels: new Map<string, number>() }),
	events: { marks_spent: Type.Object({ agent: Type.String(), channel: MarksChannel, remaining: Type.Number() }) },
	prompts: { "competitor/status/marks": ["remaining", "budget"] },
	provides: [MarksApi],
	requires: [LedgerApi],
});

type Ctx = ContextOf<typeof marksHead>;

function bookOf(ctx: Ctx): Book {
	const { rules, levels, startLevel } = ctx.options;
	return { rules, overrides: new Map(levels.map((entry) => [entry.level, entry.perLevel])), startLevel, minute: ctx.minute };
}

export const marks = defineMechanic(marksHead, (kit) => ({
	services: [
		kit.provide(MarksApi, {
			canAfford: (input, ctx) => canAfford(ctx.state, bookOf(ctx), input.resident, input.channel),
			left: (input, ctx) => statusOf(ctx.state, bookOf(ctx), input.resident) ?? null,
			spend: (input, ctx) => {
				const book = bookOf(ctx);
				const level = ctx.state.levels.get(input.resident) ?? book.startLevel;
				// A free channel books nothing and says nothing; the status is still the answer.
				if (priceOf(book, level, input.channel) === 0) return statusOf(ctx.state, book, input.resident) ?? null;
				const status = spend(ctx.state, book, input.resident, input.channel);
				if (status !== undefined) ctx.emit("marks_spent", { agent: input.resident, channel: input.channel, remaining: status.remaining });
				return status ?? null;
			},
		}),
	],
	listeners: [
		kit.listen(
			ProgressionEvents,
			"level_up",
			(payload, ctx) => {
				ctx.state.levels.set(payload.agent, payload.to);
			},
			{ immediate: true },
		),
	],
	hooks: {
		turnInputs: (resident, ctx) => {
			const status = statusOf(ctx.state, bookOf(ctx), resident);
			return status === undefined ? [] : [{ kind: INPUT_KINDS[1].kind, order: STATUS_ORDER.marks, text: ctx.prompt("competitor/status/marks", { remaining: status.remaining, budget: status.budget }) }];
		},
	},
	facts: {
		remaining: kit.fact(Type.Record(Type.String(), Type.Number()), (view) => Object.fromEntries([...view.state.allowances].map(([agent, allowance]) => [agent, allowance.remaining]))),
	},
	snapshot: kit.snapshot({
		version: 1,
		schema: Slice,
		save: (state) => ({
			allowances: [...state.allowances].map(([agent, allowance]) => ({ agent, level: allowance.level, remaining: allowance.remaining, ...(allowance.since === undefined ? {} : { since: allowance.since }) })),
			levels: [...state.levels].map(([agent, level]) => ({ agent, level })),
		}),
		load: (data) => ({
			allowances: new Map(data.allowances.map((entry) => [entry.agent, { level: entry.level, remaining: entry.remaining, ...(entry.since === undefined ? {} : { since: entry.since }) }])),
			levels: new Map(data.levels.map((entry) => [entry.agent, entry.level])),
		}),
		// Levels are not in the old snapshot: a resident with an allowance is on the level of its allowance.
		migrations: { 0: (old) => ({ allowances: Parse(LegacySlice, old).marks, levels: Parse(LegacySlice, old).marks.map((entry) => ({ agent: entry.agent, level: entry.level })) }) },
	}),
}));
