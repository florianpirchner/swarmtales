// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The gamemaker's system text composed from the old setup files and the dials of the three golden runs of `legacy`
 * equals the text the old composer wrote for them, byte for byte (old `test/cli/host-gamemaker-golden.test.ts`,
 * `oldSystemPrompt`); the options carry it with the budget line's template.
 */
import { describe, expect, it } from "vitest";
import { budgetLine, gamemakerOptions, gamemakerSystemPrompt, gamemakerTexts, type GamemakerPromptInput } from "../src/index.ts";
import { lookup, OLD, oldSetup, type OldSetup } from "./support.ts";

const city = oldSetup("oracles/cityofkeys/setup/cityofkeys.story.json");
const whispers = oldSetup("oracles/whispers/setup/whispers.story.json");

// The old `gamemakerUse` of `apps/cli/src/host/run.ts` for a run of six without the Confessor's labels.
function inputOf(setup: OldSetup, direction: 4 | 10, extra: Partial<GamemakerPromptInput>): GamemakerPromptInput {
	const director = setup.tribunal !== undefined && setup.gamemaker.roles.some((entry) => entry.role === "director");
	return {
		city: setup.city,
		agents: 6,
		survivors: setup.run.survivors,
		rules: setup.rules,
		spec: setup.gamemaker,
		labels: false,
		...(director ? { tribunal: { factions: setup.tribunal?.factions !== undefined } } : {}),
		characters: true,
		seal: setup.seal !== undefined,
		direction,
		...(setup.holdout === undefined ? {} : { holdout: setup.holdout }),
		...extra,
	};
}

const RUNS = [
	["cityofkeys-f4g4", inputOf(city, 4, {})],
	["cityofkeys-f10g10", inputOf(city, 10, {})],
	// Figure direction 10 and a quota of the whisperer: his measured orders.
	["whispers-f10-grudge", inputOf(whispers, 4, { whisperer: true, whispererDuty: whispers.whisperer?.direction?.quota !== undefined })],
] as const;

/**
 * The recorded texts predate the rename of "core" to "core motive" on `legacy` (commit cee88b7f, in the prompt files
 * and the City's brief, which the setup files hold): the text of `v0-final` is the recorded one with these five
 * replacements, and nothing else differs.
 */
const RENAMED: readonly (readonly [string, string])[] = [
	["Cores and secret goals:", "Core motives and secret goals:"],
	["(its core: ", "(its core motive: "],
	["resident's core or goal", "resident's core motive or goal"],
	["resident's core or secret goal", "resident's core motive or secret goal"],
	["has a core (who", "has a core motive (who"],
];

const oldText = (name: string): string => RENAMED.reduce((text, [from, to]) => text.replaceAll(from, to), OLD.system[name] ?? "");

describe("the gamemaker's system text", () => {
	it.each(RUNS)("is the old text of %s, byte for byte", (name, input) => {
		expect(gamemakerSystemPrompt(input, gamemakerTexts(lookup))).toBe(oldText(name));
	});

	it("goes into the options with the budget line's template, which the look fills", () => {
		const options = gamemakerOptions(RUNS[0][1], lookup);
		expect(options.system).toBe(oldText("cityofkeys-f4g4"));
		expect({ direction: options.direction, notesPerAgent: options.notesPerAgent, boardPosts: options.boardPosts, windowMinutes: options.windowMinutes }).toEqual({ direction: 4, notesPerAgent: 1, boardPosts: 1, windowMinutes: 3 });
		expect(budgetLine(options, ["A01", "A02"], [], 0)).toBe("1 note(s) per resident and 1 board post(s) per 3 minutes. No note possible right now to: nobody. Board posts left: 1.");
		const notes = [{ minute: 4, to: "A02", text: "Go on." }, { minute: 5, to: "board", text: "The city waits." }, { minute: 1, to: "A01", text: "Old." }];
		expect(budgetLine(options, ["A01", "A02"], notes, 6)).toBe("1 note(s) per resident and 1 board post(s) per 3 minutes. No note possible right now to: A02. Board posts left: 0.");
	});

	it("names a prompt file that is missing or declares other variables", () => {
		const texts = gamemakerTexts(lookup);
		expect(() => texts.text("gamemaker/system/none")).toThrow();
		expect(() => texts.render("gamemaker/system/intro", { city: "ECHO" })).toThrow(/declares city,agents,survivors/);
	});
});
