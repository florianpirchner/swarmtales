/**
 * The old `World` around the holdout tribunal, through the shared APIs: who lacks what at which
 * open fragment door (world.ts `#lackingFacts`, `#presentAtDoors`), the strike's own part
 * (`#onStruck`: exile, then the struck resident's fragments to everyone before an open door), and
 * the status parts (turn-input.ts `holdoutParts`).
 */
import { ChannelsApi, ExileApi, NamesApi, ProgressionApi, PuzzlesApi } from "@swarmtales/mechanic-shared";
import { HoldoutCourt } from "./court.ts";
import type { Ctx } from "./head.ts";
import { renderTemplate } from "./template.ts";
import type { BlockerFact, HoldoutPorts, Presence } from "./types.ts";

const CITY = "CITY";

function alive(ctx: Ctx): readonly string[] {
	return ctx.call(ExileApi, "alive", {});
}

function levelOf(ctx: Ctx, resident: string): number {
	return ctx.call(ProgressionApi, "levelOf", { resident });
}

function hasPassed(ctx: Ctx, resident: string, level: number): boolean {
	return ctx.call(ProgressionApi, "hasPassed", { resident, level });
}

function lacking(ctx: Ctx, level: number, holder: string): readonly string[] {
	return ctx.call(PuzzlesApi, "lacking", { level, holder });
}

/** `Mira (A03)` once named, the bare id before (old `labelOf`). */
export function labelOf(ctx: Ctx, resident: string): string {
	return ctx.tryCall(NamesApi, "labelOf", { resident }) ?? resident;
}

/** Old `#lackingFacts`: everyone who lacks a fragment now, by holder and open fragment door. */
function lackingFacts(ctx: Ctx): readonly BlockerFact[] {
	const facts: BlockerFact[] = [];
	for (const level of ctx.call(PuzzlesApi, "openFragmentDoors", {})) {
		for (const holder of alive(ctx)) {
			const missing = lacking(ctx, level, holder);
			if (missing.length > 0) facts.push({ door: level, blocker: holder, lacking: missing, passed: hasPassed(ctx, holder, level) });
		}
	}
	return facts;
}

/** Old `#presentAtDoors`: every resident in the city at an open fragment door it has reached. */
function presentAtDoors(ctx: Ctx): readonly Presence[] {
	return ctx.call(PuzzlesApi, "openFragmentDoors", {}).flatMap((door) => alive(ctx).filter((agent) => levelOf(ctx, agent) >= door).map((agent) => ({ door, agent })));
}

/** Old `#onStruck` after the court: exiled for good (exile writes `exiled`, voids the goal, ends a seal), then the released fragments. */
function onStruck(ctx: Ctx, agent: string): void {
	ctx.call(ExileApi, "strike", { resident: agent, by: "holdout" });
	const text = ctx.options.texts.released;
	for (const resident of alive(ctx)) {
		const level = levelOf(ctx, resident);
		if (ctx.call(PuzzlesApi, "kindOf", { level }) !== "fragments" || !ctx.call(ProgressionApi, "isOpenOnClock", { level }) || hasPassed(ctx, resident, level)) continue;
		const fragment = ctx.call(PuzzlesApi, "inherited", { resident, level }).find((entry) => entry.from === agent)?.fragment;
		if (fragment === undefined) continue;
		ctx.call(ChannelsApi, "notify", { to: resident, author: CITY, text: renderTemplate(text, { struck: labelOf(ctx, agent), fragments: `door ${String(level)}: ${fragment}` }) });
	}
}

export function portsFor(ctx: Ctx): HoldoutPorts {
	return {
		minute: () => ctx.minute,
		alive: () => alive(ctx),
		blockers: () => lackingFacts(ctx),
		present: () => presentAtDoors(ctx),
		lacking: (door, holder) => lacking(ctx, door, holder),
		label: (agent) => labelOf(ctx, agent),
		post: (author, body) => {
			ctx.call(ChannelsApi, "post", { author, text: body });
		},
		notify: (agent, author, body) => {
			ctx.call(ChannelsApi, "notify", { to: agent, author, text: body });
		},
		emit: (type, payload) => {
			ctx.emit(type, payload);
		},
		pick: (lot, sorted) => ctx.rng("holdout-lot", lot).pick(sorted),
		struck: (agent) => {
			onStruck(ctx, agent);
		},
	};
}

export function courtFor(ctx: Ctx): HoldoutCourt {
	return new HoldoutCourt(ctx.options, portsFor(ctx), ctx.state.data);
}

/** Old `holdoutParts`: the accused sees whom it still owes its fragment, a voter its ballot; nobody another's. */
export function holdoutParts(ctx: Ctx, agent: string): readonly string[] {
	const session = ctx.state.data.session;
	if (session === undefined || ctx.call(ExileApi, "standing", { resident: agent }).kind !== "alive") return [];
	const accused = session.accused === agent ? "you" : session.accused;
	if (session.stage === "grace" || session.stage === "vote") {
		const court = courtFor(ctx);
		const owed = session.accused === agent ? ` · ${ctx.prompt("competitor/status/holdout-owed", { door: session.door, lacking: court.lackingNow().join(", ") })}` : "";
		const until = session.until;
		if (session.stage === "grace") return [ctx.prompt("competitor/status/holdout-grace", { accused, until, owed })];
		if (session.accused === agent) return [ctx.prompt("competitor/status/holdout-accused", { vote: session.vote, maxVotes: ctx.options.maxVotes, until, owed })];
		const ballot = court.ballotOf(agent);
		const cast = ballot === undefined ? ctx.prompt("competitor/status/holdout-not-voted", {}) : ctx.prompt("competitor/status/holdout-ballot", { ballot: ballot ? "yes" : "no" });
		return [ctx.prompt("competitor/status/holdout-voter", { accused, vote: session.vote, maxVotes: ctx.options.maxVotes, until, cast })];
	}
	return [ctx.prompt("competitor/status/holdout-strike", { accused })];
}
