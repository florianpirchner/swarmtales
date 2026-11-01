/**
 * The tribunal's verdict at the decision gate (docs/design/overseer-api.md §3.3, step 18 step 4):
 * with `decisionWindow: 1` and a scripted human holding `amendDecision`, the closing session
 * proposes its verdict instead of exiling, the tribunal stays busy while it is open, and one
 * minute later the verdict that stood commits: the human's amendment sends another accused to
 * the gate. The same scenario with the window 0 (or nobody holding it) is the old close, which
 * the differential tests (differential.test.ts) compare with the old engine's `Tribunal`.
 */
import { describe, expect, it } from "vitest";
import { competitorIds, createHost, type HostOptions } from "@swarmtales/kernel";
import type { EventEnvelope, Host, TribunalSpec } from "@swarmtales/contracts";
import { ExileApi } from "@swarmtales/mechanic-shared";
import { exile } from "@swarmtales/mechanic-exile";
import { tribunal } from "@swarmtales/mechanic-tribunal";
import cityOfKeys from "../../../stories/cityofkeys/story.ts";
import { standIns, TestCity } from "../exile/support/city.ts";
import { runProbe, storyOptions } from "../exile/support/host.ts";

const SIX = [10, 20, 30, 40, 50, 60];
const IDS = competitorIds(SIX.length);

/** The first differential scenario's spec: half exiled, the first call 30 minutes in, no draft. */
function spec(draft = false): TribunalSpec {
	const base = cityOfKeys.tribunal;
	if (base === undefined) throw new Error("cityofkeys has no tribunal");
	const { factions, ...rest } = { ...base, targetShare: 1 / 2, first: { level: 10, latestAfter: 30 }, maxMinutes: 1000 };
	return draft && factions !== undefined ? { ...rest, factions } : rest;
}

/** The votes of that scenario: A01 gets the most, A02 the second most. */
const VOTES: Readonly<Record<number, readonly (readonly [string, string])[]>> = {
	35: [["A03", "A01"], ["A04", "A02"], ["A01", "A02"], ["A05", "A01"]],
	36: [["A06", "A01"]],
};

interface Run {
	readonly host: Host;
	readonly replies: readonly string[];
}

/** Plays the scenario; `hold` is the scripted holder, called in the first turn of every minute. */
async function play(window: number, holder: boolean, hold?: (host: Host, minute: number) => Promise<string | undefined>, until = 48): Promise<Run> {
	const city = new TestCity(IDS, SIX);
	const base = storyOptions({
		residents: IDS,
		minutes: 60,
		mechanics: [...standIns(city), exile.with(), tribunal.with({ ...spec(), gamemakerRoles: [{ fromLevel: 1, role: "director" }], decisionWindow: window })],
		residentTools: ["vote", "nominate", "join", "refuse", "payRansom", "lastWill"],
		gamemakerTools: ["scheduleTribunal"],
		turns: { passes: 1, blockSize: IDS.length, order: (view) => view.residents },
	});
	const options: HostOptions = holder ? { ...base, story: { ...base.story, grants: { ...(base.story.grants === "auto" ? {} : base.story.grants), human: ["amendDecision"] } }, human: true } : base;
	const host = createHost(options);
	host.start();
	const replies: string[] = [];
	for (let minute = 0; minute <= until; minute++) {
		let acted = false;
		await host.playMinute(async () => {
			if (acted) return;
			acted = true;
			for (const [voter, target] of VOTES[minute] ?? []) await host.call(`resident:${voter}`, "vote", { target });
			const said = await hold?.(host, minute);
			if (said !== undefined) replies.push(said);
		});
	}
	return { host, replies };
}

function of(host: Host, source: string, type: string): readonly EventEnvelope[] {
	return host.log.ofType(source, type);
}

function fields(event: EventEnvelope | undefined): Readonly<Record<string, unknown>> {
	return typeof event?.payload === "object" && event.payload !== null ? { ...event.payload } : {};
}

describe("tribunal verdict at the decision gate", () => {
	it("is the old close when the window is 0, even with a holder, and when nobody holds it", async () => {
		const closed = await play(0, true);
		const nobody = await play(1, false);
		const result = of(closed.host, "tribunal", "tribunal_result")[0];
		expect(fields(result)).toMatchObject({ exiled: ["A01"] });
		expect(of(closed.host, "core", "decision_proposed")).toEqual([]);
		expect(of(nobody.host, "core", "decision_proposed")).toEqual([]);
		// Window 1 without a holder writes the very log of window 0.
		expect(JSON.stringify(nobody.host.log.all())).toBe(JSON.stringify(closed.host.log.all()));
	});

	it("opens the verdict at the close, keeps the tribunal busy, and commits the human's amendment a minute later", async () => {
		const baseline = await play(0, false);
		const old = of(baseline.host, "tribunal", "tribunal_result")[0];
		const closeMinute = old?.minute ?? -1;
		let stopWhileOpen: unknown;
		const run = await play(1, true, async (host, minute) => {
			const open = host.log.ofType("core", "decision_proposed").find((event) => event.minute === minute);
			if (open === undefined) return undefined;
			stopWhileOpen = host.facts()["tribunal.stop"];
			const outcome = await host.call("human", "amendDecision", { decision: open.seq, proposal: { tribunal: 1, exiled: ["A02"] }, reason: "spare A01" });
			const refused = await host.call("human", "amendDecision", { decision: open.seq, proposal: { tribunal: 1, exiled: ["A01", "A02"] }, reason: "two" });
			return `${outcome.ok ? "ok" : outcome.code} ${refused.ok ? "ok" : refused.code}`;
		});
		const { host } = run;
		const proposed = of(host, "core", "decision_proposed");
		expect(proposed.map((event) => [event.minute, fields(event).kind, fields(event).proposal, fields(event).deadline, fields(event).holders])).toEqual([
			[closeMinute, "tribunal.verdict", { tribunal: 1, exiled: ["A01"] }, closeMinute + 1, ["human"]],
		]);
		// Only the accused still standing, at most as many as the session exiles.
		expect(fields(proposed[0]).schema).toMatchObject({ properties: { exiled: { maxItems: 1, uniqueItems: true } } });
		expect(run.replies).toEqual(["ok PROPOSAL_INVALID"]);
		expect(stopWhileOpen).toMatchObject({ busy: true });
		// The penalties and notices of the close stay at the close; the result waits for the deadline.
		expect(of(host, "tribunal", "tribunal_result").map((event) => event.minute)).toEqual([closeMinute + 1]);
		const settled = of(host, "core", "decision_settled")[0];
		expect(settled?.minute).toBe(closeMinute + 1);
		expect(fields(settled)).toMatchObject({ kind: "tribunal.verdict", changed: true, by: "human", reason: "spare A01", proposal: { tribunal: 1, exiled: ["A02"] } });
		const result = of(host, "tribunal", "tribunal_result")[0];
		expect(result?.causedBy).toBe(settled?.seq);
		expect(fields(result)).toEqual({ ...fields(old), exiled: ["A02"] });
		expect(of(host, "exile", "exile_gate").map((event) => fields(event).agent)).toEqual(["A02"]);
		expect(of(baseline.host, "exile", "exile_gate").map((event) => fields(event).agent)).toEqual(["A01"]);
	});

	it("commits the original verdict one minute late when the holder lets it stand", async () => {
		const baseline = await play(0, false);
		const run = await play(1, true);
		const old = of(baseline.host, "tribunal", "tribunal_result")[0];
		const late = of(run.host, "tribunal", "tribunal_result")[0];
		expect(late?.minute).toBe((old?.minute ?? 0) + 1);
		expect(fields(late)).toEqual(fields(old));
		expect(fields(of(run.host, "core", "decision_settled")[0])).toMatchObject({ changed: false, amendments: [] });
		expect(of(run.host, "exile", "exile_gate").map((event) => fields(event).agent)).toEqual(["A01"]);
	});

	it("re-checks the city at the commit: a resident struck meanwhile is not sent to the gate", async () => {
		const run = await play(1, true, async (host, minute) => {
			if (host.log.ofType("core", "decision_proposed").some((event) => event.minute === minute)) await runProbe(host, (ctx) => ctx.tryCall(ExileApi, "strike", { resident: "A01", by: "seal" }));
			return undefined;
		});
		expect(fields(of(run.host, "tribunal", "tribunal_result")[0])).toMatchObject({ exiled: [] });
		expect(of(run.host, "exile", "exile_gate")).toEqual([]);
	});

	it("exiles no more than are still missing at the commit", async () => {
		const run = await play(1, true, async (host, minute) => {
			if (!host.log.ofType("core", "decision_proposed").some((event) => event.minute === minute)) return undefined;
			// The target is three: three strikes leave nobody missing.
			for (const resident of ["A04", "A05", "A06"]) await runProbe(host, (ctx) => ctx.tryCall(ExileApi, "strike", { resident, by: "seal" }));
			return undefined;
		});
		expect(fields(of(run.host, "tribunal", "tribunal_result")[0])).toMatchObject({ exiled: [] });
		expect(of(run.host, "exile", "exile_gate")).toEqual([]);
	});

	it("plans nothing while a verdict is open, though the fallback gap has passed", async () => {
		const window = 12;
		const run = await play(window, true, undefined, 58);
		const proposed = of(run.host, "core", "decision_proposed")[0]?.minute ?? -1;
		const settled = of(run.host, "core", "decision_settled")[0]?.minute ?? -1;
		expect(settled).toBe(proposed + window);
		const scheduled = of(run.host, "tribunal", "tribunal_scheduled").map((event) => event.minute);
		expect(scheduled.filter((minute) => minute >= proposed && minute < settled)).toEqual([]);
		// Without a verdict open, the city plans in that very stretch (the fallback after the result).
		const free = await play(0, false, undefined, 58);
		const planned = of(free.host, "tribunal", "tribunal_scheduled").map((event) => event.minute);
		expect(planned.filter((minute) => minute >= proposed && minute < settled).length).toBeGreaterThan(0);
	});
});
