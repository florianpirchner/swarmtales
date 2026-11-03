/**
 * Differential test of the goals (docs/design/carve-round2-T3.md): the same seeds, residents, core motives,
 * leaders, heirs, exiles and points are given to the old `GoalBook` and to the goals mechanic on the
 * new host (progression, ledger, channels, exile and core motives are stand-ins that hold the same facts).
 * The events, the private notices, the board posts, the paid bonus, the status part and `goalOf` of
 * every resident must be equal after every step. This reaches `lead`, `heir`, `exile` and the void
 * goal, which the golden logs do not deal.
 */
import { describe, expect, it } from "vitest";
import { Type } from "typebox";
import { RecordedTrace } from "../../helpers/old-engine.ts";
import { legacySink } from "@swarmtales/chronicle";
import type { GoalsSpec } from "@swarmtales/contracts";
import { createHost, defineCoreStory } from "@swarmtales/kernel";
import { goals } from "@swarmtales/mechanic-goals";
import cityOfKeys from "../../../stories/cityofkeys/story.ts";
import { goalsProbe } from "../t3/probes.ts";
import { actAnnouncer, motivesStub, exileStub, newDesk, recordingChannels, settableLedger } from "../t3/stubs.ts";

const IDS = ["A01", "A02", "A03", "A04", "A05", "A06"];
const SPEC: GoalsSpec = cityOfKeys.goals ?? (() => { throw new Error("cityofkeys has no goals"); })();

type GoalsInput = NonNullable<Parameters<typeof goals.with>[0]>;

function optionsOf(spec: GoalsSpec, factions: boolean): GoalsInput {
	return {
		acts: [...spec.acts],
		bonus: spec.bonus,
		leadTribunals: spec.leadTribunals,
		againstCoreMotive: spec.againstCoreMotive,
		matches: Object.fromEntries(Object.entries(spec.matches).map(([kind, drives]) => [kind, [...drives]])),
		factions,
		texts: { ...spec.texts },
	};
}

interface Variant {
	readonly name: string;
	readonly spec: GoalsSpec;
	readonly factions: boolean;
	readonly drives: ReadonlyMap<string, readonly string[]>;
}

const ALL_DRIVES = Object.values(SPEC.matches).flat();
const withCoreMotives = new Map(IDS.map((id, index): [string, readonly string[]] => [id, [ALL_DRIVES[index % ALL_DRIVES.length] ?? "x"]]));
const VARIANTS: readonly Variant[] = [
	{ name: "cityofkeys without factions, no core motives", spec: SPEC, factions: false, drives: new Map() },
	{ name: "with factions, no core motives (lead and heir are dealt)", spec: SPEC, factions: true, drives: new Map() },
	{ name: "with factions and core motives that go against 60%", spec: { ...SPEC, againstCoreMotive: 0.6, leadTribunals: 2 }, factions: true, drives: withCoreMotives },
	{ name: "against the core motive every time", spec: { ...SPEC, againstCoreMotive: 1 }, factions: true, drives: withCoreMotives },
];

interface Side {
	readonly events: string[];
	readonly notices: string[];
	readonly posts: string[];
	readonly grants: string[];
}

const SideSchema = Type.Object({ events: Type.Array(Type.String()), notices: Type.Array(Type.String()), posts: Type.Array(Type.String()), grants: Type.Array(Type.String()) });

function bare(line: Readonly<Record<string, unknown>>): string {
	return JSON.stringify(Object.fromEntries(Object.entries(line).filter(([key]) => key !== "seq" && key !== "minute" && key !== "at")));
}

function newSide(variant: Variant, seed: number, exiled: Set<string>, points: Map<string, number>) {
	const desk = newDesk();
	const side: Side = { events: [], notices: [], posts: [], grants: [] };
	const ledger = settableLedger(points);
	const story = defineCoreStory({
		id: "goals-diff",
		seed,
		minutes: 4,
		residents: IDS,
		mechanics: [actAnnouncer().with(), ledger.with(), recordingChannels(desk).with(), exileStub(exiled, IDS).with(), motivesStub(variant.drives).with(), goals.with(optionsOf(variant.spec, variant.factions)), goalsProbe().with()],
		grants: { script: ["startAct", "endAct", "noteLeaders", "noteHeir", "onExiled", "goalOf"] },
	});
	const host = createHost({ story });
	host.subscribe(legacySink((event) => {
		const line = Object.fromEntries(Object.entries(event));
		if (line.type === "goal_dealt" || line.type === "goal_resolved") side.events.push(bare(line));
	}));
	host.start();
	return { host, side, desk, points };
}

type Host = ReturnType<typeof newSide>["host"];

async function goalOfAll(host: Host): Promise<readonly unknown[]> {
	const out: unknown[] = [];
	for (const resident of IDS) {
		const outcome = await host.call("script", "goalOf", { resident });
		out.push(outcome.ok ? JSON.parse(outcome.reply) : outcome);
	}
	return out;
}

describe("goals: the mechanic equals the old GoalBook", () => {
	it.each(VARIANTS.flatMap((variant) => [7, 8, 9].map((seed) => ({ name: variant.name, variant, seed }))))("$name, seed $seed: deal, leaders, heirs, exile, resolve", async ({ variant, seed }) => {
		const points = new Map(IDS.map((id, index): [string, number] => [id, 20 + index * 3]));
		// The old GoalBook's answers, recorded once before the engine went (step 18, item 7b; `test/fixtures/old-engine/`).
		const trace = new RecordedTrace();
		const oldSideNow = () => trace.read("side", SideSchema);
		// Each resident's `goalOf` (act, kind, target, text), or null.
		const oldGoals = () => trace.read("goalOf", Type.Array(Type.Unknown()));
		const exiledNew = new Set<string>();
		const pointsNew = new Map(points);
		const twin = newSide(variant, seed, exiledNew, pointsNew);
		const act = SPEC.acts[0] ?? 8;
		const sync = (): void => {
			const side = oldSideNow();
			expect(twin.side.events).toEqual(side.events);
			expect(twin.desk.notices.map((notice) => `${notice.to}|${notice.text}`)).toEqual(side.notices);
			expect(twin.desk.posts.map((post) => post.text)).toEqual(side.posts);
		};

		// An act the story deals no goals in changes nothing.
		trace.step("deal 3");
		await twin.host.call("script", "startAct", { fromLevel: 3, residents: IDS });
		sync();
		expect(twin.side.events).toEqual([]);

		trace.step(`deal ${String(act)}`);
		await twin.host.call("script", "startAct", { fromLevel: act, residents: IDS });
		sync();
		expect(twin.side.events.length).toBe(IDS.length);
		const goalsNow = await goalOfAll(twin.host);
		expect(goalsNow).toEqual(oldGoals());

		// A second deal of the same act changes nothing.
		trace.step(`deal ${String(act)}`);
		await twin.host.call("script", "startAct", { fromLevel: act, residents: IDS });
		sync();

		// Leaders (one tribunal twice for A02), an heir, and the exile of A04 (void goal read out once).
		trace.step("leaders A01 A02, A02");
		await twin.host.call("script", "noteLeaders", { leaders: ["A01", "A02"] });
		await twin.host.call("script", "noteLeaders", { leaders: ["A02"] });
		trace.step("heir A03");
		await twin.host.call("script", "noteHeir", { heir: "A03" });
		trace.step("heir A05");
		await twin.host.call("script", "noteHeir", { heir: "A05" });
		exiledNew.add("A04");
		trace.step("exiled A04");
		await twin.host.call("script", "onExiled", { resident: "A04" });
		trace.step("exiled A04");
		await twin.host.call("script", "onExiled", { resident: "A04" });
		sync();
		const statusOld = trace.read("statusOf", Type.Array(Type.Boolean()));
		expect(await goalOfAll(twin.host)).toEqual(oldGoals());
		expect(statusOld.filter((status) => status).length).toBe(IDS.length - 1);

		// More points for some, so `outrank` goes both ways; then the act ends.
		pointsNew.set("A02", 99);
		pointsNew.set("A06", 1);
		const before = new Map(pointsNew);
		trace.step(`resolve ${String(act)}`);
		await twin.host.call("script", "endAct", { fromLevel: act });
		sync();
		expect(twin.side.events.length).toBe(IDS.length * 2);
		const grants = oldSideNow().grants;
		const paid = (agent: string): number => grants.filter((grant) => grant.startsWith(`${agent}|`)).reduce((sum, grant) => sum + Number(grant.split("|")[1]), 0);
		for (const agent of IDS) expect(pointsNew.get(agent)).toBe((before.get(agent) ?? 0) + paid(agent));

		// A resolved act takes nothing more.
		trace.step("heir A06, exiled A01, resolve again");
		await twin.host.call("script", "noteHeir", { heir: "A06" });
		await twin.host.call("script", "onExiled", { resident: "A01" });
		await twin.host.call("script", "endAct", { fromLevel: act });
		sync();
		expect((await goalOfAll(twin.host)).every((held) => held === null)).toBe(true);
	});
});
