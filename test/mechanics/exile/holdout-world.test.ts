/**
 * The holdout tribunal's strike against the old `World#onStruck` (packages/engine world.ts:1263):
 * the old Whispers city (with the City of Keys' goals, so the goal call is there to compare) bans
 * A01 after a unanimous vote; the new host gets the same city on stand-ins and the same strike
 * through `ExileApi.strike` with `by: "holdout"`, the call the holdout tribunal (team T4b) makes.
 * One merged list is compared in log order: the exile's events, the bookings and the calls into
 * goals and the seal. The holdout's own lines (its events, the reason, the struck notice and post,
 * the released fragments) are T4b's and left out by name.
 */
import { describe, expect, it } from "vitest";
import { competitorIds } from "@swarmtales/kernel";
import { dropJustified } from "@swarmtales/testkit";
import { EventBus, MemorySink, World } from "@swarmtales/engine";
import type { EventEnvelope } from "@swarmtales/contracts";
import { ExileApi } from "@swarmtales/mechanic-shared";
import { exile } from "@swarmtales/mechanic-exile";
import whispers from "../../../stories/whispers/story.ts";
import cityOfKeys from "../../../stories/cityofkeys/story.ts";
import { standIns, TestCity } from "./support/city.ts";
import { runProbe, startHost } from "./support/host.ts";

const IDS = competitorIds(6);
const AUTHOR = "COURIER";

/** The old Whispers city of the engine's holdout test (test/engine/holdout.test.ts `calledOnA01`), struck at minute 8. */
function oldStrike() {
	let minute = 0;
	const log = new MemorySink();
	const bus = new EventBus([log], () => minute);
	const goalsSpec = cityOfKeys.goals;
	if (goalsSpec === undefined) throw new Error("the City of Keys has goals");
	const world = new World({ story: { ...whispers, goals: goalsSpec }, competitors: IDS, seed: 11, minutes: 45, bus, minute: () => minute, names: false });
	const marks: { readonly at: number; end: number; readonly line: string }[] = [];
	const goals = world.goals;
	if (goals === undefined) throw new Error("the goals were added");
	const goalExiled = goals.onExiled.bind(goals);
	goals.onExiled = (agent) => {
		const entry = { at: log.events.length, end: log.events.length, line: `goals.onExiled ${JSON.stringify(agent)}` };
		marks.push(entry);
		goalExiled(agent);
		entry.end = log.events.length;
	};
	const at = (last: number): void => {
		while (minute < last) {
			minute += 1;
			world.startMinute(minute);
		}
	};
	world.startMinute(0);
	const others = IDS.filter((id) => id !== "A01");
	for (const from of others) {
		for (const to of IDS.filter((id) => id !== from)) {
			if (!world.sendDm(from, to, `My door 1 fragment: ${world.inspect.fragmentOf(from, 1)}`).ok) throw new Error("dm refused");
			world.drainMailbox(to);
		}
	}
	at(1);
	if (world.submit("A01", 1, world.inspect.passwordOf("A01", 1)).status !== "correct") throw new Error("A01 did not pass");
	at(3);
	if (!world.callHoldoutTribunal(["A01"], "A01 keeps the city waiting.", AUTHOR).ok) throw new Error("no tribunal");
	at(6);
	for (const agent of others) world.tribunalVote(agent, true);
	at(8);
	const balances = IDS.map((id) => world.ledger.balance(id));
	const from = log.events.length;
	if (!world.holdoutPermaDeath("A01", "The city has spoken: A01 is banished.", AUTHOR).ok) throw new Error("not struck");
	return { world, log, marks, from, balances };
}

const OWN = new Set(["exiled", "level_contracted", "piece_kept", "factor_burned", "ledger_entry"]);

function oldLines(old: ReturnType<typeof oldStrike>): readonly string[] {
	const lines: string[] = [];
	const inside = (index: number) => old.marks.some((entry) => entry.at <= index && index < entry.end);
	old.log.events.forEach((event, index) => {
		if (index < old.from) return;
		lines.push(...old.marks.filter((entry) => entry.at === index).map((entry) => entry.line));
		const { seq: _seq, minute: _minute, type, ...rest } = event;
		lines.push(inside(index) ? `inside ${type}` : OWN.has(type) ? `event ${JSON.stringify({ type, ...rest })}` : `holdout ${type}`);
	});
	lines.push(...old.marks.filter((entry) => entry.at === old.log.events.length).map((entry) => entry.line));
	return dropJustified(lines, (line) => line.startsWith("holdout ") || line.startsWith("inside "), "the holdout's own lines (T4b) and what the old goals write inside onExiled (T3)").kept;
}

function newLines(events: readonly EventEnvelope[]): readonly string[] {
	return events.flatMap((event): string[] => {
		const payload = typeof event.payload === "object" && event.payload !== null ? Object.fromEntries(Object.entries(event.payload)) : {};
		if (event.type === "service_called") {
			const input = typeof payload.input === "object" && payload.input !== null ? Object.fromEntries(Object.entries(payload.input)) : {};
			const call = `${String(payload.api)}.${String(payload.method)}`;
			if (call === "goals.onExiled" || call === "seal.onExiled") return [`${call} ${JSON.stringify(input.resident)}`];
			if (call.startsWith("ledger.") && call !== "ledger.balance") return [`ledger ${call}`];
			return [];
		}
		return event.source === "exile" ? [`event ${JSON.stringify({ type: event.type, ...payload })}`] : [];
	});
}

describe("the holdout strike against the old World#onStruck (differential)", () => {
	it("strikes once: `exiled` by the holdout, then the goal is void; no gate, no burn, no pieces kept, no level contracted, the points stay", async () => {
		const old = oldStrike();
		const city = new TestCity(IDS, old.balances);
		// No seal: the old World has none without a tribunal; its call is absent on both sides.
		const host = startHost({ residents: IDS, mechanics: [...standIns(city).filter((use) => use.mechanic.id !== "seal"), exile.with()], residentTools: [], gamemakerTools: [] });
		const since = host.log.length;
		const first = await runProbe(host, (ctx) => ctx.tryCall(ExileApi, "strike", { resident: "A01", by: "holdout" }));
		const second = await runProbe(host, (ctx) => ctx.tryCall(ExileApi, "strike", { resident: "A01", by: "holdout" }));
		const lines = newLines(host.log.all().slice(since));
		expect(lines).toEqual(oldLines(old));
		expect(lines).toEqual(['event {"type":"exiled","agent":"A01","by":"holdout"}', 'goals.onExiled "A01"']);
		expect(first).toEqual({ ok: true });
		expect(second).toMatchObject({ ok: false, code: "ALREADY_EXILED" });
		expect(old.world.ledger.balance("A01")).toBe(old.balances[0]);
		// Gone like the old `isExiled` and `alive`, but not on the tribunal's list (old `tribunal.exiled` held only the gate and the seal).
		const after = await runProbe(host, (ctx) => ({ gone: ctx.tryCall(ExileApi, "isExiled", { resident: "A01" }), alive: ctx.tryCall(ExileApi, "alive", {}), listed: ctx.tryCall(ExileApi, "exiled", {}) }));
		expect(after).toEqual({ gone: old.world.isExiled("A01"), alive: [...old.world.alive], listed: [...(old.world.tribunal?.exiled ?? [])] });
	});
});
