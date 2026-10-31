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
import { LEGACY_EVENT_OWNERS, legacyOwner } from "@swarmtales/chronicle";
import { arenaHead } from "@swarmtales/mechanic-arena";
import { castHead } from "@swarmtales/mechanic-cast";
import { channelsHead } from "@swarmtales/mechanic-channels";
import { motivesHead } from "@swarmtales/mechanic-motives";
import { exileHead } from "@swarmtales/mechanic-exile";
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
import { tribunalHead } from "@swarmtales/mechanic-tribunal";
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
		expect(folders).toEqual([...HEADS.map((head) => head.id), "shared"].sort());
	});

	it("cover every mechanic owner of the old events (the gamemaker's tools go to the mechanics they act on)", () => {
		const owners = new Set(Object.values(LEGACY_EVENT_OWNERS).filter((owner) => owner !== "app" && owner !== "core"));
		expect([...owners].filter((owner) => !HEADS.some((head) => head.id === owner))).toEqual([]);
	});

	it("give every shared API exactly one provider", () => {
		const provided = HEADS.flatMap((head) => names(head.provides));
		expect([...provided].sort()).toEqual(SHARED_APIS.map((api) => api.name).sort());
	});

	it("require and use only provided APIs, never their own", () => {
		const provided = new Set(HEADS.flatMap((head) => names(head.provides)));
		for (const head of HEADS) {
			for (const api of [...names(head.requires), ...names(head.uses)]) {
				expect(provided.has(api), `${head.id} -> ${api}`).toBe(true);
				expect(names(head.provides), `${head.id} -> ${api}`).not.toContain(api);
			}
		}
	});

	it("declare only shared events they own (a silent event has no old owner: its source is the head)", () => {
		const silent: readonly string[] = LEGACY_SILENT_EVENTS;
		// The `defy` tool is the whisperer's, but the old owner table (core) names channels for its line (request R2-5 of T1).
		const foreign: readonly string[] = ["whispers.gamemaker_defied"];
		for (const head of HEADS) {
			for (const type of Object.keys(head.events)) {
				if (silent.includes(`${head.id}.${type}`) || foreign.includes(`${head.id}.${type}`)) continue;
				expect(legacyOwner(type), type).toBe(head.id);
			}
		}
	});

	it("have no requires cycle, and the carve order respects requires", () => {
		expect(requiresOrder()).toEqual(HEADS.map((head) => head.id));
	});

	it("keep optional edges where the old engine called back (channels to standoff, exile to seal and goals)", () => {
		const uses = (head: Head): readonly string[] => names(head.uses);
		expect(uses(channelsHead)).toEqual(expect.arrayContaining(["receipts", "cast", "standoff", "standoff-tribunal"]));
		expect(uses(exileHead)).toEqual(["seal", "goals"]);
		expect(uses(namesHead)).toEqual(["puzzles", "channels", "exile"]);
	});
});
