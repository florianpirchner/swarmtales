// SPDX-License-Identifier: LicenseRef-SUL-1.0
// The run-time check of service calls (A37, A119, issue M6-01): a mechanic that calls a service its head does not
// declare, as a JavaScript plugin can, is refused with SWT-M026 in a tool, a hook and a fact, before the port is asked.
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { SwtError, type ActorId, type PluginPort, type RandomSource, type ServiceDefinition } from "@swarmtales/contracts";
import { defineHead } from "../src/mechanic/define-head.ts";
import { defineMechanic } from "../src/mechanic/define-mechanic.ts";
import { defineService, reply } from "../src/mechanic/definers.ts";
import * as errors from "../src/errors.ts";

const query = { kind: "query", summary: "The count.", input: Type.Object({}), output: Type.Integer() } as const;
const Board = defineService({ name: "board", summary: "The board.", methods: { count: query } });
const Chat = defineService({ name: "chat", summary: "A channel.", methods: { count: query } });
const Ledger = defineService({ name: "ledger", summary: "Not declared.", methods: { count: query } });

/** How the mechanic reaches a service: the three calls of a context, as a plugin without types makes them. */
const WAYS = ["call", "tryCall", "has"] as const;
type Way = (typeof WAYS)[number];
/** The calls of a context or a view with the types of their services erased: what a JavaScript plugin sees. */
interface Erased {
	call(service: ServiceDefinition, method: string, input: unknown): unknown;
	tryCall(service: ServiceDefinition, method: string, input: unknown): unknown;
	has?(service: ServiceDefinition): boolean;
}
// The view of a fact has no `has`; the fact asks `tryCall` for it.
const reach = (erased: Erased, way: Way, service: ServiceDefinition): unknown => (way === "has" ? (erased.has ?? ((target) => erased.tryCall(target, "count", {})))(service) : erased[way](service, "count", {}));

const head = defineHead({
	id: "probe",
	package: "@test/probe",
	summary: "Reaches a service.",
	options: Type.Object({ way: Type.Union(WAYS.map((way) => Type.Literal(way)), { default: "call", description: "How it reaches the service." }), target: Type.String({ default: "ledger", description: "The service it reaches." }) }, { description: "The options." }),
	requires: [Board],
	uses: [Chat],
	tools: { probe: { description: "Reaches the service.", params: Type.Object({}) } },
});
const SERVICES: Readonly<Record<string, ServiceDefinition>> = { board: Board, chat: Chat, ledger: Ledger };
const target = (name: string): ServiceDefinition => SERVICES[name] ?? Ledger;
const probe = defineMechanic(head, {
	tools: { probe: { run: (_params, ctx) => reply(String(reach(ctx, ctx.options.way, target(ctx.options.target)))) } },
	hooks: { tickStarted: (ctx) => void reach(ctx, ctx.options.way, target(ctx.options.target)) },
	facts: { reached: { output: Type.String(), compute: (view) => String(reach(view, view.options.way, target(view.options.target))) } },
});

const random: RandomSource = { next: () => 0, int: (min) => min, pick: (items) => items[0] ?? raise(), shuffle: (items) => [...items] };
function raise(): never {
	throw new RangeError("pick of an empty list");
}
const ACTORS: readonly ActorId[] = ["resident:A01"];

/** An instance of the probe on a port that provides every service and notes every call it is asked. */
function instance(way: Way, service = "ledger"): { readonly run: Readonly<Record<"tool" | "hook" | "fact", () => unknown>>; readonly asked: string[] } {
	const asked: string[] = [];
	const port: PluginPort = {
		stage: () => undefined,
		id: "probe",
		source: "@test/probe/probe",
		seed: 1,
		maxTicks: 9,
		tick: () => 1,
		emit: () => undefined,
		call: (name) => (asked.push(`call ${name}`), 3),
		has: (name) => (asked.push(`has ${name}`), true),
		rng: () => random,
		actors: { ids: ACTORS, ofKind: () => ACTORS, has: () => true, mayAct: () => true, shared: () => undefined, suspend: () => undefined, resume: () => undefined },
		schedule: { at: () => undefined },
		access: { lock: () => undefined, unlock: () => undefined, isLocked: () => false, isOpen: () => true, open: () => [] },
	};
	const plugin = probe.resolve(probe.parseOptions({ way, target: service }), { render: () => "" }, "0.0.0");
	const created = plugin.create(port);
	const run = {
		tool: () => created.tools[0]?.prepare({}, "resident:A01")?.execute(),
		hook: () => created.hooks.tickStarted?.[0]?.run(),
		fact: () => created.facts.reached?.compute(),
	};
	return { run, asked };
}

const codeOf = (run: () => unknown): string => {
	try {
		run();
	} catch (error) {
		return error instanceof SwtError ? error.code : `not an SwtError: ${String(error)}`;
	}
	return "did not throw";
};

describe("the run-time check of service calls (A37)", () => {
	for (const way of WAYS) {
		it(`refuses an undeclared service through \`${way}\` in a tool, a hook and a fact with SWT-M026, before the port is asked`, () => {
			const { run, asked } = instance(way);
			expect([codeOf(run.tool), codeOf(run.hook), codeOf(run.fact)]).toEqual(["SWT-M026", "SWT-M026", "SWT-M026"]);
			expect(asked).toEqual([]);
		});
	}

	it("lets `call` reach `requires` only, and `tryCall` and `has` reach `requires` and `uses`", () => {
		for (const way of ["tryCall", "has"] as const) {
			for (const service of ["board", "chat"]) expect(codeOf(instance(way, service).run.tool)).toBe("did not throw");
		}
		expect(codeOf(instance("call", "board").run.tool)).toBe("did not throw");
		const used = instance("call", "chat");
		expect([codeOf(used.run.tool), codeOf(used.run.hook), codeOf(used.run.fact)]).toEqual(["SWT-M026", "SWT-M026", "SWT-M026"]);
		expect(used.asked).toEqual([]);
	});

	it("names the mechanic, the service and what to declare", () => {
		const error = (() => {
			try {
				instance("call").run.tool();
			} catch (thrown) {
				return thrown;
			}
			return undefined;
		})();
		expect(error).toBeInstanceOf(SwtError);
		expect(error instanceof SwtError ? error.issues[0] : undefined).toMatchObject({
			code: "SWT-M026",
			summary: 'mechanic "probe" called the service "ledger", which its head does not declare in `requires`',
			where: { package: "@test/probe" },
			details: { service: "ledger" },
		});
		expect(errors.undeclaredService({ mechanic: "probe", service: "ledger", optional: true })).toMatchObject({ summary: 'mechanic "probe" called the service "ledger", which its head does not declare in `requires` or `uses`', fix: 'Add the service "ledger" to `requires` or `uses` in the head of "probe", or remove the call.' });
		expect(errors.SDK_ERRORS["SWT-M026"]).toBe("the mechanic calls a service its head does not declare");
	});
});
