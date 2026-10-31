/**
 * Conformance of channels (testkit checks) and its snapshot: a round trip through JSON, and the
 * resume of the Act I checkpoint of the 6-agent base from its version-0 slice.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { convertLegacySnapshot } from "@swarmtales/chronicle";
import { createHost, defineCoreStory } from "@swarmtales/kernel";
import { channels } from "@swarmtales/mechanic-channels";
import { checkDeterminism, checkOptionsDocumented, checkSnapshotRoundTrip, checkSourceRules, scriptedAgent, standInsFor, type Plan } from "@swarmtales/testkit";
import { city, cityStory, say } from "./city.ts";
import { t2Prompts, textOf } from "./harness.ts";
import { driverStandIn, exileStandIn } from "./harness.ts";
import { ledgerStandIn, marksStandIn, namesStandIn, receiptsStandIn } from "./stand-ins.ts";

const ROOT = resolve(import.meta.dirname, "../../..");
const SRC = join(ROOT, "mechanics", "channels", "src");

/** Residents talk: a board post each minute, a DM to the next resident, a group with a deposit. */
const plan: Plan = (turn) => {
	const next = `A0${String((Number(turn.resident.slice(1)) % 4) + 1)}`;
	return [
		{ tool: "postBoard", params: { message: `${turn.resident} at ${String(turn.minute)}` } },
		{ tool: "sendDM", params: { target: next, message: `to ${next}` } },
		{ tool: "readBoard", params: {} },
		...(turn.minute === 1 && turn.resident === "A01" ? [{ tool: "createGroup", params: { name: "Circle" } }, { tool: "addGroupMember", params: { groupId: "G1", agent: "A02" } }] : []),
		...(turn.minute === 2 && turn.resident === "A02" ? [{ tool: "depositGroup", params: { groupId: "G1", amount: 3 } }] : []),
	];
};

describe("conformance", () => {
	const options = { story: cityStory({ minutes: 5 }), prompts: t2Prompts() };

	it("documents every option and keeps to the source rules", () => {
		expect(checkOptionsDocumented(channels)).toEqual([]);
		const files = readdirSync(SRC).map((name) => ({ path: `mechanics/channels/src/${name}`, text: readFileSync(join(SRC, name), "utf8") }));
		expect(files.length).toBeGreaterThan(5);
		expect(checkSourceRules(files)).toEqual([]);
	});

	it("plays the same events from the same seed (stand-in providers)", async () => {
		expect(await checkDeterminism(options, () => scriptedAgent(plan))).toEqual([]);
	});

	it("resumes from a snapshot cut mid-run through JSON (stand-in providers)", async () => {
		expect(await checkSnapshotRoundTrip(options, () => scriptedAgent(plan), 3)).toEqual([]);
	});
});

describe("the legacy checkpoint", () => {
	const path = join(ROOT, "examples", "cityofkeys-act1-06a-04", "snapshot-L7.json");
	const converted = convertLegacySnapshot(JSON.parse(readFileSync(path, "utf8")), {}, path);
	const old = JSON.stringify(converted.host.mechanics.channels?.data);
	const mine = ["channels", "ledger", "marks", "names", "receipts", "exile"];

	function resumed() {
		const story = defineCoreStory({
			id: "nexus",
			seed: 7,
			minutes: 80,
			residents: converted.host.residents.ids,
			mechanics: [
				channels.with(),
				ledgerStandIn(0).with(),
				marksStandIn().with(),
				namesStandIn(new Map<string, string>()).with(),
				receiptsStandIn().with(),
				exileStandIn.with(),
				driverStandIn.with(),
				...standInsFor(converted.host, [...mine, "driver"]),
			],
			grants: { resident: ["readBoard", "postBoard", "sendDM"], script: ["drive"] },
		});
		return createHost({ story, prompts: t2Prompts(), resume: { snapshot: converted.host, events: converted.events } });
	}

	it("migrates the version-0 slice and writes it back as the same board, groups and mailboxes", () => {
		expect(old).toBeDefined();
		const host = resumed();
		const slice = host.snapshot().mechanics.channels;
		expect(slice?.version).toBe(1);
		const data = JSON.stringify(slice?.data);
		expect(data).toContain('"board"');
		const again = resumed().snapshot().mechanics.channels;
		expect(JSON.stringify(again?.data)).toBe(data);
	});

	it("goes on numbering where the old run stopped (legacy resume)", async () => {
		const host = resumed();
		const board = host.facts()["channels.messages"];
		expect(typeof board).toBe("number");
		const reply = textOf(await host.call("resident:A01", "postBoard", { message: "after the checkpoint" }));
		expect(reply).toMatch(new RegExp(`^posted · #${String(Number(board) + 1)}\\b`));
	});
});

describe("snapshot of a live city", () => {
	it("keeps board, groups and mailboxes through JSON", async () => {
		const host = city();
		await say(host, "A01", "postBoard", { message: "one" });
		await say(host, "A01", "createGroup", { name: "Circle" });
		await say(host, "A01", "sendDM", { target: "A02", message: "hello" });
		const text = JSON.stringify(host.snapshot());
		const slice: unknown = JSON.parse(text);
		expect(JSON.stringify(slice)).toBe(text);
		expect(text).toContain("hello");
	});
});
