// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The check of a private thought in a Director's note (decision A62, issue M5-72): the `rule` handler of
 * `interpretations` on the note tools refuses a note that passes on a resident's private read (the `lie` labels the
 * Confessor wrote since the gamemaker's last look) with the old words of `gamemaker/replies/private-thoughts`.
 * The cases follow the old `privateLeaks` (old `mechanics/channels/src/privacy.ts`) and its window (`lookWindow`).
 */
import { Type } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import type { Activation } from "@swarmtales/contracts";
import { IdentityService } from "@swarmtales/mechanic-contracts";
import { channels } from "@swarmtales/mechanic-channels";
import { defineGame, defineHead, defineMechanic, reply, RESIDENT_KIND } from "@swarmtales/sdk";
import { checkReplay, checkResumeEveryBoundary, scriptedDriver, testKernel, type TestKernel } from "@swarmtales/testkit";
import { privateLeaks } from "../src/confessor/privacy.ts";
import { InterpretationsOptions, interpretations } from "../src/index.ts";
import { lookup } from "./support.ts";

const names = defineMechanic(defineHead({ id: "names", package: "@test/names", summary: "Test: stands in for identity.", provides: [IdentityService] }), {
	services: { identity: { nameOf: ({ resident }) => (resident === "A02" ? "Maren" : null), display: ({ text }) => text, resolve: ({ text }) => text } },
});

// Stands in for a tribunal's tool, whose text is its `reason` (erratum J134).
const tribunal = defineMechanic(defineHead({ id: "tribunal", package: "@test/tribunal", summary: "Test: calls a tribunal.", tools: { callTribunal: { description: "Calls.", params: Type.Object({ reason: Type.String() }), for: ["script"] } } }), {
	tools: { callTribunal: { run: () => reply("called") } },
});

const NOTE_TOOLS = ["notify", "boardNote", "interpret", "callTribunal"] as const;

function game(every = 1, resident = false) {
	return defineGame({
		id: "private-notes",
		seed: 5,
		residents: 3,
		mechanics: [names(), channels(), tribunal(), interpretations({ every, noteTools: ["notify", "boardNote", "callTribunal"] })],
		grants: resident ? { resident: NOTE_TOOLS } : { script: NOTE_TOOLS },
		scheduler: { id: "turns", options: { order: "roster" } },
		end: { ticks: 4 },
	});
}

// A round of the Confessor in which A02 says something to A01 that is labelled `labels`.
const round = (number: number, labels: readonly string[]) => ({
	round: number,
	classifier: "test/classifier",
	statements: [{ ref: 1, agent: "A02", source: "dm", to: ["A01"], text: "I sent you the points." }],
	items: [{ ref: 1, labels }],
});

async function director(test: TestKernel, tool: string, params: unknown): Promise<string> {
	const outcome = await test.kernel.submit({ actor: "script", as: tool, params });
	if (outcome.ok) return outcome.reply;
	return outcome.detail === undefined ? outcome.code : `${outcome.code}: ${outcome.detail}`;
}

const refused = (test: TestKernel): readonly unknown[] => test.kernel.log.all().filter((event) => event.type === "tool_refused").map((event) => Value.Parse(Type.Object({ as: Type.String(), stage: Type.String(), code: Type.String() }), event.payload)).map(({ as, stage, code }) => ({ as, stage, code }));

const BLOCKED = "PRIVATE_BLOCKED: the text passes on what A02 privately thinks; use a private read only in a note to that resident";

describe("the check of a private thought in a Director's note", () => {
	it("refuses a note that passes on a lie the Confessor labelled, at stage rule, in the old words", async () => {
		const test = testKernel(game());
		expect(await director(test, "interpret", round(1, ["promise", "lie"]))).toBe("recorded");
		expect(await director(test, "notify", { agent: "A01", text: "Maren lied to you about the points." })).toBe(BLOCKED);
		expect(await director(test, "boardNote", { text: "A02 is bluffing." })).toBe(BLOCKED);
		expect(await director(test, "callTribunal", { reason: "A02 thinks nobody checks." })).toBe(BLOCKED);
		expect(refused(test)).toEqual(["notify", "boardNote", "callTribunal"].map((as) => ({ as, stage: "rule", code: "PRIVATE_BLOCKED" })));
	});

	it("lets a note through that leaks nothing: another resident, another sentence, the resident itself", async () => {
		const test = testKernel(game());
		await director(test, "interpret", round(1, ["lie"]));
		expect(await director(test, "notify", { agent: "A01", text: "A03 lied to you about the points." })).toBe("delivered to A01 as #1");
		expect(await director(test, "notify", { agent: "A03", text: "Ask A02 about the points. Some say it was a lie." })).toBe("delivered to A03 as #2");
		expect(await director(test, "notify", { agent: "A02", text: "Maren, they say you lied." })).toBe("delivered to A02 as #3");
		expect(await director(test, "boardNote", { text: "A02 promised the points." })).toBe("posted as #4");
		expect(refused(test)).toEqual([]);
	});

	it("lets every note through without labels: before the first round, and after a round with no lie", async () => {
		const test = testKernel(game());
		expect(await director(test, "boardNote", { text: "A02 is lying." })).toBe("posted as #1");
		await director(test, "interpret", round(1, ["promise", "threat"]));
		expect(await director(test, "notify", { agent: "A01", text: "A02 thinks you lied." })).toBe("delivered to A01 as #2");
	});

	it("reads the labels since the gamemaker's last look: one round, or `every` rounds", async () => {
		const each = testKernel(game());
		await director(each, "interpret", round(1, ["lie"]));
		await director(each, "interpret", round(2, ["promise"]));
		expect(await director(each, "boardNote", { text: "A02 lied." })).toBe("posted as #1");
		const third = testKernel(game(2));
		await director(third, "interpret", round(1, ["lie"]));
		await director(third, "interpret", round(2, ["promise"]));
		expect(await director(third, "boardNote", { text: "A02 lied." })).toBe(BLOCKED);
		await director(third, "interpret", round(3, []));
		expect(await director(third, "boardNote", { text: "A02 lied." })).toBe("posted as #1");
	});

	it("carries the old refusal text and the old check", () => {
		expect(Value.Default(InterpretationsOptions, {})).toMatchObject({ noteTools: ["notify", "boardNote"], every: 1, privateThoughts: lookup.render("city-directors", "gamemaker/replies/private-thoughts", { who: "{{who}}" }, ["who"]) });
		const labels = new Map([["A02", new Set(["lie"])], ["A01", new Set(["hesitation"])], ["A03", new Set<string>()]]);
		expect(privateLeaks("A02 lied. A01 is afraid. A03 thinks.", "board", labels, () => undefined)).toEqual(["A01", "A02"]);
		expect(privateLeaks("A02 lied. A01 is afraid.", "A02", labels, () => undefined)).toEqual(["A01"]);
	});

	it("replays equal, and resumes equal from every boundary", async () => {
		const plan = (activation: Activation) => {
			if (activation.actor !== "resident:A01") return [];
			const note = { tool: "notify", params: { agent: "A03", text: `A02 lied at round ${String(activation.tick)}.` } };
			return [{ tool: "interpret", params: round(activation.tick + 1, activation.tick % 2 === 0 ? ["lie"] : []) }, note];
		};
		const drivers = () => ({ [RESIDENT_KIND]: scriptedDriver(plan) });
		expect(await checkReplay(game(1, true), drivers)).toEqual([]);
		expect(await checkResumeEveryBoundary(game(1, true), drivers, { boundaries: [0, 1, 2, 3] })).toEqual([]);
	});
});
