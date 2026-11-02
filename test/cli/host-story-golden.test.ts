/**
 * The golden logs replayed on the production story mapping (apps/cli/src/host/story.ts): the host of
 * `hostStoryOf(story, run)` with the golden run's dials, every mechanic real (exile, tribunal,
 * standoff, seal, motives, goals included; no stand-in), the derived grants, and the golden
 * residents' and gamemaker's calls made in their golden turns (as test/mechanics/arena/golden-host.ts).
 *
 * Every line the old engine wrote outside the app equals the golden's in order, and the gamemaker's
 * "Tribunal:" section rendered from the tribunal's `section` fact (mechanics/tribunal/src/section.ts)
 * equals the section of every golden gamemaker look (the repo gate of the step-18 wiring list).
 * The app's lines (runner, gamemaker, usage) are not written by a host; they are the CLI's part of
 * step 18 (docs/design/rewrite-status.md).
 */
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { legacyOwner, legacySink } from "@swarmtales/chronicle";
import type { Host } from "@swarmtales/contracts";
import { createHost } from "@swarmtales/kernel";
import { createPromptLookup } from "@swarmtales/prompts";
import type { LegacyLine } from "@swarmtales/testkit";
import { renderTribunalSection, tribunalSectionOf } from "@swarmtales/mechanic-tribunal";
import { hostStoryOf, type HostRun } from "../../apps/cli/src/host/story.ts";
import { sectionLines } from "../mechanics/tribunal/support/section.ts";
import { goldenLog, RESIDENTS, SEED, storyOf, type GoldenName } from "../mechanics/puzzles/harness.ts";
import { planOf, turnKey } from "../mechanics/t2/golden-plan.ts";

/** The resident tools a golden run called that a host can replay (every call of the three goldens). */
const REPLAYED = new Set(["submitSolution", "getProblem", "getStatus", "listAgents", "activeTools", "readBoard", "postBoard", "sendDM", "nameFavourite", "forgeReceipt", "chooseName"]);

/** The golden runs' dials (test/golden/golden.test.ts). */
const DIALS: Readonly<Record<GoldenName, Pick<HostRun, "figureDirection" | "gmDirection" | "names">>> = {
	"cityofkeys-f4g4": { figureDirection: 4, gmDirection: 4, names: true },
	"cityofkeys-f10g10": { figureDirection: 10, gmDirection: 10, names: true },
	"whispers-f10-grudge": { figureDirection: 10, gmDirection: 4, names: false },
};

interface Replay {
	readonly golden: readonly LegacyLine[];
	readonly lines: readonly LegacyLine[];
	/** The gamemaker's tribunal section rendered from the host's `tribunal.section` fact in each minute's between slot. */
	readonly sections: ReadonlyMap<number, readonly string[]>;
}

async function replay(name: GoldenName): Promise<Replay> {
	const story = storyOf(name);
	const golden = goldenLog(name);
	const plan = planOf(golden);
	const run: HostRun = {
		residents: [...RESIDENTS],
		seed: SEED,
		minutes: plan.minutes,
		// The golden composer's settings: one pass, block 1, every resident each minute, no early stop.
		arena: { startLevel: 1, activation: "always", passesPerMinute: 1, blockSize: 1, stopWhenDone: false, stopWhenSeatsDecided: false },
		coreMotives: true,
		whisperer: true,
		guards: true,
		gamemaker: true,
		...DIALS[name],
	};
	const { definition } = hostStoryOf(story, run);
	const ref: { host?: Host } = {};
	const sections = new Map<number, readonly string[]>();
	const between = async (minute: number): Promise<void> => {
		// The look is written before the gamemaker's calls of the minute.
		if (ref.host !== undefined) sections.set(minute, renderTribunalSection(tribunalSectionOf(ref.host.facts()["tribunal.section"])));
		for (const line of plan.between.get(minute) ?? []) {
			if (line.type !== "gamemaker_call" || ref.host === undefined) continue;
			const outcome = await ref.host.call("gamemaker", String(line.tool), line.args);
			if (!outcome.ok) throw new Error(`gamemaker ${String(line.tool)} at minute ${String(minute)}: ${outcome.code}`);
		}
	};
	const host = createHost({ story: definition, prompts: createPromptLookup({ story: fileURLToPath(new URL("../mechanics/t2/prompts", import.meta.url)) }), between });
	ref.host = host;
	const lines: LegacyLine[] = [];
	host.subscribe(legacySink((event) => lines.push(Object.fromEntries(Object.entries(event)))));
	host.start();
	await host.run(async (turn) => {
		const window = plan.turns.get(turnKey(turn.minute, turn.resident));
		if (window === undefined) throw new Error(`no golden turn for ${turn.resident} at minute ${String(turn.minute)}`);
		for (const line of window.lines) if (line.type === "tool_call" && REPLAYED.has(String(line.tool))) await turn.call(String(line.tool), line.args);
	});
	return { golden, lines, sections };
}

/** A line without its log position. */
function placed(line: LegacyLine): string {
	return JSON.stringify(Object.fromEntries(Object.entries(line).filter(([key]) => key !== "seq" && key !== "at")));
}

const outsideApp = (line: LegacyLine): boolean => legacyOwner(String(line.type)) !== "app";

describe.each(["cityofkeys-f4g4", "cityofkeys-f10g10", "whispers-f10-grudge"] as const)("the production story mapping on golden %s", (name) => {
	it("writes every line of the old engine outside the app, in the golden's order", async () => {
		const run = await replay(name);
		const expected = run.golden.filter(outsideApp).map(placed);
		expect(expected.length).toBeGreaterThan(250);
		expect(run.lines.filter(outsideApp).map(placed)).toEqual(expected);
	}, 120_000);

	it("renders the gamemaker's Tribunal section from the tribunal's fact as every golden look shows it (the section gate)", async () => {
		const run = await replay(name);
		const looks = run.golden.filter((line) => line.type === "gamemaker_turn");
		expect(looks.length).toBeGreaterThan(10);
		const story = storyOf(name);
		for (const look of looks) {
			const minute = Number(look.round) - 1;
			const want = sectionLines(String(look.input));
			if (story.tribunal !== undefined) expect(want.length).toBeGreaterThan(2);
			expect({ minute, lines: run.sections.get(minute) }).toEqual({ minute, lines: want });
		}
	}, 120_000);
});
