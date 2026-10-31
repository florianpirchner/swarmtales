/**
 * The `marks` mechanic (carve step 3, team T1, docs/design/carve-team-T1.md): the message allowance
 * of SPEC §7. It answers whether a resident can afford a channel, what a message costs, books the
 * price after a message was sent (`marks_spent`), shows what is left in the status line and the
 * marks terms under a task. The allowance resets whenever a resident changes level: the level is
 * `ProgressionApi.levelOf` every time (the mechanic keeps no copy; `startLevel` answers only where
 * no progression runs). The refill is booked lazily on every read, as before, so it needs no job.
 * Copied from packages/engine/src/marks.ts and the `#canAfford`/`#spend`/`#withMarks` of world.ts.
 */
import { Type } from "typebox";
import { Parse } from "typebox/value";
import type { ContextOf } from "@swarmtales/contracts";
import { defineHead, defineMechanic } from "@swarmtales/kernel";
import { INPUT_KINDS, MarksApi, MarksChannel, ProgressionApi, STATUS_ORDER } from "@swarmtales/mechanic-shared";
import { activeOn, canAfford, priceOf, runWide, spend, statusOf, termsOn, type Allowance, type Book, type MarksState } from "./book.ts";

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
const Slice = Type.Object({ allowances: Type.Array(AllowanceSlice) });
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
		startLevel: Type.Integer({ minimum: 1, default: 1, description: "The level every resident is on where no progression mechanic answers `levelOf`." }),
	}),
	state: (): MarksState => ({ allowances: new Map<string, Allowance>() }),
	events: { marks_spent: Type.Object({ agent: Type.String(), channel: MarksChannel, remaining: Type.Number() }) },
	prompts: {
		"competitor/status/marks": ["remaining", "budget"],
		"task/marks-level": ["budget", "board", "group", "dm", "receipt"],
		"task/marks-level-refill": ["budget", "board", "group", "dm", "receipt", "regain"],
		"task/marks-run": ["budget", "board", "group", "dm", "receipt"],
	},
	provides: [MarksApi],
	uses: [ProgressionApi],
});

type Ctx = ContextOf<typeof marksHead>;

function bookOf(ctx: Ctx): Book {
	const { rules, levels, startLevel } = ctx.options;
	return {
		rules,
		overrides: new Map(levels.map((entry) => [entry.level, entry.perLevel])),
		levelOf: (resident) => ctx.tryCall(ProgressionApi, "levelOf", { resident }) ?? startLevel,
		minute: ctx.minute,
	};
}

/** "1 mark per minute", "1 mark every 3 minutes", "2 marks every 3 minutes" (old `refillText`). */
function regainText(marks: number, everyMinutes: number): string {
	const amount = `${String(marks)} ${marks === 1 ? "mark" : "marks"}`;
	return everyMinutes === 1 ? `${amount} per minute` : `${amount} every ${String(everyMinutes)} minutes`;
}

export const marks = defineMechanic(marksHead, (kit) => ({
	services: [
		kit.provide(MarksApi, {
			canAfford: (input, ctx) => canAfford(ctx.state, bookOf(ctx), input.resident, input.channel),
			left: (input, ctx) => statusOf(ctx.state, bookOf(ctx), input.resident) ?? null,
			spend: (input, ctx) => {
				const book = bookOf(ctx);
				// A free channel books nothing and says nothing; the status is still the answer.
				if (priceOf(book, book.levelOf(input.resident), input.channel) === 0) return statusOf(ctx.state, book, input.resident) ?? null;
				const status = spend(ctx.state, book, input.resident, input.channel);
				if (status !== undefined) ctx.emit("marks_spent", { agent: input.resident, channel: input.channel, remaining: status.remaining });
				return status ?? null;
			},
			priceOf: (input, ctx) => {
				const book = bookOf(ctx);
				const level = book.levelOf(input.resident);
				return activeOn(book, level) ? priceOf(book, level, input.channel) : null;
			},
			taskLine: (input, ctx) => {
				const book = bookOf(ctx);
				if (!activeOn(book, input.level)) return null;
				const { budget, prices, refill } = termsOn(book, input.level);
				const values = { budget, board: prices.board, group: prices.group, dm: prices.dm, receipt: prices.receipt };
				if (runWide(book)) return ctx.prompt("task/marks-run", values);
				return refill === undefined ? ctx.prompt("task/marks-level", values) : ctx.prompt("task/marks-level-refill", { ...values, regain: regainText(refill.marks, refill.everyMinutes) });
			},
		}),
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
		}),
		load: (data) => ({ allowances: new Map(data.allowances.map((entry) => [entry.agent, { level: entry.level, remaining: entry.remaining, ...(entry.since === undefined ? {} : { since: entry.since }) }])) }),
		migrations: { 0: (old) => ({ allowances: Parse(LegacySlice, old).marks }) },
	}),
}));
