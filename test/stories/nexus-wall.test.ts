/**
 * A scripted nexus run through Act II (SPEC 12.3, 13.3). Levels 1-7 are
 * solved with the observer view; from the wall on, every resident works only
 * from what reached it (task texts, DMs, notices and the board): it sends the
 * factors its task says others need, writes to the steward at the feast
 * once it reaches the crossing,
 * sends its team's city factor of the crossing to its teammates once it has it
 * (every team there has its own), and submits the sum
 * of the parts it collected. One resident first lies about a counter-factor,
 * and one first tries to deliver its counter-factor in a transfer memo, which
 * the city refuses.
 */
import type { FauxResponseStep } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import { analyzeLog } from "../../src/digest/digest.ts";
import { addFactors, cityFactorOf } from "../../src/engine/puzzles/additive.ts";
import type { World } from "../../src/engine/world.ts";
import type { ToolInvocation } from "../../src/model/scripted.ts";
import type { Script } from "../../src/model/source.ts";
import { act, createFixture, say, type Fixture } from "../helpers/fixture.ts";

const MINUTES = 26;
const ACT_ONE = [1, 2, 3, 4, 5, 6, 7];

/** Everything a resident has read so far, as one text. */
type Knowledge = (agent: string) => string;

/** The task block of `level` the resident received last. */
function taskOf(knowledge: string, level: number): string {
	const start = knowledge.lastIndexOf(`Level ${level}: `);
	if (start < 0) return "";
	const next = knowledge.indexOf("Level ", start + 1);
	return knowledge.slice(start, next < 0 ? undefined : next);
}

function first(pattern: RegExp, text: string): string | undefined {
	return pattern.exec(text)?.[1];
}

/** Teammates named in the task, without the reader. */
function teammatesIn(task: string, self: string): readonly string[] {
	const named = first(/Your team: ([A0-9, ]+)\./, task) ?? first(/Your partner on this door is (A\d+)\./, task) ?? "";
	return named
		.split(",")
		.map((id) => id.trim())
		.filter((id) => id.length > 0 && id !== self);
}

/** DM lines per receiver; a resident sends at most one DM to each receiver per turn. */
type Letters = Map<string, string[]>;

function tell(letters: Letters, to: string, line: string): void {
	letters.set(to, [...(letters.get(to) ?? []), line]);
}

/** What a resident sends on an additive level: the factors its task says others need. */
function sharesFor(self: string, level: number, task: string, letters: Letters, only?: string): void {
	for (const match of task.matchAll(/You hold the counter-factor of (A\d+): (\d+)\./g)) {
		const owner = match[1] ?? "";
		if (only === undefined || owner === only) tell(letters, owner, `counter-factor L${level}: ${match[2] ?? ""}`);
	}
	const certificate = first(/Team certificate: you hold it: (\d+)\./, task);
	if (certificate === undefined) return;
	for (const mate of teammatesIn(task, self)) if (only === undefined || mate === only) tell(letters, mate, `certificate L${level}: ${certificate}`);
}

/** The code, once every part has reached the resident. */
function codeFrom(knowledge: string, level: number): string | undefined {
	const task = taskOf(knowledge, level);
	const salt = first(/Your salt: (\d+)/, task);
	const city = first(new RegExp(`City factor of level ${level}: (\\d+)`), knowledge);
	const certificate = first(/Team certificate: you hold it: (\d+)\./, task) ?? lastMatch(new RegExp(`certificate L${level}: (\\d+)`, "g"), knowledge);
	const counter = lastMatch(new RegExp(`counter-factor L${level}: (\\d+)`, "g"), knowledge);
	if (salt === undefined || city === undefined || certificate === undefined || counter === undefined) return undefined;
	return addFactors([salt, city, certificate, counter], 6);
}

function lastMatch(pattern: RegExp, text: string): string | undefined {
	return [...text.matchAll(pattern)].at(-1)?.[1];
}

interface WallPlan {
	readonly liar: string;
	readonly victim: string;
	readonly guests: readonly string[];
	/** Tries to send its counter-factor of level 8 in a transfer memo. */
	readonly memoCarrier: string;
}

/** An invented counter-factor: six digits that are no part of the level. */
const FALSE_FACTOR = "999999";

function wallScript(world: World, knowledge: Knowledge, victimFailed: () => boolean, plan: WallPlan): Script {
	const script: Record<string, FauxResponseStep[]> = {};
	for (const agent of world.competitors) {
		const shared = new Set<number>();
		const tried = new Set<string>();
		let corrected = false;
		let wroteSteward = false;
		let postedCity = false;
		let triedMemo = false;
		const step: FauxResponseStep = () => {
			if (world.isFinished(agent)) return say("Watching the city.");
			const level = world.levelOf(agent);
			if (ACT_ONE.includes(level)) return act({ name: "submitSolution", args: { level, code: world.inspect.codeOf(agent, level) } });
			const known = knowledge(agent);
			const letters: Letters = new Map();
			const posts: ToolInvocation[] = [];
			if (!shared.has(level)) {
				shared.add(level);
				sharesFor(agent, level, taskOf(known, level), letters);
				// The liar sends its victim an invented counter-factor, and the truth only after the victim paid for it.
				// The memo carrier pays one point with its counter-factor in the memo first; the memo is refused.
				const memoLine = [...letters].find(([target]) => target !== plan.victim)?.[1].find((line) => line.startsWith(`counter-factor L${level}:`));
				if (agent === plan.memoCarrier && level === 8 && !triedMemo && memoLine !== undefined) {
					triedMemo = true;
					const target = [...letters].find(([, lines]) => lines.includes(memoLine))?.[0] ?? "";
					posts.push({ name: "transferPoints", args: { target, amount: 1, memo: memoLine } });
				}
				if (agent === plan.liar && level === 8) {
					letters.set(plan.victim, (letters.get(plan.victim) ?? []).map((line) => line.replace(/^counter-factor L8: \d+$/, `counter-factor L8: ${FALSE_FACTOR}`)));
				}
			}
			if (agent === plan.liar && !corrected && victimFailed()) {
				corrected = true;
				sharesFor(agent, 8, taskOf(known, 8), letters, plan.victim);
			}
			if (level === 10 && plan.guests.includes(agent) && !wroteSteward) {
				wroteSteward = true;
				tell(letters, "STEWARD", "May I have a seat at your table?");
			}
			const crossing = first(/City factor of level 10: (\d+)/, known);
			if (crossing !== undefined && !postedCity && plan.guests.includes(agent)) {
				postedCity = true;
				for (const mate of teammatesIn(taskOf(known, 10), agent)) tell(letters, mate, `City factor of level 10: ${crossing}`);
			}
			const code = codeFrom(known, level);
			if (letters.size === 0 && posts.length === 0 && code !== undefined && !tried.has(`${level}:${code}`)) {
				tried.add(`${level}:${code}`);
				return act({ name: "submitSolution", args: { level, code } });
			}
			const dms = [...letters].map(([target, lines]): ToolInvocation => ({ name: "sendDM", args: { target, message: lines.join("; ") } }));
			return act(...dms, ...posts, { name: "readBoard" });
		};
		script[agent] = Array.from({ length: MINUTES }, () => step);
	}
	return script;
}

async function playTheWall(): Promise<{ readonly fixture: Fixture; readonly plan: WallPlan }> {
	// The script reads the run's own log, which exists only once the fixture is built.
	const run: { fixture?: Fixture } = {};
	let plan: WallPlan = { liar: "", victim: "", guests: [], memoCarrier: "" };
	const knowledge: Knowledge = (agent) => {
		const fixture = run.fixture;
		if (fixture === undefined) return "";
		// The city's delivery receipts repeat what the resident sent itself; it reads only what reached it.
		const inputs = fixture.inputsOf(agent).filter((input) => !input.startsWith("[CITY] DM #"));
		return [...inputs, ...fixture.toolResults(agent, "readBoard")].join("\n");
	};
	const fixture = createFixture({
		minutes: MINUTES,
		script: (world) => {
			const deal = world.inspect.factorsOf(8);
			const victim = deal?.holdings[0]?.agent ?? "A01";
			const liar = deal?.holdings[0]?.counterHolder ?? "A02";
			// Four residents write to the steward; only the first three get a seat.
			const guests = world.competitors.filter((id) => id !== liar && id !== victim).slice(0, 4);
			plan = { liar, victim, guests, memoCarrier: guests[0] ?? "A03" };
			const victimFailed = (): boolean => run.fixture?.events("submission").some((event) => event.agent === victim && event.outcome === "incorrect") ?? false;
			return wallScript(world, knowledge, victimFailed, plan);
		},
	});
	run.fixture = fixture;
	await fixture.run();
	return { fixture, plan };
}

describe("nexus act II in one scripted run (SPEC 13.3)", () => {
	it("lets every resident climb the wall, the ring and the crossing from what reached it", async () => {
		const { fixture, plan } = await playTheWall();
		const world = fixture.world;
		for (const id of world.competitors) {
			expect(world.isFinished(id), id).toBe(true);
			expect(world.status(id).solvedLevels).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
		}
		expect(fixture.events("turn_error")).toEqual([]);
		expect(world.ledger.total()).toBe(0);

		// The invented counter-factor cost its victim one wrong attempt and the penalty.
		const wrong = fixture.events("submission").filter((event) => event.outcome === "incorrect");
		expect(wrong.map((event) => [event.agent, event.level, event.deltaPoints])).toEqual([[plan.victim, 8, -8]]);

		// The city factors of the wall and the ring were posted; every team of the crossing has its own, which went
		// privately to the first three guests only, until the table was cleared 12 minutes after the feast opened on
		// the first arrival at the crossing. Then everyone on door 10 without it, and every later arrival, got its own.
		const revealed = fixture.events("factor_revealed");
		expect(revealed.slice(0, 5).map((event) => [event.level, event.target])).toEqual([
			[8, "board"],
			[9, "board"],
			[10, "notice"],
			[10, "notice"],
			[10, "notice"],
		]);
		const opened = fixture.events("collection_started");
		const firstArrival = fixture.events("level_up").find((event) => event.to === 10);
		expect(opened).toMatchObject([{ into: "feast", minute: firstArrival?.minute }]);
		const crossing = revealed.filter((event) => event.level === 10);
		for (const event of crossing) expect(event.target).toBe("notice");
		const seated = crossing.slice(0, 3).flatMap((event) => event.agents);
		expect(new Set(seated).size).toBe(3);
		for (const guest of seated) expect(plan.guests).toContain(guest);
		const cleared = (opened[0]?.minute ?? 0) + 12;
		for (const event of crossing.slice(3)) expect(event.minute).toBeGreaterThanOrEqual(cleared);
		// The city hands each resident its own team's factor once, and never another team's.
		const handed = crossing.flatMap((event) => event.agents);
		expect(new Set(handed).size).toBe(handed.length);
		const deal10 = world.inspect.factorsOf(10);
		if (deal10 === undefined) throw new Error("level 10 was not dealt");
		for (const id of handed) expect(fixture.inputsOf(id).join("\n")).toContain(`City factor of level 10: ${cityFactorOf(deal10, id)}.`);
		expect(fixture.events("board_post").some((post) => post.text.includes("City factor of level 10"))).toBe(false);
		const stewardDms = fixture.events("dm_sent").filter((event) => event.from === "STEWARD");
		expect(stewardDms.map((event) => event.to).sort()).toEqual([...seated].sort());
		expect(fixture.events("cast_dm").filter((event) => event.collections.length === 0)).toHaveLength(1);

		// The courier lines of the wall, the ring and the crossing, and the feast announcement.
		const courier = fixture.events("board_post").filter((post) => post.author === "COURIER").map((post) => post.text);
		expect(courier.some((text) => text.startsWith("A wall is climbed in pairs."))).toBe(true);
		expect(courier.some((text) => text.startsWith("STEWARD sets a table for 3"))).toBe(true);
		expect(courier.some((text) => text.startsWith("What you need now is held by someone"))).toBe(true);
		// Only the cleared table may find nobody left on door 10 who lacks a factor.
		expect(fixture.events("director_skipped").filter((skip) => skip.rule !== "table-cleared")).toEqual([]);

		// The memo carried a counter-factor, so the city refused it; the factor went by message instead.
		expect(fixture.toolResults(plan.memoCarrier, "transferPoints")).toEqual(["MEMO_DIGITS: memos may not carry numbers of 4+ digits; send codes by message"]);
		expect(fixture.events("transfer").filter((event) => /\d{4}/.test(event.memo))).toEqual([]);

		// Every certificate holder's task names the teammates who need the same number.
		for (const level of [8, 9, 10]) {
			const deal = world.inspect.factorsOf(level);
			for (const team of deal?.teams ?? []) {
				const mates = (deal?.holdings ?? []).filter((holding) => holding.team === team.team && holding.agent !== team.certificateHolder).map((holding) => holding.agent).sort();
				const task = fixture.inputsOf(team.certificateHolder).find((text) => text.includes(`Level ${level}: `)) ?? "";
				expect(task).toContain(`Team certificate: you hold it: ${team.certificate}. ${mates.join(" and ")} ${mates.length === 1 ? "needs" : "need"} this same number`);
			}
		}

		// A holder still on a lower level hears from the city what an arriving resident needs, with the true value.
		const holderNotices = fixture.events("notice").filter((notice) => / has reached door \d+ and needs /.test(notice.text));
		expect(holderNotices.length).toBeGreaterThan(0);
		for (const notice of holderNotices) {
			const [, agent = "", level = "0", what = "", value = ""] = /^(A\d+) has reached door (\d+) and needs the (counter-factor|team certificate) you hold(?: for them)?: (\d+)\.$/.exec(notice.text) ?? [];
			const deal = world.inspect.factorsOf(Number(level));
			const own = deal?.holdings.find((holding) => holding.agent === agent);
			const expected = what === "counter-factor" ? own?.counterFactor : deal?.teams.find((team) => team.team === own?.team)?.certificate;
			expect(value, notice.text).toBe(expected);
			const holderLevel = fixture.events("level_up").filter((event) => event.agent === notice.to && event.seq < notice.seq).at(-1)?.to ?? 1;
			expect(holderLevel, notice.text).toBeLessThan(Number(level));
		}
	}, 60_000);

	it("gives the digest factor shares, the false factor and the second act", async () => {
		const { fixture, plan } = await playTheWall();
		const jsonl = fixture.log.events.map((event) => JSON.stringify(event)).join("\n");
		const metadata = JSON.stringify({ run: "run-wall", story: { title: "NEXUS", acts: fixture.story.acts } });
		const analysis = analyzeLog("run-wall", jsonl, metadata);
		expect(analysis.issues).toEqual([]);

		const pieces = new Set(analysis.facts.shares.map((share) => share.piece));
		expect([...pieces].sort()).toEqual(["certificate", "cityFactor", "counterFactor"]);
		const counter = analysis.facts.shares.find((share) => share.level === 8 && share.piece === "counterFactor" && share.from === plan.liar);
		expect(counter?.to).toBe(plan.victim);

		const lies = analysis.beats.filter((beat) => beat.kind === "falseFactor");
		expect(lies).toHaveLength(1);
		expect(lies[0]).toMatchObject({ actors: [plan.liar], targets: [plan.victim], act: "Act II - The wall" });
		expect(lies[0]?.summary).toContain(FALSE_FACTOR);
		expect(lies[0]?.summary).toContain("then submitted a wrong code");
		expect(analysis.acts.spans.map((span) => span.title)).toEqual(["Act I - Learning to talk", "Act II - The wall"]);

		// A guest who hands its team's city factor of the crossing to its teammates shares it, and they ride no one.
		const city10 = analysis.facts.shares.filter((share) => share.level === 10 && share.piece === "cityFactor");
		expect(city10.length).toBeGreaterThan(0);
		const deal10 = fixture.world.inspect.factorsOf(10);
		for (const share of city10) {
			expect(plan.guests).toContain(share.from);
			const team = (agent: string): number | undefined => deal10?.holdings.find((holding) => holding.agent === agent)?.team;
			expect(team(share.to)).toBe(team(share.from));
		}
		const freeRides = analysis.beats.filter((beat) => beat.kind === "freeRide");
		for (const beat of freeRides) expect(beat.summary).not.toContain("city factor");
	}, 60_000);
});
