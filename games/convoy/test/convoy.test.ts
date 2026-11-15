// SPDX-License-Identifier: Apache-2.0
/**
 * The game's part of the old `test/stories/convoy.test.ts`: a scripted match of the game file with a brain per seat,
 * a private role and a fresh context per game, and the timer for seats that never act. The rules block is in
 * `mechanics/convoy/test/model.test.ts`, the refusals and the cooldown in `mechanics/convoy/test/convoy.test.ts`; the
 * assertions on the old `turn_started` read `activation_opened`, and the old end `referee` is the end `limit`.
 */
import { idleDriver, play } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { SEATS } from "../briefing.ts";
import { field, ofType, player, rolesIn, rosterGame } from "./support.ts";

const players = { drivers: { resident: player } };

describe("convoy, scripted match", () => {
	it("plays three games with hidden roles, talk, votes, an audit, sealed cards, accusations and a brain per seat", async () => {
		const run = await play(rosterGame(), players);
		expect(run.end).toMatchObject({ reason: "limit", limit: "convoy.match" });
		expect(ofType(run.events, "convoy_game_ended")).toHaveLength(3);
		for (const type of ["convoy_game_started", "convoy_card_played", "convoy_accused", "convoy_game_scored"]) {
			expect(ofType(run.events, type).length).toBeGreaterThan(0);
			expect(ofType(run.events, type).every((event) => JSON.stringify(event.audience) === JSON.stringify(["human"]))).toBe(true);
		}
		// Every game: two saboteurs, four loyal.
		for (const game of [0, 1, 2]) expect(Object.values(rolesIn(run.events, game)).filter((role) => role === "saboteur")).toHaveLength(2);
		// Stage 2 of every game lost its first vote.
		const votes = ofType(run.events, "convoy_votes_revealed");
		expect(votes.filter((event) => field(event, "stage") === 2 && field(event, "confidence") === false)).toHaveLength(3);
		expect(ofType(run.events, "convoy_crew_proposed").filter((event) => field(event, "proposal") === 2)).toHaveLength(3);
		expect(ofType(run.events, "convoy_audited")).toHaveLength(3);
		expect(ofType(run.events, "convoy_spoken").length).toBeGreaterThan(0);
		// No loyal seat ever played damage, no saboteur twice within the cooldown.
		const cards = ofType(run.events, "convoy_card_played");
		expect(cards.every((event) => field(event, "role") === "saboteur" || field(event, "card") === "safe")).toBe(true);
		expect(cards.filter((event) => field(event, "card") === "damage").every((event) => field(event, "mayDamage") === true)).toBe(true);
		expect(cards.every((event) => field(event, "missed") === false)).toBe(true);
		// Four loyal seats accuse each game; the reference has every seat.
		expect(ofType(run.events, "convoy_accused")).toHaveLength(12);
		for (const event of ofType(run.events, "convoy_game_scored")) {
			const seats: unknown = field(event, "seats");
			expect(typeof seats === "object" && seats !== null ? Object.keys(seats).sort() : []).toEqual(SEATS);
		}
		expect(ofType(run.events, "convoy_match_ended").map((event) => field(event, "scores"))).toEqual([run.kernel.fact("convoy.scores")]);
		// One brain before game 1 and after games 1 and 2, per seat.
		expect(ofType(run.events, "brain_written")).toHaveLength(18);
	});

	it("tells each seat its own role privately and starts every game fresh", async () => {
		const run = await play(rosterGame({ games: 2 }), players);
		const roles = rolesIn(run.events);
		const opened = ofType(run.events, "activation_opened");
		for (const seat of SEATS) {
			const own = opened.filter((event) => field(event, "actor") === `resident:${seat}`).map((event) => JSON.stringify(field(event, "inputs")));
			expect(own.some((text) => text.includes(`you are ${seat} and you are ${roles[seat] === "saboteur" ? "a SABOTEUR" : "LOYAL"}`))).toBe(true);
		}
		const resets = opened.flatMap((event) => {
			const inputs: unknown = field(event, "inputs");
			return Array.isArray(inputs) ? inputs.filter((input): input is { kind: string; text: string } => typeof input === "object" && input !== null && Reflect.get(input, "kind") === "context-reset").map((input) => input.text) : [];
		});
		const second = resets.filter((text) => text.startsWith("Game 2 begins"));
		expect(second).toHaveLength(6);
		expect(second.every((text) => text.includes("game 1: the"))).toBe(true);
	});

	it("fills in missed proposals, votes, cards and accusations and still ends the match", async () => {
		const run = await play(rosterGame({ brain: false, games: 1 }), { drivers: { resident: idleDriver } });
		expect(run.end).toMatchObject({ reason: "limit", limit: "convoy.match" });
		expect(ofType(run.events, "convoy_crew_proposed").every((event) => field(event, "missed") === true)).toBe(true);
		// Idle saboteurs never damage: the convoy crosses all eight stages.
		expect(ofType(run.events, "convoy_game_ended").map((event) => field(event, "winner"))).toEqual(["convoy"]);
		expect(ofType(run.events, "convoy_stage_revealed")).toHaveLength(8);
		expect(ofType(run.events, "convoy_card_played").every((event) => field(event, "missed") === true)).toBe(true);
		expect(ofType(run.events, "brain_written")).toEqual([]);
	});
});
