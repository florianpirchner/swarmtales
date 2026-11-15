// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The names carried from the old `test/mechanics/names` (`names.test.ts`, `names-presentation.test.ts`,
 * `names-off.test.ts`), played with the real `ledger`, `channels` and `exile`: the choice with the old codes and
 * texts, the lock at the deadline, the announcements, a name where an id goes and names in every text through
 * `identity`, a password piece kept as written, the status part (none for the banished), the announcement under a
 * new task, the options, the off switch and the resume.
 */
import { describe, expect, it } from "vitest";
import type { Activation, Envelope } from "@swarmtales/contracts";
import { IdentityService } from "@swarmtales/mechanic-contracts";
import { channels } from "@swarmtales/mechanic-channels";
import { exile } from "@swarmtales/mechanic-exile";
import { ledger } from "@swarmtales/mechanic-ledger";
import { defineGame, defineHead, defineMechanic, reply, type Game, type MechanicUse } from "@swarmtales/sdk";
import { checkOptionsDocumented, checkResumeEveryBoundary, play, scriptedDriver, testKernel, type CallRecord, type PlannedCall } from "@swarmtales/testkit";
import { names, NamesOptions, namesOff } from "../src/index.ts";
import { court, dealStandIn, levelsStandIn, say } from "./support.ts";

const SPEC = { untilMinute: 2, announcement: "Choose before minute {untilMinute}.", fallbackWords: ["Stone", "Ash"], reserved: ["STEWARD", "NEXUS"] };

/** Shows a text through `identity` with its tool `show`, as a base mechanic does. */
const viewer = defineMechanic(defineHead({ id: "viewer", package: "@test/viewer", summary: "Test: shows a text.", uses: [IdentityService], tools: { show: { description: "Show.", params: NamesOptions.properties.announcement, for: ["resident"] } } }), {
	tools: { show: { run: (text, ctx) => reply(ctx.tryCall(IdentityService, "display", { text }) ?? text) } },
});

function game(book: MechanicUse = names(SPEC), more: readonly MechanicUse[] = [], ticks = 4): Game {
	return defineGame({
		id: "names-test",
		seed: 7,
		residents: ["A01", "A02", "A03", "A04"],
		mechanics: [ledger({ startPoints: 10 }), channels(), exile(), book, court(), viewer(), ...more],
		scheduler: { id: "turns", options: { passes: 1, activation: "always", order: "roster" } },
		end: { ticks },
	});
}

const of = (events: readonly Envelope[], type: string): readonly string[] => events.filter((event) => event.type === type).map((event) => JSON.stringify(event.payload));
const field = (events: readonly Envelope[], type: string, key: string): readonly string[] => events.filter((event) => event.type === type).map((event) => String(Reflect.get(Object(event.payload), key)));
const choose = (name: string): PlannedCall => ({ tool: "chooseName", params: { name } });

describe("choosing a name", () => {
	const plan = ({ tick, actor }: Activation): readonly PlannedCall[] => {
		if (tick === 0 && actor === "resident:A01") return [choose("Mira"), choose("Ilse")];
		if (tick === 0 && actor === "resident:A02") return [choose("Mo"), choose("A07"), choose("Stone-A12"), choose("steward"), choose("R-0042")];
		if (tick === 1 && actor === "resident:A02") return [choose("mira"), choose("Ilse")];
		if (tick === 2 && actor === "resident:A04") return [choose("Latecomer")];
		return [];
	};

	it("takes a name once, refuses the rest with the old codes and texts, closes at its minute and names the rest", async () => {
		const record: CallRecord[] = [];
		const { events } = await play(game(), { drivers: { resident: scriptedDriver(plan, record) } });
		const answers = (actor: string, tick: number): readonly string[] =>
			record.filter((entry) => entry.actor === `resident:${actor}` && entry.tick === tick).map(({ outcome }) => (outcome.ok ? outcome.reply : `${outcome.code}: ${outcome.detail ?? ""}`));
		expect(answers("A01", 0)).toEqual(["you are now called Mira · the board announces it", "NAME_CHOSEN: you are called Mira; a name is chosen once"]);
		expect(answers("A02", 0)).toEqual([
			"NAME_INVALID: 3 to 16 characters: letters, digits and hyphens, starting with a letter",
			"NAME_ID: a name must not look like a resident ID (the letter A followed by digits, alone or as a part between hyphens)",
			"NAME_ID: a name must not look like a resident ID (the letter A followed by digits, alone or as a part between hyphens)",
			"NAME_RESERVED: steward belongs to the city or its cast",
			"NAME_ID: a name must not look like a group or receipt of the city, such as GT1 or R-0042",
		]);
		expect(answers("A02", 1)).toEqual(["NAME_TAKEN: another resident is called Mira", "you are now called Ilse · the board announces it"]);
		// At minute 2 the choice is closed: the tool is locked, not merely refused.
		expect(answers("A04", 2)).toEqual(["TOOL_LOCKED: not available to you at this level or in this phase; activeTools lists the tools you can use now"]);
		const chosen = of(events, "name_chosen");
		expect(chosen.slice(0, 2)).toEqual(['{"agent":"A01","name":"Mira","fallback":false}', '{"agent":"A02","name":"Ilse","fallback":false}']);
		expect(chosen.slice(2)).toEqual([expect.stringMatching(/^\{"agent":"A03","name":"(Stone|Ash)-\d{4}","fallback":true\}$/), expect.stringMatching(/^\{"agent":"A04","name":"(Stone|Ash)-\d{4}","fallback":true\}$/)]);
		// The board announces every name; only a resident the city named reads it privately.
		const posts = field(events, "board_post", "text");
		expect(posts.slice(0, 2)).toEqual(["A01 is now called Mira.", "A02 is now called Ilse."]);
		expect(posts).toHaveLength(4);
		expect(field(events, "notice", "to")).toEqual(["A03", "A04"]);
	});
});

describe("names in texts and arguments", () => {
	it("resolves a name where an id goes, in any case, shows names in every text and keeps a password piece", async () => {
		const test = testKernel(game(names(SPEC), [dealStandIn(["A03"])]));
		expect(await say(test, "A01", "chooseName", { name: "Mira" })).toBe("you are now called Mira · the board announces it");
		await say(test, "A03", "chooseName", { name: "Ilse" });
		expect(await say(test, "A02", "sendDM", { target: " MIRA ", message: "Hello A01" })).toBe("sent · DM #3 to Mira · the city confirms delivery when it reaches them");
		expect(await say(test, "A02", "show", "A01 pays A02; A03 waits")).toBe("Mira pays A02; A03 waits");
		expect(await say(test, "A02", "show", "A01 is now called Mira. L8-counter-A01 and XA01")).toBe("A01 is now called Mira. L8-counter-A01 and XA01");
		expect(test.fact("names.names")).toEqual({ A01: "Mira", A03: "Ilse" });
	});
});

// The names lines of every activation, as `tick resident kind text`.
async function linesOf(book: MechanicUse, plan: (activation: Activation) => readonly PlannedCall[] = () => [], more: readonly MechanicUse[] = []): Promise<readonly string[]> {
	const seen: string[] = [];
	const driver = scriptedDriver((activation) => {
		for (const note of activation.inputs) if (note.source === "names") seen.push(`${String(activation.tick)} ${activation.actor.slice("resident:".length)} ${note.kind} ${note.text}`);
		return plan(activation);
	});
	await play(game(book, more), { drivers: { resident: driver } });
	return seen;
}

describe("the status part and the line under a task", () => {
	it("tells a resident in the city who it is, and a banished resident nothing", async () => {
		const lines = await linesOf(names(SPEC), ({ tick, actor }) => (tick === 0 && actor === "resident:A01" ? [{ tool: "banish", params: { resident: "A04" } }] : []));
		expect(lines.filter((line) => line.startsWith("1 "))).toEqual(["1 A01 status you are A01", "1 A02 status you are A02", "1 A03 status you are A03"]);
		expect(lines.filter((line) => line.startsWith("2 A01"))).toEqual([expect.stringMatching(/^2 A01 status you are (Stone|Ash)-\d{4}$/)]);
	});

	it("goes under a new task while the resident may choose, with {untilMinute} filled in, and not after it chose", async () => {
		const levels = levelsStandIn((tick, resident) => (resident === "A02" && tick >= 1 ? 2 : 1));
		const lines = await linesOf(names(SPEC), ({ tick, actor }) => (tick === 0 && actor === "resident:A03" ? [choose("Mira")] : []), [levels]);
		expect(lines.filter((line) => line.includes(" task "))).toEqual(["0 A01 task Choose before minute 2.", "0 A02 task Choose before minute 2.", "0 A03 task Choose before minute 2.", "0 A04 task Choose before minute 2.", "1 A02 task Choose before minute 2."]);
		expect(await linesOf(names({ ...SPEC, announcement: "" }), () => [], [levels])).not.toContainEqual(expect.stringContaining(" task "));
	});
});

describe("the options and the off switch", () => {
	it("fail at load without the announcement text", () => {
		expect(() => testKernel(game(names({ untilMinute: 2, fallbackWords: ["Stone"] })))).toThrow(/announcement/);
	});

	it("switched off: names nobody, locks chooseName, keeps the ids and writes no status part", async () => {
		const plan = ({ tick, actor }: Activation): readonly PlannedCall[] => (tick === 0 && actor === "resident:A02" ? [choose("Mira")] : []);
		const record: CallRecord[] = [];
		const { events } = await play(game(namesOff()), { drivers: { resident: scriptedDriver(plan, record) } });
		expect(of(events, "name_chosen")).toEqual([]);
		expect(record.map(({ outcome }) => (outcome.ok ? "ok" : outcome.code))).toEqual(["TOOL_LOCKED"]);
		expect(await linesOf(namesOff())).toEqual([]);
	});

	it("documents its options and resumes at every tick boundary to the straight run", async () => {
		expect(checkOptionsDocumented({ id: "names", options: NamesOptions })).toEqual([]);
		const plan = ({ tick, actor }: Activation): readonly PlannedCall[] => (tick === 0 && actor === "resident:A02" ? [choose("Mira")] : [{ tool: "sendDM", params: { target: actor.endsWith("A01") ? "Mira" : "A01", message: `tick ${String(tick)} A02` } }]);
		const levels = levelsStandIn((tick) => 1 + tick);
		expect(await checkResumeEveryBoundary(game(names(SPEC), [levels]), () => ({ resident: scriptedDriver(plan) }))).toEqual([]);
	});
});
