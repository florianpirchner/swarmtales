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
import type { EventEnvelope } from "@swarmtales/contracts";
import { ExileApi } from "@swarmtales/mechanic-shared";
import { exile } from "@swarmtales/mechanic-exile";
import { standIns, TestCity } from "./support/city.ts";
import { runProbe, startHost } from "./support/host.ts";
import { replayOld } from "../../helpers/old-engine.ts";
import { Type } from "typebox";

const IDS = competitorIds(6);

function record(value: unknown): Readonly<Record<string, unknown>> {
	return typeof value === "object" && value !== null ? Object.fromEntries(Object.entries(value)) : {};
}

function newLines(events: readonly EventEnvelope[]): readonly string[] {
	return events.flatMap((event): string[] => {
		const payload = record(event.payload);
		if (event.type === "service_called") {
			const input = record(payload.input);
			const call = `${String(payload.api)}.${String(payload.method)}`;
			if (call === "goals.onExiled" || call === "seal.onExiled") return [`${call} ${JSON.stringify(input.resident)}`];
			if (call.startsWith("ledger.") && call !== "ledger.balance") return [`ledger ${call}`];
			return [];
		}
		return event.source === "exile" ? [`event ${JSON.stringify({ type: event.type, ...payload })}`] : [];
	});
}

/** What the test reads of the old strike: the balances before, the lines, A01's points after, and who is exiled, alive and listed. */
const OldStrike = Type.Object({
	balances: Type.Array(Type.Number()),
	lines: Type.Array(Type.String()),
	pointsAfter: Type.Number(),
	gone: Type.Boolean(),
	alive: Type.Array(Type.String()),
	listed: Type.Array(Type.String()),
});

/** The old strike, as it was recorded once before the engine went (step 18, item 7b; `test/fixtures/old-engine/`). */
function recordedStrike() {
	return replayOld({ ids: IDS, seed: 11 }, OldStrike);
}

describe("the holdout strike against the old World#onStruck (differential)", () => {
	it("strikes once: `exiled` by the holdout, then the goal is void; no gate, no burn, no pieces kept, no level contracted, the points stay", async () => {
		const old = recordedStrike();
		const city = new TestCity(IDS, old.balances);
		// No seal: the old World has none without a tribunal; its call is absent on both sides.
		const host = startHost({ residents: IDS, mechanics: [...standIns(city).filter((use) => use.mechanic.id !== "seal"), exile.with()], residentTools: [], gamemakerTools: [] });
		const since = host.log.length;
		const first = await runProbe(host, (ctx) => ctx.tryCall(ExileApi, "strike", { resident: "A01", by: "holdout" }));
		const second = await runProbe(host, (ctx) => ctx.tryCall(ExileApi, "strike", { resident: "A01", by: "holdout" }));
		const lines = newLines(host.log.all().slice(since));
		expect(lines).toEqual(old.lines);
		expect(lines).toEqual(['event {"type":"exiled","agent":"A01","by":"holdout"}', 'goals.onExiled "A01"']);
		expect(first).toEqual({ ok: true });
		expect(second).toMatchObject({ ok: false, code: "ALREADY_EXILED" });
		expect(old.pointsAfter).toBe(old.balances[0]);
		// Gone like the old `isExiled` and `alive`, but not on the tribunal's list (old `tribunal.exiled` held only the gate and the seal).
		const after = await runProbe(host, (ctx) => ({ gone: ctx.tryCall(ExileApi, "isExiled", { resident: "A01" }), alive: ctx.tryCall(ExileApi, "alive", {}), listed: ctx.tryCall(ExileApi, "exiled", {}) }));
		expect(after).toEqual({ gone: old.gone, alive: old.alive, listed: old.listed });
	});
});
