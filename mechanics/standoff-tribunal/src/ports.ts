// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The old `World` around the holdout tribunal, through the services of other mechanics (old `ports.ts`): who lacks
 * what at which open fragment door (`holdout-pieces` of `puzzles`), who stands where (`exile`), the levels
 * (`progression`), the names (`identity`), and the posts and notices (`channels`); and the status parts (old
 * `holdoutParts`) and the rule under a new task.
 */
import type { InputLine } from "@swarmtales/contracts";
import { IdentityService } from "@swarmtales/mechanic-contracts";
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { ProgressionService } from "@swarmtales/mechanic-progression/contract";
import { HoldoutPiecesService } from "./contract.ts";
import { HoldoutCourt } from "./court.ts";
import type { Ctx } from "./head.ts";
import type { BlockerFact, HoldoutPorts, Presence } from "./types.ts";

/** The holdout part of the status line, after every other part (old `STATUS_ORDER.holdout`). */
const STATUS_ORDER = 1400;
/** The rule under a new task: after the progression's task and a name line, before the terms of `marks` (300). */
const TASK_ORDER = 200;

const alive = (ctx: Ctx): readonly string[] => ctx.call(ExileService, "alive", {});
const levelOf = (ctx: Ctx, resident: string): number => ctx.call(ProgressionService, "levelOf", { resident });
const lacking = (ctx: Ctx, level: number, holder: string): readonly string[] => ctx.call(HoldoutPiecesService, "lacking", { level, holder });
const doors = (ctx: Ctx): readonly number[] => ctx.call(HoldoutPiecesService, "openFragmentDoors", {});

/**
 * `Mira (A03)` once named, the bare id before (old `labelOf` of `names`).
 *
 * @param ctx - The context.
 * @param resident - The resident.
 * @returns The label.
 */
export function labelOf(ctx: Ctx, resident: string): string {
	const name = ctx.tryCall(IdentityService, "nameOf", { resident }) ?? null;
	return name === null ? resident : `${name} (${resident})`;
}

// Old `#lackingFacts`: everyone who lacks a fragment now, by holder and open fragment door.
function lackingFacts(ctx: Ctx): readonly BlockerFact[] {
	return doors(ctx).flatMap((door) =>
		alive(ctx).flatMap((holder) => {
			const missing = lacking(ctx, door, holder);
			return missing.length === 0 ? [] : [{ door, blocker: holder, lacking: missing, passed: ctx.call(ProgressionService, "hasPassed", { resident: holder, level: door }) }];
		}),
	);
}

// Old `#presentAtDoors`: every resident in the city at an open fragment door it has reached.
function presentAtDoors(ctx: Ctx): readonly Presence[] {
	return doors(ctx).flatMap((door) => alive(ctx).filter((agent) => levelOf(ctx, agent) >= door).map((agent) => ({ door, agent })));
}

/**
 * The ports of the court for this call; `posted` holds the message number of the last post on the board.
 *
 * @param ctx - The context.
 * @returns The ports and the number of the last post.
 */
export function portsFor(ctx: Ctx): HoldoutPorts & { readonly posted: () => number | undefined } {
	let posted: number | undefined;
	return {
		minute: () => ctx.tick,
		alive: () => alive(ctx),
		blockers: () => lackingFacts(ctx),
		present: () => presentAtDoors(ctx),
		lacking: (door, holder) => lacking(ctx, door, holder),
		label: (agent) => labelOf(ctx, agent),
		post: (author, text) => {
			posted = ctx.call(ChannelsService, "post", { author, text }).postSeq;
		},
		notify: (agent, author, text) => {
			ctx.call(ChannelsService, "notify", { to: agent, author, text });
		},
		emit: (type, payload) => {
			ctx.emit(type, payload);
		},
		pick: (lot, sorted) => ctx.rng("holdout-lot", lot).pick(sorted),
		posted: () => posted,
	};
}

/**
 * The court over the state, with the ports of this call.
 *
 * @param ctx - The context.
 * @param ports - The ports; fresh ones when left out.
 * @returns The court.
 */
export function courtFor(ctx: Ctx, ports: HoldoutPorts = portsFor(ctx)): HoldoutCourt {
	return new HoldoutCourt(ctx.options, ports, ctx.state.data);
}

// Old `holdoutParts`: the accused sees whom it still owes its fragment, a voter its ballot; nobody another's.
function holdoutParts(ctx: Ctx, agent: string): readonly string[] {
	const session = ctx.state.data.session;
	if (session === undefined || ctx.call(ExileService, "standing", { resident: agent }).kind !== "alive") return [];
	const accused = session.accused === agent ? "you" : session.accused;
	if (session.stage !== "grace" && session.stage !== "vote") return [ctx.prompt("standoff-tribunal/status/holdout-strike", { accused })];
	const court = courtFor(ctx);
	const owed = session.accused === agent ? ` · ${ctx.prompt("standoff-tribunal/status/holdout-owed", { door: session.door, lacking: court.lackingNow().join(", ") })}` : "";
	const until = session.until;
	if (session.stage === "grace") return [ctx.prompt("standoff-tribunal/status/holdout-grace", { accused, until, owed })];
	if (session.accused === agent) return [ctx.prompt("standoff-tribunal/status/holdout-accused", { vote: session.vote, maxVotes: ctx.options.maxVotes, until, owed })];
	return [ctx.prompt("standoff-tribunal/status/holdout-voter", { accused, vote: session.vote, maxVotes: ctx.options.maxVotes, until, cast: castOf(ctx, court.ballotOf(agent)) })];
}

// A voter's own ballot, or that it has not voted.
function castOf(ctx: Ctx, ballot: boolean | undefined): string {
	return ballot === undefined ? ctx.prompt("standoff-tribunal/status/holdout-not-voted", {}) : ctx.prompt("standoff-tribunal/status/holdout-ballot", { ballot: ballot ? "yes" : "no" });
}

// Whether the progression shows the task of the resident's level now (the old task carried the rule): a new level, not finished, its door open.
function taskShown(ctx: Ctx, resident: string, level: number): boolean {
	if (ctx.state.data.shown.get(resident) === level) return false;
	return !ctx.call(ProgressionService, "isFinished", { resident }) && ctx.call(ProgressionService, "isOpenOnClock", { level });
}

/**
 * The holdout part of the status line, and the rule under a new task (old `#withHoldoutRule`; erratum J31: a line of
 * its own, kind `task`).
 *
 * @param ctx - The context.
 * @param resident - The resident that is activated.
 * @returns The lines.
 */
export function holdoutLines(ctx: Ctx, resident: string): readonly InputLine[] {
	const lines: InputLine[] = holdoutParts(ctx, resident).map((text) => ({ kind: "status", order: STATUS_ORDER, text }));
	return taskShown(ctx, resident, levelOf(ctx, resident)) ? [...lines, { kind: "task", order: TASK_ORDER, text: ctx.options.texts.rule }] : lines;
}
