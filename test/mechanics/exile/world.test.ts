/**
 * World-level differential tests of the exile against the old `World` (packages/engine): the old
 * City of Keys sends a resident to the gate at minute 24; the new host gets the same city (points,
 * levels, held pieces, who passed what) on stand-ins and the same gate through `ExileApi.toGate`.
 * Then both take the same wills and ransoms through their tools, and the gate closes on both: the
 * replies, the bookings, the notices, the posts and what the city keeps, burns and contracts must
 * agree. The tribunal on the new side never calls (its first call is pushed past the run).
 */
import { describe, expect, it } from "vitest";
import { competitorIds } from "@swarmtales/kernel";
import { dropJustified } from "@swarmtales/testkit";
import { EventBus, lastWill, MemorySink, payRansom, World } from "@swarmtales/engine";
import type { AnyStory, Host } from "@swarmtales/contracts";
import { ExileApi } from "@swarmtales/mechanic-shared";
import { exile } from "@swarmtales/mechanic-exile";
import { tribunal } from "@swarmtales/mechanic-tribunal";
import cityOfKeys from "../../../stories/cityofkeys/story.ts";
import { standIns, TestCity } from "./support/city.ts";
import { runProbe, startHost } from "./support/host.ts";

/** The City of Keys without the mechanics of other teams that would act on an exile here (goals, the seal, names, cores). */
function withoutOthers(story: AnyStory): { readonly story: AnyStory; readonly left: readonly unknown[] } {
	const { goals, seal, names, cores, ...rest } = story;
	return { story: rest, left: [goals, seal, names, cores] };
}

const { story: STORY, left: LEFT_OUT } = withoutOthers(cityOfKeys);
const IDS = competitorIds(6);

interface Call {
	readonly tool: "lastWill" | "payRansom";
	readonly agent: string;
	readonly params: Record<string, unknown>;
}

function oldCity() {
	let minute = 0;
	const log = new MemorySink();
	const bus = new EventBus([log], () => minute);
	const world = new World({ story: STORY, competitors: IDS, seed: 7, minutes: 60, bus, minute: () => minute, startLevel: 8 });
	const until = (last: number): void => {
		for (; minute <= last; minute++) world.startMinute(minute);
		minute = last;
	};
	until(24);
	const gate = world.tribunal?.gates()[0];
	if (gate === undefined) throw new Error("nobody at the gate");
	return { world, log, until, gate, from: log.events.length };
}

async function oldReply(world: World, call: Call): Promise<string> {
	const tool = call.tool === "lastWill" ? lastWill : payRansom;
	const result = await tool.bind({ self: call.agent, world }).execute("t", call.params);
	const first = result.content[0];
	return first?.type === "text" ? first.text : "";
}

async function newReply(host: Host, call: Call): Promise<string> {
	const outcome = await host.call(`resident:${call.agent}`, call.tool, call.params);
	return outcome.ok ? outcome.reply : outcome.detail === undefined ? outcome.code : `${outcome.code}: ${outcome.detail}`;
}

/** The new city as the old one stands at the gate: points, levels, held pieces and passes copied over. */
function newCity(world: World, gate: { readonly agent: string; readonly until: number; readonly ransomable: boolean; readonly price: number; readonly selfPrice: number }) {
	const city = new TestCity(
		IDS,
		IDS.map((id) => world.ledger.balance(id)),
	);
	for (const id of IDS) {
		city.levels.set(id, world.levelOf(id));
		city.held.set(
			id,
			world.heldPieces(id).map((piece) => ({ ...piece, needers: [...piece.needers] })),
		);
		city.passedLevels.set(id, new Set([8, 9, 10].filter((level) => world.hasPassed(id, level))));
	}
	const spec = STORY.tribunal;
	if (spec === undefined) throw new Error("no tribunal");
	const host = startHost({
		residents: IDS,
		mechanics: [...standIns(city), exile.with(), tribunal.with({ ...spec, first: { ...spec.first, latestAfter: 1000 } })],
		residentTools: ["payRansom", "lastWill"],
	});
	return { city, host, open: () => runProbe(host, (ctx) => ctx.tryCall(ExileApi, "toGate", { resident: gate.agent, until: gate.until, ransomable: gate.ransomable, voters: [], price: gate.price, selfPrice: gate.selfPrice })) };
}

async function playTo(host: Host, minute: number): Promise<void> {
	while (host.minute <= minute) await host.playMinute(() => Promise.resolve());
}

/** The old log from `from` on, as the new side records it: posts, notices, bookings and the exile's consequences. */
function oldEffects(events: readonly Readonly<Record<string, unknown>>[]): readonly string[] {
	return events.flatMap((event): string[] => {
		if (event.type === "board_post") return [`post ${JSON.stringify(event.text)}`];
		if (event.type === "notice") return [`notice ${JSON.stringify({ agent: event.to, text: event.text })}`];
		if (event.type === "ledger_entry" && event.credit === "SYSTEM_MINT_BURN") return [`burn ${JSON.stringify({ agent: event.debit, amount: event.amount, reason: event.reason })}`];
		if (event.type === "ledger_entry" && event.debit !== "SYSTEM_MINT_BURN") return [`move ${JSON.stringify({ from: event.debit, to: event.credit, amount: event.amount, reason: event.reason })}`];
		if (event.type === "factor_burned") return [`factorBurned ${JSON.stringify({ agent: event.agent, level: event.level, piece: event.piece, needers: event.needers })}`];
		if (event.type === "level_contracted") return [`contract ${JSON.stringify({ level: event.level, excluded: event.excluded })}`];
		if (event.type === "piece_kept") return [`kept ${JSON.stringify({ agent: event.agent, piece: event.piece, needers: event.needers })}`];
		if (event.type === "piece_given") return [`given ${JSON.stringify({ holder: event.holder, needer: event.needer, piece: event.piece })}`];
		return [];
	});
}

function newEffects(city: TestCity, from: number): readonly string[] {
	return city.effects.slice(from).flatMap((entry): string[] => {
		const data = entry.data;
		if (entry.kind === "post") return [`post ${JSON.stringify(data)}`];
		if (entry.kind === "keep" && typeof data === "object" && data !== null && "from" in data && "pieces" in data && Array.isArray(data.pieces)) {
			return data.pieces.map((piece: { id: string; needers: string[] }) => `kept ${JSON.stringify({ agent: data.from, piece: piece.id, needers: piece.needers })}`);
		}
		if (entry.kind === "noteGiven" && typeof data === "object" && data !== null && "from" in data && "to" in data && "piece" in data) {
			const piece = data.piece;
			return [`given ${JSON.stringify({ holder: data.from, needer: data.to, piece: typeof piece === "object" && piece !== null && "id" in piece ? piece.id : "" })}`];
		}
		return ["notice", "burn", "move", "factorBurned", "contract"].includes(entry.kind) ? [`${entry.kind} ${JSON.stringify(data)}`] : [];
	});
}

/**
 * The old world's standoff tells the needers of the kept pieces how to buy them back
 * (`claimPiece(...)`): the standoff's notice (T4b), which the stand-in standoff does not write;
 * the `keep` call itself is compared. Every other line must agree.
 */
function comparable(lines: readonly string[]): readonly string[] {
	if (!lines.some((line) => line.startsWith("kept "))) return lines;
	return dropJustified(lines, (line) => line.startsWith("notice ") && line.includes("claimPiece("), "the standoff's notice of a kept piece (T4b's, after StandoffApi.keep)").kept;
}

async function compare(calls: readonly Call[], close = true) {
	const old = oldCity();
	const now = newCity(old.world, old.gate);
	await now.open();
	const since = now.city.effects.length;
	const replies: { readonly old: string[]; readonly now: string[] } = { old: [], now: [] };
	for (const call of calls) {
		replies.old.push(await oldReply(old.world, { ...call, agent: call.agent === "gate" ? old.gate.agent : call.agent }));
		replies.now.push(await newReply(now.host, { ...call, agent: call.agent === "gate" ? old.gate.agent : call.agent }));
	}
	if (close) {
		old.until(29);
		await playTo(now.host, 29);
	}
	const oldLines = oldEffects(old.log.events.slice(old.from));
	expect(replies.now).toEqual(replies.old);
	expect(newEffects(now.city, since)).toEqual(comparable(oldLines));
	return { old, now, replies };
}

describe("exile against the old World (differential)", () => {
	it("plays the City of Keys without goals, seal, names and cores, which it has", () => {
		expect(LEFT_OUT.every((part) => part !== undefined)).toBe(true);
	});

	it("refuses wills in the old order with the old details", async () => {
		const pieces = (world: World, agent: string) => world.heldPieces(agent).map((piece) => piece.id);
		const old = oldCity();
		const [piece = "none"] = pieces(old.world, old.gate.agent);
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
			false,
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

	it("executes a will at once and, when the gate closes, keeps what was not bequeathed, burns the rest of the points and contracts the deal", async () => {
		const old = oldCity();
		old.world.adjustPoints(old.gate.agent, 43, "test");
		const heirs = IDS.filter((id) => id !== old.gate.agent);
		const pieces = old.world.heldPieces(old.gate.agent);
		const first = pieces[0];
		const bequests = [...heirs.map((to) => ({ to, points: 5 })), ...(first === undefined ? [] : [{ to: first.needers[0] ?? "A01", factor: first.id }])];
		const lines = await compareWithPoints(43, [{ tool: "lastWill", agent: "gate", params: { text: "A tenth to each of you.", bequests } }]);
		// The paths this test is about were reached: the bequests, the will's post, what the city keeps, the burn and the contraction.
		for (const kind of ["move ", "given ", "burn ", "contract "]) expect(lines.some((line) => line.startsWith(kind)), `${kind}in ${lines.join("\n")}`).toBe(true);
		expect(lines).toContain('post "Last will of ' + old.gate.agent + ': A tenth to each of you."');
	});

	it("keeps the pieces of a resident who left no will for those who still need them (P43)", async () => {
		const lines = await compareWithPoints(0, []);
		expect(lines.filter((line) => line.startsWith("kept "))).not.toEqual([]);
	});

	it("takes ransoms through the tool with the old refusals and replies, and frees the resident", async () => {
		const other = (gate: string) => IDS.find((id) => id !== gate) ?? "A01";
		const old = oldCity();
		await compare([
			{ tool: "payRansom", agent: other(old.gate.agent), params: { target: "A99", amount: 1 } },
			{ tool: "payRansom", agent: other(old.gate.agent), params: { target: other(old.gate.agent), amount: 1 } },
			{ tool: "payRansom", agent: other(old.gate.agent), params: { target: old.gate.agent, amount: 1 } },
			{ tool: "payRansom", agent: "gate", params: { target: old.gate.agent, amount: 2 } },
			{ tool: "payRansom", agent: other(old.gate.agent), params: { target: old.gate.agent, amount: 1000 } },
			{ tool: "payRansom", agent: other(old.gate.agent), params: { target: old.gate.agent, amount: 1 } },
		]);
	});
});

/** `compare` on a city where the resident at the gate got `extra` points first (old `adjustPoints`). */
async function compareWithPoints(extra: number, calls: readonly Call[]) {
	const old = oldCity();
	old.world.adjustPoints(old.gate.agent, extra, "test");
	const from = old.log.events.length;
	const now = newCity(old.world, old.gate);
	await now.open();
	const since = now.city.effects.length;
	const replies: { readonly old: string[]; readonly now: string[] } = { old: [], now: [] };
	for (const call of calls) {
		const agent = call.agent === "gate" ? old.gate.agent : call.agent;
		replies.old.push(await oldReply(old.world, { ...call, agent }));
		replies.now.push(await newReply(now.host, { ...call, agent }));
	}
	old.until(29);
	await playTo(now.host, 29);
	const oldLines = oldEffects(old.log.events.slice(from));
	expect(replies.now).toEqual(replies.old);
	const lines = newEffects(now.city, since);
	expect(lines).toEqual(comparable(oldLines));
	return lines;
}
