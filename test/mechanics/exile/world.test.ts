/**
 * World-level differential tests of the exile against the old `World` (packages/engine): the old
 * City of Keys sends a resident to the gate at minute 24; the new host gets the same city (points,
 * levels, held pieces, who passed what) on stand-ins, the real standoff, and the same gate through
 * `ExileApi.toGate`. Then both take the same wills, ransoms and ultimatums, and the gate closes on
 * both. One merged list is compared, in log order: the exile's events, the standoff's, the puzzle
 * stand-in's, and every effect (posts, notices, bookings, and the calls into goals and the seal).
 * The tribunal on the new side never calls (its first call is pushed past the run).
 */
import { describe, expect, it } from "vitest";
import { competitorIds } from "@swarmtales/kernel";
import type { AnyStory, EventEnvelope, Host } from "@swarmtales/contracts";
import { ExileApi } from "@swarmtales/mechanic-shared";
import { exile } from "@swarmtales/mechanic-exile";
import { standoff } from "@swarmtales/mechanic-standoff";
import { tribunal } from "@swarmtales/mechanic-tribunal";
import cityOfKeys from "../../../stories/cityofkeys/story.ts";
import { renderSection } from "../tribunal/support/section.ts";
import { standIns, TestCity } from "./support/city.ts";
import { replayOld } from "../../helpers/old-engine.ts";
import { HeldPiece } from "../../helpers/old-world.ts";
import { Type, type Static } from "typebox";
import { runProbe, startHost } from "./support/host.ts";

/** The City of Keys without names and core motives (labels and cues of other teams); goals and the seal stay, their calls are compared. */
function withoutOthers(story: AnyStory): { readonly story: AnyStory; readonly left: readonly unknown[] } {
	const { names, coreMotives, ...rest } = story;
	return { story: rest, left: [names, coreMotives] };
}

const { story: STORY, left: LEFT_OUT } = withoutOthers(cityOfKeys);
const IDS = competitorIds(6);
const AUTHOR = cityOfKeys.gamemaker?.author ?? "COURIER";

interface Call {
	readonly tool: "lastWill" | "payRansom" | "ultimatum";
	readonly agent: string;
	readonly params: Record<string, unknown>;
}

async function newReply(host: Host, call: Call): Promise<string> {
	const outcome = await host.call(call.tool === "ultimatum" ? "gamemaker" : `resident:${call.agent}`, call.tool, call.params);
	return outcome.ok ? outcome.reply : outcome.detail === undefined ? outcome.code : `${outcome.code}: ${outcome.detail}`;
}

const Gate = Type.Object({ agent: Type.String(), until: Type.Number(), ransomable: Type.Boolean(), price: Type.Number(), selfPrice: Type.Number() });
/** The old city at the gate: who is at the gate, and each resident's points, level, held pieces and passed doors. */
const OldCityRecord = Type.Object({
	gate: Gate,
	balances: Type.Record(Type.String(), Type.Number()),
	levels: Type.Record(Type.String(), Type.Number()),
	held: Type.Record(Type.String(), Type.Array(HeldPiece)),
	passed: Type.Record(Type.String(), Type.Array(Type.Number())),
});
type OldCityRecord = Static<typeof OldCityRecord>;

/** The old city at the gate (minute 24, `extra` points to the resident there), as it was recorded once (step 18, item 7b; `test/fixtures/old-engine/`). */
function oldGateCity(extra = 0): OldCityRecord {
	return replayOld({ extra }, OldCityRecord);
}

/** The new city as the old one stands at the gate: points, levels, held pieces and passes copied over, the real standoff. */
function newCity(old: OldCityRecord) {
	const gate = old.gate;
	const city = new TestCity(
		IDS,
		IDS.map((id) => old.balances[id] ?? 0),
	);
	for (const id of IDS) {
		city.levels.set(id, old.levels[id] ?? 0);
		city.held.set(
			id,
			(old.held[id] ?? []).map((piece) => ({ ...piece, needers: [...piece.needers] })),
		);
		city.passedLevels.set(id, new Set(old.passed[id] ?? []));
	}
	const spec = STORY.tribunal;
	const rule = STORY.rules.ultimatum;
	if (spec === undefined || rule === undefined) throw new Error("no tribunal or ultimatum");
	const host = startHost({
		residents: IDS,
		mechanics: [
			...standIns(city).filter((use) => use.mechanic.id !== "standoff"),
			standoff.with({ ultimatum: { ...rule }, author: AUTHOR }),
			exile.with(),
			tribunal.with({ ...spec, first: { ...spec.first, latestAfter: 1000 } }),
		],
		residentTools: ["payRansom", "lastWill"],
		gamemakerTools: ["ultimatum"],
	});
	const from = host.log.length;
	const open = () => runProbe(host, (ctx) => ctx.tryCall(ExileApi, "toGate", { resident: gate.agent, until: gate.until, ransomable: gate.ransomable, voters: [], price: gate.price, selfPrice: gate.selfPrice }));
	return { city, host, open, from };
}

async function playTo(host: Host, minute: number): Promise<void> {
	while (host.minute <= minute) await host.playMinute(() => Promise.resolve());
}

/** An event as a line: its type and fields in their order, without the envelope keys. */
function eventLine(type: string, fields: Readonly<Record<string, unknown>>): string {
	const rest = Object.fromEntries(Object.entries(fields).filter(([key]) => !["seq", "minute", "at", "type"].includes(key)));
	return `event ${JSON.stringify({ type, ...rest })}`;
}

const EVENTS = new Set(["exiled", "last_will", "ransom_paid", "ransomed", "factor_burned", "level_contracted", "piece_kept", "piece_given", "ultimatum_resolved"]);

function record(value: unknown): Readonly<Record<string, unknown>> {
	return typeof value === "object" && value !== null ? Object.fromEntries(Object.entries(value)) : {};
}

/** A service call of the new side as the old effect it stands for. */
function serviceLine(payload: Readonly<Record<string, unknown>>): string | undefined {
	const input = record(payload.input);
	const call = `${String(payload.api)}.${String(payload.method)}`;
	if (call === "channels.post") return `post ${JSON.stringify(input.text)}`;
	if (call === "channels.notify") return `notice ${JSON.stringify({ agent: input.to, text: input.text })}`;
	if (call === "ledger.burn") return `burn ${JSON.stringify({ agent: input.account, amount: input.amount, reason: input.reason })}`;
	if (call === "ledger.mint") return `mint ${JSON.stringify({ agent: input.account, amount: input.amount, reason: input.reason })}`;
	if (call === "ledger.move") return `move ${JSON.stringify({ from: input.from, to: input.to, amount: input.amount, reason: input.reason })}`;
	if (call === "goals.onExiled" || call === "seal.onExiled") return `${call} ${JSON.stringify(input.resident)}`;
	if (call === "goals.noteHeir") return `${call} ${JSON.stringify(input.heir)}`;
	return undefined;
}

function newLines(events: readonly EventEnvelope[]): readonly string[] {
	return events.flatMap((event): string[] => {
		const payload = record(event.payload);
		if (event.type === "service_called") {
			const line = serviceLine(payload);
			return line === undefined ? [] : [line];
		}
		return EVENTS.has(event.type) && event.source !== "core" ? [eventLine(event.type, payload)] : [];
	});
}

/** A call with the resident at the gate filled in. */
function resolved(call: Call, gate: string): Call {
	const agent = call.agent === "gate" ? gate : call.agent;
	const params = call.tool === "ultimatum" ? { ...call.params, a: call.params.a === "gate" ? gate : call.params.a } : call.params;
	return { ...call, agent, params };
}

const OldCompared = Type.Object({ city: OldCityRecord, replies: Type.Array(Type.String()), lines: Type.Array(Type.String()) });

/** The old side of `compare`, as it was recorded once before the engine went (step 18, item 7b; `test/fixtures/old-engine/`). */
async function oldCompared(calls: readonly Call[], options: { readonly close?: boolean; readonly extra?: number }) {
	return Promise.resolve(replayOld({ calls, options }, OldCompared));
}

async function compare(calls: readonly Call[], options: { readonly close?: boolean; readonly extra?: number } = {}) {
	const old = await oldCompared(calls, options);
	const now = newCity(old.city);
	// The new host at the old one's minute (nothing happens before: the tribunal never calls), then the same gate.
	await playTo(now.host, 23);
	await now.open();
	const since = now.host.log.length;
	const replies: { readonly old: readonly string[]; readonly now: string[] } = { old: old.replies, now: [] };
	for (const call of calls) replies.now.push(await newReply(now.host, resolved(call, old.city.gate.agent)));
	if (options.close !== false) await playTo(now.host, 29);
	const lines = newLines(now.host.log.all().slice(since));
	expect(replies.now).toEqual(replies.old);
	expect(lines).toEqual(old.lines);
	return { old, now, replies, lines };
}

describe("exile against the old World (differential, one merged list)", () => {
	it("plays the City of Keys without names and core motives, which it has", () => {
		expect(LEFT_OUT.every((part) => part !== undefined)).toBe(true);
	});

	it("refuses wills in the old order with the old details", async () => {
		const old = oldGateCity();
		const [piece = "none"] = (old.held[old.gate.agent] ?? []).map((entry) => entry.id);
		const other = IDS.find((id) => id !== old.gate.agent) ?? "A01";
		const { replies } = await compare(
			[
				{ tool: "lastWill", agent: other, params: { text: "not at the gate", bequests: [] } },
				{ tool: "lastWill", agent: "gate", params: { text: "   ", bequests: [] } },
				{ tool: "lastWill", agent: "gate", params: { text: "x", bequests: [{ to: "A99", points: 1 }] } },
				{ tool: "lastWill", agent: "gate", params: { text: "x", bequests: [{ to: old.gate.agent, points: 1 }] } },
				{ tool: "lastWill", agent: "gate", params: { text: "x", bequests: [{ to: other }] } },
				{ tool: "lastWill", agent: "gate", params: { text: "x", bequests: [{ to: other, factor: "L8-nothing" }] } },
				{ tool: "lastWill", agent: "gate", params: { text: "x", bequests: [{ to: other, factor: piece }, { to: other, factor: piece }] } },
				{ tool: "lastWill", agent: "gate", params: { text: "x", bequests: [{ to: other, points: 1000 }] } },
				{ tool: "lastWill", agent: "gate", params: { text: "x", bequests: [{ to: other, points: 1 }, { to: other, points: 1 }] } },
				{ tool: "lastWill", agent: "gate", params: { text: "My piece to the one who needs it.", bequests: [{ to: other, points: 0, factor: piece }] } },
				{ tool: "lastWill", agent: "gate", params: { text: "again", bequests: [] } },
			],
			{ close: false },
		);
		expect(replies.old.map((reply) => reply.split(":")[0])).toEqual([
			"TOOL_LOCKED",
			"INVALID_TEXT",
			"UNKNOWN_AGENT",
			"INVALID_BEQUEST",
			"INVALID_BEQUEST",
			"UNKNOWN_FACTOR",
			"INVALID_BEQUEST",
			"INSUFFICIENT_FUNDS",
			"BEQUEST_CAP",
			"your will is written · " + `${piece} to ${other}`,
			"TOOL_LOCKED",
		]);
	});

	it("executes a will at once and, when the gate closes, writes `exiled` with the will first, then keeps, burns, voids the goal, tells the seal and contracts", async () => {
		const old = oldGateCity(43);
		const heirs = IDS.filter((id) => id !== old.gate.agent);
		const first = (old.held[old.gate.agent] ?? [])[0];
		const bequests = [...heirs.map((to) => ({ to, points: 5 })), ...(first === undefined ? [] : [{ to: first.needers[0] ?? "A01", factor: first.id }])];
		const { lines } = await compare([{ tool: "lastWill", agent: "gate", params: { text: "A tenth to each of you.", bequests } }], { extra: 43 });
		// The paths this test is about were reached, in this order: the will's bequests and event, the posts at the gate's close, `exiled` with
		// the will's text, then what the exile does to the city (the goal and the seal after the pieces and the burn).
		const at = (prefix: string) => lines.findIndex((line) => line.startsWith(prefix));
		const order = ["move ", "goals.noteHeir", 'event {"type":"last_will"', `post "Last will of ${old.gate.agent}`, `event {"type":"exiled","agent":"${old.gate.agent}","will":`, "burn ", "goals.onExiled", "seal.onExiled", 'event {"type":"level_contracted"'];
		expect(order.map(at).every((index) => index >= 0)).toBe(true);
		expect(order.map(at)).toEqual([...order.map(at)].sort((a, b) => a - b));
	});

	it("keeps the pieces of a resident who left no will for those who still need them (P43), before the burn", async () => {
		const { lines } = await compare([]);
		const kept = lines.findIndex((line) => line.startsWith('event {"type":"piece_kept"'));
		expect(kept).toBeGreaterThanOrEqual(0);
		expect(kept).toBeLessThan(lines.findIndex((line) => line.startsWith("burn ")));
	});

	it("takes ransoms through the tool with the old refusals and replies, tells the target after `ransom_paid`, and frees the resident", async () => {
		const other = (gate: string) => IDS.find((id) => id !== gate) ?? "A01";
		const old = oldGateCity();
		const { lines, replies } = await compare([
			{ tool: "payRansom", agent: other(old.gate.agent), params: { target: "A99", amount: 1 } },
			{ tool: "payRansom", agent: other(old.gate.agent), params: { target: other(old.gate.agent), amount: 1 } },
			{ tool: "payRansom", agent: other(old.gate.agent), params: { target: old.gate.agent, amount: 1 } },
			{ tool: "payRansom", agent: "gate", params: { target: old.gate.agent, amount: 2 } },
			{ tool: "payRansom", agent: other(old.gate.agent), params: { target: old.gate.agent, amount: 1000 } },
			{ tool: "payRansom", agent: other(old.gate.agent), params: { target: old.gate.agent, amount: 1 } },
			...["A02", "A03", "A04"].map((agent) => ({ tool: "payRansom" as const, agent, params: { target: old.gate.agent, amount: 6 } })),
		]);
		expect(replies.old.at(-1)).toContain("ransom");
		const paid = lines.findIndex((line) => line.startsWith('event {"type":"ransom_paid"'));
		expect(paid).toBeGreaterThanOrEqual(0);
		expect(lines[paid + 1]?.startsWith(`notice {"agent":"${old.gate.agent}"`)).toBe(true);
		expect(lines.some((line) => line.startsWith('event {"type":"ransomed"'))).toBe(true);
	});

	it("closes a gate while an ultimatum on its holder is due: the exile at 300 first, so the debt lapses at the standoff's 500 (T4 #4)", async () => {
		const old = oldGateCity();
		const holder = old.gate.agent;
		const piece = (old.held[holder] ?? []).find((entry) => entry.kind !== "fragment" && entry.needers.length > 0);
		const needer = piece?.needers[0];
		if (needer === undefined) throw new Error("the resident at the gate holds no piece for anyone");
		const { lines, replies } = await compare([{ tool: "ultimatum", agent: "gate", params: { a: "gate", b: needer, minutes: old.gate.until - 24 } }]);
		expect(replies.old[0]).toContain(`due at minute ${String(old.gate.until)}`);
		const resolved = lines.findIndex((line) => line.startsWith('event {"type":"ultimatum_resolved"'));
		// The holder left: nobody owes anything any more, nobody pays the penalty (both sides agree line for line above).
		expect(lines[resolved]).toContain(`"released":["${[holder, needer].sort().join('","')}"],"paid":[]`);
		expect(resolved).toBeGreaterThan(lines.findIndex((line) => line.startsWith(`event {"type":"exiled","agent":"${holder}"`)));
	});

	it("gives the gamemaker's tribunal section of the old describeSituation from the section data (the renderer of the differential)", () => {
		const minutes = [24, 25, 27, 29, 30, 34, 36, 40];
		// The old gamemaker's section and the old tribunal's data at each minute, recorded once (step 18, item 7b).
		const sections = replayOld({ minutes }, Type.Array(Type.Object({ want: Type.Array(Type.String()), section: Type.Unknown() })));
		expect(sections).toHaveLength(minutes.length);
		const seen: string[] = [];
		for (const { want, section } of sections) {
			expect(renderSection(section)).toEqual(want);
			seen.push(...want);
		}
		// The states this proves on: a gate, an exiled resident, the window and the planned or called tribunal.
		for (const part of ["at the gate until", "- exiled: ", "scheduleTribunal is", "- tribunal "]) expect(seen.some((line) => line.includes(part)), part).toBe(true);
	});
});
