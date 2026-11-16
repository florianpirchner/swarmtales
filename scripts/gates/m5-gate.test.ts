// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The gate of milestone M5 (issue M5-57): the parts of done-whens 4 and 8 of `12-m5-spec.md` (the list at its head)
 * that no earlier gate checks whole. The rest of each done-when has its own test, named in `docs/ISSUE-RECORD.md`,
 * "The gate of M5".
 *
 * - **Done-when 4, the recut:** the classes of section 1.1; the owners of section 2.3 read from the heads of every
 *   mechanic (who provides the three contracts of pattern 4 and the note desk, who reads them, and that each
 *   one-way coupling of the table asks in its direction only); `receipts` is asked through `receipt-source` alone;
 *   the old `ending` has no successor and `mechanics/shared` none either. That a base mechanic names no game mechanic
 *   is `base-alone.test.ts`, that no service cycle exists `service-cycles.test.ts`, that no mechanic imports the kernel
 *   the layer check (`pnpm check:layers`).
 * - **Done-when 8:** Whispers and the City are on `games/index.ts`, in `scripts/game-docs/catalogue.ts` and have their
 *   cards in `GAMES.md` (the generated blocks are `game-docs.test.ts`).
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GAMES } from "../../games/index.ts";
import * as shared from "../../mechanics/contracts/src/index.ts";
import { CARDS, FAMILIES } from "../game-docs/catalogue.ts";
import { FORBIDDEN_PACKAGES } from "../layers/table.ts";
import { readText, REPO_ROOT } from "../lib/files.ts";
import { loadMechanics, readManifest } from "../mechanic-docs/head.ts";

/** What the gate reads of a mechanic: its id, its class, and the names of the services it asks and provides. */
interface Owner {
	readonly id: string;
	readonly cls: string;
	readonly asks: readonly string[];
	readonly provides: readonly string[];
}

/** The class of each package of section 1.1 (the new ones and the four of M3 that M5 changes), by mechanic id. */
const CLASSES: Readonly<Record<string, string>> = {
	marks: "game", names: "game", petitions: "game", receipts: "game", motives: "game", progression: "game", cast: "game",
	whispers: "game", standoff: "game", "standoff-tribunal": "game", script: "game", arena: "game", goals: "game",
	tribunal: "game", seal: "game", interpretations: "director", ledger: "base", channels: "base", exile: "base",
	decisions: "base", puzzles: "game",
};

/** Section 2.2 pattern 4 and 2.3: each shared contract, the note desk and its one provider. */
const PROVIDERS: Readonly<Record<string, string>> = { identity: "names", allowance: "marks", "receipt-source": "receipts", notes: "channels" };

/** Section 2.3: the base mechanics that read a name, a count left and a receipt number through the contracts. */
const READERS: Readonly<Record<string, readonly string[]>> = { channels: ["identity", "allowance", "receipt-source"], ledger: ["identity", "receipt-source"], exile: ["identity"] };

/** Section 2.3: the couplings that go one way, as `asker asks asked`; the asked never asks back. */
const ONE_WAY: readonly (readonly [string, string])[] = [
	["marks", "progression"], ["names", "puzzles"], ["progression", "puzzles"], ["progression", "ledger"], ["receipts", "progression"],
	["standoff", "tribunal"], ["seal", "tribunal"], ["seal", "exile"], ["goals", "exile"], ["goals", "motives"], ["arena", "progression"],
	["arena", "ledger"], ["motives", "whispers"], ["whispers", "channels"], ["whispers", "ledger"], ["standoff-tribunal", "channels"],
	["tribunal", "exile"], ["puzzles", "channels"], ["puzzles", "exile"],
];

/** The services of `mechanics/contracts`: asking one names no provider (pattern 4). */
const CONTRACTS: ReadonlySet<string> = new Set(Object.values(shared).map((service) => service.name));

/** The ids that `from` asks `to` through, the shared contracts left out. */
function through(owners: readonly Owner[], from: string, to: string): readonly string[] {
	const asked = owners.find((owner) => owner.id === to)?.provides ?? [];
	return (owners.find((owner) => owner.id === from)?.asks ?? []).filter((service) => !CONTRACTS.has(service) && asked.includes(service));
}

/** The problems of the classes, the providers and their readers. */
function ownerProblems(owners: readonly Owner[]): readonly string[] {
	const byId = new Map(owners.map((owner) => [owner.id, owner]));
	const classes = Object.entries(CLASSES).flatMap(([id, cls]) => (byId.get(id)?.cls === cls ? [] : [`${id} is not of the class ${cls} (1.1)`]));
	const providers = Object.entries(PROVIDERS).flatMap(([service, provider]) => {
		const found = owners.filter((owner) => owner.provides.includes(service)).map((owner) => owner.id);
		return found.length === 1 && found[0] === provider ? [] : [`${service} is provided by [${found.join(", ")}], not by ${provider} alone (2.2, 2.3)`];
	});
	const readers = Object.entries(READERS).flatMap(([id, services]) => services.filter((service) => !(byId.get(id)?.asks ?? []).includes(service)).map((service) => `${id} does not read ${service} (2.3)`));
	return [...classes, ...providers, ...readers];
}

/** The problems of the one-way couplings, of the way back to `receipts` and of the dropped `ending`. */
function directionProblems(owners: readonly Owner[]): readonly string[] {
	const ways = ONE_WAY.flatMap(([asker, asked]) => [
		...(through(owners, asker, asked).length > 0 ? [] : [`${asker} does not ask ${asked} (2.3)`]),
		...through(owners, asked, asker).map((service) => `${asked} asks ${asker} back through ${service} (2.3)`),
	]);
	const receipts = (owners.find((owner) => owner.id === "receipts")?.provides ?? []).filter((service) => !CONTRACTS.has(service)).map((service) => `receipts provides ${service}, a way back that is no shared contract (2.3)`);
	const ending = owners.filter((owner) => [...owner.asks, ...owner.provides].includes("ending")).map((owner) => `${owner.id} names the dropped service ending (2.3)`);
	return [...ways, ...receipts, ...ending];
}

/** The problems of the recut over the owners and the folders under `mechanics/`. */
function recutProblems(owners: readonly Owner[], folders: readonly string[]): readonly string[] {
	const successor = folders.filter((folder) => folder.includes("shared")).map((folder) => `mechanics/${folder} is a successor of mechanics/shared`);
	const forbidden = FORBIDDEN_PACKAGES.some((name) => name === "@swarmtales/mechanic-shared") ? [] : ["the layer check no longer forbids @swarmtales/mechanic-shared"];
	return [...ownerProblems(owners), ...directionProblems(owners), ...successor, ...forbidden];
}

const folders = readdirSync(join(REPO_ROOT, "mechanics"), { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
const owners: readonly Owner[] = (await loadMechanics(REPO_ROOT)).map(({ folder, head }) => {
	const field = readManifest(join(REPO_ROOT, "mechanics", folder, "package.json"))?.swarmtales;
	const cls: unknown = typeof field === "object" && field !== null ? Reflect.get(field, "class") : undefined;
	return { id: head.id, cls: typeof cls === "string" ? cls : "", asks: [...head.requires, ...head.uses].map((service) => service.name), provides: head.provides.map((service) => service.name) };
});

const change = (id: string, patch: Partial<Owner>): readonly Owner[] => owners.map((owner) => (owner.id === id ? { ...owner, ...patch } : owner));
const ownerOf = (id: string): Owner | undefined => owners.find((owner) => owner.id === id);

describe("done-when 4 of M5: the recut of the City cluster", () => {
	it("holds in this repository", () => {
		expect(recutProblems(owners, folders)).toEqual([]);
	});

	it("does not pass on nothing: it reads every mechanic of the cluster and the edges of the table", () => {
		expect(owners.map((owner) => owner.id)).toEqual(expect.arrayContaining(Object.keys(CLASSES)));
		expect(ONE_WAY.every(([asker, asked]) => through(owners, asker, asked).length > 0)).toBe(true);
		expect(existsSync(join(REPO_ROOT, "mechanics", "shared"))).toBe(false);
	});

	it("fails on a way back, a second provider, a lost reader, a changed class and a successor of shared", () => {
		const back = change("progression", { asks: [...(ownerOf("progression")?.asks ?? []), "allowance", "ending"] });
		expect(recutProblems(change("marks", { provides: ["allowance", "marks"] }).map((owner) => (owner.id === "progression" ? { ...owner, asks: [...owner.asks, "marks"] } : owner)), folders)).toEqual(["progression asks marks back through marks (2.3)"]);
		expect(recutProblems(back, folders)).toEqual(["progression names the dropped service ending (2.3)"]);
		expect(recutProblems(change("cast", { provides: ["cast", "identity"] }), folders)).toEqual(["identity is provided by [cast, names], not by names alone (2.2, 2.3)"]);
		expect(recutProblems(change("ledger", { asks: ["roster"], cls: "game" }), folders)).toEqual(["ledger is not of the class base (1.1)", "ledger does not read identity (2.3)", "ledger does not read receipt-source (2.3)"]);
		expect(recutProblems(change("receipts", { provides: ["receipt-source", "receipts"] }), [...folders, "city-shared"])).toEqual(["receipts provides receipts, a way back that is no shared contract (2.3)", "mechanics/city-shared is a successor of mechanics/shared"]);
	});
});

describe("done-when 8 of M5: the two games in the catalogue", () => {
	it("lists Whispers and the City on the games list, in the catalogue and with their cards", () => {
		const catalogued = FAMILIES.flatMap((family) => family.games.map((game) => game.folder));
		const text = readText("GAMES.md");
		for (const name of ["whispers", "city"]) {
			expect(GAMES.map((entry) => entry.name)).toContain(name);
			expect(catalogued).toContain(name);
			expect(text).toContain(`\n## ${CARDS[name]?.title ?? name}\n`);
		}
		expect([CARDS.whispers?.title, CARDS.city?.title]).toEqual(["Whispers", "City of Keys"]);
	});
});
