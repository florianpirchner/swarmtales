// SPDX-License-Identifier: Apache-2.0
import { SwtError, type ActorSpec, type GameData, type PluginPort, type ResolvedPlugin } from "@swarmtales/contracts";
import { describe, expect, it } from "vitest";
import { actorsOf, residentsOf } from "../src/game/validate.ts";
import { appendRoster, rosterPlugin, RosterService } from "../src/roster/index.ts";

const unused = (): never => {
	throw new Error("the roster plugin does not use this part of the port");
};

/** A stub port over the actors of a game: only `actors` answers; `suspended` may not act. */
function stubPort(specs: readonly ActorSpec[], suspended: readonly string[] = []): PluginPort {
	const ids = specs.map((spec) => spec.id);
	return {
		id: "roster",
		source: "@swarmtales/sdk/roster",
		seed: 1,
		maxTicks: 1,
		tick: () => 0,
		emit: unused,
		call: unused,
		has: () => false,
		rng: unused,
		actors: {
			ids,
			ofKind: (kind) => specs.filter((spec) => spec.kind === kind).map((spec) => spec.id),
			has: (id) => specs.some((spec) => spec.id === id),
			mayAct: (id) => !suspended.includes(id),
			shared: (id, key) => specs.find((spec) => spec.id === id)?.shared[key],
			suspend: unused,
			resume: unused,
		},
		schedule: { at: unused },
		access: { lock: unused, unlock: unused, isLocked: unused, isOpen: unused, open: unused },
	};
}

const game: GameData = { schema: 1, id: "demo", residents: 4, teams: { X: ["A01", "A03"], O: ["A02"] }, roles: { scout: ["A03"] }, mechanics: [], end: { ticks: 1 } };
const actors: readonly ActorSpec[] = [...actorsOf(game, residentsOf(game).ids).actors, { id: "director:host", kind: "director", grant: "director", shared: { team: "X" } }];

/** Calls the service of a fresh instance, as the plugin `caller` would. */
function ask(method: string, input: unknown = {}, port: PluginPort = stubPort(actors)): unknown {
	const instance = rosterPlugin("1.2.3").create(port);
	return instance.services[0]?.call(method, input, "caller");
}

describe("the roster plugin", () => {
	it("is a plugin of the sdk that provides `roster` and nothing else", () => {
		const plugin = rosterPlugin("1.2.3");
		expect({ ...plugin, create: undefined }).toEqual({ id: "roster", package: "@swarmtales/sdk", version: "1.2.3", requires: [], provides: ["roster"], events: {}, audiences: {}, options: {}, create: undefined });
		const instance = plugin.create(stubPort(actors));
		expect({ ...instance, services: [] }).toEqual({ tools: [], services: [], listeners: [], hooks: {}, stages: {}, jobs: {}, limits: [], facts: {}, slice: undefined });
		expect(instance.services.map((service) => service.service)).toEqual([RosterService]);
		expect(Object.values(RosterService.methods).map((method) => method.kind)).toEqual(Array.from({ length: 6 }, () => "query"));
	});

	it("serves the residents, teams and roles that resolution wrote into `shared`", () => {
		expect(ask("ids")).toEqual(["A01", "A02", "A03", "A04"]);
		expect(ask("teams")).toEqual({ X: ["A01", "A03"], O: ["A02"] });
		expect(ask("roles")).toEqual({ scout: ["A03"] });
		expect([ask("teamOf", { resident: "A02" }), ask("teamOf", { resident: "A04" }), ask("teamOf", { resident: "host" })]).toEqual(["O", null, null]);
		expect([ask("roleOf", { resident: "A03" }), ask("roleOf", { resident: "A01" })]).toEqual(["scout", null]);
	});

	it("says who may act", () => {
		const port = stubPort(actors, ["resident:A02"]);
		expect([ask("present", { resident: "A01" }, port), ask("present", { resident: "A02" }, port), ask("present", { resident: "A09" }, port)]).toEqual([true, false, false]);
	});

	it("refuses a wrong input and an unknown method with SWT-M022", () => {
		const failure = (run: () => unknown): string => {
			try {
				run();
			} catch (error) {
				return error instanceof SwtError ? `${error.code}: ${error.issues[0]?.summary ?? ""}` : "no SwtError";
			}
			return "no error";
		};
		expect(failure(() => ask("teamOf", { resident: 7 }))).toBe('SWT-M022: the input of "roster.teamOf" is wrong (provider "roster", caller "caller"): /resident must be string');
		expect(failure(() => ask("ids", { resident: "A01" }))).toContain("SWT-M022");
		expect(failure(() => ask("toString"))).toBe('SWT-M022: the input of "roster.toString" is wrong (provider "roster", caller "caller"): names no method of the service');
	});

	it("is appended last, unless a plugin of the game provides `roster`", () => {
		const plugin = (id: string, provides: readonly string[]): ResolvedPlugin => ({ ...rosterPlugin("0.0.0"), id, provides });
		const plain = [plugin("board", ["board"]), plugin("marks", [])];
		expect(appendRoster(plain, "1.2.3").map((entry) => `${entry.id}@${entry.version}`)).toEqual(["board@0.0.0", "marks@0.0.0", "roster@1.2.3"]);
		const own = [plugin("cast", ["roster"]), plugin("marks", [])];
		expect(appendRoster(own, "1.2.3")).toBe(own);
	});
});
