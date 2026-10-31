/**
 * The petitions mechanic on the new host. Channels is the real one; the ledger, marks, names and
 * receipts it needs are stand-ins (test/mechanics/channels/stand-ins.ts); a driver stands in for
 * the script that opens petitions through `PetitionsApi`.
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { describe, expect, it } from "vitest";
import type { Host } from "@swarmtales/contracts";
import { convertLegacySnapshot } from "@swarmtales/chronicle";
import { createHost, defineCoreStory, defineMechanic, reply } from "@swarmtales/kernel";
import { channels } from "@swarmtales/mechanic-channels";
import { PetitionsApi } from "@swarmtales/mechanic-shared";
import { petitions } from "@swarmtales/mechanic-petitions";
import { checkDeterminism, checkOptionsDocumented, checkSnapshotRoundTrip, idleAgent, scriptedAgent, standInsFor } from "@swarmtales/testkit";
import { exileStandIn, hostFor, payloads, t2Prompts, textOf } from "../channels/harness.ts";
import { ledgerStandIn, marksStandIn, namesStandIn, receiptsStandIn } from "../channels/stand-ins.ts";

const Threshold = Type.Union([Type.Object({ count: Type.Integer() }), Type.Object({ fraction: Type.Number() })]);

/** The script's side: opens a petition through the API. */
const scriptStandIn = defineMechanic(
	{ id: "script", summary: "Stand-in script: opens petitions.", options: Type.Object({}), state: () => undefined, events: {}, requires: [PetitionsApi], prompts: { "tools/signPetition": [] } },
	(kit) => ({
		tools: [
			kit.tool({
				name: "openPetition",
				description: "tools/signPetition",
				parameters: Type.Object({ id: Type.String(), threshold: Threshold, deadlineMinute: Type.Integer(), visibility: Type.Union([Type.Literal("public"), Type.Literal("secret")]), against: Type.Optional(Type.Array(Type.String())) }),
				execute: (params, ctx) => {
					const { against, ...rest } = params;
					return reply(JSON.stringify(ctx.call(PetitionsApi, "open", { ...rest, text: `Text of ${params.id}.`, ...(against === undefined ? {} : { against }) })));
				},
			}),
		],
	}),
);

function story(minutes = 6) {
	return defineCoreStory({
		id: "t2-petitions",
		seed: 7,
		minutes,
		residents: 4,
		mechanics: [channels.with(), petitions.with(), scriptStandIn.with(), ledgerStandIn(10).with(), marksStandIn().with(), namesStandIn(new Map<string, string>()).with(), receiptsStandIn().with()],
		grants: { resident: ["signPetition", "listPetitions", "readBoard"], script: ["openPetition"] },
	});
}

function city(minutes = 6): Host {
	return hostFor({ story: story(minutes) });
}

async function open(host: Host, params: unknown): Promise<string> {
	return textOf(await host.call("script", "openPetition", params));
}

async function say(host: Host, who: string, tool: string, params: unknown): Promise<string> {
	return textOf(await host.call(`resident:${who}`, tool, params));
}

describe("petitions", () => {
	it("opens a petition, tells the city and refuses a taken id", async () => {
		const host = city();
		expect(await open(host, { id: "P1", threshold: { count: 2 }, deadlineMinute: 4, visibility: "public", against: ["A04"] })).toBe('{"ok":true}');
		expect(payloads(host, "petition_opened")).toEqual([{ petition: "P1", text: "Text of P1.", threshold: 2, deadlineMinute: 4, visibility: "public", against: ["A04"] }]);
		expect(await say(host, "A01", "readBoard", {})).toBe("#1 CITY: Petition P1 is open: Text of P1. It passes with 2 signatures before minute 4. Signatures are public.");
		expect(await open(host, { id: "P1", threshold: { count: 1 }, deadlineMinute: 4, visibility: "public" })).toBe('{"ok":false,"code":"DUPLICATE_PETITION","detail":"P1"}');
		expect(payloads(host, "petition_opened")).toHaveLength(1);
	});

	it("rounds a fraction up and says singular for one signature", async () => {
		const host = city();
		await open(host, { id: "P1", threshold: { fraction: 0.3 }, deadlineMinute: 4, visibility: "secret" });
		await open(host, { id: "P2", threshold: { count: 1 }, deadlineMinute: 4, visibility: "secret" });
		expect(payloads(host, "petition_opened").map((event) => Parse(Type.Object({ threshold: Type.Integer() }), event).threshold)).toEqual([2, 1]);
		expect(await say(host, "A02", "readBoard", {})).toBe(
			"#1 CITY: Petition P1 is open: Text of P1. It passes with 2 signatures before minute 4. Signatures are secret, only the count is shown.\n" +
				"#2 CITY: Petition P2 is open: Text of P2. It passes with 1 signature before minute 4. Signatures are secret, only the count is shown.",
		);
	});

	it("signs once, shows the count and passes at the threshold", async () => {
		const host = city();
		await open(host, { id: "P1", threshold: { count: 2 }, deadlineMinute: 4, visibility: "public" });
		expect(await say(host, "A01", "listPetitions", {})).toBe("P1 (open): Text of P1.\n  signatures: 0 of 2 needed · deadline: before minute 4\n  signed by: -\n  you have not signed");
		expect(await say(host, "A01", "signPetition", { petitionId: "P1" })).toBe("signed · P1 (open): Text of P1.\n  signatures: 1 of 2 needed · deadline: before minute 4\n  signed by: A01\n  you signed");
		expect(await say(host, "A01", "signPetition", { petitionId: "P1" })).toBe("ALREADY_SIGNED: P1");
		expect(await say(host, "A01", "signPetition", { petitionId: "P9" })).toBe("UNKNOWN_PETITION: P9");
		expect(await say(host, "A02", "signPetition", { petitionId: "P1" })).toContain("P1 (passed)");
		expect(await say(host, "A03", "signPetition", { petitionId: "P1" })).toBe("PETITION_CLOSED: P1");
		expect(payloads(host, "petition_signed")).toEqual([
			{ petition: "P1", agent: "A01", signatures: 1 },
			{ petition: "P1", agent: "A02", signatures: 2 },
		]);
		expect(payloads(host, "petition_resolved")).toEqual([{ petition: "P1", outcome: "passed", signatures: 2, signers: ["A01", "A02"] }]);
		const board = await say(host, "A04", "readBoard", {});
		expect(board.split("\n").at(-1)).toBe("#2 CITY: Petition P1 passed with 2 of 2 signatures. Signed by A01, A02.");
	});

	it("keeps the signers of a secret petition out of the replies and the board", async () => {
		const host = city();
		await open(host, { id: "P1", threshold: { count: 1 }, deadlineMinute: 4, visibility: "secret" });
		expect(await say(host, "A01", "signPetition", { petitionId: "P1" })).toContain("signatures are secret");
		const board = await say(host, "A02", "readBoard", {});
		expect(board.split("\n").at(-1)).toBe("#2 CITY: Petition P1 passed with 1 of 1 signatures.");
	});

	it("fails an open petition when its deadline comes, and refuses signatures from then on", async () => {
		const host = city();
		await open(host, { id: "P1", threshold: { count: 3 }, deadlineMinute: 2, visibility: "public" });
		await say(host, "A01", "signPetition", { petitionId: "P1" });
		await host.playMinute(idleAgent);
		await host.playMinute(idleAgent);
		expect(payloads(host, "petition_resolved")).toEqual([]);
		await host.playMinute(idleAgent);
		expect(payloads(host, "petition_resolved")).toEqual([{ petition: "P1", outcome: "failed", signatures: 1, signers: ["A01"] }]);
		expect(await say(host, "A02", "signPetition", { petitionId: "P1" })).toBe("PETITION_CLOSED: P1");
	});

	it("fails every petition still open when the run ends", async () => {
		const host = city(2);
		await open(host, { id: "P1", threshold: { count: 3 }, deadlineMinute: 50, visibility: "public" });
		await host.run(idleAgent);
		expect(payloads(host, "petition_resolved")).toEqual([{ petition: "P1", outcome: "failed", signatures: 0, signers: [] }]);
		expect(host.facts()["petitions.open"]).toEqual([]);
	});
});

describe("conformance and snapshot", () => {
	const options = { story: story(), prompts: t2Prompts() };
	const plan = (turn: { readonly resident: string; readonly minute: number }) => (turn.minute === 1 ? [{ tool: "signPetition", params: { petitionId: "P1" } }] : []);

	it("documents its options", () => {
		expect(checkOptionsDocumented(petitions)).toEqual([]);
	});

	it("plays the same events from the same seed and resumes from a cut (stand-in providers)", async () => {
		const opened = () => {
			let done = false;
			return scriptedAgent((turn) => {
				if (done || turn.minute !== 0) return plan(turn);
				done = true;
				return [];
			});
		};
		expect(await checkDeterminism(options, opened)).toEqual([]);
		expect(await checkSnapshotRoundTrip(options, opened, 3)).toEqual([]);
	});

	it("keeps the petitions through JSON, signers and all", async () => {
		const host = city();
		await open(host, { id: "P1", threshold: { count: 3 }, deadlineMinute: 5, visibility: "public" });
		await say(host, "A03", "signPetition", { petitionId: "P1" });
		const text = JSON.stringify(host.snapshot().mechanics.petitions);
		expect(text).toContain('"signers":["A03"]');
		const again = createHost({ story: story(), prompts: t2Prompts(), resume: { snapshot: JSON.parse(text.length > 0 ? JSON.stringify(host.snapshot()) : "{}"), events: host.log.all() } });
		expect(await say(again, "A01", "listPetitions", {})).toContain("signatures: 1 of 3 needed");
	});

	it("resumes the Act I checkpoint of the 6-agent base from its version-0 slice (legacy resume)", () => {
		const path = join(resolve(import.meta.dirname, "../../.."), "examples", "cityofkeys-act1-06a-04", "snapshot-L7.json");
		const converted = convertLegacySnapshot(JSON.parse(readFileSync(path, "utf8")), {}, path);
		const mine = ["petitions", "channels", "ledger", "marks", "names", "receipts", "exile"];
		const resumed = defineCoreStory({
			id: "nexus",
			seed: 7,
			minutes: 80,
			residents: converted.host.residents.ids,
			mechanics: [channels.with(), petitions.with(), ledgerStandIn(0).with(), marksStandIn().with(), namesStandIn(new Map<string, string>()).with(), receiptsStandIn().with(), exileStandIn.with(), ...standInsFor(converted.host, mine)],
			grants: {},
		});
		const host = createHost({ story: resumed, prompts: t2Prompts(), resume: { snapshot: converted.host, events: converted.events } });
		expect(host.snapshot().mechanics.petitions).toMatchObject({ version: 1, data: [] });
		const filled = { ...converted.host, mechanics: { ...converted.host.mechanics, petitions: { version: 0, data: { petitions: [{ id: "P7", text: "Old.", threshold: 2, deadlineMinute: 30, visibility: "public", openedAt: 8, status: "open", signers: ["A02"] }] } } } };
		const old = createHost({ story: resumed, prompts: t2Prompts(), resume: { snapshot: filled, events: converted.events } });
		expect(old.snapshot().mechanics.petitions).toMatchObject({ version: 1, data: [{ id: "P7", signers: ["A02"] }] });
	});
});
