// SPDX-License-Identifier: Apache-2.0
/**
 * The game the trick-play tests play (the old `trickStory`: four seats on the default deck, two games of three rounds)
 * and the stateless scripted player of the old tests, which follows the table it is shown.
 */
import type { Activation, ActorDriver, Envelope } from "@swarmtales/contracts";
import { cardTable } from "@swarmtales/mechanic-card-table";
import { strategyBrain } from "@swarmtales/mechanic-strategy-brain";
import { defineGame, type Game } from "@swarmtales/sdk";
import { trickPlay } from "../src/index.ts";

export const SEATS = ["A01", "A02", "A03", "A04"];

/** What the scripted player does beside following the table. */
export interface ScriptOptions {
	/** The bid for a hand of `cards` cards (default: one in four, rounded down). */
	readonly bid?: (cards: number, resident: string) => number;
	/** Seats that veto whenever they may. */
	readonly vetoers?: readonly string[];
}

const nameOf = (turn: Activation): string => turn.actor.replace(/^resident:/, "");

async function viewTable(turn: Activation): Promise<string> {
	const view = await turn.call("viewTable", {});
	return view.ok ? view.reply : "";
}

/**
 * The reference player of the old tests: reads its turn's table (or `viewTable`), bids, names the first suit of its
 * hand and plays the first legal card.
 */
export function trickPlayer(script: ScriptOptions = {}): ActorDriver {
	return async (turn) => {
		const told = turn.inputs.map((note) => note.text).join("\n");
		const status = told.includes("Your turn") || told.includes("lowest bid") ? told : await viewTable(turn);
		const call = choose(status, nameOf(turn), script);
		if (call !== undefined) await turn.call(call.tool, call.params);
	};
}

interface Call {
	readonly tool: string;
	readonly params: Record<string, string | number>;
}

// The bid the table asks for, or none.
function bidOf(status: string, seat: string, script: ScriptOptions): Call | undefined {
	const bid = /placeBid with 0 to (\d+)/.exec(status)?.[1];
	return bid === undefined ? undefined : { tool: "placeBid", params: { tricks: script.bid?.(Number(bid), seat) ?? Math.floor(Number(bid) / 4) } };
}

// The one call the table asks for, or none.
function choose(status: string, seat: string, script: ScriptOptions): Call | undefined {
	const bid = bidOf(status, seat, script);
	if (bid !== undefined) return bid;
	if (status.includes("name the trump")) return { tool: "nameTrump", params: { suit: /Your hand: (\w+):/.exec(status)?.[1] ?? "Ash" } };
	if (status.includes("vetoLead") && script.vetoers?.includes(seat) === true) return { tool: "vetoLead", params: {} };
	return cardOf(status);
}

// The first legal card the table lists, or none.
function cardOf(status: string): Call | undefined {
	const legal = /Legal now: ([^.]+)\./.exec(status)?.[1]?.split(", ")[0];
	return legal === undefined ? undefined : { tool: "playCard", params: { card: legal } };
}

/** What the test game adds round the mechanic. */
export interface Table {
	readonly passes?: number;
	readonly maxCallsPerTick?: number;
	/** The tools of every seat (default: every tool of the loaded mechanics). */
	readonly grants?: readonly ("viewTable" | "placeBid" | "nameTrump" | "playCard" | "vetoLead")[];
	/** A private strategy brain per seat, as the old game loaded it: it holds the next game for a retro, in which a seat is woken and told the record. */
	readonly brain?: boolean;
}

const brainOf = () => strategyBrain({ enabled: true, solo: true, maxWords: 200, teams: Object.fromEntries(SEATS.map((seat) => [seat, [seat]])), retroMaxPosts: 1, retroMaxMinutes: 2, shared: false, brainAtStart: false });

/** The test game around the mechanic under test. */
export function trickGame(options: Parameters<typeof trickPlay>[0] = {}, { passes = 6, maxCallsPerTick, grants, brain = false }: Table = {}): Game {
	return defineGame({
		id: "trick-play-test",
		seed: 5,
		residents: [...SEATS],
		mechanics: [cardTable({ seats: [...SEATS] }), trickPlay({ games: 2, rounds: [1, 2, 3], ...options }), ...(brain ? [brainOf()] : [])],
		scheduler: { id: "turns", options: { passes, activation: "onNews", order: "roster" } },
		...(maxCallsPerTick === undefined ? {} : { limits: { maxCallsPerTick } }),
		...(grants === undefined ? {} : { grants: { resident: grants } }),
		end: { ticks: 120 },
	});
}

/** The events of one type that trick play wrote. */
export const ofType = (events: readonly Envelope[], type: string): readonly Envelope[] => events.filter((event) => event.source.endsWith("/trick-play") && event.type === type);

/** One field of an event's payload, untyped. */
export function field(event: Envelope, key: string): unknown {
	const payload = event.payload;
	return typeof payload === "object" && payload !== null ? Reflect.get(payload, key) : undefined;
}
