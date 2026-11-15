// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `channels` with stand-in providers of `identity` and `allowance`: names in every reply, refusal detail and input
 * line of a resident and as a target, and the marks left in the replies of the three message tools. Ported from the
 * cases of the old `channels.test.ts` that used the names and marks stand-ins. Without providers the ids stay and no
 * reply carries a marks part (`channels.test.ts`, `dms.test.ts`).
 */
import { describe, expect, it } from "vitest";
import { AllowanceService, IdentityService } from "@swarmtales/mechanic-contracts";
import { defineGame, defineHead, defineMechanic } from "@swarmtales/sdk";
import { scriptedDriver, testKernel, type TestKernel } from "@swarmtales/testkit";
import { channels } from "../src/index.ts";
import { say } from "./support.ts";

const NAMES: Readonly<Record<string, string>> = { A01: "Mira", A02: "Moss", A03: "Wren" };

/** Stands in for `names`: every id in a text is shown by its name, a name resolves to its id. */
const identity = defineMechanic(defineHead({ id: "names", package: "@test/names", summary: "Test: stands in for the provider of identity.", provides: [IdentityService] }), {
	services: {
		identity: {
			nameOf: ({ resident }) => NAMES[resident] ?? null,
			display: ({ text }) => text.replace(/\bA0\d\b/g, (id) => NAMES[id] ?? id),
			resolve: ({ text }) => Object.keys(NAMES).find((id) => NAMES[id] === text) ?? text,
		},
	},
});

/** Stands in for `marks`: 8 marks a window for A01, none apply to the others; a message costs 1, a board post 2. */
const allowance = defineMechanic(defineHead({ id: "marks", package: "@test/marks", summary: "Test: stands in for the provider of allowance.", provides: [AllowanceService] }), {
	services: {
		allowance: {
			left: ({ resident }) => (resident === "A01" ? { remaining: 7, budget: 8 } : null),
			priceOf: ({ resident, channel }) => (resident !== "A01" ? null : channel === "board" ? 2 : 1),
		},
	},
});

function named(): TestKernel {
	return testKernel(defineGame({ id: "channels-providers", seed: 7, residents: 3, mechanics: [channels(), identity(), allowance()], scheduler: { id: "turns", options: { order: "roster" } }, end: { ticks: 4 } }));
}

describe("channels with the providers of identity and allowance", () => {
	it("takes a name for the target and shows names in replies, details and the board", async () => {
		const test = named();
		expect(await say(test, "A02", "sendDM", { target: "Mira", message: "hi" })).toBe("sent · DM #1 to Mira · the city confirms delivery when it reaches them");
		expect(await say(test, "A02", "sendDM", { target: "Moss", message: "me" })).toBe("SELF_DM");
		expect(await say(test, "A02", "sendDM", { target: "A99", message: "who" })).toBe("UNKNOWN_AGENT: A99");
		expect(await say(test, "A03", "postBoard", { message: "A01 has a plan" })).toBe("posted · #2");
		expect(await say(test, "A02", "readBoard", {})).toBe("#2 Wren: Mira has a plan");
		await say(test, "A03", "createGroup", { name: "Lanterns" });
		expect(await say(test, "A03", "addGroupMember", { groupId: "G1", agent: "Moss" })).toContain("members: Wren, Moss");
	});

	it("shows names in the input lines, the ids stay in the events", async () => {
		const test = named();
		await say(test, "A02", "sendDM", { target: "Mira", message: "hi A03" });
		const seen: string[] = [];
		await test.playTicks(
			scriptedDriver((activation) => {
				seen.push(...activation.inputs.map((line) => line.text));
				return [];
			}),
			2,
		);
		expect(seen).toEqual(["[DM #1 from Moss] hi Wren", '[CITY] DM #1 delivered to Mira at minute 0: "hi Wren"']);
		expect(test.kernel.log.all().find((event) => event.type === "dm_sent")?.payload).toEqual({ from: "A02", to: "A01", text: "hi A03", number: 1 });
	});

	it("adds the marks left once the message is paid, and nothing where marks do not apply", async () => {
		const test = named();
		expect(await say(test, "A01", "postBoard", { message: "one" })).toBe("posted · #1 · marks 5/8 left");
		expect(await say(test, "A01", "sendDM", { target: "A02", message: "two" })).toBe("sent · DM #2 to Moss · the city confirms delivery when it reaches them · marks 6/8 left");
		await say(test, "A01", "createGroup", { name: "Lanterns" });
		expect(await say(test, "A01", "postGroup", { groupId: "G1", message: "three" })).toBe("posted · G1 #3 · marks 6/8 left");
		expect(await say(test, "A02", "postBoard", { message: "four" })).toBe("posted · #4");
	});
});
