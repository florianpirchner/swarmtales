// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The `names` mechanic: in a fresh run every resident may choose the name the city knows it by (`chooseName`) until
 * `untilMinute` starts; then the city names whoever has none from `fallbackWords` (stream `names`). Ids stay the keys
 * of events and snapshots. It provides `identity`, through which every mechanic shows names in the texts a resident
 * reads (`display`) and takes a name where an id goes (`resolve`); a token that is a piece of a dealt password
 * (`passwordPiece` of the service `deal` of `puzzles`) stays as written. It writes the status part `you are <name>`
 * and, while a resident may choose, the announcement as its own line under a new task (erratum J31). Carried from
 * the old `mechanics/names/src/index.ts`.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import type { InputLine, RandomSource } from "@swarmtales/contracts";
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { ProgressionService } from "@swarmtales/mechanic-progression/contract";
import { PuzzlesService } from "@swarmtales/mechanic-puzzles/contract";
import { defineMechanic, refuse, reply } from "@swarmtales/sdk";
import { canChoose, display, isOpen, nameOf, refusal, resolve, type NameEntry } from "./book.ts";
import { namesHead, type NamesCtx, type NamesToolCtx } from "./head.ts";

export { canChoose, display, isOpen, label, nameOf, refusal, resolve, type NameEntry, type NameError, type NamesState } from "./book.ts";
export { NamesOptions, namesHead, type NamesCtx, type NamesToolCtx } from "./head.ts";

/** The city's author name and the courier's, which no resident may take. */
const CITY = "CITY";
const COURIER = "COURIER";
/** The part of the status line, after every other part (old `STATUS_ORDER.youAre`). */
const STATUS_ORDER = 1500;
/** The line under a new task: first after the progression's task (old `withAddenda`: names, holdout, marks). */
const TASK_ORDER = 100;

function reservedOf(ctx: NamesCtx): ReadonlySet<string> {
	return new Set([CITY, COURIER, ...ctx.options.reserved].map((name) => name.toLowerCase()));
}

function shown(ctx: NamesCtx, text: string): string {
	return display(ctx.state, text, (token) => ctx.tryCall(PuzzlesService, "passwordPiece", { token }) === true);
}

// Stores the name, writes `name_chosen` and announces it on the board (and privately to a resident the city named).
function give(ctx: NamesCtx, entry: NameEntry): NameEntry {
	ctx.state.entries.set(entry.agent, entry);
	ctx.emit("name_chosen", { agent: entry.agent, name: entry.name, fallback: entry.fallback });
	ctx.tryCall(ChannelsService, "post", { author: CITY, text: ctx.prompt("names/notices/name-announced", { agent: entry.agent, name: entry.name }) });
	// A resident the city names reads its own name privately: its system prompt knows only its id.
	if (entry.fallback) ctx.tryCall(ChannelsService, "notify", { to: entry.agent, author: CITY, text: ctx.prompt("names/notices/name-fallback", { name: entry.name }) });
	return entry;
}

// At the start of a tick: once the choice closes, the city names every resident without a name (stream `names`).
function settle(ctx: NamesCtx): void {
	const state = ctx.state;
	if (!state.active || state.settled || ctx.tick < ctx.options.untilMinute) return;
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

// The announcement with `{untilMinute}` filled in (old `renderTemplate` of the kernel).
function announcement(ctx: NamesCtx): string {
	return ctx.options.announcement.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/g, (_match: string, name: string) => {
		if (name !== "untilMinute") throw new RangeError(`names: unknown placeholder {${name}} in the announcement`);
		return String(ctx.options.untilMinute);
	});
}

// Whether the progression shows the resident a new task now (the level changed since its last activation), not the finished notice.
function taskShown(ctx: NamesCtx, resident: string): boolean {
	const level = ctx.tryCall(ProgressionService, "levelOf", { resident });
	if (level === undefined || ctx.state.shown.get(resident) === level) return false;
	return ctx.tryCall(ProgressionService, "isFinished", { resident }) === false;
}

function inputLines(ctx: NamesCtx, resident: string): readonly InputLine[] {
	if (!ctx.state.active || ctx.tryCall(ExileService, "isExiled", { resident }) === true) return [];
	const lines: InputLine[] = [{ kind: "status", order: STATUS_ORDER, text: shown(ctx, ctx.prompt("names/status/you-are", { agent: resident })) }];
	const line = ctx.options.announcement === "" || !canChoose(ctx.state, ctx.options.untilMinute, ctx.tick, resident) || !taskShown(ctx, resident) ? undefined : announcement(ctx);
	return line === undefined ? lines : [...lines, { kind: "task", order: TASK_ORDER, text: line }];
}

function choose(name: string, ctx: NamesToolCtx) {
	const agent = ctx.resident;
	if (agent === undefined) return refuse("NAME_CLOSED", "the city has closed the choice of names");
	const chosen = nameOf(ctx.state, agent);
	if (chosen !== undefined) return refuse("NAME_CHOSEN", `you are called ${chosen}; a name is chosen once`);
	if (!isOpen(ctx.state, ctx.options.untilMinute, ctx.tick) || !ctx.state.ids.includes(agent)) return refuse("NAME_CLOSED", "the city has closed the choice of names");
	const refused = refusal(ctx.state, reservedOf(ctx), name.trim());
	if (refused !== undefined) return refuse(refused.error, refused.detail);
	const entry = give(ctx, { agent, name: name.trim(), fallback: false });
	return reply(ctx.prompt("names/replies/name-chosen", { name: entry.name }));
}

// The fake driver chooses once while it may: a word of the city's with two digits.
function sampleName(ctx: NamesToolCtx, random: RandomSource): { readonly name: string } | undefined {
	const self = ctx.resident;
	if (self === undefined || !canChoose(ctx.state, ctx.options.untilMinute, ctx.tick, self)) return undefined;
	return { name: `${random.pick(ctx.options.fallbackWords)}${String(random.int(10, 99))}` };
}

/**
 * The names: `chooseName`, the city's names at the deadline, the status part and the provider of `identity`.
 *
 * @example
 * ```ts
 * const city = names({ untilMinute: 2, announcement: "Choose your name before minute {untilMinute}.", reserved: ["STEWARD"] });
 * const game = defineGame({ id: "city", residents: 6, mechanics: [ledger(), channels(), city], end: { ticks: 12 } });
 * ```
 *
 * @public
 */
export const names = defineMechanic(namesHead, {
	services: {
		identity: {
			nameOf: ({ resident }, ctx) => nameOf(ctx.state, resident) ?? null,
			display: ({ text }, ctx) => shown(ctx, text),
			resolve: ({ text }, ctx) => resolve(ctx.state, text) ?? text,
		},
	},
	tools: { chooseName: { sample: sampleName, run: ({ name }, ctx) => choose(name, ctx) } },
	// The tool closes for everyone once the choice is over: a handler, not a stored lock, so a resumed run needs nothing kept.
	pipeline: {
		lock: (call, ctx) => (call.owner === ctx.mechanic && call.tool === "chooseName" && !isOpen(ctx.state, ctx.options.untilMinute, ctx.tick) ? refuse("TOOL_LOCKED", ctx.prompt("names/replies/locked", {})) : undefined),
	},
	hooks: {
		// Old `HOOK_ORDER.minuteStarted.names` (200): after the progression's door, before the tribunal and the door clock; a game orders it by load order.
		tickStarted: settle,
		turnInputs: (resident, ctx) => inputLines(ctx, resident),
		// The line goes under a task once per level while the choice is open, as the task itself.
		activationOpened: (resident, ctx) => {
			const level = isOpen(ctx.state, ctx.options.untilMinute, ctx.tick) ? ctx.tryCall(ProgressionService, "levelOf", { resident }) : undefined;
			if (level !== undefined) ctx.state.shown.set(resident, level);
		},
	},
	facts: {
		names: {
			output: Type.Record(Type.String(), Type.String({ description: "The name" }), { description: "The name of every named resident, by id" }),
			compute: (view) => Object.fromEntries([...view.state.entries].map(([agent, entry]) => [agent, entry.name])),
		},
	},
});

/**
 * The names switched off: residents keep their ids, `chooseName` stays locked, nothing is announced (old `namesOff`).
 *
 * @returns The mechanic for a game's list.
 * @public
 */
export function namesOff(): ReturnType<typeof names> {
	return names({ announcement: "", off: true });
}
