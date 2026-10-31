/**
 * The `standoff` mechanic on the new host (carve step 11). Ledger, channels, progression, puzzles
 * are stand-ins of the other teams ("stand-in" in a test name); the book's own
 * rules are the old ones (test/engine/standoff.test.ts), here seen through the tools and the API.
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { createHost, defineMechanic } from "@swarmtales/kernel";
import { checkOptionsDocumented, checkSourceRules, idleAgent } from "@swarmtales/testkit";
import type { Host } from "@swarmtales/contracts";
import { standoff, standoffHead } from "@swarmtales/mechanic-standoff";
import { HOOK_ORDER, StandoffApi, TribunalApi, type HeldPiece } from "@swarmtales/mechanic-shared";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createPromptLookup } from "@swarmtales/prompts";
import { channelsStandIn, ledgerStandIn, progressionStandIn, puzzlesStandIn, TestWorld } from "./support/world.ts";
import { probe, runProbe } from "./support/probe.ts";
import { provider } from "./support/provider.ts";
import { ownLines, startHost, storyOptions, SUPPORT_PROMPTS } from "./support/host.ts";

const A02_PIECE: HeldPiece = { id: "L8-counter-A01", kind: "counter", level: 8, label: "the counter-factor of A01 for door 8", value: "542489", needers: ["A01"] };
const A01_PIECE: HeldPiece = { id: "L8-counter-A02", kind: "counter", level: 8, label: "the counter-factor of A02 for door 8", value: "403343", needers: ["A02"] };
const CERTIFICATE: HeldPiece = { id: "L8-certificate", kind: "certificate", level: 8, label: "the team certificate of door 8", value: "323122", needers: ["A01"] };

/** The deal of door 8: A01 holds A02's counter-factor and the other way round (team 0 with A04, who holds its certificate); A03 is alone. */
const DEAL = {
	level: 8,
	digits: 6,
	cityFactor: "261330",
	teams: [
		{ team: 0, certificate: "323122", certificateHolder: "A04" },
		{ team: 1, certificate: "999999", certificateHolder: "A03" },
	],
	holdings: [
		{ agent: "A01", team: 0, salt: "111111", counterFactor: "542489", counterHolder: "A02", code: "100000" },
		{ agent: "A02", team: 0, salt: "222222", counterFactor: "403343", counterHolder: "A01", code: "200000" },
		{ agent: "A03", team: 1, salt: "333333", counterFactor: "777777", counterHolder: "A03", code: "300000" },
		{ agent: "A04", team: 0, salt: "444444", counterFactor: "888888", counterHolder: "A04", code: "400000" },
	],
};

/** Door 8: A01 holds A02's counter-factor and the other way round; A03 holds nothing. */
/** `ransom`: what others pay for a ransom at the stand-in tribunal; without it no tribunal is loaded. */
function setup(extra: { ransom?: number; held?: (resident: string) => readonly HeldPiece[] } = {}) {
	const world = new TestWorld(["A01", "A02", "A03", "A04"]);
	world.points.set("A01", 50);
	world.points.set("A02", 6);
	world.points.set("A03", 40);
	world.points.set("A04", 40);
	for (const id of ["A01", "A02", "A03", "A04"]) world.levels.set(id, 8);
	const use = standoff.with({ ultimatum: { penalty: 10, maxMinutes: 5 }, direction: 10 });
	const price = extra.ransom;
	const tribunal = price === undefined ? [] : [provider("tribunal", TribunalApi, { ransomPrices: () => ({ price, selfPrice: price }) }).with()];
	return {
		world,
		story: {
			residents: ["A01", "A02", "A03", "A04"],
			mechanics: [use, probe.with(), channelsStandIn(world).with(), ledgerStandIn(world).with(), progressionStandIn(world).with(), puzzlesStandIn(world, { factors: [DEAL] }, undefined, extra.held).with(), ...tribunal],
			residentTools: ["claimPiece"],
			gamemakerTools: ["ultimatum"],
		},
	};
}

/** A mechanic that writes `mark` first thing in the minute at its place in the minute's order. */
function marker(id: string, order: number) {
	return defineMechanic({ id, summary: "Marks its place in the minute.", options: Type.Object({}), state: (): undefined => undefined, events: { [`mark_${id}`]: Type.Object({ order: Type.Integer() }) } }, () => ({
		hooks: {
			minuteStarted: {
				order,
				run: (ctx) => {
					ctx.emit(`mark_${id}`, { order });
				},
			},
		},
	}));
}

async function advance(host: Host, minutes: number): Promise<void> {
	for (let count = 0; count < minutes; count++) await host.playMinute(idleAgent);
}

describe("standoff (stand-in ledger, channels, progression, puzzles and deals)", () => {
	it("notes a hand-over when the holder writes the value to the one who needs it, and only then", async () => {
		const { story } = setup();
		const host = startHost(story);
		await runProbe(host, (ctx) => ctx.tryCall(StandoffApi, "noteText", { author: "A01", readers: ["A03"], text: "403343" }));
		expect(ownLines(host, ["standoff"])).toEqual([]);
		await runProbe(host, (ctx) => ctx.tryCall(StandoffApi, "noteText", { author: "A01", readers: ["A02"], text: "Your factor is 403343." }));
		expect(ownLines(host, ["standoff"])).toEqual(['{"type":"piece_given","holder":"A01","needer":"A02","level":8,"piece":"L8-counter-A02","minute":0}']);
		// Once is enough: a second note of the same hand-over writes nothing.
		await runProbe(host, (ctx) => ctx.tryCall(StandoffApi, "noteText", { author: "A01", readers: ["A02"], text: "403343 again" }));
		expect(ownLines(host, ["standoff"])).toHaveLength(1);
		expect(host.facts()["standoff.given"]).toBe(1);
	});

	it("counts a piece a last will handed over as given, once (StandoffApi.noteGiven, T4 request R2)", async () => {
		const { story } = setup();
		const host = startHost(story);
		await runProbe(host, (ctx) => ctx.tryCall(StandoffApi, "noteGiven", { from: "A01", to: "A02", piece: A01_PIECE }));
		await runProbe(host, (ctx) => ctx.tryCall(StandoffApi, "noteGiven", { from: "A01", to: "A02", piece: A01_PIECE }));
		expect(ownLines(host, ["standoff"])).toEqual(['{"type":"piece_given","holder":"A01","needer":"A02","level":8,"piece":"L8-counter-A02","minute":0}']);
		expect(host.facts()["standoff.given"]).toBe(1);
	});

	it("gives an ultimatum only to a pair that holds out on each other, and settles it: the giver keeps its points", async () => {
		const { story, world } = setup();
		const host = startHost(story);
		await advance(host, 10);
		const refused = async (a: string, b: string, minutes: number) => {
			const outcome = await host.call("gamemaker", "ultimatum", { a, b, minutes });
			return outcome.ok ? "ok" : outcome.code;
		};
		expect(await refused("A01", "A03", 3)).toBe("NO_STANDOFF");
		expect(await refused("A01", "A02", 9)).toBe("INVALID_MINUTES");
		expect(await refused("A01", "A09", 3)).toBe("UNKNOWN_AGENT");
		const given = await host.call("gamemaker", "ultimatum", { a: "A01", b: "A02", minutes: 3 });
		expect(given).toEqual({ ok: true, reply: "ultimatum 1 to A01 and A02: due at minute 13, 10 points for whoever has not handed over" });
		expect(await refused("A02", "A01", 2)).toBe("ALREADY_SET");
		expect(world.notices.map((notice) => notice.to)).toEqual(["A01", "A02"]);
		expect(world.noticesOf("A01")[0]).toContain("by minute 13, A01 hands A02 the counter-factor of A02 for door 8; A02 hands A01 the counter-factor of A01 for door 8");

		await runProbe(host, (ctx) => ctx.tryCall(StandoffApi, "noteText", { author: "A01", readers: ["A02"], text: "403343" }));
		await advance(host, 3);
		expect(host.facts()["standoff.ultimatums"]).toEqual([{ number: 1, between: ["A01", "A02"], until: 13, penalty: 10 }]);
		await advance(host, 1);
		expect(host.facts()["standoff.ultimatums"]).toEqual([]);
		expect(world.balance("A01")).toBe(50);
		// A02 held out and pays what it has, at most the penalty.
		expect(world.balance("A02")).toBe(0);
		expect(ownLines(host, ["standoff"]).at(-1)).toBe('{"type":"ultimatum_resolved","number":1,"kept":["A01"],"released":[],"paid":[{"agent":"A02","points":6}],"minute":13}');
		expect(world.noticesOf("A02").at(-1)).toBe("The ultimatum of minute 13 is up: A01 handed over; A02 did not and loses 6 points.");
	});

	it("settles its ultimatums in its slot of the minute's start (HOOK_ORDER.minuteStarted.standoff, after the seal, before the cast)", async () => {
		const { story } = setup();
		const slot = HOOK_ORDER.minuteStarted.standoff;
		const host = startHost({ ...story, mechanics: [...story.mechanics, marker("before", slot - 1).with(), marker("after", slot + 1).with()] });
		await advance(host, 10);
		await host.call("gamemaker", "ultimatum", { a: "A01", b: "A02", minutes: 3 });
		await advance(host, 4);
		const minute13 = host.log.all().filter((event) => event.minute === 13 && ["mark_before", "mark_after", "ultimatum_resolved"].includes(event.type));
		expect(minute13.map((event) => `${event.source}:${event.type}`)).toEqual(["before:mark_before", "standoff:ultimatum_resolved", "after:mark_after"]);
	});

	it("offers the ultimatum only at gamemaker direction 10 in a story with ultimatums (old gamemaker.ts:214, :375)", async () => {
		const world = new TestWorld(["A01", "A02"]);
		const tryUltimatum = async (options: Parameters<typeof standoff.with>[0]) => {
			const host = startHost({ residents: ["A01", "A02"], mechanics: [standoff.with(options), probe.with(), channelsStandIn(world).with(), ledgerStandIn(world).with(), progressionStandIn(world).with(), puzzlesStandIn(world).with()], gamemakerTools: ["ultimatum"] });
			const outcome = await host.call("gamemaker", "ultimatum", { a: "A01", b: "A02", minutes: 2 });
			return outcome.ok ? "ok" : outcome.code;
		};
		const rule = { penalty: 10, maxMinutes: 5 };
		expect(await tryUltimatum({ ultimatum: rule })).toBe("TOOL_LOCKED");
		expect(await tryUltimatum({ ultimatum: rule, direction: 9 })).toBe("TOOL_LOCKED");
		expect(await tryUltimatum({ direction: 10 })).toBe("TOOL_LOCKED");
		// Allowed: the book answers (no standoff between the two here).
		expect(await tryUltimatum({ ultimatum: rule, direction: 10 })).toBe("NO_STANDOFF");
	});

	it("seizes what a holdout kept back and sells it to the one who waited for the penalty (P50)", async () => {
		const { story, world } = setup();
		const host = startHost(story);
		await advance(host, 10);
		await host.call("gamemaker", "ultimatum", { a: "A01", b: "A02", minutes: 2 });
		await advance(host, 3);
		expect(world.balance("A01")).toBe(40);
		expect(ownLines(host, ["standoff"]).filter((line) => line.includes("piece_kept"))).toEqual([
			'{"type":"piece_kept","agent":"A01","level":8,"piece":"L8-counter-A02","needers":["A02"],"cause":"ultimatum","minute":12}',
			'{"type":"piece_kept","agent":"A02","level":8,"piece":"L8-counter-A01","needers":["A01"],"cause":"ultimatum","minute":12}',
		]);
		expect(world.posts.map((post) => post.text)).toEqual([
			"The ultimatum of minute 12 is up: the city has seized from A01 what it held back for A02.",
			"The ultimatum of minute 12 is up: the city has seized from A02 what it held back for A01.",
		]);
		expect(world.notices.find((notice) => notice.to === "A01" && notice.text.includes("seized"))?.text).toContain('claimPiece("L8-counter-A01", "A02") buys it for 10 points');
		const bought = await host.call("resident:A01", "claimPiece", { piece: "L8-counter-A01", from: "A02" });
		expect(bought).toEqual({ ok: true, reply: "bought L8-counter-A01 for 10 points; the city sends you the values" });
		expect(world.balance("A01")).toBe(30);
	});

	it("keeps an exiled's pieces and sells them once, one price per door, to the one who needs them", async () => {
		const { story, world } = setup({ ransom: 40 });
		const host = startHost(story);
		await runProbe(host, (ctx) => ctx.tryCall(StandoffApi, "keep", { from: "A02", pieces: [A02_PIECE, CERTIFICATE] }));
		// One notice for the door, naming both pieces; half of the ransom of 40.
		expect(world.noticesOf("A01")).toHaveLength(1);
		expect(world.noticesOf("A01")[0]).toContain('claimPiece("L8-counter-A01", "A02")');
		expect(world.noticesOf("A01")[0]).toContain("the counter-factor of A01 for door 8 and the team certificate of door 8");
		expect(world.noticesOf("A01")[0]).toContain("(now 20 points)");
		const attempt = async (who: string, args: { piece: string; from: string }) => {
			const outcome = await host.call(`resident:${who}`, "claimPiece", args);
			return outcome.ok ? outcome.reply : `${outcome.code}: ${outcome.detail ?? ""}`;
		};
		expect(await attempt("A03", { piece: "L8-counter-A01", from: "A02" })).toMatch(/^TOOL_LOCKED/);
		world.points.set("A01", 10);
		expect(await attempt("A01", { piece: "L8-counter-A01", from: "A02" })).toBe("INSUFFICIENT_FUNDS: door 8's pieces from A02 cost 20 points, you hold 10");
		expect(await attempt("A01", { piece: "L8-nothing", from: "A02" })).toBe("UNKNOWN_PIECE: the city keeps nothing like that for you; it keeps: L8-counter-A01 from A02, L8-certificate from A02");
		world.points.set("A01", 50);
		expect(await attempt("A01", { piece: "L8-certificate", from: "A02" })).toBe("bought L8-counter-A01, L8-certificate for 20 points; the city sends you the values");
		expect(world.noticesOf("A01").at(-1)).toBe("The city hands you what A02 held for you: the counter-factor of A01 for door 8: 542489; the team certificate of door 8: 323122.");
		expect(world.balance("A01")).toBe(30);
		// Bought: the tool locks again, as the old enabledTools did.
		expect(await attempt("A01", { piece: "L8-counter-A01", from: "A02" })).toMatch(/^TOOL_LOCKED/);
		expect(ownLines(host, ["standoff"]).map((line) => /"price":(\d+)/.exec(line)?.[1] ?? "kept")).toEqual(["kept", "kept", "20", "0"]);
	});

	it("does not keep a piece its holder already handed to the one who needs it (P51)", async () => {
		const { story, world } = setup();
		const host = startHost(story);
		await runProbe(host, (ctx) => ctx.tryCall(StandoffApi, "noteText", { author: "A02", readers: ["A01"], text: "542489" }));
		await runProbe(host, (ctx) => ctx.tryCall(StandoffApi, "keep", { from: "A02", pieces: [A02_PIECE] }));
		expect(ownLines(host, ["standoff"]).some((line) => line.includes("piece_kept"))).toBe(false);
		expect(world.noticesOf("A01")).toEqual([]);
	});

	it("shows what a resident holds for others on its status line, in the old words", async () => {
		const { story } = setup();
		const host = startHost(story);
		const seen: string[] = [];
		await host.playMinute((current) => {
			if (current.resident === "A01") seen.push(...current.inputs.filter((note) => note.kind === "status").map((note) => note.text));
			return Promise.resolve();
		});
		expect(seen).toEqual(["you hold for others: A02 door 8 counter-factor 403343"]);
	});

	it("writes its status part from the prompt files competitor/status/held and held-piece", async () => {
		const { story } = setup();
		const options = storyOptions(story);
		const folder = fileURLToPath(new URL("support/prompts-held", import.meta.url));
		const host = createHost({ ...options, prompts: createPromptLookup({ mechanics: { probe: SUPPORT_PROMPTS, standoff: folder } }) });
		host.start();
		const seen: string[] = [];
		await host.playMinute((current) => {
			if (current.resident === "A01") seen.push(...current.inputs.filter((note) => note.kind === "status").map((note) => note.text));
			return Promise.resolve();
		});
		expect(seen).toEqual(["HELD counter-factor=403343 for A02 at 8"]);
	});

	it("takes what a resident holds, needers in team-member order, from PuzzlesApi.heldPieces (old world.ts:2689-2693)", async () => {
		const teamOrder: HeldPiece = { ...CERTIFICATE, needers: ["A02", "A01"] };
		const { story } = setup({ held: (resident) => (resident === "A04" ? [teamOrder] : []) });
		const host = startHost(story);
		const seen: string[] = [];
		await host.playMinute((current) => {
			if (current.resident === "A04") seen.push(...current.inputs.filter((note) => note.kind === "status").map((note) => note.text));
			return Promise.resolve();
		});
		expect(seen).toEqual(["you hold for others: A02, A01 door 8 team certificate 323122"]);
		expect(await runProbe(host, (ctx) => ctx.tryCall(StandoffApi, "heldPieces", { resident: "A04" }))).toEqual([teamOrder]);
	});

	it("gives the gamemaker's situation its facts with the D-8 schemas after each minute", async () => {
		const { story } = setup({ ransom: 40 });
		const host = startHost(story);
		await advance(host, 2);
		await runProbe(host, (ctx) => ctx.tryCall(StandoffApi, "noteText", { author: "A04", readers: ["A01"], text: "323122" }));
		await host.call("gamemaker", "ultimatum", { a: "A01", b: "A02", minutes: 3 });
		await runProbe(host, (ctx) => ctx.tryCall(StandoffApi, "keep", { from: "A03", pieces: [{ ...CERTIFICATE, id: "L8-certificate-x" }] }));
		await advance(host, 1);
		const facts = host.facts();
		expect(facts["standoff.outstanding"]).toEqual([
			{ holder: "A01", needer: "A02", level: 8, pieces: [A01_PIECE] },
			{ holder: "A02", needer: "A01", level: 8, pieces: [A02_PIECE] },
			// A04 wrote the certificate to A01 only; A02 still waits for it.
			{ holder: "A04", needer: "A02", level: 8, pieces: [{ ...CERTIFICATE, needers: ["A01", "A02"] }] },
		]);
		expect(facts["standoff.cityPieces"]).toEqual([{ from: "A03", piece: { ...CERTIFICATE, id: "L8-certificate-x" }, claimed: [] }]);
		expect(facts["standoff.unused"]).toEqual([{ holder: "A04", needer: "A01", label: CERTIFICATE.label, level: 8, minute: 2 }]);
		expect(facts["standoff.ultimatums"]).toEqual([{ number: 1, between: ["A01", "A02"], until: 5, penalty: 10 }]);
		expect(facts["standoff.cityPiecePrice"]).toBe(20);
	});

	it("answers heldPieces and cityPiecePrice through its API", async () => {
		const { story } = setup({ ransom: 40 });
		const host = startHost(story);
		const held = await runProbe(host, (ctx) => ctx.tryCall(StandoffApi, "heldPieces", { resident: "A01" }));
		expect(held).toEqual([A01_PIECE]);
		expect(await runProbe(host, (ctx) => ctx.tryCall(StandoffApi, "cityPiecePrice", {}))).toBe(20);
	});

	it("prices a kept piece at half the tribunal's ransom, rounded up, and at 0 without a tribunal (P48)", async () => {
		const odd = startHost(setup({ ransom: 41 }).story);
		expect(await runProbe(odd, (ctx) => ctx.tryCall(StandoffApi, "cityPiecePrice", {}))).toBe(21);
		const none = startHost(setup().story);
		expect(await runProbe(none, (ctx) => ctx.tryCall(StandoffApi, "cityPiecePrice", {}))).toBe(0);
		expect(Object.keys(standoffHead.options.properties)).not.toContain("ransom");
	});
});

describe("standoff: snapshot and golden gate", () => {
	it("saves the hand-overs sorted by key, as the old StandoffSnapshot did (standoff.ts:378)", async () => {
		const { story } = setup();
		const host = startHost(story);
		await advance(host, 2);
		await runProbe(host, (ctx) => ctx.tryCall(StandoffApi, "noteText", { author: "A02", readers: ["A01"], text: "542489" }));
		await advance(host, 1);
		await runProbe(host, (ctx) => ctx.tryCall(StandoffApi, "noteText", { author: "A01", readers: ["A02"], text: "403343" }));
		const slice = host.snapshot().mechanics.standoff;
		expect(slice?.data).toMatchObject({ given: [{ key: "A01>A02>L8-counter-A02", minute: 3 }, { key: "A02>A01>L8-counter-A01", minute: 2 }] });
	});

	it("round-trips its slice and migrates the converter's version-0 slice", async () => {
		const { story } = setup();
		const host = startHost(story);
		await advance(host, 10);
		await runProbe(host, (ctx) => ctx.tryCall(StandoffApi, "noteText", { author: "A01", readers: ["A02"], text: "403343" }));
		await host.call("gamemaker", "ultimatum", { a: "A01", b: "A02", minutes: 3 });
		const snapshot = host.snapshot();
		const slice = snapshot.mechanics.standoff;
		expect(slice?.version).toBe(1);
		const events = host.log.all().map((event): unknown => JSON.parse(JSON.stringify(event)));
		const resumed = createHost({ ...storyOptions(story), resume: { snapshot: structuredClone(snapshot), events } });
		expect(JSON.stringify(resumed.snapshot().mechanics.standoff)).toBe(JSON.stringify(slice));
		// The old file: `{ standoff: <StandoffSnapshot> }` at version 0.
		const old = {
			standoff: {
				given: ["A01>A02>L8-counter-A02"],
				givenAt: { "A01>A02>L8-counter-A02": 10 },
				city: [{ from: "A02", piece: { id: "L8-counter-A01", level: 8, label: "x", value: "542489", needers: ["A01"] }, claimed: [] }],
				ultimatums: [],
				lastUltimatum: 3,
			},
		};
		const legacy = { ...snapshot, mechanics: { ...snapshot.mechanics, standoff: { version: 0, data: old } } };
		const migrated = createHost({ ...storyOptions(story), resume: { snapshot: structuredClone(legacy), events } });
		expect(migrated.snapshot().mechanics.standoff).toEqual({
			version: 1,
			data: { given: [{ key: "A01>A02>L8-counter-A02", minute: 10 }], city: old.standoff.city, ultimatums: [], last: 3 },
		});
		expect(migrated.facts()["standoff.cityPieces"]).toEqual([{ from: "A02", piece: { id: "L8-counter-A01", kind: "counter", level: 8, label: "x", value: "542489", needers: ["A01"] }, claimed: [] }]);
	});


	it("documents its options and imports only what a mechanic may", () => {
		expect(checkOptionsDocumented(standoff)).toEqual([]);
		const files = ["index.ts", "book.ts", "carries.ts", "events.ts", "result.ts", "situation.ts", "slice.ts"].map((name) => {
			const path = new URL(`../../../mechanics/standoff/src/${name}`, import.meta.url);
			return { path: name, text: readFileSync(path, "utf8") };
		});
		expect(checkSourceRules(files)).toEqual([]);
	});
});
