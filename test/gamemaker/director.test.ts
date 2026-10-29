/**
 * The gamemaker as director (v09, spec section 2): its report says plainly
 * when scheduleTribunal is its move and when the city calls one itself, shows
 * cores and secret goals and whether a black seal is borne (never by whom),
 * and the engine refuses a note that gives a core or goal away to anyone else
 * or repeats an earlier line to the same reader.
 */
import { describe, expect, it } from "vitest";
import { worldOracle } from "../../src/cli/oracle.ts";
import { characterLeaks, nearlySame } from "../../src/gamemaker/privacy.ts";
import { gamemakerSystemPrompt } from "../../src/gamemaker/system-prompt.ts";
import { oracleScript } from "../../src/model/scripted.ts";
import nexus from "../../stories/nexus/story.ts";
import { act, createFixture, say } from "../helpers/fixture.ts";

describe("the character guard", () => {
	const residents = [
		{ agent: "A01", cues: ["envy", "jealous"], goal: { kind: "exile", target: "A03" } },
		{ agent: "A02", cues: ["loyal"], goal: { kind: "lead" } },
	] as const;
	const nameOf = (agent: string) => (agent === "A01" ? "Mira" : undefined);

	it("blocks a core or goal of one resident in a text to another or on the board", () => {
		expect(characterLeaks("A02, A01 is jealous of your rank.", "A02", residents)).toEqual(["A01"]);
		expect(characterLeaks("Mira is jealous of everyone ahead of her.", "board", residents, nameOf)).toEqual(["A01"]);
		expect(characterLeaks("A01 wants A03 exiled before the act ends.", "A04", residents)).toEqual(["A01"]);
		expect(characterLeaks("A02 has a secret goal, A04.", "A04", residents)).toEqual(["A02"]);
		expect(characterLeaks("Deep down A02 is loyal to you.", "A05", residents)).toEqual(["A02"]);
		// Direction 8 and 10: a figure's orders, duty, rivals and tendencies are private too.
		expect(characterLeaks("A02's orders are to betray you.", "A01", residents)).toEqual(["A02"]);
		expect(characterLeaks("A01 has sworn to ruin you, A02.", "A02", residents)).toEqual(["A01"]);
		expect(characterLeaks("A01, your duty this act is still open.", "A01", residents)).toEqual([]);
		// To the target itself, "you" names it: the exile goal of A01 is given away.
		expect(characterLeaks("Careful: A01 wants you gone.", "A03", residents)).toEqual(["A01"]);
		// A protect goal in its own wording.
		const keeper = [{ agent: "A01", cues: ["care"], goal: { kind: "protect", target: "A04" } }] as const;
		expect(characterLeaks("A03, A04 is still in the city when this act ends: that is what A01 wants.", "A03", keeper)).toEqual(["A01"]);
	});

	it("allows the note to the resident itself and neutral texts naming others", () => {
		expect(characterLeaks("A01, envy will not open the door; A03 stands between you and your goal.", "A01", residents)).toEqual([]);
		expect(characterLeaks("A01 is rank 2 with 40 points; A03 is last.", "board", residents)).toEqual([]);
		// An exile cue without the goal's target says nothing about the goal.
		expect(characterLeaks("A01, A05 faces exile at the next tribunal.", "A05", residents)).toEqual([]);
	});

	it("allows public facts and the reader's own goal (false blocks in the v09 runs)", () => {
		// Exiles and ranks are public; only wanting them is private.
		expect(characterLeaks("A01 broke the black seal; A03 is gone. Two exiles remain.", "board", residents)).toEqual([]);
		expect(characterLeaks("A03: 145, two ahead of A01.", "A03", residents)).toEqual([]);
		// "your goal" is the reader's; a resident named in another sentence gives nothing away.
		expect(characterLeaks("A05: A02 sits at 149. The table at 30 settles your goal.", "A05", residents)).toEqual([]);
		expect(characterLeaks("A05, A02 waits. Which of those do you intend to be true?", "A05", residents)).toEqual([]);
	});

	it("finds a near-identical note", () => {
		expect(nearlySame("A01, the city keeps count of every point.", "A01: the city keeps count of every point!")).toBe(true);
		expect(nearlySame("A01, the city keeps count.", "A01, your partner on the wall waits for your factor.")).toBe(false);
	});
});

describe("the director's report and refusals (scripted)", () => {
	it("shows cores, goals and the seal without its bearer, refuses a repeated note and a leaked goal", async () => {
		const fixture = createFixture({
			agents: 6,
			level: 8,
			minutes: 12,
			script: () => ({ A01: [say(), say(), say(), say(), act({ name: "bid", args: { points: 3 } })] }),
			gamemakerScript: (world) => [
				act(
					{ name: "notify", args: { agent: "A02", text: "A02, the wall is climbed in pairs, and yours waits." } },
					{ name: "notify", args: { agent: "A03", text: `A03, ${world.goalOf("A01")?.text ?? ""}: that is what A01 wants.` } },
				),
				say("Done."),
				act({ name: "notify", args: { agent: "A02", text: "A02: the wall is climbed in pairs, and yours waits!" } }),
				...Array.from({ length: 20 }, () => say("Quiet.")),
			],
		});
		await fixture.run();
		const results = fixture.events("gamemaker_result").map((event) => event.text);
		expect(results[0]).toMatch(/^delivered to A02 as #\d+$/);
		expect(results[1]).toMatch(/^PRIVATE_BLOCKED: the text gives away the core or the secret goal of A01/);
		expect(results[2]).toMatch(/^REPEATED: you wrote nearly the same to A02 at minute \d+; say something new or nothing$/);
		const inputs = fixture.events("gamemaker_turn").map((event) => event.input);
		const first = inputs[0] ?? "";
		expect(first).toContain("Who they are (private: use a resident's core or goal only in a note to that same resident");
		expect(first).toMatch(/- A01: core: [a-z-]+: above all \w+/);
		const dealt = fixture.events("goal_dealt").find((event) => event.agent === "A01");
		expect(first).toContain(`secret goal: ${dealt?.text ?? "-"}`);
		expect(first).toMatch(/next wrong code costs 2\)/);
		// From minute 4 the auction runs; after its close someone bears the seal, and the report never says who.
		expect(inputs.some((input) => input.includes("- an auction runs until minute 7 (bids are secret, also from you)"))).toBe(true);
		const borne = inputs.find((input) => input.includes("someone bears an unused seal (you do not know who)")) ?? "";
		expect(borne).not.toBe("");
		expect(borne).not.toMatch(/A01[^\n]*seal|seal[^\n]*A01/);
	});

	it("says plainly when scheduleTribunal is its move and when the city calls one itself", async () => {
		const fixture = createFixture({
			agents: 6,
			level: 10,
			minutes: 40,
			script: (world) => oracleScript(world.competitors, () => worldOracle(world), 40),
			gamemakerScript: () => Array.from({ length: 80 }, () => say("Quiet.")),
		});
		await fixture.run();
		const moves = fixture.events("gamemaker_turn").flatMap((event) => event.input.split("\n").filter((line) => line.startsWith("- YOUR MOVE")));
		expect(moves.length).toBeGreaterThan(0);
		expect(moves[0]).toMatch(
			/^- YOUR MOVE: scheduleTribunal is available now\. The city still has to exile \d residents?; the earliest opening is minute \d+\. If you plan nothing, the city calls one itself at minute \d+ \(it opens at minute \d+\)\.$/,
		);
		// The minute it names is the minute the city's own plan is called.
		const named = Number(/calls one itself at minute (\d+)/.exec(moves[0] ?? "")?.[1] ?? -1);
		const own = fixture.events("tribunal_scheduled").filter((event) => event.by === "fallback" || event.by === "final");
		expect(own.map((event) => event.calledAt)).toContain(named);
	}, 60_000);

	it("tells the director its craft, and what it may do with cores, goals and the seal", () => {
		const spec = nexus.gamemaker;
		if (spec === undefined) throw new Error("nexus has no gamemaker");
		const prompt = gamemakerSystemPrompt({ city: "NEXUS", agents: 6, survivors: 2, rules: nexus.rules, spec, tribunal: { factions: true }, characters: true, seal: true });
		expect(prompt).toContain("Your craft is dramaturgy: rising tension, turning points, dilemmas");
		expect(prompt).toContain("A quiet act is a failed act.");
		expect(prompt).toContain("the climax at the last");
		expect(prompt).toContain("Use a resident's core or goal only in a private note to that same resident");
		expect(prompt).toContain("never who\n  bears it");
		expect(prompt).toContain("(REPEATED)");
		expect(prompt).toContain("2, 4, 6, then 8 points");
	});
});
