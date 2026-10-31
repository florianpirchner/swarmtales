/**
 * The exile and the tribunal on the new host, beside the differential tests: the ExileApi queries
 * and strikes, a will with two pieces of the same value, the two copies of the local adapters, the
 * conformance checks, the snapshot slices (round trip and the converter's version 0), the resume
 * of every `snapshot-L7` and the golden gates (no golden log has an exile or tribunal line).
 */
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { convertLegacySnapshot } from "@swarmtales/chronicle";
import { competitorIds, createHost } from "@swarmtales/kernel";
import { checkOptionsDocumented, checkSourceRules, goldenCalls, goldenDiff, goldenOrder, goldenTurnInputs, inputPart, standInsFor } from "@swarmtales/testkit";
import type { TribunalSpec } from "@swarmtales/contracts";
import { ExileApi, SHARED_EVENTS, type HeldPiece } from "@swarmtales/mechanic-shared";
import { exile } from "@swarmtales/mechanic-exile";
import { tribunal } from "@swarmtales/mechanic-tribunal";
import cityOfKeys from "../../../stories/cityofkeys/story.ts";
import { standIns, TestCity } from "./support/city.ts";
import { GOLDEN_LOGS, goldenLog, ownLines, runProbe, startHost, storyOptions } from "./support/host.ts";

const IDS = competitorIds(6);

function spec(): TribunalSpec {
	const found = cityOfKeys.tribunal;
	if (found === undefined) throw new Error("cityofkeys has no tribunal");
	// The city never calls on its own here: the tests open the gates themselves.
	return { ...found, first: { ...found.first, latestAfter: 1000 } };
}

function city6() {
	const city = new TestCity(IDS, 30);
	const host = startHost({ residents: IDS, mechanics: [...standIns(city), exile.with(), tribunal.with(spec())], residentTools: ["payRansom", "lastWill"] });
	const toGate = (resident: string, until: number) => runProbe(host, (ctx) => ctx.tryCall(ExileApi, "toGate", { resident, until, ransomable: true, voters: [], price: 20, selfPrice: 30 }));
	return { city, host, toGate };
}

async function play(host: ReturnType<typeof city6>["host"], minutes: number): Promise<void> {
	for (let count = 0; count < minutes; count++) await host.playMinute(() => Promise.resolve());
}

describe("exile: the API", () => {
	it("tells who is at the gate and who is gone, by whom, and strikes for the seal and the holdout tribunal", async () => {
		const { city, host, toGate } = city6();
		await toGate("A01", 3);
		const ask = () =>
			runProbe(host, (ctx) => ({
				exiled: IDS.filter((id) => ctx.tryCall(ExileApi, "isExiled", { resident: id })),
				standing: ctx.tryCall(ExileApi, "standing", { resident: "A01" }),
				alive: ctx.tryCall(ExileApi, "alive", {}),
				by: IDS.map((id) => ctx.tryCall(ExileApi, "exiledBy", { resident: id })),
			}));
		expect(await ask()).toEqual({ exiled: [], standing: { kind: "gate", until: 3 }, alive: IDS, by: [null, null, null, null, null, null] });
		const strike = (resident: string, by: "seal" | "holdout") => runProbe(host, (ctx) => ctx.tryCall(ExileApi, "strike", { resident, by }));
		expect(await strike("A02", "holdout")).toEqual({ ok: true });
		expect(await strike("A02", "holdout")).toEqual({ ok: false, code: "ALREADY_EXILED", detail: "A02 has left the city already" });
		// The holdout's strike burns nothing, keeps nothing and contracts nothing (old `#onStruck`): the goal and the seal hear of it.
		expect(city.effects.map((entry) => entry.kind).slice(-2)).toEqual(["goalsExiled", "sealExiled"]);
		expect(await strike("A03", "seal")).toEqual({ ok: true });
		expect(await strike("A03", "seal")).toEqual({ ok: false, code: "ALREADY_EXILED", detail: "A03 has left the city already" });
		expect(city.of("burn")).toEqual([{ agent: "A03", amount: 30, reason: "exiled A03" }]);
		await play(host, 4);
		expect(await ask()).toEqual({
			exiled: ["A01", "A02", "A03"],
			standing: { kind: "exiled" },
			alive: ["A04", "A05", "A06"],
			by: ["tribunal", "holdout", "seal", null, null, null],
		});
		expect(ownLines(host, ["exile"]).filter((line) => line.includes('"exiled"'))).toEqual([
			'{"type":"exiled","agent":"A02","by":"holdout","minute":0}',
			'{"type":"exiled","agent":"A03","by":"seal","minute":0}',
			'{"type":"exiled","agent":"A01","minute":3}',
		]);
	});

	it("leaves two pieces of the same value to two heirs, each with its own notice and hand-over (old `lastWill`: pieces by id)", async () => {
		const { city, host, toGate } = city6();
		const piece = (id: string, needer: string): HeldPiece => ({ id, kind: "counter", level: 8, label: `the counter-factor of ${needer} for door 8`, value: "424242", needers: [needer] });
		city.held.set("A01", [piece("L8-counter-A02", "A02"), piece("L8-counter-A03", "A03")]);
		await toGate("A01", 5);
		const outcome = await host.call("resident:A01", "lastWill", { text: "Both.", bequests: [{ to: "A02", factor: "L8-counter-A02" }, { to: "A03", factor: "L8-counter-A03" }] });
		expect(outcome).toEqual({ ok: true, reply: "your will is written · L8-counter-A02 to A02 · L8-counter-A03 to A03" });
		expect(city.of("noteGiven").map((entry) => JSON.stringify(entry))).toEqual([
			JSON.stringify({ from: "A01", to: "A02", piece: piece("L8-counter-A02", "A02") }),
			JSON.stringify({ from: "A01", to: "A03", piece: piece("L8-counter-A03", "A03") }),
		]);
		expect(city.of("noteHeir")).toEqual(["A02", "A03"]);
		await play(host, 6);
		// Both were bequeathed: the city keeps neither.
		expect(city.of("keep")).toEqual([]);
	});
});

describe("exile and tribunal: conformance", () => {
	it("documents every option and keeps the source rules", () => {
		expect(checkOptionsDocumented(exile)).toEqual([]);
		expect(checkOptionsDocumented(tribunal)).toEqual([]);
		for (const id of ["exile", "tribunal"]) {
			const folder = new URL(`../../../mechanics/${id}/src/`, import.meta.url);
			const files = readdirSync(folder).map((name) => ({ path: `${id}/${name}`, text: readFileSync(new URL(name, folder), "utf8") }));
			expect(checkSourceRules(files)).toEqual([]);
		}
	});
});

describe("exile and tribunal: snapshots", () => {
	it("round-trips both slices mid-run", async () => {
		const { host, toGate } = city6();
		await toGate("A01", 9);
		await host.call("resident:A01", "lastWill", { text: "x", bequests: [{ to: "A02", points: 1 }] });
		await host.call("resident:A02", "payRansom", { target: "A01", amount: 3 });
		await play(host, 2);
		const snapshot = host.snapshot();
		const events = host.log.all().map((event): unknown => JSON.parse(JSON.stringify(event)));
		const city = new TestCity(IDS, 30);
		const resumed = createHost({ ...storyOptions({ residents: IDS, mechanics: [...standIns(city), exile.with(), tribunal.with(spec())] }), resume: { snapshot: structuredClone(snapshot), events } });
		expect(JSON.stringify(resumed.snapshot().mechanics)).toBe(JSON.stringify(snapshot.mechanics));
		expect(snapshot.mechanics.exile?.version).toBe(1);
		expect(snapshot.mechanics.tribunal?.version).toBe(1);
	});

	it("migrates the converter's version-0 exile slice: a gate with a will and prices, the exiled, the ransomed and the holdout's struck", async () => {
		const { host } = city6();
		const snapshot = host.snapshot();
		const gate = { agent: "A01", since: 0, until: 2, ransomable: true, price: 20, selfPrice: 30, voters: ["A05"], payments: [{ payer: "A06", amount: 4 }], will: { text: "farewell", factors: ["L8-x"] } };
		const old = { tribunal: { gates: [gate], exiled: ["A02"], ransomed: ["A03"] }, holdout: { struck: ["A04"] } };
		const mechanics = { ...snapshot.mechanics, exile: { version: 0, data: old } };
		const suspensions = { A02: ["exile"], A04: ["exile"] };
		const city = new TestCity(IDS, 30);
		const events = host.log.all().map((event): unknown => JSON.parse(JSON.stringify(event)));
		const resumed = createHost({
			...storyOptions({ residents: IDS, mechanics: [...standIns(city), exile.with(), tribunal.with(spec())] }),
			resume: { snapshot: { ...snapshot, mechanics, residents: { ...snapshot.residents, suspensions } }, events },
		});
		expect(resumed.snapshot().mechanics.exile).toEqual({
			version: 1,
			data: {
				gates: [{ resident: "A01", since: 0, until: 2, ransomable: true, voters: ["A05"], price: 20, selfPrice: 30, payments: [{ payer: "A06", amount: 4 }], will: { text: "farewell", factors: ["L8-x"] } }],
				gone: [
					{ resident: "A02", by: "tribunal" },
					{ resident: "A04", by: "holdout" },
				],
				ransomed: ["A03"],
			},
		});
		expect(await runProbe(resumed, (ctx) => IDS.map((id) => ctx.tryCall(ExileApi, "exiledBy", { resident: id })))).toEqual([null, "tribunal", null, "holdout", null, null]);
		await play(resumed, 3);
		// The will's text is read out when the gate closes, as the old `#closeGate` did.
		expect(city.of("post").slice(0, 2)).toEqual(["The gate has closed. The city has struck A01 from its register. No one will hear A01 again.", "Last will of A01: farewell"]);
	});

	const files = ["06a-01", "06a-02", "06a-04", "12a-01", "12a-02"].map((name) => `cityofkeys-act1-${name}`);
	it.each(files)("resumes %s/snapshot-L7 and continues it as the old world did: nothing before the act", async (name) => {
		const path = new URL(`../../../examples/${name}/snapshot-L7.json`, import.meta.url);
		const raw: unknown = JSON.parse(readFileSync(path, "utf8"));
		const converted = convertLegacySnapshot(raw, {}, name);
		const ids = converted.host.residents.ids;
		const city = new TestCity(ids, 15);
		city.actStart = null;
		const options = storyOptions({
			id: converted.host.story,
			seed: converted.host.seed,
			residents: ids,
			minutes: 80,
			mechanics: [...standIns(city, "-stand-in"), ...standInsFor(converted.host, ["exile", "tribunal"], { events: SHARED_EVENTS }), exile.with(), tribunal.with(spec())],
		});
		// A file written before the tribunal (06a-01) has no `world.tribunal`, and the converter then gives neither the exile nor
		// the tribunal a slice; the old world started a fresh tribunal, and the host loads both from the empty version-0 slice (R2-D2).
		const host = createHost({ ...options, resume: { snapshot: converted.host, events: converted.events } });
		expect(converted.host.mechanics.tribunal === undefined).toBe(name === "cityofkeys-act1-06a-01");
		const before = host.snapshot().mechanics;
		expect(before.exile?.data).toEqual({ gates: [], gone: [], ransomed: [] });
		expect(before.tribunal?.data).toEqual({ announced: false, sessions: [], called: 0, ended: false, halted: false, lastTick: -1 });
		const seq = host.log.all().length;
		for (let count = 0; count < 10; count++) await host.playMinute(() => Promise.resolve());
		// The old world's tribunal waits for its act (Act II starts when a resident reaches door 8, shut here): it writes nothing.
		expect(host.log.all().slice(seq).filter((event) => event.source === "exile" || event.source === "tribunal")).toEqual([]);
	});
});

describe("exile and tribunal: the golden gates", () => {
	const TOOLS = ["vote", "nominate", "join", "refuse", "payRansom", "lastWill", "scheduleTribunal"];
	/** The old status parts of the exile and the tribunal (turn-input.ts `tribunalParts`, `draftParts`). */
	const PARTS = /(^|· )(exiled|accused · |at the gate until|tribunal vote open|faction draft: )/;
	it.each(GOLDEN_LOGS)("%s: holds no exile or tribunal line, call or status part, and the mechanics write none when loaded", async (name) => {
		const lines = goldenLog(name);
		expect(goldenOrder(lines, ["exile", "tribunal"])).toEqual([]);
		expect(goldenCalls(lines).filter((call) => TOOLS.includes(call.tool))).toEqual([]);
		const parts = goldenTurnInputs(lines).map((input) => inputPart(input, "[status]") ?? "");
		expect(parts.filter((part) => part.split(" · ").some((piece) => PARTS.test(`${piece} · `)))).toEqual([]);
		// Loaded on the golden's six residents for its 13 minutes with the City of Keys' own spec, fed the golden's progress
		// (door 8 reached at minute 7, so the act starts then; door 10 passed at minute 10): no tribunal fits before the run
		// ends, so the old one wrote nothing, and so must the new one.
		const city = new TestCity(IDS, 15);
		const story = cityOfKeys.tribunal;
		if (story === undefined) throw new Error("cityofkeys has no tribunal");
		// Whispers has no tribunal (its holdout tribunal strikes through the exile): the exile alone.
		const host = startHost({ residents: IDS, minutes: 13, mechanics: [...standIns(city), exile.with(), ...(name.startsWith("cityofkeys") ? [tribunal.with(story)] : [])] });
		for (let minute = 0; minute < 13; minute++) {
			city.actStart = minute >= 8 ? 7 : null;
			city.passed = minute >= 10 ? ["A05"] : [];
			await play(host, 1);
		}
		expect(goldenDiff([], ownLines(host, ["exile", "tribunal"]))).toEqual([]);
		expect(host.log.all().filter((event) => event.source === "tribunal" || event.source === "exile")).toEqual([]);
	});
});
