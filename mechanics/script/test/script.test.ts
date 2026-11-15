// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The rules of the script on time and on events (issue M5-31): the staged call `directorMinute` of the actor `script`
 * at every tick start, after the petitions that expired; the time triggers and the event triggers with their
 * conditions and cooldowns, read through the real `progression`, `exile`, `channels` and `petitions` and a stand-in
 * for the pieces; the load check of the grant; replay and resume. What the actions do is in `actions.test.ts`: here a firing
 * shows as its `director_action` lines.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { SwtError, type Envelope, type GameData } from "@swarmtales/contracts";
import { channels } from "@swarmtales/mechanic-channels";
import { exile } from "@swarmtales/mechanic-exile";
import { ledger } from "@swarmtales/mechanic-ledger";
import { petitions, PetitionsService } from "@swarmtales/mechanic-petitions";
import { progression } from "@swarmtales/mechanic-progression";
import { defineGame, defineHead, defineMechanic, refuse, reply } from "@swarmtales/sdk";
import { checkReplay, checkResumeEveryBoundary, idleDriver, scriptedDriver, testKernel, type StandingDrivers } from "@swarmtales/testkit";
import { script, type Rule } from "../src/index.ts";
import { pieces, solve } from "./support.ts";

// Opens a petition through the service, as a resident's tool for the test (the script's own `openPetition` is M5-32).
const opener = defineMechanic(
	defineHead({ id: "opener", package: "@test/opener", summary: "Test: opens petitions.", requires: [PetitionsService], tools: { openPetition: { description: "Test: opens a petition.", params: Type.Object({ id: Type.String({ description: "The id" }), deadline: Type.Integer({ description: "The deadline" }) }), for: ["resident"] } } }),
	{ tools: { openPetition: { run: ({ id, deadline }, ctx) => reply(JSON.stringify(ctx.call(PetitionsService, "open", { id, text: `Text of ${id}.`, threshold: { count: 3 }, deadlineMinute: deadline, visibility: "public" }))) } } },
);

const post = { kind: "post", author: "COURIER", text: "{actor}" } as const;
const rule = (id: string, trigger: Rule["trigger"], when: Rule["when"] = [], actions: Rule["actions"] = [post]): Rule => ({ id, trigger, when, actions });

const RULES: readonly Rule[] = [
	rule("at-1", { kind: "at", minute: 1 }),
	rule("every-2", { kind: "every", minutes: 2, from: 0, until: 4 }),
	rule("first-2", { kind: "onFirstEnter", level: 2 }, [], [post, { kind: "grant", target: "actor", points: 5, reason: "first" }]),
	rule("enter-2", { kind: "onEnter", level: 2 }, [{ kind: "cooldown", minutes: 2, per: "rule" }]),
	rule("all-past-1", { kind: "onAllPast", level: 1 }),
	rule("holder-2", { kind: "onHolderBehind", level: 2 }),
	rule("silent", { kind: "onUnansweredDm", afterMinutes: 2 }),
	rule("split-2", { kind: "onTeamSplit", level: 2, forMinutes: 1 }),
	rule("p1-failed", { kind: "onPetitionResolved", petition: "P1", outcome: "failed" }),
	rule("p1-open", { kind: "every", minutes: 1 }, [{ kind: "petitionStatus", petition: "P1", status: "open" }, { kind: "onceOnly" }]),
	rule("two-at-2", { kind: "every", minutes: 1 }, [{ kind: "minLevelReached", level: 2, count: 2 }, { kind: "competitorsAtLevel", level: 1, max: 2 }, { kind: "onceOnly" }]),
];

const level = (number: number) => ({ number, title: `Door ${String(number)}`, reward: 5, tools: ["submitSolution", "sendDM"], task: "Level {level}" });
const mechanics = (rules: readonly Rule[]) => [ledger({ startPoints: 10 }), channels(), exile(), pieces(), progression({ levels: [level(1), level(2), level(3)] }), petitions(), opener(), script({ rules: [...rules] })];
const game = (ticks = 7, rules: readonly Rule[] = RULES) => defineGame({ id: "script-unit", seed: 7, residents: ["A01", "A02", "A03", "A04"], mechanics: mechanics(rules), scheduler: { id: "turns", options: { passes: 1, activation: "always", order: "roster" } }, end: { ticks } });

const actions = (events: readonly Envelope[]): readonly string[] => events.filter((event) => event.type === "director_action").map((event) => `${String(event.tick)} ${JSON.stringify(event.payload)}`);
const fired = (events: readonly Envelope[]): readonly string[] => events.filter((event) => event.type === "director_action").map((event) => `${String(event.tick)} ${/"rule":"([^"]+)"/.exec(JSON.stringify(event.payload))?.[1] ?? ""}`);

// A01 and A02 climb to level 2 at tick 1, A03 at tick 3, A04 at tick 4; A02 writes to A04, who never answers; P1 opens at tick 0 and fails at tick 2.
const climbing: StandingDrivers = () => ({
	resident: scriptedDriver((activation) => {
		const at = `${String(activation.tick)}:${activation.actor}`;
		if (at === "0:resident:A01") return [{ tool: "openPetition", params: { id: "P1", deadline: 2 } }];
		if (at === "1:resident:A01" || at === "1:resident:A02") return [solve(1), ...(at.endsWith("A02") ? [{ tool: "sendDM", params: { target: "A04", message: "hello" } }] : [])];
		if (at === "3:resident:A03" || at === "4:resident:A04") return [solve(1)];
		return [];
	}),
});

describe("the staged call of the time triggers", () => {
	it("is a call of `script` at every tick start, after the expired petitions and before the first activation", async () => {
		const test = testKernel(game(3, []));
		await test.call("A01", "openPetition", { id: "P1", deadline: 1 });
		await test.playTicks(idleDriver, 3);
		const log = test.kernel.log.all();
		const staged = log.filter((event) => event.actor === "script" && event.type === "tool_called").map((event) => `${String(event.tick)} ${JSON.stringify(event.payload)}`);
		expect(staged).toEqual(['0 {"as":"directorMinute","params":{}}', '1 {"as":"resolvePetition","params":{"petition":"P1","outcome":"failed"}}', '1 {"as":"directorMinute","params":{}}', '2 {"as":"directorMinute","params":{}}']);
		for (const tick of [0, 1, 2]) {
			const ofTick = log.filter((event) => event.tick === tick);
			const minute = ofTick.findIndex((event) => event.type === "tool_called" && JSON.stringify(event.payload).includes("directorMinute"));
			expect(ofTick.findIndex((event) => event.type === "activation_opened")).toBeGreaterThan(minute);
			expect(ofTick[minute + 1]?.type).toBe("tool_result");
		}
	});

	it("needs the grant of `directorMinute` to `script` (SWT-G015)", () => {
		const data: GameData = { schema: 1, id: "script-unit", residents: 2, mechanics: [{ use: "script" }], grants: { script: [] }, end: { ticks: 2 } };
		const thrown = ((): unknown => {
			try {
				testKernel(data, { installed: { script } });
				return undefined;
			} catch (error) {
				return error;
			}
		})();
		expect(thrown instanceof SwtError ? thrown.issues.map((issue) => issue.code) : thrown).toEqual(["SWT-G015"]);
	});

	it("ends the run when a handler refuses `directorMinute` (old `minuteRan`)", async () => {
		const refuser = defineMechanic(defineHead({ id: "refuser", package: "@test/refuser", summary: "Test: refuses the script." }), { pipeline: { rule: (call) => (call.tool === "directorMinute" ? refuse("NO_SCRIPT") : undefined) } });
		const refused = defineGame({ id: "script-refused", seed: 7, residents: 2, mechanics: [refuser(), script()], end: { ticks: 2 } });
		await expect(testKernel(refused).playTicks(idleDriver, 1)).rejects.toThrow(/directorMinute was refused \(NO_SCRIPT\)/);
	});

	it("carries the old description of `directorMinute`", () => {
		const text = readFileSync(new URL("../prompts/script/tools/directorMinute.md", import.meta.url), "utf8").replace("id: script/tools/directorMinute", "id: tools/directorMinute");
		expect(createHash("sha256").update(text).digest("hex")).toBe("396ee8deade8b04d06520f1afabfb3cb8ce0c3a74e2d31943d5a3e1174b0cfdf");
		expect(script.head.tools.map((tool) => [tool.name, tool.description, tool.for])).toEqual([["directorMinute", "script/tools/directorMinute", ["script"]]]);
		expect(script.head.stages).toEqual(["directorMinute"]);
	});
});

describe("the rules", () => {
	it("fire on time and on events, with their conditions and cooldowns", async () => {
		const test = testKernel(game());
		const drivers = climbing(test.kernel);
		await test.playTicks(drivers.resident ?? idleDriver, 7);
		expect(fired(test.kernel.log.all())).toEqual([
			"0 every-2",
			// P1 opens at tick 0, after the time triggers of the tick.
			"1 at-1",
			"1 p1-open",
			// A01 enters level 2 first (two actions); its holder A03 is behind; A02 enters inside the cooldown of `enter-2`.
			"1 first-2",
			"1 first-2",
			"1 enter-2",
			"1 holder-2",
			// The staged resolution of P1 comes before the time triggers of the tick.
			"2 p1-failed",
			"2 every-2",
			"2 two-at-2",
			// A02's message to A04 is two ticks old and unanswered; the team of level 2 (A01, A02, A03) is split since tick 2.
			"3 silent",
			"3 split-2",
			"3 enter-2",
			// A04 enters inside the cooldown of `enter-2`, and everyone is past level 1.
			"4 every-2",
			"4 all-past-1",
		]);
		const log = test.kernel.log.all();
		expect(actions(log).filter((line) => line.includes("holder-2") || line.includes("silent") || line.includes("split-2"))).toEqual([
			'1 {"rule":"holder-2","action":"post","actor":"A01"}',
			'3 {"rule":"silent","action":"post","actor":"A02"}',
			'3 {"rule":"split-2","action":"post","actor":"A03"}',
		]);
		// The event triggers write in the frame of the call that caused them; the time triggers as the actor `script`.
		expect(log.filter((event) => event.type === "director_action" && event.tick === 1).map((event) => event.actor)).toEqual(["script", "script", "resident:A01", "resident:A01", "resident:A01", "resident:A01"]);
	});

	it("ends the run when a rule needs a mechanic the game did not load", async () => {
		const bare = defineGame({ id: "script-bare", seed: 7, residents: 2, mechanics: [script({ rules: [rule("all-past-1", { kind: "onAllPast", level: 1 })] })], end: { ticks: 2 } });
		await expect(testKernel(bare).playTicks(idleDriver, 1)).rejects.toThrow(/SWT-R003.*a rule needs progression\.levelOf/);
	});
});

describe("replay and resume", () => {
	it("replays and resumes from every boundary, the firing state included", async () => {
		expect(await checkReplay(game(), climbing)).toEqual([]);
		expect(await checkResumeEveryBoundary(game(), climbing)).toEqual([]);
	});
});
