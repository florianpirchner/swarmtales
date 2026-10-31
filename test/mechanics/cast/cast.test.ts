/**
 * The cast mechanic on the new host. Channels is the real one; progression (team T3), the ledger,
 * marks, names, receipts and exile are stand-ins (test/mechanics/cast/stand-ins.ts and
 * test/mechanics/channels/stand-ins.ts); a driver stands in for the script.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { convertLegacySnapshot } from "@swarmtales/chronicle";
import { createHost, defineCoreStory, rngFor } from "@swarmtales/kernel";
import { cast } from "@swarmtales/mechanic-cast";
import { channels } from "@swarmtales/mechanic-channels";
import { checkDeterminism, checkOptionsDocumented, checkSnapshotRoundTrip, checkSourceRules, idleAgent, scriptedAgent, standInsFor } from "@swarmtales/testkit";
import { exileStandIn, payloads, t2Prompts } from "../channels/harness.ts";
import { ledgerStandIn, marksStandIn, namesStandIn, receiptsStandIn } from "../channels/stand-ins.ts";
import { castCity, castStory, drive, say } from "./city.ts";
import { castDriver, progressionStandIn } from "./stand-ins.ts";

const ROOT = resolve(import.meta.dirname, "../../..");

describe("members", () => {
	it("hides a member until it is revealed, and retires it for good", async () => {
		const host = castCity();
		expect(await drive(host, { op: "isActive", cast: "STEWARD" })).toBe("false");
		expect(await say(host, "A01", "sendDM", { target: "STEWARD", message: "hello" })).toBe("UNKNOWN_AGENT: STEWARD");
		expect(await drive(host, { op: "reveal", cast: "STEWARD" })).toBe("true");
		expect(await drive(host, { op: "reveal", cast: "STEWARD" })).toBe("false");
		expect(await drive(host, { op: "reveal", cast: "NOBODY" })).toBe("false");
		expect(await drive(host, { op: "setLevel", cast: "STEWARD", level: 11 })).toBe("null");
		expect(await drive(host, { op: "setLevel", cast: "NOBODY", level: 3 })).toBe("null");
		expect(host.facts()["cast.active"]).toEqual([{ id: "STEWARD", level: 11 }]);
		expect(await drive(host, { op: "retire", cast: "STEWARD" })).toBe("true");
		expect(await drive(host, { op: "retire", cast: "STEWARD" })).toBe("false");
		expect(await drive(host, { op: "reveal", cast: "STEWARD" })).toBe("false");
		expect(await say(host, "A01", "sendDM", { target: "STEWARD", message: "hello" })).toBe("UNKNOWN_AGENT: STEWARD");
		expect(payloads(host, "cast_revealed")).toEqual([{ cast: "STEWARD" }]);
		expect(payloads(host, "cast_level_set")).toEqual([{ cast: "STEWARD", level: 11, audit: "NPC_LEVEL_SET" }]);
		expect(payloads(host, "cast_retired")).toEqual([{ cast: "STEWARD" }]);
	});

	it("records a resident's DM with the number channels took, and says so in the old words", async () => {
		const host = castCity({ hidden: false });
		expect(await say(host, "A01", "sendDM", { target: "STEWARD", message: "  may I sit?  " })).toBe("sent · DM #1 to STEWARD · the city confirms delivery when it reaches them");
		expect(await say(host, "A01", "sendDM", { target: "STEWARD", message: "   " })).toBe("INVALID_TEXT: 1-800 characters");
		expect(payloads(host, "cast_dm")).toEqual([{ from: "A01", cast: "STEWARD", text: "may I sit?", collections: [], number: 1 }]);
		expect(payloads(host, "dm_sent")).toEqual([]);
	});
});

describe("collections", () => {
	const start = { op: "startCollection", into: "feast", cast: "STEWARD", first: 2, untilMinute: 5, distinctSenders: true };

	it("collects the first DMs of distinct senders into a window, and tells who is new", async () => {
		const host = castCity({ hidden: false });
		expect(await drive(host, start)).toBe("true");
		expect(await drive(host, start)).toBe("false");
		expect(await drive(host, { ...start, into: "other", cast: "NOBODY" })).toBe("false");
		await say(host, "A01", "sendDM", { target: "STEWARD", message: "one" });
		await say(host, "A01", "sendDM", { target: "STEWARD", message: "again" });
		await say(host, "A02", "sendDM", { target: "STEWARD", message: "two" });
		await say(host, "A03", "sendDM", { target: "STEWARD", message: "late" });
		expect(payloads(host, "collection_started")).toEqual([{ into: "feast", cast: "STEWARD", first: 2, untilMinute: 5 }]);
		expect(payloads(host, "cast_dm").map((event) => JSON.stringify(event))).toEqual([
			'{"from":"A01","cast":"STEWARD","text":"one","collections":["feast"],"number":1}',
			'{"from":"A01","cast":"STEWARD","text":"again","collections":[],"number":2}',
			'{"from":"A02","cast":"STEWARD","text":"two","collections":["feast"],"number":3}',
			'{"from":"A03","cast":"STEWARD","text":"late","collections":[],"number":4}',
		]);
		expect(host.facts()["cast.collections"]).toEqual({ feast: ["A01", "A02"] });
	});

	it("keeps repeated DMs of one sender unless senders must be distinct", async () => {
		const host = castCity({ hidden: false });
		await drive(host, { ...start, distinctSenders: false, first: 3 });
		await say(host, "A01", "sendDM", { target: "STEWARD", message: "one" });
		await say(host, "A01", "sendDM", { target: "STEWARD", message: "two" });
		expect(host.facts()["cast.collections"]).toEqual({ feast: ["A01", "A01"] });
	});

	it("stops collecting when the window ends, and shortens it only earlier and never before now", async () => {
		const host = castCity({ hidden: false });
		await drive(host, { ...start, first: 5, untilMinute: 6 });
		await drive(host, { op: "shortenCollection", into: "feast", untilMinute: 9 });
		await drive(host, { op: "shortenCollection", into: "nobody", untilMinute: 1 });
		expect(payloads(host, "collection_shortened")).toEqual([]);
		await host.playMinute(idleAgent);
		await host.playMinute(idleAgent);
		await drive(host, { op: "shortenCollection", into: "feast", untilMinute: 0 });
		expect(payloads(host, "collection_shortened")).toEqual([{ into: "feast", untilMinute: 2 }]);
		await say(host, "A01", "sendDM", { target: "STEWARD", message: "too late" });
		expect(host.facts()["cast.collections"]).toEqual({ feast: [] });
	});

	it("ends a window some minutes after the first solve of a level (afterSolve, progression stand-in)", async () => {
		const host = castCity({ hidden: false, solves: new Map([[10, 4]]) });
		await drive(host, { ...start, first: 5, untilMinute: 20, afterSolve: { level: 10, minutes: 3 } });
		for (let minute = 0; minute < 5; minute++) await host.playMinute(idleAgent);
		expect(payloads(host, "collection_shortened")).toEqual([]);
		await host.playMinute(idleAgent);
		expect(payloads(host, "collection_shortened")).toEqual([{ into: "feast", untilMinute: 7 }]);
		await host.playMinute(idleAgent);
		expect(payloads(host, "collection_shortened")).toHaveLength(1);
	});

	it("publishes a collection verbatim as the cast member, numbered, with an optional header", async () => {
		const host = castCity({ hidden: false });
		await drive(host, { ...start, first: 5, untilMinute: 9 });
		await say(host, "A02", "sendDM", { target: "STEWARD", message: "second guest" });
		await host.playMinute(idleAgent);
		await say(host, "A01", "sendDM", { target: "STEWARD", message: "first guest" });
		expect(await drive(host, { op: "revealCollection", into: "feast", header: "The table:" })).toBe('{"ok":true}');
		expect(await say(host, "A04", "readBoard", {})).toBe("#3 STEWARD: The table:\n1. A02 (minute 0): second guest\n2. A01 (minute 1): first guest");
		expect(payloads(host, "collection_revealed")).toEqual([{ into: "feast", cast: "STEWARD", entries: 2, postSeq: 3, audit: "DIRECTOR_PRIVACY_BREACH" }]);
		expect(payloads(host, "board_post")).toEqual([{ postSeq: 3, author: "STEWARD", text: "The table:\n1. A02 (minute 0): second guest\n2. A01 (minute 1): first guest", kind: "city" }]);
		expect(await drive(host, { op: "revealCollection", into: "nobody" })).toBe('{"ok":false,"code":"UNKNOWN_COLLECTION","detail":"nobody"}');
	});

	it("publishes an empty collection as no messages", async () => {
		const host = castCity({ hidden: false });
		await drive(host, start);
		await drive(host, { op: "revealCollection", into: "feast" });
		expect(await say(host, "A04", "readBoard", {})).toBe("#1 STEWARD: (no messages)");
	});

	it("draws a lottery among distinct senders from the old stream, and none from an empty window", async () => {
		const host = castCity({ hidden: false });
		await drive(host, { ...start, first: 5, distinctSenders: false });
		expect(await drive(host, { op: "drawLottery", into: "feast", salt: "a" })).toBe("null");
		for (const who of ["A03", "A01", "A03", "A02"]) await say(host, who, "sendDM", { target: "STEWARD", message: `from ${who}` });
		const winner = rngFor(7, "lottery", "feast", "a", 0).pick(["A01", "A02", "A03"]);
		expect(await drive(host, { op: "drawLottery", into: "feast", salt: "a" })).toBe(JSON.stringify(winner));
		expect(payloads(host, "lottery_drawn")).toEqual([{ into: "feast", candidates: ["A01", "A02", "A03"], winner }]);
		expect(await drive(host, { op: "drawLottery", into: "nobody", salt: "a" })).toBe("null");
	});
});

describe("escrow", () => {
	it("funds the account from the system account at the start of the run (ledger stand-in)", () => {
		const host = castCity({ escrow: 10 });
		expect(payloads(host, "ledger_entry")[0]).toEqual({ txId: "TX1", debit: "SYSTEM_MINT_BURN", credit: "ESCROW:STEWARD", amount: 10, reason: "escrow STEWARD" });
		expect(castCity({ escrow: 0 }).log.all().filter((event) => event.type === "ledger_entry")).toEqual([]);
	});

	it("pays a resident and tells them with the receipt (receipts stand-in), or refuses in the old words", async () => {
		const host = castCity({ escrow: 10 });
		expect(await drive(host, { op: "escrow", cast: "NOBODY", to: "A01", amount: 1 })).toBe('{"ok":false,"code":"UNKNOWN_CAST","detail":"NOBODY"}');
		expect(await drive(host, { op: "escrow", cast: "STEWARD", to: "A99", amount: 1 })).toBe('{"ok":false,"code":"UNKNOWN_AGENT","detail":"A99"}');
		expect(await drive(host, { op: "escrow", cast: "STEWARD", to: "A01", amount: 11 })).toBe('{"ok":false,"code":"INSUFFICIENT_ESCROW","detail":"10 left"}');
		expect(await drive(host, { op: "escrow", cast: "STEWARD", to: "A01", amount: 1.5 })).toBe('{"ok":false,"code":"INSUFFICIENT_ESCROW","detail":"10 left"}');
		expect(await drive(host, { op: "escrow", cast: "STEWARD", to: "A01", amount: 4 })).toBe('{"ok":true}');
		expect(payloads(host, "ledger_entry").at(-1)).toEqual({ txId: "TX2", debit: "ESCROW:STEWARD", credit: "A01", amount: 4, reason: "escrow STEWARD" });
		expect(payloads(host, "notice")).toEqual([{ to: "A01", author: "CITY", text: "R-0001: escrow" }]);
		expect(await drive(host, { op: "escrow", cast: "STEWARD", to: "A02", amount: 7 })).toBe('{"ok":false,"code":"INSUFFICIENT_ESCROW","detail":"6 left"}');
	});
});

describe("conformance and snapshot", () => {
	it("documents its options and keeps to the source rules", () => {
		expect(checkOptionsDocumented(cast)).toEqual([]);
		const dir = join(ROOT, "mechanics", "cast", "src");
		const files = readdirSync(dir).map((name) => ({ path: `mechanics/cast/src/${name}`, text: readFileSync(join(dir, name), "utf8") }));
		expect(checkSourceRules(files)).toEqual([]);
	});

	it("plays the same events from the same seed and resumes from a cut (stand-in providers)", async () => {
		const options = { story: castStory({ hidden: false, minutes: 6 }), prompts: t2Prompts() };
		const agent = () =>
			scriptedAgent((turn) => (turn.resident === "A01" && turn.minute < 3 ? [{ tool: "sendDM", params: { target: "STEWARD", message: `at ${String(turn.minute)}` } }] : []));
		expect(await checkDeterminism(options, agent)).toEqual([]);
		expect(await checkSnapshotRoundTrip(options, agent, 3)).toEqual([]);
	});

	it("keeps members and collections through a JSON snapshot", async () => {
		const host = castCity({ hidden: false });
		await drive(host, { op: "startCollection", into: "feast", cast: "STEWARD", first: 3, untilMinute: 9, distinctSenders: true, afterSolve: { level: 10, minutes: 3 } });
		await say(host, "A02", "sendDM", { target: "STEWARD", message: "kept" });
		await drive(host, { op: "setLevel", cast: "STEWARD", level: 12 });
		const snapshot: unknown = JSON.parse(JSON.stringify(host.snapshot()));
		const again = createHost({ story: castStory({ hidden: true }), prompts: t2Prompts(), resume: { snapshot, events: host.log.all() } });
		expect(again.facts()["cast.active"]).toEqual([{ id: "STEWARD", level: 12 }]);
		expect(again.facts()["cast.collections"]).toEqual({ feast: ["A02"] });
	});

	describe("the legacy checkpoint", () => {
		const path = join(ROOT, "examples", "cityofkeys-act1-06a-04", "snapshot-L7.json");
		const converted = convertLegacySnapshot(JSON.parse(readFileSync(path, "utf8")), {}, path);
		const loaded = ["cast", "channels", "ledger", "marks", "names", "receipts", "exile", "progression", "script"];

		function resume(snapshot: typeof converted.host, escrow: number) {
			const story = defineCoreStory({
				id: "nexus",
				seed: 7,
				minutes: 80,
				residents: converted.host.residents.ids,
				mechanics: [
					cast.with({ members: { STEWARD: { level: 10, hidden: true, escrow } } }),
					channels.with(),
					progressionStandIn(new Map<number, number>()).with(),
					ledgerStandIn(0).with(),
					marksStandIn().with(),
					namesStandIn(new Map<string, string>()).with(),
					receiptsStandIn().with(),
					exileStandIn.with(),
					castDriver.with(),
					...standInsFor(snapshot, loaded),
				],
				grants: { script: ["driveCast"] },
			});
			return createHost({ story, prompts: t2Prompts(), resume: { snapshot, events: converted.events } });
		}

		it("migrates the members and collections from version 0 and does not fund them again", async () => {
			const host = resume(converted.host, 10);
			expect(host.snapshot().mechanics.cast).toMatchObject({ version: 1, data: { members: [{ id: "STEWARD", level: 10, hidden: true, retired: false }], collections: [], funded: ["STEWARD"] } });
			const before = host.log.length;
			await host.playMinute(idleAgent);
			expect(host.log.all().slice(before).filter((event) => event.type === "ledger_entry")).toEqual([]);
		});

		it("funds a member the story added after the snapshot at the next minute", async () => {
			const bare = { ...converted.host, mechanics: { ...converted.host.mechanics, cast: { version: 0, data: { cast: { members: [], collections: [] } } } } };
			const host = resume(bare, 10);
			const before = host.log.length;
			await host.playMinute(idleAgent);
			expect(payloads(host, "ledger_entry").slice(-1)).toEqual([{ txId: "TX1", debit: "SYSTEM_MINT_BURN", credit: "ESCROW:STEWARD", amount: 10, reason: "escrow STEWARD" }]);
			expect(host.log.length).toBeGreaterThan(before);
		});
	});
});
