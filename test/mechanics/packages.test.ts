/**
 * The mechanic packages of wave 3.0 (docs/design/carve-plan.md): one per carve id, each with the
 * head the teams start from. The heads fix the dependency graph of the corrected plan: every API
 * one of them requires or uses has exactly one provider, `requires` has no cycle, each head
 * declares only the shared events it owns, and every mechanic owner of LEGACY_EVENT_OWNERS has a
 * package.
 */
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { ApiDefinition } from "@swarmtales/contracts";
import { LEGACY_EVENT_OWNERS, LEGACY_OVERSEERS, legacyOwner } from "@swarmtales/chronicle";
import { arenaHead } from "@swarmtales/mechanic-arena";
import { castHead } from "@swarmtales/mechanic-cast";
import { channelsHead } from "@swarmtales/mechanic-channels";
import { motivesHead } from "@swarmtales/mechanic-motives";
import { exile, exileHead } from "@swarmtales/mechanic-exile";
import { goalsHead } from "@swarmtales/mechanic-goals";
import { ledgerHead } from "@swarmtales/mechanic-ledger";
import { marksHead } from "@swarmtales/mechanic-marks";
import { namesHead } from "@swarmtales/mechanic-names";
import { petitionsHead } from "@swarmtales/mechanic-petitions";
import { progressionHead } from "@swarmtales/mechanic-progression";
import { puzzlesHead } from "@swarmtales/mechanic-puzzles";
import { receiptsHead } from "@swarmtales/mechanic-receipts";
import { scriptHead } from "@swarmtales/mechanic-script";
import { sealHead } from "@swarmtales/mechanic-seal";
import { LEGACY_SILENT_EVENTS, SHARED_APIS } from "@swarmtales/mechanic-shared";
import { standoffHead } from "@swarmtales/mechanic-standoff";
import { standoffTribunalHead } from "@swarmtales/mechanic-standoff-tribunal";
import { tribunal, tribunalHead } from "@swarmtales/mechanic-tribunal";
import { whispersHead } from "@swarmtales/mechanic-whispers";

interface Head {
	readonly id: string;
	readonly events: Readonly<Record<string, unknown>>;
	readonly provides?: readonly ApiDefinition[];
	readonly requires?: readonly ApiDefinition[];
	readonly uses?: readonly ApiDefinition[];
}

/** In the corrected carve order (docs/design/carve-plan.md, "Order"). */
const HEADS: readonly Head[] = [
	namesHead, ledgerHead, marksHead, channelsHead, receiptsHead, whispersHead, puzzlesHead, progressionHead, castHead, motivesHead,
	goalsHead, petitionsHead, standoffHead, exileHead, tribunalHead, sealHead, standoffTribunalHead, scriptHead, arenaHead,
];

const names = (apis: readonly ApiDefinition[] | undefined): readonly string[] => (apis ?? []).map((api) => api.name);

/**
 * Shared APIs declared ahead of their provider: a head may only `use` them (never require them),
 * and each must get its provider in a later step, which removes it here. `ending`: the arena asks
 * it at the run's end (step 18, docs/design/step18-requests-A1.md); no mechanic provides it yet.
 */
const UNPROVIDED: readonly string[] = ["ending"];

/** `requires` order: a head after the providers of its required APIs (Kahn, ties by HEADS order). */
function requiresOrder(): readonly string[] {
	const provider = new Map(HEADS.flatMap((head) => names(head.provides).map((api) => [api, head.id] as const)));
	const placed: string[] = [];
	while (placed.length < HEADS.length) {
		const next = HEADS.find((head) => !placed.includes(head.id) && names(head.requires).every((api) => placed.includes(provider.get(api) ?? "")));
		if (next === undefined) throw new Error(`requires cycle among ${HEADS.filter((head) => !placed.includes(head.id)).map((head) => head.id).join(", ")}`);
		placed.push(next.id);
	}
	return placed;
}

describe("the mechanic packages", () => {
	it("are one folder per head, plus shared", () => {
		const folders = readdirSync(resolve(import.meta.dirname, "../../mechanics")).sort();
		// Not carved from the old engine: new mechanics written for the core (no legacy event owner, no head above).
		const newMechanics = ["card-table", "chess", "clue-grid", "consensus", "convoy", "draft-rounds", "econ-games", "grid-game", "hint-towers", "holdem", "liars-dice", "morris", "morris-referee", "optimal-referee", "salt-market", "sealed-auction", "strategy-brain", "team-channel", "trick-play"];
		expect(folders).toEqual([...HEADS.map((head) => head.id), ...newMechanics, "shared"].sort());
	});

	it("cover every mechanic owner of the old events (the gamemaker's tools go to the mechanics they act on)", () => {
		const overseers: readonly string[] = LEGACY_OVERSEERS;
		const owners = new Set(Object.values(LEGACY_EVENT_OWNERS).filter((owner) => owner !== "app" && owner !== "core" && !overseers.includes(owner)));
		expect([...owners].filter((owner) => !HEADS.some((head) => head.id === owner))).toEqual([]);
	});

	it("give every shared API exactly one provider", () => {
		const provided = HEADS.flatMap((head) => names(head.provides));
		expect(provided.filter((api) => UNPROVIDED.includes(api))).toEqual([]);
		expect([...provided, ...UNPROVIDED].sort()).toEqual(SHARED_APIS.map((api) => api.name).sort());
	});

	it("require and use only provided APIs, never their own", () => {
		const provided = new Set(HEADS.flatMap((head) => names(head.provides)));
		for (const head of HEADS) {
			for (const api of names(head.requires)) expect(UNPROVIDED, `${head.id} requires ${api}`).not.toContain(api);
			for (const api of [...names(head.requires), ...names(head.uses).filter((name) => !UNPROVIDED.includes(name))]) {
				expect(provided.has(api), `${head.id} -> ${api}`).toBe(true);
				expect(names(head.provides), `${head.id} -> ${api}`).not.toContain(api);
			}
		}
	});

	it("declare only shared events they own (a silent event has no old owner: its source is the head)", () => {
		const silent: readonly string[] = LEGACY_SILENT_EVENTS;
		for (const head of HEADS) {
			for (const type of Object.keys(head.events)) {
				if (silent.includes(`${head.id}.${type}`)) continue;
				expect(legacyOwner(type), type).toBe(head.id);
			}
		}
	});

	it("have no requires cycle, and the carve order respects requires", () => {
		expect(requiresOrder()).toEqual(HEADS.map((head) => head.id));
	});

	it("keep optional edges where the old engine called back (channels to standoff, names to puzzles, channels and exile)", () => {
		const uses = (head: Head): readonly string[] => names(head.uses);
		expect(uses(channelsHead)).toEqual(expect.arrayContaining(["receipts", "cast", "standoff", "standoff-tribunal"]));
		expect(uses(namesHead)).toEqual(["puzzles", "channels", "exile"]);
	});

	it("pin the exile's and the tribunal's edges on the definitions the stories load (round 3, R2-D18)", () => {
		const edges = (mechanic: Head) => ({ provides: names(mechanic.provides), requires: names(mechanic.requires), uses: names(mechanic.uses) });
		expect(edges(exile)).toEqual({ provides: ["exile"], requires: ["progression", "channels", "ledger", "standoff", "puzzles"], uses: ["seal", "goals", "tribunal"] });
		expect(edges(tribunal)).toEqual({ provides: ["tribunal", "tribunal-view"], requires: ["exile", "channels", "ledger", "progression"], uses: ["goals"] });
		// The heads in HEADS are the ones the mechanics are built from, not frozen copies.
		expect(edges(exileHead)).toEqual(edges(exile));
		expect(edges(tribunalHead)).toEqual(edges(tribunal));
	});
});
