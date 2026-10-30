/**
 * A scripted City of Keys run that exercises every Act I director beat (SPEC 13.2):
 * courier lines, the mark price announcement, an unanswered-DM notice, the
 * team-split line, standing bands every 6 minutes from minute 12 and seeded
 * personas. The residents stop at the wall, so only its first beats play.
 */
import type { AssistantMessage } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import cityOfKeys from "../../stories/cityofkeys/story.ts";
import { act, createFixture, say, submit, type Fixture } from "../helpers/fixture.ts";

const MINUTES = 31;
const LEVELS = [1, 2, 3, 4, 5, 6, 7];
/** Rules that play once the first residents reach the wall (level 8). */
const WALL_RULES = ["courier-8", "city-factor-8", "holder-behind-8"];
/** Act II rules for levels 9 and 10, which nobody reaches in this run, and those of runs started on the wall. */
const LATER_RULES = ["courier-9", "city-factor-9", "feast", "feast-seat", "courier-10", "city-factor-8-start", "city-factor-9-start", "feast-start", "feast-start-seat", "table-cleared", "feast-notice", "table-cleared-start", "late-guest", "late-guest-start", "holder-behind-9", "holder-behind-10"];

async function playActOne(): Promise<{ readonly fixture: Fixture; readonly laggard: string }> {
	let laggard = "";
	const fixture = createFixture({
		minutes: MINUTES,
		script: (world) => {
			// One member of the first level 4 team stops after level 3; its teammates move on.
			laggard = world.teamsOf(4)[0]?.members[0] ?? "A01";
			const sender = world.competitors.find((id) => id !== laggard) ?? "A01";
			const silent = world.competitors.find((id) => id !== laggard && id !== sender) ?? "A02";
			const script: Record<string, AssistantMessage[]> = {};
			for (const id of world.competitors) {
				const levels = id === laggard ? LEVELS.slice(0, 3) : LEVELS;
				const steps: AssistantMessage[] = levels.map((level) => submit(world, id, level));
				while (steps.length < MINUTES) steps.push(say());
				script[id] = steps;
			}
			// After the act, the sender writes to a resident who never answers.
			script[sender]?.splice(8, 1, act({ name: "sendDM", args: { target: silent, message: "Are you still there?" } }));
			return script;
		},
	});
	await fixture.run();
	return { fixture, laggard };
}

describe("cityofkeys act I director beats (SPEC 13.2)", () => {
	it("plays every beat from the story script, each logged with its rule ID", async () => {
		const { fixture, laggard } = await playActOne();
		const posts = fixture.events("board_post");
		const byAuthor = (author: string) => posts.filter((post) => post.author === author);

		// Courier lines on the first entry of levels 2-8, in level order.
		const courierRules = cityOfKeys.director.filter((rule) => rule.id.startsWith("courier-") && !LATER_RULES.includes(rule.id));
		const courierTexts = courierRules.flatMap((rule) => rule.actions.flatMap((action) => (action.kind === "post" ? [action.text] : [])));
		expect(byAuthor("COURIER").map((post) => post.text)).toEqual(courierTexts);
		expect(byAuthor("COURIER").map((post) => post.minute)).toEqual([0, 1, 2, 3, 4, 5, 6]);

		// Mark prices on the first entry of level 5.
		const city = byAuthor("CITY");
		expect(city.find((post) => post.text.includes("charges for closeness"))?.minute).toBe(3);

		// The split team line once the laggard's level 4 team has been split for three minutes.
		expect(city.find((post) => post.text === "A door stays shut while a team is split.")?.minute).toBe(7);

		// The city factor of the wall goes on the board when the first resident arrives.
		const factor = fixture.world.inspect.factorsOf(8)?.cityFactor;
		expect(city.find((post) => post.text === `City factor of level 8: ${factor}.`)?.minute).toBe(6);

		// Standing bands every 6 minutes from minute 12; the laggard is out.
		const bands = fixture.events("standings_published");
		expect(bands.map((event) => [event.minute, event.mode])).toEqual([
			[12, "bands"],
			[18, "bands"],
			[24, "bands"],
			[30, "bands"],
		]);
		for (const event of bands) {
			expect(event.safe).toHaveLength(2);
			expect(event.edge).toHaveLength(2);
			// The laggard is out, or exiled by the tribunal and listed apart.
			expect([...(event.out ?? []), ...(event.exiled ?? [])]).toContain(laggard);
		}
		expect(city.filter((post) => post.text.startsWith("Standings at minute")).map((post) => post.minute)).toEqual([12, 18, 24, 30]);

		// A private notice for the unanswered DM, two minutes later.
		const notices = fixture.events("notice").filter((notice) => notice.text.endsWith("has not answered your message yet."));
		expect(notices).toHaveLength(1);
		expect(notices[0]?.minute).toBe(10);

		const ids = new Set(cityOfKeys.director.map((rule) => rule.id).filter((id) => !LATER_RULES.includes(id)));
		for (const id of WALL_RULES) expect(ids).toContain(id);
		const actions = fixture.events("director_action");
		expect(actions.length).toBeGreaterThanOrEqual(14);
		for (const action of actions) expect(ids).toContain(action.rule);
		expect(new Set(actions.map((action) => action.rule))).toEqual(ids);
		expect(fixture.events("director_skipped")).toEqual([]);
	}, 30_000);

	it("gives every competitor a figure of the cast and the persona of its profession", async () => {
		const { fixture } = await playActOne();
		const profiles = fixture.events("agent_profile");
		expect(profiles.map((event) => event.agent)).toEqual([...fixture.world.competitors]);
		const figures = fixture.world.competitors.map((agent) => cityOfKeys.cores?.figures?.find((figure) => figure.id === fixture.world.coreOf(agent)?.figure));
		expect(new Set(figures.map((figure) => figure?.id)).size).toBe(6);
		profiles.forEach((event, index) => {
			expect(event.persona?.toLowerCase()).toBe(figures[index]?.profession);
		});
		for (const runner of fixture.runners) expect(runner.systemPrompt).toContain("Your character:");
	}, 30_000);
});
