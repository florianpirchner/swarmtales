// SPDX-License-Identifier: Apache-2.0
import { SwtError, type ActorId, type Envelope, type GameData, type PluginInstance, type PluginPort, type SchedulerDefinition } from "@swarmtales/contracts";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { defineDirector } from "../src/director/define.ts";
import { NOT_A_DIRECTOR, parseTake } from "../src/director/plugin.ts";
import { DIRECTOR_TAKE, DIRECTORS_PLUGIN } from "../src/game/directors.ts";
import { resolveGame } from "../src/game/resolve.ts";
import { defineHead } from "../src/mechanic/define-head.ts";
import { defineMechanic } from "../src/mechanic/define-mechanic.ts";
import { reply } from "../src/mechanic/definers.ts";

const text = (description: string) => Type.String({ description });
const Line = Type.Object({ line: text("The line") }, { description: "A line" });
const body = { system: () => "s", input: () => "i", act: () => Promise.resolve() };
const isLoud = (payload: unknown): boolean => typeof payload === "object" && payload !== null && "line" in payload && payload.line !== "hush";
const warden = defineDirector({ id: "warden", summary: "Hears proposals that are not hushed, and closings.", on: [{ event: "votes.proposed", where: isLoud }, { event: "votes.closed" }], output: Line, limits: { maxCalls: 2 } }, body);
const clerk = defineDirector({ id: "clerk", summary: "Hears every proposal.", on: [{ event: "votes.proposed" }], output: Line }, body);
const votes = defineMechanic(
	defineHead({ id: "votes", package: "@test/votes", summary: "Votes.", events: { proposed: Line, closed: Line, counted: Line }, tools: { post: { description: "Posts a line.", params: Line, for: ["resident", "warden"] } } }),
	{ tools: { post: { run: () => reply("ok") } } },
);
const turns: SchedulerDefinition = { id: "@test/turns", revision: 1, determinism: "seeded", options: Type.Object({ afterBlocks: Type.Optional(Type.Array(text("A kind"), { description: "Kinds" })) }, { description: "Turns" }), events: {}, create: () => ({ run: () => Promise.resolve(undefined) }) };
const data = (changes: Partial<GameData> = {}): GameData => ({ schema: 1, id: "demo", residents: 2, mechanics: [{ use: "votes" }], directors: [{ use: "warden" }, { use: "clerk" }], scheduler: { id: "turns", options: { afterBlocks: ["director"] } }, end: { ticks: 5 }, ...changes });
const resolved = (changes: Partial<GameData> = {}) => resolveGame({ game: data(changes), installed: { votes }, directors: { warden, clerk }, schedulers: { turns }, prompts: { render: (_owner, id) => id } });

const unused = (): never => {
	throw new Error("the plugin `directors` does not use this part of the port");
};

/** One instance of the plugin over a stub port: `fire` plays an event to its listeners, `take` is a Director's call. */
function started(changes: Partial<GameData> = {}) {
	const emitted: unknown[] = [];
	const port: PluginPort = {
		id: DIRECTORS_PLUGIN,
		source: "@swarmtales/sdk/directors",
		seed: 1,
		maxTicks: 5,
		tick: () => 0,
		emit: (type, payload) => void emitted.push([type, payload]),
		call: unused,
		has: () => false,
		rng: unused,
		actors: { ids: [], ofKind: () => [], has: () => false, mayAct: () => true, shared: () => undefined, suspend: unused, resume: unused },
		schedule: { at: unused },
		access: { lock: unused, unlock: unused, isLocked: unused, isOpen: unused, open: unused },
	};
	const plugins = resolved(changes).definition.plugins;
	const instance: PluginInstance | undefined = plugins.at(-1)?.create(port);
	if (instance === undefined) throw new Error("no plugin");
	let seq = 0;
	const fire = (type: string, line = "x"): void => {
		const envelope: Envelope = { seq: (seq += 1), tick: 1, source: "@test/votes/votes", type, actor: "resident:A01", payload: { line } };
		for (const listener of instance.listeners) if (listener.type === type) listener.run(envelope);
	};
	const call = (actor: ActorId) => instance.tools[0]?.prepare({}, actor);
	const take = (actor: ActorId) => {
		const outcome = call(actor)?.execute();
		return outcome?.ok === true ? parseTake(outcome.reply) : undefined;
	};
	return { instance, plugins, emitted, fire, call, take, news: (actor: ActorId) => instance.hooks.news?.(actor) };
}

describe("the plugin `directors`", () => {
	it("is the last plugin of a game with a Director and is absent without one", () => {
		const { instance, plugins } = started();
		expect(plugins.map((plugin) => [plugin.id, plugin.package])).toEqual([["votes", "@test/votes"], ["roster", "@swarmtales/sdk"], ["directors", "@swarmtales/sdk"]]);
		expect([instance.tools.map((tool) => [tool.name, tool.free]), Object.keys(plugins.at(-1)?.events ?? {}), plugins.at(-1)?.provides]).toEqual([[["take", false]], ["skipped"], []]);
		// One listener per distinct trigger event, with the schema object of the declaring plugin.
		expect(instance.listeners.map((listener) => [listener.source, listener.type, listener.schema === plugins[0]?.events[listener.type]])).toEqual([["votes", "proposed", true], ["votes", "closed", true]]);
		const game = resolved();
		expect([game.definition.names[DIRECTOR_TAKE], game.definition.grants.warden, game.definition.grants.clerk]).toEqual(["take", [DIRECTOR_TAKE, "@test/votes/votes/post"], [DIRECTOR_TAKE]]);
		const plain = resolved({ directors: [], scheduler: { id: "turns" } });
		expect([plain.definition.plugins.map((plugin) => plugin.id), DIRECTOR_TAKE in plain.definition.names]).toEqual([["votes", "roster"], false]);
	});

	it("queues a firing per kept event, tells it as news, and `take` empties the queue and counts", () => {
		const { fire, take, news, call, emitted } = started();
		expect([news("director:warden"), news("resident:A01"), take("director:warden")]).toEqual([false, false, { firings: [], calls: 0 }]);
		fire("proposed", "hush");
		fire("counted");
		expect([news("director:warden"), news("director:clerk")]).toEqual([false, true]);
		fire("proposed", "loud");
		fire("closed");
		expect([news("director:warden"), news("director:clerk"), news("resident:A01")]).toEqual([true, true, false]);
		expect(take("director:warden")).toEqual({ firings: [{ n: 1, tick: 1, event: "votes.proposed", payload: { line: "loud" } }, { n: 2, tick: 1, event: "votes.closed", payload: { line: "x" } }], calls: 1 });
		expect([news("director:warden"), take("director:warden"), news("director:clerk")]).toEqual([false, { firings: [], calls: 1 }, true]);
		// A firing is numbered per Director, from 1, and holds no place on the log (decision A34): the clerk's two are the events 1 and 3.
		expect(take("director:clerk")?.firings.map((firing): readonly unknown[] => [firing.n, Reflect.get(Object(firing.payload), "line"), "seq" in firing])).toEqual([[1, "hush", false], [2, "loud", false]]);
		expect([call("resident:A01")?.rule(), call("resident:A01")?.execute(), call("director:clerk")?.rule(), emitted]).toEqual([{ ok: false, code: NOT_A_DIRECTOR, detail: "Only a Director of the game takes firings." }, { ok: false, code: NOT_A_DIRECTOR }, undefined, []]);
		expect([parseTake("ok"), parseTake('{"firings":[],"calls":-1}')]).toEqual([undefined, undefined]);
	});

	it("stops a Director at `maxCalls` with one `skipped`, and goes on from a snapshot", () => {
		const first = started();
		first.fire("closed");
		expect(first.take("director:warden")?.calls).toBe(1);
		first.fire("closed");
		first.fire("proposed");
		const saved: unknown = JSON.parse(JSON.stringify(first.instance.slice?.save()));
		expect(saved).toEqual({ queue: { warden: [{ n: 2, tick: 1, event: "votes.closed", payload: { line: "x" } }, { n: 3, tick: 1, event: "votes.proposed", payload: { line: "x" } }], clerk: [{ n: 1, tick: 1, event: "votes.proposed", payload: { line: "x" } }] }, calls: { warden: 1, clerk: 0 }, skipped: [], fired: { warden: 3, clerk: 1 } });
		const second = started();
		second.instance.slice?.load(saved, 2);
		for (const run of [first, second]) {
			expect([run.news("director:warden"), run.take("director:warden")?.firings.map((firing) => firing.n), run.take("director:warden")?.calls]).toEqual([true, [2, 3], 2]);
			run.fire("closed");
			run.fire("proposed");
			expect([run.news("director:warden"), run.take("director:warden"), run.emitted, run.take("director:clerk")?.firings.length]).toEqual([false, { firings: [], calls: 2 }, [["skipped", { director: "warden", reason: "maxCalls" }]], 2]);
		}
		// The written `skipped` is in the slice too: a resumed run does not write it again.
		const resumed = started();
		resumed.instance.slice?.load(JSON.parse(JSON.stringify(first.instance.slice?.save())), 1);
		resumed.fire("closed");
		expect([resumed.emitted, resumed.news("director:warden")]).toEqual([[], false]);
		const refused = (): string => {
			try {
				started().instance.slice?.load({ queue: {}, calls: { warden: "1" } }, 1);
			} catch (error) {
				if (error instanceof SwtError) return error.issues.map((issue) => issue.code).join();
			}
			return "loaded";
		};
		expect(refused()).toBe("SWT-M024");
	});

	it("gives a Director without calls left nothing (`maxCalls: 0`) and refuses a mechanic tool shown as `take` in a Director's grant", () => {
		const none = started({ directors: [{ use: "warden", limits: { maxCalls: 0 } }] });
		none.fire("closed");
		none.fire("closed");
		expect([none.news("director:warden"), none.emitted.length]).toEqual([false, 1]);
		const clash = (as: string, directors: NonNullable<GameData["directors"]>): string => {
			try {
				resolved({ mechanics: [{ use: "votes", as: { post: as } }], directors });
			} catch (error) {
				if (error instanceof SwtError) return error.issues.map((issue) => `${issue.code} ${issue.where?.path ?? "-"} ${JSON.stringify(issue.details)}`).join();
			}
			return "resolved";
		};
		expect(clash("take", [{ use: "warden" }, { use: "clerk" }])).toBe(`SWT-G013 mechanics[0] {"tools":["${DIRECTOR_TAKE}","@test/votes/votes/post"]}`);
		// `clerk` does not hold `post`, and a resident holds no `take` of the plugin: no clash.
		expect([clash("take", [{ use: "clerk" }]), clash("say", [{ use: "warden" }])]).toEqual(["resolved", "resolved"]);
	});
});
