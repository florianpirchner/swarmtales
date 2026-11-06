/** The morris teams story through the real mechanics: a scripted match, offline (docs/ideas/game-roadmap.md §2.8). */
import { describe, expect, it } from "vitest";
import type { CoreStory, Turn, TurnTaker } from "@swarmtales/contracts";
import { createHost, residentActor } from "@swarmtales/kernel";
import { applyStep, decodeStep, type Cell } from "@swarmtales/mechanic-morris";
import { createPromptLookup } from "@swarmtales/prompts";
import { checkDeterminism, checkSnapshotRoundTrip, idleAgent, playStory } from "@swarmtales/testkit";
import { morrisStory, type MorrisOptions } from "../../stories/morris-teams/story.ts";
import { findCoreStory } from "../../stories/index.ts";
import { field, ofType } from "./tictactoe-support.ts";

function story(extra: MorrisOptions = {}): CoreStory {
	const base = morrisStory({ games: 2, maxTurns: 40, refereeDepth: 2, ...extra });
	return { ...base, turns: { ...base.turns, order: (view) => view.residents } };
}

const options = (extra: MorrisOptions = {}) => ({ story: story(extra), prompts: createPromptLookup() });

const texts = (turn: Turn): string => turn.inputs.map((note) => note.text).join("\n");

/** The board of a viewBoard reply: the 24 labels of its picture, in point order. */
function boardOf(view: string): Cell[] {
	const labels = view.split("\n").slice(0, 13).join("\n").match(/\d+|X|O/g) ?? [];
	return labels.map((label): Cell => (label === "X" || label === "O" ? label : "."));
}

/** The legal move numbers viewBoard lists. */
function legalOf(view: string): number[] {
	const line = /^Legal moves[^:]*: (.*)\.$/m.exec(view)?.[1] ?? "";
	return line.split(", ").map((item) => Number(/^\d+/.exec(item)?.[0])).filter((code) => Number.isInteger(code));
}

/** A greedy choice: a step that closes a mill when there is one, else the first legal move (also for a removal). */
function choose(view: string, side: "X" | "O"): number | undefined {
	const legal = legalOf(view);
	if (view.includes("closed a mill")) return legal[0];
	const board = boardOf(view);
	const closing = legal.find((code) => {
		const step = decodeStep(code);
		return step !== undefined && applyStep({ board, side, inHand: { X: 9, O: 9 } }, step).mill;
	});
	return closing ?? legal[0];
}

const morrisPlayer: TurnTaker = async (turn) => {
	const told = texts(turn);
	const team = ["A01", "A02", "A03"].includes(turn.resident) ? "X" : "O";
	if (told.includes("Retro after game") || told.includes("Before game 1")) {
		await turn.call("postTeam", { text: `retro talk from ${turn.resident}` });
		if (told.includes("You are the retro captain")) await turn.call("writeBrain", { text: `Team ${team}: close a mill when you can, block every open two of the other side, keep pieces mobile.` });
		return;
	}
	const view = await turn.call("viewBoard", {});
	if (!view.ok) return;
	const side = /Side to move: ([XO])\./.exec(view.reply)?.[1];
	const captain = /Captain of the turn: (A\d+)\./.exec(view.reply)?.[1];
	if (side !== team) return;
	if (turn.resident === captain) {
		const agreed = /agreed on (\d+)/.exec(told)?.[1];
		if (agreed === undefined) {
			const move = choose(view.reply, team);
			if (move !== undefined) await turn.call("proposeMove", { cell: move, reason: "script" });
			return;
		}
		const played = await turn.call("playMove", { move: Number(agreed) });
		if (played.ok && played.reply.includes("Mill!")) {
			const again = await turn.call("viewBoard", {});
			const remove = again.ok ? choose(again.reply, team) : undefined;
			if (remove !== undefined) await turn.call("proposeMove", { cell: remove, reason: "script" });
		}
	} else if (told.includes("proposes the move")) {
		await turn.call("castVote", { agree: true, reason: "ok" });
	}
};

describe("morris-teams, scripted match", () => {
	it("plays two games with mills, removals, brains and scored turns", async () => {
		const run = await playStory(options(), morrisPlayer);
		expect(run.end).toMatchObject({ reason: "referee", limit: "morris.match" });
		expect(ofType(run.events, "game_started").map((event) => field(event, "startingSide"))).toEqual(["X", "O"]);
		expect(ofType(run.events, "game_ended")).toHaveLength(2);
		expect(ofType(run.events, "match_ended")).toHaveLength(1);
		expect(ofType(run.events, "consensus_forfeited")).toHaveLength(0);
		const moves = ofType(run.events, "move_played");
		expect(moves.some((event) => field(event, "kind") === "remove")).toBe(true);
		expect(moves.some((event) => field(event, "kind") === "move")).toBe(true);
		// Every mill is followed by a removal of the same side.
		moves.forEach((event, index) => {
			if (field(event, "mill") === true) expect(field(moves[index + 1] ?? event, "kind")).toBe("remove");
		});
		const scored = ofType(run.events, "move_scored");
		expect(scored.length).toBeGreaterThan(10);
		expect(scored.every((event) => JSON.stringify(event.audience) === JSON.stringify(["human"]))).toBe(true);
		const written = ofType(run.events, "brain_written");
		expect(written.map((event) => `${String(field(event, "game"))}${String(field(event, "team"))}`).sort()).toEqual(["0O", "0X", "1O", "1X"]);
	});

	it("refuses an illegal proposal and lists the legal moves", async () => {
		const host = createHost(options({ brain: false }));
		host.start();
		const view = await host.call(residentActor("A01"), "viewBoard", {});
		expect(view).toMatchObject({ ok: true });
		if (view.ok) expect(view.reply).toContain("Legal moves (place on a free point; the move number is the point): 1, 2, 3,");
		if (view.ok) expect(view.reply).toContain("X pieces on: none. O pieces on: none. Free: 1, 2,");
		expect(await host.call(residentActor("A01"), "proposeMove", { cell: 1011, reason: "a move while placing" })).toMatchObject({ ok: false, code: "ILLEGAL_CELL" });
		expect(await host.call(residentActor("A02"), "proposeMove", { cell: 5, reason: "not the captain" })).toMatchObject({ ok: false, code: "NOT_CAPTAIN" });
		expect(await host.call(residentActor("A01"), "playMove", { move: 5 })).toMatchObject({ ok: false });
	});

	it("marks a match nobody played as invalid after six forfeits in a row", async () => {
		const run = await playStory(options({ brain: false }), idleAgent);
		expect(ofType(run.events, "consensus_forfeited")).toHaveLength(6);
		expect(ofType(run.events, "match_ended").map((event) => field(event, "invalid"))).toEqual([true]);
		expect(ofType(run.events, "move_played").every((event) => field(event, "forfeit") === true)).toBe(true);
		// The captain on move is told once per turn and minute, so a silent one is asked again (P104).
		const told = ofType(run.events, "turn_started").filter((event) => JSON.stringify(field(event, "inputs")).includes("is on move"));
		expect(told.length).toBeGreaterThanOrEqual(6 * 3);
		expect(new Set(told.map((event) => `${String(event.minute)}:${event.actor ?? ""}`)).size).toBe(told.length);
		const make = () => options({ brain: false });
		expect(await checkDeterminism(make, () => idleAgent)).toEqual([]);
		expect(await checkSnapshotRoundTrip(make, () => idleAgent, 4)).toEqual([]);
	});

	it("replays the scripted match identically and through snapshots", async () => {
		const make = () => options({ games: 1, maxTurns: 30 });
		expect(await checkDeterminism(make, () => morrisPlayer)).toEqual([]);
		expect(await checkSnapshotRoundTrip(make, () => morrisPlayer, 6)).toEqual([]);
	});
});

describe("morris-teams in the registry", () => {
	it("finds the arms and the combinations by name", () => {
		expect(findCoreStory("morris-teams")?.story.id).toBe("morris-teams");
		expect(findCoreStory("morris-teams-nobrain")?.story.grants).toEqual({ resident: ["viewBoard", "proposeMove", "castVote", "postTeam", "readTeam", "playMove"] });
		const solo = findCoreStory("morris-teams-t60-solo");
		expect(solo?.story.id).toBe("morris-teams-t60-solo");
		expect(solo?.story.residents).toEqual(["A01", "A04"]);
		expect(findCoreStory("morris-teams-t5")).toBeUndefined();
		expect(findCoreStory("morris-teams-r4-fc")?.story.id).toBe("morris-teams-r4-fc");
		expect(findCoreStory("morris-teams-nobrain-g1-t60")?.story.id).toBe("morris-teams-nobrain-g1-t60");
	});
});
