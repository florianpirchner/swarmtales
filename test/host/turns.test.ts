/**
 * The turn policy (docs/design/mechanic-api.md §6): passes, blocks whose agents run at once but
 * whose calls land in the pass's order, activation by news, input kinds, and the checks on a
 * policy. The old Arena's behaviour (packages/engine/src/arena.ts) is the reference.
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { createHost, defineCoreStory, defineMechanic, reply } from "@swarmtales/kernel";
import { checkDeterminism, checkSnapshotRoundTrip, idleAgent, playStory } from "@swarmtales/testkit";
import type { EventEnvelope, MechanicUse, TurnPolicy, TurnTaker } from "@swarmtales/contracts";

/** A `say` tool, news for residents who were spoken to, and inputs of three kinds. */
const talk = defineMechanic(
	{
		id: "talk",
		summary: "A test mechanic: a say tool, news and kinded inputs.",
		options: Type.Object({}),
		state: (): { heard: string[]; opened: string[] } => ({ heard: [], opened: [] }),
		events: { said: Type.Object({ resident: Type.String(), to: Type.String() }) },
		prompts: { "talk/say": [] },
	},
	(kit) => ({
		tools: [
			kit.tool({
				name: "say",
				description: "talk/say",
				parameters: Type.Object({ to: Type.String() }),
				execute: (params, ctx) => {
					ctx.emit("said", { resident: ctx.resident ?? "", to: params.to });
					ctx.state.heard.push(params.to);
					return reply("ok");
				},
			}),
		],
		hooks: {
			news: (resident, ctx) => ctx.state.heard.includes(resident),
			turnOpened: (resident, ctx) => {
				ctx.state.opened.push(resident);
			},
			turnInputs: (resident, ctx) => {
				const heard = ctx.state.heard.filter((id) => id === resident).length;
				ctx.state.heard = ctx.state.heard.filter((id) => id !== resident);
				return [{ kind: "digest", text: "nothing unread" }, { kind: "status", text: `minute ${String(ctx.minute)}` }, ...(heard > 0 ? [{ kind: "notice", text: `${String(heard)} said` }] : []), "plain"];
			},
		},
		snapshot: kit.snapshot({
			version: 1,
			schema: Type.Object({ heard: Type.Array(Type.String()), opened: Type.Array(Type.String()) }),
			save: (state) => ({ heard: [...state.heard], opened: [...state.opened] }),
			load: (data) => ({ heard: [...data.heard], opened: [...data.opened] }),
		}),
	}),
);

/** A second status part, to show joined kinds. */
const rank = defineMechanic(
	{ id: "rank", summary: "A test mechanic: one status part.", options: Type.Object({}), state: () => undefined, events: {} },
	() => ({ hooks: { turnInputs: () => [{ kind: "status", text: "rank 1" }] } }),
);

function story(turns: TurnPolicy, mechanics: readonly MechanicUse[] = [talk.with(), rank.with()]) {
	return defineCoreStory({ id: "turns", seed: 7, minutes: 2, residents: 4, mechanics, grants: { resident: ["say"] }, turns });
}

const payloadOf = (event: EventEnvelope): Record<string, unknown> => (typeof event.payload === "object" && event.payload !== null ? Object.fromEntries(Object.entries(event.payload)) : {});

/** Every resident says something to the next one, after a delay that is longest for the first member. */
function slowFirst(delays: Readonly<Record<string, number>>): TurnTaker {
	return async (turn) => {
		await new Promise((resolve) => {
			setTimeout(resolve, delays[turn.resident] ?? 0);
		});
		const to = turn.resident === "A04" ? "A01" : `A0${String(Number(turn.resident.slice(2)) + 1)}`;
		await turn.call("say", { to });
	};
}

describe("the turn policy", () => {
	it("keeps the default: one pass, one turn after the other", async () => {
		const run = await playStory({ story: story({}) }, idleAgent);
		const passes = run.events.filter((event) => event.type === "pass_started").map(payloadOf);
		expect(passes).toHaveLength(2);
		expect(passes.every((pass) => Array.isArray(pass.blocks) && pass.blocks.every((block: unknown) => Array.isArray(block) && block.length === 1))).toBe(true);
	});

	it("lands a block's calls in the pass's order, whatever the agents' timing", async () => {
		const run = await playStory({ story: story({ blockSize: 4 }) }, slowFirst({ A01: 30, A02: 20, A03: 10, A04: 0 }));
		const minute0 = run.events.filter((event) => event.minute === 0);
		const pass = minute0.find((event) => event.type === "pass_started");
		expect(pass).toBeDefined();
		const order = pass === undefined ? [] : payloadOf(pass).order;
		const said = minute0.filter((event) => event.type === "said").map((event) => payloadOf(event).resident);
		expect(said).toEqual(order);
		// Every member's inputs were built before any member acted.
		const lastStart = minute0.findLastIndex((event) => event.type === "turn_started");
		const firstCall = minute0.findIndex((event) => event.type === "tool_called");
		expect(lastStart).toBeLessThan(firstCall);
		const turnStarts = minute0.filter((event) => event.type === "turn_started").map((event) => payloadOf(event).block);
		expect(turnStarts).toEqual([1, 1, 1, 1]);
	});

	it("plays several passes per minute", async () => {
		const run = await playStory({ story: story({ passes: 3 }) }, idleAgent);
		const turns = run.events.filter((event) => event.type === "turn_started" && event.minute === 0).map(payloadOf);
		expect(turns.map((turn) => turn.pass)).toEqual([1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3]);
		const orders = run.events.filter((event) => event.type === "pass_started" && event.minute === 0).map((event) => JSON.stringify(payloadOf(event).order));
		expect(new Set(orders).size).toBeGreaterThan(1);
	});

	it("activates only residents with news, or whose agent awaits an answer", async () => {
		const agent: TurnTaker = async (turn) => {
			if (turn.minute === 0 && turn.pass === 1 && turn.resident === "A04") await turn.call("say", { to: "A02" });
		};
		const run = await playStory({ story: story({ passes: 2, activation: "onNews" }), awaitsAnswer: (resident) => resident === "A04" }, agent);
		const started = run.events.filter((event) => event.type === "turn_started").map((event) => `${String(event.minute)}/${String(payloadOf(event).pass)}/${String(payloadOf(event).resident)}`);
		// Nobody has news but A04, whose agent awaits an answer; A04 speaks to A02, so A02 steps once, in the next block that holds it.
		expect(started.filter((entry) => !entry.endsWith("A04"))).toHaveLength(1);
		expect(started.filter((entry) => entry.endsWith("A02"))).toHaveLength(1);
		expect(started.filter((entry) => entry.endsWith("A04"))).toEqual(["0/1/A04", "0/2/A04", "1/1/A04", "1/2/A04"]);
		expect(run.events.filter((event) => event.type === "turn_skipped")).toHaveLength(16 - started.length);
	});

	it("orders inputs by kind, joins joined kinds and keeps the rest in load order", async () => {
		const turns: string[][] = [];
		await playStory({ story: story({ inputs: [{ kind: "status", join: " · " }, { kind: "notice" }, { kind: "digest" }] }) }, (turn) => {
			turns.push(turn.inputs.map((note) => `${note.source}:${note.kind ?? "-"}:${note.text}`));
			return Promise.resolve();
		});
		expect(turns[0]).toEqual(["talk+rank:status:minute 0 · rank 1", "talk:digest:nothing unread", "talk:-:plain"]);
	});

	it("takes the story's fields over a mechanic's policy and refuses bad policies", async () => {
		const paced = defineMechanic({ id: "paced", summary: "Supplies a turn policy.", options: Type.Object({}), state: () => undefined, events: {} }, () => ({
			turns: { passes: 2, order: (view) => [...view.residents].reverse() },
		}));
		const run = await playStory({ story: story({ passes: 1 }, [paced.with(), talk.with()]) }, idleAgent);
		const passes = run.events.filter((event) => event.type === "pass_started").map((event) => payloadOf(event).order);
		expect(passes).toEqual([["A04", "A03", "A02", "A01"], ["A04", "A03", "A02", "A01"]]);
		const twice = defineMechanic({ id: "twice", summary: "Supplies another.", options: Type.Object({}), state: () => undefined, events: {} }, () => ({ turns: {} }));
		expect(() => createHost({ story: story({}, [paced.with(), twice.with(), talk.with()]) })).toThrow(/both supply a turn policy/);
		expect(() => createHost({ story: story({ blockSize: 0 }) })).toThrow(/block size/);
		const broken = createHost({ story: story({ order: (view) => view.residents.slice(1) }) });
		broken.start();
		await expect(broken.playMinute(idleAgent)).rejects.toThrow(/permutation/);
	});

	it("starts each member's agent right after its inputs, before the next member is prepared or skipped (the old arena's step order)", async () => {
		const host = createHost({ story: story({ blockSize: 4, activation: "onNews" }), awaitsAnswer: (resident) => resident !== "A03" });
		const seen: string[] = [];
		host.subscribe((event) => {
			if (event.type === "turn_started" || event.type === "turn_skipped") seen.push(`${event.type === "turn_started" ? "prepared" : "skipped"} ${String(payloadOf(event).resident)}`);
		});
		host.start();
		await host.playMinute((turn) => {
			// What an agent does before its first await (the runner writes `turn_input` and `request` there).
			seen.push(`agent ${turn.resident}`);
			return Promise.resolve();
		});
		const order = seen.filter((entry) => entry.startsWith("prepared")).map((entry) => entry.slice("prepared ".length));
		expect(order).toHaveLength(3);
		const expected = seen.flatMap((entry) => (entry.startsWith("prepared") ? [entry, `agent ${entry.slice("prepared ".length)}`] : entry.startsWith("skipped") ? [entry] : []));
		expect(seen).toEqual(expected);
		expect(seen).toContain("skipped A03");
	});

	it("plays a pass with nobody in it as an empty pass: no blocks, no turns (old `blocksOf([], 2)`, F3)", async () => {
		const sleepAll = defineMechanic(
			{ id: "sleep", summary: "A test mechanic: suspends every resident.", options: Type.Object({}), state: () => undefined, events: {} },
			() => ({
				hooks: {
					runStarted: (ctx) => {
						for (const id of ctx.residents.ids) ctx.residents.suspend(id, "asleep");
					},
				},
			}),
		);
		const run = await playStory({ story: story({ blockSize: 2, passes: 2 }, [talk.with(), sleepAll.with()]) }, slowFirst({}));
		const passes = run.events.filter((event) => event.type === "pass_started").map(payloadOf);
		expect(passes).toEqual([
			{ pass: 1, order: [], blocks: [] },
			{ pass: 2, order: [], blocks: [] },
			{ pass: 1, order: [], blocks: [] },
			{ pass: 2, order: [], blocks: [] },
		]);
		expect(run.events.filter((event) => event.type === "turn_started" || event.type === "said")).toEqual([]);
	});

	it("is deterministic and resumable with blocks and passes", async () => {
		const options = { story: story({ blockSize: 2, passes: 2 }) };
		const agent = () => slowFirst({ A01: 3, A02: 2, A03: 1 });
		expect(await checkDeterminism(options, agent)).toEqual([]);
		expect(await checkSnapshotRoundTrip(options, agent, 1)).toEqual([]);
	});
});
