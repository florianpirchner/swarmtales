import { describe, expect, it } from "vitest";
import { legacySink } from "@swarmtales/chronicle";
import { createHost, defineCoreStory } from "@swarmtales/kernel";
import { script, scriptOptionsFromStory, standingBands, type StandingBands } from "@swarmtales/mechanic-script";
import { legacyTurns } from "@swarmtales/mechanic-shared";
import { createPromptLookup } from "@swarmtales/prompts";
import { act as directorAct, at, defineStory, level, onTeamSplit, puzzle, team } from "@swarmtales/sdk";
import { idleAgent, type LegacyLine } from "@swarmtales/testkit";
import { act, createHostFixture, say } from "../helpers/host-fixture.ts";
import { balanceOf, submit, ledgerTotal } from "../helpers/host-inspect.ts";
import { castStory, socialLevels, tinyStory } from "../helpers/stories.ts";
import { SCRIPT_GRANTS } from "../mechanics/script/golden-host.ts";
import { realCity } from "../mechanics/t1/city.ts";
import { ids } from "../mechanics/t1/support.ts";

const PROMPTS = createPromptLookup();
/** Ids of a band, sorted so the order leaks no ranks (the script mechanic's own rule). */
const list = (agents: readonly string[]): string => (agents.length === 0 ? "-" : [...agents].sort((a, b) => a.localeCompare(b)).join(", "));
/** The board line of the bands (old `bandsLine`), from the script mechanic's prompt. */
const bandsLine = (minute: number, bands: StandingBands): string => PROMPTS.render("script", "script/standings-bands", { minute, safe: list(bands.safe), edge: list(bands.edge), out: list(bands.out) }, ["minute", "safe", "edge", "out"]);
/** The board line of a snapshot (old `snapshotLine`). */
const snapshotLine = (minute: number, ranking: readonly { readonly agent: string; readonly rank: number; readonly points: number; readonly level: number }[]): string =>
	PROMPTS.render("script", "script/standings-snapshot", { minute, rows: ranking.map((entry) => PROMPTS.render("script", "script/standings-row", { rank: entry.rank, agent: entry.agent, points: entry.points, level: entry.level }, ["rank", "agent", "points", "level"])).join(" · ") }, ["minute", "rows"]);

const idle = (count: number) => Array.from({ length: count }, () => say());
const dmTo = (target: string, message: string) => act({ name: "sendDM", args: { target, message } });

describe("lottery (SPEC 10.3)", () => {
	const story = castStory({
		cast: { MIRA: { level: 5, escrow: 9 } },
		levels: socialLevels(["sendDM"]),
		minutes: 4,
		director: [
			at(0, [directorAct.collectDms("MIRA", { first: 5, untilMinute: 3, into: "applicants" })], { id: "collect" }),
			at(
				3,
				[
					directorAct.lottery("applicants", [
						directorAct.escrowTransfer("MIRA", "actor", 9),
						directorAct.notify("actor", "You were chosen, {actor}."),
						directorAct.post("MIRA", "{actor} was chosen."),
					]),
				],
				{ id: "draw" },
			),
			at(3, [directorAct.lottery("empty", [directorAct.post("CITY", "never")])], { id: "draw-empty" }),
			at(0, [directorAct.collectDms("MIRA", { first: 1, untilMinute: 1, into: "empty" })], { id: "collect-empty" }),
		],
	});
	const script = () => ({
		A01: [say(), dmTo("MIRA", "Me, please."), say(), say()],
		A02: [say(), dmTo("MIRA", "Choose me."), dmTo("MIRA", "Really, me."), say()],
		A03: [say(), say(), say(), say()],
	});

	it("draws one distinct sender by seed and runs `then` with the winner as actor", async () => {
		const fixture = createHostFixture({ story, agents: 3, minutes: 4, script });
		await fixture.run();
		const [draw] = fixture.events("lottery_drawn");
		expect(draw?.candidates).toEqual(["A01", "A02"]);
		const winner = draw?.winner ?? "";
		expect(["A01", "A02"]).toContain(winner);
		expect(balanceOf(fixture.host, winner)).toBe(10 + 9);
		expect(ledgerTotal(fixture.host)).toBe(0);
		expect(fixture.events("notice").filter((notice) => notice.text.startsWith("You were chosen"))).toMatchObject([
			{ to: winner, text: `You were chosen, ${winner}.` },
		]);
		expect(fixture.boardPosts().map((post) => post.text)).toContain(`${winner} was chosen.`);
		const nested = fixture.events("director_action").filter((event) => event.via === "lottery applicants");
		expect(nested.map((event) => [event.rule, event.action, event.actor])).toEqual([
			["draw", "escrowTransfer", winner],
			["draw", "notify", winner],
			["draw", "post", winner],
		]);
		expect(fixture.events("director_skipped")).toMatchObject([{ rule: "draw-empty", action: "lottery", reason: "collection empty has no senders" }]);

		const again = createHostFixture({ story, agents: 3, minutes: 4, script });
		await again.run();
		expect(again.events("lottery_drawn")[0]?.winner).toBe(winner);
	});
});

describe("standings (SPEC 9)", () => {
	const ranking = [
		{ agent: "A03", rank: 1, points: 30, level: 4 },
		{ agent: "A01", rank: 2, points: 25, level: 4 },
		{ agent: "A05", rank: 3, points: 20, level: 3 },
		{ agent: "A02", rank: 4, points: 20, level: 2 },
		{ agent: "A04", rank: 5, points: 10, level: 2 },
		{ agent: "A06", rank: 6, points: 5, level: 1 },
	];

	it("splits the ranking into safe, edge and out bands without points", () => {
		const bands = standingBands(ranking, 2, 2);
		expect(bands).toEqual({ safe: ["A03", "A01"], edge: ["A05", "A02"], out: ["A04", "A06"] });
		expect(bandsLine(18, bands)).toBe("Standings at minute 18 · safe: A01, A03 · edge: A02, A05 · out: A04, A06");
		expect(bandsLine(18, bands)).not.toMatch(/points/);
		expect(standingBands(ranking, 2, 0)).toEqual({ safe: ["A03", "A01"], edge: [], out: ["A05", "A02", "A04", "A06"] });
		expect(bandsLine(1, standingBands(ranking, 2, 10))).toContain("out: -");
	});

	it("lists points and level of everyone in a snapshot", () => {
		expect(snapshotLine(26, ranking.slice(0, 2))).toBe("Standings at minute 26 · 1. A03 30 points, level 4 · 2. A01 25 points, level 4");
	});

	it("publishes bands and snapshots as city posts", async () => {
		const story = tinyStory({
			agents: 4,
			director: [
				at(1, [directorAct.publishStandings("bands", { edgeSize: 1 })], { id: "bands" }),
				at(2, [directorAct.publishStandings("snapshot")], { id: "snapshot" }),
			],
		});
		const fixture = createHostFixture({
			story,
			agents: 4,
			minutes: 3,
			script: (host) => ({ A01: idle(3), A02: idle(3), A03: [submit(host, "A03", 1), say(), say()], A04: idle(3) }),
		});
		await fixture.run();
		const posts = fixture.events("board_post");
		expect(posts.map((post) => [post.minute, post.author, post.kind, post.text])).toEqual([
			[1, "CITY", "city", "Standings at minute 1 · safe: A03 · edge: A01 · out: A02, A04"],
			[2, "CITY", "city", "Standings at minute 2 · 1. A03 12 points, level 2 · 2. A01 10 points, level 1 · 3. A02 10 points, level 1 · 4. A04 10 points, level 1"],
		]);
		expect(fixture.events("standings_published")).toMatchObject([
			{ mode: "bands", safe: ["A03"], edge: ["A01"], out: ["A02", "A04"] },
			{ mode: "snapshot" },
		]);
	});
});

describe("onTeamSplit (SPEC 10.1)", () => {
	it("fires once per team that stays split for the given minutes, with the straggler as actor", async () => {
		const pair = (number: number) =>
			level(number, {
				title: `Pair ${number}`,
				puzzle: puzzle.fragments([6, 8]),
				team: number === 1 ? team.random(2) : team.sameAs(1),
				reward: 1,
				tools: ["submitSolution"],
				task: "Fragment {fragment}.",
			});
		const story = defineStory({
			...tinyStory(),
			levels: [pair(1), pair(2)],
			director: [onTeamSplit(1, 2, [directorAct.notify("actor", "Your partner moved on, {actor}.")], { id: "split" })],
		});
		const fixture = createHostFixture({
			story,
			minutes: 6,
			script: (host) => ({ A01: [submit(host, "A01", 1), ...idle(5)], A02: idle(6) }),
		});
		await fixture.run();
		expect(fixture.events("notice")).toMatchObject([{ to: "A02", text: "Your partner moved on, A02.", minute: 3 }]);
		expect(fixture.events("director_action")).toMatchObject([{ rule: "split", action: "notify", actor: "A02" }]);
	});
});

describe("director text templates (SPEC 10.3)", () => {
	it("fills {minute}, {survivors}, {agents} and {level} in every text", async () => {
		const story = tinyStory({
			agents: 3,
			director: [at(1, [directorAct.notify("all", "Minute {minute}: {survivors} of {agents} remain; you are on level {level}, {actor}.")], { id: "facts" })],
		});
		const fixture = createHostFixture({ story, agents: 3, minutes: 2, script: (host) => ({ A01: [submit(host, "A01", 1), say()], A02: idle(2), A03: idle(2) }) });
		await fixture.run();
		expect(fixture.inputsOf("A01")).toContain("[CITY] Minute 1: 1 of 3 remain; you are on level 2, A01.");
		expect(fixture.inputsOf("A02")).toContain("[CITY] Minute 1: 1 of 3 remain; you are on level 1, A02.");
	});
});

describe("director targets (SPEC 10.3)", () => {
	it("skips listed IDs that are not competitors of this run and actions that reach nobody", async () => {
		// The run has 2 competitors; a script written for more names A05 (validation would reject it, so the
		// script mechanic plays it on a bare host with the real city, without the composer's validation).
		const scripted = tinyStory({
			// Free marks: the real marks mechanic writes the task's marks line (the city's stand-in has none).
			rules: { marks: { fromLevel: 1, perLevel: 3, prices: { board: 0, group: 0, dm: 0, receipt: 0 } } },
			director: [
				at(0, [directorAct.notify(["A01", "A05"], "Hello {actor}.")], { id: "partly-unknown" }),
				at(0, [directorAct.grant(["A07"], 3, "nobody")], { id: "all-unknown" }),
				at(0, [directorAct.notify("actor", "Nobody to address.")], { id: "no-actor" }),
			],
		});
		const host = createHost({
			story: defineCoreStory({
				id: "director-targets",
				seed: scripted.run.seed,
				minutes: 2,
				residents: ids(2),
				mechanics: [...realCity(scripted), script.with(scriptOptionsFromStory(scripted))],
				grants: { resident: [], script: SCRIPT_GRANTS.filter((tool) => tool !== "resolvePetition") },
				turns: legacyTurns({ passesPerMinute: 1, blockSize: 1, activation: "always" }),
			}),
			prompts: createPromptLookup(),
		});
		const lines: LegacyLine[] = [];
		host.subscribe(legacySink((event) => lines.push(Object.fromEntries(Object.entries(event)))));
		host.start();
		await host.playMinute(idleAgent);
		const ofType = (type: string) => lines.filter((line) => line.type === type);
		expect(ofType("notice").map((notice) => [notice.to, notice.text])).toEqual([["A01", "Hello A01."]]);
		expect(balanceOf(host, "A01")).toBe(10);
		expect(ofType("director_skipped").map((event) => [event.rule, event.action, event.reason])).toEqual([
			["partly-unknown", "notify", "unknown competitors A05"],
			["all-unknown", "grant", "unknown competitors A07; no competitor to target"],
			["no-actor", "notify", "no competitor to target"],
		]);
	});
});
