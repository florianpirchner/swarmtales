// SPDX-License-Identifier: LicenseRef-SUL-1.0
import { describe, expect, it } from "vitest";
import { loadOrder, type LoadOrderEntry } from "../src/game/load-order.ts";

const named = (...names: readonly string[]): readonly { readonly name: string }[] => names.map((name) => ({ name }));
const ids = (entries: readonly LoadOrderEntry[]): readonly string[] => loadOrder(entries).order.map((entry) => entry.id);
const codes = (entries: readonly LoadOrderEntry[]): readonly string[] => loadOrder(entries).issues.map((issue) => issue.code);

/** The heads of tic-tac-toe teams (old `mechanics/<id>/src/index.ts`), by the names of their services. */
const gridGame = { id: "grid-game", provides: named("grid-game", "consensus-source"), uses: named("consensus", "team-channel") };
const consensus = { id: "consensus", requires: named("consensus-source"), provides: named("consensus") };
const teamChannel = { id: "team-channel", provides: named("team-channel") };
const strategyBrain = { id: "strategy-brain", provides: named("strategy-brain"), uses: named("grid-game", "brain-source", "team-channel") };
const optimalReferee = { id: "optimal-referee", requires: named("grid-game") };
const roster = { id: "roster", provides: named("roster") };
/** The game's order (old `stories/tictactoe-teams/story.ts`). The three variants list the same five mechanics and differ in options. */
const tictactoe = [gridGame, consensus, teamChannel, strategyBrain, optimalReferee];

describe("loadOrder", () => {
	it.each(["default", "no-brain", "solo"])("gives the order of 3.4 for the five heads of tic-tac-toe teams (%s)", (variant) => {
		const game = variant === "default" ? tictactoe : tictactoe.map((head) => ({ ...head }));
		const expected = ["team-channel", "grid-game", "consensus", "strategy-brain", "optimal-referee"];
		expect(loadOrder(game)).toEqual({ order: expected.map((id) => game.find((head) => head.id === id)), issues: [] });
	});

	it("is called without `roster`: the caller appends it after the order, a listed one would load before a cycle of uses", () => {
		expect(ids([...tictactoe, roster])).toEqual(["team-channel", "roster", "grid-game", "consensus", "strategy-brain", "optimal-referee"]);
	});

	it("orders by requires and keeps the game's order for ties (carried)", () => {
		const counter = { id: "counter" };
		const provider = { id: "p", provides: named("thing") };
		const user = { id: "user", requires: named("thing") };
		expect(ids([user, counter, provider])).toEqual(["counter", "p", "user"]);
		expect(ids([counter, { id: "b" }, { id: "a" }])).toEqual(["counter", "b", "a"]);
	});

	it("breaks a cycle of optional uses by the game's order, after the requires and the acyclic uses (carried)", () => {
		const exile = { id: "exile", provides: named("exile"), uses: named("goals", "seal") };
		const seal = { id: "seal", provides: named("seal"), uses: named("exile") };
		const goals = { id: "goals", provides: named("goals") };
		const whispers = { id: "whispers", uses: named("exile") };
		expect(ids([seal, exile, goals])).toEqual(["goals", "seal", "exile"]);
		expect(ids([exile, seal, goals])).toEqual(["goals", "exile", "seal"]);
		expect(ids([whispers, exile])).toEqual(["exile", "whispers"]);
		expect(ids([seal, whispers])).toEqual(["seal", "whispers"]);
		expect(ids([{ id: "self", provides: named("self"), uses: named("self") }])).toEqual(["self"]);
	});

	it("raises SWT-G030 for a required service without a provider, with the mechanic's place", () => {
		const { order, issues } = loadOrder([teamChannel, consensus, optimalReferee]);
		expect(issues.map((issue) => [issue.code, issue.where?.path])).toEqual([["SWT-G030", "mechanics[1]"], ["SWT-G030", "mechanics[2]"]]);
		expect(issues[0]?.summary).toBe('mechanic "consensus" needs the service "consensus-source", and no mechanic of the game provides it');
		expect(order.map((entry) => entry.id)).toEqual(["team-channel", "consensus", "optimal-referee"]);
	});

	it("raises SWT-G031 for a service with two providers and lets the first stand", () => {
		const { order, issues } = loadOrder([{ id: "user", requires: named("thing") }, { id: "b", provides: named("thing") }, { id: "a", provides: named("thing") }]);
		expect(issues.map((issue) => issue.code)).toEqual(["SWT-G031"]);
		expect(issues[0]?.details).toEqual({ providers: ["b", "a"] });
		expect(order.map((entry) => entry.id)).toEqual(["b", "user", "a"]);
	});

	it("raises SWT-G032 for a cycle of requires and names its mechanics (carried)", () => {
		const ping = { id: "ping", provides: named("ping"), requires: named("pong") };
		const pong = { id: "pong", provides: named("pong"), requires: named("ping") };
		const { order, issues } = loadOrder([ping, { id: "free" }, pong]);
		expect(issues.map((issue) => issue.code)).toEqual(["SWT-G032"]);
		expect(issues[0]?.summary).toMatch(/"ping", "pong" form a cycle/);
		expect(order.map((entry) => entry.id)).toEqual(["free", "ping", "pong"]);
	});

	it("collects every issue, and places a doubled id once (step 4 reports it)", () => {
		expect(codes([{ id: "a", provides: named("s") }, { id: "b", provides: named("s"), requires: named("gone") }])).toEqual(["SWT-G031", "SWT-G030"]);
		expect(loadOrder([teamChannel, teamChannel, gridGame])).toEqual({ order: [teamChannel, gridGame], issues: [] });
	});

	it("takes a service that is given from outside the list as provided, unless a listed mechanic provides it", () => {
		const user = { id: "user", requires: named("roster") };
		expect(codes([user])).toEqual(["SWT-G030"]);
		expect(loadOrder([user], ["roster"])).toEqual({ order: [user], issues: [] });
		const own = { id: "own", provides: named("roster") };
		expect(loadOrder([user, own], ["roster"])).toEqual({ order: [own, user], issues: [] });
	});
});
