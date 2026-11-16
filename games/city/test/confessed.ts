// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The registered changes of addition 3 (`cityofkeys-act1-classifier-s7.json`; `oracles/cityofkeys/README.md`, "The
 * Confessor against the file"): the file as this platform writes it with the Confessor loaded. The harness drives a
 * Director by the calls of the file, and the file holds none of the Confessor (the old classifier wrote its events
 * itself), so the call of `interpret` is the one the Confessor's own `act` makes in each look: on the firings it took
 * in a run of the file, with the old model's answer of that round. The changes are those of the Confessor's port
 * (`mechanics/city-directors/test/confessor.test.ts`): one question per round, the number of a firing as the reference
 * in place of the old log `seq`, the events written by the tool of the mechanic `interpretations` (J173); and the look
 * after round r taken in the start slot of tick r with the gamemaker's (J125, J126), after a round without
 * statements too, where it asks nothing (P481).
 */
import { confessor } from "@swarmtales/city-directors";
import { KERNEL_EVENTS, type Envelope } from "@swarmtales/contracts";
import { parseTake, reply, type Firing } from "@swarmtales/sdk";
import { playOracle, type Oracle, type OracleEntry } from "@swarmtales/testkit";
import { Value } from "typebox/value";
import { gameOf } from "./support.ts";

type Entry = OracleEntry;
type Fields = Readonly<Record<string, unknown>>;
const OLD = "overseer:classifier";
const NAME = "confessor";
const ACTOR = `overseer:${NAME}`;
// J173: a round without an answer writes the Confessor's default message; the file's names the old tool call that failed.
const NO_ANSWER = "the classifier gave no answer";

const field = (value: unknown, name: string): unknown => (typeof value === "object" && value !== null ? Reflect.get(value, name) : undefined);
const fields = (value: unknown): Fields => (typeof value === "object" && value !== null ? Object.fromEntries(Object.entries(value)) : {});
const list = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);
const ofOld = (entry: Entry): boolean => entry.k === "event" && entry.actor === OLD;
const eventOf = (entry: Entry, type: string): Fields | undefined => (entry.k === "event" && entry.type === type ? fields(entry.payload) : undefined);
const director = (type: string): Entry => ({ k: "event", source: "core", type, actor: ACTOR, payload: { overseer: NAME } });

/** The old classifier's look after one round: its activation and the events it wrote. */
type Look = readonly Entry[];

// The file without the old classifier's looks, and its looks by round (the minutes before a look are its round).
function split(timeline: readonly Entry[]): { readonly rest: readonly Entry[]; readonly looks: ReadonlyMap<number, Look> } {
	const looks = new Map<number, Entry[]>();
	let minutes = 0;
	for (const entry of timeline) {
		if (entry.k === "minute") minutes++;
		if (ofOld(entry)) looks.set(minutes, [...(looks.get(minutes) ?? []), entry]);
	}
	return { rest: timeline.filter((entry) => !ofOld(entry)), looks };
}

/**
 * The firings of each take of the Confessor in a run.
 *
 * @param events - The log of the run.
 * @returns The firings by the tick of the take.
 */
export function confessorFirings(events: readonly Envelope[]): ReadonlyMap<number, readonly Firing[]> {
	const found = new Map<number, readonly Firing[]>();
	for (const event of events) {
		if (event.type !== "tool_result" || event.actor !== `director:${NAME}` || !Value.Check(KERNEL_EVENTS.tool_result, event.payload) || event.payload.as !== "take") continue;
		found.set(event.tick, parseTake(event.payload.reply)?.firings ?? []);
	}
	return found;
}

// The old references of a look as references of the round's statements here: a labelled statement of the file (its
// agent and source) is the first statement of the round with them that is not taken yet.
function refsOf(look: Look, statements: readonly unknown[]): ReadonlyMap<unknown, unknown> {
	const taken = new Set<unknown>();
	const refs = new Map<unknown, unknown>();
	const labelled = look.flatMap((entry): Fields[] => {
		const payload = eventOf(entry, "interpretation");
		return payload === undefined ? [] : [payload];
	});
	for (const payload of labelled) {
		const statement = statements.find((one) => !taken.has(one) && field(one, "agent") === payload.agent && field(one, "source") === payload.source);
		taken.add(statement);
		refs.set(payload.ref, field(statement, "ref"));
	}
	return refs;
}

// The old model's answer of a look with the references of this run; an unknown reference stays as it was.
function answerOf(look: Look, refs: ReadonlyMap<unknown, unknown>): unknown {
	const output = look.flatMap((entry) => eventOf(entry, "overseer_answered")?.output ?? []).at(0);
	return { items: list(field(output, "items")).map((item) => ({ ...fields(item), ref: refs.get(field(item, "ref")) ?? field(item, "ref") })) };
}

/** One look of the Confessor in the run: the tick, its question, and its call of `interpret` (none when it asks nothing). */
export interface Asked {
	readonly tick: number;
	readonly question: string;
	readonly params?: unknown;
}

/** One look as this platform writes it: the Confessor's call and the file's events with the references of this run. */
interface Played extends Asked {
	readonly events: readonly Entry[];
}

// The Confessor's own `input` and `act` on the firings of one look, with the old model's answer of its round (its
// fallback where the old model gave none).
async function played(oracle: Oracle, tick: number, firings: readonly Firing[], look: Look): Promise<Played> {
	const use = gameOf(oracle).directors?.find((one) => typeof one.use !== "string" && one.use.id === NAME);
	const options = confessor.parseOptions(use?.options);
	const facts = { "interpretations.residents": oracle.setup.residents.map((id) => ({ id, name: null })), "interpretations.history": [] };
	const ctx = { name: NAME, options, tick, firings, facts };
	const actOn = async (answer: unknown): Promise<unknown> => {
		let given: unknown;
		await confessor.act(answer, { ...ctx, call: (_tool, params) => ((given = params), Promise.resolve(reply("recorded"))) });
		return given;
	};
	// The fallback's call names the round's statements; the answer is read against them.
	const fallback = await actOn(confessor.fallback(ctx));
	const refs = refsOf(look, list(field(fallback, "statements")));
	const failed = look.length === 0 || look.some((entry) => eventOf(entry, "interpretation_error") !== undefined);
	const params = failed ? fallback : await actOn(answerOf(look, refs));
	const events = look.flatMap((entry): Entry[] => {
		if (entry.k !== "event" || entry.source === "core") return [];
		const payload = fields(entry.payload);
		const mapped = { ...payload, ...("ref" in payload ? { ref: refs.get(payload.ref) } : {}), ...("classifier" in payload ? { classifier: options.label } : {}), ...("message" in payload ? { message: NO_ANSWER } : {}) };
		return [{ ...entry, source: "interpretations", actor: ACTOR, payload: mapped }];
	});
	return { tick, question: confessor.input(ctx), ...(params === undefined ? {} : { params }), events };
}

// The look after round r in the start slot of tick r: opened before the gamemaker's, its call, its events and its
// close right after the gamemaker's activation opened (both are opened as the slot starts, the Confessor runs first).
function placed(timeline: readonly Entry[], looks: readonly Played[]): readonly Entry[] {
	const out = [...timeline];
	for (const { tick, params, events } of looks) {
		const minute = out.findIndex((entry) => entry.k === "minute" && entry.minute === tick);
		const at = out.findIndex((entry, index) => index > minute && entry.k === "event" && entry.type === "overseer_called" && entry.actor === "gamemaker");
		const call: Entry[] = params === undefined ? [] : [{ k: "call", actor: ACTOR, tool: "interpret", params, ok: true }];
		out.splice(at, 1, director("overseer_called"), ...out.slice(at, at + 1), ...call, ...events, director("overseer_answered"));
	}
	return out;
}

/**
 * The file with the Confessor's registered changes: `interpretations` among the mechanics, the old classifier's
 * looks replaced by the Confessor's (see the head of this file).
 *
 * @param oracle - The file, with the registered changes of the game applied (`registered`).
 * @returns The file as this platform writes it, every look of the Confessor in the run, and the firings it took.
 */
export async function confessed(oracle: Oracle): Promise<{ readonly oracle: Oracle; readonly asked: readonly Asked[]; readonly firings: ReadonlyMap<number, readonly Firing[]> }> {
	const { rest, looks } = split(oracle.timeline);
	const base = { ...oracle, setup: { ...oracle.setup, mechanics: [...oracle.setup.mechanics, { id: "interpretations", options: null }] }, timeline: [...rest] };
	const firings = confessorFirings((await playOracle(base, gameOf(base))).events);
	const asked = await Promise.all([...firings].map(([tick, taken]) => played(base, tick, taken, looks.get(tick) ?? [])));
	return { oracle: { ...base, timeline: [...placed(rest, asked)] }, asked: asked.map(({ tick, question, params }) => ({ tick, question, ...(params === undefined ? {} : { params }) })), firings };
}
