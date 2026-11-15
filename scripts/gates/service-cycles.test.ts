// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * No service cycle (12-m5-spec.md, section 2.2, pattern 5, and section 4.6): if mechanic A asks mechanic B, B never
 * asks A, also not through a third mechanic. A asks B when a service in A's `requires` or `uses` is in B's
 * `provides`. The gate reads the heads of every mechanic, as the README generator does, and fails on each cycle it
 * finds.
 *
 * A contract of `mechanics/contracts` is no edge: it is the way back that the pattern allows ("nobody of them asks
 * `receipts` back except through `receipt-source`", section 2.3). Its user names no provider, and a provider may ask
 * its user (`grid-game` requires `consensus`, which asks `consensus-source` of it; a game asks `strategy-brain`,
 * which asks `brain-source` of it). Counted as edges, the two contracts of M3 and M4 make 18 cycles of the
 * repository at the scaffold of M5 (errata J1).
 */
import { describe, expect, it } from "vitest";
import * as shared from "../../mechanics/contracts/src/index.ts";
import { REPO_ROOT } from "../lib/files.ts";
import { loadMechanics } from "../mechanic-docs/head.ts";

/** What the gate reads of a head: its id and the names of the services it asks and provides. */
interface Asking {
	readonly id: string;
	readonly requires: readonly { readonly name: string }[];
	readonly uses: readonly { readonly name: string }[];
	readonly provides: readonly { readonly name: string }[];
}

/** One edge of asking: `from` asks `to` for `service`. */
interface Edge {
	readonly from: string;
	readonly to: string;
	readonly service: string;
}

/** The names of the services of `mechanics/contracts`, which are no edge. */
const CONTRACTS: ReadonlySet<string> = new Set(Object.values(shared).map((service) => service.name));

/**
 * Every edge of asking between the heads; a mechanic that asks a service it provides itself asks nobody.
 *
 * @param heads - The heads of the mechanics.
 * @param through - The services an edge may go through; all but the shared contracts when left out.
 * @returns The edges, in the order of the heads.
 */
function edgesOf(heads: readonly Asking[], through: (service: string) => boolean = (service) => !CONTRACTS.has(service)): readonly Edge[] {
	const providers = new Map<string, string[]>();
	for (const head of heads) for (const service of head.provides) providers.set(service.name, [...(providers.get(service.name) ?? []), head.id]);
	return heads.flatMap((head) =>
		[...head.requires, ...head.uses].filter((service) => through(service.name)).flatMap((service) => (providers.get(service.name) ?? []).filter((to) => to !== head.id).map((to) => ({ from: head.id, to, service: service.name }))),
	);
}

/**
 * The cycles of asking, each once, starting at its smallest id.
 *
 * @param heads - The heads of the mechanics.
 * @param through - As for {@link edgesOf}.
 * @returns One line per cycle, for example `a -(b-api)-> b -(a-api)-> a`.
 */
function serviceCycles(heads: readonly Asking[], through?: (service: string) => boolean): readonly string[] {
	const edges = edgesOf(heads, through);
	const found = new Set<string>();
	const walk = (path: readonly Edge[], start: string): void => {
		const at = path.at(-1)?.to ?? start;
		for (const edge of edges.filter((candidate) => candidate.from === at)) {
			if (edge.to === start) {
				const cycle = [...path, edge];
				if (cycle.every((step) => step.from >= start)) found.add(`${start}${cycle.map((step) => ` -(${step.service})-> ${step.to}`).join("")}`);
			} else if (edge.to > start && !path.some((step) => step.from === edge.to)) walk([...path, edge], start);
		}
	};
	for (const head of heads) walk([], head.id);
	return [...found].sort();
}

const head = (id: string, asks: { readonly requires?: readonly string[]; readonly uses?: readonly string[]; readonly provides?: readonly string[] }): Asking => ({
	id,
	requires: (asks.requires ?? []).map((name) => ({ name })),
	uses: (asks.uses ?? []).map((name) => ({ name })),
	provides: (asks.provides ?? []).map((name) => ({ name })),
});

const heads = (await loadMechanics(REPO_ROOT)).map((mechanic) => mechanic.head);

describe("no service cycle (M5, 4.6)", () => {
	it("holds in this repository", () => {
		expect(serviceCycles(heads)).toEqual([]);
	});

	it("does not pass on nothing: it reads every head and finds the edges", () => {
		expect(heads.map((entry) => entry.id)).toEqual(expect.arrayContaining(["channels", "ledger", "exile", "consensus", "grid-game", "strategy-brain"]));
		const edges = edgesOf(heads).map((edge) => `${edge.from} -> ${edge.to}`);
		expect(edges.length).toBeGreaterThan(5);
		expect(edges).toEqual(expect.arrayContaining(["grid-game -> consensus", "holdem -> strategy-brain"]));
		expect([...CONTRACTS]).toEqual(["allowance", "brain-source", "consensus-source", "identity", "receipt-source"]);
	});

	it("counts no edge through a shared contract; counted, the repository has the cycles of errata J1", () => {
		expect(edgesOf(heads).filter((edge) => CONTRACTS.has(edge.service))).toEqual([]);
		const all = serviceCycles(heads, () => true);
		expect(all.length).toBeGreaterThan(0);
		expect(all.every((cycle) => /-\((consensus|brain)-source\)->/.test(cycle))).toBe(true);
	});

	it("fails on a fixture of two heads that use each other", () => {
		const a = head("a", { uses: ["b-api"], provides: ["a-api"] });
		const b = head("b", { requires: ["a-api"], provides: ["b-api"] });
		expect(serviceCycles([a, b])).toEqual(["a -(b-api)-> b -(a-api)-> a"]);
	});

	it("fails on a cycle through a third mechanic, and lets the way back through a shared contract pass", () => {
		const names = head("names", { uses: ["puzzles"], provides: ["identity"] });
		const puzzles = head("puzzles", { uses: ["progression"], provides: ["puzzles"] });
		const back = head("progression", { requires: ["identity"], provides: ["progression"] });
		expect(serviceCycles([names, puzzles, back])).toEqual([]);
		const direct = head("progression", { requires: ["names"], provides: ["progression"] });
		const both = head("names", { uses: ["puzzles"], provides: ["identity", "names"] });
		expect(serviceCycles([both, puzzles, direct])).toEqual(["names -(puzzles)-> puzzles -(progression)-> progression -(names)-> names"]);
	});

	it("lets one direction pass, and a mechanic that asks what it provides itself", () => {
		const tribunal = head("tribunal", { uses: ["exile"], provides: ["tribunal"] });
		const exile = head("exile", { provides: ["exile"], uses: ["exile"] });
		expect(serviceCycles([tribunal, exile])).toEqual([]);
		expect(edgesOf([tribunal, exile])).toEqual([{ from: "tribunal", to: "exile", service: "exile" }]);
	});
});
