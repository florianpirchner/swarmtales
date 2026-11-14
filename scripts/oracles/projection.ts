/**
 * The rules-level projection of an oracle (`oracles/README.md`, "Three levels of comparison"): what a port must
 * reproduce whatever its scheduler and its texts are. It keeps, per actor, the calls in the actor's own order with
 * their verdict (`ok`, `code`, `stage`), and the events of the mechanics in the order they were written, together
 * with the four `core` events that state a rule (`RULE_EVENTS_OF_CORE`). It drops the turn, skip, minute and resume
 * entries, the other events of source `core`, and every text (`reply`, `detail`, `inputs`).
 */
import type { Oracle, OracleEntry } from "./format.ts";

/** The events of source `core` that belong to the rules level: a resident is out, the run is stopped, a guard's verdict, a question to a model role. */
export const RULE_EVENTS_OF_CORE: ReadonlySet<string> = new Set(["resident_suspended", "referee_intervened", "guard_verdict", "role_asked"]);

export interface RulesCall {
	readonly tool: string;
	readonly params: unknown;
	readonly ok: boolean;
	readonly code?: string;
	readonly stage?: string;
}

export interface RulesEvent {
	readonly source: string;
	readonly type: string;
	readonly actor: string;
	readonly audience?: readonly string[];
	readonly payload: unknown;
}

export interface RulesProjection {
	/** Per actor, its calls in its own order. Calls of two actors are not ordered against each other. */
	readonly calls: Readonly<Record<string, readonly RulesCall[]>>;
	/** The mechanics' events and the rule events of `core`, in timeline order. */
	readonly events: readonly RulesEvent[];
	readonly end?: Oracle["end"];
}

export function rulesProjection(oracle: { readonly timeline: readonly OracleEntry[]; readonly end?: Oracle["end"] }): RulesProjection {
	const calls: Record<string, RulesCall[]> = {};
	const events: RulesEvent[] = [];
	for (const entry of oracle.timeline) {
		if (entry.k === "call") {
			const { code, stage } = entry;
			const verdict = entry.ok ? {} : { ...(code === undefined ? {} : { code }), ...(stage === undefined ? {} : { stage }) };
			(calls[entry.actor] ??= []).push({ tool: entry.tool, params: entry.params, ok: entry.ok, ...verdict });
		} else if (entry.k === "event" && (entry.source !== "core" || RULE_EVENTS_OF_CORE.has(entry.type))) {
			events.push({ source: entry.source, type: entry.type, actor: entry.actor, ...(entry.audience === undefined ? {} : { audience: entry.audience }), payload: entry.payload });
		}
	}
	const sorted = Object.fromEntries(Object.entries(calls).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
	return { calls: sorted, events, ...(oracle.end === undefined ? {} : { end: oracle.end }) };
}

/** The projection as text, one call or event per line, for a diff. */
export function rulesText(projection: RulesProjection): string {
	const lines: string[] = [];
	for (const [actor, list] of Object.entries(projection.calls)) for (const call of list) lines.push(`call ${actor} ${JSON.stringify(call)}`);
	for (const event of projection.events) lines.push(`event ${JSON.stringify(event)}`);
	if (projection.end !== undefined) lines.push(`end ${JSON.stringify(projection.end)}`);
	return `${lines.join("\n")}\n`;
}

/**
 * The projection for a port that is not driven by the file's call order but plays the same players under its own
 * scheduler: per actor, its calls and the events written in its name, each in the actor's own order. The order
 * between two actors is dropped. It is stable for a game in which one resident acts at a time (liar's dice, a
 * tic-tac-toe with one resident per side); with teams or simultaneous moves another order is another run.
 */
export function rulesByActor(projection: RulesProjection): Readonly<Record<string, { readonly calls: readonly RulesCall[]; readonly events: readonly RulesEvent[] }>> {
	const actors: Record<string, { calls: RulesCall[]; events: RulesEvent[] }> = {};
	const of = (actor: string): { calls: RulesCall[]; events: RulesEvent[] } => (actors[actor] ??= { calls: [], events: [] });
	for (const [actor, calls] of Object.entries(projection.calls)) of(actor).calls.push(...calls);
	for (const event of projection.events) of(event.actor).events.push(event);
	return Object.fromEntries(Object.entries(actors).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}
