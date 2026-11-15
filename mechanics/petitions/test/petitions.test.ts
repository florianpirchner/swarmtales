// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The carried cases of the old `test/mechanics/petitions/petitions.test.ts` on the new kernel: the real `channels`
 * and `ledger`, and a stand-in for the script that opens petitions through the service `petitions`. The expiry is a
 * staged call of `resolvePetition` as the actor `script`, at a tick start and at the end of the run.
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { SwtError, type Envelope, type GameData } from "@swarmtales/contracts";
import { channels } from "@swarmtales/mechanic-channels";
import { ledger } from "@swarmtales/mechanic-ledger";
import { defineGame, defineHead, defineMechanic, reply } from "@swarmtales/sdk";
import { checkReplay, checkResumeEveryBoundary, fakeDriver, idleDriver, play, scriptedDriver, testKernel, type StandingDrivers } from "@swarmtales/testkit";
import { petitions, PetitionsService, Threshold } from "../src/index.ts";

const OpenParams = Type.Object(
	{
		id: Type.String({ description: "The id" }),
		threshold: Threshold,
		deadlineMinute: Type.Integer({ description: "The deadline" }),
		visibility: Type.Union([Type.Literal("public"), Type.Literal("secret")], { description: "The visibility" }),
		against: Type.Optional(Type.Array(Type.String({ description: "A resident id" }), { description: "The targets" })),
	},
	{ description: "A petition to open" },
);

/** The script's side: opens a petition through the service, as a resident's tool for the test. */
const opener = defineMechanic(
	defineHead({ id: "opener", package: "@test/opener", summary: "Test: opens petitions.", requires: [PetitionsService], tools: { openPetition: { description: "Test: opens a petition.", params: OpenParams, for: ["resident"] } } }),
	{ tools: { openPetition: { sample: (ctx) => (ctx.tick === 0 ? { id: `P-${ctx.resident ?? ""}`, threshold: { count: 2 }, deadlineMinute: 5, visibility: "public" } : undefined), run: (params, ctx) => reply(JSON.stringify(ctx.call(PetitionsService, "open", { ...params, text: `Text of ${params.id}.` }))) } } },
);

const game = (ticks = 6) => defineGame({ id: "petitions-unit", seed: 7, residents: 4, mechanics: [ledger({ startPoints: 10 }), channels(), petitions(), opener()], end: { ticks } });
const payloads = (events: readonly Envelope[], type: string): readonly unknown[] => events.filter((event) => event.type === type).map((event) => event.payload);
const posts = (events: readonly Envelope[]): readonly string[] => events.filter((event) => event.type === "board_post").map((event) => JSON.stringify(event.payload));
const textOf = (outcome: { readonly ok: boolean; readonly reply?: string; readonly code?: string; readonly detail?: string }): string => (outcome.ok ? (outcome.reply ?? "") : `${outcome.code ?? ""}: ${outcome.detail ?? ""}`);

describe("the expiry of a petition is a staged call of the script", () => {
	it("resolves an expired petition at its deadline as a call of `script`, and refuses signatures from then on", async () => {
		const test = testKernel(game());
		await test.call("A01", "openPetition", { id: "P1", threshold: { count: 3 }, deadlineMinute: 2, visibility: "public" });
		await test.call("A01", "signPetition", { petitionId: "P1" });
		await test.playTicks(idleDriver, 2);
		expect(payloads(test.kernel.log.all(), "petition_resolved")).toEqual([]);
		await test.playTicks(idleDriver, 1);
		const log = test.kernel.log.all();
		expect(payloads(log, "petition_resolved")).toEqual([{ petition: "P1", outcome: "failed", signatures: 1, signers: ["A01"] }]);
		const staged = log.filter((event) => event.actor === "script").map((event) => [event.type, event.payload]);
		expect(staged.slice(0, 2)).toEqual([["tool_called", { as: "resolvePetition", params: { petition: "P1", outcome: "failed" } }], ["petition_resolved", { petition: "P1", outcome: "failed", signatures: 1, signers: ["A01"] }]]);
		expect(posts(log).at(-1)).toContain("Petition P1 failed with 1 of 3 signatures. Signed by A01.");
		expect(textOf(await test.call("A02", "signPetition", { petitionId: "P1" }))).toBe("PETITION_CLOSED: P1");
	});

	// The kernel runs no staged call of a `runEnded` hook: `#finish` in `packages/kernel/src/lifecycle.ts` does not settle
	// after each hook as `#hooks` does (one kernel line, above the gate of 1472; erratum of M5-25). Turn `it.fails` into `it` with it.
	it.fails("fails every petition still open when the run ends, before `run_ended`", async () => {
		const opening = scriptedDriver((activation) => (activation.tick === 0 && activation.actor === "resident:A01" ? [{ tool: "openPetition", params: { id: "P1", threshold: { count: 3 }, deadlineMinute: 50, visibility: "public" } }] : []));
		const { events, kernel } = await play(game(2), { drivers: { resident: opening } });
		expect(payloads(events, "petition_resolved")).toEqual([{ petition: "P1", outcome: "failed", signatures: 0, signers: [] }]);
		expect(events.findIndex((event) => event.type === "petition_resolved")).toBeLessThan(events.findIndex((event) => event.type === "run_ended"));
		expect(kernel.fact("petitions.open")).toEqual([]);
	});

	it("refuses a game whose grant `script` lacks `resolvePetition` (SWT-G015; the old run left the petition open)", () => {
		const data: GameData = { schema: 1, id: "petitions-unit", residents: 4, mechanics: [{ use: "ledger" }, { use: "channels" }, { use: "petitions" }], grants: { script: [] }, end: { ticks: 2 } };
		const thrown = ((): unknown => {
			try {
				testKernel(data, { installed: { ledger, channels, petitions } });
				return undefined;
			} catch (error) {
				return error;
			}
		})();
		expect(thrown instanceof SwtError ? thrown.issues.map((issue) => issue.code) : thrown).toEqual(["SWT-G015"]);
	});
});

describe("petitions", () => {
	it("opens a petition, tells the city and refuses a taken id", async () => {
		const test = testKernel(game());
		expect(textOf(await test.call("A01", "openPetition", { id: "P1", threshold: { count: 2 }, deadlineMinute: 4, visibility: "public", against: ["A04"] }))).toBe('{"ok":true}');
		expect(payloads(test.kernel.log.all(), "petition_opened")).toEqual([{ petition: "P1", text: "Text of P1.", threshold: 2, deadlineMinute: 4, visibility: "public", against: ["A04"] }]);
		expect(textOf(await test.call("A01", "readBoard", {}))).toBe("#1 CITY: Petition P1 is open: Text of P1. It passes with 2 signatures before minute 4. Signatures are public.");
		expect(textOf(await test.call("A01", "openPetition", { id: "P1", threshold: { count: 1 }, deadlineMinute: 4, visibility: "public" }))).toBe('{"ok":false,"code":"DUPLICATE_PETITION","detail":"P1"}');
		expect(payloads(test.kernel.log.all(), "petition_opened")).toHaveLength(1);
	});

	it("rounds a fraction up and says singular for one signature", async () => {
		const test = testKernel(game());
		await test.call("A01", "openPetition", { id: "P1", threshold: { fraction: 0.3 }, deadlineMinute: 4, visibility: "secret" });
		await test.call("A01", "openPetition", { id: "P2", threshold: { count: 1 }, deadlineMinute: 4, visibility: "secret" });
		expect(payloads(test.kernel.log.all(), "petition_opened")).toMatchObject([{ threshold: 2 }, { threshold: 1 }]);
		expect(textOf(await test.call("A02", "readBoard", {}))).toBe(
			"#1 CITY: Petition P1 is open: Text of P1. It passes with 2 signatures before minute 4. Signatures are secret, only the count is shown.\n" +
				"#2 CITY: Petition P2 is open: Text of P2. It passes with 1 signature before minute 4. Signatures are secret, only the count is shown.",
		);
	});

	it("signs once, shows the count and passes at the threshold", async () => {
		const test = testKernel(game());
		const say = async (who: string, tool: string, params: unknown) => textOf(await test.call(who, tool, params));
		await test.call("A01", "openPetition", { id: "P1", threshold: { count: 2 }, deadlineMinute: 4, visibility: "public" });
		expect(await say("A01", "listPetitions", {})).toBe("P1 (open): Text of P1.\n  signatures: 0 of 2 needed · deadline: before minute 4\n  signed by: -\n  you have not signed");
		expect(await say("A01", "signPetition", { petitionId: "P1" })).toBe("signed · P1 (open): Text of P1.\n  signatures: 1 of 2 needed · deadline: before minute 4\n  signed by: A01\n  you signed");
		expect(await say("A01", "signPetition", { petitionId: "P1" })).toBe("ALREADY_SIGNED: P1");
		expect(await say("A01", "signPetition", { petitionId: "P9" })).toBe("UNKNOWN_PETITION: P9");
		expect(await say("A02", "signPetition", { petitionId: "P1" })).toContain("P1 (passed)");
		expect(await say("A03", "signPetition", { petitionId: "P1" })).toBe("PETITION_CLOSED: P1");
		const log = test.kernel.log.all();
		expect(payloads(log, "petition_signed")).toEqual([
			{ petition: "P1", agent: "A01", signatures: 1 },
			{ petition: "P1", agent: "A02", signatures: 2 },
		]);
		expect(payloads(log, "petition_resolved")).toEqual([{ petition: "P1", outcome: "passed", signatures: 2, signers: ["A01", "A02"] }]);
		expect((await say("A04", "readBoard", {})).split("\n").at(-1)).toBe("#2 CITY: Petition P1 passed with 2 of 2 signatures. Signed by A01, A02.");
	});

	it("keeps the signers of a secret petition out of the replies and the board", async () => {
		const test = testKernel(game());
		await test.call("A01", "openPetition", { id: "P1", threshold: { count: 1 }, deadlineMinute: 4, visibility: "secret" });
		expect(textOf(await test.call("A01", "signPetition", { petitionId: "P1" }))).toContain("signatures are secret");
		expect(textOf(await test.call("A02", "readBoard", {})).split("\n").at(-1)).toBe("#2 CITY: Petition P1 passed with 1 of 1 signatures.");
	});

	it("says so when there is no petition, and refuses a resolution that does not match", async () => {
		const test = testKernel(game());
		expect(textOf(await test.call("A01", "listPetitions", {}))).toBe("no petitions");
		const refused = await test.kernel.submit({ actor: "script", as: "resolvePetition", params: { petition: "P1", outcome: "failed" } });
		expect(refused).toEqual({ ok: false, code: "UNKNOWN_PETITION", detail: "P1" });
	});
});

describe("replay and resume", () => {
	const signing: StandingDrivers = () => ({
		resident: scriptedDriver((activation) => {
			if (activation.tick === 0 && activation.actor === "resident:A01") return [{ tool: "openPetition", params: { id: "P1", threshold: { count: 3 }, deadlineMinute: 3, visibility: "public" } }, { tool: "openPetition", params: { id: "P2", threshold: { count: 9 }, deadlineMinute: 50, visibility: "secret" } }];
			return activation.tick === 1 ? [{ tool: "signPetition", params: { petitionId: "P1" } }] : [];
		}),
	});

	it("replays and resumes from every boundary, the staged resolutions included", async () => {
		expect(await checkReplay(game(5), signing)).toEqual([]);
		expect(await checkResumeEveryBoundary(game(5), signing)).toEqual([]);
	});

	it("signs open petitions in a fake run with the samples", async () => {
		const drivers: StandingDrivers = (kernel) => ({ resident: fakeDriver(kernel, 7) });
		const opened = defineGame({ id: "petitions-fake", seed: 7, residents: 4, mechanics: [ledger({ startPoints: 10 }), channels(), petitions(), opener()], end: { ticks: 8 } });
		expect(await checkReplay(opened, drivers, { seed: 7 })).toEqual([]);
	});
});
